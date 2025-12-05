import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { connectTwitter, connectDiscord, connectGithub, connectGoogle } from '../services/oauthService';

interface ConnectedAccount {
  platform: string;
  username?: string;
  email?: string;
  id?: string;
  avatar?: string;
  profileUrl?: string; // X/Twitter profile URL
  connectedAt: number;
}

interface SocialConnections {
  twitter: ConnectedAccount | null;
  discord: ConnectedAccount | null;
  email: ConnectedAccount | null;
  github: ConnectedAccount | null;
}

const STORAGE_KEY = 'social_connections';

export function useSocialConnections() {
  const { address } = useAccount();
  const [connections, setConnections] = useState<SocialConnections>({
    twitter: null,
    discord: null,
    email: null,
    github: null,
  });
  const [isConnecting, setIsConnecting] = useState<string | null>(null);

  // Load connections from localStorage
  useEffect(() => {
    if (!address) return;
    
    const stored = localStorage.getItem(`${STORAGE_KEY}_${address.toLowerCase()}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        
        // Clean up any placeholder usernames (e.g., "twitter_user", "discord_user", etc.)
        const cleaned: SocialConnections = {
          twitter: parsed.twitter && parsed.twitter.username && 
                   !parsed.twitter.username.toLowerCase().includes('_user') && 
                   parsed.twitter.username !== 'user' 
                   ? parsed.twitter : null,
          discord: parsed.discord && parsed.discord.username && 
                   !parsed.discord.username.toLowerCase().includes('_user') && 
                   parsed.discord.username !== 'user'
                   ? parsed.discord : null,
          email: parsed.email && parsed.email.email && 
                 !parsed.email.email.toLowerCase().includes('_user') && 
                 parsed.email.email !== 'user'
                 ? parsed.email : null,
          github: parsed.github && parsed.github.username && 
                   !parsed.github.username.toLowerCase().includes('_user') && 
                   parsed.github.username !== 'user'
                   ? parsed.github : null,
        };
        
        // Save cleaned connections back to localStorage
        const hasValidConnections = cleaned.twitter || cleaned.discord || cleaned.email || cleaned.github;
        if (hasValidConnections) {
          setConnections(cleaned);
          localStorage.setItem(`${STORAGE_KEY}_${address.toLowerCase()}`, JSON.stringify(cleaned));
        } else {
          // Clear invalid connections
          setConnections({
            twitter: null,
            discord: null,
            email: null,
            github: null,
          });
          localStorage.removeItem(`${STORAGE_KEY}_${address.toLowerCase()}`);
        }
      } catch (error) {
        console.error('Error loading social connections:', error);
      }
    }
  }, [address]);

  // Save connections to localStorage
  const saveConnections = (newConnections: SocialConnections) => {
    if (!address) return;
    setConnections(newConnections);
    localStorage.setItem(`${STORAGE_KEY}_${address.toLowerCase()}`, JSON.stringify(newConnections));
  };

  const handleConnectTwitter = async () => {
    setIsConnecting('twitter');
    try {
      const result = await connectTwitter();
      
      if (result.success && result.account) {
        // Validate username is not a placeholder
        if (!result.account.username || 
            result.account.username.toLowerCase().includes('_user') ||
            result.account.username.toLowerCase() === 'user') {
          return { success: false, error: 'Invalid username received. Please try again.' };
        }
        
        // Generate X profile URL from username
        const profileUrl = result.account.username 
          ? `https://x.com/${result.account.username.replace('@', '')}`
          : result.account.profileUrl;

        const account: ConnectedAccount = {
          platform: 'twitter',
          username: result.account.username,
          id: result.account.id,
          avatar: result.account.avatar,
          profileUrl: profileUrl,
          connectedAt: Date.now(),
        };

        const newConnections = {
          ...connections,
          twitter: account,
        };
        saveConnections(newConnections);
        
        return { success: true, account };
      }
      
      return { success: false, error: result.error };
    } catch (error: any) {
      console.error('Twitter connection error:', error);
      return { success: false, error: error.message || 'Failed to connect Twitter' };
    } finally {
      setIsConnecting(null);
    }
  };

  const handleConnectDiscord = async () => {
    setIsConnecting('discord');
    try {
      const result = await connectDiscord();
      
      if (result.success && result.account) {
        // Validate username is not a placeholder
        if (!result.account.username || 
            result.account.username.toLowerCase().includes('_user') ||
            result.account.username.toLowerCase() === 'user') {
          return { success: false, error: 'Invalid username received. Please try again.' };
        }
        
        const account: ConnectedAccount = {
          platform: 'discord',
          username: result.account.username,
          email: result.account.email,
          id: result.account.id,
          avatar: result.account.avatar,
          connectedAt: Date.now(),
        };

        const newConnections = {
          ...connections,
          discord: account,
        };
        saveConnections(newConnections);
        
        return { success: true, account };
      }
      
      return { success: false, error: result.error };
    } catch (error: any) {
      console.error('Discord connection error:', error);
      return { success: false, error: error.message || 'Failed to connect Discord' };
    } finally {
      setIsConnecting(null);
    }
  };

  const handleConnectEmail = async () => {
    setIsConnecting('email');
    try {
      const result = await connectGoogle();
      
      if (result.success && result.account) {
        // Validate email is not a placeholder
        if (!result.account.email || 
            result.account.email.toLowerCase().includes('_user') ||
            result.account.email.toLowerCase() === 'user' ||
            !result.account.email.includes('@')) {
          return { success: false, error: 'Invalid email received. Please try again.' };
        }
        
        const account: ConnectedAccount = {
          platform: 'email',
          email: result.account.email,
          username: result.account.username || result.account.email.split('@')[0],
          id: result.account.id,
          avatar: result.account.avatar,
          connectedAt: Date.now(),
        };

        const newConnections = {
          ...connections,
          email: account,
        };
        saveConnections(newConnections);
        
        return { success: true, account };
      }
      
      return { success: false, error: result.error };
    } catch (error: any) {
      console.error('Email connection error:', error);
      return { success: false, error: error.message || 'Failed to connect Email' };
    } finally {
      setIsConnecting(null);
    }
  };

  const handleConnectGithub = async () => {
    setIsConnecting('github');
    try {
      const result = await connectGithub();
      
      if (result.success && result.account) {
        // Validate username is not a placeholder
        if (!result.account.username || 
            result.account.username.toLowerCase().includes('_user') ||
            result.account.username.toLowerCase() === 'user') {
          return { success: false, error: 'Invalid username received. Please try again.' };
        }
        
        const account: ConnectedAccount = {
          platform: 'github',
          username: result.account.username,
          email: result.account.email,
          id: result.account.id,
          avatar: result.account.avatar,
          connectedAt: Date.now(),
        };

        const newConnections = {
          ...connections,
          github: account,
        };
        saveConnections(newConnections);
        
        return { success: true, account };
      }
      
      return { success: false, error: result.error };
    } catch (error: any) {
      console.error('GitHub connection error:', error);
      return { success: false, error: error.message || 'Failed to connect GitHub' };
    } finally {
      setIsConnecting(null);
    }
  };

  const disconnect = (platform: 'twitter' | 'discord' | 'email' | 'github') => {
    const newConnections = {
      ...connections,
      [platform]: null,
    };
    saveConnections(newConnections);
  };

  return {
    connections,
    isConnecting,
    connectTwitter: handleConnectTwitter,
    connectDiscord: handleConnectDiscord,
    connectEmail: handleConnectEmail,
    connectGithub: handleConnectGithub,
    disconnect,
  };
}

