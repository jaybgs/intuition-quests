import { supabase } from '../config/supabase';

/**
 * Service for managing space follows in Supabase
 */
export class FollowService {
  /**
   * Follow a space
   */
  async followSpace(userAddress: string, spaceId: string): Promise<boolean> {
    if (!supabase) {
      console.error('Supabase not configured');
      return false;
    }

    try {
      const { error } = await supabase
        .from('space_follows')
        .insert({
          user_address: userAddress.toLowerCase(),
          space_id: spaceId,
          created_at: new Date().toISOString(),
        });

      if (error) {
        // If already following, that's okay
        if (error.code === '23505') { // Unique constraint violation
          return true;
        }
        console.error('Error following space:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error following space:', error);
      return false;
    }
  }

  /**
   * Unfollow a space
   */
  async unfollowSpace(userAddress: string, spaceId: string): Promise<boolean> {
    if (!supabase) {
      console.error('Supabase not configured');
      return false;
    }

    try {
      const { error } = await supabase
        .from('space_follows')
        .delete()
        .eq('user_address', userAddress.toLowerCase())
        .eq('space_id', spaceId);

      if (error) {
        console.error('Error unfollowing space:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error unfollowing space:', error);
      return false;
    }
  }

  /**
   * Check if user is following a space
   */
  async isFollowing(userAddress: string, spaceId: string): Promise<boolean> {
    if (!supabase) {
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('space_follows')
        .select('id')
        .eq('user_address', userAddress.toLowerCase())
        .eq('space_id', spaceId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return false; // Not found = not following
        }
        console.error('Error checking follow status:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking follow status:', error);
      return false;
    }
  }

  /**
   * Get follower count for a space
   */
  async getFollowerCount(spaceId: string): Promise<number> {
    if (!supabase) {
      return 0;
    }

    try {
      const { count, error } = await supabase
        .from('space_follows')
        .select('*', { count: 'exact', head: true })
        .eq('space_id', spaceId);

      if (error) {
        console.error('Error getting follower count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error getting follower count:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const followService = new FollowService();



