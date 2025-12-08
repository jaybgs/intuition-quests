/**
 * Contract Addresses for TrustQuests on Intuition Chain (Chain ID: 1155)
 * 
 * DEPLOYED: Dec 8, 2025 - No FeeWrapper, direct payments only
 * REDEPLOYED: Clean source code deployment
 */

// Intuition Protocol MultiVault Address (official mainnet)
export const MULTIVAULT_ADDRESS = '0x6E35cF57A41fA15eA0EaE9C33e751b01A784Fe7e' as const;

// Wallet addresses
export const RELAYER_WALLET = '0xB90A9fbBCBa1A59c5Ba376649E7C1460BB9353B2' as const;
export const ADMIN_ADDRESS = '0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07' as const;

// Contract addresses - DEPLOYED TO INTUITION CHAIN (Dec 8, 2025)
// NOTE: Atom creation now uses Intuition SDK directly for better compatibility
export const CONTRACT_ADDRESSES = {
  // Contract 1: Space Identity Creation
  // NOW USES SDK DIRECTLY - Custom contract had MultiVault compatibility issues
  SPACE_IDENTITY_FACTORY: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  
  // Contract 2: Quest Atom Creation
  // NOW USES SDK DIRECTLY - Custom contract had MultiVault compatibility issues
  QUEST_ATOM_FACTORY: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  
  // Contract 3: Quest Escrow - WORKING!
  // Holds deposited rewards until quest ends, then releases to relayer
  QUEST_ESCROW: '0x50a94545cd51481e753ecFb8638dA80763bd1C30' as `0x${string}`,
  
  // Contract 4: Claim IQ
  // NOW USES SDK DIRECTLY - Creates completion triples via SDK
  CLAIM_IQ: '0x0000000000000000000000000000000000000000' as `0x${string}`,
} as const;

// Check if contracts are deployed (not zero address)
export function isContractDeployed(address: `0x${string}`): boolean {
  return address !== '0x0000000000000000000000000000000000000000';
}
