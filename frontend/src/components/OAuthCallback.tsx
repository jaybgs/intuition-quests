/**
 * OAuth Callback Handler for Supabase Auth
 * Handles redirects after OAuth authentication
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleOAuthCallback } from '../services/oauthService';
import { supabase } from '../config/supabase';

export function OAuthCallback() {
  const [status, setStatus] = useState('Processing authentication...');
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('🔄 Processing OAuth callback...');

        // Check if we have URL fragments (implicit flow)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');

        if (accessToken) {
          console.log('🔑 Found access token in URL fragment, setting session...');

          if (!supabase) {
            setStatus('Supabase not configured');
            setTimeout(() => navigate('/'), 3000);
            return;
          }

          // Set the session from URL fragments
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: hashParams.get('refresh_token') || '',
          });

          if (error) {
            console.error('❌ Error setting session from URL:', error);
            setStatus(`Authentication failed: ${error.message}`);
            setTimeout(() => navigate('/'), 3000);
            return;
          }

          // Clear the URL fragment
          window.history.replaceState({}, document.title, window.location.pathname);

          setIsSuccess(true);
          setStatus('Authentication successful! Redirecting...');
          setTimeout(() => navigate('/dashboard'), 1500);
          return;
        }

        // Normal callback flow
        const result = await handleOAuthCallback();

        if (result.success) {
          setIsSuccess(true);
          setStatus('Authentication successful! Redirecting...');
          console.log('✅ OAuth authentication successful');
          setTimeout(() => navigate('/dashboard'), 1500);
        } else {
          setStatus(`Authentication failed: ${result.error}`);
          console.error('❌ OAuth authentication failed:', result.error);
          setTimeout(() => navigate('/'), 3000);
        }

      } catch (error: any) {
        console.error('❌ OAuth callback error:', error);
        setStatus(`Error: ${error.message || 'Authentication failed'}`);
        setTimeout(() => navigate('/'), 3000);
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
