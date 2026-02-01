
import { supabase } from '../config/supabase.js';

export class AnalyticsService {
    async getBuilderAnalytics(creatorAddress: string) {
        try {
            // 1. Time Series Data (last 30 days)
            const { data: timeSeries, error: timeSeriesError } = await supabase
                .rpc('get_builder_time_series', {
                    p_creator_address: creatorAddress,
                    p_days: 30
                });

            // If RPC doesn't exist (yet), fall back to raw query or multiple queries
            // Since we can't easily create RPCs without migrations, we will use raw queries if possible
            // or client-side aggregation on the server (better than client-side on browser)

            // Actually, standard Supabase client doesn't support raw SQL easily without RPC.
            // So we must rely on joined queries or create an RPC.
            // Since I can create migrations, I SHOULD create an RPC function for performance.

            // But let's verify if we can just query the views directly.
            // We can query user_quests joined with published_quests.

            // Let's implement efficiently using standard Supabase `.from()` with modifiers if possible, 
            // but grouping by date is hard without RPC.

            // Alternative: Fetch all completions for this creator (server-side is faster than browser)
            // and aggregate in Node.js.

            const { data: completions, error: fetchError } = await supabase
                .from('user_quests')
                .select(`
          completed_at,
          iq_earned,
          wallet_address,
          quest_id,
          published_quests!inner (
            creator_address
          )
        `)
                .ilike('published_quests.creator_address', creatorAddress || '');
            // Removed strict date filter to return all historical data
            //.gte('completed_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

            if (fetchError) throw fetchError;

            // Aggregate Time Series in Node
            const timeSeriesMap = new Map<string, { participants: Set<string>, completions: number }>();
            const topParticipantsMap = new Map<string, { completions: number, totalRewards: number }>();

            completions?.forEach((c: any) => {
                const date = new Date(c.completed_at).toISOString().split('T')[0];

                // Time Series
                if (!timeSeriesMap.has(date)) {
                    timeSeriesMap.set(date, { participants: new Set(), completions: 0 });
                }
                const entry = timeSeriesMap.get(date)!;
                entry.completions++;
                entry.participants.add(c.wallet_address);

                // Top Participants
                const addr = c.wallet_address;
                if (!topParticipantsMap.has(addr)) {
                    topParticipantsMap.set(addr, { completions: 0, totalRewards: 0 });
                }
                const pEntry = topParticipantsMap.get(addr)!;
                pEntry.completions++;
                pEntry.totalRewards += (c.iq_earned || 0); // Using IQ as reward proxy for now
            });

            // Convert to arrays
            const timeSeriesData = Array.from(timeSeriesMap.entries())
                .map(([date, data]) => ({
                    date,
                    participants: data.participants.size,
                    completions: data.completions,
                    timestamp: new Date(date).getTime()
                }))
                .sort((a, b) => a.timestamp - b.timestamp);

            const topParticipants = Array.from(topParticipantsMap.entries())
                .map(([address, data]) => ({
                    address,
                    completions: data.completions,
                    totalRewards: data.totalRewards
                }))
                .sort((a, b) => b.completions - a.completions)
                .slice(0, 10);

            return {
                timeSeriesData,
                topParticipants
            };

        } catch (error) {
            console.error('Error fetching builder analytics:', error);
            throw error;
        }
    }
}
