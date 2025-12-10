import type { Space } from '../types';
import { supabase } from '../config/supabase';
import { generateSlug, ensureUniqueSlug } from '../utils/slugUtils';
import { apiClient } from './apiClient';

/**
 * Space Service using Supabase
 * This replaces localStorage-based storage with Supabase database
 */
export class SpaceServiceSupabase {
  /**
   * Get all spaces
   */
  async getAllSpaces(): Promise<Space[]> {
    if (!supabase) {
      console.warn('Supabase not configured, falling back to localStorage');
      return this.fallbackToLocalStorage();
    }

    try {
      const { data, error } = await supabase
        .from('spaces')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching spaces from Supabase:', error);
        return this.fallbackToLocalStorage();
      }

      return (data || []).map(space => this.mapSpaceFromDb(space));
    } catch (error) {
      console.error('Error fetching spaces:', error);
      return this.fallbackToLocalStorage();
    }
  }

  /**
   * Get a space by ID
   */
  async getSpaceById(id: string): Promise<Space | null> {
    if (!supabase) {
      return this.fallbackGetSpaceById(id);
    }

    try {
      const { data, error } = await supabase
        .from('spaces')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return this.fallbackGetSpaceById(id);
        }
        console.error('Error fetching space:', error);
        return this.fallbackGetSpaceById(id);
      }

      return data ? this.mapSpaceFromDb(data) : null;
    } catch (error) {
      console.error('Error fetching space:', error);
      return this.fallbackGetSpaceById(id);
    }
  }

  /**
   * Get a space by slug
   */
  async getSpaceBySlug(slug: string): Promise<Space | null> {
    if (!supabase) {
      return this.fallbackGetSpaceBySlug(slug);
    }

    try {
      const { data, error } = await supabase
        .from('spaces')
        .select('*')
        .eq('slug', slug.toLowerCase())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return this.fallbackGetSpaceBySlug(slug);
        }
        console.error('Error fetching space by slug:', error);
        return this.fallbackGetSpaceBySlug(slug);
      }

      return data ? this.mapSpaceFromDb(data) : null;
    } catch (error) {
      console.error('Error fetching space by slug:', error);
      return this.fallbackGetSpaceBySlug(slug);
    }
  }

  /**
   * Search spaces by name or slug
   */
  async searchSpaces(query: string): Promise<Space[]> {
    if (!supabase) {
      return this.fallbackSearchSpaces(query);
    }

    const lowerQuery = query.toLowerCase().trim();
    
    if (!lowerQuery) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('spaces')
        .select('*')
        .or(`name.ilike.%${lowerQuery}%,slug.ilike.%${lowerQuery}%`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error searching spaces:', error);
        return this.fallbackSearchSpaces(query);
      }

      return (data || []).map(space => this.mapSpaceFromDb(space));
    } catch (error) {
      console.error('Error searching spaces:', error);
      return this.fallbackSearchSpaces(query);
    }
  }

  /**
   * Create a new space
   */
  async createSpace(data: {
    name: string;
    description: string;
    logo?: string;
    coverPhoto?: string;
    twitterUrl: string;
    ownerAddress: string;
    userType: 'project' | 'user';
    projectType?: 'defi' | 'infofi' | 'other' | 'undisclosed';
    projectTypeOther?: string;
    atomId?: string;
    atomTransactionHash?: string;
  }): Promise<Space> {
    const slug = generateSlug(data.name);
    
    if (!supabase) {
      return this.fallbackCreateSpace(data, slug);
    }

    try {
      // Ensure slug is unique
      const uniqueSlug = await this.ensureUniqueSlug(slug);

      // Prepare insert data - only include fields that exist in the table
      const insertData: any = {
        name: data.name.trim(),
        slug: uniqueSlug,
        description: data.description.trim(),
        twitter_url: data.twitterUrl.trim(),
        owner_address: data.ownerAddress.toLowerCase(),
        user_type: data.userType.toUpperCase(),
        atom_id: data.atomId,
        atom_transaction_hash: data.atomTransactionHash,
      };

      // Only include logo if it's provided and not too large (base64 images can be huge)
      // If logo is too large, we'll skip it and user can upload it later via settings
      if (data.logo) {
        // Check if logo is reasonable size (less than 1MB base64 = ~750KB image)
        const logoSize = data.logo.length;
        if (logoSize < 1000000) { // ~1MB base64
          insertData.logo = data.logo;
        } else {
          console.warn('Logo too large, skipping logo upload. Size:', logoSize, 'bytes. Please upload via settings later.');
        }
      }

      // Only include cover photo if it's provided and not too large
      if (data.coverPhoto) {
        const coverPhotoSize = data.coverPhoto.length;
        if (coverPhotoSize < 2000000) { // ~2MB base64 for cover photos (larger than logo)
          insertData.cover_photo = data.coverPhoto;
        } else {
          console.warn('Cover photo too large, skipping cover photo upload. Size:', coverPhotoSize, 'bytes. Please upload via settings later.');
        }
      }

      const { data: insertedData, error } = await supabase
        .from('spaces')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Error creating space in Supabase (direct):', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error hint:', error.hint);
        
        // Try backend API as fallback (uses service role key, bypasses RLS)
        console.log('Attempting to create space via backend API...');
        try {
          // Prepare API payload - only include logo if it's reasonable size
          const apiPayload: any = {
            name: data.name.trim(),
            description: data.description.trim(),
            twitterUrl: data.twitterUrl.trim(),
            userType: data.userType,
            atomId: data.atomId,
            atomTransactionHash: data.atomTransactionHash,
          };

          // Only include logo if it's provided and not too large
          if (data.logo) {
            const logoSize = data.logo.length;
            if (logoSize < 1000000) { // ~1MB base64
              apiPayload.logo = data.logo;
            } else {
              console.warn('Logo too large for API, skipping. Size:', logoSize, 'bytes');
            }
          }

          // Only include cover photo if it's provided and not too large
          if (data.coverPhoto) {
            const coverPhotoSize = data.coverPhoto.length;
            if (coverPhotoSize < 2000000) { // ~2MB base64 for cover photos
              apiPayload.coverPhoto = data.coverPhoto;
            } else {
              console.warn('Cover photo too large for API, skipping. Size:', coverPhotoSize, 'bytes');
            }
          }

          const response = await apiClient.post('/spaces', apiPayload);
          
          const backendSpace = response.data.space;
          console.log('Space created successfully via backend API:', backendSpace.id);
          
          // Backend returns Space object (already mapped by mapSpaceFromDb)
          // Map it to ensure consistent format
          const space = this.mapSpaceFromDb(backendSpace);
          
          // Dispatch custom event
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('spaceCreated', {
              detail: { spaceId: space.id, ownerAddress: space.ownerAddress }
            }));
          }
          
          return space;
        } catch (apiError: any) {
          console.error('Error creating space via backend API:', apiError);
          // If backend also fails, throw the original Supabase error
          throw new Error(`Failed to save space to database: ${error.message || 'Unknown error'}. Please check your Supabase configuration and RLS policies.`);
        }
      }

      const space = this.mapSpaceFromDb(insertedData);

      // Dispatch custom event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('spaceCreated', {
          detail: { spaceId: space.id, ownerAddress: space.ownerAddress }
        }));
      }

      return space;
    } catch (error: any) {
      console.error('Error creating space:', error);
      // Re-throw the error instead of silently falling back
      // This ensures the user sees the error and the space isn't created in localStorage only
      throw error;
    }
  }

  /**
   * Update a space
   */
  async updateSpace(id: string, updates: Partial<Omit<Space, 'id' | 'createdAt'>>): Promise<Space | null> {
    if (!supabase) {
      return this.fallbackUpdateSpace(id, updates);
    }

    try {
      const updateData: any = {};

      if (updates.name !== undefined) {
        updateData.name = updates.name.trim();
        const slug = generateSlug(updates.name);
        updateData.slug = await this.ensureUniqueSlug(slug, id);
      }

      if (updates.description !== undefined) {
        updateData.description = updates.description.trim();
      }

      if (updates.logo !== undefined) {
        updateData.logo = updates.logo;
      }

      if (updates.twitterUrl !== undefined) {
        updateData.twitter_url = updates.twitterUrl.trim();
      }

      if (updates.userType !== undefined) {
        updateData.user_type = updates.userType.toUpperCase();
      }
      if (updates.projectType !== undefined) {
        updateData.project_type = updates.projectType;
      }
      if (updates.projectTypeOther !== undefined) {
        updateData.project_type_other = updates.projectTypeOther;
      }

      const { data, error } = await supabase
        .from('spaces')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating space in Supabase:', error);
        return this.fallbackUpdateSpace(id, updates);
      }

      return data ? this.mapSpaceFromDb(data) : null;
    } catch (error) {
      console.error('Error updating space:', error);
      return this.fallbackUpdateSpace(id, updates);
    }
  }

  /**
   * Delete a space
   */
  async deleteSpace(id: string): Promise<boolean> {
    if (!supabase) {
      return this.fallbackDeleteSpace(id);
    }

    try {
      // First, delete all quests associated with this space
      const { questServiceSupabase } = await import('./questServiceSupabase');
      await questServiceSupabase.deleteQuestsBySpaceId(id);

      // Then delete the space
      const { error } = await supabase
        .from('spaces')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting space from Supabase:', error);
        return this.fallbackDeleteSpace(id);
      }

      // Dispatch custom event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('spaceDeleted', {
          detail: { spaceId: id }
        }));
      }

      return true;
    } catch (error) {
      console.error('Error deleting space:', error);
      return this.fallbackDeleteSpace(id);
    }
  }

  /**
   * Get spaces owned by an address
   */
  async getSpacesByOwner(ownerAddress: string): Promise<Space[]> {
    if (!supabase) {
      return this.fallbackGetSpacesByOwner(ownerAddress);
    }

    try {
      const { data, error } = await supabase
        .from('spaces')
        .select('*')
        .eq('owner_address', ownerAddress.toLowerCase())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching spaces by owner:', error);
        return this.fallbackGetSpacesByOwner(ownerAddress);
      }

      return (data || []).map(space => this.mapSpaceFromDb(space));
    } catch (error) {
      console.error('Error fetching spaces by owner:', error);
      return this.fallbackGetSpacesByOwner(ownerAddress);
    }
  }

  /**
   * Ensure slug is unique
   */
  private async ensureUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
    if (!supabase) {
      // Fallback to localStorage check
      const spaces = this.fallbackToLocalStorage();
      const existingSlugs = spaces
        .filter(s => !excludeId || s.id !== excludeId)
        .map(s => s.slug);
      return ensureUniqueSlug(baseSlug, existingSlugs);
    }

    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const { data } = await supabase
        .from('spaces')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (!data || (excludeId && data.id === excludeId)) {
        return slug;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  /**
   * Map database row to Space interface
   */
  private mapSpaceFromDb(row: any): Space {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      logo: row.logo || undefined,
      coverPhoto: row.cover_photo || undefined,
      twitterUrl: row.twitter_url,
      ownerAddress: row.owner_address,
      userType: row.user_type?.toLowerCase() as 'project' | 'user',
      projectType: row.project_type || undefined,
      projectTypeOther: row.project_type_other || undefined,
      createdAt: new Date(row.created_at).getTime(),
      atomId: row.atom_id || undefined,
      atomTransactionHash: row.atom_transaction_hash || undefined,
    };
  }

  // Fallback methods to localStorage
  private fallbackToLocalStorage(): Space[] {
    if (typeof window === 'undefined' || !window.localStorage) {
      return [];
    }

    try {
      const stored = localStorage.getItem('spaces');
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error loading spaces from localStorage:', error);
      return [];
    }
  }

  private fallbackGetSpaceById(id: string): Space | null {
    const spaces = this.fallbackToLocalStorage();
    return spaces.find(space => space.id === id) || null;
  }

  private fallbackGetSpaceBySlug(slug: string): Space | null {
    const spaces = this.fallbackToLocalStorage();
    return spaces.find(space => space.slug.toLowerCase() === slug.toLowerCase()) || null;
  }

  private fallbackSearchSpaces(query: string): Space[] {
    const spaces = this.fallbackToLocalStorage();
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) return [];
    return spaces.filter(space => {
      const slugMatch = space.slug.toLowerCase().includes(lowerQuery);
      const nameMatch = space.name.toLowerCase().includes(lowerQuery);
      return slugMatch || nameMatch;
    });
  }

  private fallbackCreateSpace(data: any, slug: string): Space {
    const spaces = this.fallbackToLocalStorage();
    const existingSlugs = spaces.map(space => space.slug);
    const uniqueSlug = ensureUniqueSlug(slug, existingSlugs);

    const space: Space = {
      id: `space_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: data.name.trim(),
      slug: uniqueSlug,
      description: data.description.trim(),
      logo: data.logo,
      coverPhoto: data.coverPhoto,
      twitterUrl: data.twitterUrl.trim(),
      ownerAddress: data.ownerAddress.toLowerCase(),
      userType: data.userType,
      projectType: data.projectType,
      projectTypeOther: data.projectTypeOther,
      createdAt: Date.now(),
      atomId: data.atomId,
      atomTransactionHash: data.atomTransactionHash,
    };

    spaces.push(space);
    this.saveSpacesToLocalStorage(spaces);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('spaceCreated', {
        detail: { spaceId: space.id, ownerAddress: space.ownerAddress }
      }));
    }

    return space;
  }

  private fallbackUpdateSpace(id: string, updates: Partial<Space>): Space | null {
    const spaces = this.fallbackToLocalStorage();
    const index = spaces.findIndex(space => space.id === id);
    if (index === -1) return null;

    if (updates.name && updates.name !== spaces[index].name) {
      const existingSlugs = spaces
        .filter(space => space.id !== id)
        .map(space => space.slug);
      const baseSlug = generateSlug(updates.name);
      updates.slug = ensureUniqueSlug(baseSlug, existingSlugs);
    }

    spaces[index] = { ...spaces[index], ...updates };
    this.saveSpacesToLocalStorage(spaces);
    return spaces[index];
  }

  private async fallbackDeleteSpace(id: string): Promise<boolean> {
    // Delete associated quests first
    try {
      const { questServiceSupabase } = await import('./questServiceSupabase');
      await questServiceSupabase.deleteQuestsBySpaceId(id);
    } catch (error) {
      console.error('Error deleting quests by space_id in fallback:', error);
    }

    const spaces = this.fallbackToLocalStorage();
    const filtered = spaces.filter(space => space.id !== id);
    this.saveSpacesToLocalStorage(filtered);
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('spaceDeleted', {
        detail: { spaceId: id }
      }));
    }
    
    return true;
  }

  private fallbackGetSpacesByOwner(ownerAddress: string): Space[] {
    const spaces = this.fallbackToLocalStorage();
    return spaces.filter(
      space => space.ownerAddress.toLowerCase() === ownerAddress.toLowerCase()
    );
  }

  private saveSpacesToLocalStorage(spaces: Space[]): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      localStorage.setItem('spaces', JSON.stringify(spaces));
    } catch (error) {
      console.error('Error saving spaces to localStorage:', error);
    }
  }
}

// Export singleton instance
export const spaceServiceSupabase = new SpaceServiceSupabase();
