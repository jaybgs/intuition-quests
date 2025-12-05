import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { LeaderboardEntry } from '../types';
import { LeaderboardRowSkeleton } from './Skeleton';
import { useLeaderboard } from '../hooks/useLeaderboard';
import './FullLeaderboard.css';

interface FullLeaderboardProps {
  onBack: () => void;
}

export function FullLeaderboard({ onBack }: FullLeaderboardProps) {
  const { address } = useAccount();
  const { leaderboard: leaderboardData, isLoading } = useLeaderboard(100);
  const [filteredLeaderboard, setFilteredLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'daily' | 'weekly' | 'monthly'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [userRank, setUserRank] = useState<number | null>(null);

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
    if (searchQuery.trim() === '') {
      setFilteredLeaderboard(leaderboard);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = leaderboard.filter(entry => 
        entry.displayName?.toLowerCase().includes(query) ||
        entry.address.toLowerCase().includes(query)
      );
      setFilteredLeaderboard(filtered);
    }
  }, [searchQuery, leaderboard]);

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
    if (addr.length <= 10) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const truncateUsername = (username: string | null | undefined, maxLength: number = 7): string => {
    if (!username) return '';
    return username.length > maxLength ? username.slice(0, maxLength) : username;
  };

  return (
    <div className="full-leaderboard">
      <div className="full-leaderboard-container">
        <div className="full-leaderboard-header">
          <button className="back-button" onClick={onBack}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back
          </button>
          <h2 className="full-leaderboard-title">Global Leaderboard</h2>
        </div>

        <div className="full-leaderboard-controls">
          <div className="full-leaderboard-filters">
            <button
              className={`full-leaderboard-filter ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All Time
            </button>
            <button
              className={`full-leaderboard-filter ${filter === 'daily' ? 'active' : ''}`}
              onClick={() => setFilter('daily')}
            >
              Daily
            </button>
            <button
              className={`full-leaderboard-filter ${filter === 'weekly' ? 'active' : ''}`}
              onClick={() => setFilter('weekly')}
            >
              Weekly
            </button>
            <button
              className={`full-leaderboard-filter ${filter === 'monthly' ? 'active' : ''}`}
              onClick={() => setFilter('monthly')}
            >
              Monthly
            </button>
          </div>

          <div className="full-leaderboard-search">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search by name or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="full-leaderboard-search-input"
            />
            {searchQuery && (
              <button
                className="full-leaderboard-search-clear"
                onClick={() => setSearchQuery('')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {userRank && (
          <div className="full-leaderboard-user-rank">
            <div className="user-rank-badge">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              Your Rank: #{userRank}
            </div>
          </div>
        )}

        <div className="full-leaderboard-table-wrapper">
          <table className="full-leaderboard-table">
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
              ) : filteredLeaderboard.length === 0 ? (
                <tr>
                  <td colSpan={4} className="full-leaderboard-empty">
                    {searchQuery ? 'No users found matching your search' : 'No leaderboard data available'}
                  </td>
                </tr>
              ) : (
                filteredLeaderboard.map((entry, index) => {
                  const isUser = address && entry.address.toLowerCase() === address.toLowerCase();
                  return (
                    <tr
                      key={`${entry.address}-${entry.rank}`}
                      className={`full-leaderboard-row ${isUser ? 'full-leaderboard-row-user' : ''} ${entry.rank <= 3 ? 'full-leaderboard-row-top' : ''}`}
                      style={{
                        animationDelay: `${index * 0.02}s`,
                      }}
                    >
                      <td>
                        <div className="full-leaderboard-rank">
                          {getRankIcon(entry.rank) || (
                            <span className="rank-number">{entry.rank}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="full-leaderboard-user">
                          <div className="full-leaderboard-avatar">
                            {entry.displayName?.charAt(0).toUpperCase() || entry.address.charAt(2).toUpperCase()}
                          </div>
                          <div className="full-leaderboard-user-info">
                            <div className="full-leaderboard-username">
                              {entry.displayName ? truncateUsername(entry.displayName) : formatAddress(entry.address)}
                            </div>
                            {entry.displayName && (
                              <div className="full-leaderboard-address">{formatAddress(entry.address)}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="full-leaderboard-xp">
                          {entry.totalXP.toLocaleString()} IQ
                        </div>
                      </td>
                      <td>
                        <div className="full-leaderboard-quests">
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
      </div>
    </div>
  );
}
