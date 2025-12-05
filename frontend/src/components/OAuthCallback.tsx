import { useEffect, useState } from 'react';
import { exchangeOAuthCode } from '../services/oauthBackend';

/**
 * OAuth Callback Handler
 * This component handles OAuth redirects and communicates back to the parent window
 */
export function OAuthCallback() {
  const [status, setStatus] = useState('Processing...');

  useEffect(() => {
    const handleOAuthCallback = async () => {
      // Get platform from URL path
      const path = window.location.pathname;
      let platform: 'twitter' | 'discord' | 'github' | 'google' | '' = '';
      
      if (path.includes('/oauth/twitter/callback')) {
        platform = 'twitter';
      } else if (path.includes('/oauth/discord/callback')) {
        platform = 'discord';
      } else if (path.includes('/oauth/github/callback')) {
        platform = 'github';
      } else if (path.includes('/oauth/google/callback')) {
        platform = 'google';
      }

      // Get authorization code or error from URL
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');
      const errorDescription = urlParams.get('error_description');

      if (error) {
        // OAuth error occurred
        const result = {
          success: false,
          error: errorDescription || error,
        };
        
        setStatus('Connection failed');
        
        // Try to communicate with parent window
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({ type: 'oauth_result', platform, result }, window.location.origin);
          setTimeout(() => window.close(), 1000);
        } else {
          // Fallback to localStorage
          localStorage.setItem(`oauth_result_${platform}`, JSON.stringify(result));
          setTimeout(() => window.close(), 1000);
        }
        return;
      }

      if (code && platform) {
        setStatus('Fetching your account information...');
        
        // Try to exchange code for user data via backend
        const redirectUri = `${window.location.origin}/oauth/${platform}/callback`;
        const exchangeResult = await exchangeOAuthCode(platform, code, redirectUri);
        
        if (exchangeResult.success && exchangeResult.account) {
          // Success! We got real user data from backend
          const result = {
            success: true,
            account: exchangeResult.account,
          };

          setStatus('Connected! Closing...');

          // Try to communicate with parent window via postMessage (preferred method)
          if (window.opener && !window.opener.closed) {
            try {
              window.opener.postMessage({ type: 'oauth_result', platform, result }, window.location.origin);
              // Close popup after ensuring message is sent
              setTimeout(() => {
                if (window.opener && !window.opener.closed) {
                  window.close();
                }
              }, 300);
            } catch (err) {
              // Fallback to localStorage if postMessage fails
              console.error('postMessage failed, using localStorage fallback:', err);
              localStorage.setItem(`oauth_result_${platform}`, JSON.stringify(result));
              setTimeout(() => {
                window.close();
              }, 500);
            }
          } else {
            // Fallback to localStorage if no opener
            localStorage.setItem(`oauth_result_${platform}`, JSON.stringify(result));
            setTimeout(() => {
              window.close();
            }, 500);
          }
        } else {
          // Backend exchange failed, fall back to demo mode
          // Prompt user for their actual username
          setStatus('Please enter your username...');
          
          // For Google/email, prompt for email instead
          const promptText = platform === 'google' 
            ? `Enter your Gmail address:` 
            : `Enter your ${platform} username (without @):`;
          
          const input = prompt(promptText);
          if (input && input.trim()) {
            const trimmedInput = input.trim();
            
            // Validate input - reject placeholder names
            if (trimmedInput.toLowerCase().includes('_user') || 
                trimmedInput.toLowerCase() === 'user' ||
                trimmedInput.toLowerCase() === platform) {
              const result = {
                success: false,
                error: 'Please enter a valid username',
              };
              
              if (window.opener && !window.opener.closed) {
                window.opener.postMessage({ type: 'oauth_result', platform, result }, window.location.origin);
                setTimeout(() => window.close(), 1000);
              } else {
                localStorage.setItem(`oauth_result_${platform}`, JSON.stringify(result));
                setTimeout(() => window.close(), 1000);
              }
              return;
            }
            
            const result = {
              success: true,
              account: platform === 'google' 
                ? {
                    platform: 'email',
                    email: trimmedInput,
                    username: trimmedInput.split('@')[0],
                    id: `oauth_${platform}_${Date.now()}`,
                  }
                : {
                    platform,
                    username: trimmedInput,
                    id: `oauth_${platform}_${Date.now()}`,
                  },
            };

            setStatus('Connected! Closing...');

            if (window.opener && !window.opener.closed) {
              try {
                window.opener.postMessage({ type: 'oauth_result', platform, result }, window.location.origin);
                setTimeout(() => {
                  if (window.opener) {
                    window.close();
                  }
                }, 500);
              } catch (err) {
                localStorage.setItem(`oauth_result_${platform}`, JSON.stringify(result));
                setTimeout(() => {
                  window.close();
                }, 500);
              }
            } else {
              localStorage.setItem(`oauth_result_${platform}`, JSON.stringify(result));
              setTimeout(() => {
                window.close();
              }, 500);
            }
          } else {
            // User cancelled
            const result = {
              success: false,
              error: 'Username is required',
            };
            
            if (window.opener && !window.opener.closed) {
              window.opener.postMessage({ type: 'oauth_result', platform, result }, window.location.origin);
              setTimeout(() => window.close(), 1000);
            } else {
              localStorage.setItem(`oauth_result_${platform}`, JSON.stringify(result));
              setTimeout(() => window.close(), 1000);
            }
          }
        }
      } else {
        // No code or platform found
        const result = {
          success: false,
          error: 'No authorization code received',
        };
        
        setStatus('Error: No code received');
        
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({ type: 'oauth_result', platform, result }, window.location.origin);
          setTimeout(() => window.close(), 1000);
        } else {
          localStorage.setItem(`oauth_result_${platform}`, JSON.stringify(result));
          setTimeout(() => window.close(), 1000);
        }
      }
    };

    handleOAuthCallback();
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      fontFamily: 'system-ui',
      color: '#fff',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>✓</div>
        <h2>{status}</h2>
        <p>This window will close automatically.</p>
      </div>
    </div>
  );
}

