import { apiClient } from './apiClient';

export interface SocialConnection {
  wallet_address: string;
  provider: 'google' | 'discord' | 'github' | 'twitter';
  provider_user_id: string;
  provider_username?: string;
  provider_data?: any;
  verified_at: string;
}

export interface SocialConnectionResponse {
  connections: SocialConnection[];
}

/**
 * Initiate social account connection
 * Returns OAuth URL and state for the frontend to redirect to
 */
export async function initiateSocialConnection(
  provider: SocialConnection['provider'],
  walletAddress: string
): Promise<{ state: string; redirectUrl: string; provider: string }> {
  const response = await apiClient.post('/social/connect', {
    provider,
    walletAddress
  });

  return response.data;
}

/**
 * Get user's social connections
 */
export async function getSocialConnections(walletAddress: string): Promise<SocialConnection[]> {
  const response = await apiClient.get<SocialConnectionResponse>('/social/connections');
  return response.data.connections;
}

/**
 * Check if user has a specific social connection
 */
export async function hasSocialConnection(
  walletAddress: string,
  provider: SocialConnection['provider']
): Promise<boolean> {
  const connections = await getSocialConnections(walletAddress);
  return connections.some(conn => conn.provider === provider);
}

/**
 * Get connected providers for a wallet
 */
export async function getConnectedProviders(walletAddress: string): Promise<string[]> {
  const connections = await getSocialConnections(walletAddress);
  return connections.map(conn => conn.provider);
}

/**
 * Social providers configuration
 */
export const SOCIAL_PROVIDERS = {
  google: {
    name: 'Google',
    icon: '📧',
    color: '#4285F4'
  },
  discord: {
    name: 'Discord',
    icon: '🎮',
    color: '#5865F2'
  },
  github: {
    name: 'GitHub',
    icon: '💻',
    color: '#333333'
  },
  twitter: {
    name: 'Twitter/X',
    icon: '🐦',
    color: '#1DA1F2'
  }
} as const;

export type SocialProvider = keyof typeof SOCIAL_PROVIDERS;
