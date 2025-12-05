import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useTrustBalance } from '../hooks/useTrustBalance';
import { RewardsPageSkeleton } from './Skeleton';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import './Rewards.css';

export function Rewards() {
  const { address } = useAccount();
  const { balance } = useTrustBalance();
  const [isLoading, setIsLoading] = useState(true);
  const rewardsRef = useScrollAnimation();
  
  // Mock earnings data - replace with actual API calls
  const [earnings, setEarnings] = useState({
    total: 0.0,
    staking: 0.0,
    campaigns: 0.0,
  });

  useEffect(() => {
    // Simulate loading earnings data
    // In production, this would fetch from an API
    const timer = setTimeout(() => {
      setEarnings({
        total: 0.0,
        staking: 0.0,
        campaigns: 0.0,
      });
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [address]);

  if (isLoading) {
    return <RewardsPageSkeleton />;
  }

  return (
    <div className="rewards-container">
      <div ref={rewardsRef} className="rewards-glass-container">
        <img 
          src="/rewards header.svg" 
          alt="Rewards Header" 
          className="rewards-background-svg"
        />
        <div className="rewards-content">
          {/* Left Side - Earnings Section */}
          <div className="rewards-left">
          <div className="rewards-header">
            <h2 className="rewards-title">Your earnings on TrustQuests</h2>
            <div className="rewards-total">
              <span className="rewards-currency">$</span>
              <span className="rewards-amount">{earnings.total.toFixed(3)}</span>
            </div>
          </div>

          <div className="rewards-cards">
            <div className="rewards-card">
              <div className="rewards-card-icon staking-icon">
                <img 
                  src="/trust logo1.svg" 
                  alt="Trust Logo" 
                  className="staking-logo"
                />
              </div>
              <div className="rewards-card-content">
                <div className="rewards-card-label">Earned $TRUST</div>
                <div className="rewards-card-value">${earnings.staking.toFixed(2)}</div>
              </div>
            </div>

            <div className="rewards-card">
              <div className="rewards-card-icon campaigns-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
              </div>
              <div className="rewards-card-content">
                <div className="rewards-card-label">Campaigns</div>
                <div className="rewards-card-value">${earnings.campaigns.toFixed(2)}</div>
              </div>
            </div>

          </div>
        </div>
        </div>
      </div>
    </div>
  );
}