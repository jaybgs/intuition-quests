import type { Chain, Hex } from 'viem';
import { encodePacked, keccak256, toHex } from 'viem';

// Temporary mock implementation until @0xintuition/protocol package is available
export const intuitionMainnet: Chain = {
  id: 0x1234, // Replace with actual 0xIntuition mainnet chain ID when available
  name: '0xIntuition Mainnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.intuition.xyz'], // Replace with actual RPC URL
    },
    public: {
      http: ['https://rpc.intuition.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Intuition Explorer',
      url: 'https://explorer.intuition.xyz',
    },
  },
  testnet: false,
};

export function getMultiVaultAddressFromChainId(chainId: number): `0x${string}` {
  // Intuition MultiVault addresses by chain ID
  const addresses: Record<number, `0x${string}`> = {
    1155: '0x6E35cF57A41fA15eA0EaE9C33e751b01A784Fe7e', // Intuition Mainnet
  };
  
  return addresses[chainId] || '0x0000000000000000000000000000000000000000' as `0x${string}`;
}

/**
 * Calculate atom ID from atom data
 * This matches the implementation from @0xintuition/sdk
 */
export function calculateAtomId(atomData: Hex): `0x${string}` {
  const salt = keccak256(toHex('ATOM_SALT'));
  return keccak256(
    encodePacked(['bytes32', 'bytes'], [salt, keccak256(atomData)]),
  ) as `0x${string}`;
}

