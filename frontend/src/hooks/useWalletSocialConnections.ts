/**
 * Wallet-based Social Connections Hook
 * Manages social account connections linked to wallet addresses
 */
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { getSocialConnections, initiateSocialConnection } from '../services/socialService';

export interface WalletSocialConnection {
  wallet_address: string;
  provider: string;
  provider_user_id: string;
  provider_username?: string;
  provider_data?: any;
  access_token?: string;
  refresh_token?: string;
  verified_at: string;
}

interface SocialConnectionsState {
  connections: WalletSocialConnection[];
  isLoading: boolean;
  isConnecting: string | null;
  error: string | null;
}

export function useWalletSocialConnections() {
  const { address } = useAccount();
  const [state, setState] = useState<SocialConnectionsState>({
    connections: [],
    isLoading: false,
    isConnecting: null,
    error: null
  });

  // Load connections when wallet address changes
  useEffect(() => {
    if (address) {
      loadConnections();
    } else {
      setState({ connections: [], isLoading: false, isConnecting: null, error: null });
    }
  }, [address]);

  const loadConnections = async () => {
    if (!address) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const connections = await getSocialConnections(address);
      setState({
        connections,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to load social connections'
      }));
    }
  };

  const connectSocialAccount = async (provider: 'google' | 'github' | 'discord' | 'twitter') => {
    if (!address) throw new Error('No wallet connected');

    // Set connecting state
    setState(prev => ({ ...prev, isConnecting: provider }));

    try {
      // Initiate social connection - this returns OAuth URL and state
      const { state, redirectUrl } = await initiateSocialConnection(provider, address);

      // Redirect to the OAuth URL (this will go through our backend first, then to OAuth provider)
      window.location.href = `${redirectUrl}?state=${state}`;
      return { success: true };
    } catch (error: any) {
      setState(prev => ({ ...prev, isConnecting: null }));
      return { success: false, error: error.message };
    }
  };

  const getConnectedProviders = (): string[] => {
    return state.connections.map(c => c.provider);
  };

  const hasConnectedProvider = (provider: string): boolean => {
    return state.connections.some(c => c.provider === provider);
  };

  const getConnectionForProvider = (provider: string): WalletSocialConnection | null => {
    return state.connections.find(c => c.provider === provider) || null;
  };

  return {
    ...state,
    connectSocialAccount,
    loadConnections,
    getConnectedProviders,
    hasConnectedProvider,
    getConnectionForProvider,
    isConnecting: state.isConnecting
  };
}
