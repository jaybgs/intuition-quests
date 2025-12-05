import { useAccount, useReadContract, usePublicClient } from 'wagmi';
import { TRUST_TOKEN_ADDRESS } from '../App';
import { formatUnits, createPublicClient, http } from 'viem';
import { useState, useEffect, useRef } from 'react';
import { intuitionChain } from '../config/wagmi';

// ERC-20 ABI for balanceOf and decimals functions (wagmi v2 format)
const ERC20_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
] as const;

export function useTrustBalance() {
  const { address, isConnected, chainId } = useAccount();
  const publicClient = usePublicClient();

  // Check if connected to Intuition chain (1155 = mainnet, 13579 = testnet)
  const isCorrectChain = chainId === 1155 || chainId === 13579;

  // Create a direct public client for Intuition chain - always use this for reliability
  const directClient = createPublicClient({
    chain: intuitionChain,
    transport: http('https://rpc.intuition.systems'),
  });

  // Try to get native TRUST balance (if TRUST is the native token like ETH)
  const [nativeBalance, setNativeBalance] = useState<number | null>(null);
  const [isLoadingNative, setIsLoadingNative] = useState(false);
  const lastLoggedBalance = useRef<number | null>(null);
  const hasLoggedOnce = useRef<boolean>(false);
  const lastLoggedAddress = useRef<string | null>(null);

  // Read token balance from blockchain (try wagmi first if on correct chain)
  const { 
    data: balanceRaw, 
    isLoading: isLoadingBalance,
    error: balanceError 
  } = useReadContract({
    address: TRUST_TOKEN_ADDRESS as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address as `0x${string}`] : undefined,
    chainId: 1155,
    query: {
      enabled: isConnected && !!address && isCorrectChain,
      refetchInterval: 30000, // Refetch every 30 seconds
      retry: 1, // Only retry once
    },
  });

  // Read token decimals (default to 18 if not available)
  const { 
    data: decimals,
    error: decimalsError 
  } = useReadContract({
    address: TRUST_TOKEN_ADDRESS as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'decimals',
    chainId: 1155,
    query: {
      enabled: isConnected && !!address && isCorrectChain,
      retry: 1, // Only retry once
    },
  });

  // Fallback: Try direct RPC call if wagmi fails
  const [fallbackBalance, setFallbackBalance] = useState<number | null>(null);
  const [fallbackDecimals, setFallbackDecimals] = useState<number>(18);
  const [contractNotFound, setContractNotFound] = useState(false);
  const [contractNotDeployed, setContractNotDeployed] = useState(false);
  const [hasLoggedError, setHasLoggedError] = useState(false);

  // Fetch native TRUST balance using direct RPC (always connects to Intuition chain)
  // This works regardless of which chain the wallet is connected to
  useEffect(() => {
    // Reset logging refs when address changes
    if (lastLoggedAddress.current !== address) {
    lastLoggedBalance.current = null;
      hasLoggedOnce.current = false;
      lastLoggedAddress.current = address || null;
    }
    
    let interval: NodeJS.Timeout;
    if (isConnected && address) {
      const fetchNativeBalance = async () => {
        try {
          setIsLoadingNative(true);
          // Use directClient to always fetch from Intuition chain (1155)
          const balance = await directClient.getBalance({ address: address as `0x${string}` });
          const formattedBalance = parseFloat(formatUnits(balance, 18)); // Native tokens use 18 decimals
          setNativeBalance(formattedBalance);
          setIsLoadingNative(false);
          // Only log on first fetch for this address or when balance changes significantly (>0.1 TRUST)
          const shouldLog = !hasLoggedOnce.current || 
            (lastLoggedBalance.current !== null && 
             Math.abs(formattedBalance - (lastLoggedBalance.current || 0)) > 0.1);
          
          if (shouldLog) {
          console.log('✓ Native TRUST balance fetched:', formattedBalance, 'TRUST');
            lastLoggedBalance.current = formattedBalance;
            hasLoggedOnce.current = true;
          } else {
            // Update the ref even if we don't log, to track the current balance
            lastLoggedBalance.current = formattedBalance;
          }
        } catch (error) {
          setIsLoadingNative(false);
          // Silently fail - don't log every error
        }
      };
      fetchNativeBalance();
      // Set up periodic refetch every 30 seconds (silent updates)
      interval = setInterval(fetchNativeBalance, 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isConnected, address, directClient]);

  // Always try to fetch balance using direct RPC (works regardless of connected chain)
  useEffect(() => {
    // Reset logging when address changes
    if (lastLoggedAddress.current !== address) {
      lastLoggedBalance.current = null;
      hasLoggedOnce.current = false;
      lastLoggedAddress.current = address || null;
    }
    
    if (address) {
      // Try direct RPC call - this works even if wallet is on wrong chain
      const fetchDirect = async () => {
        try {
          const contractAddress = TRUST_TOKEN_ADDRESS as `0x${string}`;
          const userAddress = address as `0x${string}`;

          // Try to read balanceOf directly first (some contracts might not have bytecode check working)
          let tokenDecimals = 18;
          let balanceRead = false;

          // Try to read decimals first
          try {
            const decimalsResult = await directClient.readContract({
              address: contractAddress,
              abi: ERC20_ABI,
              functionName: 'decimals',
            });
            tokenDecimals = Number(decimalsResult);
            setFallbackDecimals(tokenDecimals);
            balanceRead = true;
          } catch (e) {
            // If decimals fails, try balanceOf anyway with default 18 decimals
            // Silently fail
          }

          // Try to read balanceOf
          try {
            const balance = await directClient.readContract({
              address: contractAddress,
              abi: ERC20_ABI,
              functionName: 'balanceOf',
              args: [userAddress],
            });

            const formattedBalance = parseFloat(formatUnits(balance as bigint, tokenDecimals));
            setFallbackBalance(formattedBalance);
            setContractNotFound(false);
            setContractNotDeployed(false);
            balanceRead = true;
            // Only log on first fetch for this address or when balance changes significantly (>0.1 TRUST)
            const shouldLog = !hasLoggedOnce.current || 
              (lastLoggedBalance.current !== null && 
               Math.abs(formattedBalance - (lastLoggedBalance.current || 0)) > 0.1);
            if (shouldLog) {
            console.log('✓ Trust balance fetched:', formattedBalance, 'TRUST');
              lastLoggedBalance.current = formattedBalance;
              hasLoggedOnce.current = true;
            } else {
              // Update the ref even if we don't log, to track the current balance
              lastLoggedBalance.current = formattedBalance;
            }
          } catch (error: any) {
            // If both fail, check if it's because contract doesn't exist
            if (!balanceRead) {
              // Double-check with bytecode
              try {
                const code = await directClient.getBytecode({ address: contractAddress });
                if (!code || code === '0x') {
                  setContractNotFound(true);
                  setContractNotDeployed(true);
                  if (!hasLoggedError) {
                    console.log('ℹ️ Trust Token Contract Not Deployed Yet');
                    console.log('Address:', contractAddress);
                    console.log('Chain ID: 1155 (Intuition)');
                    console.log('This is expected if the contract hasn\'t been deployed yet.');
                    console.log('Once deployed, the balance will automatically appear.');
                    setHasLoggedError(true);
                  }
                } else {
                  // Contract exists but function call failed - might be different ABI
                  setContractNotDeployed(false);
                  console.warn('Contract found but balanceOf call failed. Contract might use different ABI.');
                }
              } catch (bytecodeError) {
                setContractNotFound(true);
                setContractNotDeployed(true);
              }
            }
          }
        } catch (error) {
          console.error('Error fetching trust balance:', error);
        }
      };

      // Always try direct fetch if we have an address, regardless of wagmi status
      // This ensures balance shows even if wallet is on wrong chain
      fetchDirect();
      
      // Set up periodic refetch every 30 seconds (reduced logging)
      const interval = setInterval(() => {
        fetchDirect();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [address, balanceError, decimalsError, balanceRaw, isLoadingBalance, directClient, hasLoggedError]);

  // Convert balance from wei to human-readable format
  // Priority: wagmi balance > fallback balance > native balance
  let balance = 0;
  if (balanceRaw && decimals) {
    try {
      balance = parseFloat(formatUnits(balanceRaw as bigint, decimals as number));
    } catch (error) {
      console.error('Error formatting balance:', error);
      // Fall through to use fallback
      if (fallbackBalance !== null) {
        balance = fallbackBalance;
      } else if (nativeBalance !== null) {
        balance = nativeBalance;
      }
    }
  } else if (fallbackBalance !== null) {
    balance = fallbackBalance;
  } else if (nativeBalance !== null) {
    // Use native balance if ERC-20 contract doesn't exist
    balance = nativeBalance;
  }

  // Use fallback decimals if available
  const finalDecimals = decimals ? Number(decimals) : fallbackDecimals;

  // Determine if we're using native balance or contract balance
  const isUsingNativeBalance = (balanceRaw === undefined || balanceRaw === null) && 
                                (fallbackBalance === null) && 
                                (nativeBalance !== null);

  // Determine loading state - include fallback loading
  const isLoading = isLoadingBalance || isLoadingNative || (address && fallbackBalance === null && !contractNotFound && !contractNotDeployed);

  return {
    balance,
    isLoading,
    error: balanceError || decimalsError,
    isConnected,
    isCorrectChain,
    contractNotFound, // Indicates if contract doesn't exist at address
    contractNotDeployed, // Indicates if contract hasn't been deployed yet
    isUsingNativeBalance, // Indicates if we're using native TRUST balance
  };
}

