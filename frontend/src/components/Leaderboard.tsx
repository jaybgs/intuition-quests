import { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { LeaderboardEntry } from '../types';
import { LeaderboardRowSkeleton } from './Skeleton';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { getDiceBearAvatar } from '../utils/avatar';
import './Leaderboard.css';

interface LeaderboardProps {
  onSeeMore?: () => void;
}

export function Leaderboard({ onSeeMore }: LeaderboardProps) {
  const { address } = useAccount();
  const { leaderboard: leaderboardData, isLoading } = useLeaderboard(10);
  const [filter, setFilter] = useState<'all' | 'daily' | 'weekly' | 'monthly'>('all');
  const [userRank, setUserRank] = useState<number | null>(null);
  const [hoveredFilterIndex, setHoveredFilterIndex] = useState<number | null>(null);
  const filtersRef = useRef<HTMLDivElement>(null);
  const filterSliderRef = useRef<HTMLDivElement>(null);
  const filterItemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const leaderboardRef = useRef<HTMLDivElement>(null);

  const leaderboard: LeaderboardEntry[] = leaderboardData || [];

  useEffect(() => {
      // Find user's rank
    if (address && leaderboard.length > 0) {
      const rank = leaderboard.findIndex(entry => 
        entry.address.toLowerCase() === address.toLowerCase()
        );
        setUserRank(rank >= 0 ? rank + 1 : null);
    } else {
      setUserRank(null);
      }
  }, [address, leaderboard]);

  useEffect(() => {
    const element = leaderboardRef.current;
    if (!element) return;

    // Check if element is already in view on mount
    const rect = element.getBoundingClientRect();
    const isInView = rect.top < window.innerHeight && rect.bottom > 0;
    
    if (isInView) {
      // If already in view, make it visible immediately
      element.classList.add('animate-in');
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
          }
        });
      },
      { threshold: 0.1, rootMargin: '100px 0px 0px 0px' }
    );

    observer.observe(element);

    // Fallback: ensure element is visible after 1 second even if observer doesn't trigger
    const fallbackTimeout = setTimeout(() => {
      if (element && !element.classList.contains('animate-in')) {
        element.classList.add('animate-in');
      }
    }, 1000);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
      clearTimeout(fallbackTimeout);
    };
  }, []);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return null;
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };


  return (
    <div ref={leaderboardRef} className="leaderboard">
      <div className="leaderboard-container">
        <div className="leaderboard-header">
          <h2 className="leaderboard-title">Global Leaderboard</h2>
          <div className="leaderboard-filters" ref={filtersRef}>
            <div className="leaderboard-filter-slider" ref={filterSliderRef} />
            <button
              ref={(el) => { filterItemRefs.current[0] = el; }}
              className={`leaderboard-filter ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
              onMouseEnter={() => {
                setHoveredFilterIndex(0);
                if (filterItemRefs.current[0] && filterSliderRef.current && filtersRef.current) {
                  const item = filterItemRefs.current[0];
                  const container = filtersRef.current;
                  const slider = filterSliderRef.current;
                  const containerRect = container.getBoundingClientRect();
                  const itemRect = item.getBoundingClientRect();
                  slider.style.left = `${itemRect.left - containerRect.left}px`;
                  slider.style.width = `${itemRect.width}px`;
                  slider.style.opacity = '1';
                }
              }}
              onMouseLeave={() => {
                setHoveredFilterIndex(null);
                if (filterSliderRef.current) {
                  filterSliderRef.current.style.opacity = '0';
                }
              }}
            >
              All Time
            </button>
            <button
              ref={(el) => { filterItemRefs.current[1] = el; }}
              className={`leaderboard-filter ${filter === 'daily' ? 'active' : ''}`}
              onClick={() => setFilter('daily')}
              onMouseEnter={() => {
                setHoveredFilterIndex(1);
                if (filterItemRefs.current[1] && filterSliderRef.current && filtersRef.current) {
                  const item = filterItemRefs.current[1];
                  const container = filtersRef.current;
                  const slider = filterSliderRef.current;
                  const containerRect = container.getBoundingClientRect();
                  const itemRect = item.getBoundingClientRect();
                  slider.style.left = `${itemRect.left - containerRect.left}px`;
                  slider.style.width = `${itemRect.width}px`;
                  slider.style.opacity = '1';
                }
              }}
              onMouseLeave={() => {
                setHoveredFilterIndex(null);
                if (filterSliderRef.current) {
                  filterSliderRef.current.style.opacity = '0';
                }
              }}
            >
              Daily
            </button>
            <button
              ref={(el) => { filterItemRefs.current[2] = el; }}
              className={`leaderboard-filter ${filter === 'weekly' ? 'active' : ''}`}
              onClick={() => setFilter('weekly')}
              onMouseEnter={() => {
                setHoveredFilterIndex(2);
                if (filterItemRefs.current[2] && filterSliderRef.current && filtersRef.current) {
                  const item = filterItemRefs.current[2];
                  const container = filtersRef.current;
                  const slider = filterSliderRef.current;
                  const containerRect = container.getBoundingClientRect();
                  const itemRect = item.getBoundingClientRect();
                  slider.style.left = `${itemRect.left - containerRect.left}px`;
                  slider.style.width = `${itemRect.width}px`;
                  slider.style.opacity = '1';
                }
              }}
              onMouseLeave={() => {
                setHoveredFilterIndex(null);
                if (filterSliderRef.current) {
                  filterSliderRef.current.style.opacity = '0';
                }
              }}
            >
              Weekly
            </button>
            <button
              ref={(el) => { filterItemRefs.current[3] = el; }}
              className={`leaderboard-filter ${filter === 'monthly' ? 'active' : ''}`}
              onClick={() => setFilter('monthly')}
              onMouseEnter={() => {
                setHoveredFilterIndex(3);
                if (filterItemRefs.current[3] && filterSliderRef.current && filtersRef.current) {
                  const item = filterItemRefs.current[3];
                  const container = filtersRef.current;
                  const slider = filterSliderRef.current;
                  const containerRect = container.getBoundingClientRect();
                  const itemRect = item.getBoundingClientRect();
                  slider.style.left = `${itemRect.left - containerRect.left}px`;
                  slider.style.width = `${itemRect.width}px`;
                  slider.style.opacity = '1';
                }
              }}
              onMouseLeave={() => {
                setHoveredFilterIndex(null);
                if (filterSliderRef.current) {
                  filterSliderRef.current.style.opacity = '0';
                }
              }}
            >
              Monthly
            </button>
          </div>
        </div>

        {userRank && (
          <div className="leaderboard-user-rank">
            <div className="user-rank-badge">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
          Your Rank: #{userRank}
            </div>
        </div>
      )}

        <div className="leaderboard-table-wrapper">
      <table className="leaderboard-table">
        <thead>
          <tr>
            <th>Rank</th>
                <th>User</th>
                <th>IQ</th>
                <th>Quests</th>
          </tr>
        </thead>
        <tbody>
              {isLoading ? (
                [...Array(10)].map((_, i) => (
                  <LeaderboardRowSkeleton key={i} />
                ))
              ) : leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={4} className="leaderboard-empty">
                    No leaderboard data available
                  </td>
                </tr>
              ) : (
                leaderboard.map((entry, index) => {
                  const isUser = address && entry.address.toLowerCase().includes(address.toLowerCase());
                  return (
            <tr
              key={entry.address}
                      className={`leaderboard-row ${isUser ? 'leaderboard-row-user' : ''} ${entry.rank <= 3 ? 'leaderboard-row-top' : ''}`}
                      style={{
                        animationDelay: `${index * 0.05}s`,
                      }}
                    >
                      <td>
                        <div className="leaderboard-rank">
                          {getRankIcon(entry.rank) || (
                            <span className="rank-number">{entry.rank}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="leaderboard-user">
                          <div className="leaderboard-avatar">
                            <img src={getDiceBearAvatar(entry.address, 40)} alt="" />
                          </div>
                          <div className="leaderboard-user-info">
                            <div className="leaderboard-username">
                              {entry.displayName ? truncateUsername(entry.displayName) : formatAddress(entry.address)}
                            </div>
                            {!entry.displayName && (
                              <div className="leaderboard-address">{formatAddress(entry.address)}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="leaderboard-xp">
                          {entry.totalXP.toLocaleString()} IQ
                        </div>
                      </td>
                      <td>
                        <div className="leaderboard-quests">
                          {entry.questsCompleted} completed
                        </div>
                      </td>
            </tr>
                  );
                })
              )}
        </tbody>
      </table>
        </div>

        {onSeeMore && (
          <div className="leaderboard-footer">
            <button className="leaderboard-see-more" onClick={onSeeMore}>
              See More
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}