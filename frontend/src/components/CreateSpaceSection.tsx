import { useEffect, useRef } from 'react';
import './CreateSpaceSection.css';

interface CreateSpaceSectionProps {
  onCreateSpace?: () => void;
}

export function CreateSpaceSection({ onCreateSpace }: CreateSpaceSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = sectionRef.current;
    if (!element) return;

    // Check if element is already in view on mount
    const rect = element.getBoundingClientRect();
    const isInView = rect.top < window.innerHeight && rect.bottom > 0;
    
    if (isInView) {
      // If already in view, make it visible immediately
      element.classList.add('animate-in');
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
          }
        });
      },
      { threshold: 0.1, rootMargin: '100px 0px 0px 0px' }
    );

    observer.observe(element);

    // Fallback: ensure element is visible after 1 second even if observer doesn't trigger
    const fallbackTimeout = setTimeout(() => {
      if (element && !element.classList.contains('animate-in')) {
        element.classList.add('animate-in');
      }
    }, 1000);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
      clearTimeout(fallbackTimeout);
    };
  }, []);

  return (
    <div ref={sectionRef} className="create-space-section">
      {/* Desktop background SVG */}
      <img 
        src="/header%202.svg" 
        alt="Create Space Background" 
        className="create-space-background-svg create-space-background-desktop"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          if (target.src.includes('%20')) {
            target.src = "/header 2.svg";
          }
        }}
      />
      {/* Mobile background SVG */}
      <img 
        src="/create%20space%20thing.svg" 
        alt="Create Space Background" 
        className="create-space-background-svg create-space-background-mobile"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          if (target.src.includes('%20')) {
            target.src = "/create space thing.svg";
          }
        }}
      />
      <h2 className="create-space-heading">
        Join hundreds of builders earning from their creations
      </h2>
      
      <div className="create-space-steps">
        <div className="step-icon-wrapper step-icon-build">
          <img 
            src="/build-no-code-quests.svg" 
            alt="Build no-code Quests" 
            className="step-icon-image"
            onError={(e) => {
              console.error('Failed to load build-no-code-quests.svg');
            }}
            onLoad={() => {
              console.log('Build no-code quests SVG loaded successfully');
            }}
          />
          <h3 className="step-title">Build no-code Quests</h3>
        </div>

        <div className="step-icon-wrapper step-icon-lock">
          <img 
            src="/earn-yield.svg" 
            alt="Deposit trust" 
            className="step-icon-image"
            onError={(e) => {
              console.error('Failed to load earn-yield.svg');
            }}
            onLoad={() => {
              console.log('Earn yield SVG loaded successfully');
            }}
          />
            <h3 className="step-title">Deposit $TRUST</h3>
        </div>

        <div className="step-icon-wrapper step-icon-payment">
          <img 
            src="/distribute-rewards.svg" 
            alt="Distribute rewards" 
            className="step-icon-image"
            onError={(e) => {
              console.error('Failed to load distribute-rewards.svg');
            }}
            onLoad={() => {
              console.log('Distribute rewards SVG loaded successfully');
            }}
          />
          <h3 className="step-title">Distribute rewards</h3>
        </div>
      </div>

      <button 
        className="create-space-button"
        onClick={() => {
          localStorage.setItem('spaceBuilderSource', 'community');
          onCreateSpace?.();
        }}
      >
        Create Your Space
      </button>
    </div>
  );
}