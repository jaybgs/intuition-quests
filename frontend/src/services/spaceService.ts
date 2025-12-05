import type { Space } from '../types';
import { generateSlug, ensureUniqueSlug } from '../utils/slugUtils';

const SPACES_STORAGE_KEY = 'spaces';
const SPACES_BY_SLUG_KEY = 'spaces_by_slug';

/**
 * Service for managing spaces in localStorage
 * In a production app, this would interact with a backend API
 */
export class SpaceService {
  /**
   * Get all spaces
   */
  getAllSpaces(): Space[] {
    if (typeof window === 'undefined' || !window.localStorage) {
      return [];
    }

    try {
      const stored = localStorage.getItem(SPACES_STORAGE_KEY);
      if (!stored) {
        return [];
      }
      const spaces = JSON.parse(stored);
      return spaces || [];
    } catch (error) {
      console.error('Error loading spaces:', error);
      return [];
    }
  }

  /**
   * Get a space by ID
   */
  getSpaceById(id: string): Space | null {
    const spaces = this.getAllSpaces();
    return spaces.find(space => space.id === id) || null;
  }

  /**
   * Get a space by slug
   */
  getSpaceBySlug(slug: string): Space | null {
    const spaces = this.getAllSpaces();
    return spaces.find(space => space.slug.toLowerCase() === slug.toLowerCase()) || null;
  }

  /**
   * Search spaces by slug or name
   */
  searchSpaces(query: string): Space[] {
    const spaces = this.getAllSpaces();
    const lowerQuery = query.toLowerCase().trim();

    if (!lowerQuery) return [];

    return spaces.filter(space => {
      const slugMatch = space.slug.toLowerCase().includes(lowerQuery);
      const nameMatch = space.name.toLowerCase().includes(lowerQuery);
      return slugMatch || nameMatch;
    });
  }

  /**
   * Create a new space
   */
  createSpace(data: {
    name: string;
    description: string;
    logo?: string;
    twitterUrl: string;
    ownerAddress: string;
    userType: 'project' | 'user';
    atomId?: string;
    atomTransactionHash?: string;
  }): Space {
    const spaces = this.getAllSpaces();
    const existingSlugs = spaces.map(space => space.slug);

    // Generate slug from name
    const baseSlug = generateSlug(data.name);
    const slug = ensureUniqueSlug(baseSlug, existingSlugs);

    const space: Space = {
      id: `space_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: data.name.trim(),
      slug,
      description: data.description.trim(),
      logo: data.logo,
      twitterUrl: data.twitterUrl.trim(),
      ownerAddress: data.ownerAddress.toLowerCase(),
      userType: data.userType,
      createdAt: Date.now(),
      atomId: data.atomId,
      atomTransactionHash: data.atomTransactionHash,
    };

    // Add to storage
    spaces.push(space);
    this.saveSpaces(spaces);

    // Dispatch custom event to notify components about space creation
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('spaceCreated', {
        detail: { spaceId: space.id, ownerAddress: space.ownerAddress }
      }));
    }

    return space;
  }

  /**
   * Update a space
   */
  updateSpace(id: string, updates: Partial<Omit<Space, 'id' | 'createdAt'>>): Space | null {
    const spaces = this.getAllSpaces();
    const index = spaces.findIndex(space => space.id === id);

    if (index === -1) return null;

    // If name is being updated, regenerate slug
    if (updates.name && updates.name !== spaces[index].name) {
      const existingSlugs = spaces
        .filter(space => space.id !== id)
        .map(space => space.slug);
      const baseSlug = generateSlug(updates.name);
      updates.slug = ensureUniqueSlug(baseSlug, existingSlugs);
    }

    spaces[index] = { ...spaces[index], ...updates };
    this.saveSpaces(spaces);

    return spaces[index];
  }

  /**
   * Delete a space
   */
  deleteSpace(id: string): boolean {
    const spaces = this.getAllSpaces();
    const spaceToDelete = spaces.find(space => space.id === id);
    
    if (!spaceToDelete) return false;

    // Remove space-related localStorage keys
    if (typeof window !== 'undefined' && window.localStorage) {
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        // Remove space stats
        if (key.startsWith(`space_followers_${id}`) ||
            key.startsWith(`space_quests_${id}`) ||
            key.startsWith(`space_token_status_${id}`) ||
            key.startsWith(`space_token_symbol_${id}`) ||
            key.startsWith(`space_atom_${id}`) ||
            key.startsWith(`space_atom_tx_${id}`)) {
          localStorage.removeItem(key);
        }
      });
    }

    // Remove space from array
    const filtered = spaces.filter(space => space.id !== id);
    this.saveSpaces(filtered);
    
    // Dispatch custom event to notify components about space deletion
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('spaceDeleted', {
        detail: { spaceId: id, ownerAddress: spaceToDelete.ownerAddress }
      }));
    }
    
    return true;
  }

  /**
   * Get spaces owned by an address
   */
  getSpacesByOwner(ownerAddress: string): Space[] {
    const spaces = this.getAllSpaces();
    return spaces.filter(
      space => space.ownerAddress.toLowerCase() === ownerAddress.toLowerCase()
    );
  }

  /**
   * Save spaces to localStorage
   */
  private saveSpaces(spaces: Space[]): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      localStorage.setItem(SPACES_STORAGE_KEY, JSON.stringify(spaces));
      
      // Also create a slug index for faster lookups
      const slugIndex: Record<string, string> = {};
      spaces.forEach(space => {
        slugIndex[space.slug.toLowerCase()] = space.id;
      });
      localStorage.setItem(SPACES_BY_SLUG_KEY, JSON.stringify(slugIndex));
    } catch (error) {
      console.error('Error saving spaces:', error);
    }
  }
}

// Import Supabase-based service
import { spaceServiceSupabase } from './spaceServiceSupabase';

// Use Supabase service if available, otherwise fall back to localStorage
// This allows gradual migration - Supabase service has built-in fallback
export const spaceService = spaceServiceSupabase;






