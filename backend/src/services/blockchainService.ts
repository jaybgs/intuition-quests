import { createPublicClient, createWalletClient, http, formatEther, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet } from 'viem/chains';

// Trust Token Contract ABI (placeholder - replace with actual contract ABI)
const TRUST_TOKEN_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export class BlockchainService {
  private publicClient;
  private walletClient;
  private trustTokenAddress: `0x${string}`;

  constructor() {
    // Initialize public client for reading
    this.publicClient = createPublicClient({
      chain: mainnet, // TODO: Replace with actual chain
      transport: http(process.env.RPC_URL || 'https://eth.llamarpc.com'),
    });

    // Initialize wallet client for transactions (if private key is provided)
    if (process.env.PRIVATE_KEY) {
      const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
      this.walletClient = createWalletClient({
        account,
        chain: mainnet, // TODO: Replace with actual chain
        transport: http(process.env.RPC_URL || 'https://eth.llamarpc.com'),
      });
    }

    // Trust token contract address (from environment or default)
    this.trustTokenAddress = (process.env.TRUST_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;
  }

  /**
   * Get trust token balance for an address
   */
  async getTrustBalance(address: `0x${string}`): Promise<number> {
    try {
      const balance = await this.publicClient.readContract({
        address: this.trustTokenAddress,
        abi: TRUST_TOKEN_ABI,
        functionName: 'balanceOf',
        args: [address],
      });

      return parseFloat(formatEther(balance as bigint));
    } catch (error) {
      console.error('Error fetching trust balance:', error);
      // Return mock balance for development
      return 1250.5;
    }
  }

  /**
   * Distribute trust tokens to a user
   */
  async distributeTrustToken(
    recipientAddress: `0x${string}`,
    amount: string
  ): Promise<string> {
    if (!this.walletClient) {
      throw new Error('Wallet client not initialized. Set PRIVATE_KEY in environment variables.');
    }

    try {
      const amountWei = parseEther(amount);

      // Send transaction
      const hash = await this.walletClient.writeContract({
        address: this.trustTokenAddress,
        abi: TRUST_TOKEN_ABI,
        functionName: 'transfer',
        args: [recipientAddress, amountWei],
      });

      // Wait for transaction receipt
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === 'success') {
        return hash;
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error: any) {
      console.error('Error distributing trust token:', error);
      throw new Error(`Failed to distribute trust token: ${error.message}`);
    }
  }

  /**
   * Verify transaction on-chain
   */
  async verifyTransaction(txHash: `0x${string}`): Promise<{
    verified: boolean;
    from?: string;
    to?: string;
    value?: bigint;
  }> {
    try {
      const receipt = await this.publicClient.getTransactionReceipt({ hash: txHash });
      const transaction = await this.publicClient.getTransaction({ hash: txHash });

      return {
        verified: receipt.status === 'success',
        from: receipt.from,
        to: receipt.to || undefined,
        value: transaction.value,
      };
    } catch (error) {
      return { verified: false };
    }
  }

  /**
   * Check NFT ownership
   */
  async checkNFTOwnership(
    ownerAddress: `0x${string}`,
    contractAddress: `0x${string}`,
    tokenId?: bigint
  ): Promise<boolean> {
    try {
      if (!tokenId) {
        return false;
      }
      
      // ERC721 ownerOf function
      const owner = await this.publicClient.readContract({
        address: contractAddress,
        abi: [
          {
            name: 'ownerOf',
            type: 'function',
            stateMutability: 'view',
            inputs: [{ name: 'tokenId', type: 'uint256' }],
            outputs: [{ name: '', type: 'address' }],
          },
        ],
        functionName: 'ownerOf',
        args: [tokenId],
      });

      return owner.toLowerCase() === ownerAddress.toLowerCase();
    } catch (error) {
      console.error('Error checking NFT ownership:', error);
      return false;
    }
  }

  /**
   * Get token balance
   */
  async getTokenBalance(
    address: `0x${string}`,
    tokenAddress: `0x${string}`
  ): Promise<number> {
    try {
      const balance = await this.publicClient.readContract({
        address: tokenAddress,
        abi: [
          {
            name: 'balanceOf',
            type: 'function',
            stateMutability: 'view',
            inputs: [{ name: 'account', type: 'address' }],
            outputs: [{ name: '', type: 'uint256' }],
          },
        ],
        functionName: 'balanceOf',
        args: [address],
      });

      // Assume 18 decimals (standard ERC20)
      return parseFloat(formatEther(balance as bigint));
    } catch (error) {
      console.error('Error fetching token balance:', error);
      return 0;
    }
  }
}

