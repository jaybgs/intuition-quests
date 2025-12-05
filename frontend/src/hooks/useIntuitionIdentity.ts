import { useState } from 'react';
import { useAccount, usePublicClient, useWalletClient, useChainId } from 'wagmi';
import { createAtomFromThing } from '@0xintuition/sdk';
import { getMultiVaultAddressFromChainId } from '@0xintuition/protocol';
import { toHex, getAddress } from 'viem';
import { 
  fetcher, 
  configureClient,
} from '@0xintuition/graphql';
import { showToast } from '../components/Toast';
import type { PinThingMutationVariables } from '@0xintuition/graphql';

// Configure GraphQL client to use mainnet endpoint
// According to migration guide: https://intuition.box/docs/tutorial-migration/guide-migration-graphql-v2-en
// Call this once at module load time
if (typeof window !== 'undefined') {
  try {
    configureClient({
      apiUrl: 'https://mainnet.intuition.sh/v1/graphql',
    });
    console.log('✓ GraphQL client configured for mainnet');
  } catch (error) {
    console.error('Failed to configure GraphQL client:', error);
  }
}

// Track verification attempts per address
const verificationAttempts = new Map<string, number>();
const MAX_AUTO_ATTEMPTS = 5;

export function useIntuitionIdentity() {
  const { address } = useAccount();
  const publicClientResult = usePublicClient() as any;
  const walletClientResult = useWalletClient() as any;
  const publicClient = publicClientResult?.data;
  const walletClient = walletClientResult?.data;
  const chainId = useChainId();
  const [isCreating, setIsCreating] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  const createIdentity = async (profileData: {
    name: string;
    description?: string;
    image?: string;
    url?: string;
  }): Promise<{ atomId: string; transactionHash: string } | null> => {
    if (!address || !publicClient || !walletClient) {
      showToast('Please connect your wallet to create an identity', 'warning');
      return null;
    }

    setIsCreating(true);

    try {
      const multiVaultAddress = getMultiVaultAddressFromChainId(chainId);

      // Prepare the thing data for pinning
      const thingData: PinThingMutationVariables = {
        name: profileData.name,
        description: profileData.description || `Profile for ${address}`,
        image: profileData.image,
        url: profileData.url || `https://explorer.intuition.systems/address/${address}`,
      };

      // Create atom on Intuition chain
      const result = await createAtomFromThing(
        {
          address: multiVaultAddress,
          walletClient,
          publicClient,
        },
        thingData,
        0n // No additional deposit for now
      );

      if (!result || !result.state?.termId) {
        throw new Error('Failed to create identity atom');
      }

      // Store the atom ID locally for quick access
      // termId is a Hex string, we'll store it as-is
      const atomId = result.state.termId as string;
      if (address && atomId) {
        localStorage.setItem(`intuition_identity_${address.toLowerCase()}`, atomId);
        localStorage.setItem(`intuition_identity_uri_${address.toLowerCase()}`, result.uri);
      }

      showToast('Identity created successfully on Intuition chain!', 'success');
      
      return {
        atomId: result.state.termId as string,
        transactionHash: result.transactionHash,
      };
    } catch (error: any) {
      console.error('Error creating identity:', error);
      showToast(
        error?.message || 'Failed to create identity. Please try again.',
        'error'
      );
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  const getIdentityAtomId = (userAddress?: string): string | null => {
    const addr = userAddress || address;
    if (!addr) return null;
    
    const stored = localStorage.getItem(`intuition_identity_${addr.toLowerCase()}`);
    return stored;
  };

  // Fetch identity from on-chain by querying Intuition mainnet directly
  // Following migration guide: https://intuition.box/docs/tutorial-migration/guide-migration-graphql-v2-en
  const fetchIdentityFromChain = async (userAddress?: string, incrementAttempt: boolean = true): Promise<string | null> => {
    const addr = userAddress || address;
    if (!addr) return null;
    
    // Don't block if already fetching - just log it
    if (isFetching) {
      console.log('⚠️ Already fetching, but continuing...');
    }

    setIsFetching(true);
    
    try {
      const addrLower = getAddress(addr.toLowerCase() as `0x${string}`).toLowerCase();
      
      // According to migration guide, GraphQL v2 expects String format
      // Try multiple formats that the Intuition portal might use for storing addresses:
      // 1. Padded to 32 bytes (most common for Ethereum addresses in atoms) - hex format
      const addressPadded = `0x${addrLower.slice(2).padStart(64, '0')}`;
      // 2. Direct hex conversion (already in hex format)
      const addressHex = toHex(addrLower as `0x${string}`);
      // 3. Address as-is (lowercase hex)
      const addressAsIs = addrLower;
      
      console.log('🔍 GraphQL Query: GetAtomByData');
      console.log('📊 Variables (address):', addrLower);
      console.log('🔍 Querying Intuition mainnet for identity...');
      console.log('🔍 Trying multiple address formats...');
      
      // Custom query without creator field (which doesn't exist in schema)
      const GetAtomByDataQuery = `
        query GetAtomByData($data: String!) {
          atoms(where: { data: { _eq: $data } }) {
            term_id
            label
            emoji
            type
            image
            data
            wallet_id
            created_at
            block_number
            creator_id
          }
        }
      `;
      
      // Try each format - migration guide recommends trying multiple formats
      const formats = [
        { name: 'padded-32bytes-hex', data: addressPadded },
        { name: 'hex-direct', data: addressHex },
        { name: 'address-lowercase', data: addressAsIs },
        { name: 'padded-lowercase', data: addressPadded.toLowerCase() },
      ];

      for (const format of formats) {
        try {
          console.log(`  🔍 Trying format: ${format.name}`);
          console.log(`  📊 Data value: ${format.data}`);
          
          // Use custom query that matches the actual schema
          const response = await fetch('https://mainnet.intuition.sh/v1/graphql', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: GetAtomByDataQuery,
              variables: {
                data: format.data,
              },
            }),
          });

          const result = await response.json();
          
          if (result.errors) {
            throw new Error(result.errors[0]?.message || 'GraphQL Error');
          }
          
          const queryResult = result.data;

          console.log('📡 Response received:', queryResult);

          if (queryResult?.atoms && queryResult.atoms.length > 0) {
            // Find the first matching atom (should be unique for address-based atoms)
            const atom = queryResult.atoms[0];
            // v2 uses term_id instead of id
            const atomId = atom.term_id;
            
            if (atomId) {
              // Store in localStorage for future use
              localStorage.setItem(`intuition_identity_${addrLower}`, atomId);
              if (atom.data) {
                localStorage.setItem(`intuition_identity_uri_${addrLower}`, atom.data);
              }
              console.log(`✓ Found identity on Intuition mainnet (format: ${format.name})`);
              console.log(`✓ Atom term_id: ${atomId}`);
              return atomId;
            }
          } else {
            console.log(`  ℹ️ No atoms found for format: ${format.name}`);
          }
        } catch (formatError: any) {
          // Log error details as per migration guide debug method
          console.error(`  ❌ Format ${format.name} failed:`, formatError);
          console.error(`  ❌ Error message:`, formatError?.message);
          console.error(`  ❌ Error details:`, formatError);
          // Continue to next format if this one fails
          continue;
        }
      }

      console.log('ℹ️ No identity found on Intuition mainnet for address:', addrLower);
      console.log('ℹ️ Tried formats:', formats.map(f => f.name).join(', '));
      return null;
    } catch (error: any) {
      // Enhanced error logging as per migration guide
      console.error('❌ Error fetching identity from Intuition mainnet:', error);
      console.error('❌ Error message:', error?.message);
      console.error('❌ Error stack:', error?.stack);
      if (error?.response) {
        console.error('❌ GraphQL response error:', error.response);
      }
      return null;
    } finally {
      setIsFetching(false);
    }
  };

  // Get identity atom ID, checking both localStorage and on-chain
  const getIdentityAtomIdAsync = async (userAddress?: string, incrementAttempt: boolean = true): Promise<string | null> => {
    const addr = userAddress || address;
    if (!addr) return null;
    
    // First check localStorage (fast)
    const stored = localStorage.getItem(`intuition_identity_${addr.toLowerCase()}`);
    if (stored) {
      // Reset attempts if identity found
      verificationAttempts.delete(addr.toLowerCase());
      return stored;
    }

    // If not found, try fetching from chain
    return await fetchIdentityFromChain(addr, incrementAttempt);
  };

  // Reset verification attempts for an address
  const resetVerificationAttempts = (userAddress?: string) => {
    const addr = userAddress || address;
    if (addr) {
      verificationAttempts.delete(addr.toLowerCase());
    }
  };

  // Get current attempt count
  const getVerificationAttempts = (userAddress?: string): number => {
    const addr = userAddress || address;
    if (!addr) return 0;
    return verificationAttempts.get(addr.toLowerCase()) || 0;
  };

  // Check if verification should be manual (exceeded max attempts)
  const shouldShowManualVerify = (userAddress?: string): boolean => {
    const addr = userAddress || address;
    if (!addr) return false;
    const attempts = verificationAttempts.get(addr.toLowerCase()) || 0;
    return attempts >= MAX_AUTO_ATTEMPTS;
  };

  const hasIdentity = (userAddress?: string): boolean => {
    return !!getIdentityAtomId(userAddress);
  };

  // Async version that checks on-chain
  const hasIdentityAsync = async (userAddress?: string): Promise<boolean> => {
    const atomId = await getIdentityAtomIdAsync(userAddress);
    return !!atomId;
  };

  return {
    createIdentity,
    getIdentityAtomId,
    getIdentityAtomIdAsync,
    hasIdentity,
    hasIdentityAsync,
    fetchIdentityFromChain,
    resetVerificationAttempts,
    getVerificationAttempts,
    shouldShowManualVerify,
    isCreating,
    isFetching,
  };
}
