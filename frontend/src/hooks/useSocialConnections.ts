/**
 * Social Connections Hook using Supabase Auth
 * Manages OAuth authentication and social connections
 */
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { signInWithOAuth, signOut, getCurrentSession, onAuthStateChange } from '../services/oauthService';
import { OAUTH_PROVIDERS, type OAuthProvider } from '../services/oauthService';
import type { User, Session } from '@supabase/supabase-js';

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

const STORAGE_KEY = 'supabase_auth_session';

export function useSocialConnections() {
  const { address } = useAccount();
  const [connections, setConnections] = useState<SocialConnections>({
    google: null,
    github: null,
    discord: null,
    twitter: null,
  });
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load current session on mount
  useEffect(() => {
    const loadSession = async () => {
      try {
        const { session, user } = await getCurrentSession();
        setCurrentUser(user);

        if (user) {
          // Convert Supabase user to our connection format
          const provider = user.app_metadata?.provider || user.app_metadata?.providers?.[0];
          if (provider) {
            const connection: ConnectedAccount = {
              platform: provider,
              username: user.user_metadata?.user_name || user.user_metadata?.name,
              email: user.email,
              id: user.id,
              avatar: user.user_metadata?.avatar_url,
              profileUrl: user.user_metadata?.user_name ? `https://${provider}.com/${user.user_metadata.user_name}` : undefined,
              connectedAt: user.created_at ? new Date(user.created_at).getTime() : Date.now(),
            };

            setConnections(prev => ({
              ...prev,
              [provider]: connection,
            }));
          }
        }
      } catch (error) {
        console.error('Error loading session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);

      if (event === 'SIGNED_IN' && session?.user) {
        setCurrentUser(session.user);

        // Update connections based on the signed-in user
        const provider = session.user.app_metadata?.provider || session.user.app_metadata?.providers?.[0];
        if (provider && OAUTH_PROVIDERS.find(p => p.id === provider)) {
          const connection: ConnectedAccount = {
            platform: provider,
            username: session.user.user_metadata?.user_name || session.user.user_metadata?.name,
            email: session.user.email,
            id: session.user.id,
            avatar: session.user.user_metadata?.avatar_url,
            profileUrl: session.user.user_metadata?.user_name ? `https://${provider}.com/${session.user.user_metadata.user_name}` : undefined,
            connectedAt: Date.now(),
          };

          setConnections(prev => ({
            ...prev,
            [provider]: connection,
          }));
        }

      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        // Clear all connections on sign out
        setConnections({
          google: null,
          github: null,
          discord: null,
          twitter: null,
        });
      }
    });

    return unsubscribe;
  }, []);

  const connectOAuth = async (provider: OAuthProvider['id']) => {
    setIsConnecting(provider);
    try {
      const result = await signInWithOAuth(provider);

      if (result.success) {
        // With redirect flow, the page will redirect and come back
        // The auth state change listener will handle updating the connections
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      console.error(`${provider} connection error:`, error);
      return { success: false, error: error.message || `Failed to connect ${provider}` };
    } finally {
      setIsConnecting(null);
    }
  };

  const disconnectSocial = async (provider: OAuthProvider['id']) => {
    try {
      // Sign out from Supabase Auth (this will disconnect all providers)
      const result = await signOut();

      if (result.success) {
        setCurrentUser(null);
        setConnections({
          google: null,
          github: null,
          discord: null,
          twitter: null,
        });
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      console.error(`Disconnect error:`, error);
      return { success: false, error: error.message || 'Failed to disconnect' };
    }
  };

  return {
    connections,
    currentUser,
    isConnecting,
    isLoading,
    connectTwitter: () => connectOAuth('twitter'),
    connectDiscord: () => connectOAuth('discord'),
    connectGithub: () => connectOAuth('github'),
    connectGoogle: () => connectOAuth('google'),
    disconnect: disconnectSocial,
    signOut: () => signOut(),
  };
}
