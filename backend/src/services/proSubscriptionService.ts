/**
 * Pro Subscription Service
 * Handles pro user subscription management in Supabase
 */

import { supabase } from '../config/supabase.js';

export interface ProUserData {
  wallet_address: string;
  payment_tx_hash: string;
  payment_amount: string;
  payment_timestamp?: string;
  plan_type?: string;
  status?: string;
  expires_at?: string;
}

export class ProSubscriptionService {

  /**
   * Save pro user subscription to database
   */
  async saveProUser(data: ProUserData): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('💾 Saving pro user to database:', data.wallet_address);

      const { error } = await supabase
        .from('pro_users')
        .upsert(data, {
          onConflict: 'wallet_address'
        });

      if (error) {
        console.error('❌ Database error saving pro user:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Pro user saved successfully');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Error saving pro user:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if user has active pro subscription
   */
  async hasActiveProSubscription(walletAddress: string): Promise<boolean> {
    try {
      console.log('🔍 Checking pro subscription for:', walletAddress);

      const { data, error } = await supabase
        .from('pro_users')
        .select('status, expires_at')
        .eq('wallet_address', walletAddress.toLowerCase())
        .eq('status', 'active')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - user doesn't have pro subscription
          console.log('❌ No active pro subscription found');
          return false;
        }
        console.error('❌ Database error checking pro subscription:', error);
        return false;
      }

      // Check if subscription is expired
      if (data.expires_at) {
        const expiresAt = new Date(data.expires_at);
        const now = new Date();
        if (expiresAt < now) {
          console.log('⏰ Pro subscription expired');
          // TODO: Update status to expired
          return false;
        }
      }

      console.log('✅ Active pro subscription found');
      return true;
    } catch (error: any) {
      console.error('❌ Error checking pro subscription:', error);
      return false;
    }
  }

  /**
   * Get pro user details
   */
  async getProUser(walletAddress: string): Promise<ProUserData | null> {
    try {
      const { data, error } = await supabase
        .from('pro_users')
        .select('*')
        .eq('wallet_address', walletAddress.toLowerCase())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No pro user found
        }
        console.error('❌ Database error getting pro user:', error);
        return null;
      }

      return data;
    } catch (error: any) {
      console.error('❌ Error getting pro user:', error);
      return null;
    }
  }

  /**
   * Update pro user status
   */
  async updateProUserStatus(walletAddress: string, status: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('pro_users')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('wallet_address', walletAddress.toLowerCase());

      if (error) {
        console.error('❌ Database error updating pro user status:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('❌ Error updating pro user status:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export const proSubscriptionService = new ProSubscriptionService();
