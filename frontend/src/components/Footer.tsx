import React from 'react';
import './Footer.css';

const Footer: React.FC = () => {
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
            <a href="#" className="footer-link">Discover & Earn</a>
            <a href="#" className="footer-link">Community</a>
            <a href="#" className="footer-link">Rewards</a>
            <a href="#" className="footer-link">Bounties</a>
            <a href="#" className="footer-link">Raids</a>
          </div>

          <div className="footer-column">
            <h4 className="footer-column-title">Community</h4>
            <a href="#" className="footer-link">Discord</a>
            <a href="#" className="footer-link">Twitter</a>
            <a href="#" className="footer-link">GitHub</a>
            <a href="#" className="footer-link">Documentation</a>
          </div>

          <div className="footer-column">
            <h4 className="footer-column-title">Support</h4>
            <a href="#" className="footer-link">FAQ</a>
            <a href="#" className="footer-link">Contact</a>
            <a href="#" className="footer-link">Help Center</a>
            <a href="#" className="footer-link">Bug Reports</a>
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
    </footer>
  );
};

export default Footer;
