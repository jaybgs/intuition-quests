import { useAccount } from 'wagmi';
import type { Space } from '../types';
import './SpaceDetailView.css';

interface SpaceDetailViewProps {
  space: Space;
  onBack: () => void;
}

export function SpaceDetailView({ space, onBack }: SpaceDetailViewProps) {
  return (
    <div className="space-detail-container">
      <div className="space-detail-card">
        <button className="space-detail-back" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back
        </button>

        <div className="space-detail-header">
          {space.logo && (
            <img src={space.logo} alt={space.name} className="space-detail-logo" />
          )}
          <div className="space-detail-info">
            <h1 className="space-detail-name">{space.name}</h1>
            <p className="space-detail-slug">@{space.slug}</p>
          </div>
        </div>

        <div className="space-detail-content">
          <div className="space-detail-section">
            <h2 className="space-detail-section-title">Description</h2>
            <p className="space-detail-description">{space.description}</p>
          </div>

          <div className="space-detail-section">
            <h2 className="space-detail-section-title">Details</h2>
            <div className="space-detail-meta">
              <div className="space-detail-meta-item">
                <span className="space-detail-meta-label">Type:</span>
                <span className="space-detail-meta-value">
                  {space.userType === 'project' ? 'Project, App, or Ecosystem' : 'TrustQuests User'}
                </span>
              </div>
              {space.twitterUrl && (
                <div className="space-detail-meta-item">
                  <span className="space-detail-meta-label">X Profile:</span>
                  <a 
                    href={space.twitterUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="space-detail-link"
                  >
                    {space.twitterUrl}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

