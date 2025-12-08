/**
 * User Service using Supabase
 */
import { supabase } from '../config/supabase.js';

export interface User {
  id: string;
  address: string;
  username?: string;
  profilePic?: string;
  twitterHandle?: string;
  discordId?: string;
  email?: string;
  githubHandle?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class UserService {
  /**
   * Get or create user by address
   */
  async getOrCreateUser(address: string): Promise<User> {
    const normalizedAddress = address.toLowerCase();

    // Try to find existing user
    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('address', normalizedAddress)
      .maybeSingle();

    if (existingUser) {
      return this.mapUserFromDb(existingUser);
    }

    // Create new user with default username (first 7 characters of address)
    let defaultUsername = normalizedAddress.slice(0, 7);
    let attempts = 0;
    let newUser;
    let createError;

    // Try to create user, handle potential username conflicts
    while (attempts < 10) {
      const { data, error } = await supabase
        .from('users')
        .insert({
          address: normalizedAddress,
          username: defaultUsername,
        })
        .select()
        .single();

      if (!error) {
        newUser = data;
        createError = null;
        break;
      }

      // If username conflict, try appending a number
      if (error.code === '23505' && error.message?.includes('username')) {
        attempts++;
        defaultUsername = normalizedAddress.slice(0, 7) + attempts;
      } else {
        createError = error;
        break;
      }
    }

    if (createError) {
      console.error('Error creating user:', createError);
      throw new Error(createError.message);
    }

    if (!newUser) {
      throw new Error('Failed to create user after multiple attempts');
    }

    return this.mapUserFromDb(newUser);
  }

  /**
   * Get user by address
   */
  async getUserByAddress(address: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('address', address.toLowerCase())
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching user:', error);
      throw new Error(error.message);
    }

    return data ? this.mapUserFromDb(data) : null;
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching user:', error);
      throw new Error(error.message);
    }

    return data ? this.mapUserFromDb(data) : null;
  }

  /**
   * Check if username is taken
   */
  async isUsernameTaken(username: string, excludeAddress?: string): Promise<boolean> {
    let query = supabase
      .from('users')
      .select('id')
      .eq('username', username);

    if (excludeAddress) {
      query = query.neq('address', excludeAddress.toLowerCase());
    }

    const { data, error } = await query.maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking username:', error);
      throw new Error(error.message);
    }

    return !!data;
  }

  /**
   * Update user username
   */
  async updateUsername(address: string, username: string): Promise<User> {
    const normalizedAddress = address.toLowerCase();
    const trimmedUsername = username.trim();
    
    console.log(`[UserService] Updating username for ${normalizedAddress} to ${trimmedUsername}`);
    
    // Ensure user exists first
    const existingUser = await this.getOrCreateUser(normalizedAddress);
    console.log(`[UserService] User exists: ${existingUser.id}`);

    // Update username
    const { data, error } = await supabase
      .from('users')
      .update({ username: trimmedUsername })
      .eq('address', normalizedAddress)
      .select()
      .maybeSingle();

    if (error) {
      console.error('[UserService] Error updating username:', error);
      console.error('[UserService] Error details:', JSON.stringify(error, null, 2));
      throw new Error(error.message || 'Failed to update username');
    }

    if (!data) {
      console.error('[UserService] No data returned after update');
      // This shouldn't happen if getOrCreateUser worked, but handle it gracefully
      throw new Error('User not found after update');
    }

    console.log(`[UserService] Username updated successfully: ${data.username}`);
    return this.mapUserFromDb(data);
  }

  /**
   * Update user
   */
  async updateUser(address: string, updates: Partial<User>): Promise<User> {
    const updateData: any = {};

    if (updates.username !== undefined) updateData.username = updates.username;
    if (updates.profilePic !== undefined) updateData.profile_pic = updates.profilePic;
    if (updates.twitterHandle !== undefined) updateData.twitter_handle = updates.twitterHandle;
    if (updates.discordId !== undefined) updateData.discord_id = updates.discordId;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.githubHandle !== undefined) updateData.github_handle = updates.githubHandle;

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('address', address.toLowerCase())
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error);
      throw new Error(error.message);
    }

    return this.mapUserFromDb(data);
  }

  /**
   * Map database row to User interface
   */
  private mapUserFromDb(row: any): User {
    return {
      id: row.id,
      address: row.address,
      username: row.username || undefined,
      profilePic: row.profile_pic || undefined,
      twitterHandle: row.twitter_handle || undefined,
      discordId: row.discord_id || undefined,
      email: row.email || undefined,
      githubHandle: row.github_handle || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

