import { apiClient } from './apiClient';

/**
 * Creator Dashboard Service
 * Handles API calls for reward distribution management
 */

export interface Winner {
    wallet_address: string;
    rank: number;
    reward_amount: string;
    reward_token: string;
    distributed: boolean;
    distributed_at?: string;
}

export interface CreatorQuest {
    id: string;
    title: string;
    status: string;
    expires_at: number;
    reward_deposit: string;
    reward_token: string;
    reward_type?: 'iq_only' | 'trust_only' | 'trust_and_iq';
    distribution_type: 'fcfs' | 'raffle';
    number_of_winners?: number;
    completed_by: string[];
    winners_selected?: string[];
    reward_distribution_tx_hash?: string;
    rewards_distributed_at?: number;
}

class CreatorDashboardService {
    /**
     * Get all quests created by a specific wallet address
     */
    async getCreatorQuests(walletAddress: string): Promise<CreatorQuest[]> {
        try {
            const response = await apiClient.get(`/quests/creator/${walletAddress}`);
            return response.data.quests || [];
        } catch (error) {
            console.error('Error fetching creator quests:', error);
            throw error;
        }
    }

    /**
     * Select winners for an expired quest
     */
    async selectWinners(questId: string): Promise<{ winners: Winner[] }> {
        try {
            const response = await apiClient.post(`/quests/${questId}/select-winners`);
            return response.data;
        } catch (error) {
            console.error('Error selecting winners:', error);
            throw error;
        }
    }

    /**
     * Distribute rewards to selected winners
     */
    async distributeRewards(questId: string, txHash?: string): Promise<{ success: boolean }> {
        try {
            const response = await apiClient.post(`/quests/${questId}/distribute-rewards`, {
                tx_hash: txHash
            });
            return response.data;
        } catch (error) {
            console.error('Error distributing rewards:', error);
            throw error;
        }
    }

    /**
     * Get winners list for a quest
     */
    async getWinners(questId: string): Promise<Winner[]> {
        try {
            const response = await apiClient.get(`/quests/${questId}/winners`);
            return response.data.winners || [];
        } catch (error) {
            console.error('Error fetching winners:', error);
            throw error;
        }
    }
}

export const creatorDashboardService = new CreatorDashboardService();
