import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { apiClient } from '../services/apiClient';

interface ConnectedAccount {
  platform: string;
  username?: string;
  email?: string;
  id?: string;
  avatar?: string;
  profileUrl?: string;
  connectedAt: number;
  verified?: boolean;
}

interface SocialConnections {
  twitter: ConnectedAccount | null;
  discord: ConnectedAccount | null;
}

interface SocialConnectionsState {
  connections: SocialConnections;
  isLoading: boolean;
  isConnecting: string | null;
  error: string | null;
}

export function useSocialConnections() {
  const { address } = useAccount();
  const [state, setState] = useState<SocialConnectionsState>({
    connections: {
      twitter: null,
      discord: null
    },
    isLoading: false,
    isConnecting: null,
    error: null
  });

  const loadConnections = useCallback(async () => {
    if (!address) return;

    console.log('🔍 Frontend loadConnections - using wallet address:', address);
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      console.log('📡 Fetching connections from:', `/social/connections/${address}`);
      const response = await apiClient.get(`/social/connections/${address}`);
      const { connections } = response.data;

      console.log('📊 Raw connections response:', connections);
      console.log('📊 Processed connections:', {
        twitter: connections.twitter || null,
        discord: connections.discord || null
      });

      setState(prev => ({
        ...prev,
        connections: {
          twitter: connections.twitter || null,
          discord: connections.discord || null
        },
        isLoading: false
      }));
    } catch (error: any) {
      console.error('❌ Failed to load social connections:', error);
      console.error('❌ Error details:', error.response?.data || error.message);
      setState(prev => ({
        ...prev,
        connections: {
          twitter: null,
          discord: null
        },
        isLoading: false,
        error: error.message || 'Failed to load social connections'
      }));
    }
  }, [address]);

  // Load connections when wallet changes
  useEffect(() => {
    if (address) {
      loadConnections();
    } else {
      setState({
        connections: {
          twitter: null,
          discord: null
        },
        isLoading: false,
        isConnecting: null,
        error: null
      });
    }
  }, [address, loadConnections]);

  // Refresh connections when returning from OAuth callback
  useEffect(() => {
    const handleOAuthCallback = () => {
      if (address && window.location.pathname.includes('/dashboard')) {
        // Check if we just came back from OAuth (look for oauth_success in sessionStorage)
        const oauthSuccess = sessionStorage.getItem('oauth_success');
        if (oauthSuccess) {
          sessionStorage.removeItem('oauth_success');
          console.log('🔄 Detected OAuth success, refreshing connections...');
          loadConnections();
        }
      }
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'OAUTH_SUCCESS') {
        console.log('📨 Received OAuth success message from popup:', event.data.provider);
        loadConnections();
      }
    };

    // Check immediately and also listen for storage events and messages
    handleOAuthCallback();
    window.addEventListener('storage', handleOAuthCallback);
    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('storage', handleOAuthCallback);
      window.removeEventListener('message', handleMessage);
    };
  }, [address, loadConnections]);

  // Fallback: Periodically refresh connections to catch OAuth updates
  useEffect(() => {
    if (!address) return;

    const interval = setInterval(() => {
      // Only refresh if we're not currently loading and have been on the dashboard for a while
      if (!state.isLoading && window.location.pathname.includes('/dashboard')) {
        loadConnections();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [address, state.isLoading, loadConnections]);

  const connectSocialAccount = async (provider: 'twitter' | 'discord') => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    console.log('🔗 Frontend connectSocialAccount - using wallet address:', address);
    console.log('🔗 Connecting to provider:', provider);

    setState(prev => ({ ...prev, isConnecting: provider }));

    try {
      // Get OAuth URL from backend
      console.log('📡 Requesting OAuth URL from:', `/social/connect/${provider}?walletAddress=${address}`);
      const response = await apiClient.get(`/social/connect/${provider}?walletAddress=${address}`);

      if (response.data.authUrl) {
        // Redirect to OAuth provider (full page redirect)
        window.location.href = response.data.authUrl;
      } else {
        throw new Error('Failed to get OAuth URL');
      }
    } catch (error: any) {
      console.error('OAuth connection failed:', error);
      setState(prev => ({
        ...prev,
        isConnecting: null,
        error: error.message || 'Failed to initiate OAuth'
      }));
      throw error;
    }
  };

  const disconnectSocialAccount = async (provider: 'twitter' | 'discord') => {
    if (!address) return { success: false, error: 'No wallet connected' };

    try {
      // Call backend to disconnect social account
      await apiClient.delete(`/social/disconnect/${provider}`, {
        data: { walletAddress: address }
      });

      // Update local state to reflect the disconnection
      setState(prev => ({
        ...prev,
        connections: {
          ...prev.connections,
          [provider]: null
        }
      }));

        return { success: true };
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
      return { success: false, error: error.message };
    }
  };

  const hasConnectedProvider = (provider: 'twitter' | 'discord'): boolean => {
    return state.connections[provider] !== null;
  };

  const getConnectedProviders = (): string[] => {
    return Object.entries(state.connections)
      .filter(([_, connection]) => connection !== null)
      .map(([provider, _]) => provider);
  };

  const getConnectionForProvider = (provider: 'twitter' | 'discord'): ConnectedAccount | null => {
    return state.connections[provider];
  };

  return {
    connections: state.connections,
    isLoading: state.isLoading,
    isConnecting: state.isConnecting,
    error: state.error,
    connectSocialAccount,
    disconnectSocialAccount,
    loadConnections,
    hasConnectedProvider,
    getConnectedProviders,
    getConnectionForProvider
  };
}
