import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';

// Extend Request interface to include walletAddress
declare global {
  namespace Express {
    interface Request {
      walletAddress?: string;
    }
  }
}

const router = Router();

// Initialize Supabase with service role key (server-side only)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scopes: ['read:user', 'user:email', 'public_repo'],
    redirectUri: `${process.env.FRONTEND_URL}/auth/social-callback`
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['openid', 'profile', 'email'],
    redirectUri: `${process.env.FRONTEND_URL}/auth/social-callback`
  }
};

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

// Global PKCE store
declare global {
  var pkceStore: Map<string, string> | undefined;
}

// Initialize PKCE store
if (!global.pkceStore) {
  global.pkceStore = new Map<string, string>();
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

// Type definitions for API responses
interface TokenData {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  id_token?: string;
  token_type?: string;
}

interface TwitterUser {
  id: string;
  username: string;
  name?: string;
}

interface TwitterResponse {
  data: TwitterUser;
}

interface DiscordUser {
  id: string;
  username: string;
}

interface GitHubUser {
  id: number;
  login: string;
}

interface FollowingResponse {
  data: TwitterUser[];
}

// Helper to verify state parameter
function verifyState(state: string): { walletAddress: string; provider: string; nonce: string; codeVerifier?: string } | null {
  try {
    const decoded = jwt.verify(state, process.env.JWT_SECRET!) as any;
    return {
      walletAddress: decoded.walletAddress,
      provider: decoded.provider,
      nonce: decoded.nonce,
      codeVerifier: decoded.codeVerifier
    };
  } catch (error) {
    return null;
  }
}

// Middleware to verify JWT and extract wallet address
const authenticateWallet = (req: Request, res: Response, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    if (!decoded.wallet) {
      return res.status(401).json({ error: 'Invalid token: no wallet address' });
    }

    req.walletAddress = decoded.wallet.toLowerCase();
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Social verification schema
const socialVerificationSchema = z.object({
  provider: z.enum(['twitter', 'discord', 'github', 'google']),
  action: z.string(), // 'follow', 'join_server', 'star_repo', etc.
  params: z.record(z.any()), // Additional parameters for the action
});

// GET /api/social/connections/:walletAddress - Get connected social accounts
router.get('/connections/:walletAddress', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;

    const { data, error } = await supabase
      .from('wallet_socials')
      .select('provider, provider_username, verified_at')
      .eq('wallet_address', walletAddress.toLowerCase());

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch social connections' });
    }

    res.json({ connections: data || [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Helper to decrypt tokens
function decryptToken(encryptedText: string): string {
  try {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(process.env.ENCRYPTION_KEY!, 'salt', 32);
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const tag = Buffer.from(parts[2], 'hex');

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAAD(Buffer.from('social-tokens'));
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    throw new Error('Failed to decrypt token');
  }
}

// POST /api/social/verify - Verify social task completion
router.post('/verify', authenticateWallet, async (req: Request, res: Response) => {
  try {
    const validated = socialVerificationSchema.parse(req.body);
    const { provider, action, params } = validated;
    const walletAddress = req.walletAddress;

    // Get stored connection for this wallet and provider
    const { data: connection, error: fetchError } = await supabase
      .from('wallet_socials')
      .select('access_token, refresh_token, token_expires_at, provider_user_id, provider_username')
      .eq('wallet_address', walletAddress)
      .eq('provider', provider)
      .single();

    if (fetchError || !connection) {
      return res.status(404).json({
        success: false,
        completed: false,
        error: `No ${provider} connection found for this wallet`
      });
    }

    if (!connection.access_token) {
      return res.status(400).json({
        success: false,
        completed: false,
        error: `No access token available for ${provider}`
      });
    }

    // Decrypt access token
    const accessToken = decryptToken(connection.access_token);

    let completed = false;
    let verificationError: string | null = null;

    try {
      // Perform verification based on provider and action
      switch (provider) {
        case 'twitter':
          if (action === 'follow') {
            const targetUsername = params.username;
            if (!targetUsername) {
              return res.status(400).json({ error: 'Missing target username for Twitter follow verification' });
            }

            // Check if user follows the target
            const followResponse = await fetch(
              `https://api.twitter.com/2/users/by/username/${targetUsername}`,
              {
                headers: { 'Authorization': `Bearer ${accessToken}` }
              }
            );

            if (followResponse.ok) {
              const targetData = await followResponse.json() as TwitterResponse;
              const targetId = targetData.data?.id;

              if (targetId) {
                // Check following relationship
                const relationshipResponse = await fetch(
                  `https://api.twitter.com/2/users/${connection.provider_user_id}/following`,
                  {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                  }
                );

                if (relationshipResponse.ok) {
                  const followingData = await relationshipResponse.json() as FollowingResponse;
                  completed = followingData.data?.some((user: TwitterUser) => user.id === targetId) || false;
                }
              }
            }
          }
          break;

        case 'discord':
          if (action === 'join_server') {
            const serverId = params.serverId;
            if (!serverId) {
              return res.status(400).json({ error: 'Missing server ID for Discord join verification' });
            }

            // Check if user is a member of the server
            const memberResponse = await fetch(
              `https://discord.com/api/users/@me/guilds/${serverId}/member`,
              {
                headers: { 'Authorization': `Bearer ${accessToken}` }
              }
            );

            completed = memberResponse.status === 200;
          }
          break;

        case 'github':
          if (action === 'star_repo') {
            const { owner, repo } = params;
            if (!owner || !repo) {
              return res.status(400).json({ error: 'Missing owner/repo for GitHub star verification' });
            }

            // Check if user has starred the repository
            const starResponse = await fetch(
              `https://api.github.com/user/starred/${owner}/${repo}`,
              {
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Accept': 'application/vnd.github.v3+json'
                }
              }
            );

            completed = starResponse.status === 204; // 204 = starred, 404 = not starred
          }
          break;

        case 'google':
          // For Google, we can verify basic profile access
          if (action === 'connect') {
            const profileResponse = await fetch(
              'https://www.googleapis.com/oauth2/v2/userinfo',
              {
                headers: { 'Authorization': `Bearer ${accessToken}` }
              }
            );
            completed = profileResponse.ok;
          }
          break;

        default:
          verificationError = `Unsupported verification: ${provider} ${action}`;
      }
    } catch (apiError: any) {
      console.error('Social API verification error:', apiError);
      verificationError = `API verification failed: ${apiError.message}`;
    }

    res.json({
      success: !verificationError,
      completed: completed,
      error: verificationError
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// GET /api/social/connect/:provider - Initiate OAuth flow
router.get('/connect/:provider', authenticateWallet, async (req: Request, res: Response) => {
  try {
    const { provider } = req.params;
    const walletAddress = req.walletAddress!;

    if (!OAUTH_PROVIDERS[provider as keyof typeof OAUTH_PROVIDERS]) {
      return res.status(400).json({ error: 'Unsupported OAuth provider' });
    }

    const config = OAUTH_PROVIDERS[provider as keyof typeof OAUTH_PROVIDERS];

    // Generate PKCE parameters (only for Twitter)
    let codeVerifier: string | undefined;
    let codeChallenge: string | undefined;

    if (provider === 'twitter') {
      const pkce = generatePKCE();
      codeVerifier = pkce.codeVerifier;
      codeChallenge = pkce.codeChallenge;

      console.log('🔐 Storing PKCE codeVerifier for Twitter:');
      console.log('   Code verifier length:', codeVerifier.length);
      console.log('   PKCE store size before:', global.pkceStore?.size || 0);
    }

    const state = generateState(walletAddress, provider);

    // Store codeVerifier in global store (only for Twitter)
    if (provider === 'twitter' && codeVerifier) {
      global.pkceStore!.set(state, codeVerifier);
      console.log('   PKCE store size after:', global.pkceStore?.size || 0);
    }

    // Build authorization URL
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scopes.join(' '),
      response_type: 'code',
      state: state
    });

    // Provider-specific parameters
    if (provider === 'google') {
      params.set('access_type', 'offline');
      params.set('prompt', 'consent');
    }

    // Add PKCE parameters for Twitter
    if (provider === 'twitter' && codeChallenge) {
      params.set('code_challenge', codeChallenge);
      params.set('code_challenge_method', 'S256');
    }

    const authUrl = `${config.authorizationUrl}?${params.toString()}`;

    res.json({ authUrl, state });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/social/callback - Handle OAuth callback
router.post('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.body;

    if (!code || !state) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Verify state parameter
    const stateData = verifyState(state);
    if (!stateData) {
      return res.status(400).json({ error: 'Invalid or expired state parameter' });
    }

    const { walletAddress, provider } = stateData;

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
    let fetchResponse: globalThis.Response;

    if (provider === 'twitter') {
      // Twitter uses PKCE with Basic Auth (confidential client)
      console.log('🐦 Twitter OAuth: Using PKCE token exchange with Basic Auth');
      const authString = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
      fetchResponse = await fetch(config.tokenUrl, {
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
    } else {
      // Other providers use Basic Auth
      console.log(`🔄 ${provider} OAuth: Using Basic Auth token exchange`);
      const authString = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
      fetchResponse = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: config.redirectUri
        })
      });
    }

    if (!fetchResponse.ok) {
      const errorData = await fetchResponse.text();
      console.error('Token exchange failed:', errorData);
      return res.status(400).json({ error: 'Failed to exchange authorization code' });
    }

    const tokenData = await fetchResponse.json() as TokenData;

    // Get user profile data
    let profileData: any = {};
    let username = '';
    let userId = '';

    try {
      // Fetch user profile based on provider
      switch (provider) {
        case 'twitter':
          const twitterResponse = await fetch('https://api.twitter.com/2/users/me', {
            headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
          });
          if (twitterResponse.ok) {
            const twitterData = await twitterResponse.json() as TwitterResponse;
            profileData = twitterData.data;
            username = twitterData.data.username;
            userId = twitterData.data.id;
          }
          break;

        case 'discord':
          const discordResponse = await fetch('https://discord.com/api/users/@me', {
            headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
          });
          if (discordResponse.ok) {
            const discordData = await discordResponse.json() as DiscordUser;
            profileData = discordData;
            username = discordData.username;
            userId = discordData.id;
          }
          break;

        case 'github':
          const githubResponse = await fetch('https://api.github.com/user', {
            headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
          });
          if (githubResponse.ok) {
            const githubData = await githubResponse.json() as GitHubUser;
            profileData = githubData;
            username = githubData.login;
            userId = githubData.id.toString();
          }
          break;

        case 'google':
          // Google profile data is in the ID token
          if (tokenData.id_token) {
            const parts = tokenData.id_token.split('.');
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
            profileData = payload;
            username = payload.name || payload.email || 'Unknown';
            userId = payload.sub;
          }
          break;
      }
    } catch (profileError) {
      console.warn('Failed to fetch profile data:', profileError);
    }

    // Encrypt tokens for storage
    const encryptToken = (token: string): string => {
      const algorithm = 'aes-256-gcm';
      const key = crypto.scryptSync(process.env.ENCRYPTION_KEY!, 'salt', 32);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      cipher.setAAD(Buffer.from('social-tokens'));
      let encrypted = cipher.update(token, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const tag = cipher.getAuthTag();
      return `${iv.toString('hex')}:${encrypted}:${tag.toString('hex')}`;
    };

    // Store social connection
    const { error: insertError } = await supabase
      .from('wallet_socials')
      .upsert({
        wallet_address: walletAddress,
        provider: provider,
        provider_user_id: userId,
        provider_username: username,
        provider_data: profileData,
        access_token: tokenData.access_token ? encryptToken(tokenData.access_token) : null,
        refresh_token: tokenData.refresh_token ? encryptToken(tokenData.refresh_token) : null,
        token_expires_at: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
        verified_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Database insert error:', insertError);
      return res.status(500).json({ error: 'Failed to store social connection' });
    }

    res.json({
      success: true,
      provider,
      username,
      walletAddress
    });
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ error: error.message || 'OAuth callback failed' });
  }
});

export default router;