/**
 * OAuth Service using Supabase Auth
 * Handles OAuth authentication through Supabase Auth providers
 */
import { supabase } from '../config/supabase';
import type { User, Session, AuthError } from '@supabase/supabase-js';

export interface OAuthResult {
  success: boolean;
  user?: User;
  session?: Session;
  error?: string;
}

export interface OAuthProvider {
  id: 'google' | 'github' | 'discord' | 'twitter';
  name: string;
  icon: string;
}

/**
 * Available OAuth providers
 */
export const OAUTH_PROVIDERS: OAuthProvider[] = [
  {
    id: 'google',
    name: 'Google',
    icon: '📧'
  },
  {
    id: 'github',
    name: 'GitHub',
    icon: '💻'
  },
  {
    id: 'discord',
    name: 'Discord',
    icon: '🎮'
  },
  {
    id: 'twitter',
    name: 'Twitter/X',
    icon: '🐦'
  }
];

/**
 * Sign in with OAuth provider using Supabase Auth
 */
export async function signInWithOAuth(provider: OAuthProvider['id']): Promise<OAuthResult> {
  if (!supabase) {
    return {
      success: false,
      error: 'Supabase not configured'
    };
  }

  try {
    console.log(`🔄 Signing in with ${provider}...`);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback/oauth/consent`,
        queryParams: provider === 'google' ? {
          access_type: 'offline',
          prompt: 'consent',
        } : undefined,
      },
    });

    if (error) {
      console.error(`❌ OAuth sign-in error for ${provider}:`, error);
      return {
        success: false,
        error: error.message
      };
    }

    // Note: With redirect flow, we don't get the user/session immediately
    // The user will be redirected back to /auth/callback where we can handle the session
    console.log(`✅ OAuth redirect initiated for ${provider}`);

    return {
      success: true,
      // User and session will be available after redirect
    };

  } catch (error: any) {
    console.error(`❌ Unexpected OAuth error for ${provider}:`, error);
    return {
      success: false,
      error: error.message || `Failed to sign in with ${provider}`
    };
  }
}

/**
 * Handle OAuth callback after redirect
 */
export async function handleOAuthCallback(): Promise<OAuthResult> {
  if (!supabase) {
    return {
      success: false,
      error: 'Supabase not configured'
    };
  }

  try {
    console.log('🔄 Handling OAuth callback...');

    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error('❌ OAuth callback error:', error);
      return {
        success: false,
        error: error.message
      };
    }

        if (data.session) {
          console.log('✅ OAuth callback successful:', {
            user: data.session.user.email || data.session.user.user_metadata?.user_name,
            provider: data.session.user.app_metadata?.provider
          });

          return {
            success: true,
            user: data.session.user,
            session: data.session
          };
        } else {
          console.warn('⚠️ OAuth callback: No session found');
          return {
            success: false,
            error: 'No authentication session found'
          };
        }

  } catch (error: any) {
    console.error('❌ Unexpected OAuth callback error:', error);
    return {
      success: false,
      error: error.message || 'Failed to handle OAuth callback'
    };
  }
}

/**
 * Sign out from Supabase Auth
 */
export async function signOut(): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return {
      success: false,
      error: 'Supabase not configured'
    };
  }

  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('❌ Sign out error:', error);
      return {
        success: false,
        error: error.message
      };
    }

    console.log('✅ Signed out successfully');
    return { success: true };

  } catch (error: any) {
    console.error('❌ Unexpected sign out error:', error);
    return {
      success: false,
      error: error.message || 'Failed to sign out'
    };
  }
}

/**
 * Get current user session
 */
export async function getCurrentSession(): Promise<{ session: Session | null; user: User | null }> {
  if (!supabase) {
    return { session: null, user: null };
  }

  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('❌ Get session error:', error);
      return { session: null, user: null };
    }

    return { session, user: session?.user || null };
  } catch (error) {
    console.error('❌ Unexpected get session error:', error);
    return { session: null, user: null };
  }
}

/**
 * Listen for auth state changes
 */
export function onAuthStateChange(callback: (event: string, session: Session | null) => void) {
  if (!supabase) {
    console.warn('Supabase not configured - cannot listen for auth changes');
    return () => {}; // Return empty unsubscribe function
  }

  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);

  return () => {
    subscription.unsubscribe();
  };
}
