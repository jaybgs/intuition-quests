import { supabase } from '../config/supabase';

export interface QuestDraftData {
  id: string;
  user_address: string;
  space_id?: string | null;
  title?: string | null;
  difficulty?: string | null;
  description?: string | null;
  image_preview?: string | null;
  end_date?: string | null;
  end_time?: string | null;
  selected_actions?: any;
  number_of_winners?: string | null;
  winner_prizes?: any;
  iq_points?: string | null;
  reward_deposit?: string | null;
  reward_token?: string | null;
  distribution_type?: string | null;
  current_step?: number | null;
}

export interface QuestDraftListItem {
  id: string;
  title: string;
  updatedAt: number;
  currentStep: number;
  spaceId?: string | null;
}

/**
 * Quest Draft Service using Supabase
 * Handles saving and updating quest drafts in the database
 */
export class QuestDraftService {
  /**
   * Save or update a quest draft
   * Uses upsert to handle both create and update operations
   */
  async saveDraft(draftData: QuestDraftData): Promise<void> {
    if (!supabase) {
      console.warn('⚠️ Supabase client not initialized. Saving draft to localStorage only.');
      console.warn('   Missing environment variables: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
      // Fallback to localStorage if Supabase is not available
      this.saveDraftToLocalStorage(draftData);
      return;
    }

    try {
      const { error } = await supabase
        .from('quest_drafts')
        .upsert(
          {
            id: draftData.id,
            user_address: draftData.user_address,
            space_id: draftData.space_id || null,
            title: draftData.title || null,
            difficulty: draftData.difficulty || null,
            description: draftData.description || null,
            image_preview: draftData.image_preview || null,
            end_date: draftData.end_date || null,
            end_time: draftData.end_time || null,
            selected_actions: draftData.selected_actions || null,
            number_of_winners: draftData.number_of_winners || null,
            winner_prizes: draftData.winner_prizes || null,
            iq_points: draftData.iq_points || null,
            reward_deposit: draftData.reward_deposit || null,
            reward_token: draftData.reward_token || null,
            distribution_type: draftData.distribution_type || null,
            current_step: draftData.current_step || 1,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'id', // Use id as the conflict resolution key
          }
        );

      if (error) {
        console.error('❌ Error saving draft to Supabase:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        // Fallback to localStorage on error
        this.saveDraftToLocalStorage(draftData);
        throw error;
      }

      console.log('✅ Draft saved to Supabase:', draftData.id);
      // Also save to localStorage as backup
      this.saveDraftToLocalStorage(draftData);
    } catch (error) {
      console.error('❌ Exception in saveDraft:', error);
      // Fallback to localStorage
      this.saveDraftToLocalStorage(draftData);
      throw error;
    }
  }

  /**
   * Get a draft by ID
   */
  async getDraftById(draftId: string, userAddress: string): Promise<QuestDraftData | null> {
    if (!supabase) {
      return this.getDraftFromLocalStorage(draftId, userAddress);
    }

    try {
      const { data, error } = await supabase
        .from('quest_drafts')
        .select('*')
        .eq('id', draftId)
        .eq('user_address', userAddress.toLowerCase())
        .single();

      if (error) {
        console.error('Error fetching draft from Supabase:', error);
        return this.getDraftFromLocalStorage(draftId, userAddress);
      }

      if (!data) {
        return this.getDraftFromLocalStorage(draftId, userAddress);
      }

      // Map database fields to frontend format
      return this.mapDraftFromDb(data);
    } catch (error) {
      console.error('Error in getDraftById:', error);
      return this.getDraftFromLocalStorage(draftId, userAddress);
    }
  }

  /**
   * Get all drafts for a user
   */
  async getAllDrafts(userAddress: string, spaceId?: string): Promise<QuestDraftListItem[]> {
    if (!supabase) {
      return this.getAllDraftsFromLocalStorage(userAddress, spaceId);
    }

    try {
      let query = supabase
        .from('quest_drafts')
        .select('id, title, current_step, space_id, updated_at')
        .eq('user_address', userAddress.toLowerCase())
        .order('updated_at', { ascending: false });

      if (spaceId) {
        query = query.or(`space_id.eq.${spaceId},space_id.is.null`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching drafts from Supabase:', error);
        return this.getAllDraftsFromLocalStorage(userAddress, spaceId);
      }

      return (data || []).map((draft: any) => ({
        id: draft.id,
        title: draft.title || 'Untitled Quest',
        updatedAt: new Date(draft.updated_at).getTime(),
        currentStep: draft.current_step || 1,
        spaceId: draft.space_id || null,
      }));
    } catch (error) {
      console.error('Error in getAllDrafts:', error);
      return this.getAllDraftsFromLocalStorage(userAddress, spaceId);
    }
  }

  /**
   * Delete a draft
   */
  async deleteDraft(draftId: string, userAddress: string): Promise<void> {
    if (!supabase) {
      this.deleteDraftFromLocalStorage(draftId, userAddress);
      return;
    }

    try {
      const { error } = await supabase
        .from('quest_drafts')
        .delete()
        .eq('id', draftId)
        .eq('user_address', userAddress.toLowerCase());

      if (error) {
        console.error('Error deleting draft from Supabase:', error);
        // Still try to delete from localStorage
        this.deleteDraftFromLocalStorage(draftId, userAddress);
        throw error;
      }

      // Also delete from localStorage
      this.deleteDraftFromLocalStorage(draftId, userAddress);
    } catch (error) {
      console.error('Error in deleteDraft:', error);
      // Fallback to localStorage
      this.deleteDraftFromLocalStorage(draftId, userAddress);
      throw error;
    }
  }

  /**
   * Map database format to frontend format
   */
  private mapDraftFromDb(dbDraft: any): QuestDraftData {
    return {
      id: dbDraft.id,
      user_address: dbDraft.user_address,
      space_id: dbDraft.space_id,
      title: dbDraft.title,
      difficulty: dbDraft.difficulty,
      description: dbDraft.description,
      image_preview: dbDraft.image_preview,
      end_date: dbDraft.end_date,
      end_time: dbDraft.end_time,
      selected_actions: dbDraft.selected_actions,
      number_of_winners: dbDraft.number_of_winners,
      winner_prizes: dbDraft.winner_prizes,
      iq_points: dbDraft.iq_points,
      reward_deposit: dbDraft.reward_deposit,
      reward_token: dbDraft.reward_token,
      distribution_type: dbDraft.distribution_type,
      current_step: dbDraft.current_step,
    };
  }

  /**
   * Fallback: Save to localStorage
   */
  private saveDraftToLocalStorage(draftData: QuestDraftData): void {
    try {
      const storageKey = `quest_draft_${draftData.id}_${draftData.user_address.toLowerCase()}`;
      const draftDataForStorage = {
        id: draftData.id,
        spaceId: draftData.space_id || null,
        title: draftData.title,
        difficulty: draftData.difficulty,
        description: draftData.description,
        imagePreview: draftData.image_preview,
        endDate: draftData.end_date,
        endTime: draftData.end_time,
        selectedActions: draftData.selected_actions,
        numberOfWinners: draftData.number_of_winners,
        winnerPrizes: draftData.winner_prizes,
        iqPoints: draftData.iq_points,
        rewardDeposit: draftData.reward_deposit,
        rewardToken: draftData.reward_token,
        distributionType: draftData.distribution_type,
        currentStep: draftData.current_step || 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      localStorage.setItem(storageKey, JSON.stringify(draftDataForStorage));

      // Also save to drafts list
      const draftsListKey = `quest_drafts_${draftData.user_address.toLowerCase()}`;
      const existingDrafts = JSON.parse(localStorage.getItem(draftsListKey) || '[]');
      const draftIndex = existingDrafts.findIndex((d: any) => d.id === draftData.id);

      const draftListItem = {
        id: draftData.id,
        title: draftData.title || 'Untitled Quest',
        updatedAt: Date.now(),
        currentStep: draftData.current_step || 1,
        spaceId: draftData.space_id || null,
      };

      if (draftIndex >= 0) {
        existingDrafts[draftIndex] = draftListItem;
      } else {
        existingDrafts.push(draftListItem);
      }

      localStorage.setItem(draftsListKey, JSON.stringify(existingDrafts));
    } catch (error) {
      console.error('Error saving draft to localStorage:', error);
    }
  }

  /**
   * Fallback: Get draft from localStorage
   */
  private getDraftFromLocalStorage(draftId: string, userAddress: string): QuestDraftData | null {
    try {
      const storageKey = `quest_draft_${draftId}_${userAddress.toLowerCase()}`;
      const stored = localStorage.getItem(storageKey);
      if (!stored) return null;

      const draft = JSON.parse(stored);
      return {
        id: draft.id,
        user_address: userAddress.toLowerCase(),
        space_id: draft.spaceId || null,
        title: draft.title || null,
        difficulty: draft.difficulty || null,
        description: draft.description || null,
        image_preview: draft.imagePreview || null,
        end_date: draft.endDate || null,
        end_time: draft.endTime || null,
        selected_actions: draft.selectedActions || null,
        number_of_winners: draft.numberOfWinners || null,
        winner_prizes: draft.winnerPrizes || null,
        iq_points: draft.iqPoints || null,
        reward_deposit: draft.rewardDeposit || null,
        reward_token: draft.rewardToken || null,
        distribution_type: draft.distributionType || null,
        current_step: draft.currentStep || 1,
      };
    } catch (error) {
      console.error('Error reading draft from localStorage:', error);
      return null;
    }
  }

  /**
   * Fallback: Get all drafts from localStorage
   */
  private getAllDraftsFromLocalStorage(userAddress: string, spaceId?: string): QuestDraftListItem[] {
    try {
      const draftsListKey = `quest_drafts_${userAddress.toLowerCase()}`;
      const savedDrafts = localStorage.getItem(draftsListKey);
      if (!savedDrafts) return [];

      const draftsList: QuestDraftListItem[] = JSON.parse(savedDrafts);
      const filteredDrafts = spaceId
        ? draftsList.filter(d => d.spaceId === spaceId || !d.spaceId)
        : draftsList;

      return filteredDrafts.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    } catch (error) {
      console.error('Error reading drafts from localStorage:', error);
      return [];
    }
  }

  /**
   * Fallback: Delete draft from localStorage
   */
  private deleteDraftFromLocalStorage(draftId: string, userAddress: string): void {
    try {
      const storageKey = `quest_draft_${draftId}_${userAddress.toLowerCase()}`;
      localStorage.removeItem(storageKey);

      const draftsListKey = `quest_drafts_${userAddress.toLowerCase()}`;
      const existingDrafts = JSON.parse(localStorage.getItem(draftsListKey) || '[]');
      const filteredDrafts = existingDrafts.filter((d: any) => d.id !== draftId);
      localStorage.setItem(draftsListKey, JSON.stringify(filteredDrafts));
    } catch (error) {
      console.error('Error deleting draft from localStorage:', error);
    }
  }
}

// Export singleton instance
export const questDraftService = new QuestDraftService();






