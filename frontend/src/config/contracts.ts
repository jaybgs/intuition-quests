import { type Address } from "viem";

/**
 * Smart contract addresses on Intuition Network (Chain ID: 1155)
 */
export const CONTRACT_ADDRESSES: Record<string, Address> = {
  // MultiVault contract on Intuition Mainnet
  MULTIVAULT: "0x6E35cF57A41fA15eA0EaE9C33e751b01A784Fe7e" as Address,
  
  // TransactionWrapper contract (deployed on Intuition Mainnet - updated with new fee model)
  TRANSACTION_WRAPPER: (import.meta.env.VITE_TRANSACTION_WRAPPER_ADDRESS || 
    "0x114cd8A832303d14b87Dd1658a482003a0722ACB") as Address,
  
  // Revenue wallet address (receives 30% dApp fee on top of base gas fees)
  FEE_RECIPIENT: "0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07" as Address,
  REVENUE_WALLET: "0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07" as Address,
  
  // QuestClaimSurcharge contract (deployed on Intuition Mainnet)
  QUEST_CLAIM_SURCHARGE: (import.meta.env.VITE_QUEST_CLAIM_SURCHARGE_ADDRESS ||
    "0x0000000000000000000000000000000000000000") as Address,
  
  // QuestEscrow contract (deployed on Intuition Mainnet)
  QUEST_ESCROW: (import.meta.env.VITE_QUEST_ESCROW_ADDRESS ||
    "0x0000000000000000000000000000000000000000") as Address,
  
};

/**
 * Transaction fee configuration
 */
export const FEE_CONFIG = {
  PERCENTAGE: 30, // 30% of gas cost
  DENOMINATOR: 100,
} as const;

