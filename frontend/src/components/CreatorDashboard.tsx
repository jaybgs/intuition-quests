import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { creatorDashboardService, type CreatorQuest, type Winner } from '../services/creatorDashboardService';
import './CreatorDashboard.css';

export const CreatorDashboard: React.FC = () => {
    const { address } = useAccount();
    const [quests, setQuests] = useState<CreatorQuest[]>([]);
    const [selectedQuest, setSelectedQuest] = useState<CreatorQuest | null>(null);
    const [winners, setWinners] = useState<Winner[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedTab, setSelectedTab] = useState<'expired' | 'distributing' | 'completed'>('expired');

    // Load creator's quests
    useEffect(() => {
        if (address) {
            loadCreatorQuests();
        }
    }, [address]);

    const loadCreatorQuests = async () => {
        if (!address) return;

        setLoading(true);
        setError(null);

        try {
            const fetchedQuests = await creatorDashboardService.getCreatorQuests(address);
            setQuests(fetchedQuests);
        } catch (err: any) {
            setError(err.message || 'Failed to load quests');
        } finally {
            setLoading(false);
        }
    };

    const loadWinners = async (questId: string) => {
        setLoading(true);
        setError(null);

        try {
            const fetchedWinners = await creatorDashboardService.getWinners(questId);
            setWinners(fetchedWinners);
        } catch (err: any) {
            setError(err.message || 'Failed to load winners');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectWinners = async (quest: CreatorQuest) => {
        if (!confirm(`Select winners for "${quest.title}"? This action cannot be undone.`)) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await creatorDashboardService.selectWinners(quest.id);
            alert(`✅ Winners selected successfully! ${result.winners.length} winner(s)`);

            // Reload quests and winners
            await loadCreatorQuests();
            setSelectedQuest(quest);
            await loadWinners(quest.id);
        } catch (err: any) {
            setError(err.message || 'Failed to select winners');
            alert(`❌ Error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDistributeRewards = async (quest: CreatorQuest) => {
        const txHash = prompt('Enter transaction hash (optional):');

        if (!confirm(`Distribute rewards for "${quest.title}"? This will update all winner balances.`)) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await creatorDashboardService.distributeRewards(quest.id, txHash || undefined);
            alert('✅ Rewards distributed successfully!');

            // Reload quests and winners
            await loadCreatorQuests();
            await loadWinners(quest.id);
        } catch (err: any) {
            setError(err.message || 'Failed to distribute rewards');
            alert(`❌ Error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleViewWinners = async (quest: CreatorQuest) => {
        setSelectedQuest(quest);
        await loadWinners(quest.id);
    };

    // Filter quests by status
    const filteredQuests = quests.filter(q => {
        if (selectedTab === 'expired') return q.status === 'expired';
        if (selectedTab === 'distributing') return q.status === 'distributing_rewards';
        if (selectedTab === 'completed') return q.status === 'rewards_distributed';
        return false;
    });

    if (!address) {
        return (
            <div className="creator-dashboard">
                <div className="creator-dashboard-empty">
                    <h2>Connect Wallet</h2>
                    <p>Please connect your wallet to access the Creator Dashboard</p>
                </div>
            </div>
        );
    }

    return (
        <div className="creator-dashboard">
            <div className="creator-dashboard-header">
                <h1>Creator Dashboard</h1>
                <p>Manage your quest rewards and winner distribution</p>
            </div>

            {error && (
                <div className="creator-dashboard-error">
                    ❌ {error}
                </div>
            )}

            <div className="creator-dashboard-tabs">
                <button
                    className={`tab ${selectedTab === 'expired' ? 'active' : ''}`}
                    onClick={() => setSelectedTab('expired')}
                >
                    Expired ({quests.filter(q => q.status === 'expired').length})
                </button>
                <button
                    className={`tab ${selectedTab === 'distributing' ? 'active' : ''}`}
                    onClick={() => setSelectedTab('distributing')}
                >
                    Distributing ({quests.filter(q => q.status === 'distributing_rewards').length})
                </button>
                <button
                    className={`tab ${selectedTab === 'completed' ? 'active' : ''}`}
                    onClick={() => setSelectedTab('completed')}
                >
                    Completed ({quests.filter(q => q.status === 'rewards_distributed').length})
                </button>
            </div>

            {loading && <div className="creator-dashboard-loading">Loading...</div>}

            <div className="creator-dashboard-content">
                {filteredQuests.length === 0 ? (
                    <div className="creator-dashboard-empty">
                        <p>No {selectedTab} quests found</p>
                    </div>
                ) : (
                    <div className="creator-dashboard-quests">
                        {filteredQuests.map((quest) => (
                            <div key={quest.id} className="creator-quest-card">
                                <div className="quest-card-header">
                                    <h3>{quest.title}</h3>
                                    <span className={`status-badge ${quest.status}`}>
                                        {quest.status.replace('_', ' ')}
                                    </span>
                                </div>

                                <div className="quest-card-details">
                                    <div className="detail-row">
                                        <span className="label">Reward:</span>
                                        <span className="value">{quest.reward_deposit} {quest.reward_token}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">Completions:</span>
                                        <span className="value">{quest.completed_by?.length || 0}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">Distribution:</span>
                                        <span className="value">{quest.distribution_type?.toUpperCase()}</span>
                                    </div>
                                    {quest.number_of_winners && (
                                        <div className="detail-row">
                                            <span className="label">Winners:</span>
                                            <span className="value">{quest.number_of_winners}</span>
                                        </div>
                                    )}
                                    {quest.reward_distribution_tx_hash && (
                                        <div className="detail-row">
                                            <span className="label">TX Hash:</span>
                                            <span className="value tx-hash">{quest.reward_distribution_tx_hash.substring(0, 10)}...</span>
                                        </div>
                                    )}
                                </div>

                                <div className="quest-card-actions">
                                    {/* Only show distribution controls for quests with TRUST rewards */}
                                    {(quest.reward_type === 'trust_only' || quest.reward_type === 'trust_and_iq') && (
                                        <>
                                            {quest.status === 'expired' && (
                                                <button
                                                    onClick={() => handleSelectWinners(quest)}
                                                    disabled={loading}
                                                    className="btn-primary"
                                                >
                                                    Select Winners
                                                </button>
                                            )}

                                            {quest.status === 'distributing_rewards' && (
                                                <>
                                                    <button
                                                        onClick={() => handleViewWinners(quest)}
                                                        className="btn-secondary"
                                                    >
                                                        View Winners
                                                    </button>
                                                    <button
                                                        onClick={() => handleDistributeRewards(quest)}
                                                        disabled={loading}
                                                        className="btn-primary"
                                                    >
                                                        Distribute Rewards
                                                    </button>
                                                </>
                                            )}

                                            {quest.status === 'rewards_distributed' && (
                                                <button
                                                    onClick={() => handleViewWinners(quest)}
                                                    className="btn-secondary"
                                                >
                                                    View Winners
                                                </button>
                                            )}
                                        </>
                                    )}

                                    {/* IQ-only quests show info message instead */}
                                    {quest.reward_type === 'iq_only' && (
                                        <div className="iq-only-message">
                                            ✅ IQ rewards distributed automatically
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Winners Modal */}
            {selectedQuest && winners.length > 0 && (
                <div className="winners-modal-overlay" onClick={() => setSelectedQuest(null)}>
                    <div className="winners-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Winners - {selectedQuest.title}</h2>
                            <button className="close-btn" onClick={() => setSelectedQuest(null)}>×</button>
                        </div>
                        <div className="winners-list">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Rank</th>
                                        <th>Wallet Address</th>
                                        <th>Reward</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {winners.map((winner) => (
                                        <tr key={winner.wallet_address}>
                                            <td>{winner.rank}</td>
                                            <td className="wallet-address">{winner.wallet_address}</td>
                                            <td>{winner.reward_amount} {winner.reward_token}</td>
                                            <td>
                                                <span className={`distribution-status ${winner.distributed ? 'distributed' : 'pending'}`}>
                                                    {winner.distributed ? '✅ Distributed' : '⏳ Pending'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
