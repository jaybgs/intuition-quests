import { useAccount, useSignMessage } from 'wagmi';
import { useState } from 'react';
import { apiClient } from '../services/apiClient';
import { generateAuthToken } from '../utils/auth';

export function useAuth() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const authenticate = async (): Promise<boolean> => {
    if (!address || !isConnected) {
      return false;
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
        return false;
      }

      // Store token
      localStorage.setItem('auth_token', token);

      return true;
    } catch (error: any) {
      console.error('Authentication error:', error);
      // Don't throw, just return false
      return false;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
  };

  const isAuthenticated = () => {
    return !!localStorage.getItem('auth_token');
  };

  return {
    authenticate,
    logout,
    isAuthenticated: isAuthenticated(),
    isAuthenticating,
  };
}

