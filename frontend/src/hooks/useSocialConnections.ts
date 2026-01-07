import { useState, useEffect } from 'react';
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
}

interface SocialConnections {
  google: ConnectedAccount | null;
  github: ConnectedAccount | null;
  discord: ConnectedAccount | null;
  twitter: ConnectedAccount | null;
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
    google: null,
    github: null,
    discord: null,
      twitter: null
    },
    isLoading: false,
    isConnecting: null,
    error: null
  });

  // Load connections when wallet changes
  useEffect(() => {
    if (address) {
      loadConnections();
    } else {
      setState({
        connections: {
          google: null,
          github: null,
          discord: null,
          twitter: null
        },
        isLoading: false,
        isConnecting: null,
        error: null
      });
    }
  }, [address]);

  const loadConnections = async () => {
    if (!address) return;

    console.log('Loading connections for address:', address);
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await apiClient.get(`/social/connections/${address}`);
      console.log('Connections API response:', response.data);

      // Transform array into object keyed by provider
      const connectionsArray = response.data.connections || [];
      const connectionsObject: SocialConnections = {
        google: null,
        github: null,
        discord: null,
        twitter: null
      };

      connectionsArray.forEach((conn: any) => {
        const provider = conn.provider;
        if (provider in connectionsObject) {
          connectionsObject[provider as keyof SocialConnections] = {
            platform: provider,
            username: conn.provider_username,
            email: conn.provider_data?.email,
            id: conn.provider_user_id,
            avatar: conn.provider_data?.avatar,
            profileUrl: conn.provider_data?.profileUrl,
            connectedAt: new Date(conn.verified_at).getTime()
          };
        }
      });

      console.log('Transformed connections object:', connectionsObject);

      setState(prev => ({
            ...prev,
        connections: connectionsObject,
        isLoading: false
      }));
    } catch (error: any) {
      console.error('Failed to load social connections:', error);
      setState(prev => ({
        ...prev,
        connections: {
          google: null,
          github: null,
          discord: null,
          twitter: null
        },
        isLoading: false,
        error: error.message || 'Failed to load social connections'
      }));
    }
  };

  const connectSocialAccount = async (provider: 'twitter' | 'discord' | 'github' | 'google') => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    setState(prev => ({ ...prev, isConnecting: provider }));

    try {
      // Get OAuth URL from backend
      const response = await apiClient.get(`/social/connect/${provider}`);

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

  const disconnectSocialAccount = async (provider: string) => {
    if (!address) return { success: false, error: 'No wallet connected' };

    try {
      // Call backend to disconnect social account
      await apiClient.delete(`/social/disconnect/${provider}`);

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

  const hasConnectedProvider = (provider: string): boolean => {
    return state.connections.some(c => c.provider === provider);
  };

  const getConnectedProviders = (): string[] => {
    return state.connections.map(c => c.provider);
  };

  const getConnectionForProvider = (provider: string): SocialConnection | null => {
    return state.connections.find(c => c.provider === provider) || null;
  };

  return {
    ...state,
    connectSocialAccount,
    disconnectSocialAccount,
    loadConnections,
    getConnectedProviders,
    hasConnectedProvider,
    getConnectionForProvider
  };
}