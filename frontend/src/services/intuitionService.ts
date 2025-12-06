import {
  getMultiVaultAddressFromChainId,
  intuitionMainnet,
} from '../utils/intuitionProtocol';
import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  formatEther,
} from 'viem';
import type { IntuitionClaim } from '../types';
import { fetcher, configureClient } from '@0xintuition/graphql';
import { intuitionChain } from '../config/wagmi';

// Configure GraphQL client for mainnet
if (typeof window !== 'undefined') {
  try {
    configureClient({
      apiUrl: 'https://mainnet.intuition.sh/v1/graphql',
    });
  } catch (error) {
    console.error('Failed to configure GraphQL client:', error);
  }
}

export class IntuitionService {
  private publicClient;
  private vaultAddress: Address;

  constructor() {
    // Use the correct chain ID (1155 for Intuition mainnet)
    this.vaultAddress = getMultiVaultAddressFromChainId(1155);
    this.publicClient = createPublicClient({
      chain: intuitionChain,
      transport: http('https://rpc.intuition.systems/http'),
    });
  }

  async createUserAtom(userAddress: Address): Promise<string> {
    // Create an atom for the user if it doesn't exist
    // In a real implementation, this would call the Intuition protocol
    // For now, we'll generate a deterministic atom ID
    const atomId = `atom_${userAddress.toLowerCase()}`;
    return atomId;
  }

  async createQuestClaim(
    userAtomId: string,
    questId: string,
    xpAmount: number
  ): Promise<string> {
    // Create a triple (claim) that user completed quest
    // Format: (userAtom, completedQuest, questId)
    // In production, this would create an actual triple on the Intuition network
    const tripleId = `triple_${userAtomId}_${questId}_${Date.now()}`;
    
    // TODO: Implement actual triple creation using Intuition SDK
    // await this.publicClient.writeContract({...})
    
    return tripleId;
  }

  async getUserClaims(userAddress: Address): Promise<IntuitionClaim[]> {
    // Query the knowledge graph for all claims by user
    // This would query triples where user is the subject
    // For now, return empty array - implement with actual graph queries
    return [];
  }

  async verifyClaim(tripleId: string): Promise<boolean> {
    // Verify a claim exists on the knowledge graph
    // TODO: Query Intuition network to verify triple exists
    return true;
  }

  async getVaultAddress(): Promise<Address> {
    return this.vaultAddress;
  }

  /**
   * Verify if a wallet has staked on any claim on the Intuition chain
   * This checks if the user has any staked shares in the MultiVault for any claims (triples)
   * 
   * Implementation notes:
   * - First attempts to query GraphQL for signals (staking activities) where user is the staker
   * - Falls back to checking MultiVault contract for shares on user's identity atom
   * - May need adjustment based on actual GraphQL schema and MultiVault contract ABI
   */
  async verifyStakedOnClaim(userAddress: Address): Promise<boolean> {
    try {
      console.log('🔍 Verifying staking on claim for address:', userAddress);
      
      // Method 1: Try to query via GraphQL for signals (staking activities)
      // According to Intuition docs, signals represent staking activities
      try {
        // TODO: Adjust this query based on actual GraphQL schema from @0xintuition/graphql
        // The query structure may vary - check the GraphQL schema documentation
        // Example query structure (may need adjustment):
        const signalQuery = `
          query GetUserStakingSignals($stakerAddress: String!) {
            signals(
              where: { 
                staker: { id: $stakerAddress }
              }
              first: 1
            ) {
              id
              amount
              timestamp
              claim {
                id
                term_id
              }
            }
          }
        `;

        // Note: You'll need to create a GraphQL document using @0xintuition/graphql
        // similar to how GetAtomByDataDocument is used in useIntuitionIdentity.ts
        // For now, we'll use contract-based verification as the primary method
        
        console.log('ℹ️ GraphQL query for staking signals - implementation needed');
        console.log('ℹ️ See useIntuitionIdentity.ts for example of GraphQL query usage');
      } catch (graphqlError) {
        console.log('ℹ️ GraphQL query not available yet, using contract-based verification');
      }

      // Method 2: Query MultiVault contract for user's shares on claims
      // Check if user has staked on their identity atom (common pattern)
      try {
        // MultiVault contract ABI for checking shares balance
        // Note: The exact function name and parameters may vary - adjust based on actual contract
        const MULTIVAULT_ABI = [
          {
            type: 'function',
            name: 'balanceOf',
            stateMutability: 'view',
            inputs: [
              { name: 'account', type: 'address' },
              { name: 'termId', type: 'bytes32' }
            ],
            outputs: [{ type: 'uint256' }],
          },
        ] as const;

        // Check if user has staked on their identity atom
        const userAtomId = localStorage.getItem(`intuition_identity_${userAddress.toLowerCase()}`);
        
        if (userAtomId) {
          try {
            // Convert atomId to termId format
            const termId: `0x${string}` = userAtomId.startsWith('0x') 
              ? (userAtomId.length === 66 ? userAtomId as `0x${string}` : `0x${userAtomId.slice(2).padStart(64, '0')}` as `0x${string}`)
              : (`0x${userAtomId.padStart(64, '0')}` as `0x${string}`);
            
            // Query balance for this specific claim
            const balance = await this.publicClient.readContract({
              address: this.vaultAddress as `0x${string}`,
              abi: MULTIVAULT_ABI,
              functionName: 'balanceOf',
              args: [userAddress as `0x${string}`, termId],
            }) as bigint;

            if (balance > 0n) {
              console.log('✓ User has staked on claim (identity atom):', formatEther(balance), 'TRUST');
              return true;
            }
          } catch (balanceError: any) {
            console.log('ℹ️ Could not check balance for identity atom:', balanceError?.message || balanceError);
            // Contract function might have different signature, continue to next method
          }
        }

        // TODO: For comprehensive verification, you should also:
        // 1. Query GraphQL for all signals where user is staker
        // 2. Or query all claims (triples) associated with user and check each one
        // 3. The GraphQL approach is more efficient for checking all claims at once
        
        console.warn('⚠️ Staking verification: Only checking identity atom stake');
        console.warn('⚠️ For full verification, implement GraphQL query for all user signals');
        
        return false;
        
      } catch (contractError) {
        console.error('❌ Error querying MultiVault contract:', contractError);
        return false;
      }
    } catch (error) {
      console.error('❌ Error verifying staking on claim:', error);
      return false;
    }
  }

  /**
   * Alternative: Verify if user has staked on a specific claim
   */
  async verifyStakedOnSpecificClaim(userAddress: Address, claimId: string): Promise<boolean> {
    try {
      const MULTIVAULT_ABI = [
        {
          type: 'function',
          name: 'balanceOf',
          stateMutability: 'view',
          inputs: [
            { name: 'account', type: 'address' },
            { name: 'termId', type: 'bytes32' }
          ],
          outputs: [{ type: 'uint256' }],
        },
      ] as const;

      const termId: `0x${string}` = claimId.startsWith('0x') 
        ? (claimId.length === 66 ? claimId as `0x${string}` : `0x${claimId.slice(2).padStart(64, '0')}` as `0x${string}`)
        : (`0x${claimId.padStart(64, '0')}` as `0x${string}`);
      
      const balance = await this.publicClient.readContract({
        address: this.vaultAddress as `0x${string}`,
        abi: MULTIVAULT_ABI,
        functionName: 'balanceOf',
        args: [userAddress as `0x${string}`, termId],
      }) as bigint;

      return balance > 0n;
    } catch (error) {
      console.error('Error verifying staking on specific claim:', error);
      return false;
    }
  }
}

