/**
 * Space Service using Supabase
 * Example implementation showing how to use Supabase instead of Prisma
 */
import { supabase } from '../config/supabase.js';

export interface SpaceCreateInput {
  name: string;
  description: string;
  logo?: string;
  twitterUrl: string;
  ownerAddress: string;
  userType: 'project' | 'user';
  atomId?: string;
  atomTransactionHash?: string;
}

export interface SpaceUpdateInput {
  name?: string;
  description?: string;
  logo?: string;
  twitterUrl?: string;
}

export interface Space {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo?: string;
  twitterUrl: string;
  ownerAddress: string;
  userType: 'project' | 'user';
  createdAt: number;
  atomId?: string;
  atomTransactionHash?: string;
}

export class SupabaseSpaceService {
  /**
   * Get all spaces
   */
  async getAllSpaces(): Promise<Space[]> {
    const { data, error } = await supabase
      .from('spaces')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching spaces:', error);
      throw new Error(error.message);
    }

    return (data || []).map(space => this.mapSpaceFromDb(space));
  }

  /**
   * Get a space by ID
   */
  async getSpaceById(id: string): Promise<Space | null> {
    const { data, error } = await supabase
      .from('spaces')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error('Error fetching space:', error);
      throw new Error(error.message);
    }

    return data ? this.mapSpaceFromDb(data) : null;
  }

  /**
   * Get a space by slug
   */
  async getSpaceBySlug(slug: string): Promise<Space | null> {
    const { data, error } = await supabase
      .from('spaces')
      .select('*')
      .eq('slug', slug.toLowerCase())
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching space by slug:', error);
      throw new Error(error.message);
    }

    return data ? this.mapSpaceFromDb(data) : null;
  }

  /**
   * Search spaces by name or slug
   */
  async searchSpaces(query: string): Promise<Space[]> {
    const lowerQuery = query.toLowerCase().trim();
    
    if (!lowerQuery) {
      return [];
    }

    const { data, error } = await supabase
      .from('spaces')
      .select('*')
      .or(`name.ilike.%${lowerQuery}%,slug.ilike.%${lowerQuery}%`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error searching spaces:', error);
      throw new Error(error.message);
    }

    return (data || []).map(space => this.mapSpaceFromDb(space));
  }

  /**
   * Get spaces owned by an address
   */
  async getSpacesByOwner(ownerAddress: string): Promise<Space[]> {
    const { data, error } = await supabase
      .from('spaces')
      .select('*')
      .eq('owner_address', ownerAddress.toLowerCase())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching spaces by owner:', error);
      throw new Error(error.message);
    }

    return (data || []).map(space => this.mapSpaceFromDb(space));
  }

  /**
   * Create a new space
   */
  async createSpace(input: SpaceCreateInput): Promise<Space> {
    const slug = this.generateSlug(input.name);
    const uniqueSlug = await this.ensureUniqueSlug(slug);

    // Prepare insert data - only include logo if it's provided and reasonable size
    const insertData: any = {
      name: input.name.trim(),
      slug: uniqueSlug,
      description: input.description.trim(),
      twitter_url: input.twitterUrl.trim(),
      owner_address: input.ownerAddress.toLowerCase(),
      user_type: input.userType.toUpperCase(),
      atom_id: input.atomId,
      atom_transaction_hash: input.atomTransactionHash,
    };

    // Only include logo if it's provided and not too large
    if (input.logo) {
      const logoSize = input.logo.length;
      if (logoSize < 1000000) { // ~1MB base64
        insertData.logo = input.logo;
      } else {
        console.warn('Logo too large, skipping logo upload. Size:', logoSize, 'bytes');
      }
    }

    const { data, error } = await supabase
      .from('spaces')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating space:', error);
      throw new Error(error.message);
    }

    return this.mapSpaceFromDb(data);
  }

  /**
   * Update a space
   */
  async updateSpace(id: string, input: SpaceUpdateInput): Promise<Space> {
    const updateData: any = {};

    if (input.name !== undefined) {
      updateData.name = input.name.trim();
      const slug = this.generateSlug(input.name);
      updateData.slug = await this.ensureUniqueSlug(slug, id);
    }

    if (input.description !== undefined) {
      updateData.description = input.description.trim();
    }

    if (input.logo !== undefined) {
      updateData.logo = input.logo;
    }

    if (input.twitterUrl !== undefined) {
      updateData.twitter_url = input.twitterUrl.trim();
    }

    const { data, error } = await supabase
      .from('spaces')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating space:', error);
      throw new Error(error.message);
    }

    return this.mapSpaceFromDb(data);
  }

  /**
   * Delete a space
   */
  async deleteSpace(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('spaces')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting space:', error);
      throw new Error(error.message);
    }

    return true;
  }

  /**
   * Generate slug from name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Ensure slug is unique
   */
  private async ensureUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
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
      twitterUrl: row.twitter_url,
      ownerAddress: row.owner_address,
      userType: row.user_type?.toLowerCase() as 'project' | 'user',
      createdAt: new Date(row.created_at).getTime(),
      atomId: row.atom_id || undefined,
      atomTransactionHash: row.atom_transaction_hash || undefined,
    };
  }
}

