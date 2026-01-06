import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FAQ } from './FAQ';
import './Footer.css';

const Footer: React.FC = () => {
  const navigate = useNavigate();
  const [isFAQOpen, setIsFAQOpen] = useState(false);

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-logo-section">
          <img
            src="/logo.svg"
            alt="TrustQuests Logo"
            className="footer-logo"
          />
          <div className="footer-brand">
            <h3 className="footer-brand-name">TrustQuests</h3>
            <p className="footer-brand-tagline">Building the future of decentralized questing</p>
          </div>
        </div>

        <div className="footer-links">
          <div className="footer-column">
            <h4 className="footer-column-title">Platform</h4>
            <span onClick={() => handleNavigation('/home')} className="footer-link-text">Discover & Earn</span>
            <span onClick={() => handleNavigation('/community')} className="footer-link-text">Community</span>
            <span onClick={() => handleNavigation('/rewards')} className="footer-link-text">Rewards</span>
            <span onClick={() => handleNavigation('/bounties')} className="footer-link-text">Bounties</span>
            <span onClick={() => handleNavigation('/raids')} className="footer-link-text">Raids</span>
          </div>

          <div className="footer-column">
            <h4 className="footer-column-title">Community</h4>
            <a href="https://discord.gg/TQrZjFH6" target="_blank" rel="noopener noreferrer" className="footer-community-link">Discord</a>
            <a href="https://x.com/trustquests" target="_blank" rel="noopener noreferrer" className="footer-community-link">Twitter</a>
            <a href="https://github.com/jaybgs/intuition-quests/" target="_blank" rel="noopener noreferrer" className="footer-community-link">GitHub</a>
            <a href="https://github.com/jaybgs/intuition-quests/" target="_blank" rel="noopener noreferrer" className="footer-community-link">Documentation</a>
          </div>

          <div className="footer-column">
            <h4 className="footer-column-title">Support</h4>
            <span onClick={() => setIsFAQOpen(true)} className="footer-link-text">FAQ</span>
            <span className="footer-link-text">Contact</span>
            <span className="footer-link-text">Help Center</span>
            <span className="footer-link-text">Bug Reports</span>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-copyright">
            <p>&copy; 2024 TrustQuests. All rights reserved.</p>
          </div>
          <div className="footer-legal">
            <a href="#" className="footer-legal-link">Privacy Policy</a>
            <a href="#" className="footer-legal-link">Terms of Service</a>
            <a href="#" className="footer-legal-link">Cookie Policy</a>
          </div>
        </div>
      </div>
      <FAQ isOpen={isFAQOpen} onClose={() => setIsFAQOpen(false)} />
    </footer>
  );
};

export default Footer;
