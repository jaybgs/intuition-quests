import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Request, Response } from 'express';
import { supabase } from '../config/supabase.js';

// Type for fetch Response
type FetchResponse = globalThis.Response;

const router = express.Router();

// OAuth provider configurations
const OAUTH_PROVIDERS = {
  twitter: {
    clientId: process.env.TWITTER_CLIENT_ID!,
    clientSecret: process.env.TWITTER_CLIENT_SECRET!,
    authorizationUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    scopes: ['tweet.read', 'users.read', 'follows.read'],
    redirectUri: `${process.env.FRONTEND_URL}/auth/social-callback`
  },
  discord: {
    clientId: process.env.DISCORD_CLIENT_ID!,
    clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    authorizationUrl: 'https://discord.com/api/oauth2/authorize',
    tokenUrl: 'https://discord.com/api/oauth2/token',
    scopes: ['identify', 'guilds.members.read', 'connections', 'email', 'guilds', 'guilds.join'],
    redirectUri: `${process.env.FRONTEND_URL}/auth/social-callback`
  }
};

// Global PKCE store
declare global {
  var pkceStore: Map<string, string> | undefined;
}

// Initialize PKCE store
if (!global.pkceStore) {
  global.pkceStore = new Map<string, string>();
}

// Helper to generate secure state parameter
function generateState(walletAddress: string, provider: string, codeVerifier?: string): string {
  const stateData = {
    walletAddress: walletAddress.toLowerCase(),
    provider: provider,
    nonce: crypto.randomBytes(16).toString('hex'),
    timestamp: Date.now(),
    ...(codeVerifier && { codeVerifier })
  };
  return jwt.sign(stateData, process.env.JWT_SECRET!, { expiresIn: '10m' });
}

// Verify state parameter
function verifyState(state: string): any | null {
  try {
    const decoded = jwt.verify(state, process.env.JWT_SECRET!) as any;
    // Check if state is expired (10 minutes)
    if (Date.now() - decoded.timestamp > 10 * 60 * 1000) {
      return null;
    }
    return decoded;
  } catch (error) {
    console.error('State verification failed:', error);
    return null;
  }
}

// Helper to generate PKCE code verifier and challenge
function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = crypto.randomBytes(32).toString('hex');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  return { codeVerifier, codeChallenge };
}

// Encryption helpers for tokens
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;
const ALGORITHM = 'aes-256-gcm';

function encryptToken(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + encrypted + ':' + authTag.toString('hex');
}

function decryptToken(encryptedText: string): string {
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const authTag = Buffer.from(parts[2], 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// GET /api/social/connect/:provider - Initiate OAuth flow
router.get('/connect/:provider', async (req: Request, res: Response) => {
  try {
    const { provider } = req.params;
    const { walletAddress } = req.query;

    if (!walletAddress || typeof walletAddress !== 'string') {
      return res.status(400).json({ error: 'Missing wallet address' });
    }

    if (!OAUTH_PROVIDERS[provider as keyof typeof OAUTH_PROVIDERS]) {
      return res.status(400).json({ error: 'Unsupported OAuth provider' });
    }

    const config = OAUTH_PROVIDERS[provider as keyof typeof OAUTH_PROVIDERS];

    // Generate state parameter
    const state = generateState(walletAddress, provider);

    let authUrl: string;

    if (provider === 'twitter') {
      // Twitter requires PKCE
      const { codeVerifier, codeChallenge } = generatePKCE();

      // Store codeVerifier with state
      global.pkceStore!.set(state, codeVerifier);

      authUrl = `${config.authorizationUrl}?` +
        `client_id=${encodeURIComponent(config.clientId)}&` +
        `redirect_uri=${encodeURIComponent(config.redirectUri)}&` +
        `scope=${encodeURIComponent(config.scopes.join(' '))}&` +
        `response_type=code&` +
        `state=${encodeURIComponent(state)}&` +
        `code_challenge=${encodeURIComponent(codeChallenge)}&` +
        `code_challenge_method=S256`;

    } else {
      // Discord and other providers (standard OAuth 2.0)
      authUrl = `${config.authorizationUrl}?` +
        `client_id=${encodeURIComponent(config.clientId)}&` +
        `redirect_uri=${encodeURIComponent(config.redirectUri)}&` +
        `scope=${encodeURIComponent(config.scopes.join(' '))}&` +
        `response_type=code&` +
        `state=${encodeURIComponent(state)}`;
    }

    console.log(`🔗 Generated ${provider} OAuth URL:`, authUrl.substring(0, 100) + '...');

    res.json({ authUrl });

  } catch (error: any) {
    console.error('OAuth connection initiation failed:', error);
    res.status(500).json({ error: 'Failed to initiate OAuth flow' });
  }
});

// POST /api/social/callback - Handle OAuth callback
router.post('/callback', async (req: Request, res: Response) => {
  try {
    console.log('🔄 OAuth Callback Received:');
    console.log('   Body:', JSON.stringify(req.body, null, 2));

    const { code, state } = req.body;

    if (!code || !state) {
      console.error('❌ Missing required parameters:', { code: !!code, state: !!state });
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Verify state parameter
    const stateData = verifyState(state);
    if (!stateData) {
      console.error('❌ Invalid state parameter');
      return res.status(400).json({ error: 'Invalid or expired state parameter' });
    }

    const { walletAddress, provider } = stateData;
    console.log('✅ State verified for:', { walletAddress, provider });

    // Retrieve codeVerifier from global store (only for Twitter)
    let codeVerifier: string | undefined;
    if (provider === 'twitter') {
      console.log('🔍 PKCE Debug (Twitter):');
      console.log('   State received:', state);
      console.log('   PKCE store size:', global.pkceStore?.size || 0);
      console.log('   PKCE store keys:', Array.from(global.pkceStore?.keys() || []));

      codeVerifier = global.pkceStore?.get(state);
      console.log('   Code verifier found:', !!codeVerifier);

      if (!codeVerifier) {
        console.error('❌ Missing PKCE code verifier for state:', state);
        return res.status(400).json({ error: 'Missing PKCE code verifier' });
      }

      console.log('✅ Found code verifier, deleting from store');
      global.pkceStore!.delete(state);
    } else {
      console.log(`🔄 ${provider} OAuth: No PKCE required`);
    }

    if (!OAUTH_PROVIDERS[provider as keyof typeof OAUTH_PROVIDERS]) {
      return res.status(400).json({ error: 'Unsupported OAuth provider' });
    }

    const config = OAUTH_PROVIDERS[provider as keyof typeof OAUTH_PROVIDERS];

    // Exchange code for access token (provider-specific)
    console.log('🔄 Starting token exchange for provider:', provider);
    console.log('   Client ID:', config.clientId ? '✅ Set' : '❌ Missing');
    console.log('   Client Secret:', config.clientSecret ? '✅ Set' : '❌ Missing');
    console.log('   Redirect URI:', config.redirectUri);

    let tokenResponse: FetchResponse;

    if (provider === 'twitter') {
      // Twitter OAuth 2.0 v2 with PKCE and Basic Auth
      console.log('🐦 Twitter OAuth: Using PKCE token exchange with Basic Auth');
      const authString = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
      console.log('   Auth string created:', authString.substring(0, 20) + '...');

      tokenResponse = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: config.redirectUri,
          ...(codeVerifier && { code_verifier: codeVerifier })
        })
      });

    } else if (provider === 'discord') {
      // Discord OAuth 2.0
      console.log('🎮 Discord OAuth: Using standard token exchange');

      tokenResponse = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          grant_type: 'authorization_code',
          code,
          redirect_uri: config.redirectUri
        })
      });
    } else {
      return res.status(400).json({ error: 'Unsupported provider for token exchange' });
    }

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('❌ Token exchange failed for', provider, ':');
      console.error('   Response status:', tokenResponse.status);
      console.error('   Response status text:', tokenResponse.statusText);
      console.error('   Error data:', errorData);
      console.error('   Request URL was:', tokenResponse.url || 'unknown');
      return res.status(400).json({ error: 'Failed to exchange authorization code' });
    }

    const tokenData: any = await tokenResponse.json();
    console.log('✅ Token exchange successful for', provider);

    // Get user profile data based on provider
    let userId: string;
    let username: string;
    let profileData: any = {};

    if (provider === 'twitter') {
      // Get Twitter user info
      const userResponse = await fetch('https://api.twitter.com/2/users/me', {
        headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
      });

      if (!userResponse.ok) {
        console.error('Failed to get Twitter user info');
        return res.status(500).json({ error: 'Failed to get user information' });
      }

      const userData: any = await userResponse.json();
      userId = userData.data.id;
      username = userData.data.username;
      profileData = {
        name: userData.data.name,
        profileImage: userData.data.profile_image_url,
        verified: userData.data.verified
      };

    } else if (provider === 'discord') {
      // Get Discord user info
      const userResponse = await fetch('https://discord.com/api/users/@me', {
        headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
      });

      if (!userResponse.ok) {
        console.error('Failed to get Discord user info');
        return res.status(500).json({ error: 'Failed to get user information' });
      }

      const userData: any = await userResponse.json();
      userId = userData.id;
      username = userData.username;
      profileData = {
        discriminator: userData.discriminator,
        avatar: userData.avatar,
        email: userData.email,
        verified: userData.verified
      };
    } else {
      return res.status(400).json({ error: 'Unsupported provider for user data' });
    }

    console.log('👤 Retrieved user data:', { userId, username });
    console.log('🏦 Wallet address from JWT state:', walletAddress);
    console.log('💾 Attempting to save to database:', { walletAddress, provider, userId, username });

    // Store in database (normalize wallet address to lowercase)
    const { data, error } = await supabase
      .from('wallet_socials')
      .upsert({
        wallet_address: walletAddress.toLowerCase(),
        provider: provider,
        provider_user_id: userId,
        provider_username: username,
        provider_data: profileData,
        access_token: tokenData.access_token ? encryptToken(tokenData.access_token) : null,
        refresh_token: tokenData.refresh_token ? encryptToken(tokenData.refresh_token) : null,
        token_expires_at: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
        verified_at: new Date().toISOString()
      }, {
        onConflict: 'wallet_address,provider'
      });

    if (error) {
      console.error('❌ Database upsert error:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      return res.status(500).json({ error: 'Failed to store social connection' });
    }

    console.log('✅ Social connection stored successfully:', data);

    res.json({
      success: true,
      provider,
      username,
      userId
    });

  } catch (error: any) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ error: error.message || 'OAuth callback failed' });
  }
});

// DELETE /api/social/disconnect/:provider - Disconnect social account
router.delete('/disconnect/:provider', async (req: Request, res: Response) => {
  try {
    const { provider } = req.params;
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Missing wallet address' });
    }

    // Delete from database
    const { error } = await supabase
      .from('wallet_socials')
      .delete()
      .eq('wallet_address', walletAddress)
      .eq('provider', provider);

    if (error) {
      console.error('Database delete error:', error);
      return res.status(500).json({ error: 'Failed to disconnect social account' });
    }

    res.json({ success: true, message: 'Social account disconnected' });

  } catch (error: any) {
    console.error('Social disconnect error:', error);
    res.status(500).json({ error: 'Failed to disconnect social account' });
  }
});

// GET /api/social/connections/:walletAddress - Get social connections
router.get('/connections/:walletAddress', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;
    console.log('🔍 Frontend requesting connections for wallet:', walletAddress);

    const { data, error } = await supabase
      .from('wallet_socials')
      .select('provider, provider_username, provider_data, verified_at')
      .ilike('wallet_address', walletAddress.toLowerCase());

    if (error) {
      console.error('Database query error:', error);
      return res.status(500).json({ error: 'Failed to fetch social connections' });
    }

    // Convert to object format for frontend
    const connections: any = {};
    data?.forEach((connection: any) => {
      connections[connection.provider] = {
        username: connection.provider_username,
        connected: true,
        verifiedAt: connection.verified_at,
        ...connection.provider_data
      };
    });

    res.json({ connections });

  } catch (error: any) {
    console.error('Social connections fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch social connections' });
  }
});

export default router;
