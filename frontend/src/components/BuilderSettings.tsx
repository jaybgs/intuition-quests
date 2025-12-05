import { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { spaceService } from '../services/spaceService';
import type { Space } from '../types';
import { showToast } from './Toast';
import { ConfirmationModal } from './ConfirmationModal';
import './BuilderSettings.css';

interface BuilderSettingsProps {
  space: Space;
  onSpaceUpdated: (updatedSpace: Space) => void;
  onSpaceDeleted?: () => void;
}

export function BuilderSettings({ space, onSpaceUpdated, onSpaceDeleted }: BuilderSettingsProps) {
  const { address } = useAccount();
  const [name, setName] = useState(space.name);
  const [description, setDescription] = useState(space.description);
  const [twitterUrl, setTwitterUrl] = useState(space.twitterUrl);
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(space.logo || null);
  const [userType, setUserType] = useState<'project' | 'user'>(space.userType);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const maxDescriptionLength = 180;

  useEffect(() => {
    setName(space.name);
    setDescription(space.description);
    setTwitterUrl(space.twitterUrl);
    setLogoPreview(space.logo || null);
    setUserType(space.userType);
  }, [space]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast('Logo file size must be less than 2MB', 'error');
        return;
      }
      if (!file.type.startsWith('image/')) {
        showToast('Please select an image file', 'error');
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

    if (!name.trim()) {
      showToast('Please enter a name', 'error');
      return;
    }

    if (!description.trim()) {
      showToast('Please enter a description', 'error');
      return;
    }

    if (description.trim().length > maxDescriptionLength) {
      showToast(`Description must be ${maxDescriptionLength} characters or less`, 'error');
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
    try {
      if (!address) {
        showToast('Please connect your wallet first', 'warning');
        setIsSubmitting(false);
        return;
      }

      // Convert logo to base64 if provided
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

      // Update the space
      const updatedSpace = await spaceService.updateSpace(space.id, {
        name: name.trim(),
        description: description.trim(),
        logo: logoBase64 || space.logo,
        twitterUrl: twitterUrl.trim(),
      });

      if (updatedSpace) {
        // Store the X profile URL for use when creating quests
        localStorage.setItem(`space_twitter_url_${address.toLowerCase()}`, twitterUrl.trim());
        
        showToast('Space updated successfully!', 'success');
        onSpaceUpdated(updatedSpace);
      } else {
        showToast('Failed to update space', 'error');
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to update space', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="builder-settings-container">
      <div className="builder-settings-card">
        <h1 className="builder-settings-title">Edit Space</h1>

        <form onSubmit={handleSubmit} className="builder-settings-form">
          {/* You are... Section */}
          <div className="builder-settings-section">
            <label className="builder-settings-label">
              You are... <span className="required-asterisk">*</span>
            </label>
            <div className="builder-settings-radio-group">
              <label className="builder-settings-radio">
                <input
                  type="radio"
                  name="userType"
                  value="project"
                  checked={userType === 'project'}
                  onChange={(e) => setUserType(e.target.value as 'project' | 'user')}
                />
                <span>Project, App, or Ecosystem</span>
              </label>
              <label className="builder-settings-radio">
                <input
                  type="radio"
                  name="userType"
                  value="user"
                  checked={userType === 'user'}
                  onChange={(e) => setUserType(e.target.value as 'project' | 'user')}
                />
                <span>TrustQuests User</span>
              </label>
            </div>
          </div>

          {/* Name Section */}
          <div className="builder-settings-section">
            <label className="builder-settings-label">
              Name <span className="required-asterisk">*</span>
            </label>
            <input
              type="text"
              className="builder-settings-input"
              placeholder="Enter space name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Description Section */}
          <div className="builder-settings-section">
            <label className="builder-settings-label">
              Description <span className="required-asterisk">*</span>
            </label>
            <textarea
              className="builder-settings-textarea"
              placeholder="Enter space description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={maxDescriptionLength}
              rows={4}
              required
            />
            <div className="builder-settings-char-count">
              {description.length}/{maxDescriptionLength} characters
            </div>
          </div>

          {/* Logo Section */}
          <div className="builder-settings-section">
            <label className="builder-settings-label">
              Logo <span className="required-asterisk">*</span>
            </label>
            <div className="builder-settings-logo-upload">
              {logoPreview && (
                <img src={logoPreview} alt="Logo preview" className="builder-settings-logo-preview" />
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="builder-settings-file-input"
              />
              <button
                type="button"
                className="builder-settings-upload-button"
                onClick={() => fileInputRef.current?.click()}
              >
                {logoPreview ? 'Change Logo' : 'Upload Logo'}
              </button>
            </div>
            <p className="builder-settings-hint">Upload a square logo (recommended: 512x512px, max 2MB)</p>
          </div>

          {/* X Profile URL Section */}
          <div className="builder-settings-section">
            <label className="builder-settings-label">
              X Profile URL <span className="required-asterisk">*</span>
            </label>
            <input
              type="url"
              className="builder-settings-input"
              placeholder="https://x.com/username"
              value={twitterUrl}
              onChange={(e) => setTwitterUrl(e.target.value)}
              required
            />
            <p className="builder-settings-hint">Enter your X (Twitter) profile URL</p>
          </div>

          {/* Submit Button */}
          <div className="builder-settings-actions">
            <button
              type="submit"
              className="builder-settings-submit"
              disabled={isSubmitting || !name.trim() || !description.trim() || !twitterUrl.trim()}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>

        {/* Delete Space Section */}
        <div className="builder-settings-delete-section">
          <h3 className="builder-settings-delete-title">Danger Zone</h3>
          <p className="builder-settings-delete-description">
            Once you delete your space, there is no going back. Please be certain.
          </p>
          <button
            type="button"
            className="builder-settings-delete-button"
            onClick={() => setShowDeleteModal(true)}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Space'}
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        title="Delete Space"
        message={`Are you sure you want to delete "${space.name}"? This action cannot be undone. All quests and data associated with this space will be permanently removed.`}
        confirmText="Yes"
        cancelText="No"
        variant="danger"
        onConfirm={async () => {
          setIsDeleting(true);
          try {
            const deleted = spaceService.deleteSpace(space.id);
            if (deleted) {
              showToast('Space deleted successfully', 'success');
              setShowDeleteModal(false);
              if (onSpaceDeleted) {
                onSpaceDeleted();
              }
            } else {
              showToast('Failed to delete space', 'error');
            }
          } catch (error: any) {
            showToast(error.message || 'Failed to delete space', 'error');
          } finally {
            setIsDeleting(false);
          }
        }}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
}

