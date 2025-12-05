import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';

export interface OnChainActivity {
  id: string;
  type: 'atom_created' | 'triple_created' | 'deposit' | 'redemption' | 'quest_completed';
  title: string;
  timestamp: Date;
  xp?: number;
  transactionHash?: string;
  termId?: string;
  amount?: string;
}

// Helper to execute GraphQL queries
const executeGraphQLQuery = async (query: string, variables?: any): Promise<any> => {
  try {
    const response = await fetch('https://mainnet.intuition.sh/v1/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      console.error('❌ GraphQL HTTP Error:', response.status, response.statusText);
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.errors) {
      console.error('❌ GraphQL Errors:', result.errors);
      // Don't throw, just log - return empty data instead
      return null;
    }
    
    return result.data;
  } catch (error) {
    console.error('❌ GraphQL Fetch Error:', error);
    return null;
  }
};

export function useUserActivity() {
  const { address } = useAccount();

  // Fetch on-chain activity from Intuition GraphQL API
  const { data: onChainActivity, isLoading: isOnChainLoading } = useQuery({
    queryKey: ['onchain-activity', address],
    queryFn: async () => {
      if (!address) return [];
      
      const addressLower = address.toLowerCase();
      const activities: OnChainActivity[] = [];

      try {
        // Query for positions (deposits/redemptions)
        const positionsQuery = `
          query GetUserPositions($accountId: String!) {
            positions(
              where: { account_id: { _ilike: $accountId } }
              limit: 50
              order_by: { created_at: desc }
            ) {
              id
              created_at
              shares
              transaction_hash
              account {
                id
                label
              }
              vault {
                term {
                  atom {
                    term_id
                    label
                    image
                  }
                  triple {
                    term_id
                    subject {
                      label
                    }
                    predicate {
                      label
                    }
                    object {
                      label
                    }
                  }
                }
              }
            }
          }
        `;

        const positionsResult = await executeGraphQLQuery(positionsQuery, {
          accountId: addressLower,
        });

        if (positionsResult?.positions) {
          console.log('📊 Found positions:', positionsResult.positions.length);
          positionsResult.positions.forEach((position: any) => {
            const term = position.vault?.term;
            const atom = term?.atom;
            const triple = term?.triple;
            
            if (atom) {
              activities.push({
                id: `deposit-${position.id}`,
                type: 'deposit',
                title: `Deposited into ${atom.label || 'Atom'}`,
                timestamp: new Date(position.created_at),
                transactionHash: position.transaction_hash,
                termId: atom.term_id,
                amount: position.shares,
              });
            } else if (triple) {
              activities.push({
                id: `deposit-${position.id}`,
                type: 'deposit',
                title: `Staked on claim: ${triple.subject?.label || 'Subject'} ${triple.predicate?.label || 'Predicate'} ${triple.object?.label || 'Object'}`,
                timestamp: new Date(position.created_at),
                transactionHash: position.transaction_hash,
                termId: triple.term_id,
                amount: position.shares,
              });
            }
          });
        } else {
          console.log('ℹ️ No positions found');
        }

        // Query for atoms created by user
        const atomsQuery = `
          query GetUserAtoms($creatorId: String!) {
            atoms(
              where: { creator_id: { _ilike: $creatorId } }
              limit: 50
              order_by: { created_at: desc }
            ) {
              term_id
              label
              emoji
              type
              created_at
              transaction_hash
            }
          }
        `;

        const atomsResult = await executeGraphQLQuery(atomsQuery, {
          creatorId: addressLower,
        });

        if (atomsResult?.atoms) {
          console.log('📊 Found atoms:', atomsResult.atoms.length);
          atomsResult.atoms.forEach((atom: any) => {
            activities.push({
              id: `atom-${atom.term_id}`,
              type: 'atom_created',
              title: `Created atom: ${atom.label || atom.emoji || 'Untitled'}`,
              timestamp: new Date(atom.created_at),
              transactionHash: atom.transaction_hash,
              termId: atom.term_id,
            });
          });
        } else {
          console.log('ℹ️ No atoms found');
        }

        // Query for triples/claims created by user
        const triplesQuery = `
          query GetUserTriples($creatorId: String!) {
            triples(
              where: { creator_id: { _ilike: $creatorId } }
              limit: 50
              order_by: { created_at: desc }
            ) {
              term_id
              subject {
                label
              }
              predicate {
                label
              }
              object {
                label
              }
              created_at
              transaction_hash
            }
          }
        `;

        const triplesResult = await executeGraphQLQuery(triplesQuery, {
          creatorId: addressLower,
        });

        if (triplesResult?.triples) {
          console.log('📊 Found triples:', triplesResult.triples.length);
          triplesResult.triples.forEach((triple: any) => {
            activities.push({
              id: `triple-${triple.term_id}`,
              type: 'triple_created',
              title: `Created claim: ${triple.subject?.label || 'Subject'} ${triple.predicate?.label || 'Predicate'} ${triple.object?.label || 'Object'}`,
              timestamp: new Date(triple.created_at),
              transactionHash: triple.transaction_hash,
              termId: triple.term_id,
            });
          });
        } else {
          console.log('ℹ️ No triples found');
        }

        console.log('✅ Total on-chain activities:', activities.length);

        // Sort all activities by timestamp (newest first)
        activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        const result = activities.slice(0, 50); // Limit to 50 most recent
        console.log('📋 Returning activities:', result.length);
        return result;
      } catch (error) {
        console.error('❌ Error fetching on-chain activity:', error);
        return [];
      }
    },
    enabled: !!address,
  });

  // Fetch quest completions from backend
  const { data: completions, isLoading: isCompletionsLoading } = useQuery({
    queryKey: ['user-completions', address],
    queryFn: async () => {
      if (!address) return [];
      try {
        const result = await apiClient.getUserCompletions(address, 50);
        console.log('📋 Quest completions:', result?.length || 0);
        return result;
      } catch (error) {
        console.error('❌ Error fetching quest completions:', error);
        return [];
      }
    },
    enabled: !!address,
  });

  // Combine on-chain activity with quest completions
  const questCompletions = (completions || []).map((completion: any) => ({
    id: completion.id || `quest-${completion.questId || Date.now()}`,
    type: 'quest_completed' as const,
    title: `Completed Quest: ${completion.quest?.title || completion.questTitle || 'Unknown'}`,
    timestamp: new Date(completion.completedAt || completion.completed_at || Date.now()),
    xp: completion.xpEarned || completion.xp || 0,
  }));

  const allActivity = [
    ...(onChainActivity || []),
    ...questCompletions,
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  console.log('📊 Total combined activities:', allActivity.length, {
    onChain: onChainActivity?.length || 0,
    questCompletions: questCompletions.length,
  });

  return {
    activity: allActivity,
    isLoading: isOnChainLoading || isCompletionsLoading,
  };
}
