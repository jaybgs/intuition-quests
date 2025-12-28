/**
 * Social Task Verification Service
 * Uses stored OAuth tokens to verify social media task completion
 */
import { supabase } from '../config/supabase';

// Token refresh function
async function refreshAccessToken(walletAddress: string, provider: string): Promise<string | null> {
  try {
    const { data: connection, error } = await supabase
      .from('wallet_socials')
      .select('refresh_token, access_token')
      .eq('wallet_address', walletAddress.toLowerCase())
      .eq('provider', provider)
      .single();

    if (error || !connection?.refresh_token) {
      return null;
    }

    // Use Supabase to refresh the token (this would need backend implementation)
    // For now, return the existing token
    // In production, you'd call your backend to refresh with the provider
    return connection.access_token;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
}

// Get valid access token (refresh if needed)
async function getValidAccessToken(walletAddress: string, provider: string): Promise<string | null> {
  try {
    const { data: connection, error } = await supabase
      .from('wallet_socials')
      .select('access_token, refresh_token, token_expires_at')
      .eq('wallet_address', walletAddress.toLowerCase())
      .eq('provider', provider)
      .single();

    if (error || !connection?.access_token) {
      return null;
    }

    // Check if token is expired
    const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at) : null;
    const now = new Date();

    if (expiresAt && expiresAt <= now) {
      // Token expired, try to refresh
      const refreshedToken = await refreshAccessToken(walletAddress, provider);
      if (refreshedToken) {
        // Update the stored token
        await supabase
          .from('wallet_socials')
          .update({
            access_token: refreshedToken,
            token_expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
            updated_at: new Date().toISOString()
          })
          .eq('wallet_address', walletAddress.toLowerCase())
          .eq('provider', provider);

        return refreshedToken;
      }
      return null;
    }

    return connection.access_token;
  } catch (error) {
    console.error('Error getting valid access token:', error);
    return null;
  }
}

export interface SocialVerificationResult {
  success: boolean;
  completed: boolean;
  error?: string;
  details?: any;
}

// Twitter API verification (requires access token)
export async function verifyTwitterFollow(walletAddress: string, targetUsername: string): Promise<SocialVerificationResult> {
  try {
    // Get valid access token (refreshes if needed)
    const accessToken = await getValidAccessToken(walletAddress, 'twitter');
    if (!accessToken) {
      return {
        success: false,
        completed: false,
        error: 'No Twitter connection found or access token expired'
      };
    }

    // Get connection details
    const { data: connection, error } = await supabase
      .from('wallet_socials')
      .select('provider_user_id, provider_username')
      .eq('wallet_address', walletAddress.toLowerCase())
      .eq('provider', 'twitter')
      .single();

    if (error || !connection) {
      return {
        success: false,
        completed: false,
        error: 'Twitter connection not found'
      };
    }

    // Call Twitter API to check if user follows target
    // Note: In production, you'd call Twitter API v2 with the access token
    const response = await fetch(`https://api.twitter.com/2/users/${connection.provider_user_id}/following`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return {
        success: false,
        completed: false,
        error: 'Failed to verify Twitter following status'
      };
    }

    const data = await response.json();
    const isFollowing = data.data?.some((user: any) => user.username === targetUsername);

    return {
      success: true,
      completed: isFollowing,
      details: { following: isFollowing, targetUsername }
    };

  } catch (error: any) {
    return {
      success: false,
      completed: false,
      error: error.message || 'Twitter verification failed'
    };
  }
}

// Discord server membership verification
export async function verifyDiscordMembership(walletAddress: string, serverId: string): Promise<SocialVerificationResult> {
  try {
    const { data: connection, error } = await supabase
      .from('wallet_socials')
      .select('access_token, provider_user_id')
      .eq('wallet_address', walletAddress.toLowerCase())
      .eq('provider', 'discord')
      .single();

    if (error || !connection?.access_token) {
      return {
        success: false,
        completed: false,
        error: 'No Discord connection found'
      };
    }

    // Check Discord guild membership
    const response = await fetch(`https://discord.com/api/users/@me/guilds/${serverId}/member`, {
      headers: {
        'Authorization': `Bearer ${connection.access_token}`
      }
    });

    const isMember = response.ok;

    return {
      success: true,
      completed: isMember,
      details: { serverId, isMember }
    };

  } catch (error: any) {
    return {
      success: false,
      completed: false,
      error: error.message || 'Discord verification failed'
    };
  }
}

// GitHub repository star verification
export async function verifyGitHubStar(walletAddress: string, repoOwner: string, repoName: string): Promise<SocialVerificationResult> {
  try {
    const { data: connection, error } = await supabase
      .from('wallet_socials')
      .select('access_token, provider_username')
      .eq('wallet_address', walletAddress.toLowerCase())
      .eq('provider', 'github')
      .single();

    if (error || !connection?.access_token) {
      return {
        success: false,
        completed: false,
        error: 'No GitHub connection found'
      };
    }

    // Check if user has starred the repository
    const response = await fetch(`https://api.github.com/user/starred/${repoOwner}/${repoName}`, {
      headers: {
        'Authorization': `Bearer ${connection.access_token}`
      }
    });

    const hasStarred = response.status === 204; // 204 = starred, 404 = not starred

    return {
      success: true,
      completed: hasStarred,
      details: { repo: `${repoOwner}/${repoName}`, hasStarred }
    };

  } catch (error: any) {
    return {
      success: false,
      completed: false,
      error: error.message || 'GitHub verification failed'
    };
  }
}

// Generic verification function that routes to specific provider
export async function verifySocialTask(
  walletAddress: string,
  provider: 'twitter' | 'discord' | 'github' | 'google',
  action: string,
  params: any
): Promise<SocialVerificationResult> {
  switch (provider) {
    case 'twitter':
      if (action === 'follow') {
        return verifyTwitterFollow(walletAddress, params.username);
      }
      break;

    case 'discord':
      if (action === 'join_server') {
        return verifyDiscordMembership(walletAddress, params.serverId);
      }
      break;

    case 'github':
      if (action === 'star_repo') {
        return verifyGitHubStar(walletAddress, params.owner, params.repo);
      }
      break;
  }

  return {
    success: false,
    completed: false,
    error: `Unsupported verification: ${provider} ${action}`
  };
}
