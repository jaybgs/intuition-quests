import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token to requests if available
    this.client.interceptors.request.use((config) => {
      const token = this.getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Handle unauthorized - clear token
          this.clearAuthToken();
        }
        return Promise.reject(error);
      }
    );
  }

  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  }

  private clearAuthToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('auth_token');
  }

  setAuthToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('auth_token', token);
  }

  // Quest endpoints
  async getQuests(filters?: {
    status?: string;
    projectId?: string;
    limit?: number;
    offset?: number;
  }) {
    try {
      const response = await this.client.get('/quests', { params: filters });
      // Backend returns { quests: [...] } or just [...]
      return response.data?.quests || response.data || [];
    } catch (error) {
      console.error('Error fetching quests:', error);
      // Return empty array if backend is not available
      return [];
    }
  }

  async getQuestById(questId: string) {
    const response = await this.client.get(`/quests/${questId}`);
    return response.data.quest;
  }

  async createQuest(questData: {
    title: string;
    description: string;
    projectId: string;
    projectName?: string;
    xpReward: number;
    trustReward?: number;
    requirements?: any[];
    maxCompletions?: number;
    expiresAt?: Date;
    twitterLink?: string; // Creator's X profile URL
  }) {
    const response = await this.client.post('/quests', questData);
    return response.data.quest;
  }

  async updateQuest(questId: string, updates: Partial<{
    title: string;
    description: string;
    projectId: string;
    projectName?: string;
    xpReward: number;
    trustReward?: number;
    requirements?: any[];
    maxCompletions?: number;
    expiresAt?: Date;
  }>) {
    const response = await this.client.put(`/quests/${questId}`, updates);
    return response.data.quest;
  }

  async deleteQuest(questId: string) {
    const response = await this.client.delete(`/quests/${questId}`);
    return response.data;
  }

  async completeQuest(questId: string, verificationData?: Record<string, any>) {
    const response = await this.client.post(`/quests/${questId}/complete`, {
      verificationData,
    });
    return response.data.completion;
  }

  async getQuestCompletions(questId: string, limit = 100) {
    const response = await this.client.get(`/quests/${questId}/completions`, {
      params: { limit },
    });
    return response.data.completions;
  }

  // User endpoints
  async getUserXP(address: string) {
    const response = await this.client.get(`/users/${address}/xp`);
    return response.data;
  }

  async getUserCompletions(address: string, limit = 50) {
    const response = await this.client.get(`/users/${address}/completions`, {
      params: { limit },
    });
    return response.data.completions;
  }

  async getUserCompletionsCount(address: string) {
    const response = await this.client.get(`/users/${address}/completions/count`);
    return response.data.count;
  }

  async getTrustBalance(address: string) {
    const response = await this.client.get(`/users/${address}/trust-balance`);
    return response.data.balance;
  }

  async getUserRank(address: string) {
    const response = await this.client.get(`/users/${address}/rank`);
    return response.data.rank;
  }

  async updateUsername(address: string, username: string) {
    const response = await this.client.put(`/users/${address}/username`, { username });
    return response.data;
  }

  // Leaderboard endpoints
  async getLeaderboard(limit = 100, offset = 0) {
    const response = await this.client.get('/leaderboard', {
      params: { limit, offset },
    });
    return response.data.leaderboard;
  }

  // Generic HTTP methods (for auth and other endpoints)
  async get(url: string, config?: any) {
    return this.client.get(url, config);
  }

  async post(url: string, data?: any, config?: any) {
    return this.client.post(url, data, config);
  }

  async put(url: string, data?: any, config?: any) {
    return this.client.put(url, data, config);
  }

  async delete(url: string, config?: any) {
    return this.client.delete(url, config);
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
