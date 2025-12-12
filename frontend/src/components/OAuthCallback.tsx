import { useEffect, useState } from 'react';
import { exchangeOAuthCode } from '../services/oauthBackend';

/**
 * OAuth Callback Handler
 * This component handles OAuth redirects and communicates back to the parent window
 */
export function OAuthCallback() {
  const [status, setStatus] = useState('Processing...');
  const [hasProcessed, setHasProcessed] = useState(false);

  useEffect(() => {
    // Prevent multiple executions
    if (hasProcessed) {
      return;
    }

    const handleOAuthCallback = async () => {
      // Mark as processing immediately to prevent re-runs
      setHasProcessed(true);
      
      // Prevent page refresh/redirect loops
      if (window.history.replaceState) {
        // Replace current URL to prevent back button issues
        window.history.replaceState({}, '', window.location.href);
      }
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
        
        // For Twitter, retrieve code_verifier from sessionStorage (PKCE requirement)
        let codeVerifier: string | undefined;
        if (platform === 'twitter') {
          // Get the latest verifier key reference
          const latestKey = sessionStorage.getItem('twitter_latest_verifier_key');
          if (latestKey) {
            codeVerifier = sessionStorage.getItem(latestKey) || undefined;
            // Clean up after retrieving
            if (codeVerifier) {
              sessionStorage.removeItem(latestKey);
              sessionStorage.removeItem('twitter_latest_verifier_key');
            }
          }
          console.log('🔑 Retrieved code_verifier for Twitter:', codeVerifier ? 'Yes' : 'No');
        }
        
        let exchangeResult;
        
        try {
          console.log('🔄 Attempting OAuth exchange for', platform, 'with code:', code.substring(0, 20) + '...');
          console.log('📍 Redirect URI:', redirectUri);
          exchangeResult = await exchangeOAuthCode(platform, code, redirectUri, codeVerifier);
          console.log('📥 OAuth exchange result:', exchangeResult);
          
          if (!exchangeResult.success) {
            console.error('❌ OAuth exchange returned failure:', exchangeResult.error);
            setStatus(`Error: ${exchangeResult.error || 'Failed to verify account'}`);
          }
        } catch (err: any) {
          console.error('❌ OAuth backend exchange exception:', err);
          console.error('Error response:', err.response?.data);
          console.error('Error status:', err.response?.status);
          console.error('Error message:', err.message);
          setStatus(`Error: ${err.response?.data?.error || err.message || 'Backend connection failed'}`);
          exchangeResult = { 
            success: false, 
            error: err.response?.data?.error || err.message || 'Backend exchange failed' 
          };
        }
        
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
              const message = { type: 'oauth_result', platform, result };
              console.log('📤 Sending OAuth result to parent:', message);
              window.opener.postMessage(message, window.location.origin);
              // Also try with wildcard origin as fallback
              try {
                window.opener.postMessage(message, '*');
              } catch (wildcardErr) {
                console.warn('Wildcard postMessage failed:', wildcardErr);
              }
              // Close popup after ensuring message is sent
              setTimeout(() => {
                try {
                  console.log('🔒 Closing OAuth popup window');
                  window.close();
                } catch (closeErr) {
                  console.warn('Could not close window automatically:', closeErr);
                }
              }, 500);
            } catch (err) {
              // Fallback to localStorage if postMessage fails
              console.error('postMessage failed, using localStorage fallback:', err);
              localStorage.setItem(`oauth_result_${platform}`, JSON.stringify(result));
              setTimeout(() => {
                try {
                  window.close();
                } catch (closeErr) {
                  console.warn('Could not close window automatically:', closeErr);
                }
              }, 500);
            }
          } else {
            // Fallback to localStorage if no opener
            console.log('⚠️ No window.opener, using localStorage fallback');
            localStorage.setItem(`oauth_result_${platform}`, JSON.stringify(result));
            setTimeout(() => {
              try {
                window.close();
              } catch (closeErr) {
                console.warn('Could not close window automatically:', closeErr);
              }
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
                  try {
                    window.close();
                  } catch (closeErr) {
                    console.warn('Could not close window automatically:', closeErr);
                  }
                }, 500);
              } catch (err) {
                localStorage.setItem(`oauth_result_${platform}`, JSON.stringify(result));
                setTimeout(() => {
                  try {
                    window.close();
                  } catch (closeErr) {
                    console.warn('Could not close window automatically:', closeErr);
                  }
                }, 500);
              }
            } else {
              localStorage.setItem(`oauth_result_${platform}`, JSON.stringify(result));
              setTimeout(() => {
                try {
                  window.close();
                } catch (closeErr) {
                  console.warn('Could not close window automatically:', closeErr);
                }
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

  const handleManualClose = () => {
    try {
      window.close();
    } catch (err) {
      // If we can't close, try to redirect to a page that can close
      window.location.href = 'about:blank';
    }
  };

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
      padding: '20px',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>
          {status.includes('Error') || status.includes('failed') ? '✗' : '✓'}
        </div>
        <h2>{status}</h2>
        <p style={{ marginTop: '16px', marginBottom: '24px' }}>
          {status.includes('Error') || status.includes('failed') 
            ? 'You can close this window manually.' 
            : 'This window will close automatically.'}
        </p>
        {(status.includes('Error') || status.includes('failed') || status.includes('Connected')) && (
          <button
            onClick={handleManualClose}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '600',
              color: '#fff',
              background: 'rgba(255, 255, 255, 0.2)',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.3s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            }}
          >
            Close Window
          </button>
        )}
      </div>
    </div>
  );
}

