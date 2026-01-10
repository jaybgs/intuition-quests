import { RequirementType, VerificationResult } from '../types/index.js';
import axios from 'axios';
import crypto from 'crypto';
import { supabase } from '../config/supabase.js';

export class VerificationService {
  /**
   * Verify a quest requirement based on its type
   */
  async verifyRequirement(
    type: RequirementType,
    verificationData: Record<string, any>,
    userData: {
      address: string;
      twitterHandle?: string;
      discordId?: string;
    }
  ): Promise<VerificationResult> {
    switch (type) {
      case RequirementType.FOLLOW:
        return this.verifyFollow(verificationData, userData);

      case RequirementType.RETWEET:
        return this.verifyRetweet(verificationData, userData);

      case RequirementType.LIKE:
        return this.verifyLike(verificationData, userData);

      case RequirementType.VISIT:
        return this.verifyVisit(verificationData, userData);
      
      case RequirementType.VERIFY_WALLET:
        return this.verifyWallet(verificationData, userData);
      
      case RequirementType.TRANSACTION:
        return this.verifyTransaction(verificationData, userData);
      
      case RequirementType.NFT_HOLD:
        return this.verifyNFTHold(verificationData, userData);
      
      case RequirementType.TOKEN_BALANCE:
        return this.verifyTokenBalance(verificationData, userData);
      
      case RequirementType.CONTRACT_INTERACTION:
        return this.verifyContractInteraction(verificationData, userData);
      
      case RequirementType.CUSTOM:
        return this.verifyCustom(verificationData, userData);
      
      default:
        return {
          verified: false,
          error: `Verification type ${type} not implemented`,
        };
    }
  }

  /**
   * Verify website visit (client-side verification)
   */
  private async verifyVisit(
    verificationData: Record<string, any>,
    userData: { address: string }
  ): Promise<VerificationResult> {
    const { url, timestamp } = verificationData;

    // Visit verification is typically done client-side
    // Backend just validates the data structure
    if (!url || !timestamp) {
      return { verified: false, error: 'Missing visit data' };
    }

    // Check if visit was recent (within last hour)
    const visitTime = new Date(timestamp);
    const now = new Date();
    const hoursDiff = (now.getTime() - visitTime.getTime()) / (1000 * 60 * 60);

    if (hoursDiff > 1) {
      return { verified: false, error: 'Visit timestamp too old' };
    }

    return {
      verified: true,
      data: { url, timestamp, address: userData.address },
    };
  }

  /**
   * Verify wallet ownership
   */
  private async verifyWallet(
    verificationData: Record<string, any>,
    userData: { address: string }
  ): Promise<VerificationResult> {
    const { signature, message } = verificationData;

    if (!signature || !message) {
      return { verified: false, error: 'Missing signature or message' };
    }

    // TODO: Verify signature using ethers/viem
    // const recoveredAddress = ethers.utils.verifyMessage(message, signature);
    // return { verified: recoveredAddress.toLowerCase() === userData.address.toLowerCase() };

    return {
      verified: true, // Mock - implement actual signature verification
      data: { address: userData.address },
    };
  }

  /**
   * Verify on-chain transaction
   */
  private async verifyTransaction(
    verificationData: Record<string, any>,
    userData: { address: string }
  ): Promise<VerificationResult> {
    const { txHash, contractAddress, functionName } = verificationData;

    if (!txHash) {
      return { verified: false, error: 'Missing transaction hash' };
    }

    // TODO: Verify transaction on-chain using viem/ethers
    // Check if transaction exists, is from user, and matches requirements
    
    return {
      verified: true, // Mock
      data: { txHash, contractAddress, functionName },
    };
  }

  /**
   * Verify NFT ownership
   */
  private async verifyNFTHold(
    verificationData: Record<string, any>,
    userData: { address: string }
  ): Promise<VerificationResult> {
    const { contractAddress, tokenId, chainId } = verificationData;

    if (!contractAddress) {
      return { verified: false, error: 'Missing NFT contract address' };
    }

    // TODO: Verify NFT ownership on-chain
    // const ownsNFT = await checkNFTOwnership(userData.address, contractAddress, tokenId, chainId);
    
    return {
      verified: true, // Mock
      data: { contractAddress, tokenId, chainId, owner: userData.address },
    };
  }

  /**
   * Verify token balance
   */
  private async verifyTokenBalance(
    verificationData: Record<string, any>,
    userData: { address: string }
  ): Promise<VerificationResult> {
    const { contractAddress, minBalance, chainId } = verificationData;

    if (!contractAddress || minBalance === undefined) {
      return { verified: false, error: 'Missing contract address or minimum balance' };
    }

    // TODO: Check token balance on-chain
    // const balance = await getTokenBalance(userData.address, contractAddress, chainId);
    // return { verified: balance >= minBalance };
    
    return {
      verified: true, // Mock
      data: { contractAddress, minBalance, chainId },
    };
  }

  /**
   * Verify contract interaction
   */
  private async verifyContractInteraction(
    verificationData: Record<string, any>,
    userData: { address: string }
  ): Promise<VerificationResult> {
    const { contractAddress, functionName, txHash } = verificationData;

    if (!contractAddress || !functionName) {
      return { verified: false, error: 'Missing contract address or function name' };
    }

    // TODO: Verify contract interaction on-chain
    return {
      verified: true, // Mock
      data: { contractAddress, functionName, txHash },
    };
  }

  /**
   * Verify custom requirement (manual or custom logic)
   */
  private async verifyCustom(
    verificationData: Record<string, any>,
    userData: { address: string }
  ): Promise<VerificationResult> {
    // Custom verification logic
    // This could be extended with custom verification scripts
    
    const { proof, verificationMethod } = verificationData;

    if (!proof) {
      return { verified: false, error: 'Missing proof for custom verification' };
    }

    // For now, accept any proof (should be replaced with actual verification)
    return {
      verified: true,
      data: { proof, verificationMethod, address: userData.address },
    };
  }

  /**
   * Verify Twitter follow
   */
  private async verifyFollow(
    verificationData: Record<string, any>,
    userData: { address: string; twitterHandle?: string }
  ): Promise<VerificationResult> {
    const { accountToFollow } = verificationData;

    if (!userData.twitterHandle) {
      return { verified: false, error: 'Twitter account not connected' };
    }

    try {
      // Get stored Twitter connection for this user
      const { data: connection, error } = await supabase
        .from('wallet_socials')
        .select('access_token, provider_user_id')
        .eq('wallet_address', userData.address.toLowerCase())
        .eq('provider', 'twitter')
        .single();

      if (error || !connection || !connection.access_token) {
        return { verified: false, error: 'Twitter connection not found or invalid' };
      }

      // Decrypt access token
      const accessToken = this.decryptToken(connection.access_token);

      // Get target user ID
      const targetResponse = await fetch(
        `https://api.twitter.com/2/users/by/username/${accountToFollow}`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      if (!targetResponse.ok) {
        return { verified: false, error: 'Could not find target Twitter account' };
      }

      const targetData: any = await targetResponse.json();
      const targetId = targetData.data?.id;

      if (!targetId) {
        return { verified: false, error: 'Invalid target Twitter account' };
      }

      // Check if user follows the target
      const followResponse = await fetch(
        `https://api.twitter.com/2/users/${connection.provider_user_id}/following`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      if (!followResponse.ok) {
        return { verified: false, error: 'Could not check follow relationship' };
      }

      const followingData: any = await followResponse.json();
      const isFollowing = followingData.data?.some((user: any) => user.id === targetId) || false;

      return {
        verified: isFollowing,
        data: {
          accountToFollow,
          follower: userData.twitterHandle,
          targetId,
          followerId: connection.provider_user_id
        }
      };
    } catch (error: any) {
      console.error('Twitter follow verification error:', error);
      return { verified: false, error: error.message || 'Follow verification failed' };
    }
  }

  /**
   * Verify Twitter retweet
   */
  private async verifyRetweet(
    verificationData: Record<string, any>,
    userData: { address: string; twitterHandle?: string }
  ): Promise<VerificationResult> {
    const { tweetId } = verificationData;

    if (!userData.twitterHandle) {
      return { verified: false, error: 'Twitter account not connected' };
    }

    try {
      // Get stored Twitter connection
      const { data: connection, error } = await supabase
        .from('wallet_socials')
        .select('access_token')
        .eq('wallet_address', userData.address.toLowerCase())
        .eq('provider', 'twitter')
        .single();

      if (error || !connection || !connection.access_token) {
        return { verified: false, error: 'Twitter connection not found or invalid' };
      }

      const accessToken = this.decryptToken(connection.access_token);

      // For now, return mock verification (Twitter API v2 doesn't have direct retweet checking)
      // In production, you might need to:
      // 1. Check user's recent tweets for retweets of the target tweet
      // 2. Use webhooks or polling to track retweets
      // 3. Use Twitter's engagement API when available

      return {
        verified: true, // Mock - implement actual verification
        data: { tweetId, user: userData.twitterHandle },
      };
    } catch (error: any) {
      console.error('Twitter retweet verification error:', error);
      return { verified: false, error: error.message || 'Retweet verification failed' };
    }
  }

  /**
   * Verify Twitter like
   */
  private async verifyLike(
    verificationData: Record<string, any>,
    userData: { address: string; twitterHandle?: string }
  ): Promise<VerificationResult> {
    const { tweetId } = verificationData;

    if (!userData.twitterHandle) {
      return { verified: false, error: 'Twitter account not connected' };
    }

    try {
      // Get stored Twitter connection
      const { data: connection, error } = await supabase
        .from('wallet_socials')
        .select('access_token, provider_user_id')
        .eq('wallet_address', userData.address.toLowerCase())
        .eq('provider', 'twitter')
        .single();

      if (error || !connection || !connection.access_token) {
        return { verified: false, error: 'Twitter connection not found or invalid' };
      }

      const accessToken = this.decryptToken(connection.access_token);

      // Check if user liked the tweet
      const likeResponse = await fetch(
        `https://api.twitter.com/2/users/${connection.provider_user_id}/liked_tweets`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      if (!likeResponse.ok) {
        return { verified: false, error: 'Could not check like status' };
      }

      const likedData: any = await likeResponse.json();
      const hasLiked = likedData.data?.some((tweet: any) => tweet.id === tweetId) || false;

      return {
        verified: hasLiked,
        data: { tweetId, user: userData.twitterHandle, hasLiked },
      };
    } catch (error: any) {
      console.error('Twitter like verification error:', error);
      return { verified: false, error: error.message || 'Like verification failed' };
    }
  }

  /**
   * Helper method to decrypt tokens
   */
  private decryptToken(encryptedText: string): string {
    try {
      const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;
      const ALGORITHM = 'aes-256-gcm';

      const parts = encryptedText.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const authTag = Buffer.from(parts[2], 'hex');

      const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      throw new Error('Failed to decrypt token');
    }
  }
}

