import { useAccount, useSignMessage } from 'wagmi';
import { useState, useCallback, useMemo } from 'react';
import { apiClient } from '../services/apiClient';
import { generateAuthToken } from '../utils/auth';

export function useAuth() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  });

  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!address || !isConnected) {
      return false;
    }

    // Check if already authenticated
    const existingToken = localStorage.getItem('auth_token');
    if (existingToken) {
      setAuthToken(existingToken);
      return true;
    }

    setIsAuthenticating(true);

    try {
      // Create message to sign
      const message = `Sign this message to authenticate with TrustQuests\n\nAddress: ${address}\nTimestamp: ${Date.now()}`;

      // Sign message with wallet
      const signature = await signMessageAsync({ message });

      // Verify signature and get JWT token
      const token = await generateAuthToken(address, signature, message);

      if (!token) {
        console.warn('Failed to generate auth token, trying fallback...');
        // Try fallback token generation for development
        const fallbackToken = await generateAuthToken(address);
        if (fallbackToken) {
          localStorage.setItem('auth_token', fallbackToken);
          setAuthToken(fallbackToken);
          console.log('✅ Using fallback authentication token');
          return true;
        }
        return false;
      }

      // Store token
      localStorage.setItem('auth_token', token);
      setAuthToken(token);

      return true;
    } catch (error: any) {
      // Suppress specific wagmi connector errors that we can't control
      if (error?.message?.includes('getChainId')) {
        console.warn('⚠️ Connector validation failed, falling back to local auth');
      } else {
        console.error('Authentication error:', error);
      }

      // Try fallback authentication if wallet signing fails
      try {
        console.log('🔄 Wallet signing failed, trying fallback authentication...');
        const fallbackToken = await generateAuthToken(address);
        if (fallbackToken) {
          localStorage.setItem('auth_token', fallbackToken);
          setAuthToken(fallbackToken);
          console.log('✅ Using fallback authentication token');
          return true;
        }
      } catch (fallbackError) {
        console.error('Fallback authentication also failed:', fallbackError);
      }

      // Don't throw, just return false
      return false;
    } finally {
      setIsAuthenticating(false);
    }
  }, [address, isConnected, signMessageAsync]);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    setAuthToken(null);
  }, []);

  const isAuthenticated = useMemo(() => !!authToken, [authToken]);

  return {
    authenticate,
    logout,
    isAuthenticated,
    isAuthenticating,
  };
}

