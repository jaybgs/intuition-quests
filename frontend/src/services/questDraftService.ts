import { supabase } from '../config/supabase';
import { apiClient } from './apiClient';

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
  deposit_status?: 'none' | 'approved' | 'deposited' | null;
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
   * Save or update a quest draft.
   * Try backend API first (shared across devices), then Supabase, then localStorage.
   * Returns info about where the draft was saved.
   */
  async saveDraft(draftData: QuestDraftData): Promise<{ savedTo: 'backend' | 'supabase' | 'localStorage' }> {
    // Always save to localStorage as backup first
    this.saveDraftToLocalStorage(draftData);
    
    // Try backend API first
    try {
      await apiClient.post('/quest-drafts', draftData);
      console.log('✅ Draft saved to backend API');
      return { savedTo: 'backend' };
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401) {
        console.warn('⚠️ Backend draft save failed (401 Unauthorized) - auth token may be missing or expired');
      } else {
        console.warn('⚠️ Backend draft save failed, trying Supabase', error?.message || error);
      }
    }

    // Try Supabase directly
    if (supabase) {
      try {
        const now = new Date().toISOString();
        const { error: supabaseError } = await supabase
          .from('quest_drafts')
          .upsert(
            {
              id: draftData.id,
              user_address: draftData.user_address.toLowerCase(),
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
              deposit_status: draftData.deposit_status || null,
              created_at: now, // Will be ignored on update if column has default
              updated_at: now,
            },
            {
              onConflict: 'id',
              ignoreDuplicates: false,
            }
          );

        if (supabaseError) {
          console.error('❌ Error saving draft to Supabase:', supabaseError.message, supabaseError.details);
        } else {
          console.log('✅ Draft saved to Supabase');
          return { savedTo: 'supabase' };
        }
      } catch (supabaseError: any) {
        console.error('❌ Exception saving draft to Supabase:', supabaseError?.message || supabaseError);
      }
    } else {
      console.warn('⚠️ Supabase client not initialized. Skipping Supabase save.');
    }

    // Last resort: local only (already saved above)
    console.log('📦 Draft saved to localStorage only (backend/Supabase unavailable)');
    return { savedTo: 'localStorage' };
  }

  /**
   * Get a draft by ID
   */
  async getDraftById(draftId: string, userAddress: string): Promise<QuestDraftData | null> {
    try {
      const response = await apiClient.get(`/quest-drafts/${draftId}`);
      if (response.data?.draft) {
        return this.mapDraftFromDb(response.data.draft);
      }
    } catch (error) {
      console.warn('⚠️ Backend draft fetch failed, trying Supabase/localStorage', error);
    }

    if (supabase) {
      try {
        const { data, error: supabaseError } = await supabase
          .from('quest_drafts')
          .select('*')
          .eq('id', draftId)
          .eq('user_address', userAddress.toLowerCase())
          .single();

        if (!supabaseError && data) {
          return this.mapDraftFromDb(data);
        }
      } catch (supabaseError) {
        console.warn('⚠️ Supabase draft fetch failed, using localStorage', supabaseError);
      }
    }

    return this.getDraftFromLocalStorage(draftId, userAddress);
  }

  /**
   * Get all drafts for a user
   */
  async getAllDrafts(userAddress: string, spaceId?: string): Promise<QuestDraftListItem[]> {
    try {
      const response = await apiClient.get('/quest-drafts', { params: { spaceId } });
      if (response.data?.drafts) {
        return response.data.drafts;
      }
    } catch (error) {
      console.warn('⚠️ Backend draft list fetch failed, trying Supabase/localStorage', error);
    }

    if (supabase) {
      try {
        let query = supabase
          .from('quest_drafts')
          .select('id, title, current_step, space_id, updated_at')
          .eq('user_address', userAddress.toLowerCase())
          .order('updated_at', { ascending: false });

        if (spaceId) {
          query = query.or(`space_id.eq.${spaceId},space_id.is.null`);
        }

        const { data, error: supabaseError } = await query;

        if (!supabaseError && data) {
          return (data || []).map((draft: any) => ({
            id: draft.id,
            title: draft.title || 'Untitled Quest',
            updatedAt: new Date(draft.updated_at).getTime(),
            currentStep: draft.current_step || 1,
            spaceId: draft.space_id || null,
          }));
        }
      } catch (supabaseError) {
        console.warn('⚠️ Supabase draft list fetch failed, using localStorage', supabaseError);
      }
    }

    return this.getAllDraftsFromLocalStorage(userAddress, spaceId);
  }

  /**
   * Delete a draft
   */
  async deleteDraft(draftId: string, userAddress: string): Promise<void> {
    try {
      await apiClient.delete(`/quest-drafts/${draftId}`);
      this.deleteDraftFromLocalStorage(draftId, userAddress);
      return;
    } catch (error) {
      console.warn('⚠️ Backend draft delete failed, trying Supabase/localStorage', error);
    }

    if (supabase) {
      try {
        const { error: supabaseError } = await supabase
          .from('quest_drafts')
          .delete()
          .eq('id', draftId)
          .eq('user_address', userAddress.toLowerCase());

        if (!supabaseError) {
          this.deleteDraftFromLocalStorage(draftId, userAddress);
          return;
        }
      } catch (supabaseError) {
        console.warn('⚠️ Supabase draft delete failed, removing local copy', supabaseError);
      }
    }

    this.deleteDraftFromLocalStorage(draftId, userAddress);
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
      deposit_status: dbDraft.deposit_status || null,
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
        depositStatus: draftData.deposit_status || null,
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
        deposit_status: draft.depositStatus || null,
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








