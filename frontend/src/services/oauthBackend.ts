/**
 * OAuth Backend Service
 * Handles communication with backend for OAuth token exchange and user data fetching
 */

import { apiClient } from './apiClient';

interface OAuthTokenExchangeRequest {
  platform: 'twitter' | 'discord' | 'github' | 'google';
  code: string;
  redirectUri: string;
}

interface OAuthTokenExchangeResponse {
  success: boolean;
  accessToken?: string;
  account?: {
    platform: string;
    username?: string;
    email?: string;
    id?: string;
    avatar?: string;
    profileUrl?: string; // X/Twitter profile URL
  };
  error?: string;
}

/**
 * Exchange OAuth authorization code for access token and user data
 */
export async function exchangeOAuthCode(
  platform: 'twitter' | 'discord' | 'github' | 'google',
  code: string,
  redirectUri: string
): Promise<OAuthTokenExchangeResponse> {
  try {
    const response = await apiClient.post<OAuthTokenExchangeResponse>(
      '/oauth/exchange',
      {
        platform,
        code,
        redirectUri,
      } as OAuthTokenExchangeRequest
    );

    return response.data;
  } catch (error: any) {
    console.error(`OAuth exchange error for ${platform}:`, error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to exchange OAuth code',
    };
  }
}

