import { supabase } from '../config/supabase';

/**
 * Service for managing space follows
 * Handles following/unfollowing spaces and getting follower counts
 */
export class SpaceFollowService {
  /**
   * Follow a space
   */
  async followSpace(spaceId: string, userAddress: string): Promise<boolean> {
    if (!supabase) {
      return this.fallbackFollowSpace(spaceId, userAddress);
    }

    try {
      const { error } = await supabase
        .from('space_follows')
        .insert({
          space_id: spaceId,
          user_address: userAddress.toLowerCase(),
        });

      if (error) {
        // If it's a unique constraint error, user is already following
        if (error.code === '23505') {
          return true; // Already following, consider it success
        }
        console.error('Error following space:', error);
        return this.fallbackFollowSpace(spaceId, userAddress);
      }

      return true;
    } catch (error) {
      console.error('Error following space:', error);
      return this.fallbackFollowSpace(spaceId, userAddress);
    }
  }

  /**
   * Unfollow a space
   */
  async unfollowSpace(spaceId: string, userAddress: string): Promise<boolean> {
    if (!supabase) {
      return this.fallbackUnfollowSpace(spaceId, userAddress);
    }

    try {
      const { error } = await supabase
        .from('space_follows')
        .delete()
        .eq('space_id', spaceId)
        .eq('user_address', userAddress.toLowerCase());

      if (error) {
        console.error('Error unfollowing space:', error);
        return this.fallbackUnfollowSpace(spaceId, userAddress);
      }

      return true;
    } catch (error) {
      console.error('Error unfollowing space:', error);
      return this.fallbackUnfollowSpace(spaceId, userAddress);
    }
  }

  /**
   * Check if a user is following a space
   */
  async isFollowing(spaceId: string, userAddress: string): Promise<boolean> {
    if (!supabase) {
      return this.fallbackIsFollowing(spaceId, userAddress);
    }

    try {
      const { data, error } = await supabase
        .from('space_follows')
        .select('id')
        .eq('space_id', spaceId)
        .eq('user_address', userAddress.toLowerCase())
        .maybeSingle();

      if (error) {
        console.error('Error checking follow status:', error);
        return this.fallbackIsFollowing(spaceId, userAddress);
      }

      return !!data;
    } catch (error) {
      console.error('Error checking follow status:', error);
      return this.fallbackIsFollowing(spaceId, userAddress);
    }
  }

  /**
   * Get follower count for a space
   */
  async getFollowerCount(spaceId: string): Promise<number> {
    if (!supabase) {
      return this.fallbackGetFollowerCount(spaceId);
    }

    try {
      const { count, error } = await supabase
        .from('space_follows')
        .select('*', { count: 'exact', head: true })
        .eq('space_id', spaceId);

      if (error) {
        console.error('Error getting follower count:', error);
        return this.fallbackGetFollowerCount(spaceId);
      }

      return count || 0;
    } catch (error) {
      console.error('Error getting follower count:', error);
      return this.fallbackGetFollowerCount(spaceId);
    }
  }

  /**
   * Get all spaces a user follows
   */
  async getFollowedSpaces(userAddress: string): Promise<string[]> {
    if (!supabase) {
      return this.fallbackGetFollowedSpaces(userAddress);
    }

    try {
      const { data, error } = await supabase
        .from('space_follows')
        .select('space_id')
        .eq('user_address', userAddress.toLowerCase());

      if (error) {
        console.error('Error getting followed spaces:', error);
        return this.fallbackGetFollowedSpaces(userAddress);
      }

      return (data || []).map(row => row.space_id);
    } catch (error) {
      console.error('Error getting followed spaces:', error);
      return this.fallbackGetFollowedSpaces(userAddress);
    }
  }

  // Fallback methods using localStorage
  private fallbackFollowSpace(spaceId: string, userAddress: string): boolean {
    try {
      const key = `space_follows_${userAddress.toLowerCase()}`;
      const followed = JSON.parse(localStorage.getItem(key) || '[]');
      if (!followed.includes(spaceId)) {
        followed.push(spaceId);
        localStorage.setItem(key, JSON.stringify(followed));
      }
      
      // Update follower count
      const countKey = `space_followers_${spaceId}`;
      const currentCount = parseInt(localStorage.getItem(countKey) || '0');
      localStorage.setItem(countKey, String(currentCount + 1));
      
      return true;
    } catch (error) {
      console.error('Error in fallback follow:', error);
      return false;
    }
  }

  private fallbackUnfollowSpace(spaceId: string, userAddress: string): boolean {
    try {
      const key = `space_follows_${userAddress.toLowerCase()}`;
      const followed = JSON.parse(localStorage.getItem(key) || '[]');
      const updated = followed.filter((id: string) => id !== spaceId);
      localStorage.setItem(key, JSON.stringify(updated));
      
      // Update follower count
      const countKey = `space_followers_${spaceId}`;
      const currentCount = parseInt(localStorage.getItem(countKey) || '0');
      localStorage.setItem(countKey, String(Math.max(0, currentCount - 1)));
      
      return true;
    } catch (error) {
      console.error('Error in fallback unfollow:', error);
      return false;
    }
  }

  private fallbackIsFollowing(spaceId: string, userAddress: string): boolean {
    try {
      const key = `space_follows_${userAddress.toLowerCase()}`;
      const followed = JSON.parse(localStorage.getItem(key) || '[]');
      return followed.includes(spaceId);
    } catch (error) {
      console.error('Error in fallback isFollowing:', error);
      return false;
    }
  }

  private fallbackGetFollowerCount(spaceId: string): number {
    try {
      const countKey = `space_followers_${spaceId}`;
      return parseInt(localStorage.getItem(countKey) || '0');
    } catch (error) {
      console.error('Error in fallback getFollowerCount:', error);
      return 0;
    }
  }

  private fallbackGetFollowedSpaces(userAddress: string): string[] {
    try {
      const key = `space_follows_${userAddress.toLowerCase()}`;
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch (error) {
      console.error('Error in fallback getFollowedSpaces:', error);
      return [];
    }
  }
}

export const spaceFollowService = new SpaceFollowService();






