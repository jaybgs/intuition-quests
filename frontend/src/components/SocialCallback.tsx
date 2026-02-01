import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../services/apiClient';
import { showToast } from './Toast';

// Global flag to prevent duplicate processing
declare global {
  var oauthProcessing: boolean;
}

if (typeof global.oauthProcessing === 'undefined') {
  global.oauthProcessing = false;
}

export function SocialCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<string>('Processing OAuth callback...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Prevent duplicate processing
        // Just return, do not redirect, to avoid interfering with the main thread
        if (global.oauthProcessing) {
          console.log('❌ OAuth callback already processed (global), skipping');
          return;
        }

        global.oauthProcessing = true;

        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        console.log('🔄 SocialCallback useEffect triggered');
        console.log('   Code:', code ? 'present' : 'missing');
        console.log('   State:', state ? 'present' : 'missing');
        console.log('   Error:', error || 'none');

        if (error) {
          console.error('OAuth error:', error);
          setStatus(`OAuth failed: ${error}`);
          showToast(`OAuth failed: ${error}`, 'error');
          setTimeout(() => {
            global.oauthProcessing = false;
            navigate('/dashboard');
          }, 3000);
          return;
        }

        if (!code || !state) {
          console.error('Missing OAuth parameters');
          setStatus('OAuth failed: Missing parameters');
          showToast('OAuth failed: Missing parameters', 'error');
          setTimeout(() => {
            global.oauthProcessing = false;
            navigate('/dashboard');
          }, 3000);
          return;
        }

        setStatus('Exchanging authorization code...');

        // Retrieve PKCE codeVerifier from sessionStorage (for Twitter)
        const codeVerifier = sessionStorage.getItem('oauth_code_verifier');
        if (codeVerifier) {
          console.log('🔐 Retrieved PKCE code verifier from sessionStorage');
          sessionStorage.removeItem('oauth_code_verifier'); // Clean up
        }

        // Send code, state, and codeVerifier to backend for processing
        const response = await apiClient.post('/social/callback', {
          code,
          state,
          ...(codeVerifier && { codeVerifier })
        });

        console.log('✅ OAuth callback successful:', response.data);
        console.log('🔍 Response details:', {
          provider: response.data.provider,
          userId: response.data.userId,
          username: response.data.username
        });

        setStatus('OAuth successful! Redirecting...');
        showToast(`Successfully connected ${response.data.provider} account!`, 'success');

        // Signal to dashboard that connections need to be refreshed
        sessionStorage.setItem('oauth_success', 'true');

        // Also try to notify the parent window (if this is a popup)
        if (window.opener) {
          try {
            window.opener.postMessage({ type: 'OAUTH_SUCCESS', provider: response.data.provider }, '*');
          } catch (e) {
            console.log('Could not notify parent window:', e);
          }
        }

        // Redirect to dashboard after success
        setTimeout(() => {
          global.oauthProcessing = false; // Reset flag
          navigate('/dashboard', { replace: true });
        }, 2000);

      } catch (error: any) {
        console.error('❌ OAuth callback error caught:', error);

        let errorMessage = 'OAuth failed';
        if (error.response?.data?.error) {
          errorMessage = error.response.data.error;
        } else if (error.message) {
          errorMessage = error.message;
        }

        setStatus(`OAuth failed: ${errorMessage}`);
        showToast(`OAuth failed: ${errorMessage}`, 'error');

        // Redirect to dashboard after error
        setTimeout(() => {
          global.oauthProcessing = false; // Reset flag
          navigate('/dashboard', { replace: true });
        }, 3000);
      }
    };

    handleCallback();

    // Cleanup: Reset processing flag when component unmounts
    return () => {
      global.oauthProcessing = false;
    };
  }, []); // Empty dependency array to run only once

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
      textAlign: 'center'
    }}>
      <div style={{
        width: '400px',
        padding: '40px',
        borderRadius: '12px',
        backgroundColor: 'var(--bg-primary)',
        border: '1px solid var(--border-color)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          margin: '0 auto 20px',
          border: '4px solid var(--border-color)',
          borderTop: '4px solid var(--accent-color)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />

        <h2 style={{
          margin: '0 0 16px 0',
          color: 'var(--text-primary)',
          fontSize: '24px',
          fontWeight: '600'
        }}>
          Connecting Account
        </h2>

        <p style={{
          margin: '0',
          color: 'var(--text-secondary)',
          fontSize: '16px',
          lineHeight: '1.5'
        }}>
          {status}
        </p>
      </div>

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
