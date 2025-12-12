/**
 * OAuth Service for Social Account Connections
 * Handles OAuth flows for Twitter, Discord, GitHub, and Google (Gmail)
 */

/**
 * Generate a random code verifier for PKCE
 */
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate code challenge from verifier
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

interface OAuthConfig {
  clientId: string;
  redirectUri: string;
  scope: string;
  responseType: string;
}

interface OAuthResult {
  success: boolean;
  account?: {
    platform: string;
    username?: string;
    email?: string;
    id?: string;
    avatar?: string;
    profileUrl?: string; // X/Twitter profile URL
  };
  error?: string;
}

// OAuth Configuration
// In production, these would come from environment variables
const OAUTH_CONFIGS: Record<string, OAuthConfig> = {
  twitter: {
    clientId: import.meta.env.VITE_TWITTER_CLIENT_ID || '',
    redirectUri: `${window.location.origin}/oauth/twitter/callback`,
    scope: 'tweet.read users.read offline.access',
    responseType: 'code',
  },
  discord: {
    clientId: import.meta.env.VITE_DISCORD_CLIENT_ID || '',
    redirectUri: `${window.location.origin}/oauth/discord/callback`,
    scope: 'identify email',
    responseType: 'code',
  },
  github: {
    clientId: import.meta.env.VITE_GITHUB_CLIENT_ID || '',
    redirectUri: `${window.location.origin}/oauth/github/callback`,
    scope: 'read:user user:email',
    responseType: 'code',
  },
  google: {
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
    redirectUri: `${window.location.origin}/oauth/google/callback`,
    scope: 'openid email profile',
    responseType: 'code',
  },
};

// OAuth Authorization URLs
const OAUTH_URLS: Record<string, string> = {
  twitter: 'https://twitter.com/i/oauth2/authorize',
  discord: 'https://discord.com/api/oauth2/authorize',
  github: 'https://github.com/login/oauth/authorize',
  google: 'https://accounts.google.com/o/oauth2/v2/auth',
};

/**
 * Open OAuth popup window
 */
function openOAuthPopup(url: string, name: string): Promise<OAuthResult> {
  return new Promise((resolve) => {
    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
      url,
      name,
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
    );

    if (!popup) {
      resolve({
        success: false,
        error: 'Popup blocked. Please allow popups for this site.',
      });
      return;
    }

    // Listen for postMessage from OAuth callback
    const messageHandler = (event: MessageEvent) => {
      // Verify message is from same origin (allow localhost variations)
      const currentOrigin = window.location.origin;
      const eventOrigin = event.origin;
      
      // Allow same origin or localhost variations (http vs https, different ports)
      const isSameOrigin = eventOrigin === currentOrigin ||
        (currentOrigin.includes('localhost') && eventOrigin.includes('localhost')) ||
        (currentOrigin.includes('127.0.0.1') && eventOrigin.includes('127.0.0.1')) ||
        eventOrigin === '*' || eventOrigin === 'null'; // Allow wildcard/null for same-origin popups
      
      if (!isSameOrigin) {
        console.warn('OAuth message from different origin:', eventOrigin, 'expected:', currentOrigin);
        return;
      }

      if (event.data && event.data.type === 'oauth_result' && event.data.platform === name) {
        console.log('✅ Received OAuth result for', name, event.data.result);
        window.removeEventListener('message', messageHandler);
        clearInterval(checkClosed);
        resolve(event.data.result);
        // Close popup if still open
        if (popup && !popup.closed) {
          try {
            popup.close();
          } catch (err) {
            console.warn('Could not close popup:', err);
          }
        }
      }
    };

    window.addEventListener('message', messageHandler);

    // Also check for localStorage (fallback) and popup closed
    const checkClosed = setInterval(() => {
      // Check localStorage periodically even if popup is still open (in case message was sent)
      const result = localStorage.getItem(`oauth_result_${name}`);
      if (result) {
        console.log('✅ Found OAuth result in localStorage for', name);
        clearInterval(checkClosed);
        window.removeEventListener('message', messageHandler);
        localStorage.removeItem(`oauth_result_${name}`);
        try {
          resolve(JSON.parse(result));
          // Close popup if still open
          if (!popup.closed) {
            popup.close();
          }
          return;
        } catch {
          resolve({
            success: false,
            error: 'Failed to parse OAuth result',
          });
          return;
        }
      }
      
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', messageHandler);
        
        // Final check for result in localStorage
        const finalResult = localStorage.getItem(`oauth_result_${name}`);
        if (finalResult) {
          localStorage.removeItem(`oauth_result_${name}`);
          try {
            resolve(JSON.parse(finalResult));
          } catch {
            resolve({
              success: false,
              error: 'Failed to parse OAuth result',
            });
          }
        } else {
          resolve({
            success: false,
            error: 'OAuth flow was cancelled',
          });
        }
      }
    }, 300); // Check more frequently

    // Timeout after 5 minutes
    setTimeout(() => {
      if (!popup.closed) {
        popup.close();
        clearInterval(checkClosed);
        window.removeEventListener('message', messageHandler);
        resolve({
          success: false,
          error: 'OAuth flow timed out',
        });
      }
    }, 300000);
  });
}

/**
 * Build OAuth authorization URL
 */
async function buildOAuthUrl(platform: string, config: OAuthConfig): Promise<string> {
  const baseUrl = OAUTH_URLS[platform];
  if (!baseUrl) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  // Generate state with timestamp for CSRF protection
  const stateId = `${platform}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: config.responseType,
    scope: config.scope,
    state: stateId, // CSRF protection
  });

  // Platform-specific parameters
  if (platform === 'twitter') {
    try {
      // Generate a proper code challenge for PKCE
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      // Store code verifier with a simple key for easy retrieval in callback
      // Use timestamp to ensure we get the most recent one
      const storageKey = `twitter_code_verifier_${Date.now()}`;
      sessionStorage.setItem(storageKey, codeVerifier);
      // Also store a reference to the latest key
      sessionStorage.setItem('twitter_latest_verifier_key', storageKey);
      params.append('code_challenge', codeChallenge);
      params.append('code_challenge_method', 'S256');
    } catch (error) {
      // Fallback to plain method if PKCE generation fails
      console.warn('PKCE generation failed, using plain method:', error);
      const codeVerifier = `challenge_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const storageKey = `twitter_code_verifier_${Date.now()}`;
      sessionStorage.setItem(storageKey, codeVerifier);
      sessionStorage.setItem('twitter_latest_verifier_key', storageKey);
      params.append('code_challenge', codeVerifier);
      params.append('code_challenge_method', 'plain');
    }
  }

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Connect Twitter account
 */
export async function connectTwitter(): Promise<OAuthResult> {
  try {
    const config = OAUTH_CONFIGS.twitter;
    
    // Check if client ID is properly configured (not empty string)
    if (!config.clientId || config.clientId.trim() === '') {
      console.warn('Twitter OAuth client ID not configured, using demo mode');
      // Fallback: Use demo mode with user input
      return connectTwitterDemo();
    }

    const url = await buildOAuthUrl('twitter', config);
    const result = await openOAuthPopup(url, 'twitter');

    if (result.success && result.account) {
      // Generate X profile URL from username
      const profileUrl = result.account.username 
        ? `https://x.com/${result.account.username.replace('@', '')}`
        : result.account.profileUrl;

      return {
        success: true,
        account: {
          platform: 'twitter',
          username: result.account.username,
          id: result.account.id,
          avatar: result.account.avatar,
          profileUrl: profileUrl,
        },
      };
    }

    return result;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to connect Twitter',
    };
  }
}

/**
 * Connect Discord account
 */
export async function connectDiscord(): Promise<OAuthResult> {
  try {
    const config = OAUTH_CONFIGS.discord;
    
    // Check if client ID is properly configured (not empty string)
    if (!config.clientId || config.clientId.trim() === '') {
      console.warn('Discord OAuth client ID not configured, using demo mode');
      return connectDiscordDemo();
    }

    const url = await buildOAuthUrl('discord', config);
    const result = await openOAuthPopup(url, 'discord');

    if (result.success && result.account) {
      return {
        success: true,
        account: {
          platform: 'discord',
          username: result.account.username,
          email: result.account.email,
          id: result.account.id,
          avatar: result.account.avatar,
        },
      };
    }

    return result;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to connect Discord',
    };
  }
}

/**
 * Connect GitHub account
 */
export async function connectGithub(): Promise<OAuthResult> {
  try {
    const config = OAUTH_CONFIGS.github;
    
    // Check if client ID is properly configured (not empty string)
    if (!config.clientId || config.clientId.trim() === '') {
      console.warn('GitHub OAuth client ID not configured, using demo mode');
      return connectGithubDemo();
    }

    const url = await buildOAuthUrl('github', config);
    const result = await openOAuthPopup(url, 'github');

    if (result.success && result.account) {
      return {
        success: true,
        account: {
          platform: 'github',
          username: result.account.username,
          email: result.account.email,
          id: result.account.id,
          avatar: result.account.avatar,
        },
      };
    }

    return result;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to connect GitHub',
    };
  }
}

/**
 * Connect Google/Gmail account
 */
export async function connectGoogle(): Promise<OAuthResult> {
  try {
    const config = OAUTH_CONFIGS.google;
    
    // Check if client ID is properly configured (not empty string)
    if (!config.clientId || config.clientId.trim() === '') {
      console.warn('Google OAuth client ID not configured, using demo mode');
      return connectGoogleDemo();
    }

    const url = await buildOAuthUrl('google', config);
    const result = await openOAuthPopup(url, 'google');

    if (result.success && result.account) {
      return {
        success: true,
        account: {
          platform: 'email',
          email: result.account.email,
          username: result.account.username,
          id: result.account.id,
          avatar: result.account.avatar,
        },
      };
    }

    return result;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to connect Google',
    };
  }
}

/**
 * Demo mode: Prompt user for their username/email
 * This is used when OAuth client IDs are not configured
 */
function connectTwitterDemo(): Promise<OAuthResult> {
  return new Promise((resolve) => {
    const username = prompt('Enter your Twitter/X username (without @):');
    if (username && username.trim()) {
      resolve({
        success: true,
        account: {
          platform: 'twitter',
          username: username.trim(),
          id: `demo_${Date.now()}`,
        },
      });
    } else {
      resolve({
        success: false,
        error: 'Username is required',
      });
    }
  });
}

function connectDiscordDemo(): Promise<OAuthResult> {
  return new Promise((resolve) => {
    const username = prompt('Enter your Discord username:');
    if (username && username.trim()) {
      resolve({
        success: true,
        account: {
          platform: 'discord',
          username: username.trim(),
          id: `demo_${Date.now()}`,
        },
      });
    } else {
      resolve({
        success: false,
        error: 'Username is required',
      });
    }
  });
}

function connectGithubDemo(): Promise<OAuthResult> {
  return new Promise((resolve) => {
    const username = prompt('Enter your GitHub username:');
    if (username && username.trim()) {
      resolve({
        success: true,
        account: {
          platform: 'github',
          username: username.trim(),
          id: `demo_${Date.now()}`,
        },
      });
    } else {
      resolve({
        success: false,
        error: 'Username is required',
      });
    }
  });
}

function connectGoogleDemo(): Promise<OAuthResult> {
  return new Promise((resolve) => {
    const email = prompt('Enter your Gmail address:');
    if (email && email.trim() && email.includes('@')) {
      resolve({
        success: true,
        account: {
          platform: 'email',
          email: email.trim(),
          username: email.trim().split('@')[0],
          id: `demo_${Date.now()}`,
        },
      });
    } else {
      resolve({
        success: false,
        error: 'Valid email is required',
      });
    }
  });
}

