import supabase from '../config/supabase.js';

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
 * Server-side Quest Draft Service
 * Persists drafts to Supabase using the service role key.
 */
export class QuestDraftService {
  async saveDraft(draftData: QuestDraftData): Promise<void> {
    const { error } = await supabase
      .from('quest_drafts')
      .upsert({
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
        updated_at: new Date().toISOString(),
      });

    if (error) {
      throw new Error(`Failed to save quest draft: ${error.message}`);
    }
  }

  async getDraftById(draftId: string, userAddress: string): Promise<QuestDraftData | null> {
    const { data, error } = await supabase
      .from('quest_drafts')
      .select('*')
      .eq('id', draftId)
      .eq('user_address', userAddress.toLowerCase())
      .single();

    if (error) {
      if (error.code === 'PGRST116' /* no rows returned */) {
        return null;
      }
      throw new Error(`Failed to fetch quest draft: ${error.message}`);
    }

    if (!data) return null;

    return {
      id: data.id,
      user_address: data.user_address,
      space_id: data.space_id,
      title: data.title,
      difficulty: data.difficulty,
      description: data.description,
      image_preview: data.image_preview,
      end_date: data.end_date,
      end_time: data.end_time,
      selected_actions: data.selected_actions,
      number_of_winners: data.number_of_winners,
      winner_prizes: data.winner_prizes,
      iq_points: data.iq_points,
      reward_deposit: data.reward_deposit,
      reward_token: data.reward_token,
      distribution_type: data.distribution_type,
      current_step: data.current_step,
    };
  }

  async getAllDraftsForUser(userAddress: string, spaceId?: string): Promise<QuestDraftListItem[]> {
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
      throw new Error(`Failed to fetch quest drafts: ${error.message}`);
    }

    return (data || []).map((draft: any) => ({
      id: draft.id,
      title: draft.title || 'Untitled Quest',
      updatedAt: new Date(draft.updated_at).getTime(),
      currentStep: draft.current_step || 1,
      spaceId: draft.space_id || null,
    }));
  }

  async deleteDraft(draftId: string, userAddress: string): Promise<void> {
    const { error } = await supabase
      .from('quest_drafts')
      .delete()
      .eq('id', draftId)
      .eq('user_address', userAddress.toLowerCase());

    if (error) {
      throw new Error(`Failed to delete quest draft: ${error.message}`);
    }
  }
}

export const questDraftService = new QuestDraftService();


