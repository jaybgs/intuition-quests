import { useState, useEffect, useRef, useCallback, lazy, Suspense, useTransition } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { useAccount, useConnect, useDisconnect, useSwitchChain, useBalance } from 'wagmi';

// Lazy load route components for memory optimization
const QuestList = lazy(() => import('./components/QuestList').then(m => ({ default: m.QuestList })));
const Leaderboard = lazy(() => import('./components/Leaderboard').then(m => ({ default: m.Leaderboard })));
const CreateQuest = lazy(() => import('./components/CreateQuest').then(m => ({ default: m.CreateQuest })));
const UserProfile = lazy(() => import('./components/UserProfile').then(m => ({ default: m.UserProfile })));
const WeeklyHighlights = lazy(() => import('./components/WeeklyHighlights').then(m => ({ default: m.WeeklyHighlights })));
const UserDashboard = lazy(() => import('./components/UserDashboard').then(m => ({ default: m.UserDashboard })));
const EditProfile = lazy(() => import('./components/EditProfile').then(m => ({ default: m.EditProfile })));
const SignupModal = lazy(() => import('./components/SignupModal').then(m => ({ default: m.SignupModal })));
const OnboardingSetup = lazy(() => import('./components/OnboardingSetup').then(m => ({ default: m.OnboardingSetup })));
// Toast is critical, load eagerly? Or lazy is fine.
const ToastContainer = lazy(() => import('./components/Toast').then(m => ({ default: m.ToastContainer })));
import { showToast } from './components/Toast'; // Keep showToast eager as it is a function
const Search = lazy(() => import('./components/Search').then(m => ({ default: m.Search })));
const Community = lazy(() => import('./components/Community').then(m => ({ default: m.Community })));
const AllQuests = lazy(() => import('./components/AllQuests').then(m => ({ default: m.AllQuests })));
const Rewards = lazy(() => import('./components/Rewards').then(m => ({ default: m.Rewards })));
const QuestDetail = lazy(() => import('./components/QuestDetail').then(m => ({ default: m.QuestDetail })));
const Bounties = lazy(() => import('./components/Bounties').then(m => ({ default: m.Bounties })));
const Raids = lazy(() => import('./components/Raids').then(m => ({ default: m.Raids })));
const SpaceBuilder = lazy(() => import('./components/SpaceBuilder').then(m => ({ default: m.SpaceBuilder })));
const SpaceDetailView = lazy(() => import('./components/SpaceDetailView').then(m => ({ default: m.SpaceDetailView })));
const BuilderDashboard = lazy(() => import('./components/BuilderDashboard').then(m => ({ default: m.BuilderDashboard })));
const CreatorDashboard = lazy(() => import('./components/CreatorDashboard').then(m => ({ default: m.CreatorDashboard })));
const SubscriptionModal = lazy(() => import('./components/SubscriptionModal').then(m => ({ default: m.SubscriptionModal })));
const Spaces = lazy(() => import('./components/Spaces').then(m => ({ default: m.Spaces })));
const AdminLogin = lazy(() => import('./components/AdminLogin').then(m => ({ default: m.AdminLogin })));
import { ErrorBoundary } from './components/ErrorBoundary';
const FAQButton = lazy(() => import('./components/FAQButton').then(m => ({ default: m.FAQButton })));
const HighlightsEditor = lazy(() => import('./components/HighlightsEditor').then(m => ({ default: m.HighlightsEditor })));

import Footer from './components/Footer'; // Keep footer eager for layout stability, or lazy if huge.

import { spaceService } from './services/spaceService';
import { questServiceSupabase } from './services/questServiceSupabase';
import { apiClient } from './services/apiClient';
import type { Space } from './types';
import { useAdmin } from './hooks/useAdmin';
import { useSubscription } from './hooks/useSubscription';
import { useAuth } from './hooks/useAuth';
import { wagmiConfig } from './config/wagmi';
import { getDiceBearAvatar } from './utils/avatar';
import { isPCDevice } from './utils/deviceDetection';
import DotGrid from './components/DotGrid';
import StaggeredMenu from './components/StaggeredMenu';
import { MobileProfileDropdown } from './components/MobileProfileDropdown';
import { WalletSelectionModal } from './components/WalletSelectionModal';
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
      message.includes('runtime.lastError') ||
      message.includes('Cannot set property ethereum') ||
      message.includes('which has only a getter')
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
  spaceName?: string;
}

function ProfileDropdown({ address, onDisconnect, onProfileClick, onBuilderProfileClick, spaceName }: ProfileDropdownProps) {
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
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
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

  // Abbreviate space name if too long
  const abbreviateSpaceName = (name: string, maxLength: number = 20): string => {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength - 3) + '...';
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
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {isOpen && (
        <div className="profile-dropdown-menu">

          <button onClick={() => { onProfileClick(); setIsOpen(false); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            My Profile
          </button>
          {onBuilderProfileClick && (
            <button onClick={() => { onBuilderProfileClick(); setIsOpen(false); }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
              {spaceName ? abbreviateSpaceName(spaceName) : 'Space Dashboard'}
            </button>
          )}
          <button onClick={() => { onDisconnect(); setIsOpen(false); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}



// ... (keep existing imports)

function LoginButton({
  onProfileClick,
  onBuilderProfileClick,
  onDisconnect,
  onShowLoginModal,
  spaceName
}: {
  onProfileClick: () => void;
  onBuilderProfileClick?: () => void;
  onDisconnect: () => void;
  onShowLoginModal: () => void;
  spaceName?: string;
}) {
  const { address, isConnected, chainId } = useAccount();
  const { isPending, error: connectError } = useConnect();
  const { switchChain } = useSwitchChain();
  const { authenticate, isAuthenticated, isAuthenticating } = useAuth();
  const hasAttemptedAuth = useRef(false);

  // Auto-authenticate when wallet connects (only once)
  useEffect(() => {
    if (isConnected && address && chainId === 1155 && !isAuthenticated && !isAuthenticating && !hasAttemptedAuth.current) {
      // Check if we have a valid token already
      const existingToken = localStorage.getItem('auth_token');
      if (!existingToken) {
        hasAttemptedAuth.current = true;
        console.log('🔐 Auto-authenticating wallet...');
        authenticate().then(success => {
          if (success) {
            console.log('✅ Wallet authenticated successfully');
          } else {
            console.warn('⚠️ Wallet authentication failed - some features may be limited');
            // Reset so user can try again if needed
            hasAttemptedAuth.current = false;
          }
        });
      }
    }

    // Reset when disconnected
    if (!isConnected) {
      hasAttemptedAuth.current = false;
    }
  }, [isConnected, address, chainId, isAuthenticated, isAuthenticating, authenticate]);

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
        onDisconnect={onDisconnect}
        onProfileClick={onProfileClick}
        onBuilderProfileClick={onBuilderProfileClick}
        spaceName={spaceName}
      />
    );
  }

  return (
    <button
      className="login-button"
      onClick={onShowLoginModal}
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
  const [isPending, startTransition] = useTransition();
  const [activeTab, _setActiveTab] = useState<'quests' | 'leaderboard' | 'create' | 'profile' | 'discover' | 'community' | 'rewards' | 'bounties' | 'raids' | 'dashboard' | 'edit-profile' | 'full-leaderboard' | 'quest-detail' | 'space-builder' | 'space-detail' | 'space-dashboard' | 'all-quests' | 'edit-slideshow'>(initialTab as any);

  const setActiveTab = useCallback((tab: any) => {
    startTransition(() => {
      _setActiveTab(tab);
    });
  }, []);

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
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);

  // Sync activeTab with initialTab when it changes (e.g., from URL navigation)
  // This ensures that when the URL changes, the tab switches accordingly
  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      // If initialTab is quest-detail, always set it (even if selectedQuestId is not set yet)
      // The quest will be loaded by the questName useEffect
      if (initialTab === 'quest-detail') {
        console.log('🔄 Setting activeTab to quest-detail from route');
        setActiveTab('quest-detail');
        return;
      }
      // If initialTab is space-detail, always set it (even if selectedSpace is not set yet)
      // The space will be loaded by the spaceName useEffect
      if (initialTab === 'space-detail') {
        console.log('🔄 Setting activeTab to space-detail from route');
        setActiveTab('space-detail');
        return;
      }
      // Don't override quest-detail if we have a selectedQuestId (manual navigation)
      // This prevents React Router from resetting the tab when route doesn't match
      // Also don't override if we're navigating from space-detail to quest-detail
      if (activeTab === 'quest-detail' && (selectedQuestId || initialTab === 'space-detail')) {
        console.log('🔄 Keeping quest-detail tab (manual navigation), ignoring initialTab:', initialTab);
        return;
      }
      // Don't override space-detail if we have a selectedSpace (manual navigation)
      // This prevents React Router from resetting the tab when route doesn't match
      // But allow override if we're navigating to quest-detail
      if (activeTab === 'space-detail' && selectedSpace && initialTab !== 'quest-detail') {
        console.log('🔄 Keeping space-detail tab (manual navigation), ignoring initialTab:', initialTab);
        return;
      }
      // For all other tabs, sync activeTab with initialTab
      console.log('🔄 Syncing activeTab with initialTab:', initialTab, 'current activeTab:', activeTab);
      setActiveTab(initialTab as any);
    }
  }, [initialTab, activeTab, selectedSpace, selectedQuestId]);

  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(() => {
    const stored = localStorage.getItem('selectedSpaceId');
    return stored || null;
  });

  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [pendingSpaceCreation, setPendingSpaceCreation] = useState<((tier: 'free' | 'pro') => void) | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hasCreatedSpaces, setHasCreatedSpaces] = useState<boolean>(false);
  const [showMobileProfileMenu, setShowMobileProfileMenu] = useState<boolean>(false);
  const [showMobileMenu, setShowMobileMenu] = useState<boolean>(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [isDatabasePro, setIsDatabasePro] = useState<boolean | null>(null);
  const { isAuthenticated: isAdminAuthenticated, logout: adminLogout } = useAdmin();
  const { isPro: isLocalPro } = useSubscription();
  const [userSpace, setUserSpace] = useState<Space | null>(null);

  // Auto-logout admin on mobile devices (real mobile only, not desktop resize)
  /*
  useEffect(() => {
    const handleResize = () => {
      // Only logout if it's NOT a PC device AND width is small
      // This allows testing mobile layout on desktop by resizing window
      if (!isPCDevice() && window.innerWidth <= 768 && isAdminAuthenticated) {
        adminLogout();
        showToast('Admin logged out: Mobile device detected', 'warning');
      }
    };

    // Check on mount
    handleResize();

    // Check on resize
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isAdminAuthenticated, adminLogout]);
  */

  // Check database for pro subscription status
  const checkDatabaseProStatus = async () => {
    if (!address) return false;

    try {
      const response = await apiClient.get('/subscription/status');
      return response.data.hasPro;
    } catch (error) {
      console.error('Failed to check database pro status:', error);
      return false;
    }
  };

  // Shared disconnect handler
  const handleDisconnect = async () => {
    try {
      // Disconnect from wagmi first
      await disconnect();
    } catch (err) {
      console.warn('Error during wagmi disconnect:', err);
      // Continue with cleanup even if disconnect fails
    }

    // Clear authentication token
    localStorage.removeItem('auth_token');

    // Clear all wagmi/web3modal cached connection state to fully reset wallet session
    // Clear all localStorage keys that start with wagmi or walletconnect
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('wagmi') ||
        key.startsWith('walletconnect') ||
        key.startsWith('wc@') ||
        key.startsWith('W3M') ||
        key.startsWith('w3m')
      )) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));

    // Also explicitly remove known keys (in case they weren't caught above)
    localStorage.removeItem('wagmi.store');
    localStorage.removeItem('walletconnect');
    localStorage.removeItem('wc@2:client');
    localStorage.removeItem('wc@2:core');
    localStorage.removeItem('wc@2:ethereum_provider');

    // Clear any user-specific cached data
    if (address) {
      const lowerAddress = address.toLowerCase();
      localStorage.removeItem(`staked_amount_${lowerAddress}`);
      localStorage.removeItem(`intuition_identity_${lowerAddress}`);
      localStorage.removeItem(`verification_attempts_${lowerAddress}`);
      localStorage.removeItem(`username_${lowerAddress}`);
      localStorage.removeItem(`profile_pic_${lowerAddress}`);
    }

    // Clear connected wallets list
    localStorage.removeItem('connected_wallets');

    // Show success notification
    showToast('Wallet disconnected successfully', 'success');

    // Force a page reload to fully reset the app state
    // This ensures all components re-initialize with disconnected state
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const navRef = useRef<HTMLElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // This useEffect is handled by the one below - removed to avoid conflicts

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

  // Fetch user's space for dropdown display
  useEffect(() => {
    const fetchUserSpace = async () => {
      if (address && isConnected) {
        try {
          const spaces = await spaceService.getSpacesByOwner(address);
          if (spaces.length > 0) {
            setUserSpace(spaces[0]); // Get the first space
            setHasCreatedSpaces(true);
          } else {
            setUserSpace(null);
            setHasCreatedSpaces(false);
          }
        } catch (error) {
          console.error('Error fetching user space:', error);
          setUserSpace(null);
          setHasCreatedSpaces(false);
        }
      } else {
        setUserSpace(null);
        setHasCreatedSpaces(false);
      }
    };

    fetchUserSpace();
  }, [address, isConnected]);


  // Restore quest from localStorage or URL when on quest-detail tab
  useEffect(() => {
    if ((activeTab === 'quest-detail' || initialTab === 'quest-detail') && !selectedQuestId) {
      // First, check if we have a questName from URL (prioritize deep links)
      if (questName) {
        const decodedQuestName = decodeURIComponent(questName);
        console.log('📦 Using questName from URL as questId:', decodedQuestName);
        setSelectedQuestId(decodedQuestName);
        // Don't save to localStorage yet, let the validation logic below handle it
        return;
      }

      // Removed localStorage fallback (User Request) to prevent loading stale drafts
    }
  }, [activeTab, initialTab, selectedQuestId, questName]);

  // Handle quest name from URL (only if we don't already have selectedQuestId)
  useEffect(() => {
    console.log('🔍 Quest lookup useEffect triggered - activeTab:', activeTab, 'initialTab:', initialTab, 'questName:', questName, 'selectedQuestId:', selectedQuestId);

    // Skip if we're not on quest-detail tab
    if (activeTab !== 'quest-detail' && initialTab !== 'quest-detail') {
      console.log('🔍 Skipping quest lookup - not on quest-detail tab');
      return;
    }

    // Ensure activeTab is set to quest-detail if initialTab is quest-detail
    if (initialTab === 'quest-detail' && activeTab !== 'quest-detail') {
      console.log('🔍 Setting activeTab to quest-detail');
      setActiveTab('quest-detail');
    }

    // If we already have a selectedQuestId and questName matches, don't reload
    if (selectedQuestId && questName) {
      // Check if the current quest matches the questName from URL
      const findQuestById = async () => {
        try {
          const quests = await questServiceSupabase.getAllQuests();
          const currentQuest = quests.find((q: any) => q.id === selectedQuestId);
          if (currentQuest) {
            const questSlug = currentQuest.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            const urlSlug = decodeURIComponent(questName).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            const matches = currentQuest.id === questName ||
              currentQuest.id === decodeURIComponent(questName) ||
              questSlug === urlSlug;

            if (matches) {
              console.log('🔍 Current quest matches URL, keeping selectedQuestId');
              return;
            }
          }
        } catch (error) {
          console.error('Error checking quest match:', error);
        }
      };
      findQuestById();
    }

    // Find quest by name/ID and set selectedQuestId
    if (questName) {
      // Check if questName is actually a questId (starts with 'quest_' or matches ID pattern)
      const decodedQuestName = decodeURIComponent(questName);

      // Explicitly check for draft vs published quest
      const isDraftId = decodedQuestName.startsWith('quest_draft_');
      const isQuestId = (decodedQuestName.startsWith('quest_') && !isDraftId) || decodedQuestName.length > 20;

      if (isDraftId) {
        console.log('🔍 Detected draft ID in URL, redirecting to builder:', decodedQuestName);
        // If we have a draft ID in the URL, we should likely be in builder mode
        // For now, let's just not treat it as a published quest ID
        // The router should handle /builder/draft/:id properly if configured, 
        // but if we are here (QuestDetail route), we should probably redirect
        window.location.hash = `#/builder?draftId=${decodedQuestName}`;
        return;
      }

      if (isQuestId) {
        // If it's a questId, use it directly
        console.log('🔍 Using questName as questId directly:', decodedQuestName);
        setSelectedQuestId(decodedQuestName);
      } else {
        // Otherwise, try to find the quest by name/slug
        const findQuestByName = async () => {
          try {
            const quests = await questServiceSupabase.getAllQuests();
            const quest = quests.find((q: any) => {
              const questSlug = q.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
              const urlSlug = decodedQuestName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
              return q.id === decodedQuestName ||
                q.id === questName ||
                q.title.toLowerCase().replace(/\s+/g, '-') === questName.toLowerCase() ||
                questSlug === urlSlug;
            });
            if (quest) {
              console.log('🔍 Found quest from URL:', quest.id, quest.title);
              setSelectedQuestId(quest.id);
            } else {
              console.warn('🔍 Quest not found for questName:', questName);
              // If quest not found by name, try using questName as ID anyway
              setSelectedQuestId(decodedQuestName);
            }
          } catch (error) {
            console.error('Error finding quest:', error);
            // On error, still try to use questName as ID
            setSelectedQuestId(decodedQuestName);
          }
        };
        findQuestByName();
      }
    }
  }, [questName, activeTab, initialTab, selectedQuestId]);

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
    console.log('🔍 Space lookup useEffect triggered - activeTab:', activeTab, 'initialTab:', initialTab, 'spaceName:', spaceName, 'selectedSpace:', selectedSpace?.name);

    // Skip if we're not on space-detail tab
    if (activeTab !== 'space-detail' && initialTab !== 'space-detail') {
      console.log('🔍 Skipping space lookup - not on space-detail tab');
      return;
    }

    // Ensure activeTab is set to space-detail if initialTab is space-detail
    if (initialTab === 'space-detail' && activeTab !== 'space-detail') {
      console.log('🔍 Setting activeTab to space-detail');
      setActiveTab('space-detail');
    }

    // Always check localStorage first - it's the most reliable source
    // (set synchronously in onSpaceClick before navigation)
    const storedSpaceId = localStorage.getItem('selectedSpaceId');
    const storedSpace = localStorage.getItem('selectedSpace');

    if (storedSpaceId && storedSpace) {
      try {
        const space = JSON.parse(storedSpace);

        // If we have spaceName from URL, verify the stored space matches
        if (spaceName) {
          const spaceSlug = (space.slug || space.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')).toLowerCase();
          const urlSlug = decodeURIComponent(spaceName).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          const spaceNameNormalized = space.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

          // Check if stored space matches URL
          const matches = space.id === spaceName ||
            space.id === decodeURIComponent(spaceName) ||
            spaceSlug === urlSlug ||
            spaceNameNormalized === urlSlug;

          if (matches) {
            // Stored space matches URL, use it
            if (!selectedSpace || selectedSpace.id !== space.id) {
              console.log('📦 Using stored space that matches URL:', space.name);
              setSelectedSpace(space);
              setSelectedSpaceId(space.id);
              setActiveTab('space-detail');
            }
            return; // Don't do async lookup
          }
        } else {
          // No spaceName in URL, but we have stored space - use it
          if (!selectedSpace || selectedSpace.id !== space.id) {
            console.log('📦 Restoring space from localStorage:', space.name);
            setSelectedSpace(space);
            setSelectedSpaceId(space.id);
            setActiveTab('space-detail');
          }
          return; // Don't do async lookup
        }
      } catch (e) {
        console.error('Error parsing stored space:', e);
      }
    }

    // Only do async lookup if we have spaceName but no matching stored space
    if (spaceName && (!selectedSpace || (selectedSpace.id !== spaceName && selectedSpace.id !== decodeURIComponent(spaceName)))) {
      console.log('🔍 Looking up space from URL, spaceName:', spaceName);
      // Find space by name and set selectedSpace
      const findSpaceByName = async () => {
        try {
          const spaces = await spaceService.getAllSpaces();
          console.log('📋 Available spaces:', spaces.length);
          console.log('📋 Space names:', spaces.map(s => ({ id: s.id, name: s.name, slug: s.slug })));

          // Try multiple matching strategies - normalize both sides
          const normalizedSpaceName = decodeURIComponent(spaceName).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          const space = spaces.find(s => {
            if (!s) return false;
            const spaceSlug = (s.slug || s.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')).toLowerCase();
            const spaceNameNormalized = s.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            const urlSpaceName = decodeURIComponent(spaceName).toLowerCase();

            return (
              s.slug?.toLowerCase() === urlSpaceName ||
              s.slug?.toLowerCase() === normalizedSpaceName ||
              spaceSlug === urlSpaceName ||
              spaceSlug === normalizedSpaceName ||
              spaceNameNormalized === urlSpaceName ||
              spaceNameNormalized === normalizedSpaceName ||
              s.id === spaceName ||
              s.id === decodeURIComponent(spaceName)
            );
          });

          if (space) {
            console.log('✅ Found space:', space.name, 'slug:', space.slug);
            setSelectedSpace(space);
            setSelectedSpaceId(space.id);
            localStorage.setItem('selectedSpaceId', space.id);
            localStorage.setItem('selectedSpace', JSON.stringify(space));
            setActiveTab('space-detail');
          } else {
            console.error('❌ Space not found for:', spaceName);
            console.log('📋 Available spaces:', spaces.map(s => ({ id: s.id, name: s.name, slug: s.slug })));
            console.log('🔍 Tried matching:', {
              urlSpaceName: decodeURIComponent(spaceName).toLowerCase(),
              normalizedSpaceName
            });
            showToast(`Space "${spaceName}" not found`, 'error');
            // Only navigate back if we're not already on a space route
            // Give it more time in case the space is still loading
            setTimeout(() => {
              // Check if we're still on the space route before redirecting
              if (window.location.pathname.startsWith('/space/')) {
                const previousTab = localStorage.getItem('previousTab') || 'discover';
                navigateToTab(previousTab);
              }
            }, 3000);
          }
        } catch (error) {
          console.error('❌ Error finding space:', error);
          showToast('Error loading space', 'error');
          // Only navigate back if we're still on the space route
          setTimeout(() => {
            if (window.location.pathname.startsWith('/space/')) {
              const previousTab = localStorage.getItem('previousTab') || 'discover';
              navigateToTab(previousTab);
            }
          }, 3000);
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
      'spaces': '/spaces',
      'rewards': '/rewards',
      'bounties': '/bounties',
      'raids': '/raids',
      'dashboard': '/dashboard',
      'space-dashboard': '/space-dashboard',
      'space-builder': '/create-space',
      'create': '/create-quest',
      'edit-slideshow': '/edit-slideshow',
    };

    // Store previous tab before navigating
    if (tab !== activeTab) {
      localStorage.setItem('previousTab', activeTab);
    }

    if (params?.questName) {
      // Set activeTab BEFORE navigating to prevent route from resetting it
      setActiveTab('quest-detail');
      navigate(`/quest/${createSlug(params.questName)}`);
    } else if (params?.questId) {
      // Set selectedQuestId immediately (synchronously) before async operations
      setSelectedQuestId(params.questId);
      // Store quest ID in localStorage for persistence
      localStorage.setItem('selectedQuestId', params.questId);

      // Navigate immediately with questId to prevent route sync issues - use /quest/ format
      navigate(`/quest/${params.questId}`);

      // Set activeTab AFTER navigating to prevent route from resetting it
      setActiveTab('quest-detail');

      // Try to get quest name from Supabase and update URL if found
      questServiceSupabase.getQuestById(params.questId).then((quest: any) => {
        if (quest && quest.title) {
          const questSlug = createSlug(quest.title);
          // Only update URL if it's different from current
          const currentPath = window.location.pathname;
          if (!currentPath.includes(questSlug)) {
            navigate(`/quest/${questSlug}`, { replace: true });
          }
        }
      }).catch(() => {
        // Keep the questId-based URL if we can't fetch the quest
      });
    } else if (params?.spaceName) {
      // Set the space and navigate to space detail
      if (params.spaceId) {
        setSelectedSpaceId(params.spaceId);

        // First check if we already have the space set (from onSpaceClick)
        // This is the most reliable source since it's set synchronously
        if (selectedSpace && selectedSpace.id === params.spaceId) {
          // Space is already set, just navigate
          console.log('✅ Using already set space:', selectedSpace.name);
        } else {
          // Try to get the space from localStorage (set by onSpaceClick)
          const storedSpace = localStorage.getItem('selectedSpace');
          if (storedSpace) {
            try {
              const space = JSON.parse(storedSpace);
              if (space.id === params.spaceId) {
                // Use stored space immediately
                console.log('✅ Using stored space:', space.name);
                setSelectedSpace(space);
              } else {
                // IDs don't match, fetch the correct space
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
            } catch (e) {
              // If parsing fails, fetch
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
          } else {
            // No stored space, fetch it
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
        }
      }
      // Set activeTab BEFORE navigating to prevent route from resetting it
      setActiveTab('space-detail');
      navigate(`/space/${createSlug(params.spaceName)}`);
    } else if (params?.spaceId) {
      // Try to get space name first (async for Supabase)
      spaceService.getSpaceById(params.spaceId).then(space => {
        if (space) {
          setSelectedSpace(space);
          setSelectedSpaceId(space.id);
          setActiveTab('space-detail');
          navigate(`/space/${createSlug(space.name)}`);
        } else {
          navigate(`/space/${params.spaceId}`);
        }
      }).catch(() => {
        navigate(`/space/${params.spaceId}`);
      });
    } else if (routeMap[tab]) {
      // Set activeTab BEFORE navigating to ensure tab switches immediately
      setActiveTab(tab as any);
      navigate(routeMap[tab]);
    } else {
      setActiveTab(tab as any);
    }
  };

  // Auto-logout wallet when admin logs in
  useEffect(() => {
    const handleAdminLoginAutoLogout = () => {
      if (isConnected) {
        console.log('🔐 Admin login detected - auto-logging out wallet connection');
        // disconnect(); // DISABLED: This causes admin session to be cleared in some cases
        showToast('Wallet connection preserved', 'info');
      }
    };

    window.addEventListener('adminLoginAutoLogout', handleAdminLoginAutoLogout);
    return () => window.removeEventListener('adminLoginAutoLogout', handleAdminLoginAutoLogout);
  }, [isConnected, disconnect]);

  // Hidden admin login/logout via keyboard shortcut (Ctrl+Shift+A or Cmd+Shift+A on Mac) - PC only
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only allow admin access on PC devices
      if (!isPCDevice()) {
        return;
      }

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
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      )
    },
    {
      label: 'Community',
      tab: 'community',
      path: '/community',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    },
    {
      label: 'Rewards',
      tab: 'rewards',
      path: '/rewards',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="7" />
          <path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12" />
        </svg>
      )
    },
    {
      label: 'Bounties',
      tab: 'bounties',
      path: '/bounties',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      )
    },
    {
      label: 'Raids',
      tab: 'raids',
      path: '/raids',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 16V4m0 0L3 8m4-4l4 4" />
          <path d="M17 8V20m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    }
  ];

  return (
    <div className="app">
      <DotGrid
        dotSize={6}
        mobileDotSize={3}
        gap={24}
        baseColor="#360404"
        activeColor="#0e5e71"
        proximity={100}
        shockRadius={250}
        shockStrength={5}
        resistance={750}
        returnDuration={1.5}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          pointerEvents: 'none',
          background: 'transparent'
        }}
      />

      {/* Mobile Navigation - StaggeredMenu */}
      <StaggeredMenu
        position="right"
        items={[
          { label: 'Discover & Earn', ariaLabel: 'Go to Discover & Earn', link: '/home' },
          { label: 'Community', ariaLabel: 'Go to Community', link: '/home' },
          { label: 'Rewards', ariaLabel: 'Go to Rewards', link: '/home' },
          { label: 'Bounties', ariaLabel: 'Go to Bounties', link: '/home' },
          { label: 'Raids', ariaLabel: 'Go to Raids', link: '/home' }
        ]}
        socialItems={[
          { label: 'Twitter', link: 'https://twitter.com/TrustQuests' },
          { label: 'Discord', link: 'https://discord.gg/TrustQuests' }
        ]}
        displaySocials={false}
        displayItemNumbering={true}
        menuButtonColor="#ffffff"
        openMenuButtonColor="#ffffff"
        changeMenuColorOnOpen={true}
        colors={['#1a1f35', '#0a0e27']}
        logoUrl="/logo.svg"
        accentColor="#2563eb"
        onNavigate={(label) => {
          // Map menu labels to tab names
          const labelToTab: Record<string, string> = {
            'Discover & Earn': 'discover',
            'Community': 'community',
            'Rewards': 'rewards',
            'Bounties': 'bounties',
            'Raids': 'raids'
          };
          const tab = labelToTab[label] || 'discover';
          navigateToTab(tab);
        }}
        onConnectWallet={() => {
          // Click the login button in the header to trigger wallet connection
          const loginBtn = document.querySelector('.login-button') as HTMLButtonElement;
          if (loginBtn) {
            loginBtn.click();
          }
        }}
        isConnected={isConnected}
        userAddress={address}
        userProfilePic={getStoredProfilePic(address) || undefined}
        onProfileClick={() => setShowMobileProfileMenu(!showMobileProfileMenu)}
      />

      {/* Mobile Profile Dropdown */}
      {isConnected && address && (
        <MobileProfileDropdown
          address={address}
          isOpen={showMobileProfileMenu}
          onClose={() => setShowMobileProfileMenu(false)}
          onDisconnect={handleDisconnect}
          onProfileClick={() => {
            navigateToTab('dashboard');
            setShowMobileProfileMenu(false);
          }}
          onBuilderProfileClick={hasCreatedSpaces ? () => {
            navigateToTab('space-dashboard');
            setShowMobileProfileMenu(false);
          } : undefined}
          spaceName={userSpace?.name}
        />
      )}

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
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
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
                  navigateToTab('space-detail', { spaceId: space.id, spaceName: space.name || space.id });
                }}
                onQuestSelect={(questId) => {
                  setSelectedQuestId(questId);
                  navigateToTab('quest-detail');
                }}
                isAdmin={isAdminAuthenticated}
                onBuilderAccess={(space) => {
                  setSelectedSpaceId(space.id);
                  navigateToTab('space-dashboard');
                }}
              />
            </div>

            {/* Desktop TRUST Balance Display */}
            {isConnected && address && (
              <div className="header-balance-desktop">
                <TrustBalanceDisplay address={address} />
              </div>
            )}

            {isAdminAuthenticated && isPCDevice() && (
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
              onBuilderProfileClick={hasCreatedSpaces ? () => navigateToTab('space-dashboard') : undefined}
              onDisconnect={handleDisconnect}
              onShowLoginModal={() => setShowWalletModal(true)}
              spaceName={userSpace?.name}
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
          <Suspense fallback={
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '50vh',
              width: '100%',
              color: 'rgba(255, 255, 255, 0.5)'
            }}>
              Loading...
            </div>
          }>
            {showOnboarding ? (
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
                  <WeeklyHighlights
                    onQuestClick={(questId) => {
                      setSelectedQuestId(questId);
                      navigateToTab('quest-detail', { questId });
                    }}
                    onCreateSpace={async () => {
                      // Check if user already has a space
                      if (address) {
                        try {
                          const existingSpaces = await spaceService.getSpacesByOwner(address);
                          if (existingSpaces.length > 0) {
                            showToast('You can only create one space. Redirecting to your existing space...', 'warning');
                            setSelectedSpaceId(existingSpaces[0].id);
                            navigateToTab('space-dashboard');
                            return;
                          }
                        } catch (error) {
                          console.error('Error checking existing spaces:', error);
                          // Continue with space creation if space check fails
                        }
                      }

                      localStorage.setItem('spaceBuilderSource', 'discover');
                      localStorage.setItem('previousTab', 'discover');

                      // Check database for pro subscription status
                      console.log('🔍 Checking database for pro subscription...');
                      const hasDatabasePro = await checkDatabaseProStatus();

                      if (hasDatabasePro) {
                        console.log('✅ Database confirms pro subscription, proceeding to space builder');
                        navigateToTab('space-builder');
                      } else {
                        console.log('⚠️ Database shows no pro subscription, showing payment modal');
                        setPendingSpaceCreation(() => async (tier: 'free' | 'pro') => {
                          if (tier === 'free') {
                            // Free users can create spaces with limitations
                            console.log('✅ Free plan selected, proceeding to space builder with limitations');
                            navigateToTab('space-builder');
                          } else {
                            // Double-check database after pro payment
                            console.log('🔄 Re-checking database after pro payment...');
                            const confirmedPro = await checkDatabaseProStatus();
                            if (confirmedPro) {
                              console.log('✅ Database confirms pro payment, proceeding to space builder');
                              navigateToTab('space-builder');
                            } else {
                              console.error('❌ Database does not confirm pro subscription after payment');
                              showToast('Payment verification failed. Please contact support.', 'error');
                            }
                          }
                        });
                        setShowSubscriptionModal(true);
                      }
                    }}
                    onSpaceClick={(space) => {
                      try {
                        console.log('🔄 Space card clicked, space:', space.name);

                        // Store in localStorage first for persistence
                        localStorage.setItem('previousTab', 'discover');
                        localStorage.setItem('selectedSpaceId', space.id);
                        localStorage.setItem('selectedSpace', JSON.stringify(space));

                        // Set space data immediately
                        setSelectedSpace(space);
                        setSelectedSpaceId(space.id);

                        // Navigate to space detail using React Router
                        const spaceSlug = space.slug || (space.name || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                        console.log('📍 Navigating to space detail:', spaceSlug);
                        navigateToTab('space-detail', { spaceId: space.id, spaceName: space.name || space.id });
                      } catch (error) {
                        console.error('❌ Error navigating to space:', error);
                        showToast('Failed to load space details', 'error');
                      }
                    }}
                    onSeeMoreSpaces={() => {
                      navigateToTab('spaces');
                    }}
                    isAdmin={isAdminAuthenticated}
                    onEditHighlights={() => {
                      navigateToTab('edit-slideshow');
                    }}
                  />
                )}

                {activeTab === 'edit-slideshow' && (
                  isAdminAuthenticated ? (
                    <HighlightsEditor
                      onBack={() => navigateToTab('discover')}
                    />
                  ) : (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '50vh',
                      padding: '20px',
                      textAlign: 'center'
                    }}>
                      <h2 style={{ color: '#ef4444', marginBottom: '16px' }}>Admin Access Required</h2>
                      <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '20px' }}>
                        You need admin privileges to edit weekly highlights.
                      </p>
                      <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px' }}>
                        Press <kbd style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>Ctrl+Shift+A</kbd> to login as admin.
                      </p>
                      <button
                        onClick={() => navigateToTab('discover')}
                        style={{
                          marginTop: '20px',
                          padding: '10px 20px',
                          background: 'rgba(59, 130, 246, 0.9)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer'
                        }}
                      >
                        Back to Discover
                      </button>
                    </div>
                  )
                )}

                {activeTab === 'leaderboard' && <Leaderboard />}
                {activeTab === 'create' && <CreateQuest />}
                {activeTab === 'profile' && <UserProfile />}
                {activeTab === 'dashboard' && <UserDashboard onEditProfile={() => {
                  console.log('onEditProfile called, setting activeTab to edit-profile');
                  console.log('Current activeTab before:', activeTab);
                  setActiveTab('edit-profile');
                  console.log('Set activeTab to edit-profile');
                }} />}
                {activeTab === 'edit-profile' && (() => {
                  console.log('Rendering EditProfile component');
                  return <EditProfile onBack={() => {
                    console.log('EditProfile onBack called');
                    setActiveTab('dashboard');
                    navigate('/dashboard');
                  }} />;
                })()}
                {activeTab === 'community' && (
                  <Community
                    onSeeMoreLeaderboard={() => setActiveTab('full-leaderboard')}
                    onQuestClick={(questId) => {
                      setSelectedQuestId(questId);
                      navigateToTab('quest-detail', { questId });
                    }}
                    onCreateSpace={async () => {
                      // Check if user already has a space
                      if (address) {
                        try {
                          const existingSpaces = await spaceService.getSpacesByOwner(address);
                          if (existingSpaces.length > 0) {
                            showToast('You can only create one space. Redirecting to your existing space...', 'warning');
                            setSelectedSpaceId(existingSpaces[0].id);
                            navigateToTab('space-dashboard');
                            return;
                          }
                        } catch (error) {
                          console.error('Error checking existing spaces:', error);
                          // Continue with space creation if space check fails
                        }
                      }

                      localStorage.setItem('spaceBuilderSource', 'community');
                      localStorage.setItem('previousTab', 'community');

                      // Check database for pro subscription status
                      console.log('🔍 Checking database for pro subscription...');
                      const hasDatabasePro = await checkDatabaseProStatus();

                      if (hasDatabasePro) {
                        console.log('✅ Database confirms pro subscription, proceeding to space builder');
                        navigateToTab('space-builder');
                      } else {
                        console.log('⚠️ Database shows no pro subscription, showing payment modal');
                        setPendingSpaceCreation(() => async (tier: 'free' | 'pro') => {
                          if (tier === 'free') {
                            // Free users can create spaces with limitations
                            console.log('✅ Free plan selected, proceeding to space builder with limitations');
                            navigateToTab('space-builder');
                          } else {
                            // Double-check database after pro payment
                            console.log('🔄 Re-checking database after pro payment...');
                            const confirmedPro = await checkDatabaseProStatus();
                            if (confirmedPro) {
                              console.log('✅ Database confirms pro payment, proceeding to space builder');
                              navigateToTab('space-builder');
                            } else {
                              console.error('❌ Database does not confirm pro subscription after payment');
                              showToast('Payment verification failed. Please contact support.', 'error');
                            }
                          }
                        });
                        setShowSubscriptionModal(true);
                      }
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
                {(() => {
                  if (activeTab !== 'quest-detail') return null;
                  const qId = selectedQuestId || questName;
                  if (!qId) return null;
                  return (
                    <QuestDetail
                      key={`quest-detail-${qId}`}
                      questId={qId}
                      onBack={() => {
                        // Always navigate back to community as per user request
                        // The button label is "Back to Community"
                        navigateToTab('community');
                      }}
                      onNavigateToProfile={() => {
                        // Navigate to user dashboard
                        navigateToTab('dashboard');
                      }}
                      onNavigateToSpace={async (creatorAddress) => {
                        try {
                          // Fetch spaces for the creator
                          const creatorSpaces = await spaceService.getSpacesByOwner(creatorAddress);
                          if (creatorSpaces.length > 0) {
                            // Navigate to the first space
                            const space = creatorSpaces[0];
                            setSelectedSpace(space);
                            setSelectedSpaceId(space.id);
                            navigateToTab('space-detail');
                          } else {
                            showToast('Creator has no space yet', 'error');
                          }
                        } catch (error) {
                          console.error('Error fetching creator space:', error);
                          showToast('Failed to load creator space', 'error');
                        }
                      }}
                      onSpaceClick={async (spaceId) => {
                        try {
                          const space = await spaceService.getSpaceById(spaceId);
                          if (space) {
                            setSelectedSpace(space);
                            setSelectedSpaceId(space.id);
                            // Navigate to the correct URL to persist state
                            // Using /space/:slug format
                            navigate(`/space/${space.slug}`);
                            setActiveTab('space-detail');
                          } else {
                            showToast('Space not found', 'error');
                          }
                        } catch (error) {
                          console.error('Error fetching space:', error);
                          showToast('Failed to load space', 'error');
                        }
                      }}
                    />
                  );
                })()}
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
                      navigateToTab('space-dashboard');
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
                        key={`space-detail-${selectedSpace.id}`}
                        space={selectedSpace}
                        onBack={() => {
                          // Always navigate back to discover as per user request
                          navigateToTab('discover');
                        }}
                        onQuestClick={(questId) => {
                          console.log('🎯 SpaceDetailView onQuestClick:', questId);
                          // Store current space-detail as previous tab for back navigation
                          localStorage.setItem('previousTab', 'space-detail');
                          // Set quest ID first
                          setSelectedQuestId(questId);
                          localStorage.setItem('selectedQuestId', questId);
                          // Then navigate - use /quest/ format for proper routing
                          setActiveTab('quest-detail');
                          navigate(`/quest/${questId}`);
                        }}
                        onBuilderAccess={(spaceId) => {
                          console.log('🔧 SpaceDetailView onBuilderAccess called with spaceId:', spaceId);
                          setSelectedSpaceId(spaceId);
                          console.log('🔧 Set selectedSpaceId to:', spaceId);
                          navigateToTab('space-dashboard');
                          console.log('🔧 Navigated to space-dashboard tab');
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
                {activeTab === 'space-dashboard' && (() => {
                  console.log('🔧 Rendering BuilderDashboard with selectedSpaceId:', selectedSpaceId);
                  return (
                    <BuilderDashboard
                      spaceId={selectedSpaceId || ''}
                      onBack={() => {
                        console.log('🔧 BuilderDashboard onBack called, navigating to discover');
                        navigateToTab('discover');
                      }}
                    />
                  );
                })()}
                {activeTab === 'creator-dashboard' && (
                  <CreatorDashboard />
                )}
                {activeTab === 'spaces' && (
                  <Spaces
                    onSpaceClick={(space) => {
                      try {
                        localStorage.setItem('previousTab', 'spaces');
                        localStorage.setItem('selectedSpaceId', space.id);
                        localStorage.setItem('selectedSpace', JSON.stringify(space));
                        setSelectedSpace(space);
                        setSelectedSpaceId(space.id);
                        navigateToTab('space-detail', { spaceId: space.id, spaceName: space.name || space.id });
                      } catch (error) {
                        console.error('Error navigating to space:', error);
                        showToast('Failed to load space details', 'error');
                      }
                    }}
                    onCreateSpace={async () => {
                      // Check if user already has a space
                      if (address) {
                        try {
                          const existingSpaces = await spaceService.getSpacesByOwner(address);
                          if (existingSpaces.length > 0) {
                            showToast('You can only create one space. Redirecting to your existing space...', 'warning');
                            setSelectedSpaceId(existingSpaces[0].id);
                            navigateToTab('space-dashboard');
                            return;
                          }
                        } catch (error) {
                          console.error('Error checking existing spaces:', error);
                          // Continue with space creation if space check fails
                        }
                      }

                      localStorage.setItem('spaceBuilderSource', 'spaces');
                      localStorage.setItem('previousTab', 'spaces');

                      // Check database for pro subscription status
                      console.log('🔍 Checking database for pro subscription...');
                      const hasDatabasePro = await checkDatabaseProStatus();

                      if (hasDatabasePro) {
                        console.log('✅ Database confirms pro subscription, proceeding to space builder');
                        navigateToTab('space-builder');
                      } else {
                        console.log('⚠️ Database shows no pro subscription, showing payment modal');
                        setPendingSpaceCreation(() => async (tier: 'free' | 'pro') => {
                          if (tier === 'free') {
                            // Free users can create spaces with limitations
                            console.log('✅ Free plan selected, proceeding to space builder with limitations');
                            navigateToTab('space-builder');
                          } else {
                            // Double-check database after pro payment
                            console.log('🔄 Re-checking database after pro payment...');
                            const confirmedPro = await checkDatabaseProStatus();
                            if (confirmedPro) {
                              console.log('✅ Database confirms pro payment, proceeding to space builder');
                              navigateToTab('space-builder');
                            } else {
                              console.error('❌ Database does not confirm pro subscription after payment');
                              showToast('Payment verification failed. Please contact support.', 'error');
                            }
                          }
                        });
                        setShowSubscriptionModal(true);
                      }
                    }}
                  />
                )}
              </>
            )}
          </Suspense>
        </main>

        <Footer />

        <Suspense fallback={null}>
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
            onProceed={(tier: 'free' | 'pro') => {
              setShowSubscriptionModal(false);

              if (pendingSpaceCreation) {
                // Pass the selected tier to the pending space creation function
                pendingSpaceCreation(tier);
                setPendingSpaceCreation(null);
              } else if (tier === 'free') {
                // Fallback: Free users can proceed directly to space builder
                console.log('✅ Free plan selected, proceeding to space builder');
                navigateToTab('space-builder');
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
          <WalletSelectionModal
            isOpen={showWalletModal}
            onClose={() => setShowWalletModal(false)}
          />
          <ToastContainer />
          <FAQButton />
        </Suspense>
      </div>
    </div>
  );
}

interface AppProps {
  initialTab?: string;
  questName?: string | null;
  spaceName?: string | null;
}

import { SmoothScroll } from './components/SmoothScroll';

function App({ initialTab, questName, spaceName }: AppProps = {}) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <SmoothScroll>
            <AppContent
              initialTab={initialTab}
              questName={questName}
              spaceName={spaceName}
            />
          </SmoothScroll>
        </WagmiProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
export { TRUST_TOKEN_ADDRESS };
