import { useAccount } from 'wagmi';
import { apiClient } from '../services/apiClient';

/**
 * Generate authentication token for backend
 */
export async function generateAuthToken(address: string, signature?: string, message?: string): Promise<string | null> {
  try {
    // If signature and message are provided, send to backend for verification
    if (signature && message) {
      try {
        const response = await apiClient.post('/auth/login', {
          address,
          message,
          signature,
        });
        const token = response.data.token;
        if (token) {
          apiClient.setAuthToken(token);
          return token;
        }
      } catch (error) {
        console.warn('Backend auth failed, using fallback token:', error);
      }
    }
    
    // Fallback: Create a simple token (for development when backend is not available)
    const token = btoa(JSON.stringify({ address, timestamp: Date.now() }));
    apiClient.setAuthToken(token);
    return token;
  } catch (error) {
    console.error('Error generating auth token:', error);
    return null;
  }
}

