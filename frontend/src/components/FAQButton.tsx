import { useState } from 'react';
import { FAQ } from './FAQ';
import './FAQButton.css';

export function FAQButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [showLabel, setShowLabel] = useState(false);

  return (
    <>
      <div
        className="faq-button-container"
        onMouseEnter={() => setShowLabel(true)}
        onMouseLeave={() => setShowLabel(false)}
      >
        <button
          className="faq-button"
          onClick={() => setIsOpen(true)}
          aria-label="Open FAQ"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </button>
        {showLabel && (
          <div className="faq-button-label">
            FAQ
          </div>
        )}
      </div>
      <FAQ isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}



