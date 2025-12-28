import { supabase } from '../config/supabase';

export interface TaskRequirement {
  platform: 'twitter' | 'discord' | 'github' | 'google';
  action: 'follow' | 'like' | 'retweet' | 'join' | 'star' | 'fork';
  target: string; // username, channel ID, repo name, etc.
}

export interface VerificationResult {
  success: boolean;
  error?: string;
  details?: any;
}

// Get encrypted access token for a user's social connection
async function getAccessToken(walletAddress: string, platform: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('wallet_socials')
      .select('access_token')
      .eq('wallet_address', walletAddress.toLowerCase())
      .eq('provider', platform)
      .single();

    if (error || !data?.access_token) {
      return null;
    }

    // In a real implementation, you'd decrypt the token here
    // For now, we'll assume tokens are stored in plain text for development
    return data.access_token;
  } catch (error) {
    console.error('Error getting access token:', error);
    return null;
  }
}

// Twitter API verification
async function verifyTwitterAction(accessToken: string, action: string, target: string): Promise<VerificationResult> {
  try {
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    switch (action) {
      case 'follow':
        // Check if user follows the target account
        const followResponse = await fetch(
          `https://api.twitter.com/2/users/me/following?user.fields=id,username`,
          { headers }
        );

        if (!followResponse.ok) {
          return { success: false, error: 'Failed to fetch following list' };
        }

        const followData = await followResponse.json();
        const isFollowing = followData.data?.some((user: any) =>
          user.username.toLowerCase() === target.toLowerCase()
        );

        return {
          success: isFollowing || false,
          details: { following: followData.data?.length || 0 }
        };

      default:
        return { success: false, error: `Unsupported Twitter action: ${action}` };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Discord API verification
async function verifyDiscordAction(accessToken: string, action: string, target: string): Promise<VerificationResult> {
  try {
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    switch (action) {
      case 'join':
        // Check if user is in the target guild/server
        const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', { headers });

        if (!guildsResponse.ok) {
          return { success: false, error: 'Failed to fetch user guilds' };
        }

        const guilds = await guildsResponse.json();
        const isInGuild = guilds.some((guild: any) => guild.id === target);

        return {
          success: isInGuild,
          details: { guildCount: guilds.length }
        };

      default:
        return { success: false, error: `Unsupported Discord action: ${action}` };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// GitHub API verification
async function verifyGithubAction(accessToken: string, action: string, target: string): Promise<VerificationResult> {
  try {
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.github.v3+json'
    };

    switch (action) {
      case 'star':
        // Check if user starred the target repo
        const starResponse = await fetch(
          `https://api.github.com/user/starred/${target}`,
          { headers }
        );

        return {
          success: starResponse.status === 204, // 204 means starred, 404 means not starred
          details: { repo: target }
        };

      case 'fork':
        // Check if user forked the target repo
        const forkResponse = await fetch(
          `https://api.github.com/repos/${target}/forks`,
          { headers }
        );

        if (!forkResponse.ok) {
          return { success: false, error: 'Failed to fetch forks' };
        }

        const forks = await forkResponse.json();
        const userLogin = await getGithubUserLogin(accessToken);

        if (!userLogin) {
          return { success: false, error: 'Could not get user login' };
        }

        const hasForked = forks.some((fork: any) => fork.owner.login === userLogin);

        return {
          success: hasForked,
          details: { forkCount: forks.length }
        };

      default:
        return { success: false, error: `Unsupported GitHub action: ${action}` };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Helper function to get GitHub user login
async function getGithubUserLogin(accessToken: string): Promise<string | null> {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) return null;

    const user = await response.json();
    return user.login;
  } catch (error) {
    return null;
  }
}

// Main verification function
export async function verifyTaskCompletion(
  walletAddress: string,
  requirement: TaskRequirement
): Promise<VerificationResult> {
  try {
    // Get access token for the platform
    const accessToken = await getAccessToken(walletAddress, requirement.platform);

    if (!accessToken) {
      return {
        success: false,
        error: `No connected ${requirement.platform} account found`
      };
    }

    // Verify based on platform
    switch (requirement.platform) {
      case 'twitter':
        return await verifyTwitterAction(accessToken, requirement.action, requirement.target);

      case 'discord':
        return await verifyDiscordAction(accessToken, requirement.action, requirement.target);

      case 'github':
        return await verifyGithubAction(accessToken, requirement.action, requirement.target);

      default:
        return { success: false, error: `Unsupported platform: ${requirement.platform}` };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Batch verification for multiple requirements
export async function verifyMultipleRequirements(
  walletAddress: string,
  requirements: TaskRequirement[]
): Promise<{ [key: string]: VerificationResult }> {
  const results: { [key: string]: VerificationResult } = {};

  for (const req of requirements) {
    const key = `${req.platform}_${req.action}_${req.target}`;
    results[key] = await verifyTaskCompletion(walletAddress, req);
  }

  return results;
}
