interface Project {
  id: string;
  title: string;
  description: string;
  image?: string;
  gradientColors: string[];
  questCount?: number;
  isHot?: boolean;
  isTrending?: boolean;
}

import type { Project } from '../types';
import { supabase } from '../config/supabase';
import { isAdmin } from './adminAuthService';

/**
 * Highlights Service using Supabase
 * This stores and retrieves weekly highlights from Supabase database
 */
export class HighlightsServiceSupabase {
  /**
   * Get all weekly highlights
   */
  async getAllHighlights(): Promise<Project[]> {
    if (!supabase) {
      console.warn('Supabase not configured, returning default highlights');
      return this.getDefaultHighlights();
    }

    try {
      const { data, error } = await supabase
        .from('weekly_highlights')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error fetching highlights from Supabase:', error);
        return this.getDefaultHighlights();
      }

      if (!data || data.length === 0) {
        // If no highlights exist, return defaults for display
        // Only admins can actually save highlights to the database
        return this.getDefaultHighlights();
      }

      // Convert database format to component format
      return data.map(highlight => ({
        id: highlight.id,
        title: highlight.title,
        description: highlight.description,
        image: highlight.image,
        gradientColors: highlight.gradient_colors || ['#2563eb', '#2563eb'],
        questCount: highlight.quest_count || 0,
        isHot: highlight.is_hot || false,
        isTrending: highlight.is_trending || false,
        questLink: highlight.quest_link,
      }));
    } catch (error) {
      console.error('Error in getAllHighlights:', error);
      return this.getDefaultHighlights();
    }
  }

  /**
   * Create or update a highlight
   */
  async saveHighlight(highlight: Project): Promise<boolean> {
    // Check admin permissions
    if (!isAdmin()) {
      console.error('Unauthorized: Only admin users can modify highlights');
      return false;
    }

    if (!supabase) {
      console.warn('Supabase not configured, cannot save highlight');
      return false;
    }

    try {
      const dbHighlight = {
        id: highlight.id,
        title: highlight.title,
        description: highlight.description,
        image: highlight.image,
        gradient_colors: highlight.gradientColors,
        quest_count: highlight.questCount || 0,
        is_hot: highlight.isHot || false,
        is_trending: highlight.isTrending || false,
        quest_link: highlight.questLink,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('weekly_highlights')
        .upsert(dbHighlight, { onConflict: 'id' });

      if (error) {
        console.error('Error saving highlight:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in saveHighlight:', error);
      return false;
    }
  }

  /**
   * Save multiple highlights (replace all)
   */
  async saveAllHighlights(highlights: Project[]): Promise<boolean> {
    // Check admin permissions
    if (!isAdmin()) {
      console.error('Unauthorized: Only admin users can modify highlights');
      return false;
    }

    if (!supabase) {
      console.warn('Supabase not configured, cannot save highlights');
      return false;
    }

    try {
      // First, delete all existing highlights
      const { error: deleteError } = await supabase
        .from('weekly_highlights')
        .delete()
        .neq('id', ''); // Delete all rows

      if (deleteError) {
        console.error('Error deleting existing highlights:', deleteError);
        return false;
      }

      // Then insert all new highlights
      const dbHighlights = highlights.map((highlight, index) => ({
        id: highlight.id,
        title: highlight.title,
        description: highlight.description,
        image: highlight.image,
        gradient_colors: highlight.gradientColors,
        quest_count: highlight.questCount || 0,
        is_hot: highlight.isHot || false,
        is_trending: highlight.isTrending || false,
        quest_link: highlight.questLink,
        display_order: index,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { error: insertError } = await supabase
        .from('weekly_highlights')
        .insert(dbHighlights);

      if (insertError) {
        console.error('Error saving highlights:', insertError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in saveAllHighlights:', error);
      return false;
    }
  }

  /**
   * Delete a highlight
   */
  async deleteHighlight(id: string): Promise<boolean> {
    // Check admin permissions
    if (!isAdmin()) {
      console.error('Unauthorized: Only admin users can modify highlights');
      return false;
    }

    if (!supabase) {
      console.warn('Supabase not configured, cannot delete highlight');
      return false;
    }

    try {
      const { error } = await supabase
        .from('weekly_highlights')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting highlight:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteHighlight:', error);
      return false;
    }
  }

  /**
   * Seed database with default highlights
   */
  private async seedDefaultHighlights(): Promise<void> {
    if (!supabase) return;

    try {
      const defaultHighlights = this.getDefaultHighlights();
      const dbHighlights = defaultHighlights.map((highlight, index) => ({
        id: highlight.id,
        title: highlight.title,
        description: highlight.description,
        image: highlight.image,
        gradient_colors: highlight.gradientColors,
        quest_count: highlight.questCount || 0,
        is_hot: highlight.isHot || false,
        is_trending: highlight.isTrending || false,
        display_order: index,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('weekly_highlights')
        .insert(dbHighlights);

      if (error) {
        console.error('Error seeding default highlights:', error);
      } else {
        console.log('Successfully seeded default highlights');
      }
    } catch (error) {
      console.error('Error in seedDefaultHighlights:', error);
    }
  }

  /**
   * Get default highlights (fallback data)
   */
  private getDefaultHighlights(): Project[] {
    return [
      {
        id: '1',
        title: 'Project Alpha',
        description: 'Complete tasks to earn rewards and unlock exclusive features. Join thousands of users earning daily!',
        gradientColors: ['#2563eb', '#2563eb'],
        questCount: 12,
        isHot: true,
        questLink: '#quests',
      },
      {
        id: '2',
        title: 'Project Beta',
        description: 'Join the community and participate in exciting challenges. New quests added weekly!',
        gradientColors: ['#10b981', '#3b82f6'],
        questCount: 8,
        isTrending: true,
        questLink: '#quests',
      },
      {
        id: '3',
        title: 'Project Gamma',
        description: 'Explore new opportunities and grow your portfolio. Start your journey today!',
        gradientColors: ['#f59e0b', '#ef4444'],
        questCount: 15,
        questLink: '#quests',
      },
    ];
  }
}

export const highlightsServiceSupabase = new HighlightsServiceSupabase();
