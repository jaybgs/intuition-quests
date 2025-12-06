import { useState, useEffect, useRef } from 'react';
import { useAccount, useWalletClient, usePublicClient, useChainId, useSwitchChain } from 'wagmi';
import { useQuests } from '../hooks/useQuests';
import { useQueryClient } from '@tanstack/react-query';
import { Quest, QuestStep } from '../types';
import { createQuestCompletionTriple } from '../services/questAtomService';
import { intuitionChain } from '../config/wagmi';
import { showToast } from './Toast';
import { saveQuestCompletion } from '../utils/raffle';
// Removed questClaimSurchargeService - claiming is now free
// Removed CONTRACT_ADDRESSES and formatUnits - no longer needed for free claiming
import { useSubscription } from '../hooks/useSubscription';
import { spaceService } from '../services/spaceService';
import './QuestDetail.css';

interface QuestDetailProps {
  questId: string;
  onBack: () => void;
  onNavigateToProfile?: () => void;
}

type VerificationStatus = 'idle' | 'verifying' | 'verified' | 'failed' | 'cooldown';

interface StepVerificationState {
  status: VerificationStatus;
  cooldownEnd?: number;
}

export function QuestDetail({ questId, onBack, onNavigateToProfile }: QuestDetailProps) {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { quests, completeQuest, isCompleting } = useQuests();
  const queryClient = useQueryClient();
  const { isPro } = useSubscription();
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

  // Check if quest is already claimed (both on-chain and local)
  useEffect(() => {
    const checkClaimStatus = async () => {
      if (!address || !quest || !publicClient) {
        setIsClaimed(false);
        return;
      }

      // First check localStorage (for backward compatibility)
      const claimedQuests = JSON.parse(localStorage.getItem(`claimed_quests_${address.toLowerCase()}`) || '[]');
      const localClaimed = claimedQuests.includes(quest.id);

      setIsClaimed(localClaimed);
    };

    checkClaimStatus();
  }, [address, quest?.id]);

  // Fetch space data to get Twitter URL and check creator's pro status
  useEffect(() => {
    if (!quest) return;
    
    // Get space Twitter URL - try multiple sources
    // First check quest.twitterLink directly
    if (quest.twitterLink) {
      setSpaceTwitterUrl(quest.twitterLink);
    }
    
    // Then try to get from space if projectId exists
    if (quest.projectId) {
      spaceService.getSpaceById(quest.projectId).then(space => {
        if (space?.twitterUrl) {
          setSpaceTwitterUrl(space.twitterUrl);
        }
      }).catch(error => {
        console.warn('Error fetching space:', error);
      });
    }
    
    // Check if creator has pro subscription
    if (quest.creatorAddress) {
      try {
        const { subscriptionService } = require('../services/subscriptionService');
        const creatorTier = subscriptionService.getSubscription(quest.creatorAddress);
        setCreatorIsPro(creatorTier === 'pro');
      } catch (error) {
        console.warn('Error checking creator subscription:', error);
        setCreatorIsPro(false);
      }
    } else if (quest.creatorType !== 'community') {
      // For project creators, check by project owner
      if (quest.projectId) {
        spaceService.getSpaceById(quest.projectId).then(space => {
          if (space?.ownerAddress) {
            try {
              const { subscriptionService } = require('../services/subscriptionService');
              const creatorTier = subscriptionService.getSubscription(space.ownerAddress);
              setCreatorIsPro(creatorTier === 'pro');
            } catch (error) {
              console.warn('Error checking creator subscription:', error);
              setCreatorIsPro(false);
            }
          }
        }).catch(error => {
          console.warn('Error fetching space:', error);
        });
      }
    }
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
    // Find quest by ID from real data
    const foundQuest = quests.find(q => q.id === questId);
    if (foundQuest) {
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
    } else {
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

  // Check if social account is connected
  const checkSocialConnection = (step: any): boolean => {
    if (!address) return false;
    
    const stored = localStorage.getItem(`social_connections_${address.toLowerCase()}`);
    if (!stored) return false;
    
    try {
      const connections = JSON.parse(stored);
      const title = step.title.toLowerCase();
      
      if (title.includes('twitter') || title.includes('x')) {
        return connections.twitter !== null;
      } else if (title.includes('discord')) {
        return connections.discord !== null;
      }
      return true; // Other tasks don't require social connection
    } catch {
      return false;
    }
  };

  const handleRefresh = async (stepId: string) => {
    const step = taskSteps.find(s => s.id === stepId);
    if (!step) return;

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

    // Check if social account is connected
    if (!checkSocialConnection(step)) {
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

    // Simulate verification (would call actual API)
    setTimeout(() => {
      // Randomly succeed or fail for demo (80% success rate)
      const success = Math.random() > 0.2;
      
      if (success) {
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
    }, 2000); // 2 second verification delay
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

    // Claim quest (no fee required - claiming is now free)
    try {
      showToast('Claiming quest...', 'info');
      
      // Step 1: Create triple [User][completed][Quest Atom] if quest has atomId
      let tripleId: string | undefined;
      let tripleTransactionHash: string | undefined;
      
      if (quest.atomId) {
        try {
          const tripleResult = await createQuestCompletionTriple(
            address as `0x${string}`,
            quest.atomId as `0x${string}`,
            walletClient,
            publicClient
          );
          tripleId = tripleResult.tripleId;
          tripleTransactionHash = tripleResult.transactionHash;
          
          // Register participant for raffle/FCFS with their connected wallet address
          // This happens when the on-chain transaction is confirmed
          if (address) {
            saveQuestCompletion(quest.id, address);
            console.log('✅ Participant registered for quest:', quest.id, 'Address:', address);
          }
        } catch (tripleError: any) {
          console.warn('Failed to create completion triple on-chain:', tripleError);
          showToast('Warning: Quest completion triple creation failed, but continuing with quest completion.', 'warning');
        }
      } else {
        // Even if quest doesn't have atomId, register participant when they complete
        // This ensures they're registered for raffle/FCFS
        if (address) {
          saveQuestCompletion(quest.id, address);
          console.log('✅ Participant registered for quest (no atomId):', quest.id, 'Address:', address);
        }
      }
      
      // Step 2: Complete the quest - this will trigger onSuccess in useQuests which invalidates and refetches user XP
      showToast('Claiming IQ...', 'info');
      await completeQuest(quest.id);
      
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
    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
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
    const title = (step.title || '').toLowerCase();
    const description = (step.description || '').toLowerCase();
    const combinedText = `${title} ${description}`;
    
    // Check for Twitter/X tasks - comprehensive check
    // Tasks like "Follow a Twitter account", "Make a post on Twitter", "Twitter connected", etc.
    if (combinedText.includes('twitter') || combinedText.includes(' x ') || combinedText === 'x') {
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      );
    } else if (combinedText.includes('discord')) {
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
        </svg>
      );
    } else if (combinedText.includes('telegram')) {
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.13-.31-1.09-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
        </svg>
      );
    } else if (combinedText.includes('website') || combinedText.includes('download') || combinedText.includes('visit')) {
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
          <polyline points="15 3 21 3 21 9"/>
          <line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
      );
    }
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
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

  // Get creator logo/initial
  const creatorInitials = quest.creatorType === 'community' && quest.creatorAddress
    ? quest.creatorAddress.slice(2, 4).toUpperCase()
    : quest.projectName.slice(0, 2).toUpperCase();

  return (
    <div className="quest-detail-container galxe-exact">
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
                  ? `${quest.creatorAddress.slice(0, 6)}...${quest.creatorAddress.slice(-4)}`
                  : quest.projectName}
              </span>
              {/* Show verified tick for pro users */}
              {creatorIsPro && (
                <svg className="quest-detail-verified-badge" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23 12l-2.44-2.78.34-3.68-3.61-.82-1.89-3.18L12 3 8.6 1.54 6.71 4.72l-3.61.81.34 3.68L1 12l2.44 2.78-.34 3.68 3.61.82 1.89 3.18L12 21l3.4 1.46 1.89-3.18 3.61-.82-.34-3.68L23 12zm-10 5l-5-5 1.41-1.41L12 14.17l3.59-3.58L17 12l-5 5z"/>
                </svg>
              )}
              {/* Follow button beside username - always show */}
              <button className="quest-detail-follow-btn" onClick={handleFollow}>
                <span>+</span> Follow
              </button>
            </div>
          </div>
          {/* Show participant count (quest participants) - always show */}
          <span className="quest-detail-follower-count">{participantCount >= 1000 ? `${(participantCount / 1000).toFixed(1)}K` : participantCount.toString()}</span>
        </div>
        <div className="quest-detail-header-right">
          {/* Message icon with feedback tooltip */}
          <div 
            className="quest-detail-header-icon-wrapper"
            onMouseEnter={() => setShowFeedbackTooltip(true)}
            onMouseLeave={() => setShowFeedbackTooltip(false)}
          >
            <button className="quest-detail-header-icon-btn" onClick={handleReportIssue}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
            {showFeedbackTooltip && (
              <div className="quest-detail-tooltip">Feedback</div>
            )}
          </div>
          
          {/* Twitter icon with space creator's X link - always show if we have a URL */}
          {(spaceTwitterUrl || quest.twitterLink) && (
            <a 
              href={spaceTwitterUrl || quest.twitterLink || '#'} 
              target="_blank" 
              rel="noopener noreferrer"
              className="quest-detail-header-icon-btn"
              title="Twitter"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
          )}
          
          {/* 3 dots dropdown menu */}
          <div className="quest-detail-dropdown-wrapper" ref={dropdownRef}>
            <button 
              className="quest-detail-header-icon-btn" 
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="1"/>
                <circle cx="19" cy="12" r="1"/>
                <circle cx="5" cy="12" r="1"/>
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
        <h1 className="quest-detail-page-title">{quest.title}'s Tasks</h1>
        <div className="quest-detail-metadata-row">
          <div className="quest-detail-participants-avatars">
            {/* Mock avatars - in real app would show actual participant avatars */}
            {Array.from({ length: Math.min(participantCount, 5) }).map((_, i) => (
              <div key={i} className="quest-detail-participant-avatar">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
            ))}
          </div>
          <span className="quest-detail-participant-count">{participantCount > 0 ? (participantCount >= 1000 ? `${(participantCount / 1000).toFixed(1)}K` : participantCount.toString()) : participantCount.toString()}</span>
          {quest.createdAt && (
            <span className="quest-detail-date">{formatDate(quest.createdAt)}</span>
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
          const isDisabled = isVerifying || isCooldown;
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
              {/* Left: Triangle/Play Icon */}
              <div className="quest-detail-task-play-icon">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
              
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
                title={isCooldown ? `Verify again in ${cooldownSeconds}s` : isVerified ? 'Verified' : 'Verify task'}
              >
                {isVerified ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="23 4 23 10 17 10"/>
                    <polyline points="1 20 1 14 7 14"/>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
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
          className={`quest-detail-claim-button-inline ${!allTasksCompleted || isClaimed || (address && quest.creatorAddress && address.toLowerCase() === quest.creatorAddress.toLowerCase()) ? 'disabled' : ''}`}
          onClick={handleClaimIQ}
          disabled={!allTasksCompleted || isClaimed || isCompleting || isCheckingClaim || !address || !!(address && quest.creatorAddress && address.toLowerCase() === quest.creatorAddress.toLowerCase())}
        >
          {isCheckingClaim ? (
            <>
              <div className="claim-spinner"></div>
              Checking...
            </>
          ) : isClaimed ? (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
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
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Complete All Tasks
            </>
          ) : (
            <>Claim</>
          )}
        </button>
      </div>

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
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
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
    </div>
  );
}