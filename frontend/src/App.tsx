import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { useAccount, useConnect, useDisconnect, useSwitchChain, useBalance } from 'wagmi';
import { QuestList } from './components/QuestList';
import { Leaderboard } from './components/Leaderboard';
import { CreateQuest } from './components/CreateQuest';
import { UserProfile } from './components/UserProfile';
import { ProjectSlideshow } from './components/ProjectSlideshow';
import { UserDashboard } from './components/UserDashboard';
import { EditProfile } from './components/EditProfile';
import { SignupModal } from './components/SignupModal';
import { OnboardingSetup } from './components/OnboardingSetup';
import { ToastContainer, showToast } from './components/Toast';
import { Search } from './components/Search';
import { Community } from './components/Community';
import { AllQuests } from './components/AllQuests';
import { Rewards } from './components/Rewards';
import { QuestDetail } from './components/QuestDetail';
import { Bounties } from './components/Bounties';
import { Raids } from './components/Raids';
import { OAuthCallback } from './components/OAuthCallback';
import { SpaceBuilder } from './components/SpaceBuilder';
import { SpaceDetailView } from './components/SpaceDetailView';
import { BuilderDashboard } from './components/BuilderDashboard';
import { SubscriptionModal } from './components/SubscriptionModal';
import { AdminLogin } from './components/AdminLogin';
import { ErrorBoundary } from './components/ErrorBoundary';
import { spaceService } from './services/spaceService';
import { questServiceBackend } from './services/questServiceBackend';
import type { Space } from './types';
import { useAdmin } from './hooks/useAdmin';
import { wagmiConfig } from './config/wagmi';
import { getDiceBearAvatar } from './utils/avatar';
import './App.css';

const queryClient = new QueryClient();

// Suppress wallet extension conflicts - these are browser-level issues that can't be fixed from app code
// Multiple wallet extensions (MetaMask, Zerion, etc.) compete for window.ethereum
if (typeof window !== 'undefined') {
  const originalError = console.error;
  const originalWarn = console.warn;
  
  // Filter console.error
  console.error = (...args: any[]) => {
    const message = args[0]?.toString() || '';
    // Filter out wallet extension conflicts
    if (
      message.includes('Cannot redefine property: ethereum') ||
      message.includes('Cannot redefine property: isZerion') ||
      message.includes('Failed to set window.ethereum') ||
      message.includes('MetaMask encountered an error setting the global Ethereum provider') ||
      message.includes('Cannot set property ethereum of #<Window>') ||
      message.includes('which has only a getter') ||
      message.includes('Receiving end does not exist') ||
      message.includes('Unchecked runtime.lastError')
    ) {
      // Silently ignore wallet extension conflicts
      return;
    }
    originalError.apply(console, args);
  };

  // Filter console.warn for similar issues
  console.warn = (...args: any[]) => {
    const message = args[0]?.toString() || '';
    if (
      message.includes('Cannot redefine property: ethereum') ||
      message.includes('Cannot redefine property: isZerion') ||
      message.includes('Failed to set window.ethereum') ||
      message.includes('MetaMask encountered an error') ||
      message.includes('Receiving end does not exist') ||
      message.includes('runtime.lastError')
    ) {
      return;
    }
    originalWarn.apply(console, args);
  };

  // Also catch unhandled promise rejections from wallet extensions
  window.addEventListener('unhandledrejection', (event) => {
    const message = event.reason?.message || event.reason?.toString() || '';
    if (
      message.includes('Cannot redefine property') ||
      message.includes('window.ethereum') ||
      message.includes('isZerion') ||
      message.includes('Receiving end does not exist')
    ) {
      event.preventDefault();
      return;
    }
  });
}

// Trust Token Contract Address
const TRUST_TOKEN_ADDRESS = '0x6cd905df2ed214b22e0d48ff17cd4200c1c6d8a3' as const;

// Profile Dropdown Component
// Helper function to get profile picture from localStorage
const getStoredProfilePic = (address: string | undefined): string | null => {
  if (!address) return null;
  try {
    const stored = localStorage.getItem(`user_profile_${address.toLowerCase()}`);
    if (stored) {
      const profile = JSON.parse(stored);
      return profile.profilePic || null;
    }
  } catch (error) {
    // Ignore errors
  }
  return null;
};

// Helper function to get username from localStorage
const getStoredUsername = (address: string | undefined): string | null => {
  if (!address) return null;
  try {
    const stored = localStorage.getItem(`user_profile_${address.toLowerCase()}`);
    if (stored) {
      const profile = JSON.parse(stored);
      return profile.username || null;
    }
  } catch (error) {
    // Ignore errors
  }
  return null;
};

// TRUST Balance Display Component
function TrustBalanceDisplay({ address }: { address: string }) {
  const { data: balance, isLoading } = useBalance({
    address: address as `0x${string}`,
  });

  const formatBalance = (value: bigint | undefined, decimals: number = 18): string => {
    if (!value) return '0.00';
    const num = Number(value) / Math.pow(10, decimals);
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(2) + 'K';
    } else if (num >= 1) {
      return num.toFixed(2);
    } else {
      return num.toFixed(4);
    }
  };

  return (
    <div className="trust-balance-display">
      <span className="trust-balance-amount">
        {isLoading ? '...' : formatBalance(balance?.value)}
      </span>
      <span className="trust-balance-symbol">TRUST</span>
    </div>
  );
}

interface ProfileDropdownProps {
  address: string;
  onDisconnect: () => void;
  onProfileClick: () => void;
  onBuilderProfileClick?: () => void;
}

function ProfileDropdown({ address, onDisconnect, onProfileClick, onBuilderProfileClick }: ProfileDropdownProps) {
  const profilePic = getStoredProfilePic(address);
  const username = getStoredUsername(address);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: balance } = useBalance({
    address: address as `0x${string}`,
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Format address for display
  const displayName = username || `${address.slice(0, 6)}...${address.slice(-4)}`;
  
  // Format balance for mobile dropdown
  const formatBalance = (value: bigint | undefined): string => {
    if (!value) return '0.00';
    const num = Number(value) / 1e18;
    return num >= 1 ? num.toFixed(2) : num.toFixed(4);
  };

  return (
    <div className="profile-dropdown" ref={dropdownRef}>
      <button
        className="profile-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Profile menu"
      >
        <img 
          src={profilePic || getDiceBearAvatar(address)} 
          alt="Profile" 
          className="profile-pic" 
        />
        <span className="profile-name">{displayName}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {isOpen && (
        <div className="profile-dropdown-menu">
          {/* TRUST Balance - First item in dropdown for mobile only */}
          <div className="dropdown-balance-item dropdown-balance-mobile">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v12M8 10l4-4 4 4M8 14l4 4 4-4"/>
            </svg>
            <span className="dropdown-balance-amount">{formatBalance(balance?.value)} TRUST</span>
          </div>
          <div className="dropdown-divider dropdown-divider-mobile" />
          <button onClick={() => { onProfileClick(); setIsOpen(false); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            My Profile
          </button>
          {onBuilderProfileClick && (
            <button onClick={() => { onBuilderProfileClick(); setIsOpen(false); }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
              Builder Dashboard
            </button>
          )}
          <button onClick={() => { onDisconnect(); setIsOpen(false); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}

function LoginButton({ onProfileClick, onBuilderProfileClick }: { onProfileClick: () => void; onBuilderProfileClick?: () => void }) {
  const { address, isConnected, chainId } = useAccount();
  const { connectors, connect, isPending, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  useEffect(() => {
    if (connectError) {
      const message = connectError.message;
      if (
        !message.includes('User rejected') &&
        !message.includes('user rejected') &&
        !message.includes('User denied') &&
        !message.includes('user denied')
      ) {
        showToast(`Connection error: ${message}`, 'error');
      }
    }
  }, [connectError]);

  const handleDisconnect = () => {
    // Disconnect wallet
    disconnect();
    
    // Clear authentication token
    localStorage.removeItem('auth_token');
    
    // Clear any user-specific cached data
    if (address) {
      localStorage.removeItem(`staked_amount_${address.toLowerCase()}`);
      localStorage.removeItem(`intuition_identity_${address.toLowerCase()}`);
      localStorage.removeItem(`verification_attempts_${address.toLowerCase()}`);
    }
    
    // Show success notification
    showToast('Wallet disconnected successfully', 'success');
  };

  if (isConnected && address) {
    // Show network switch button if on wrong chain
    if (chainId && chainId !== 1155) {
      return (
        <button 
          onClick={() => switchChain?.({ chainId: 1155 })}
          className="login-button"
          style={{ background: '#ef4444' }}
        >
          Switch to Intuition Network
        </button>
      );
    }

    return (
      <ProfileDropdown 
        address={address}
        onDisconnect={handleDisconnect}
        onProfileClick={onProfileClick}
        onBuilderProfileClick={onBuilderProfileClick}
      />
    );
  }

  const handleConnect = async () => {
    if (!connectors || connectors.length === 0) {
      showToast('No wallet connectors available. Please install a wallet extension.', 'error');
      return;
    }

    try {
      await connect({ connector: connectors[0] });
    } catch (error: any) {
      // User rejection is handled silently
      if (!error?.message?.includes('rejected') && !error?.message?.includes('denied')) {
        console.error('Connection error:', error);
      }
    }
  };

  return (
    <button 
      className="login-button" 
      onClick={handleConnect}
      disabled={isPending}
      aria-label="Connect Wallet"
    >
      {isPending ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
}

interface AppContentProps {
  initialTab?: string;
  questName?: string | null;
  spaceName?: string | null;
}

function AppContent({ initialTab = 'discover', questName = null, spaceName = null }: AppContentProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'quests' | 'leaderboard' | 'create' | 'profile' | 'discover' | 'community' | 'rewards' | 'bounties' | 'raids' | 'dashboard' | 'edit-profile' | 'full-leaderboard' | 'quest-detail' | 'space-builder' | 'space-detail' | 'builder-dashboard' | 'all-quests'>(initialTab as any);
  
  // Sync activeTab with initialTab when it changes (e.g., from URL navigation)
  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      console.log('🔄 Syncing activeTab with initialTab:', initialTab, 'current activeTab:', activeTab);
      setActiveTab(initialTab as any);
    }
  }, [initialTab, activeTab]);
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
  // Try to restore selectedSpace from localStorage on mount
  const getInitialSpace = (): Space | null => {
    try {
      const stored = localStorage.getItem('selectedSpace');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error parsing stored space:', e);
    }
    return null;
  };
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(getInitialSpace());
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(() => {
    const stored = localStorage.getItem('selectedSpaceId');
    return stored || null;
  });
  const { address, isConnected } = useAccount();
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [pendingSpaceCreation, setPendingSpaceCreation] = useState<(() => void) | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hasCreatedSpaces, setHasCreatedSpaces] = useState<boolean>(false);
  const [showMobileMenu, setShowMobileMenu] = useState<boolean>(false);
  const { isAuthenticated: isAdminAuthenticated, logout: adminLogout } = useAdmin();
  const navRef = useRef<HTMLElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Sync activeTab with initialTab prop (for routing)
  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      console.log('🔄 Syncing activeTab with initialTab:', initialTab, 'from', activeTab);
      setActiveTab(initialTab as any);
    }
  }, [initialTab]);
  
  // Restore space from localStorage when on space-detail tab
  useEffect(() => {
    if ((activeTab === 'space-detail' || initialTab === 'space-detail') && !selectedSpace) {
      const storedSpace = localStorage.getItem('selectedSpace');
      const storedSpaceId = localStorage.getItem('selectedSpaceId');
      if (storedSpace && storedSpaceId) {
        try {
          const space = JSON.parse(storedSpace);
          console.log('📦 Restoring space from localStorage:', space);
          setSelectedSpace(space);
          setSelectedSpaceId(space.id);
        } catch (e) {
          console.error('Error parsing stored space:', e);
        }
      }
    }
  }, [activeTab, initialTab, selectedSpace]);

  // Handle quest name from URL
  useEffect(() => {
    if (questName && activeTab === 'quest-detail') {
      // Find quest by name and set selectedQuestId
      const findQuestByName = async () => {
        try {
          const quests = await questServiceBackend.getAllQuests();
          const quest = quests.find((q: any) => 
            q.title.toLowerCase().replace(/\s+/g, '-') === questName.toLowerCase() ||
            q.id === questName
          );
          if (quest) {
            setSelectedQuestId(quest.id);
          }
        } catch (error) {
          console.error('Error finding quest:', error);
        }
      };
      findQuestByName();
    }
  }, [questName, activeTab]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMobileMenu && mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        if (!target.closest('.mobile-menu-button') && !target.closest('.mobile-menu-content')) {
          setShowMobileMenu(false);
        }
      }
    };

    if (showMobileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showMobileMenu]);

  // Handle space name from URL (only if we don't already have selectedSpace)
  useEffect(() => {
    // First, try to restore from localStorage if we have a spaceId stored
    const storedSpaceId = localStorage.getItem('selectedSpaceId');
    const storedSpace = localStorage.getItem('selectedSpace');
    
    if (storedSpaceId && storedSpace && !selectedSpace && (activeTab === 'space-detail' || initialTab === 'space-detail')) {
      try {
        const space = JSON.parse(storedSpace);
        console.log('📦 Restoring space from localStorage:', space);
        setSelectedSpace(space);
        setSelectedSpaceId(space.id);
        setActiveTab('space-detail');
        return; // Don't run the URL-based lookup if we restored from localStorage
      } catch (e) {
        console.error('Error parsing stored space:', e);
      }
    }
    
    // Only run if we have a spaceName, we're on space-detail tab, but don't have selectedSpace yet
    if (spaceName && (activeTab === 'space-detail' || initialTab === 'space-detail') && !selectedSpace) {
      console.log('🔍 Looking up space from URL, spaceName:', spaceName);
      // Find space by name and set selectedSpace
      const findSpaceByName = async () => {
        try {
          const spaces = await spaceService.getAllSpaces();
          console.log('📋 Available spaces:', spaces.length);
          // Try multiple matching strategies - normalize both sides
          const normalizedSpaceName = spaceName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          const space = spaces.find(s => {
            const spaceSlug = (s.slug || s.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')).toLowerCase();
            const spaceNameNormalized = s.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            return (
              s.slug?.toLowerCase() === spaceName.toLowerCase() ||
              s.slug?.toLowerCase() === normalizedSpaceName ||
              spaceSlug === spaceName.toLowerCase() ||
              spaceSlug === normalizedSpaceName ||
              spaceNameNormalized === spaceName.toLowerCase() ||
              spaceNameNormalized === normalizedSpaceName ||
              s.id === spaceName
            );
          });
          if (space) {
            console.log('✅ Found space:', space);
            setSelectedSpace(space);
            setSelectedSpaceId(space.id);
            localStorage.setItem('selectedSpaceId', space.id);
            localStorage.setItem('selectedSpace', JSON.stringify(space));
            setActiveTab('space-detail');
          } else {
            console.error('❌ Space not found for:', spaceName);
            console.log('📋 Available spaces:', spaces.map(s => ({ id: s.id, name: s.name, slug: s.slug })));
            // Don't navigate away immediately - wait longer to see if space loads
            setTimeout(() => {
              if (!selectedSpace) {
                console.log('⏱️ Space still not found after timeout, navigating to discover');
                navigateToTab('discover');
              }
            }, 3000);
          }
        } catch (error) {
          console.error('❌ Error finding space:', error);
          // Don't navigate away on error - might be a temporary issue
        }
      };
      findSpaceByName();
    }
  }, [spaceName, activeTab, initialTab, selectedSpace]);

  // Helper function to create URL-friendly slug from name
  const createSlug = (name: string): string => {
    return name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // Navigation helper
  const navigateToTab = (tab: string, params?: { questId?: string; questName?: string; spaceId?: string; spaceName?: string }) => {
    const routeMap: Record<string, string> = {
      'discover': '/home',
      'community': '/community',
      'rewards': '/rewards',
      'bounties': '/bounties',
      'raids': '/raids',
      'dashboard': '/dashboard',
      'builder-dashboard': '/builder-dashboard',
      'space-builder': '/create-space',
      'create': '/create-quest',
    };

    // Store previous tab before navigating
    if (tab !== activeTab) {
      localStorage.setItem('previousTab', activeTab);
    }

    if (params?.questName) {
      navigate(`/quest-${createSlug(params.questName)}`);
    } else if (params?.questId) {
      // Try to get quest name first
      questServiceBackend.getQuestById(params.questId).then((quest: any) => {
        if (quest) {
          navigate(`/quest-${createSlug(quest.title)}`);
        } else {
          navigate(`/quest-${params.questId}`);
        }
      }).catch(() => {
        navigate(`/quest-${params.questId}`);
      });
    } else if (params?.spaceName) {
      // Set the space and navigate to space detail
      if (params.spaceId) {
        setSelectedSpaceId(params.spaceId);
        // Try to get the space if we have spaceId but not the space object
        spaceService.getSpaceById(params.spaceId).then(space => {
          if (space) {
            setSelectedSpace(space);
            setSelectedSpaceId(space.id);
            localStorage.setItem('selectedSpaceId', space.id);
            localStorage.setItem('selectedSpace', JSON.stringify(space));
          }
        }).catch(() => {
          // If space fetch fails, still navigate
        });
      }
      setActiveTab('space-detail');
      navigate(`/space-${createSlug(params.spaceName)}`);
    } else if (params?.spaceId) {
      // Try to get space name first (async for Supabase)
      spaceService.getSpaceById(params.spaceId).then(space => {
        if (space) {
          setSelectedSpace(space);
          setSelectedSpaceId(space.id);
          setActiveTab('space-detail');
          navigate(`/space-${createSlug(space.name)}`);
        } else {
          navigate(`/space-${params.spaceId}`);
        }
      }).catch(() => {
        navigate(`/space-${params.spaceId}`);
      });
    } else if (routeMap[tab]) {
      navigate(routeMap[tab]);
    } else {
      setActiveTab(tab as any);
    }
  };

  // Hidden admin login/logout via keyboard shortcut (Ctrl+Shift+A or Cmd+Shift+A on Mac)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        if (isAdminAuthenticated) {
          // If already logged in, logout
          adminLogout();
          showToast('Admin logged out', 'success');
        } else {
          // If not logged in, show login modal
          setShowAdminLogin(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdminAuthenticated, adminLogout]);

  // Tab mapping for active tab index
  const tabMap: Record<string, number> = {
    'discover': 0,
    'community': 1,
    'rewards': 2,
    'bounties': 3,
    'raids': 4,
  };

  // Get the index of the active tab
  const getActiveTabIndex = (): number => {
    return tabMap[activeTab] ?? 0;
  };

  // Update slider position to active tab
  const updateSliderToActiveTab = useCallback(() => {
    if (!navRef.current || !sliderRef.current) return;
    
    const activeIndex = getActiveTabIndex();
    const activeItem = itemRefs.current[activeIndex];
    
    if (activeItem) {
      const nav = navRef.current;
      const slider = sliderRef.current;
      const navRect = nav.getBoundingClientRect();
      const itemRect = activeItem.getBoundingClientRect();
      slider.style.left = `${itemRect.left - navRect.left}px`;
      slider.style.width = `${itemRect.width}px`;
      slider.style.opacity = '1';
    }
  }, [activeTab]);

  // Scroll to top when tab changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  // Initialize slider position on mount and when activeTab changes
  useEffect(() => {
    // Small delay to ensure refs are set
    const timer = setTimeout(() => {
      if (hoveredIndex === null) {
        updateSliderToActiveTab();
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [activeTab, hoveredIndex, updateSliderToActiveTab]);

  // Also update when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      updateSliderToActiveTab();
    }, 100);
    return () => clearTimeout(timer);
  }, [updateSliderToActiveTab]);

  // Check if user needs onboarding
  useEffect(() => {
    if (isConnected && address) {
      const isNewUser = localStorage.getItem('isNewUser') === 'true';
      const onboardingComplete = localStorage.getItem('onboardingComplete') === 'true';
      
      // Close signup modal when connected
      setShowSignupModal(false);
      
      if (isNewUser && !onboardingComplete) {
        setShowOnboarding(true);
      }
    }
  }, [isConnected, address]);

  // Check if user has created spaces
  useEffect(() => {
    const checkUserSpaces = async () => {
      if (!address) {
        setHasCreatedSpaces(false);
        return;
      }

      try {
        const userSpaces = await spaceService.getSpacesByOwner(address);
        setHasCreatedSpaces(userSpaces.length > 0);
      } catch (error) {
        console.error('Error checking user spaces:', error);
        setHasCreatedSpaces(false);
      }
    };

    checkUserSpaces();

    // Listen for space creation/deletion events to update the state
    const handleSpaceCreated = async () => {
      // Immediately set to true if we have an address (optimistic update)
      if (address) {
        setHasCreatedSpaces(true);
      }
      // Then verify by checking the database
      await checkUserSpaces();
    };

    const handleSpaceDeleted = () => {
      checkUserSpaces();
    };

    window.addEventListener('spaceCreated', handleSpaceCreated);
    window.addEventListener('spaceDeleted', handleSpaceDeleted);

    return () => {
      window.removeEventListener('spaceCreated', handleSpaceCreated);
      window.removeEventListener('spaceDeleted', handleSpaceDeleted);
    };
  }, [address]);

  const menuItems = [
    { 
      label: 'Discover & Earn',
      tab: 'discover',
      path: '/home',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
      )
    },
    { 
      label: 'Community',
      tab: 'community',
      path: '/community',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      )
    },
    { 
      label: 'Rewards',
      tab: 'rewards',
      path: '/rewards',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="7"/>
          <path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12"/>
        </svg>
      )
    },
    { 
      label: 'Bounties',
      tab: 'bounties',
      path: '/bounties',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      )
    },
    { 
      label: 'Raids',
      tab: 'raids',
      path: '/raids',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 16V4m0 0L3 8m4-4l4 4"/>
          <path d="M17 8V20m0 0l4-4m-4 4l-4-4"/>
        </svg>
      )
    }
  ];

  return (
    <div className="app">
      <div className="app-content-wrapper">
      <header className="app-header">
        {/* Hamburger Menu Button - Mobile Only */}
        <button 
          className="mobile-menu-button"
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          aria-label="Toggle menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {showMobileMenu ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </>
            ) : (
              <>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </>
            )}
          </svg>
        </button>

        {/* Logo - Desktop: Left, Mobile: Center */}
        <Link to="/home" className="logo logo-mobile-center">
          <img src="/logo.svg" alt="TrustQuests Logo" className="logo-icon" />
        </Link>

        {/* Desktop Navigation */}
        <div className="header-left header-desktop">
          <nav 
            className="header-nav" 
            ref={navRef}
            onMouseLeave={() => {
              setHoveredIndex(null);
              // Return slider to active tab position when leaving nav area
              updateSliderToActiveTab();
            }}
          >
            <div className="header-nav-slider" ref={sliderRef} />
            {menuItems.map((item, index) => (
              <Link
                key={index}
                to={item.path}
                className="header-nav-item"
                ref={(el) => { itemRefs.current[index] = el; }}
                onMouseEnter={() => {
                  setHoveredIndex(index);
                  if (itemRefs.current[index] && sliderRef.current && navRef.current) {
                    const item = itemRefs.current[index];
                    const nav = navRef.current;
                    const slider = sliderRef.current;
                    const navRect = nav.getBoundingClientRect();
                    const itemRect = item.getBoundingClientRect();
                    slider.style.left = `${itemRect.left - navRect.left}px`;
                    slider.style.width = `${itemRect.width}px`;
                    slider.style.opacity = '1';
                  }
                }}
                onClick={(e) => {
                  e.preventDefault();
                  navigateToTab(item.tab);
                }}
              >
                <span className="header-nav-text">{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
        <div className="header-right">
          <div className="header-right-search header-desktop">
            <Search 
              placeholder="Search quests, projects, spaces..." 
              onSpaceSelect={(space) => {
                setSelectedSpace(space);
                navigateToTab('space-detail', { spaceId: space.id, spaceName: space.name });
              }}
              isAdmin={isAdminAuthenticated}
              onBuilderAccess={(space) => {
                setSelectedSpaceId(space.id);
                navigateToTab('builder-dashboard');
              }}
            />
          </div>
          {/* Desktop TRUST Balance Display */}
          {isConnected && address && (
            <div className="header-balance-desktop">
              <TrustBalanceDisplay address={address} />
            </div>
          )}
          {isAdminAuthenticated && (
            <button
              onClick={() => {
                adminLogout();
                showToast('Admin logged out', 'success');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '8px',
                color: '#ef4444',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Admin Logout
            </button>
          )}
          <LoginButton 
            onProfileClick={() => navigateToTab('dashboard')}
            onBuilderProfileClick={hasCreatedSpaces ? () => navigateToTab('builder-dashboard') : undefined}
          />
          {!isConnected && (
            <div className="header-right">
              <button 
                className="signup-button" 
                onClick={() => {
                  setShowSignupModal(true);
                }}
                aria-label="Sign Up"
                data-testid="signup-button"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>

        {/* Mobile Menu Dropdown - Glassmorphism */}
        {showMobileMenu && (
          <div 
            className="mobile-menu-dropdown"
            ref={mobileMenuRef}
            onClick={(e) => {
              // Close menu when clicking outside
              if (e.target === mobileMenuRef.current) {
                setShowMobileMenu(false);
              }
            }}
          >
            <div className="mobile-menu-content" onClick={(e) => e.stopPropagation()}>
              {menuItems.map((item, index) => (
                <Link
                  key={index}
                  to={item.path}
                  className="mobile-menu-item"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateToTab(item.tab);
                    setShowMobileMenu(false);
                  }}
                >
                  <span className="mobile-menu-icon">{item.icon}</span>
                  <span className="mobile-menu-text">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>
      <main className="app-main">
        {/* OAuth Callback Handler - Check URL path first (before other content) */}
        {(window.location.pathname.includes('/oauth/twitter/callback') ||
          window.location.pathname.includes('/oauth/discord/callback') ||
          window.location.pathname.includes('/oauth/github/callback') ||
          window.location.pathname.includes('/oauth/google/callback')) ? (
          <OAuthCallback />
        ) : showOnboarding ? (
          <OnboardingSetup onComplete={() => {
            setShowOnboarding(false);
            navigateToTab('discover');
          }} />
        ) : (
          <>
            {activeTab === 'quests' && (
              <QuestList 
                onQuestClick={(questId) => {
                  setSelectedQuestId(questId);
                  navigateToTab('quest-detail', { questId });
                }}
              />
            )}
            {activeTab === 'discover' && (
              <ProjectSlideshow 
                onQuestClick={(questId) => {
                  setSelectedQuestId(questId);
                  navigateToTab('quest-detail', { questId });
                }}
                onCreateSpace={() => {
                  // Check if user already has a space
                  if (address) {
                    spaceService.getSpacesByOwner(address).then(existingSpaces => {
                      if (existingSpaces.length > 0) {
                        showToast('You can only create one space. Redirecting to your existing space...', 'warning');
                        setSelectedSpaceId(existingSpaces[0].id);
                        navigateToTab('builder-dashboard');
                        return;
                      }
                    });
                  }
                  localStorage.setItem('spaceBuilderSource', 'discover');
                  localStorage.setItem('previousTab', 'discover');
                  setPendingSpaceCreation(() => () => {
                    navigateToTab('space-builder');
                  });
                  setShowSubscriptionModal(true);
                }}
                onSpaceClick={async (spaceId) => {
                  try {
                    console.log('🔄 Space card clicked, spaceId:', spaceId);
                    const space = await spaceService.getSpaceById(spaceId);
                    console.log('✅ Space loaded:', space);
                    
                    if (space) {
                      // Store in localStorage first for persistence
                      localStorage.setItem('previousTab', 'discover');
                      localStorage.setItem('selectedSpaceId', space.id);
                      localStorage.setItem('selectedSpace', JSON.stringify(space));
                      
                      // Set space data immediately
                      setSelectedSpace(space);
                      setSelectedSpaceId(space.id);
                      
                      // Navigate to space detail - set active tab first, then navigate
                      const spaceSlug = space.slug || space.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                      const targetPath = `/space-${spaceSlug}`;
                      console.log('📍 About to navigate to:', targetPath);
                      
                      // Set the active tab first to ensure the view is ready
                      setActiveTab('space-detail');
                      
                      // Small delay to ensure state is set, then navigate
                      setTimeout(() => {
                        navigate(targetPath);
                        console.log('📍 Navigated to:', targetPath);
                      }, 10);
                    } else {
                      console.error('❌ Space not found:', spaceId);
                      showToast('Space not found', 'error');
                    }
                  } catch (error) {
                    console.error('❌ Error loading space:', error);
                    showToast('Failed to load space details', 'error');
                  }
                }}
              />
            )}
            {activeTab === 'leaderboard' && <Leaderboard />}
            {activeTab === 'create' && <CreateQuest />}
            {activeTab === 'profile' && <UserProfile />}
            {activeTab === 'dashboard' && <UserDashboard onEditProfile={() => {
              // edit-profile is a sub-view, not a route, so use setActiveTab
              setActiveTab('edit-profile');
            }} />}
            {activeTab === 'edit-profile' && <EditProfile onBack={() => {
              setActiveTab('dashboard');
              navigate('/dashboard');
            }} />}
            {activeTab === 'community' && (
              <Community 
                onSeeMoreLeaderboard={() => setActiveTab('full-leaderboard')}
                onQuestClick={(questId) => {
                  setSelectedQuestId(questId);
                  navigateToTab('quest-detail', { questId });
                }}
                onCreateSpace={() => {
                  // Check if user already has a space
                  if (address) {
                    spaceService.getSpacesByOwner(address).then(existingSpaces => {
                      if (existingSpaces.length > 0) {
                        showToast('You can only create one space. Redirecting to your existing space...', 'warning');
                        setSelectedSpaceId(existingSpaces[0].id);
                        navigateToTab('builder-dashboard');
                        return;
                      }
                    });
                  }
                  localStorage.setItem('spaceBuilderSource', 'community');
                  localStorage.setItem('previousTab', 'community');
                  setPendingSpaceCreation(() => () => {
                    navigateToTab('space-builder');
                  });
                  setShowSubscriptionModal(true);
                }}
                onSeeMoreQuests={() => setActiveTab('all-quests')}
              />
            )}
            {activeTab === 'rewards' && <Rewards />}
            {activeTab === 'bounties' && <Bounties />}
            {activeTab === 'raids' && <Raids />}
            {activeTab === 'full-leaderboard' && <Leaderboard />}
            {activeTab === 'all-quests' && (
              <AllQuests 
                onBack={() => navigateToTab('community')}
                onQuestClick={(questId) => {
                  setSelectedQuestId(questId);
                  navigateToTab('quest-detail', { questId });
                }}
              />
            )}
            {activeTab === 'quest-detail' && selectedQuestId && (
              <QuestDetail 
                questId={selectedQuestId}
                onBack={() => {
                  const previousTab = localStorage.getItem('previousTab') || 'community';
                  navigateToTab(previousTab);
                }}
                onNavigateToProfile={() => {
                  // Navigate to user profile if needed
                  // Profile navigation can be implemented here
                }}
              />
            )}
            {activeTab === 'space-builder' && (
              <SpaceBuilder 
                onSpaceCreated={(spaceId) => {
                  setSelectedSpaceId(spaceId);
                  // Update hasCreatedSpaces immediately
                  setHasCreatedSpaces(true);
                  // Dispatch event to trigger refresh
                  window.dispatchEvent(new CustomEvent('spaceCreated'));
                  const source = localStorage.getItem('spaceBuilderSource') || 'discover';
                  const previousTab = localStorage.getItem('previousTab') || source;
                  navigateToTab('builder-dashboard');
                }}
                onBack={() => {
                  const previousTab = localStorage.getItem('previousTab') || 'discover';
                  navigateToTab(previousTab);
                }}
              />
            )}
            {(() => {
              const isSpaceDetailTab = activeTab === 'space-detail' || initialTab === 'space-detail';
              console.log('🎯 Rendering check - activeTab:', activeTab, 'initialTab:', initialTab, 'selectedSpace:', selectedSpace?.name, 'isSpaceDetailTab:', isSpaceDetailTab);
              
              if (isSpaceDetailTab && selectedSpace) {
                return (
                  <SpaceDetailView 
                    space={selectedSpace}
                    onBack={() => {
                      const previousTab = localStorage.getItem('previousTab') || 'discover';
                      navigateToTab(previousTab);
                    }}
                    onQuestClick={(questId) => {
                      setSelectedQuestId(questId);
                      navigateToTab('quest-detail', { questId });
                    }}
                  />
                );
              } else if (isSpaceDetailTab && !selectedSpace) {
                return (
                  <div style={{ 
                    padding: '40px', 
                    textAlign: 'center', 
                    color: 'var(--text-secondary)',
                    minHeight: '400px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <div>
                      <p>Loading space...</p>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
            {activeTab === 'builder-dashboard' && (
              <BuilderDashboard 
                spaceId={selectedSpaceId || ''}
                onBack={() => navigateToTab('discover')}
              />
            )}
          </>
        )}
      </main>
      <SignupModal 
        isOpen={showSignupModal}
        onClose={() => setShowSignupModal(false)}
        onSignupComplete={() => {
          setShowSignupModal(false);
          if (isConnected && address) {
            const isNewUser = localStorage.getItem('isNewUser') === 'true';
            if (isNewUser) {
              setShowOnboarding(true);
            }
          }
        }}
      />
      {showOnboarding && (
        <OnboardingSetup 
          onComplete={() => {
            setShowOnboarding(false);
            navigateToTab('discover');
          }}
        />
      )}
      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => {
          setShowSubscriptionModal(false);
          setPendingSpaceCreation(null);
        }}
        onProceed={() => {
          setShowSubscriptionModal(false);
          if (pendingSpaceCreation) {
            pendingSpaceCreation();
            setPendingSpaceCreation(null);
          }
        }}
      />
      {showAdminLogin && (
        <AdminLogin
          onCancel={() => setShowAdminLogin(false)}
          onSuccess={() => {
            setShowAdminLogin(false);
            showToast('Admin login successful', 'success');
          }}
        />
      )}
      <ToastContainer />
    </div>
    </div>
  );
}

interface AppProps {
  initialTab?: string;
  questName?: string | null;
  spaceName?: string | null;
}

function App({ initialTab, questName, spaceName }: AppProps = {}) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <AppContent 
            initialTab={initialTab}
            questName={questName}
            spaceName={spaceName}
          />
        </WagmiProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
export { TRUST_TOKEN_ADDRESS };
