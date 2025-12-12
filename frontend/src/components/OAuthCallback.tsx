/**
 * OAuth Callback Handler for Supabase Auth
 * Handles redirects after OAuth authentication
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleOAuthCallback } from '../services/oauthService';

export function OAuthCallback() {
  const [status, setStatus] = useState('Processing authentication...');
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('🔄 Processing OAuth callback...');

        const result = await handleOAuthCallback();

        if (result.success) {
          setIsSuccess(true);
          setStatus('Authentication successful! Redirecting...');

          console.log('✅ OAuth authentication successful');

          // Redirect to dashboard after successful auth
          setTimeout(() => {
            navigate('/dashboard');
          }, 1500);

        } else {
          setStatus(`Authentication failed: ${result.error}`);
          console.error('❌ OAuth authentication failed:', result.error);

          // Redirect back to home after error
          setTimeout(() => {
            navigate('/');
          }, 3000);
        }

      } catch (error: any) {
        console.error('❌ OAuth callback error:', error);
        setStatus(`Error: ${error.message || 'Authentication failed'}`);

        // Redirect back to home after error
        setTimeout(() => {
          navigate('/');
        }, 3000);
      }
    };

    handleCallback();
  }, [navigate]);

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
          {isSuccess ? 'You will be redirected shortly.' : 'Redirecting you back...'}
        </p>
      </div>
    </div>
  );
}
