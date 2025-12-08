import { createConfig, http } from 'wagmi';
import { createWeb3Modal } from '@web3modal/wagmi';
import { walletConnect, injected } from 'wagmi/connectors';
import { defineChain } from 'viem';
import { getMultiVaultAddressFromChainId } from '@0xintuition/protocol';

// Intuition Mainnet Chain Configuration (matching protocol package)
export const intuitionChain = defineChain({
  id: 1155,
  name: 'Intuition Network',
  nativeCurrency: {
    decimals: 18,
    name: 'Intuition',
    symbol: 'TRUST',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.intuition.systems'],
      webSocket: ['wss://rpc.intuition.systems/ws'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Intuition Explorer',
      url: 'https://explorer.intuition.systems',
    },
  },
  contracts: {
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11',
    },
  },
});

// Export MultiVault address for use in components
export const multiVaultAddress = getMultiVaultAddressFromChainId(intuitionChain.id);

// Get WalletConnect Project ID from environment
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '';

// Create connectors - use only injected() to avoid conflicts with multiple wallet extensions
// injected() automatically detects and uses whatever wallet is available
const connectors: any[] = [
  injected({
    shimDisconnect: true, // Properly handle disconnect state
  }),
];

// Only add WalletConnect if projectId is provided
if (projectId) {
  connectors.push(
    walletConnect({
      projectId,
      showQrModal: true,
    })
  );
}

export const wagmiConfig = createConfig({
  chains: [intuitionChain],
  connectors,
  transports: {
    [intuitionChain.id]: http(intuitionChain.rpcUrls.default.http[0]),
  },
  ssr: false, // Disable SSR to prevent hydration issues
  syncConnectedChain: true, // Sync connected chain state
  multiInjectedProviderDiscovery: true, // Better handling of multiple wallet extensions
});

// Create Web3Modal only if projectId is provided
if (projectId) {
  createWeb3Modal({
    wagmiConfig,
    projectId,
    chains: [intuitionChain],
    themeMode: 'dark',
    themeVariables: {
      '--w3m-accent': '#3b82f6',
    },
  });
}