import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export function SocialCallback() {
  const [status, setStatus] = useState('Processing social connection...');
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const error = searchParams.get('error');
        const success = searchParams.get('social_connected');

        if (error) {
          setStatus(`Connection failed: ${error}`);
          setTimeout(() => navigate('/dashboard'), 3000);
          return;
        }

        if (success) {
          setIsSuccess(true);
          setStatus(`Successfully connected ${success}!`);
          setTimeout(() => navigate('/dashboard'), 2000);
          return;
        }

        // If no parameters, something went wrong
        setStatus('Connection completed but no confirmation received');
        setTimeout(() => navigate('/dashboard'), 3000);

      } catch (error: any) {
        console.error('Social callback error:', error);
        setStatus(`Error: ${error.message || 'Connection failed'}`);
        setTimeout(() => navigate('/dashboard'), 3000);
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

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
          {isSuccess ? 'Redirecting to dashboard...' : 'You will be redirected shortly...'}
        </p>
      </div>
    </div>
  );
}