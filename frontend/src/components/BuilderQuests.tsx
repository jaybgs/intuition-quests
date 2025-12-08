import { useState, useEffect } from 'react';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { CreateQuestBuilder } from './CreateQuestBuilder';
import { QuestDetail } from './QuestDetail';
import { QuestServiceBackend } from '../services/questServiceBackend';
import type { Quest } from '../types';
import { getQuestWinners, calculateAndSaveWinners, getQuestCompletions } from '../utils/raffle';
// Contract services disabled - contracts deleted
// import { setWinners, distributeRewards, getQuestDeposit } from '../services/questEscrowService';
import { showToast } from './Toast';
import './BuilderQuests.css';

interface BuilderQuestsProps {
  onCreateQuest?: () => void;
  onBack?: () => void;
  spaceId?: string;
}

interface QuestDraft {
  id: string;
  title: string;
  updatedAt: number;
  currentStep?: number;
  spaceId?: string;
}

const questService = new QuestServiceBackend();

export function BuilderQuests({ onCreateQuest, onBack, spaceId }: BuilderQuestsProps) {
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState<'drafts' | 'published' | 'winners'>('drafts');
  const [showCreateQuest, setShowCreateQuest] = useState(false);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<QuestDraft[]>([]);
  const [publishedQuests, setPublishedQuests] = useState<Quest[]>([]);
  const [winnersQuests, setWinnersQuests] = useState<Quest[]>([]);
  const [isLoadingPublished, setIsLoadingPublished] = useState(false);
  const [isLoadingWinners, setIsLoadingWinners] = useState(false);

  // Scroll to top when internal tab changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  // Load drafts from localStorage
  useEffect(() => {
    if (address) {
      const draftsListKey = `quest_drafts_${address.toLowerCase()}`;
      const savedDrafts = localStorage.getItem(draftsListKey);
      console.log('🔍 Loading drafts - Key:', draftsListKey, 'Found:', savedDrafts);
      if (savedDrafts) {
        try {
          const draftsList: QuestDraft[] = JSON.parse(savedDrafts);
          console.log('📋 All drafts:', draftsList);
          // Filter by spaceId if provided
          // If spaceId is provided, show drafts matching that spaceId OR drafts with no spaceId
          // If no spaceId, show all drafts
          const filteredDrafts = spaceId 
            ? draftsList.filter(d => {
                // Match if spaceId matches OR if draft has no spaceId (legacy drafts)
                return d.spaceId === spaceId || !d.spaceId;
              })
            : draftsList;
          console.log('✅ Filtered drafts (spaceId:', spaceId, '):', filteredDrafts);
          // Sort by updatedAt (newest first)
          filteredDrafts.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
          setDrafts(filteredDrafts);
        } catch (error) {
          console.error('❌ Error loading drafts:', error);
          setDrafts([]);
        }
      } else {
        console.log('⚠️ No drafts found in localStorage');
        setDrafts([]);
      }
    } else {
      setDrafts([]);
    }
  }, [address, spaceId, showCreateQuest]);

  // Load published quests from backend and localStorage
  useEffect(() => {
    const loadPublishedQuests = async () => {
      if (!address || activeTab !== 'published') return;

      setIsLoadingPublished(true);
      try {
        // Fetch from backend
        const allQuests = await questService.getAllQuests();
        const userQuests = allQuests.filter(
          (q: Quest) => q.creatorAddress?.toLowerCase() === address.toLowerCase()
        );

        // Also check localStorage for published quests
        let localPublishedQuests: any[] = [];
        
        try {
          // Check published quests
          const publishedQuestsKey = `published_quests_${address.toLowerCase()}`;
          const storedPublishedQuests = localStorage.getItem(publishedQuestsKey);
          if (storedPublishedQuests) {
            const parsedQuests = JSON.parse(storedPublishedQuests);
            parsedQuests.forEach((quest: any) => {
              if (quest.creatorAddress?.toLowerCase() === address.toLowerCase()) {
                localPublishedQuests.push({
                  id: quest.id,
                  title: quest.title,
                  description: quest.description || '',
                  createdAt: quest.createdAt || Date.now(),
                  status: quest.status || 'active',
                  creatorAddress: quest.creatorAddress,
                });
              }
            });
          }
        } catch (error) {
          console.warn('Error reading published quests from localStorage:', error);
        }

        // Combine backend and localStorage, removing duplicates
        const allPublishedQuests = [...userQuests];
        const seenIds = new Set(userQuests.map((q: Quest) => q.id));
        
        localPublishedQuests.forEach((localQuest: any) => {
          if (!seenIds.has(localQuest.id)) {
            allPublishedQuests.push(localQuest as Quest);
            seenIds.add(localQuest.id);
          }
        });

        // Sort by creation date (newest first)
        allPublishedQuests.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        
        setPublishedQuests(allPublishedQuests);
      } catch (error) {
        console.error('Error loading published quests:', error);
        setPublishedQuests([]);
      } finally {
        setIsLoadingPublished(false);
      }
    };

    loadPublishedQuests();
  }, [address, activeTab, showCreateQuest]);

  // Listen for quest deletion events
  useEffect(() => {
    const handleQuestDeleted = () => {
      // Reload published quests when a quest is deleted
      if (activeTab === 'published' && address) {
        const loadPublishedQuests = async () => {
          setIsLoadingPublished(true);
          try {
            // Fetch from backend
            const allQuests = await questService.getAllQuests();
            const userQuests = allQuests.filter(
              (q: Quest) => q.creatorAddress?.toLowerCase() === address.toLowerCase()
            );

            // Also check localStorage for published quests
            let localPublishedQuests: any[] = [];
            
            try {
              // Check published quests
              const publishedQuestsKey = `published_quests_${address.toLowerCase()}`;
              const storedPublishedQuests = localStorage.getItem(publishedQuestsKey);
              if (storedPublishedQuests) {
                const parsedQuests = JSON.parse(storedPublishedQuests);
                parsedQuests.forEach((quest: any) => {
                  if (quest.creatorAddress?.toLowerCase() === address.toLowerCase()) {
                    localPublishedQuests.push({
                      id: quest.id,
                      title: quest.title,
                      description: quest.description || '',
                      createdAt: quest.createdAt || Date.now(),
                      status: quest.status || 'active',
                      creatorAddress: quest.creatorAddress,
                    });
                  }
                });
              }
            } catch (error) {
              console.warn('Error reading published quests from localStorage:', error);
            }

            // Combine backend and localStorage, removing duplicates
            const allPublishedQuests = [...userQuests];
            const seenIds = new Set(userQuests.map((q: Quest) => q.id));
            
            localPublishedQuests.forEach((localQuest: any) => {
              if (!seenIds.has(localQuest.id)) {
                allPublishedQuests.push(localQuest as Quest);
                seenIds.add(localQuest.id);
              }
            });

            // Sort by creation date (newest first)
            allPublishedQuests.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            
            setPublishedQuests(allPublishedQuests);
          } catch (error) {
            console.error('Error loading published quests:', error);
            setPublishedQuests([]);
          } finally {
            setIsLoadingPublished(false);
          }
        };
        loadPublishedQuests();
      }
      // Also clear selected quest if it was deleted
      setSelectedQuestId(null);
    };
    
    window.addEventListener('questDeleted', handleQuestDeleted);
    return () => {
      window.removeEventListener('questDeleted', handleQuestDeleted);
    };
  }, [address, activeTab]);

  // Listen for quest publication events
  useEffect(() => {
    const handleQuestPublished = () => {
      // Reload drafts to remove published one
      if (address) {
        const draftsListKey = `quest_drafts_${address.toLowerCase()}`;
        const savedDrafts = localStorage.getItem(draftsListKey);
        if (savedDrafts) {
          try {
            const draftsList: QuestDraft[] = JSON.parse(savedDrafts);
            const filteredDrafts = spaceId 
              ? draftsList.filter(d => {
                  return d.spaceId === spaceId || !d.spaceId;
                })
              : draftsList;
            filteredDrafts.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
            setDrafts(filteredDrafts);
          } catch (error) {
            console.error('Error reloading drafts:', error);
          }
        }
      }
      
      if (activeTab === 'published') {
        // Reload published quests
        const loadPublishedQuests = async () => {
          if (!address) return;
          setIsLoadingPublished(true);
          try {
            const allQuests = await questService.getAllQuests();
            const userQuests = allQuests.filter(
              (q: Quest) => q.creatorAddress?.toLowerCase() === address.toLowerCase()
            );

            // Also check localStorage for published quests
            let localPublishedQuests: any[] = [];
            try {
              const publishedQuestsKey = `published_quests_${address.toLowerCase()}`;
              const storedPublishedQuests = localStorage.getItem(publishedQuestsKey);
              if (storedPublishedQuests) {
                const parsedQuests = JSON.parse(storedPublishedQuests);
                parsedQuests.forEach((quest: any) => {
                  if (quest.creatorAddress?.toLowerCase() === address.toLowerCase()) {
                    localPublishedQuests.push({
                      id: quest.id,
                      title: quest.title,
                      description: quest.description || '',
                      createdAt: quest.createdAt || Date.now(),
                      status: quest.status || 'active',
                      creatorAddress: quest.creatorAddress,
                    });
                  }
                });
              }
            } catch (error) {
              console.warn('Error reading published quests from localStorage:', error);
            }

            // Combine backend and localStorage, removing duplicates
            const allPublishedQuests = [...userQuests];
            const seenIds = new Set(userQuests.map((q: Quest) => q.id));
            
            localPublishedQuests.forEach((localQuest: any) => {
              if (!seenIds.has(localQuest.id)) {
                allPublishedQuests.push(localQuest as Quest);
                seenIds.add(localQuest.id);
              }
            });

            allPublishedQuests.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            setPublishedQuests(allPublishedQuests);
          } catch (error) {
            console.error('Error reloading published quests:', error);
          } finally {
            setIsLoadingPublished(false);
          }
        };
        loadPublishedQuests();
      }
    };

    window.addEventListener('questPublished', handleQuestPublished);

    return () => {
      window.removeEventListener('questPublished', handleQuestPublished);
    };
  }, [address, activeTab, spaceId]);

  // Load winners quests (concluded quests)
  useEffect(() => {
    const loadWinnersQuests = async () => {
      if (!address || activeTab !== 'winners') return;

      setIsLoadingWinners(true);
      try {
        // Fetch from backend
        const allQuests = await questService.getAllQuests();
        const userQuests = allQuests.filter(
          (q: Quest) => q.creatorAddress?.toLowerCase() === address.toLowerCase()
        );

        // Also check localStorage for published quests
        let localPublishedQuests: any[] = [];
        
        try {
          const publishedQuestsKey = `published_quests_${address.toLowerCase()}`;
          const storedPublishedQuests = localStorage.getItem(publishedQuestsKey);
          if (storedPublishedQuests) {
            const parsedQuests = JSON.parse(storedPublishedQuests);
            parsedQuests.forEach((quest: any) => {
              if (quest.creatorAddress?.toLowerCase() === address.toLowerCase()) {
                localPublishedQuests.push({
                  id: quest.id,
                  title: quest.title,
                  description: quest.description || '',
                  createdAt: quest.createdAt || Date.now(),
                  status: quest.status || 'active',
                  creatorAddress: quest.creatorAddress,
                  expiresAt: quest.expiresAt,
                  distributionType: quest.distributionType,
                  numberOfWinners: quest.numberOfWinners,
                });
              }
            });
          }
        } catch (error) {
          console.warn('Error reading published quests from localStorage:', error);
        }

        // Combine backend and localStorage, removing duplicates
        const allPublishedQuests = [...userQuests];
        const seenIds = new Set(userQuests.map((q: Quest) => q.id));
        
        localPublishedQuests.forEach((localQuest: any) => {
          if (!seenIds.has(localQuest.id)) {
            allPublishedQuests.push(localQuest as Quest);
            seenIds.add(localQuest.id);
          }
        });

        // Filter for concluded quests (expired or completed)
        const now = Date.now();
        const concludedQuests = allPublishedQuests.filter((quest: Quest) => {
          // Quest is concluded if:
          // 1. It has an expiresAt timestamp and it's in the past
          // 2. Or status is 'completed'
          if (quest.status === 'completed') return true;
          if (quest.expiresAt && quest.expiresAt < now) return true;
          return false;
        });

        // Calculate winners for each concluded quest if not already calculated
        concludedQuests.forEach((quest: Quest) => {
          const existingWinners = getQuestWinners(quest.id);
          if (existingWinners.length === 0 && quest.expiresAt && quest.distributionType && quest.numberOfWinners) {
            // Calculate winners if quest has ended and winners haven't been calculated
            try {
              const numWinners = typeof quest.numberOfWinners === 'string' 
                ? parseInt(quest.numberOfWinners, 10) 
                : quest.numberOfWinners;
              if (numWinners > 0) {
                calculateAndSaveWinners(
                  quest.id,
                  numWinners,
                  quest.distributionType,
                  quest.expiresAt
                );
              }
            } catch (error) {
              console.error('Error calculating winners for quest:', quest.id, error);
            }
          }
        });

        // Sort by expiration date (most recent first)
        concludedQuests.sort((a, b) => {
          const aTime = a.expiresAt || a.createdAt || 0;
          const bTime = b.expiresAt || b.createdAt || 0;
          return bTime - aTime;
        });
        
        setWinnersQuests(concludedQuests);
      } catch (error) {
        console.error('Error loading winners quests:', error);
        setWinnersQuests([]);
      } finally {
        setIsLoadingWinners(false);
      }
    };

    loadWinnersQuests();
  }, [address, activeTab, showCreateQuest]);


  if (showCreateQuest) {
    return (
      <CreateQuestBuilder
        onBack={() => {
          setShowCreateQuest(false);
          setSelectedDraftId(null);
        }}
        onSave={() => {
          // Draft is saved automatically in handleSave
          // The useEffect will reload drafts when showCreateQuest changes
        }}
        onNext={() => {
          // Move to next step or complete
          console.log('Moving to next step...');
        }}
        spaceId={spaceId}
        draftId={selectedDraftId || undefined}
      />
    );
  }

  return (
    <div className="builder-quests-container">
      {onBack && (
        <button className="builder-quests-back-button" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back
        </button>
      )}
      <h1 className="builder-quests-title">Quests</h1>

      {/* Sub-navigation Tabs */}
      <div className="builder-quests-tabs">
        <button
          className={`builder-quests-tab ${activeTab === 'drafts' ? 'active' : ''}`}
          onClick={() => setActiveTab('drafts')}
        >
          Drafts
        </button>
        <button
          className={`builder-quests-tab ${activeTab === 'published' ? 'active' : ''}`}
          onClick={() => setActiveTab('published')}
        >
          Published
        </button>
        <button
          className={`builder-quests-tab ${activeTab === 'winners' ? 'active' : ''}`}
          onClick={() => setActiveTab('winners')}
        >
          Winners
        </button>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'drafts' ? (
        /* Drafts List or Empty State */
        drafts.length > 0 ? (
          <div className="builder-quests-drafts-grid">
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className="builder-quests-draft-card"
                onClick={() => {
                  setSelectedDraftId(draft.id);
                  setShowCreateQuest(true);
                }}
              >
                <div className="builder-quests-draft-header">
                  <div className="builder-quests-draft-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                    </svg>
                  </div>
                  <div className="builder-quests-draft-status">
                    <span className="builder-quests-draft-status-badge">Draft</span>
                  </div>
                </div>
                <h3 className="builder-quests-draft-title">{draft.title || 'Untitled Quest'}</h3>
                <p className="builder-quests-draft-meta">
                  {draft.currentStep ? `Step ${draft.currentStep} of 5` : 'Not started'}
                </p>
                <p className="builder-quests-draft-date">
                  Last updated: {new Date(draft.updatedAt).toLocaleDateString()}
                </p>
              </div>
            ))}
            <div
              className="builder-quests-draft-card builder-quests-draft-card-new"
              onClick={() => {
                setSelectedDraftId(null);
                setShowCreateQuest(true);
                onCreateQuest?.();
              }}
            >
              <div className="builder-quests-draft-new-content">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                <span className="builder-quests-draft-new-text">Create New Quest</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="builder-quests-empty-state">
            <div className="builder-quests-empty-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            </div>
            <h2 className="builder-quests-empty-title">Create your first draft</h2>
            <p className="builder-quests-empty-description">
              Click the button below to start creating your first draft.
            </p>
            <button className="builder-quests-create-button" onClick={() => {
              setSelectedDraftId(null);
              setShowCreateQuest(true);
              onCreateQuest?.();
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Create Quest
            </button>
          </div>
        )
      ) : activeTab === 'published' ? (
        /* Published Quests List or Empty State */
        isLoadingPublished ? (
          <div className="builder-quests-empty-state">
            <div className="builder-quests-empty-icon">
              <div className="spinner"></div>
            </div>
            <h2 className="builder-quests-empty-title">Loading published quests...</h2>
          </div>
        ) : selectedQuestId ? (
          <QuestDetail 
            questId={selectedQuestId}
            onBack={() => setSelectedQuestId(null)}
            isFromBuilder={true}
          />
        ) : publishedQuests.length > 0 ? (
          <div className="builder-quests-drafts-grid">
            {publishedQuests.map((quest) => (
              <div
                key={quest.id}
                className="builder-quests-draft-card"
                onClick={() => setSelectedQuestId(quest.id)}
                style={{ cursor: 'pointer' }}
              >
                <div className="builder-quests-draft-header">
                  <div className="builder-quests-draft-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                    </svg>
                  </div>
                  <div className="builder-quests-draft-status">
                    <span className="builder-quests-draft-status-badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.5)' }}>
                      Published
                    </span>
                  </div>
                </div>
                <h3 className="builder-quests-draft-title">{quest.title}</h3>
                <p className="builder-quests-draft-meta">
                  {quest.completedBy?.length || 0} completion{(quest.completedBy?.length || 0) !== 1 ? 's' : ''}
                </p>
                <p className="builder-quests-draft-date">
                  Published: {new Date(quest.createdAt || Date.now()).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="builder-quests-empty-state">
            <div className="builder-quests-empty-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            </div>
            <h2 className="builder-quests-empty-title">No published quests yet</h2>
            <p className="builder-quests-empty-description">
              Publish a quest from your drafts to see it here.
            </p>
          </div>
        )
      ) : activeTab === 'winners' ? (
        /* Winners Quests List or Empty State */
        isLoadingWinners ? (
          <div className="builder-quests-empty-state">
            <div className="builder-quests-empty-icon">
              <div className="spinner"></div>
            </div>
            <h2 className="builder-quests-empty-title">Loading winners quests...</h2>
          </div>
        ) : selectedQuestId ? (
          <QuestWinnersView 
            questId={selectedQuestId}
            onBack={() => setSelectedQuestId(null)}
          />
        ) : winnersQuests.length > 0 ? (
          <div className="builder-quests-drafts-grid">
            {winnersQuests.map((quest) => {
              const winners = getQuestWinners(quest.id);
              const completions = getQuestCompletions(quest.id);
              return (
                <div
                  key={quest.id}
                  className="builder-quests-draft-card"
                  onClick={() => setSelectedQuestId(quest.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="builder-quests-draft-header">
                    <div className="builder-quests-draft-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                    </div>
                    <div className="builder-quests-draft-status">
                      <span className="builder-quests-draft-status-badge" style={{ background: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.5)' }}>
                        Concluded
                      </span>
                    </div>
                  </div>
                  <h3 className="builder-quests-draft-title">{quest.title}</h3>
                  <p className="builder-quests-draft-meta">
                    {winners.length > 0 ? `${winners.length} winner${winners.length !== 1 ? 's' : ''}` : 'No winners yet'}
                    {completions.length > 0 && ` • ${completions.length} participant${completions.length !== 1 ? 's' : ''}`}
                  </p>
                  <p className="builder-quests-draft-date">
                    {quest.expiresAt ? `Ended: ${new Date(quest.expiresAt).toLocaleDateString()}` : `Created: ${new Date(quest.createdAt || Date.now()).toLocaleDateString()}`}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="builder-quests-empty-state">
            <div className="builder-quests-empty-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <h2 className="builder-quests-empty-title">No concluded quests yet</h2>
            <p className="builder-quests-empty-description">
              Concluded quests will appear here once they end.
            </p>
          </div>
        )
      ) : null}
    </div>
  );
}

// Quest Winners View Component
interface QuestWinnersViewProps {
  questId: string;
  onBack: () => void;
}

function QuestWinnersView({ questId, onBack }: QuestWinnersViewProps) {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { isAdmin: isAdminUser } = useAdmin();
  const [quest, setQuest] = useState<Quest | null>(null);
  const [winners, setWinners] = useState<string[]>([]);
  const [completions, setCompletions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDistributing, setIsDistributing] = useState(false);
  const [depositInfo, setDepositInfo] = useState<{
    totalAmount: string;
    isDistributed: boolean;
  } | null>(null);

  // Check if current user is the creator or admin
  const isCreator = quest && address && quest.creatorAddress?.toLowerCase() === address.toLowerCase();
  const canDistribute = isCreator || isAdminUser;

  useEffect(() => {
    const loadQuestData = async () => {
      setIsLoading(true);
      try {
        // Load quest from localStorage or backend
        let foundQuest: Quest | null = null;
        
        if (isAdminUser) {
          // Admin can search all localStorage keys for quests
          const allKeys = Object.keys(localStorage);
          for (const key of allKeys) {
            if (key.startsWith('published_quests_')) {
              try {
                const quests = JSON.parse(localStorage.getItem(key) || '[]');
                const quest = quests.find((q: Quest) => q.id === questId);
                if (quest) {
                  foundQuest = quest;
                  break;
                }
              } catch (e) {
                // Skip invalid entries
              }
            }
          }
        } else if (address) {
          // Creator can only access their own quests
          const publishedQuestsKey = `published_quests_${address.toLowerCase()}`;
          const stored = localStorage.getItem(publishedQuestsKey);
          if (stored) {
            const quests = JSON.parse(stored);
            foundQuest = quests.find((q: Quest) => q.id === questId) || null;
          }
        }

        // Also try backend (admin can access any quest, creator can only access their own)
        if (!foundQuest) {
          try {
            const allQuests = await questService.getAllQuests();
            if (isAdminUser) {
              // Admin can access any quest
              foundQuest = allQuests.find((q: Quest) => q.id === questId) || null;
            } else {
              // Creator can only access their own quests
              foundQuest = allQuests.find((q: Quest) => q.id === questId && q.creatorAddress?.toLowerCase() === address?.toLowerCase()) || null;
            }
          } catch (error) {
            console.warn('Error loading from backend:', error);
          }
        }

        if (foundQuest) {
          setQuest(foundQuest);

          // Load completions
          const questCompletions = getQuestCompletions(questId);
          setCompletions(questCompletions);

          // Check if quest has ended and calculate winners if needed
          const now = Date.now();
          const hasEnded = foundQuest.expiresAt && foundQuest.expiresAt < now;
          const existingWinners = getQuestWinners(questId);

          if (hasEnded && existingWinners.length === 0 && foundQuest.distributionType && foundQuest.numberOfWinners && foundQuest.expiresAt) {
            // Calculate winners if quest has ended and winners haven't been calculated
            try {
              const calculatedWinners = calculateAndSaveWinners(
                questId,
                typeof foundQuest.numberOfWinners === 'string' 
                  ? parseInt(foundQuest.numberOfWinners, 10) 
                  : foundQuest.numberOfWinners,
                foundQuest.distributionType,
                foundQuest.expiresAt
              );
              setWinners(calculatedWinners);
            } catch (error) {
              console.error('Error calculating winners:', error);
              setWinners([]);
            }
          } else {
            // Load existing winners
            setWinners(existingWinners);
          }

          // Load deposit info from escrow - DISABLED: contracts deleted
          if (publicClient) {
            try {
              // Contract functionality disabled
              setDepositInfo({
                totalAmount: '0',
                isDistributed: false,
              });
            } catch (error) {
              console.warn('Could not load deposit info (quest may not have deposit yet):', error);
            }
          }
        }
      } catch (error) {
        console.error('Error loading quest winners data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (questId && (address || isAdminUser)) {
      loadQuestData();
    }
  }, [questId, address, publicClient, isAdminUser]);

  const handleDistributeRewards = async () => {
    if (!address || !walletClient || !publicClient || !quest || winners.length === 0) {
      showToast('Missing required information for distribution', 'error');
      return;
    }

    // Check permissions: must be creator or admin
    const isCreator = quest.creatorAddress?.toLowerCase() === address.toLowerCase();
    if (!isCreator && !isAdminUser) {
      showToast('Only quest creator or admin can distribute rewards', 'error');
      return;
    }

    if (!quest.winnerPrizes || quest.winnerPrizes.length === 0) {
      showToast('Winner prizes not configured', 'error');
      return;
    }

    setIsDistributing(true);
    try {
      // Prepare winner addresses and amounts
      const winnerAddresses = winners.map(w => w as `0x${string}`);
      const amounts = winners.map((_, index) => {
        const prize = quest.winnerPrizes?.[index] || '0';
        return prize;
      });

      // Contract functionality disabled - contracts deleted
      // First, set winners in escrow contract - DISABLED
      showToast('Setting winners functionality disabled - contracts deleted', 'warning');
      // const setWinnersHash = await setWinners(questId, winnerAddresses, amounts, walletClient);
      // await publicClient.waitForTransactionReceipt({ hash: setWinnersHash });

      // Then distribute rewards - DISABLED
      showToast('Distributing rewards functionality disabled - contracts deleted', 'warning');
      // const distributeHash = await distributeRewards(questId, walletClient);
      // await publicClient.waitForTransactionReceipt({ hash: distributeHash });

      // Update deposit info - DISABLED
      // const deposit = await getQuestDeposit(questId, publicClient);
      setDepositInfo({
        totalAmount: '0',
        isDistributed: false,
      });

      showToast('Reward distribution disabled - contracts deleted', 'warning');
    } catch (error: any) {
      console.error('Distribution error:', error);
      showToast(error?.message || 'Failed to distribute rewards', 'error');
    } finally {
      setIsDistributing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="builder-quests-empty-state">
        <div className="builder-quests-empty-icon">
          <div className="spinner"></div>
        </div>
        <h2 className="builder-quests-empty-title">Loading winners...</h2>
      </div>
    );
  }

  if (!quest) {
    return (
      <div className="builder-quests-empty-state">
        <h2 className="builder-quests-empty-title">Quest not found</h2>
        <p className="builder-quests-empty-description">
          {!isAdminUser && address ? 'You can only view quests you created' : 'Quest not found'}
        </p>
        <button className="builder-quests-create-button" onClick={onBack}>
          Back to Winners
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <button 
        className="builder-quests-back-button" 
        onClick={onBack}
        style={{ marginBottom: '2rem' }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Back to Winners
      </button>

      <div style={{ 
        background: 'rgba(26, 31, 53, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '2rem',
        marginBottom: '2rem'
      }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: '#fff' }}>
          {quest.title}
        </h2>
        <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '1rem' }}>
          {quest.description}
        </p>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <span style={{ 
            padding: '0.5rem 1rem', 
            background: 'rgba(251, 191, 36, 0.2)', 
            color: '#fbbf24',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: 600
          }}>
            {quest.distributionType?.toUpperCase() || 'FCFS'}
          </span>
          {quest.expiresAt && (
            <span style={{ 
              padding: '0.5rem 1rem', 
              background: 'rgba(255, 255, 255, 0.05)', 
              color: 'rgba(255, 255, 255, 0.7)',
              borderRadius: '8px',
              fontSize: '0.875rem'
            }}>
              Ended: {new Date(quest.expiresAt).toLocaleString()}
            </span>
          )}
        </div>
      </div>

      <div style={{ 
        background: 'rgba(26, 31, 53, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '2rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff' }}>
            Winners ({winners.length})
          </h3>
          {winners.length > 0 && quest && quest.winnerPrizes && quest.winnerPrizes.length > 0 && !depositInfo?.isDistributed && (
            <button
              onClick={handleDistributeRewards}
              disabled={isDistributing || !walletClient || !publicClient || !address}
              style={{
                padding: '0.75rem 1.5rem',
                background: isDistributing ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.2)',
                border: '1px solid rgba(34, 197, 94, 0.5)',
                borderRadius: '8px',
                color: '#22c55e',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: (isDistributing || !walletClient || !publicClient || !address) ? 'not-allowed' : 'pointer',
                opacity: (isDistributing || !walletClient || !publicClient || !address) ? 0.5 : 1,
                transition: 'all 0.2s ease'
              }}
              title={isAdminUser && !isCreator ? 'Admin: Distribute rewards on behalf of creator' : 'Distribute rewards to winners'}
              onMouseEnter={(e) => {
                if (!isDistributing && walletClient && publicClient && address) {
                  e.currentTarget.style.background = 'rgba(34, 197, 94, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isDistributing && walletClient && publicClient && address) {
                  e.currentTarget.style.background = 'rgba(34, 197, 94, 0.2)';
                }
              }}
            >
              {isDistributing ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline-block', marginRight: '8px', animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 11-6.219-8.56"/>
                  </svg>
                  Distributing...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline-block', marginRight: '8px' }}>
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  Distribute Rewards
                </>
              )}
            </button>
          )}
          {depositInfo?.isDistributed && (
            <div style={{
              padding: '0.75rem 1.5rem',
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '8px',
              color: '#22c55e',
              fontSize: '0.875rem',
              fontWeight: 600
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline-block', marginRight: '8px' }}>
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              Rewards Distributed
            </div>
          )}
        </div>
        {winners.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {winners.map((winnerAddress, index) => {
              const completion = completions.find(c => c.address.toLowerCase() === winnerAddress.toLowerCase());
              return (
                <div 
                  key={winnerAddress}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '1.125rem'
                    }}>
                      #{index + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#fff', marginBottom: '0.25rem' }}>
                        {winnerAddress.slice(0, 6)}...{winnerAddress.slice(-4)}
                      </div>
                      {completion && (
                        <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                          Completed: {new Date(completion.completedAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{
                    padding: '0.5rem 1rem',
                    background: 'rgba(34, 197, 94, 0.2)',
                    color: '#22c55e',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: 600
                  }}>
                    Winner
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ 
            padding: '3rem', 
            textAlign: 'center', 
            color: 'rgba(255, 255, 255, 0.6)'
          }}>
            <p>No winners selected yet.</p>
            {completions.length > 0 && (
              <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                {completions.length} participant{completions.length !== 1 ? 's' : ''} completed this quest.
              </p>
            )}
          </div>
        )}
      </div>

      {completions.length > 0 && (
        <div style={{ 
          background: 'rgba(26, 31, 53, 0.3)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '2rem',
          marginTop: '2rem'
        }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: '#fff' }}>
            All Participants ({completions.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto' }}>
            {completions
              .sort((a, b) => a.completedAt - b.completedAt)
              .map((completion, index) => {
                const isWinner = winners.includes(completion.address.toLowerCase());
                return (
                  <div 
                    key={completion.address}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      background: isWinner ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                      borderRadius: '8px',
                      border: isWinner ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ 
                        fontSize: '0.875rem', 
                        color: 'rgba(255, 255, 255, 0.5)',
                        minWidth: '2rem'
                      }}>
                        #{index + 1}
                      </span>
                      <span style={{ color: '#fff', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                        {completion.address.slice(0, 6)}...{completion.address.slice(-4)}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                        {new Date(completion.completedAt).toLocaleString()}
                      </span>
                    </div>
                    {isWinner && (
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        background: 'rgba(34, 197, 94, 0.2)',
                        color: '#22c55e',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}>
                        Winner
                      </span>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
