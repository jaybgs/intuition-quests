import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { 
  fetcher, 
  configureClient,
} from '@0xintuition/graphql';

// Configure GraphQL client for Intuition mainnet
if (typeof window !== 'undefined') {
  try {
    configureClient({
      apiUrl: 'https://mainnet.intuition.sh/v1/graphql',
    });
    console.log('✓ Intuition GraphQL client configured for mainnet');
  } catch (error) {
    console.error('Failed to configure Intuition GraphQL client:', error);
  }
}

// Types for our hook
export interface IntuitionAtom {
  termId: string;
  label: string;
  emoji?: string | null;
  image?: string | null;
  type?: string | null;
  data?: string | null;
  walletId?: string | null;
  createdAt?: string | null;
  blockNumber?: number | null;
  transactionHash?: string | null;
  creator?: {
    id: string;
    label: string;
    image?: string | null;
  } | null;
  value?: {
    person?: { name?: string; description?: string; image?: string; url?: string } | null;
    thing?: { name?: string; description?: string; image?: string; url?: string } | null;
    organization?: { name?: string; description?: string; image?: string; url?: string } | null;
    account?: { id: string; label: string; image?: string } | null;
  } | null;
}

export interface IntuitionTriple {
  termId: string;
  counterTermId?: string | null;
  subjectId?: string | null;
  predicateId?: string | null;
  objectId?: string | null;
  subject: {
    termId: string;
    label: string;
    emoji?: string | null;
    image?: string | null;
    type?: string | null;
    data?: string | null;
  };
  predicate: {
    termId: string;
    label: string;
    emoji?: string | null;
    image?: string | null;
    type?: string | null;
    data?: string | null;
  };
  object: {
    termId: string;
    label: string;
    emoji?: string | null;
    image?: string | null;
    type?: string | null;
    data?: string | null;
  };
  creator?: {
    id: string;
    label: string;
    image?: string | null;
  } | null;
  createdAt?: string | null;
  blockNumber?: number | null;
  transactionHash?: string | null;
  vault?: {
    totalShares?: string | null;
    currentSharePrice?: string | null;
    positionCount?: number | null;
  } | null;
  counterVault?: {
    totalShares?: string | null;
    currentSharePrice?: string | null;
    positionCount?: number | null;
  } | null;
}

// GraphQL Documents - matching the actual schema patterns
const GetAtomsDocument = `
  query GetAtoms($limit: Int, $offset: Int, $orderBy: [atoms_order_by!], $where: atoms_bool_exp) {
    total: atoms_aggregate(where: $where) {
      aggregate {
        count
      }
    }
    atoms(limit: $limit, offset: $offset, order_by: $orderBy, where: $where) {
      term_id
      label
      emoji
      type
      image
      data
      wallet_id
      created_at
      block_number
      transaction_hash
      creator_id
    }
  }
`;

const GetAtomDocument = `
  query GetAtom($id: String!) {
    atom(term_id: $id) {
      term_id
      label
      emoji
      type
      image
      data
      wallet_id
      created_at
      block_number
      transaction_hash
      creator_id
    }
  }
`;

const GetAtomByDataDocument = `
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

const GetAtomsCountDocument = `
  query GetAtomsCount($where: atoms_bool_exp) {
    atoms_aggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`;

const GetTriplesDocument = `
  query GetTriples($limit: Int, $offset: Int, $orderBy: [triples_order_by!], $where: triples_bool_exp) {
    total: triples_aggregate(where: $where) {
      aggregate {
        count
      }
    }
    triples(limit: $limit, offset: $offset, order_by: $orderBy, where: $where) {
      term_id
      counter_term_id
      subject_id
      predicate_id
      object_id
      created_at
      block_number
      transaction_hash
      creator_id
      subject {
        term_id
        label
        emoji
        type
        image
        data
      }
      predicate {
        term_id
        label
        emoji
        type
        image
        data
      }
      object {
        term_id
        label
        emoji
        type
        image
        data
      }
    }
  }
`;

const GetTripleDocument = `
  query GetTriple($tripleId: String!) {
    triple(term_id: $tripleId) {
      term_id
      counter_term_id
      subject_id
      predicate_id
      object_id
      created_at
      block_number
      transaction_hash
      creator_id
      subject {
        term_id
        label
        emoji
        type
        image
        data
      }
      predicate {
        term_id
        label
        emoji
        type
        image
        data
      }
      object {
        term_id
        label
        emoji
        type
        image
        data
      }
    }
  }
`;

const GetTriplesWithPositionsDocument = `
  query GetTriplesWithPositions($limit: Int, $offset: Int, $orderBy: [triples_order_by!], $where: triples_bool_exp, $address: String) {
    total: triples_aggregate(where: $where) {
      aggregate {
        count
      }
    }
    triples(limit: $limit, offset: $offset, order_by: $orderBy, where: $where) {
      term_id
      counter_term_id
      subject {
        term_id
        label
        emoji
        image
      }
      predicate {
        term_id
        label
        emoji
        image
      }
      object {
        term_id
        label
        emoji
        image
      }
      term {
        vaults(where: { curve_id: { _eq: "1" } }) {
          total_shares
          position_count
          current_share_price
          positions(where: { account_id: { _ilike: $address } }) {
            account {
              id
              label
              image
            }
            shares
          }
        }
      }
      counter_term {
        vaults(where: { curve_id: { _eq: "1" } }) {
          total_shares
          position_count
          current_share_price
          positions(where: { account_id: { _ilike: $address } }) {
            account {
              id
              label
              image
            }
            shares
          }
        }
      }
    }
  }
`;

const GetTriplesCountDocument = `
  query GetTriplesCount($where: triples_bool_exp) {
    triples_aggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`;

const GetStakedClaimsCountDocument = `
  query GetStakedClaimsCount($accountId: String!) {
    positions_aggregate(
      where: {
        account_id: { _ilike: $accountId }
        shares: { _gt: "0" }
        vault: {
          term: {
            triple: { term_id: { _is_null: false } }
          }
        }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

const GetStakedClaimsCountAltDocument = `
  query GetStakedClaimsCountAlt($accountId: String!) {
    positions(
      where: {
        account_id: { _ilike: $accountId }
        shares: { _gt: "0" }
      }
      limit: 1000
    ) {
      vault {
        term {
          triple {
            term_id
          }
        }
      }
    }
  }
`;

export function useIntuitionData() {
  const { address } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to execute GraphQL queries
  const executeQuery = async <T>(document: string, variables?: any): Promise<T> => {
    try {
      const response = await fetch('https://mainnet.intuition.sh/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: document,
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
        throw new Error(result.errors[0]?.message || 'GraphQL Error');
      }
      
      return result.data;
    } catch (error) {
      console.error('❌ GraphQL Fetch Error:', error);
      throw error;
    }
  };

  /**
   * Get atoms (identities) with optional filters
   */
  const getAtoms = useCallback(async (options?: {
    limit?: number;
    offset?: number;
    where?: any;
    orderBy?: any;
  }): Promise<{ atoms: IntuitionAtom[]; total: number }> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await executeQuery<any>(GetAtomsDocument, {
        limit: options?.limit || 20,
        offset: options?.offset || 0,
        where: options?.where,
        orderBy: options?.orderBy || [{ created_at: 'desc' }],
      });

      const atoms: IntuitionAtom[] = (result.atoms || []).map((atom: any) => ({
        termId: atom.term_id,
        label: atom.label,
        emoji: atom.emoji,
        image: atom.image,
        type: atom.type,
        data: atom.data,
        walletId: atom.wallet_id,
        createdAt: atom.created_at,
        blockNumber: atom.block_number,
        transactionHash: atom.transaction_hash,
        creator: null, // Creator info not available in schema
        value: null, // Value field not available in schema
      }));

      return {
        atoms,
        total: result.total?.aggregate?.count || 0,
      };
    } catch (err: any) {
      console.error('Error fetching atoms:', err);
      setError(err?.message || 'Failed to fetch atoms');
      return { atoms: [], total: 0 };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get a single atom by term_id
   */
  const getAtomById = useCallback(async (termId: string): Promise<IntuitionAtom | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await executeQuery<any>(GetAtomDocument, { id: termId });

      if (!result.atom) return null;

      const atom = result.atom;
      return {
        termId: atom.term_id,
        label: atom.label,
        emoji: atom.emoji,
        image: atom.image,
        type: atom.type,
        data: atom.data,
        walletId: atom.wallet_id,
        createdAt: atom.created_at,
        blockNumber: atom.block_number,
        transactionHash: atom.transaction_hash,
        creator: null, // Creator info not available in schema
        value: null, // Value field not available in schema
      };
    } catch (err: any) {
      console.error('Error fetching atom:', err);
      setError(err?.message || 'Failed to fetch atom');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get atom by data (e.g., wallet address)
   */
  const getAtomByData = useCallback(async (data: string): Promise<IntuitionAtom | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await executeQuery<any>(GetAtomByDataDocument, { data });

      if (!result.atoms || result.atoms.length === 0) return null;

      const atom = result.atoms[0];
      return {
        termId: atom.term_id,
        label: atom.label,
        emoji: atom.emoji,
        image: atom.image,
        type: atom.type,
        data: atom.data,
        walletId: atom.wallet_id,
        createdAt: atom.created_at,
        blockNumber: atom.block_number,
        creator: null, // Creator info not available in schema
        value: null, // Value field not available in schema
      };
    } catch (err: any) {
      console.error('Error fetching atom by data:', err);
      setError(err?.message || 'Failed to fetch atom by data');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get identity for a wallet address
   */
  const getIdentityByAddress = useCallback(async (walletAddress: string): Promise<IntuitionAtom | null> => {
    const addressLower = walletAddress.toLowerCase();
    
    try {
      // 1) Try searching by data field with multiple formats (how many identities are stored)
      const addressPadded = `0x${addressLower.slice(2).padStart(64, '0')}`;
      const formats = [addressPadded, addressLower];

      for (const format of formats) {
        const result = await getAtomByData(format);
        if (result) {
          console.log('✅ Found identity by data field:', result.termId, 'format:', format);
          return result;
        }
      }

      // 2) Try searching by wallet_id (if set on the atom)
      const walletIdResult = await getAtoms({
        limit: 1,
        where: { 
          wallet_id: { _ilike: addressLower },
        },
        orderBy: [{ created_at: 'desc' }],
      });
      
      if (walletIdResult?.atoms && walletIdResult.atoms.length > 0) {
        console.log('✅ Found identity by wallet_id:', walletIdResult.atoms[0].termId);
        return walletIdResult.atoms[0];
      }
      
      // 3) Finally, try searching for any atom created by this address
      const creatorResult = await getAtoms({
        limit: 1,
        where: { 
          creator_id: { _ilike: addressLower },
        },
        orderBy: [{ created_at: 'desc' }],
      });
      
      if (creatorResult?.atoms && creatorResult.atoms.length > 0) {
        console.log('✅ Found identity by creator_id:', creatorResult.atoms[0].termId);
        return creatorResult.atoms[0];
      }
      
      console.log('ℹ️ No identity found for address:', addressLower);
      return null;
    } catch (err: any) {
      console.error('❌ Error in getIdentityByAddress:', err);
      return null;
    }
  }, [getAtomByData, getAtoms]);

  /**
   * Get triples (claims) with optional filters
   */
  const getTriples = useCallback(async (options?: {
    limit?: number;
    offset?: number;
    where?: any;
    orderBy?: any;
  }): Promise<{ triples: IntuitionTriple[]; total: number }> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await executeQuery<any>(GetTriplesDocument, {
        limit: options?.limit || 20,
        offset: options?.offset || 0,
        where: options?.where,
        orderBy: options?.orderBy || [{ created_at: 'desc' }],
      });

      const triples: IntuitionTriple[] = (result.triples || []).map((triple: any) => ({
        termId: triple.term_id,
        counterTermId: triple.counter_term_id,
        subjectId: triple.subject_id,
        predicateId: triple.predicate_id,
        objectId: triple.object_id,
        subject: {
          termId: triple.subject?.term_id || '',
          label: triple.subject?.label || '',
          emoji: triple.subject?.emoji,
          image: triple.subject?.image,
          type: triple.subject?.type,
          data: triple.subject?.data,
        },
        predicate: {
          termId: triple.predicate?.term_id || '',
          label: triple.predicate?.label || '',
          emoji: triple.predicate?.emoji,
          image: triple.predicate?.image,
          type: triple.predicate?.type,
          data: triple.predicate?.data,
        },
        object: {
          termId: triple.object?.term_id || '',
          label: triple.object?.label || '',
          emoji: triple.object?.emoji,
          image: triple.object?.image,
          type: triple.object?.type,
          data: triple.object?.data,
        },
        creator: null, // Creator info not available in simplified query
        createdAt: triple.created_at,
        blockNumber: triple.block_number,
        transactionHash: triple.transaction_hash,
        vault: null, // Vault info not needed for basic display
        counterVault: null, // Vault info not needed for basic display
      }));

      return {
        triples,
        total: result.total?.aggregate?.count || 0,
      };
    } catch (err: any) {
      console.error('Error fetching triples:', err);
      setError(err?.message || 'Failed to fetch triples');
      return { triples: [], total: 0 };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get a single triple by term_id
   */
  const getTripleById = useCallback(async (termId: string): Promise<IntuitionTriple | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await executeQuery<any>(GetTripleDocument, { tripleId: termId });

      if (!result.triple) return null;

      const triple = result.triple;
      return {
        termId: triple.term_id,
        counterTermId: triple.counter_term_id,
        subjectId: triple.subject_id,
        predicateId: triple.predicate_id,
        objectId: triple.object_id,
        subject: {
          termId: triple.subject?.term_id || '',
          label: triple.subject?.label || '',
          emoji: triple.subject?.emoji,
          image: triple.subject?.image,
          type: triple.subject?.type,
          data: triple.subject?.data,
        },
        predicate: {
          termId: triple.predicate?.term_id || '',
          label: triple.predicate?.label || '',
          emoji: triple.predicate?.emoji,
          image: triple.predicate?.image,
          type: triple.predicate?.type,
          data: triple.predicate?.data,
        },
        object: {
          termId: triple.object?.term_id || '',
          label: triple.object?.label || '',
          emoji: triple.object?.emoji,
          image: triple.object?.image,
          type: triple.object?.type,
          data: triple.object?.data,
        },
        creator: null, // Creator info not available in simplified query
        createdAt: triple.created_at,
        blockNumber: triple.block_number,
        transactionHash: triple.transaction_hash,
        vault: null,
        counterVault: null,
      };
    } catch (err: any) {
      console.error('Error fetching triple:', err);
      setError(err?.message || 'Failed to fetch triple');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get triples with user positions
   */
  const getTriplesWithPositions = useCallback(async (options?: {
    limit?: number;
    offset?: number;
    where?: any;
    orderBy?: any;
    userAddress?: string;
  }): Promise<{ triples: any[]; total: number }> => {
    setIsLoading(true);
    setError(null);
    
    const userAddr = options?.userAddress || address;
    
    try {
      const result = await executeQuery<any>(GetTriplesWithPositionsDocument, {
        limit: options?.limit || 20,
        offset: options?.offset || 0,
        where: options?.where,
        orderBy: options?.orderBy || [{ created_at: 'desc' }],
        address: userAddr?.toLowerCase(),
      });

      return {
        triples: result.triples || [],
        total: result.total?.aggregate?.count || 0,
      };
    } catch (err: any) {
      console.error('Error fetching triples with positions:', err);
      setError(err?.message || 'Failed to fetch triples with positions');
      return { triples: [], total: 0 };
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  /**
   * Get claims by subject (e.g., all claims about a specific identity)
   */
  const getClaimsBySubject = useCallback(async (subjectTermId: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<{ triples: IntuitionTriple[]; total: number }> => {
    return getTriples({
      ...options,
      where: { subject_id: { _eq: subjectTermId } },
    });
  }, [getTriples]);

  /**
   * Get claims by predicate (e.g., all "is a" or "follows" claims)
   */
  const getClaimsByPredicate = useCallback(async (predicateTermId: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<{ triples: IntuitionTriple[]; total: number }> => {
    return getTriples({
      ...options,
      where: { predicate_id: { _eq: predicateTermId } },
    });
  }, [getTriples]);

  /**
   * Get claims by object (e.g., all claims pointing to a specific identity)
   */
  const getClaimsByObject = useCallback(async (objectTermId: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<{ triples: IntuitionTriple[]; total: number }> => {
    return getTriples({
      ...options,
      where: { object_id: { _eq: objectTermId } },
    });
  }, [getTriples]);

  /**
   * Get claims created by a specific address
   */
  const getClaimsByCreator = useCallback(async (creatorAddress: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<{ triples: IntuitionTriple[]; total: number }> => {
    return getTriples({
      ...options,
      where: { creator_id: { _ilike: creatorAddress.toLowerCase() } },
    });
  }, [getTriples]);

  /**
   * Search atoms by label
   */
  const searchAtoms = useCallback(async (searchTerm: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<{ atoms: IntuitionAtom[]; total: number }> => {
    return getAtoms({
      ...options,
      where: { label: { _ilike: `%${searchTerm}%` } },
    });
  }, [getAtoms]);

  /**
   * Get atoms count
   */
  const getAtomsCount = useCallback(async (where?: any): Promise<number> => {
    try {
      const result = await executeQuery<any>(GetAtomsCountDocument, { where });
      return result.atoms_aggregate?.aggregate?.count || 0;
    } catch (err) {
      console.error('Error fetching atoms count:', err);
      return 0;
    }
  }, []);

  /**
   * Get triples count
   */
  const getTriplesCount = useCallback(async (where?: any): Promise<number> => {
    try {
      const result = await executeQuery<any>(GetTriplesCountDocument, { where });
      return result.triples_aggregate?.aggregate?.count || 0;
    } catch (err) {
      console.error('Error fetching triples count:', err);
      return 0;
    }
  }, []);

  /**
   * Get count of claims (triples) associated with a wallet
   * This counts triples created by the wallet and triples where the wallet's identity is the subject
   */
  const getStakedClaimsCount = useCallback(async (walletAddress?: string): Promise<number> => {
    const userAddr = walletAddress || address;
    if (!userAddr) return 0;
    
    try {
      setIsLoading(true);
      const uniqueTriples = new Set<string>();
      
      // 1. Get triples created by this wallet
      try {
        const createdTriples = await getClaimsByCreator(userAddr, { limit: 1000 });
        if (createdTriples?.triples) {
          createdTriples.triples.forEach(triple => {
            if (triple.termId) {
              uniqueTriples.add(triple.termId);
            }
          });
        }
      } catch (error) {
        console.error('Error fetching created triples:', error);
      }
      
      // 2. Get identity atom for this wallet
      let identityAtom: IntuitionAtom | null = null;
      try {
        identityAtom = await getIdentityByAddress(userAddr);
      } catch (error) {
        console.error('Error fetching identity atom:', error);
      }
      
      // 3. Get triples where identity is the subject
      if (identityAtom?.termId) {
        try {
          const subjectTriples = await getTriples({
            limit: 1000,
            where: { subject_id: { _eq: identityAtom.termId } },
          });
          if (subjectTriples?.triples) {
            subjectTriples.triples.forEach(triple => {
              if (triple.termId) {
                uniqueTriples.add(triple.termId);
              }
            });
          }
        } catch (error) {
          console.error('Error fetching subject triples:', error);
        }
      }
      
      const count = uniqueTriples.size;
      console.log(`[getStakedClaimsCount] Found ${count} unique claims for ${userAddr}`);
      return count;
    } catch (err: any) {
      console.error('Error fetching claims count:', err);
      setError(err?.message || 'Failed to fetch claims count');
      return 0;
    } finally {
      setIsLoading(false);
    }
  }, [address, getClaimsByCreator, getIdentityByAddress, getTriples]);

  return {
    // Loading and error state
    isLoading,
    error,
    
    // Atom (identity) methods
    getAtoms,
    getAtomById,
    getAtomByData,
    getIdentityByAddress,
    searchAtoms,
    getAtomsCount,
    
    // Triple (claim) methods
    getTriples,
    getTripleById,
    getTriplesWithPositions,
    getClaimsBySubject,
    getClaimsByPredicate,
    getClaimsByObject,
    getClaimsByCreator,
    getTriplesCount,
    getStakedClaimsCount,
  };
}
