export type SubscriptionTier = 'free' | 'pro';

/**
 * Service for managing user subscription status
 * Stores subscription tier in localStorage (in production, this would be managed by backend)
 */
export class SubscriptionService {
  private getStorageKey(address: string): string {
    return `subscription_${address.toLowerCase()}`;
  }

  /**
   * Get user's subscription tier
   */
  getSubscription(address: string): SubscriptionTier {
    if (typeof window === 'undefined' || !window.localStorage) {
      return 'free';
    }

    try {
      const stored = localStorage.getItem(this.getStorageKey(address));
      return (stored as SubscriptionTier) || 'free';
    } catch (error) {
      console.error('Error reading subscription:', error);
      return 'free';
    }
  }

  /**
   * Set user's subscription tier
   */
  setSubscription(address: string, tier: SubscriptionTier): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      localStorage.setItem(this.getStorageKey(address), tier);
    } catch (error) {
      console.error('Error saving subscription:', error);
    }
  }

  /**
   * Check if user is on free plan
   */
  isFree(address: string): boolean {
    return this.getSubscription(address) === 'free';
  }

  /**
   * Check if user is on pro plan
   */
  isPro(address: string): boolean {
    return this.getSubscription(address) === 'pro';
  }
}

// Export singleton instance
export const subscriptionService = new SubscriptionService();

