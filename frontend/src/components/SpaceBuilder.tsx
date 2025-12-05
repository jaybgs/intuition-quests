import { useState, useRef, useEffect } from 'react';
import { useAccount, useWalletClient, usePublicClient, useChainId, useSwitchChain } from 'wagmi';
import { showToast } from './Toast';
import { spaceService } from '../services/spaceService';
import { generateSlug } from '../utils/slugUtils';
import { createSpaceAtom } from '../services/intuitionAtomService';
import { intuitionChain } from '../config/wagmi';
import { formatEther } from 'viem';
import './SpaceBuilder.css';

interface SpaceBuilderProps {
  onBack: () => void;
  onSpaceCreated?: (spaceId: string) => void;
  defaultUserType?: 'project' | 'user';
}

export function SpaceBuilder({ onBack, onSpaceCreated, defaultUserType }: SpaceBuilderProps) {
  const { address, status } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  
  // Get default from prop, or from localStorage, or default to 'project'
  const initialUserType = defaultUserType || (localStorage.getItem('spaceBuilderSource') === 'community' ? 'user' : 'project');
  const [userType, setUserType] = useState<'project' | 'user'>(initialUserType);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [twitterUrl, setTwitterUrl] = useState('');
  const [slug, setSlug] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [atomCreationStep, setAtomCreationStep] = useState<'idle' | 'creating' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const maxDescriptionLength = 180;

  // Check if user already has a space on mount
  useEffect(() => {
    if (address) {
      spaceService.getSpacesByOwner(address).then(existingSpaces => {
        if (existingSpaces.length > 0) {
          showToast('You can only create one space. Redirecting to your existing space...', 'warning');
          // Redirect to existing space after a short delay
          setTimeout(() => {
            if (onSpaceCreated) {
              onSpaceCreated(existingSpaces[0].id);
            } else {
              onBack();
            }
          }, 1500);
        }
      }).catch(error => {
        console.error('Error checking existing spaces:', error);
      });
    }
  }, [address, onBack, onSpaceCreated]);

  // Generate slug from name
  useEffect(() => {
    if (name.trim()) {
      const generatedSlug = generateSlug(name);
      setSlug(generatedSlug);
    } else {
      setSlug('');
    }
  }, [name]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showToast('Logo file size must be less than 5MB', 'error');
        return;
      }
      if (!file.type.startsWith('image/')) {
        showToast('Please upload an image file', 'error');
        return;
      }
      setLogo(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('Logo file size must be less than 5MB', 'error');
        return;
      }
      if (!file.type.startsWith('image/')) {
        showToast('Please upload an image file', 'error');
        return;
      }
      setLogo(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check primarily for address - more reliable than isConnected
    if (!address) {
      showToast('Please connect your wallet first', 'warning');
      return;
    }

    // Check if user already has a space
    try {
      const existingSpaces = await spaceService.getSpacesByOwner(address);
      if (existingSpaces.length > 0) {
        showToast('You can only create one space. You already have a space.', 'error');
        return;
      }
    } catch (error) {
      console.error('Error checking existing spaces:', error);
      // Continue with creation if check fails
    }

    if (!name.trim()) {
      showToast('Please enter a space name', 'error');
      return;
    }

    if (!description.trim()) {
      showToast('Please enter a description', 'error');
      return;
    }

    if (!logo) {
      showToast('Please upload a logo', 'error');
      return;
    }

    if (!twitterUrl.trim()) {
      showToast('Please enter your X (Twitter) profile URL', 'error');
      return;
    }

    // Validate X/Twitter URL format
    const twitterUrlPattern = /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/[a-zA-Z0-9_]+$/;
    if (!twitterUrlPattern.test(twitterUrl.trim())) {
      showToast('Please enter a valid X (Twitter) profile URL (e.g., https://x.com/username)', 'error');
      return;
    }

    setIsSubmitting(true);
    setAtomCreationStep('idle');
    
    try {
      if (!address) {
        showToast('Please connect your wallet first', 'warning');
        setIsSubmitting(false);
        return;
      }

      // Check if user is on Intuition Network (chain ID 1155)
      if (chainId !== intuitionChain.id) {
        showToast('Please switch to Intuition Network to create a space', 'warning');
        try {
          await switchChain({ chainId: intuitionChain.id });
          // Wait a moment for network switch
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (switchError: any) {
          if (switchError.code !== 4902) { // 4902 = user rejected
            showToast('Failed to switch network. Please switch to Intuition Network manually.', 'error');
          }
          setIsSubmitting(false);
          return;
        }
      }

      // Get wallet and public clients
      if (!walletClient || !publicClient) {
        showToast('Wallet not connected. Please connect your wallet.', 'error');
        setIsSubmitting(false);
        return;
      }

      // Step 1: Create atom on Intuition blockchain
      // This MUST succeed before we create the space
      setAtomCreationStep('creating');
      showToast('Creating atom on Intuition blockchain...', 'info');
      
      let atomResult;
      try {
        atomResult = await createSpaceAtom(name.trim(), {
          walletClient,
          publicClient,
          depositAmount: BigInt(0), // No initial deposit for now
        });
        
        // Verify the transaction was successful by waiting for receipt
        // The createSpaceAtom function already waits for receipt, but let's be explicit
        if (!atomResult || !atomResult.transactionHash) {
          throw new Error('Atom creation did not return a transaction hash');
        }
        
        setAtomCreationStep('success');
        showToast(`Atom created! Transaction: ${atomResult.transactionHash.slice(0, 10)}...`, 'success');
      } catch (atomError: any) {
        setAtomCreationStep('error');
        console.error('Atom creation failed:', atomError);
        showToast(`Atom creation failed: ${atomError.message}. Space will not be created.`, 'error');
        // DO NOT create the space if atom creation fails
        setIsSubmitting(false);
        return; // Exit early - don't create the space
      }

      // Step 2: Convert logo to base64 if provided
      let logoBase64: string | undefined;
      if (logo) {
        logoBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.onerror = reject;
          reader.readAsDataURL(logo);
        });
      }

      // Step 3: Create the space using the space service (ONLY after atom creation succeeds)
      // At this point, we know atomResult exists and the transaction succeeded
      const space = spaceService.createSpace({
        name: name.trim(),
        description: description.trim(),
        logo: logoBase64,
        twitterUrl: twitterUrl.trim(),
        ownerAddress: address,
        userType: userType,
        atomId: atomResult.atomId,
        atomTransactionHash: atomResult.transactionHash,
      });

      // Store the X profile URL for use when creating quests
      localStorage.setItem(`space_twitter_url_${address.toLowerCase()}`, twitterUrl.trim());
      
      // Store the space ID for the owner
      spaceService.getSpacesByOwner(address).then(ownerSpaces => {
        localStorage.setItem(`user_spaces_${address.toLowerCase()}`, JSON.stringify(ownerSpaces.map(s => s.id)));
      }).catch(error => {
        console.error('Error fetching owner spaces:', error);
      });

      // At this point, atomResult is guaranteed to exist since we return early on failure
        showToast(`Space "${space.name}" created successfully with on-chain identity!`, 'success');
      
      // Dispatch event for real-time updates
      window.dispatchEvent(new CustomEvent('spaceCreated', { detail: { space } }));
      
      // Navigate to builder dashboard for the new space immediately
      if (onSpaceCreated) {
        onSpaceCreated(space.id);
      } else {
        onBack();
      }
    } catch (error: any) {
      setAtomCreationStep('error');
      console.error('Error creating space:', error);
      showToast(error.message || 'Failed to create space', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="space-builder-container">
      <div className="space-builder-card">
        <h1 className="space-builder-title">Create a Space</h1>

        <form onSubmit={handleSubmit} className="space-builder-form">
          {/* You are... Section */}
          <div className="space-builder-section">
            <label className="space-builder-label">You are...</label>
            <div className="space-builder-role-buttons">
              <button
                type="button"
                className={`role-button ${userType === 'project' ? 'active' : ''}`}
                onClick={() => setUserType('project')}
              >
                with a Project, App, or Ecosystem
              </button>
              <button
                type="button"
                className={`role-button ${userType === 'user' ? 'active' : ''}`}
                onClick={() => setUserType('user')}
              >
                a TrustQuests User
              </button>
            </div>
            {userType === 'project' && (
              <p className="role-description">Drive onchain impact and grow your business.</p>
            )}
            {userType === 'user' && (
              <p className="role-description">Create and share quests with the community.</p>
            )}
          </div>

          {/* Name Section */}
          <div className="space-builder-section">
            <label className="space-builder-label">
              Name <span className="required-asterisk">*</span>
            </label>
            <input
              type="text"
              className="space-builder-input"
              placeholder="Enter space name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            {slug && (
              <p className="space-builder-hint" style={{ marginTop: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
                URL slug: <code style={{ background: 'rgba(26, 31, 53, 0.3)', padding: '2px 6px', borderRadius: '4px' }}>{slug}</code>
              </p>
            )}
          </div>

          {/* Description Section */}
          <div className="space-builder-section">
            <label className="space-builder-label">
              Description <span className="required-asterisk">*</span>
            </label>
            <div className="textarea-wrapper">
              <textarea
                className="space-builder-textarea"
                placeholder="Describe your space..."
                value={description}
                onChange={(e) => {
                  if (e.target.value.length <= maxDescriptionLength) {
                    setDescription(e.target.value);
                  }
                }}
                required
                rows={4}
              />
              <span className="character-count">{maxDescriptionLength - description.length}</span>
            </div>
          </div>

          {/* Logo Section */}
          <div className="space-builder-section">
            <label className="space-builder-label">
              Logo <span className="required-asterisk">*</span>
            </label>
            <p className="space-builder-hint">(Recommended size: 1024x1024)</p>
            <div
              className="logo-upload-area"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {logoPreview ? (
                <div className="logo-preview">
                  <img src={logoPreview} alt="Logo preview" />
                  <button
                    type="button"
                    className="logo-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLogo(null);
                      setLogoPreview(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              ) : (
                <>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="upload-icon">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  <div className="upload-text">
                    <span className="upload-label">Upload</span>
                    <span className="upload-hint">Drag or click to upload</span>
                  </div>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          {/* X Profile URL Section */}
          <div className="space-builder-section">
            <label className="space-builder-label">
              X (Twitter) Profile URL <span className="required-asterisk">*</span>
            </label>
            <p className="space-builder-hint">Enter the full X profile URL, not just the username (e.g., https://x.com/username or https://twitter.com/username)</p>
            <input
              type="url"
              className="space-builder-input"
              placeholder="https://x.com/yourusername"
              value={twitterUrl}
              onChange={(e) => setTwitterUrl(e.target.value)}
              required
            />
          </div>

          {/* Submit Button */}
          <div className="space-builder-actions">
            <button
              type="button"
              className="space-builder-cancel"
              onClick={onBack}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="space-builder-submit"
              disabled={isSubmitting || !name.trim() || !description.trim() || !logo || !twitterUrl.trim()}
            >
              {isSubmitting ? 'Creating...' : 'Create Space'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
