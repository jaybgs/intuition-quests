/**
 * Contract Addresses for TrustQuests on Intuition Chain (Chain ID: 1155)
 *
 * DEPLOYED: Dec 8, 2025 - No FeeWrapper, direct payments only
 * UPDATED: Jan 19, 2026 - New ClaimIQ contract with IQ-only quest support
 */

// Intuition Protocol MultiVault Address (official mainnet)
export const MULTIVAULT_ADDRESS = '0x6E35cF57A41fA15eA0EaE9C33e751b01A784Fe7e' as const;

// Wallet addresses
export const RELAYER_WALLET = '0xB90A9fbBCBa1A59c5Ba376649E7C1460BB9353B2' as const;
export const ADMIN_ADDRESS = '0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07' as const;

// Contract addresses - DEPLOYED TO INTUITION CHAIN (Dec 8, 2025)
// NOTE: Atom creation now uses Intuition SDK directly for better compatibility
// Trust Quests Payment now accepts native TRUST tokens (not ERC20)
export const CONTRACT_ADDRESSES = {
  // Contract 1: Space Identity Creation
  // NOW USES SDK DIRECTLY - Custom contract had MultiVault compatibility issues
  SPACE_IDENTITY_FACTORY: '0x0000000000000000000000000000000000000000' as `0x${string}`,

  // Contract 2: PublishQuests - NEW CONTRACT
  // Standardizes atom creation with unique naming format
  PUBLISH_QUESTS: '0x9aD94f90588bBB82C11EE1518B291b5b6ceAEf02' as `0x${string}`,

  // Contract 3: Quest Escrow - NEW DEPLOYMENT Jan 22, 2026
  // Holds deposited rewards until quest ends, then distributes to winners
  QUEST_ESCROW: '0xeD01f2340e55f081bD572572F1a883276b11827b' as `0x${string}`,

  // Contract 4: Claim IQ - UPDATED Jan 28, 2026
  // Secured with ReentrancyGuard + Checks-Effects-Interactions
  CLAIM_IQ: '0x240A2a6a11704618F20b0807099738acEfe462D9' as `0x${string}`,

  // Trust Quests Payment - PRO SUBSCRIPTION (Native TRUST tokens)
  // Updated: Dec 31, 2025 - Added reset functions for testing
  TRUST_QUESTS_PAYMENT: '0x57CE7B8051e9684C21955178C56b6eCDAcb5Dfb4' as `0x${string}`,
} as const;

// Check if contracts are deployed (not zero address)
export function isContractDeployed(address: `0x${string}`): boolean {
  return address !== '0x0000000000000000000000000000000000000000';
}
