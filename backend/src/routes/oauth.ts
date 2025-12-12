import { Router, Request, Response } from 'express';
import { z } from 'zod';
import axios from 'axios';

const router = Router();

const oauthExchangeSchema = z.object({
  platform: z.enum(['twitter', 'discord', 'github', 'google']),
  code: z.string(),
  redirectUri: z.string(),
  codeVerifier: z.string().optional(), // For Twitter PKCE
});

// OAuth Client Secrets (should be in environment variables)
const OAUTH_SECRETS: Record<string, string> = {
  twitter: process.env.TWITTER_CLIENT_SECRET || '',
  discord: process.env.DISCORD_CLIENT_SECRET || '',
  github: process.env.GITHUB_CLIENT_SECRET || '',
  google: process.env.GOOGLE_CLIENT_SECRET || '',
};

const OAUTH_CLIENT_IDS: Record<string, string> = {
  twitter: process.env.TWITTER_CLIENT_ID || '',
  discord: process.env.DISCORD_CLIENT_ID || '',
  github: process.env.GITHUB_CLIENT_ID || '',
  google: process.env.GOOGLE_CLIENT_ID || '',
};

/**
 * Exchange OAuth code for access token and fetch user data
 */
router.post('/exchange', async (req: Request, res: Response) => {
  try {
    const validated = oauthExchangeSchema.parse(req.body);
    const { platform, code, redirectUri, codeVerifier } = validated;

    const clientId = OAUTH_CLIENT_IDS[platform];
    const clientSecret = OAUTH_SECRETS[platform];

    if (!clientId || !clientSecret) {
      return res.status(400).json({
        success: false,
        error: `OAuth not configured for ${platform}. Missing client ID or secret.`,
      });
    }

    let accessToken: string;
    let userData: any;

    // Exchange code for access token
    switch (platform) {
      case 'twitter': {
        if (!codeVerifier) {
          return res.status(400).json({
            success: false,
            error: 'Twitter OAuth requires code_verifier for PKCE',
          });
        }
        
        const tokenResponse = await axios.post(
          'https://api.twitter.com/2/oauth2/token',
          new URLSearchParams({
            code,
            grant_type: 'authorization_code',
            client_id: clientId,
            redirect_uri: redirectUri,
            code_verifier: codeVerifier, // Use provided PKCE code verifier
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
            },
          }
        );

        accessToken = tokenResponse.data.access_token;

        // Get user profile
        const userResponse = await axios.get('https://api.twitter.com/2/users/me', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            'user.fields': 'username,name,profile_image_url',
          },
        });

        const username = userResponse.data.data.username;
        userData = {
          platform: 'twitter',
          username: username,
          id: userResponse.data.data.id,
          avatar: userResponse.data.data.profile_image_url,
          profileUrl: `https://x.com/${username}`, // Generate X profile URL
        };
        break;
      }

      case 'discord': {
        const tokenResponse = await axios.post(
          'https://discord.com/api/oauth2/token',
          new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        );

        accessToken = tokenResponse.data.access_token;

        // Get user profile
        const userResponse = await axios.get('https://discord.com/api/users/@me', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        userData = {
          platform: 'discord',
          username: userResponse.data.username,
          email: userResponse.data.email,
          id: userResponse.data.id,
          avatar: userResponse.data.avatar
            ? `https://cdn.discordapp.com/avatars/${userResponse.data.id}/${userResponse.data.avatar}.png`
            : undefined,
        };
        break;
      }

      case 'github': {
        const tokenResponse = await axios.post(
          'https://github.com/login/oauth/access_token',
          {
            client_id: clientId,
            client_secret: clientSecret,
            code,
            redirect_uri: redirectUri,
          },
          {
            headers: {
              Accept: 'application/json',
            },
          }
        );

        accessToken = tokenResponse.data.access_token;

        // Get user profile
        const userResponse = await axios.get('https://api.github.com/user', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        // Get email if available
        let email: string | undefined;
        try {
          const emailResponse = await axios.get('https://api.github.com/user/emails', {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });
          const primaryEmail = emailResponse.data.find((e: any) => e.primary);
          email = primaryEmail?.email;
        } catch {
          // Email not available
        }

        userData = {
          platform: 'github',
          username: userResponse.data.login,
          email,
          id: userResponse.data.id.toString(),
          avatar: userResponse.data.avatar_url,
        };
        break;
      }

      case 'google': {
        const tokenResponse = await axios.post(
          'https://oauth2.googleapis.com/token',
          new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        );

        accessToken = tokenResponse.data.access_token;

        // Get user profile
        const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        userData = {
          platform: 'email',
          email: userResponse.data.email,
          username: userResponse.data.email.split('@')[0],
          id: userResponse.data.id,
          avatar: userResponse.data.picture,
        };
        break;
      }

      default:
        return res.status(400).json({
          success: false,
          error: `Unsupported platform: ${platform}`,
        });
    }

    res.json({
      success: true,
      account: userData,
    });
  } catch (error: any) {
    console.error(`OAuth exchange error for ${req.body.platform}:`, error);
    
    if (error.response) {
      return res.status(error.response.status || 500).json({
        success: false,
        error: error.response.data?.error || error.response.data?.error_description || 'OAuth exchange failed',
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to exchange OAuth code',
    });
  }
});

export default router;

