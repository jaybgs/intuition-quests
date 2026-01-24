import { useState, useEffect, useRef } from 'react';
import { useAccount, useWalletClient, usePublicClient, useChainId, useSwitchChain } from 'wagmi';
import { useQuests } from '../hooks/useQuests';
import { useSocialConnections } from '../hooks/useSocialConnections';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';
import { Quest } from '../types';
// ClaimIQ contract service for 1 TRUST fee and IQ awarding
import { claimQuestViaContract, checkClaimStatus } from '../services/claimIQContractService';
import { intuitionChain } from '../config/wagmi';
import { showToast } from './Toast';
import { saveQuestCompletion } from '../utils/raffle';
// Removed questClaimSurchargeService - claiming is now free
// Removed CONTRACT_ADDRESSES and formatUnits - no longer needed for free claiming
import { useSubscription } from '../hooks/useSubscription';
import { spaceService } from '../services/spaceService';
import { questServiceSupabase } from '../services/questServiceSupabase';
import { useWalletSocialConnections } from '../hooks/useWalletSocialConnections';
// TODO: Implement your own task verification service
import './QuestDetail.css';

interface QuestDetailProps {
  questId: string;
  onBack: () => void;
  onNavigateToProfile?: () => void;
  isFromBuilder?: boolean;
  onEdit?: (questId: string) => void;
}

type VerificationStatus = 'idle' | 'verifying' | 'verified' | 'failed' | 'cooldown';

interface StepVerificationState {
  status: VerificationStatus;
  cooldownEnd?: number;
}

export function QuestDetail({ questId, onBack, onNavigateToProfile, isFromBuilder = false, onEdit }: QuestDetailProps) {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { quests, completeQuest, isCompleting } = useQuests();
  const queryClient = useQueryClient();
  const { isPro } = useSubscription();
  const { hasConnectedProvider } = useSocialConnections();
  const [quest, setQuest] = useState<Quest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [verificationStates, setVerificationStates] = useState<Record<string, StepVerificationState>>({});
  const [showSocialPopup, setShowSocialPopup] = useState(false);
  const [missingSocialAccount, setMissingSocialAccount] = useState<string>('');
  const [isClaimed, setIsClaimed] = useState(false);
  const [isCheckingClaim, setIsCheckingClaim] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [spaceTwitterUrl, setSpaceTwitterUrl] = useState<string | null>(null);
  const [creatorIsPro, setCreatorIsPro] = useState(false);
  const [showFeedbackTooltip, setShowFeedbackTooltip] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReadDocsModal, setShowReadDocsModal] = useState(false);
  const [currentReadDocsStep, setCurrentReadDocsStep] = useState<any>(null);
  const [readDocuments, setReadDocuments] = useState<Record<string, Set<number>>>({});
  const [showQuoteTweetModal, setShowQuoteTweetModal] = useState(false);
  const [currentQuoteStep, setCurrentQuoteStep] = useState<any>(null);
  const [quoteTweetUrl, setQuoteTweetUrl] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);


  // Save verification states to localStorage whenever they change
  useEffect(() => {
    if (questId && address && Object.keys(verificationStates).length > 0) {
      const storageKey = `quest_verification_${questId}_${address.toLowerCase()}`;
      localStorage.setItem(storageKey, JSON.stringify(verificationStates));
    }
  }, [verificationStates, questId, address]);

  // Update cooldown timers in real-time
  useEffect(() => {
    const interval = setInterval(() => {
      setVerificationStates(prev => {
        const updated: Record<string, StepVerificationState> = {};
        let hasChanges = false;

        Object.entries(prev).forEach(([stepId, state]) => {
          if (state.status === 'cooldown' && state.cooldownEnd) {
            const now = Date.now();
            if (now >= state.cooldownEnd) {
              updated[stepId] = { status: 'idle' };
              hasChanges = true;
            } else {
              updated[stepId] = state;
            }
          } else {
            updated[stepId] = state;
          }
        });

        return hasChanges ? updated : prev;
      });
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, []);

  // Check if quest is already claimed (both on-chain and database)
  useEffect(() => {
    const checkAndSyncClaimStatus = async () => {
      if (!address || !quest || !publicClient) {
        setIsClaimed(false);
        return;
      }

      try {
        // Check on-chain status first (authoritative source)
        const questAtomId = quest.atomId || '1';
        const hasClaimedOnChain = await checkClaimStatus(address, questAtomId, publicClient);

        if (hasClaimedOnChain) {
          // Quest claimed on-chain, ensure database reflects this
          setIsClaimed(true);

          // Sync with backend if not already in database
          try {
            await apiClient.completeQuest(quest.id);
            console.log('✅ Database synced with on-chain claim');
          } catch (syncError) {
            // If sync fails, it's likely already in database (duplicate key error)
            // This is fine - the quest is claimed
            console.log('Database sync skipped (likely already synced):', syncError);
          }
        } else {
          // Check localStorage for backward compatibility
          const claimedQuests = JSON.parse(localStorage.getItem(`claimed_quests_${address.toLowerCase()}`) || '[]');
          const localClaimed = claimedQuests.includes(quest.id);
          setIsClaimed(localClaimed);
        }
      } catch (error) {
        console.warn('Error checking claim status:', error);
        // Fallback to localStorage
        const claimedQuests = JSON.parse(localStorage.getItem(`claimed_quests_${address.toLowerCase()}`) || '[]');
        const localClaimed = claimedQuests.includes(quest.id);
        setIsClaimed(localClaimed);
      }
    };

    checkAndSyncClaimStatus();
  }, [address, quest?.id, publicClient]);

  // Fetch space data to get Twitter URL and check creator's pro status
  useEffect(() => {
    if (!quest) return;

    // Get space Twitter URL - try multiple sources
    // First check quest.twitterLink directly
    if (quest.twitterLink) {
      setSpaceTwitterUrl(quest.twitterLink);
    }

    // Then try to get from space if projectId exists and looks like a valid space ID (UUID)
    if (quest.projectId && quest.projectId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      spaceService.getSpaceById(quest.projectId).then(space => {
        if (space?.twitterUrl) {
          setSpaceTwitterUrl(space.twitterUrl);
        }
      }).catch(error => {
        console.warn('Error fetching space:', error);
      });
    }

    // Check if creator has pro subscription
    const checkSubscription = async () => {
      if (quest.creatorAddress) {
        try {
          const { subscriptionService } = await import('../services/subscriptionService');
          const creatorTier = subscriptionService.getSubscription(quest.creatorAddress);
          setCreatorIsPro(creatorTier === 'pro');
        } catch (error) {
          console.warn('Error checking creator subscription:', error);
          setCreatorIsPro(false);
        }
      } else if (quest.creatorType !== 'community') {
        // For project creators, check by project owner
        if (quest.projectId) {
          try {
            const space = await spaceService.getSpaceById(quest.projectId);
            if (space?.ownerAddress) {
              const { subscriptionService } = await import('../services/subscriptionService');
              const creatorTier = subscriptionService.getSubscription(space.ownerAddress);
              setCreatorIsPro(creatorTier === 'pro');
            }
          } catch (error) {
            console.warn('Error checking creator subscription:', error);
            setCreatorIsPro(false);
          }
        }
      }
    };

    checkSubscription();
  }, [quest]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  useEffect(() => {
    // Find quest by ID from cached data first
    let foundQuest = quests.find(q => q.id === questId);

    // If not found and questId looks like a slug (contains hyphens and no 'quest_' prefix),
    // try to find by title slug match
    if (!foundQuest && questId && questId.includes('-') && !questId.startsWith('quest_')) {
      // This looks like a slug, try to find quest by title
      const normalizedSlug = questId.toLowerCase().replace(/[^a-z0-9-]/g, '');
      foundQuest = quests.find(q => {
        if (!q.title) return false;
        const questSlug = q.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        return questSlug === normalizedSlug;
      });
      if (foundQuest) {
        console.log('Found quest by slug match:', foundQuest.title);
      }
    }

    if (foundQuest) {
      // Process quest found in cache
      processQuest(foundQuest);
    } else if (questId) {
      // If not found in cached data, try to fetch directly from API
      console.log('Quest not found in cached data, trying direct API fetch:', questId);

      // Check if questId looks like a valid quest ID (starts with 'quest_')
      if (questId.startsWith('quest_')) {
        // Fetch by ID
        questServiceSupabase.getQuestById(questId).then(apiQuest => {
          if (apiQuest) {
            console.log('Found quest via direct API fetch by ID:', apiQuest.title);
            processQuest(apiQuest);
          } else {
            console.log('Quest not found in API by ID either, showing not found');
            setIsLoading(false);
          }
        }).catch(error => {
          console.error('Error fetching quest from API by ID:', error);
          setIsLoading(false);
        });
      } else {
        // Try to find by title/slug - fetch all quests and find match
        questServiceSupabase.getAllQuests().then(allQuests => {
          const normalizedSlug = questId.toLowerCase().replace(/[^a-z0-9-]/g, '');
          const matchingQuest = allQuests.find(q => {
            if (!q.title) return false;
            const questSlug = q.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            return questSlug === normalizedSlug;
          });

          if (matchingQuest) {
            console.log('Found quest via API search by slug:', matchingQuest.title);
            processQuest(matchingQuest);
          } else {
            console.log('Quest not found in API by slug either, showing not found');
            setIsLoading(false);
          }
        }).catch(error => {
          console.error('Error fetching quests from API for slug search:', error);
          setIsLoading(false);
        });
      }
    } else {
      // No questId provided
      setIsLoading(false);
    }

    function processQuest(foundQuest: any) {
      const questWithDescription = { ...foundQuest };

      // Convert requirements to steps if steps don't exist
      if (!questWithDescription.steps || questWithDescription.steps.length === 0) {
        // Create steps from requirements
        const taskSteps: QuestStep[] = (questWithDescription.requirements || []).map((req: any, index: number) => {
          // Parse the requirement to get task details
          let taskTitle = req.description || req.title || `Task ${index + 1}`;
          let taskLink: string | undefined;

          // Try to parse verification data if it's a string
          try {
            let verificationData: any = req.verification;

            // If verification is a string, try to parse it
            if (typeof req.verification === 'string') {
              try {
                verificationData = JSON.parse(req.verification);
              } catch (e) {
                // If it's not JSON, it might be a plain string
                verificationData = req.verification;
              }
            }

            // Extract task title and link from verification data
            // The config structure from CreateQuestBuilder: { type, description, verification: action.config }
            // So verificationData IS the action.config
            if (verificationData) {
              // Check for nested config first
              if (verificationData.config) {
                taskTitle = verificationData.config.title || verificationData.config.customTitle || taskTitle;
                taskLink = verificationData.config.link || verificationData.config.url || verificationData.config.accountUrl || verificationData.config.profileUrl;
              } else {
                // Direct properties in verificationData (which is action.config)
                if (verificationData.title) {
                  taskTitle = verificationData.title;
                }
                if (verificationData.customTitle) {
                  taskTitle = verificationData.customTitle;
                }
                // Extract link from various possible properties
                taskLink = verificationData.link ||
                  verificationData.url ||
                  verificationData.accountUrl ||
                  verificationData.profileUrl ||
                  verificationData.discordInvite ||
                  verificationData.inviteUrl;
              }

              // Check if this is a Read docs action
              if (verificationData.readDocsConfig?.documents || req.type === 'Read docs') {
                return {
                  id: `step-${index + 1}`,
                  title: taskTitle || `Read docs`,
                  description: req.description || taskTitle,
                  completed: false,
                  link: formattedLink,
                  isReadDocs: true,
                  readDocsConfig: verificationData.readDocsConfig || { documents: [] },
                };
              }
            }
          } catch (e) {
            console.warn('Error parsing requirement verification data:', e);
            // If parsing fails, use description as-is
          }

          // Format link if it exists (ensure it has protocol)
          let formattedLink = taskLink;
          if (taskLink && !taskLink.startsWith('http://') && !taskLink.startsWith('https://')) {
            // Add https:// if missing
            formattedLink = `https://${taskLink}`;
          }

          return {
            id: `step-${index + 1}`,
            title: taskTitle,
            description: req.description || taskTitle,
            completed: false,
            link: formattedLink,
          };
        });

        // Add description step at the beginning
        questWithDescription.steps = [
          {
            id: 'step-0',
            title: questWithDescription.title,
            description: questWithDescription.description,
            completed: false,
          },
          ...taskSteps,
        ];
      } else if (questWithDescription.steps[0]?.id !== 'step-0') {
        // Add description step at the beginning if it doesn't exist
        questWithDescription.steps = [
          {
            id: 'step-0',
            title: questWithDescription.title,
            description: questWithDescription.description,
            completed: false,
          },
          ...questWithDescription.steps,
        ];
      }

      // Also check localStorage for quest data (for quests created locally)
      try {
        const publishedQuestsKey = `published_quests_${foundQuest.creatorAddress?.toLowerCase() || 'unknown'}`;
        const storedPublishedQuests = localStorage.getItem(publishedQuestsKey);
        if (storedPublishedQuests) {
          const parsedQuests = JSON.parse(storedPublishedQuests);
          const localQuest = parsedQuests.find((q: any) => q.id === questId);
          if (localQuest && localQuest.requirements && localQuest.requirements.length > 0) {
            // Use requirements from localStorage if available
            const taskSteps: QuestStep[] = (localQuest.requirements || []).map((req: any, index: number) => {
              let taskTitle = req.description || req.title || `Task ${index + 1}`;
              let taskLink: string | undefined;

              // Parse verification/config data
              try {
                let verificationData: any = req.verification || req.config;

                // If verification is a string, try to parse it
                if (typeof verificationData === 'string') {
                  try {
                    verificationData = JSON.parse(verificationData);
                  } catch (e) {
                    verificationData = verificationData;
                  }
                }

                if (verificationData) {
                  // Check for nested config first
                  if (verificationData.config) {
                    taskTitle = verificationData.config.title || verificationData.config.customTitle || taskTitle;
                    taskLink = verificationData.config.link || verificationData.config.url || verificationData.config.accountUrl || verificationData.config.profileUrl;
                  } else {
                    // Direct properties in verificationData (which is action.config)
                    if (verificationData.title) {
                      taskTitle = verificationData.title;
                    }
                    if (verificationData.customTitle) {
                      taskTitle = verificationData.customTitle;
                    }
                    // Extract link from various possible properties
                    taskLink = verificationData.link ||
                      verificationData.url ||
                      verificationData.accountUrl ||
                      verificationData.profileUrl ||
                      verificationData.discordInvite ||
                      verificationData.inviteUrl;
                  }

                  // Check if this is a Read docs action
                  if (verificationData.readDocsConfig?.documents || req.type === 'Read docs') {
                    // Format link if it exists (ensure it has protocol)
                    let formattedLink = taskLink;
                    if (taskLink && !taskLink.startsWith('http://') && !taskLink.startsWith('https://')) {
                      formattedLink = `https://${taskLink}`;
                    }

                    return {
                      id: `step-${index + 1}`,
                      title: taskTitle || `Read docs`,
                      description: req.description || taskTitle,
                      completed: false,
                      link: formattedLink,
                      isReadDocs: true,
                      readDocsConfig: verificationData.readDocsConfig || { documents: [] },
                    };
                  }
                }
              } catch (e) {
                console.warn('Error parsing requirement verification data:', e);
                // Use description as-is
              }

              // Format link if it exists (ensure it has protocol)
              let formattedLink = taskLink;
              if (taskLink && !taskLink.startsWith('http://') && !taskLink.startsWith('https://')) {
                formattedLink = `https://${taskLink}`;
              }

              return {
                id: `step-${index + 1}`,
                title: taskTitle,
                description: req.description || taskTitle,
                completed: false,
                link: formattedLink,
              };
            });

            questWithDescription.steps = [
              {
                id: 'step-0',
                title: questWithDescription.title,
                description: questWithDescription.description,
                completed: false,
              },
              ...taskSteps,
            ];
          }
        }
      } catch (error) {
        console.warn('Error loading quest from localStorage:', error);
      }

      // Load verification states from localStorage and apply to quest steps
      if (address) {
        const storageKey = `quest_verification_${questId}_${address.toLowerCase()}`;
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setVerificationStates(parsed);

            // Update quest steps to mark verified steps as completed
            questWithDescription.steps = questWithDescription.steps.map(step => {
              const verificationState = parsed[step.id];
              if (verificationState?.status === 'verified') {
                return { ...step, completed: true };
              }
              return step;
            });
          } catch (error) {
            console.error('Error loading verification states:', error);
          }
        }
      }

      setQuest(questWithDescription);
      setCurrentStep(0); // Always start at step 0 (description)
      setIsLoading(false);
    }

    // If quest was not found at all, show not found
    if (!foundQuest) {
      // Also check localStorage directly
      try {
        const keys = Object.keys(localStorage);
        const publishedKeys = keys.filter(key => key.startsWith('published_quests_'));

        for (const key of publishedKeys) {
          const stored = localStorage.getItem(key);
          if (stored) {
            const parsedQuests = JSON.parse(stored);
            const localQuest = parsedQuests.find((q: any) => q.id === questId);
            if (localQuest) {
              // Convert to Quest format
              const questWithDescription: Quest = {
                id: localQuest.id,
                title: localQuest.title,
                description: localQuest.description || '',
                projectId: localQuest.projectId,
                projectName: localQuest.projectName || localQuest.projectId,
                xpReward: localQuest.xpReward || 100,
                requirements: localQuest.requirements || [],
                status: (localQuest.status || 'active') as Quest['status'],
                createdAt: localQuest.createdAt || Date.now(),
                completedBy: localQuest.completedBy || [],
                creatorType: 'community',
                creatorAddress: localQuest.creatorAddress,
                twitterLink: localQuest.twitterLink,
                difficulty: localQuest.difficulty,
                estimatedTime: localQuest.estimatedTime,
                image: localQuest.image,
                expiresAt: localQuest.expiresAt,
              };

              // Convert requirements to steps
              const taskSteps: QuestStep[] = (questWithDescription.requirements || []).map((req: any, index: number) => {
                let taskTitle = req.description || req.title || `Task ${index + 1}`;
                let taskLink: string | undefined;

                try {
                  let verificationData: any = req.verification || req.config;

                  // If verification is a string, try to parse it
                  if (typeof verificationData === 'string') {
                    try {
                      verificationData = JSON.parse(verificationData);
                    } catch (e) {
                      verificationData = verificationData;
                    }
                  }

                  if (verificationData) {
                    // Check for nested config first
                    if (verificationData.config) {
                      taskTitle = verificationData.config.title || verificationData.config.customTitle || taskTitle;
                      taskLink = verificationData.config.link || verificationData.config.url || verificationData.config.accountUrl || verificationData.config.profileUrl;
                    } else {
                      // Direct properties in verificationData (which is action.config)
                      if (verificationData.title) {
                        taskTitle = verificationData.title;
                      }
                      if (verificationData.customTitle) {
                        taskTitle = verificationData.customTitle;
                      }
                      // Extract link from various possible properties
                      taskLink = verificationData.link ||
                        verificationData.url ||
                        verificationData.accountUrl ||
                        verificationData.profileUrl ||
                        verificationData.discordInvite ||
                        verificationData.inviteUrl;
                    }
                  }
                } catch (e) {
                  console.warn('Error parsing requirement verification data:', e);
                  // Use description as-is
                }

                // Format link if it exists (ensure it has protocol)
                let formattedLink = taskLink;
                if (taskLink && !taskLink.startsWith('http://') && !taskLink.startsWith('https://')) {
                  formattedLink = `https://${taskLink}`;
                }

                return {
                  id: `step-${index + 1}`,
                  title: taskTitle,
                  description: req.description || taskTitle,
                  completed: false,
                  link: formattedLink,
                };
              });

              questWithDescription.steps = [
                {
                  id: 'step-0',
                  title: questWithDescription.title,
                  description: questWithDescription.description,
                  completed: false,
                },
                ...taskSteps,
              ];

              setQuest(questWithDescription);
              setCurrentStep(0);
              setIsLoading(false);
              return;
            }
          }
        }
      } catch (error) {
        console.error('Error loading quest from localStorage:', error);
      }

      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
    }
  }, [questId, quests, address]);

  // Check if quest is already claimed - must be before early returns
  // Use questId instead of quest?.id to avoid conditional hook execution
  useEffect(() => {
    if (address && questId) {
      const claimedQuests = JSON.parse(localStorage.getItem(`claimed_quests_${address.toLowerCase()}`) || '[]');
      setIsClaimed(claimedQuests.includes(questId));
    } else {
      setIsClaimed(false);
    }
  }, [address, questId]);

  // Load read documents from localStorage - MUST BE BEFORE EARLY RETURNS
  useEffect(() => {
    if (questId && address) {
      const storageKey = `read_docs_${questId}_${address.toLowerCase()}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const converted: Record<string, Set<number>> = {};
          Object.keys(parsed).forEach(key => {
            converted[key] = new Set(parsed[key]);
          });
          setReadDocuments(converted);
        } catch (e) {
          console.error('Error loading read documents:', e);
        }
      }
    }
  }, [questId, address]);

  // Save read documents to localStorage - MUST BE BEFORE EARLY RETURNS
  useEffect(() => {
    if (questId && address && Object.keys(readDocuments).length > 0) {
      const storageKey = `read_docs_${questId}_${address.toLowerCase()}`;
      const toSave: Record<string, number[]> = {};
      Object.keys(readDocuments).forEach(key => {
        toSave[key] = Array.from(readDocuments[key]);
      });
      localStorage.setItem(storageKey, JSON.stringify(toSave));
    }
  }, [readDocuments, questId, address]);

  if (isLoading) {
    return (
      <div className="quest-detail-container">
        <div className="quest-detail-loading">
          <div className="loading-spinner"></div>
          <p>Loading quest...</p>
        </div>
      </div>
    );
  }

  if (!quest) {
    return (
      <div className="quest-detail-container">
        <div className="quest-detail-error">
          <h2>Quest Not Found</h2>
          <p>The quest you're looking for doesn't exist.</p>
          <button onClick={onBack} className="quest-detail-back-button">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const isCompleted = quest.completedBy?.includes(address?.toLowerCase() || '');
  const totalSteps = quest.steps?.length || 1;
  // Get task steps (all steps except the description step at index 0)
  const taskSteps = quest.steps && quest.steps.length > 0
    ? quest.steps.filter((_, index) => index > 0)
    : [];
  const participantCount = quest.completedBy?.length || 0;
  const displayStepNumber = currentStep + 1;

  // Check if all tasks are completed
  const allTasksCompleted = quest ? taskSteps.every(step => {
    const verificationState = verificationStates[step.id];
    return step.completed || verificationState?.status === 'verified';
  }) : false;

  const handleTaskClick = (step: any) => {
    const title = step.title?.toLowerCase() || '';
    const description = step.description?.toLowerCase() || '';

    // Handle quote tweet actions
    if (title.includes('quote') || description.includes('quote')) {
      if (step.accountUrl) {
        // Open Twitter quote page for the specified tweet
        const tweetUrl = step.accountUrl;
        // Convert to Twitter's quote intent URL
        const quoteUrl = tweetUrl.replace('/status/', '/status/').replace('twitter.com', 'twitter.com/intent/tweet?in_reply_to=');
        window.open(quoteUrl, '_blank', 'noopener,noreferrer');
      } else {
        // Fallback: navigate to step detail
        const stepIndex = taskSteps.findIndex(s => s.id === step.id);
        if (stepIndex >= 0) {
          setCurrentStep(stepIndex + 1);
        }
      }
      return;
    }

    // If task has a link (e.g., Twitter profile), open it
    if (step.link) {
      window.open(step.link, '_blank', 'noopener,noreferrer');
    } else {
      // Otherwise, navigate to the step detail
      const stepIndex = taskSteps.findIndex(s => s.id === step.id);
      if (stepIndex >= 0) {
        setCurrentStep(stepIndex + 1);
      }
    }
  };

  const handleDeleteQuest = async () => {
    if (!quest) return;

    setIsDeleting(true);
    try {
      const success = await questServiceSupabase.deleteQuest(quest.id);

      // Also delete from localStorage
      if (quest.creatorAddress) {
        const publishedQuestsKey = `published_quests_${quest.creatorAddress.toLowerCase()}`;
        const storedPublishedQuests = localStorage.getItem(publishedQuestsKey);
        if (storedPublishedQuests) {
          try {
            const parsedQuests = JSON.parse(storedPublishedQuests);
            const updatedQuests = parsedQuests.filter((q: any) => q.id !== quest.id);
            localStorage.setItem(publishedQuestsKey, JSON.stringify(updatedQuests));
          } catch (error) {
            console.error('Error removing quest from localStorage:', error);
          }
        }
      }

      if (success) {
        showToast('Quest deleted successfully', 'success');
        // Invalidate quests cache
        queryClient.invalidateQueries({ queryKey: ['quests'] });
        // Navigate back
        onBack();
      } else {
        showToast('Failed to delete quest', 'error');
      }
    } catch (error) {
      console.error('Error deleting quest:', error);
      showToast('Error deleting quest', 'error');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Verify task completion using social APIs
  const verifyTaskCompletion = async (step: any) => {
    if (!address) return { success: false, completed: false, error: 'No wallet connected' };

    const title = step.title.toLowerCase();
    const description = step.description?.toLowerCase() || '';

    // Determine provider and action from step
    let provider: 'twitter' | 'discord' | 'github' | 'google' | null = null;
    let action: string = '';
    let params: any = {};

    if (title.includes('twitter') || title.includes('x')) {
      provider = 'twitter';
      if (title.includes('follow') || description.includes('follow')) {
        action = 'follow';

        // Extract Twitter username from task configuration
        let twitterUsername = '';

        // Priority 1: Extract from step.accountUrl
        if (step.accountUrl) {
          // Extract from URL like https://twitter.com/username or https://x.com/username
          const urlMatch = step.accountUrl.match(/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/);
          if (urlMatch) {
            twitterUsername = urlMatch[1];
          } else if (step.accountUrl.startsWith('@')) {
            // Handle @username format
            twitterUsername = step.accountUrl.substring(1);
          } else if (!step.accountUrl.includes('/') && !step.accountUrl.includes('.')) {
            // Plain username
            twitterUsername = step.accountUrl;
          }
        }

        // Priority 2: Extract from step.link (fallback)
        if (!twitterUsername && step.link) {
          const urlMatch = step.link.match(/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/);
          if (urlMatch) {
            twitterUsername = urlMatch[1];
          }
        }

        // Priority 3: Fallback to other sources
        if (!twitterUsername) {
          twitterUsername = step.twitterUsername || step.targetUsername ||
            (quest?.title?.toLowerCase().includes('follow us on social media') ? 'IntuitionSystems' : 'targetaccount');
        }

        params.targetUsername = twitterUsername;
        console.log('🔍 Extracted Twitter username:', twitterUsername, 'from step data:', step);
      } else if (title.includes('quote') || description.includes('quote')) {
        action = 'quote';

        // Extract tweet URL for quoting
        let tweetUrl = '';

        // Priority 1: Extract from step.accountUrl (this is where the quest creator puts the tweet URL)
        if (step.accountUrl) {
          tweetUrl = step.accountUrl;
        }

        // Priority 2: Extract from step.link (fallback)
        if (!tweetUrl && step.link) {
          tweetUrl = step.link;
        }

        params.tweetUrl = tweetUrl;
        console.log('🔍 Extracted tweet URL for quoting:', tweetUrl, 'from step data:', step);

        // Show popup for quote tweet URL input instead of immediate verification
        setCurrentQuoteStep(step);
        setQuoteTweetUrl('');
        setShowQuoteTweetModal(true);
        return { success: false, completed: false, error: null }; // Return early to show popup
      }
    } else if (title.includes('discord')) {
      provider = 'discord';
      if (title.includes('join') || description.includes('join server')) {
        action = 'join_server';
        params.serverId = step.discordServerId || step.serverId || '123456789';
      }
    } else if (title.includes('github')) {
      provider = 'github';
      if (title.includes('star') || description.includes('star')) {
        action = 'star_repo';
        const [owner, repo] = (step.githubRepo || 'owner/repo').split('/');
        params.owner = owner;
        params.repo = repo;
      }
    } else if (title.includes('google')) {
      provider = 'google';
      action = 'connect'; // Basic connection verification
    }

    // If it's a social task, use simplified verification for Twitter
    if (provider && action) {
      if (provider === 'twitter') {
        // Quick fix: Just check if Twitter is connected, don't verify actual actions
        if (hasConnectedProvider('twitter')) {
          console.log(`✅ Twitter ${action} verification: User has Twitter connected, marking as successful`);
          return {
            success: true,
            completed: true,
            error: null
          };
        } else {
          console.log(`❌ Twitter ${action} verification: User not connected to Twitter`);
          return {
            success: false,
            completed: false,
            error: 'Please connect your Twitter account first'
          };
        }
      }

      // For other providers, still use backend verification
      try {
        const response = await apiClient.post('/social/verify', {
          provider,
          action,
          params
        });

        return {
          success: response.data.success,
          completed: response.data.completed,
          error: response.data.error
        };
      } catch (error: any) {
        console.error('Social verification error:', error);
        return {
          success: false,
          completed: false,
          error: error.response?.data?.error || error.message || 'Verification failed'
        };
      }
    }

    // For non-social tasks, return success
    return { success: true, completed: true };
  };

  // Check if social task is completed (requires connected social account)
  const checkSocialTaskCompletion = async (step: any): Promise<boolean> => {
    if (!address) return false;

    const title = step.title.toLowerCase();
    const description = step.description?.toLowerCase() || '';

    try {
      // Check if user has connected the required social provider
      if (title.includes('twitter') || title.includes('x')) {
        return hasConnectedProvider('twitter');
      }

      if (title.includes('discord')) {
        return hasConnectedProvider('discord');
      }

      // Other social tasks don't require connection verification
      return true;
    } catch (error) {
      console.error('Error checking social task completion:', error);
      return false;
    }
  };

  const handleRefresh = async (stepId: string) => {
    const step = taskSteps.find(s => s.id === stepId);
    if (!step) return;

    // Check if this is a Read docs action
    if ((step as any).isReadDocs && (step as any).readDocsConfig) {
      setCurrentReadDocsStep(step);
      setShowReadDocsModal(true);
      return;
    }

    // Check if in cooldown
    const currentState = verificationStates[stepId];
    if (currentState?.status === 'cooldown' && currentState.cooldownEnd) {
      const now = Date.now();
      if (now < currentState.cooldownEnd) {
        const remainingSeconds = Math.ceil((currentState.cooldownEnd - now) / 1000);
        showToast(`Please wait ${remainingSeconds}s before verifying again`, 'warning');
        return;
      }
    }

    // Check if social task is completed
    const isTaskCompleted = await checkSocialTaskCompletion(step);
    if (!isTaskCompleted) {
      const title = step.title.toLowerCase();
      let accountType = 'social account';
      if (title.includes('twitter') || title.includes('x')) {
        accountType = 'Twitter';
      } else if (title.includes('discord')) {
        accountType = 'Discord';
      }
      setMissingSocialAccount(accountType);
      setShowSocialPopup(true);
      return;
    }

    // Start verification
    setVerificationStates(prev => ({
      ...prev,
      [stepId]: { status: 'verifying' }
    }));

    try {
      // Perform actual social task verification
      const verificationResult = await verifyTaskCompletion(step);

      if (verificationResult.success && verificationResult.completed) {
        // Mark as verified
        setVerificationStates(prev => ({
          ...prev,
          [stepId]: { status: 'verified' }
        }));

        // Update quest step as completed
        if (quest) {
          const updatedSteps = quest.steps?.map(s =>
            s.id === stepId ? { ...s, completed: true } : s
          );
          setQuest({ ...quest, steps: updatedSteps });
        }

        showToast('Task verified successfully!', 'success');
      } else {
        // Mark as failed and start cooldown
        const cooldownEnd = Date.now() + 30000; // 30 seconds
        setVerificationStates(prev => ({
          ...prev,
          [stepId]: { status: 'cooldown', cooldownEnd }
        }));
        showToast('Verification failed. Please try again in 30s', 'error');

        // Set up timer to clear cooldown
        setTimeout(() => {
          setVerificationStates(prev => ({
            ...prev,
            [stepId]: { status: 'idle' }
          }));
        }, 30000);
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      // Mark as failed and start cooldown
      const cooldownEnd = Date.now() + 30000; // 30 seconds
      setVerificationStates(prev => ({
        ...prev,
        [stepId]: { status: 'cooldown', cooldownEnd }
      }));
      showToast(`Verification failed: ${error.message || 'Unknown error'}`, 'error');

      // Set up timer to clear cooldown
      setTimeout(() => {
        setVerificationStates(prev => ({
          ...prev,
          [stepId]: { status: 'idle' }
        }));
      }, 30000);
    }
  };

  // Handle marking a document as read
  const handleMarkDocumentRead = (stepId: string, docIndex: number) => {
    setReadDocuments(prev => {
      const newState = { ...prev };
      if (!newState[stepId]) {
        newState[stepId] = new Set();
      }
      newState[stepId].add(docIndex);

      // Check if all documents are read
      const step = taskSteps.find(s => s.id === stepId);
      if (step && (step as any).readDocsConfig?.documents) {
        const totalDocs = (step as any).readDocsConfig.documents.length;
        const readCount = newState[stepId].size;

        if (readCount === totalDocs) {
          // All documents read - mark as verified
          setVerificationStates(prev => ({
            ...prev,
            [stepId]: { status: 'verified' }
          }));

          if (quest) {
            const updatedSteps = quest.steps?.map(s =>
              s.id === stepId ? { ...s, completed: true } : s
            );
            setQuest({ ...quest, steps: updatedSteps });
          }

          showToast('All documents read! Task verified.', 'success');
          setShowReadDocsModal(false);
        }
      }

      return newState;
    });
  };

  // Handle quote tweet URL submission
  const handleQuoteTweetSubmit = async () => {
    if (!currentQuoteStep || !quoteTweetUrl.trim()) return;

    const stepId = currentQuoteStep.id;

    // Simplified verification: just check if Twitter is connected
    if (hasConnectedProvider('twitter')) {
      // Mark as verified
      setVerificationStates(prev => ({
        ...prev,
        [stepId]: { status: 'verified' }
      }));

      // Update quest step as completed
      if (quest) {
        const updatedSteps = quest.steps?.map(s =>
          s.id === stepId ? { ...s, completed: true } : s
        );
        setQuest({ ...quest, steps: updatedSteps });
      }

      console.log('✅ Quote tweet verification: User has Twitter connected, marking as successful');
      showToast('Successfully verified!', 'success');
      setShowQuoteTweetModal(false);
      setQuoteTweetUrl('');
    } else {
      console.log('❌ Quote tweet verification: User not connected to Twitter');
      showToast('Please connect your Twitter account first', 'warning');
    }
  };

  const handleFollow = () => {
    showToast('Follow feature coming soon', 'info');
  };

  const handleReportIssue = () => {
    showToast('Report issue feature coming soon', 'info');
  };

  const handleClaimIQ = async () => {
    // Prevent quest creator from joining their own quest (unspoken rule)
    if (address && quest.creatorAddress && address.toLowerCase() === quest.creatorAddress.toLowerCase()) {
      return;
    }

    // Check if quest has expired
    const isExpired = quest.expiresAt ? Date.now() > quest.expiresAt : false;
    if (isExpired) {
      showToast('This quest has ended', 'warning');
      return;
    }

    if (!address || !quest || !allTasksCompleted || isClaimed || isCompleting) {
      if (!allTasksCompleted) {
        showToast('Please complete all tasks before claiming', 'warning');
      }
      return;
    }

    if (!walletClient || !publicClient) {
      showToast('Please connect your wallet first', 'warning');
      return;
    }

    // Check if user is on Intuition Network
    if (chainId !== intuitionChain.id) {
      showToast(`Please switch to ${intuitionChain.name} to claim quest on-chain.`, 'warning');
      try {
        await switchChain({ chainId: intuitionChain.id });
        showToast(`Switched to ${intuitionChain.name}. Please try claiming again.`, 'info');
      } catch (switchError: any) {
        showToast(`Failed to switch network: ${switchError.message || 'Unknown error'}`, 'error');
      }
      return;
    }

    // Complete quest and award IQ points
    let tripleId: string | undefined;
    let tripleTransactionHash: string | undefined;

    try {
      showToast('Completing quest...', 'info');

      // Get atom IDs (for now using placeholder values - these should come from quest creation)
      const questAtomId = quest.atomId || '1'; // Default atom ID
      const userAtomId = '1'; // User atom ID (should be fetched from user's space)

      // Step 1: Check if already claimed on-chain (use atom ID for contract compatibility)
      const hasClaimedOnChain = await checkClaimStatus(address, questAtomId, publicClient);
      if (hasClaimedOnChain) {
        showToast('Quest already claimed on-chain', 'warning');
        return;
      }

      // Step 2: Call ClaimIQ contract to claim on-chain
      showToast('Confirming claim on blockchain...', 'info');

      const claimResult = await claimQuestViaContract({
        questId: quest.id,
        questAtomId,
        userAtomId,
        questTitle: quest.title,
        rewardType: quest.rewardType || (quest.winnerPrizes && quest.winnerPrizes.length > 0 ? 'trust_and_iq' : 'iq_only'), // Default to iq_only if no winner prizes
      }, walletClient, publicClient);

      console.log('✅ ClaimIQ contract call successful:', claimResult);

      // Store triple data for later use
      tripleId = claimResult.tripleId;
      tripleTransactionHash = claimResult.transactionHash;

      // Step 3: Complete the quest (save to database, award IQ points)
      await completeQuest(quest.id);

      // Step 2: Only after successful completion, register for raffle
      if (address) {
        saveQuestCompletion(quest.id, address);
        console.log('✅ Quest completed and participant registered:', quest.id, 'Address:', address);
      }

      // Step 3: Show success message
      showToast('Successfully completed quest and claimed IQ!', 'success');

      // Step 3: Store completion triple data if created
      if (tripleId && tripleTransactionHash) {
        const completionData = {
          questId: quest.id,
          tripleId,
          tripleTransactionHash,
          completedAt: Date.now(),
        };
        const completionsKey = `quest_completions_${address.toLowerCase()}`;
        const existingCompletions = JSON.parse(localStorage.getItem(completionsKey) || '[]');
        existingCompletions.push(completionData);
        localStorage.setItem(completionsKey, JSON.stringify(existingCompletions));
      }

      // Mark as claimed in localStorage
      const claimedQuests = JSON.parse(localStorage.getItem(`claimed_quests_${address.toLowerCase()}`) || '[]');
      if (!claimedQuests.includes(quest.id)) {
        claimedQuests.push(quest.id);
        localStorage.setItem(`claimed_quests_${address.toLowerCase()}`, JSON.stringify(claimedQuests));
      }

      setIsClaimed(true);
      showToast(`Successfully claimed ${quest.xpReward} IQ!`, 'success');

      // Force refetch user XP query to refresh the progress bar immediately
      // The onSuccess callback should handle this, but we do it here as well to ensure it happens
      await queryClient.refetchQueries({ queryKey: ['user-xp', address] });

      // Update quest to mark as completed
      setQuest(prevQuest => {
        if (!prevQuest) return null;
        const completedBy = prevQuest.completedBy || [];
        if (!completedBy.includes(address.toLowerCase())) {
          return {
            ...prevQuest,
            completedBy: [...completedBy, address.toLowerCase()],
          };
        }
        return prevQuest;
      });
    } catch (error: any) {
      console.error('Error claiming IQ:', error);
      showToast(error.message || 'Failed to claim IQ. Please try again.', 'error');
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - timestamp) / (1000 * 60 * 60 * 24));

    // Show relative time for past dates
    if (diffDays > 0 && diffDays <= 7) {
      return `Ended ${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }

    // Show readable date: "Jan 13, 2026 at 4:00 PM"
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatExpirationDate = (timestamp: number) => {
    const date = new Date(timestamp);
    // Convert to GMT+1:00 timezone
    const gmtPlus1Date = new Date(date.getTime() + (1 * 60 * 60 * 1000));
    const day = String(gmtPlus1Date.getUTCDate()).padStart(2, '0');
    const month = String(gmtPlus1Date.getUTCMonth() + 1).padStart(2, '0');
    const year = gmtPlus1Date.getUTCFullYear();
    const hours = String(gmtPlus1Date.getUTCHours()).padStart(2, '0');
    const minutes = String(gmtPlus1Date.getUTCMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes} GMT+1:00`;
  };

  const getTaskIcon = (step: any) => {
    // Check if this is a Read docs action
    if (step.isReadDocs) {
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
        </svg>
      );
    }

    const title = (step.title || '').toLowerCase();
    const description = (step.description || '').toLowerCase();
    const combinedText = `${title} ${description}`;

    // Check for Twitter/X tasks - comprehensive check
    // Tasks like "Follow a Twitter account", "Make a post on Twitter", "Twitter connected", etc.
    if (combinedText.includes('twitter') || combinedText.includes(' x ') || combinedText === 'x') {
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    } else if (combinedText.includes('discord')) {
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
        </svg>
      );
    } else if (combinedText.includes('telegram')) {
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.13-.31-1.09-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
        </svg>
      );
    } else if (combinedText.includes('website') || combinedText.includes('download') || combinedText.includes('visit')) {
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      );
    }
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    );
  };

  // Show description step - skip it and go directly to tasks (Galxe style)
  if (currentStep === 0) {
    setCurrentStep(1);
    return null;
  }

  // Show tasks list matching the screenshot design
  const descriptionStep = quest.steps?.[0];
  const completedTasksCount = taskSteps.filter(step =>
    step.completed || (verificationStates[step.id]?.status === 'verified')
  ).length;
  const progressPercentage = taskSteps.length > 0 ? (completedTasksCount / taskSteps.length) * 100 : 0;

  // Check if quest has expired
  const isQuestExpired = quest.expiresAt ? Date.now() > quest.expiresAt : false;

  // Get creator logo/initial
  const creatorInitials = quest.creatorType === 'community' && quest.creatorAddress
    ? quest.creatorAddress.slice(2, 4).toUpperCase()
    : quest.projectName.slice(0, 2).toUpperCase();

  return (
    <div className="quest-detail-container galxe-exact">
      {/* Back Button */}
      <div className="quest-detail-back-section">
        <button
          onClick={onBack}
          className="quest-detail-back-button"
          aria-label="Back to Community"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back{isFromBuilder ? '' : ' to Community'}
        </button>
      </div>

      {/* Content Wrapper with unified background */}
      <div className="quest-detail-content-wrapper">
        {/* Top Header */}
        <div className="quest-detail-top-header">
          <div className="quest-detail-header-left">
            <div className="quest-detail-creator-logo">
              {quest.image ? (
                <img src={quest.image} alt={quest.projectName} />
              ) : (
                <div className="quest-detail-creator-logo-placeholder">
                  {creatorInitials}
                </div>
              )}
            </div>
            <div className="quest-detail-creator-info">
              <div className="quest-detail-creator-name-row">
                <span className="quest-detail-creator-name">
                  {quest.creatorType === 'community' && quest.creatorAddress
                    ? quest.creatorAddress.slice(0, 7)
                    : quest.projectName}
                </span>
                {/* Show verified tick for pro users */}
                {creatorIsPro && (
                  <svg className="quest-detail-verified-badge" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23 12l-2.44-2.78.34-3.68-3.61-.82-1.89-3.18L12 3 8.6 1.54 6.71 4.72l-3.61.81.34 3.68L1 12l2.44 2.78-.34 3.68 3.61.82 1.89 3.18L12 21l3.4 1.46 1.89-3.18 3.61-.82-.34-3.68L23 12zm-10 5l-5-5 1.41-1.41L12 14.17l3.59-3.58L17 12l-5 5z" />
                  </svg>
                )}
                {/* Follow button beside username - always show */}
                <button className="quest-detail-follow-btn" onClick={handleFollow}>
                  <span>+</span> Follow
                </button>
              </div>
            </div>
          </div>
          <div className="quest-detail-header-right">
            {/* Twitter icon with space creator's X link - always show if we have a URL */}
            {(spaceTwitterUrl || quest.twitterLink) && (
              <a
                href={spaceTwitterUrl || quest.twitterLink || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="quest-detail-header-icon-btn quest-detail-twitter-icon"
                title="Twitter"
                style={{ zIndex: 10005, position: 'relative' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            )}

            {/* Message icon with feedback tooltip */}
            <div
              className="quest-detail-header-icon-wrapper"
              onMouseEnter={() => setShowFeedbackTooltip(true)}
              onMouseLeave={() => setShowFeedbackTooltip(false)}
            >
              <button className="quest-detail-header-icon-btn" onClick={handleReportIssue}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </button>
              {showFeedbackTooltip && (
                <div className="quest-detail-tooltip">Feedback</div>
              )}
            </div>

            {/* 3 dots dropdown menu */}
            <div className="quest-detail-dropdown-wrapper" ref={dropdownRef}>
              <button
                className="quest-detail-header-icon-btn"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="19" cy="12" r="1" />
                  <circle cx="5" cy="12" r="1" />
                </svg>
              </button>
              {showDropdown && (
                <div className="quest-detail-dropdown-menu">
                  <button
                    className="quest-detail-dropdown-item"
                    onClick={() => {
                      // Hide quest logic
                      if (address && quest) {
                        const hiddenQuests = JSON.parse(localStorage.getItem(`hidden_quests_${address.toLowerCase()}`) || '[]');
                        if (!hiddenQuests.includes(quest.id)) {
                          hiddenQuests.push(quest.id);
                          localStorage.setItem(`hidden_quests_${address.toLowerCase()}`, JSON.stringify(hiddenQuests));
                          showToast('Quest hidden', 'success');
                          onBack();
                        }
                      }
                      setShowDropdown(false);
                    }}
                  >
                    Hide Quest
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quest Title Section */}
        <div className="quest-detail-title-section">
          <h1 className="quest-detail-page-title">{quest.title}</h1>
          <div className="quest-detail-metadata-row">
            {quest.expiresAt && (
              <span className="quest-detail-date">{formatDate(quest.expiresAt)}</span>
            )}
          </div>

        </div>

        {/* Reward Section */}
        <div className="quest-detail-reward-section">
          <span className="quest-detail-reward-text">Get {quest.iqPoints || quest.xpReward || 100} IQ Points</span>
        </div>

        {/* Tasks List */}
        <div className="quest-detail-tasks-container">
          {taskSteps.map((step, index) => {
            const verificationState = verificationStates[step.id] || { status: 'idle' as VerificationStatus };
            const isVerifying = verificationState.status === 'verifying';
            const isVerified = verificationState.status === 'verified';
            const isCooldown = verificationState.status === 'cooldown';
            const cooldownSeconds = verificationState.cooldownEnd
              ? Math.max(0, Math.ceil((verificationState.cooldownEnd - Date.now()) / 1000))
              : 0;
            // Check if quest has expired
            const isExpired = quest.expiresAt ? Date.now() > quest.expiresAt : false;
            const isDisabled = isVerifying || isCooldown || isExpired;
            const isCompleted = step.completed || isVerified;

            return (
              <div
                key={step.id}
                className={`quest-detail-task-item-exact ${isCompleted ? 'completed' : ''} ${step.link ? 'clickable' : ''}`}
                onClick={() => {
                  // Only handle click if there's no link (link is handled by the anchor tag)
                  if (!step.link) {
                    handleTaskClick(step);
                  }
                }}
              >
                {/* Middle: Platform Icon + Task Text */}
                <div className="quest-detail-task-content">
                  <div className="quest-detail-task-platform-icon">
                    {getTaskIcon(step)}
                  </div>
                  {step.link ? (
                    <a
                      href={step.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="quest-detail-task-text-exact quest-detail-task-link"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      {step.title}
                    </a>
                  ) : (
                    <span className="quest-detail-task-text-exact">{step.title}</span>
                  )}
                </div>

                {/* Right: Refresh Icon */}
                <button
                  className={`quest-detail-task-refresh-exact ${isVerifying ? 'verifying' : ''} ${isVerified ? 'verified' : ''} ${isDisabled ? 'disabled' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isDisabled) {
                      handleRefresh(step.id);
                    }
                  }}
                  disabled={isDisabled}
                  title={isExpired ? 'Quest has ended' : isCooldown ? `Verify again in ${cooldownSeconds}s` : isVerified ? 'Verified' : 'Verify task'}
                >
                  {isVerified ? (
                    <img src="/verified.svg" alt="Verified" width="16" height="16" />
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="23 4 23 10 17 10" />
                      <polyline points="1 20 1 14 7 14" />
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                    </svg>
                  )}
                  {isCooldown && cooldownSeconds > 0 && (
                    <span className="cooldown-timer">{cooldownSeconds}s</span>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Claim Button - Below Tasks, Right Aligned */}
        <div className="quest-detail-claim-button-container">
          <button
            className={`quest-detail-claim-button-inline ${!allTasksCompleted || isClaimed || isQuestExpired || (address && quest.creatorAddress && address.toLowerCase() === quest.creatorAddress.toLowerCase()) ? 'disabled' : ''}`}
            onClick={handleClaimIQ}
            disabled={!allTasksCompleted || isClaimed || isCompleting || isCheckingClaim || !address || isQuestExpired || (address && quest.creatorAddress && address.toLowerCase() === quest.creatorAddress.toLowerCase())}
          >
            {isCheckingClaim ? (
              <>
                <div className="claim-spinner"></div>
                Checking...
              </>
            ) : isQuestExpired ? (
              <>
                Quest Ended
              </>
            ) : isClaimed ? (
              <>
                <img src="/verified.svg" alt="Verified" width="20" height="20" />
                Claimed
              </>
            ) : isCompleting ? (
              <>
                <div className="claim-spinner"></div>
                Claiming IQ...
              </>
            ) : !allTasksCompleted ? (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                Complete All Tasks
              </>
            ) : (
              <>Claim</>
            )}
          </button>
        </div>
      </div>

      {/* Edit and Delete Buttons - Only show when accessed from builder dashboard */}
      {isFromBuilder && quest && (
        <>
          {/* Edit Button */}
          <button
            className="quest-detail-edit-button"
            onClick={() => onEdit?.(quest.id)}
            style={{
              position: 'fixed',
              bottom: '20px',
              right: '20px',
              padding: '12px 24px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              zIndex: 1000,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#2563eb';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#3b82f6';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit Quest
          </button>

          {/* Delete Button */}
          <button
            className="quest-detail-delete-button"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isDeleting}
            style={{
              position: 'fixed',
              bottom: '20px',
              left: '20px',
              padding: '12px 24px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              zIndex: 1000,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#dc2626';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ef4444';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {isDeleting ? (
              <>
                <div className="claim-spinner" style={{ width: '16px', height: '16px' }}></div>
                Deleting...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Delete Quest
              </>
            )}
          </button>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="social-popup-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="social-popup-container" onClick={(e) => e.stopPropagation()}>
            <div className="social-popup-header">
              <h3>Delete Quest</h3>
              <button
                className="social-popup-close"
                onClick={() => setShowDeleteConfirm(false)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="social-popup-content">
              <p>Are you sure you want to delete "{quest?.title}"? This action cannot be undone.</p>
            </div>
            <div className="social-popup-actions">
              <button
                className="social-popup-button"
                onClick={handleDeleteQuest}
                disabled={isDeleting}
                style={{ backgroundColor: '#ef4444' }}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
              <button
                className="social-popup-button secondary"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Social Account Not Connected Popup */}
      {showSocialPopup && (
        <div className="social-popup-overlay" onClick={() => setShowSocialPopup(false)}>
          <div className="social-popup-container" onClick={(e) => e.stopPropagation()}>
            <div className="social-popup-header">
              <h3>Account Not Connected</h3>
              <button
                className="social-popup-close"
                onClick={() => setShowSocialPopup(false)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="social-popup-content">
              <p>Your {missingSocialAccount} account is not connected. Please connect it in your profile to verify this task.</p>
            </div>
            <div className="social-popup-actions">
              <button
                className="social-popup-button"
                onClick={() => {
                  setShowSocialPopup(false);
                  if (onNavigateToProfile) {
                    onNavigateToProfile();
                  } else {
                    showToast('Please connect your account in the profile section', 'info');
                  }
                }}
              >
                Go to Profile
              </button>
              <button
                className="social-popup-button secondary"
                onClick={() => setShowSocialPopup(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Read Docs Modal */}
      {showReadDocsModal && currentReadDocsStep && (
        <div
          className="quest-detail-modal-overlay"
          onClick={() => setShowReadDocsModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            className="quest-detail-read-docs-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#fff' }}>
                {currentReadDocsStep.title || 'Read Documents'}
              </h2>
              <button
                onClick={() => setShowReadDocsModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.7)',
                  cursor: 'pointer',
                  fontSize: '24px',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>

            <p style={{ marginBottom: '20px', color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>
              Please read all documents below. Mark each one as read when you're done.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(currentReadDocsStep.readDocsConfig?.documents || []).map((doc: string, index: number) => {
                const isRead = readDocuments[currentReadDocsStep.id]?.has(index) || false;
                return (
                  <div
                    key={index}
                    style={{
                      padding: '16px',
                      backgroundColor: isRead ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${isRead ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>
                          Read docs {index + 1}
                        </span>
                        {isRead && (
                          <img src="/verified.svg" alt="Read" width="16" height="16" />
                        )}
                      </div>
                      <div
                        style={{
                          padding: '12px',
                          backgroundColor: 'rgba(0, 0, 0, 0.3)',
                          borderRadius: '8px',
                          color: 'rgba(255, 255, 255, 0.9)',
                          fontSize: '14px',
                          lineHeight: '1.6',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          maxHeight: '200px',
                          overflowY: 'auto',
                        }}
                      >
                        {doc || `Document ${index + 1} content`}
                      </div>
                    </div>
                    <button
                      onClick={() => handleMarkDocumentRead(currentReadDocsStep.id, index)}
                      disabled={isRead}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: isRead ? 'rgba(16, 185, 129, 0.2)' : '#3b82f6',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: isRead ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: 500,
                        opacity: isRead ? 0.6 : 1,
                        flexShrink: 0,
                      }}
                    >
                      {isRead ? 'Read' : 'Mark as Read'}
                    </button>
                  </div>
                );
              })}
            </div>

            {currentReadDocsStep.readDocsConfig?.documents &&
              readDocuments[currentReadDocsStep.id]?.size === currentReadDocsStep.readDocsConfig.documents.length && (
                <div style={{
                  marginTop: '20px',
                  padding: '12px',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '8px',
                  color: '#10b981',
                  fontSize: '14px',
                  textAlign: 'center',
                }}>
                  ✓ All documents read! Task verified.
                </div>
              )}
          </div>
        </div>
      )}

      {/* Quote Tweet Modal */}
      {showQuoteTweetModal && currentQuoteStep && (
        <div
          className="quest-detail-modal-overlay"
          onClick={() => setShowQuoteTweetModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            className="quest-detail-quote-tweet-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#fff' }}>
                {currentQuoteStep.title || 'Quote Tweet Verification'}
              </h2>
              <button
                onClick={() => setShowQuoteTweetModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.7)',
                  cursor: 'pointer',
                  fontSize: '24px',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>

            <p style={{ marginBottom: '20px', color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>
              Please paste the link to your quote tweet below.
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#fff', fontSize: '14px', fontWeight: 500 }}>
                Quote Tweet URL
                <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
              </label>
              <input
                type="url"
                value={quoteTweetUrl}
                onChange={(e) => setQuoteTweetUrl(e.target.value)}
                placeholder="https://twitter.com/username/status/1234567890"
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowQuoteTweetModal(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleQuoteTweetSubmit()}
                disabled={!quoteTweetUrl.trim()}
                style={{
                  padding: '10px 20px',
                  backgroundColor: quoteTweetUrl.trim() ? '#3b82f6' : 'rgba(59, 130, 246, 0.5)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: quoteTweetUrl.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: 500,
                  opacity: quoteTweetUrl.trim() ? 1 : 0.6,
                }}
              >
                Verify
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}