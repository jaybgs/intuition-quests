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
  redirectUri: string,
  codeVerifier?: string
): Promise<OAuthTokenExchangeResponse> {
  try {
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    console.log(`🔄 Calling OAuth exchange for ${platform} at ${baseURL}/oauth/exchange`);
    const requestBody: any = {
      platform,
      code,
      redirectUri,
    };
    
    // Add code_verifier for Twitter PKCE
    if (platform === 'twitter' && codeVerifier) {
      requestBody.codeVerifier = codeVerifier;
    }
    
    const response = await apiClient.post<OAuthTokenExchangeResponse>(
      '/oauth/exchange',
      requestBody
    );

    console.log(`✅ OAuth exchange successful for ${platform}:`, response.data);
    return response.data;
  } catch (error: any) {
    console.error(`❌ OAuth exchange error for ${platform}:`, error);
    console.error('Error response:', error.response?.data);
    console.error('Error status:', error.response?.status);
    console.error('Error message:', error.message);
    
    // Return detailed error
    const errorMessage = error.response?.data?.error || 
                        error.response?.data?.error_description ||
                        error.message || 
                        'Failed to exchange OAuth code';
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

