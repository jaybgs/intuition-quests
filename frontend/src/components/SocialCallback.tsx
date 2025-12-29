import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../services/apiClient';

// Global flag to prevent duplicate OAuth processing across component instances
let globalOauthProcessing = false;

export function SocialCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('Processing OAuth callback...');
  const [isSuccess, setIsSuccess] = useState(false);
  const [hasProcessed, setHasProcessed] = useState(false);

  useEffect(() => {
    console.log('🔄 SocialCallback useEffect triggered, hasProcessed:', hasProcessed, 'globalProcessing:', globalOauthProcessing);

    // Prevent duplicate processing (both local and global)
    if (hasProcessed || globalOauthProcessing) {
      console.log('❌ OAuth callback already processed (local or global), skipping');
      return;
    }

    console.log('✅ Processing OAuth callback for first time');
    globalOauthProcessing = true;

    const handleCallback = async () => {
      console.log('🚀 Starting OAuth callback processing');
      setHasProcessed(true);
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        if (error) {
          console.error('OAuth error:', error);
          setStatus(`OAuth failed: ${error}`);
          setTimeout(() => {
            console.log('Redirecting to dashboard after OAuth error');
            globalOauthProcessing = false; // Reset global flag
            window.location.href = '/dashboard';
          }, 2000);
          return;
        }

        if (!code || !state) {
          console.log('Missing OAuth parameters - closing in 2s');
          setStatus('Missing OAuth parameters');
          setTimeout(() => {
            console.log('Redirecting to dashboard after missing parameters error');
            globalOauthProcessing = false; // Reset global flag
            window.location.href = '/dashboard';
          }, 2000);
          return;
        }

        setStatus('Exchanging authorization code...');

        console.log('Sending OAuth callback to backend:', { code: code.substring(0, 10) + '...', state: state.substring(0, 10) + '...' });

        // Send code to backend for token exchange
        // Provider is now extracted from the state JWT token in the backend
        const response = await apiClient.post('/social/callback', {
          code,
          state
        });

        console.log('Backend response:', response.data);

        if (response.data.success) {
          console.log('OAuth success! Provider:', response.data.provider);
          setIsSuccess(true);
          setStatus(`Successfully connected ${response.data.provider}!`);

          // Redirect back to dashboard after success (force full page reload)
          setTimeout(() => {
            console.log('Redirecting to dashboard after OAuth success');
            globalOauthProcessing = false; // Reset global flag
            window.location.href = '/dashboard';
          }, 1500);
        } else {
          console.log('Backend returned success=false, throwing error');
          throw new Error(response.data.error || 'OAuth callback failed');
        }

      } catch (error: any) {
        console.error('OAuth callback error caught:', error);
        console.error('Error details:', error.response?.data || error.message);
        const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
        console.log('Setting status to:', `OAuth failed: ${errorMessage}`);
        setStatus(`OAuth failed: ${errorMessage}`);

        // Show error and redirect back to dashboard (force full page reload)
        setTimeout(() => {
          console.log('Redirecting to dashboard after OAuth error');
          globalOauthProcessing = false; // Reset global flag
          window.location.href = '/dashboard';
        }, 8000); // Increased to 8 seconds so user can see the error
      }
    };

    handleCallback();
  }, [searchParams, navigate, hasProcessed]);

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
        <div style={{
          fontSize: '48px',
          marginBottom: '16px'
        }}>
          {isSuccess ? '✅' : status.includes('Error') || status.includes('failed') ? '❌' : '🔄'}
        </div>
        <h2 style={{ marginBottom: '16px' }}>{status}</h2>
        <p style={{ opacity: 0.8 }}>
          {isSuccess ? 'You can close this window.' : 'This window will close automatically...'}
        </p>
      </div>
    </div>
  );
}