import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Request, Response } from 'express';
import { supabase } from '../config/supabase.js';
import axios from 'axios';

// Type for fetch Response
type FetchResponse = globalThis.Response;

const router = express.Router();

// OAuth provider configurations
const OAUTH_PROVIDERS = {
  twitter: {
    clientId: process.env.TWITTER_CLIENT_ID!,
    clientSecret: process.env.TWITTER_CLIENT_SECRET!,
    authorizationUrl: 'https://x.com/i/oauth2/authorize',
    tokenUrl: 'https://api.x.com/2/oauth2/token',
    scopes: ['tweet.read', 'users.read', 'follows.read', 'offline.access'],
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

// Cache for Twitter Bearer token
let twitterBearerToken: string | null = null;
let bearerTokenExpiry: number | null = null;

// Get Twitter Bearer token (app-only authentication)
async function getTwitterBearerToken(): Promise<string> {
  // Check if we have a valid cached token
  if (twitterBearerToken && bearerTokenExpiry && Date.now() < bearerTokenExpiry) {
    return twitterBearerToken;
  }

  const authString = Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString('base64');

  const response = await fetch('https://api.twitter.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials'
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to get Twitter Bearer token: ${response.status}`);
  }

  const data: any = await response.json();
  twitterBearerToken = data.access_token;
  // Token expires in 2 hours, set expiry to 1.5 hours from now for safety
  bearerTokenExpiry = Date.now() + (1.5 * 60 * 60 * 1000);

  return twitterBearerToken!;
}

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

    let codeVerifier: string | undefined;

    if (provider === 'twitter') {
      // Twitter requires PKCE
      const pkce = generatePKCE();
      codeVerifier = pkce.codeVerifier;

      // NOTE: We return codeVerifier to frontend for storage (stateless server)
      // Frontend will send it back with the callback request

      authUrl = `${config.authorizationUrl}?` +
        `client_id=${encodeURIComponent(config.clientId)}&` +
        `redirect_uri=${encodeURIComponent(config.redirectUri)}&` +
        `scope=${encodeURIComponent(config.scopes.join(' '))}&` +
        `response_type=code&` +
        `state=${encodeURIComponent(state)}&` +
        `code_challenge=${encodeURIComponent(pkce.codeChallenge)}&` +
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

    // Return codeVerifier for Twitter so frontend can store and resend
    res.json({ authUrl, ...(codeVerifier && { codeVerifier }) });

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

    // codeVerifier is now sent from frontend (stored in sessionStorage)
    const { code, state, codeVerifier } = req.body;

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

    // Validate codeVerifier for Twitter (now comes from frontend)
    if (provider === 'twitter') {
      console.log('🔍 PKCE Debug (Twitter):');
      console.log('   Code verifier from frontend:', codeVerifier ? 'present' : 'missing');

      if (!codeVerifier) {
        console.error('❌ Missing PKCE code verifier from frontend');
        return res.status(400).json({ error: 'Missing PKCE code verifier. Please try connecting again.' });
      }
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

    // Helper to get proxy config
    const getProxyConfig = () => {
      const proxyUrl = process.env.QUOTAGUARD_STATIC_URL || process.env.FIXIE_URL;
      if (!proxyUrl) return undefined;

      try {
        const url = new URL(proxyUrl);
        return {
          protocol: url.protocol.replace(':', ''),
          host: url.hostname,
          port: parseInt(url.port),
          auth: {
            username: url.username,
            password: url.password
          }
        };
      } catch (e) {
        console.error('Invalid proxy URL:', e);
        return undefined;
      }
    };

    if (provider === 'twitter') {
      // ... (Rest of Twitter logic remains similar but using axios if preferred, or keep fetch if it works)
      // Keeping fetch for Twitter since it works and Twitter might not block Render IP as aggressively as Discord
      // ...
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
      // Discord OAuth 2.0 - Use Axios with Proxy
      console.log('🎮 Discord OAuth: Using standard token exchange with Axios (Proxy enabled if available)');

      const proxyConfig = getProxyConfig();
      if (proxyConfig) {
        console.log('🛡️ Using Proxy for Discord request:', proxyConfig.host);
      }

      const params = new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.redirectUri
      });

      try {
        const axiosResponse = await axios.post(config.tokenUrl, params.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'User-Agent': 'DiscordBot (https://trustquests.com, 1.0.0)'
          },
          proxy: proxyConfig || false // Use proxy if available, otherwise false (direct)
        });

        // Create a compatible response object for the downstream code
        tokenResponse = {
          ok: axiosResponse.status >= 200 && axiosResponse.status < 300,
          status: axiosResponse.status,
          statusText: axiosResponse.statusText,
          json: async () => axiosResponse.data,
          text: async () => JSON.stringify(axiosResponse.data),
          url: config.tokenUrl
        } as any;

      } catch (error: any) {
        console.error('❌ Axios request failed:', error.message);
        if (error.response) {
          console.error('   Status:', error.response.status);
          console.error('   Data:', error.response.data);
          tokenResponse = {
            ok: false,
            status: error.response.status,
            statusText: error.response.statusText,
            json: async () => error.response.data,
            text: async () => JSON.stringify(error.response.data),
            url: config.tokenUrl
          } as any;
        } else {
          throw error;
        }
      }
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
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'User-Agent': 'DiscordBot (https://trustquests.com, 1.0.0)'
        }
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

// POST /api/social/verify - Verify social actions (follow, like, etc.)
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { provider, action, params } = req.body;
    const authHeader = req.headers.authorization;

    console.log('🔍 Social verify request received:', { provider, action, params });

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    let decoded: any;
    let walletAddress: string;

    try {
      // Try to verify as JWT first
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      if (!decoded.wallet) {
        throw new Error('No wallet in JWT');
      }
      walletAddress = decoded.wallet.toLowerCase();
    } catch (jwtError) {
      // If JWT verification fails, try fallback token (base64 encoded JSON)
      try {
        const decodedJson = JSON.parse(atob(token));
        if (!decodedJson.address) {
          throw new Error('No address in fallback token');
        }
        walletAddress = decodedJson.address.toLowerCase();
        console.log('🔓 Using fallback token for wallet:', walletAddress);
      } catch (fallbackError) {
        console.error('Both JWT and fallback token verification failed:', jwtError, fallbackError);
        return res.status(401).json({ error: 'Invalid token format' });
      }
    }
    console.log('🔍 Verifying social action:', { provider, action, walletAddress });

    // Get stored connection for this provider
    const { data: connection, error } = await supabase
      .from('wallet_socials')
      .select('access_token, provider_user_id')
      .eq('wallet_address', walletAddress)
      .eq('provider', provider)
      .single();

    if (error || !connection || !connection.access_token) {
      console.error('Connection not found:', error);
      return res.status(400).json({
        success: false,
        error: `${provider} account not connected`
      });
    }

    const accessToken = decryptToken(connection.access_token);
    let verified = false;

    // Verify based on provider and action
    if (provider === 'twitter') {
      if (action === 'follow') {
        try {
          // Check if user follows the target account
          const targetUsername = params.targetUsername;
          console.log('🐦 Checking if user follows:', targetUsername);

          // Try to get target user ID using user's access token (should work for basic user lookup)
          let targetId = null;

          try {
            const targetResponse = await fetch(
              `https://api.twitter.com/2/users/by/username/${targetUsername}`,
              {
                headers: { 'Authorization': `Bearer ${accessToken}` }
              }
            );

            console.log('🐦 Target user lookup response status:', targetResponse.status);

            if (targetResponse.ok) {
              const targetData: any = await targetResponse.json();
              targetId = targetData.data?.id;
              console.log('🐦 Target user ID:', targetId);
            } else {
              console.warn('🐦 Could not get target user with access token, this is expected for some tokens');
            }
          } catch (targetError: any) {
            console.warn('🐦 Target user lookup failed:', targetError.message);
          }

          // If we couldn't get the target ID, assume it's a valid username and proceed
          // Twitter API v2 following endpoint can work with usernames directly in some cases
          console.log('🐦 User provider_user_id:', connection.provider_user_id);

          // Check if user follows the target using user's access token
          const followingResponse = await fetch(
            `https://api.twitter.com/2/users/${connection.provider_user_id}/following`,
            {
              headers: { 'Authorization': `Bearer ${accessToken}` }
            }
          );

          console.log('🐦 Following API response status:', followingResponse.status);

          if (followingResponse.ok) {
            const followingData: any = await followingResponse.json();
            console.log('🐦 Following data:', followingData);

            if (targetId) {
              // If we have the target ID, check if user follows this specific ID
              verified = followingData.data?.some((user: any) => user.id === targetId) || false;
            } else {
              // If we don't have target ID, check if user follows anyone with similar username
              verified = followingData.data?.some((user: any) =>
                user.username?.toLowerCase() === targetUsername.toLowerCase()
              ) || false;
            }

            console.log('🐦 Verification result:', verified);
          } else {
            const errorText = await followingResponse.text();
            console.error('🐦 Following API error:', followingResponse.status, errorText);

            // If access token is expired (401), suggest reconnecting
            if (followingResponse.status === 401) {
              return res.status(400).json({
                success: false,
                error: 'Twitter access token expired. Please reconnect your Twitter account.',
                code: 'TOKEN_EXPIRED'
              });
            }

            return res.status(400).json({
              success: false,
              error: `Could not check following status: ${followingResponse.status}`,
              twitterError: errorText,
              details: "Check Twitter Developer Portal - app may need Project enrollment"
            });
          }
        } catch (error: any) {
          console.error('🐦 Twitter verification error:', error);
          return res.status(400).json({
            success: false,
            error: `Twitter verification failed: ${error.message}`
          });
        }

      } else if (action === 'like') {
        // Check if user liked the tweet
        const tweetId = params.tweetId;
        console.log('🐦 Checking if user liked tweet:', tweetId);

        const likeResponse = await fetch(
          `https://api.twitter.com/2/users/${connection.provider_user_id}/liked_tweets`,
          {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          }
        );

        if (likeResponse.ok) {
          const likedData: any = await likeResponse.json();
          verified = likedData.data?.some((tweet: any) => tweet.id === tweetId) || false;
        }
      }

    } else if (provider === 'discord') {
      // Discord verification logic would go here
      // For now, just return success if connected
      verified = true;
    }

    console.log('✅ Verification result:', { provider, action, verified });

    return res.json({
      success: true,
      completed: verified,
      data: { provider, action, verified }
    });

  } catch (error: any) {
    console.error('Social verification error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Verification failed'
    });
  }
});

export default router;