import { useBuilderAnalytics } from '../hooks/useBuilderAnalytics';
import { useAccount } from 'wagmi';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './BuilderAnalytics.css';
import type { Address } from 'viem';

interface BuilderAnalyticsProps {
  creatorAddress?: Address;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function BuilderAnalytics({ creatorAddress }: BuilderAnalyticsProps) {
  const { address } = useAccount();
  const analytics = useBuilderAnalytics(creatorAddress || address);

  if (analytics.isLoading) {
    return (
      <div className="builder-analytics-loading">
        <div className="builder-spinner"></div>
        <p>Loading analytics...</p>
      </div>
    );
  }

  const funnelData = [
    { name: 'Views', value: analytics.funnelData.views, fill: COLORS[0] },
    { name: 'Joins', value: analytics.funnelData.joins, fill: COLORS[1] },
    { name: 'Completes', value: analytics.funnelData.completes, fill: COLORS[2] },
  ];


  return (
    <div className="builder-analytics">
      <h2 className="builder-analytics-title">Advanced Analytics</h2>

      {/* Quest Status Breakdown */}
      <div className="builder-analytics-section">
        <h3 className="builder-analytics-section-title">Quest Status Breakdown</h3>
        <div className="builder-analytics-stats-grid">
          <div className="builder-analytics-stat-card">
            <div className="builder-analytics-stat-label">Active</div>
            <div className="builder-analytics-stat-value">{analytics.questStatusBreakdown.active}</div>
          </div>
          <div className="builder-analytics-stat-card">
            <div className="builder-analytics-stat-label">Paused</div>
            <div className="builder-analytics-stat-value">{analytics.questStatusBreakdown.paused}</div>
          </div>
          <div className="builder-analytics-stat-card">
            <div className="builder-analytics-stat-label">Completed</div>
            <div className="builder-analytics-stat-value">{analytics.questStatusBreakdown.completed}</div>
          </div>
          <div className="builder-analytics-stat-card">
            <div className="builder-analytics-stat-label">Expired</div>
            <div className="builder-analytics-stat-value">{analytics.questStatusBreakdown.expired}</div>
          </div>
        </div>
      </div>

      {/* Participants & Completion Rate */}
      <div className="builder-analytics-section">
        <h3 className="builder-analytics-section-title">Participants & Completion</h3>
        <div className="builder-analytics-stats-grid">
          <div className="builder-analytics-stat-card">
            <div className="builder-analytics-stat-label">Active Participants</div>
            <div className="builder-analytics-stat-value">{analytics.participantData.uniqueWallets}</div>
            <div className="builder-analytics-stat-sublabel">Unique wallets</div>
          </div>
          <div className="builder-analytics-stat-card">
            <div className="builder-analytics-stat-label">Total Started</div>
            <div className="builder-analytics-stat-value">{analytics.participantData.totalStarted}</div>
          </div>
          <div className="builder-analytics-stat-card">
            <div className="builder-analytics-stat-label">Total Completed</div>
            <div className="builder-analytics-stat-value">{analytics.participantData.totalCompleted}</div>
          </div>
          <div className="builder-analytics-stat-card">
            <div className="builder-analytics-stat-label">Completion Rate</div>
            <div className="builder-analytics-stat-value">{analytics.participantData.completionRate.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {/* Rewards */}
      <div className="builder-analytics-section">
        <h3 className="builder-analytics-section-title">Rewards Overview</h3>
        <div className="builder-analytics-stats-grid">
          <div className="builder-analytics-stat-card">
            <div className="builder-analytics-stat-label">Total Deposited</div>
            <div className="builder-analytics-stat-value">{analytics.rewardData.totalDeposited.toFixed(2)} TRUST</div>
            <div className="builder-analytics-stat-sublabel">≈ ${analytics.rewardData.totalDepositedUSD.toFixed(2)}</div>
          </div>
          <div className="builder-analytics-stat-card">
            <div className="builder-analytics-stat-label">Total Distributed</div>
            <div className="builder-analytics-stat-value">{analytics.rewardData.totalDistributed.toFixed(2)} TRUST</div>
            <div className="builder-analytics-stat-sublabel">≈ ${analytics.rewardData.totalDistributedUSD.toFixed(2)}</div>
          </div>
          <div className="builder-analytics-stat-card">
            <div className="builder-analytics-stat-label">Remaining</div>
            <div className="builder-analytics-stat-value">{Math.max(0, analytics.rewardData.totalDeposited - analytics.rewardData.totalDistributed).toFixed(2)} TRUST</div>
            <div className="builder-analytics-stat-sublabel">Reserved</div>
          </div>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="builder-analytics-section">
        <h3 className="builder-analytics-section-title">Conversion Funnel</h3>
        <div className="builder-analytics-chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={funnelData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis dataKey="name" stroke="rgba(255, 255, 255, 0.7)" />
              <YAxis stroke="rgba(255, 255, 255, 0.7)" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(26, 31, 53, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#fff'
                }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="builder-analytics-funnel-stats">
          <div className="builder-analytics-funnel-stat">
            <span>View → Join:</span>
            <span>{analytics.funnelData.viewToJoinRate.toFixed(1)}%</span>
          </div>
          <div className="builder-analytics-funnel-stat">
            <span>Join → Complete:</span>
            <span>{analytics.funnelData.joinToCompleteRate.toFixed(1)}%</span>
          </div>
          <div className="builder-analytics-funnel-stat">
            <span>Overall Conversion:</span>
            <span>{analytics.funnelData.overallConversionRate.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Time Series Charts */}
      <div className="builder-analytics-section">
        <h3 className="builder-analytics-section-title">Participants Over Time (Last 14 Days)</h3>
        <div className="builder-analytics-chart-container">
          {analytics.timeSeriesData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis 
                dataKey="date" 
                stroke="rgba(255, 255, 255, 0.7)"
                tickFormatter={(value) => {
                  try {
                    const date = new Date(value);
                    if (isNaN(date.getTime())) {
                      // If value is already a formatted string, try to parse it
                      const parts = value.split('-');
                      if (parts.length === 3) {
                        return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
                      }
                      return value;
                    }
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  } catch {
                    return value;
                  }
                }}
              />
              <YAxis stroke="rgba(255, 255, 255, 0.7)" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(26, 31, 53, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#fff'
                }}
                labelFormatter={(value) => {
                  try {
                    const date = new Date(value);
                    if (isNaN(date.getTime())) {
                      return value;
                    }
                    return date.toLocaleDateString();
                  } catch {
                    return value;
                  }
                }}
              />
              <Legend />
                <Line type="monotone" dataKey="participants" stroke={COLORS[0]} strokeWidth={2} name="Participants" />
                <Line type="monotone" dataKey="completions" stroke={COLORS[2]} strokeWidth={2} name="Completions" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="builder-analytics-empty-chart">
              <p>No data available for the last 30 days</p>
            </div>
          )}
        </div>
      </div>

      {/* Completions Over Time */}
      <div className="builder-analytics-section">
        <h3 className="builder-analytics-section-title">Completions Over Time (Last 14 Days)</h3>
        <div className="builder-analytics-chart-container">
          {analytics.timeSeriesData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis 
                dataKey="date" 
                stroke="rgba(255, 255, 255, 0.7)"
                tickFormatter={(value) => {
                  try {
                    const date = new Date(value);
                    if (isNaN(date.getTime())) {
                      // If value is already a formatted string, try to parse it
                      const parts = value.split('-');
                      if (parts.length === 3) {
                        return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
                      }
                      return value;
                    }
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  } catch {
                    return value;
                  }
                }}
              />
              <YAxis stroke="rgba(255, 255, 255, 0.7)" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(26, 31, 53, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#fff'
                }}
                labelFormatter={(value) => {
                  try {
                    const date = new Date(value);
                    if (isNaN(date.getTime())) {
                      return value;
                    }
                    return date.toLocaleDateString();
                  } catch {
                    return value;
                  }
                }}
              />
                <Line type="monotone" dataKey="completions" stroke={COLORS[2]} strokeWidth={2} dot={{ fill: COLORS[2], r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="builder-analytics-empty-chart">
              <p>No data available for the last 30 days</p>
            </div>
          )}
        </div>
      </div>

      {/* Top Participants */}
      <div className="builder-analytics-section">
        <h3 className="builder-analytics-section-title">Top Participants</h3>
        <div className="builder-analytics-table-container">
          <table className="builder-analytics-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Address</th>
                <th>Completions</th>
                <th>Total Rewards</th>
              </tr>
            </thead>
            <tbody>
              {analytics.topParticipants.length > 0 ? (
                analytics.topParticipants.map((participant, index) => (
                  <tr key={participant.address}>
                    <td>{index + 1}</td>
                    <td className="builder-analytics-address">
                      {participant.address.slice(0, 6)}...{participant.address.slice(-4)}
                    </td>
                    <td>{participant.completions}</td>
                    <td>{participant.totalRewards.toFixed(2)} TRUST</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="builder-analytics-empty">No participants yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

