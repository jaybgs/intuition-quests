import React, { useState } from 'react';
import { FAQ } from './FAQ';
import './Footer.css';

const Footer: React.FC = () => {
  const [isFAQOpen, setIsFAQOpen] = useState(false);
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
            <a href="/home" className="footer-link">Discover & Earn</a>
            <a href="/community" className="footer-link">Community</a>
            <a href="/rewards" className="footer-link">Rewards</a>
            <a href="/bounties" className="footer-link">Bounties</a>
            <a href="/raids" className="footer-link">Raids</a>
            <a href="/community#leaderboard" className="footer-link">Leaderboard</a>
          </div>

          <div className="footer-column">
            <h4 className="footer-column-title">Community</h4>
            <a href="https://discord.gg/TQrZjFH6" className="footer-link" target="_blank" rel="noopener noreferrer">Discord</a>
            <a href="https://x.com/trustquests" className="footer-link" target="_blank" rel="noopener noreferrer">Twitter</a>
            <a href="https://github.com/jaybgs/intuition-quests" className="footer-link" target="_blank" rel="noopener noreferrer">GitHub</a>
            <a href="#" className="footer-link">Documentation</a>
          </div>

          <div className="footer-column">
            <h4 className="footer-column-title">Support</h4>
            <button className="footer-link-button" onClick={() => setIsFAQOpen(true)}>FAQ</button>
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
          <img
            src="/TRUSTQUESTS_COIN_2-removebg-preview.png"
            alt="TrustQuests Coin"
            className="footer-coin-image"
          />
        </div>
      </div>
      <FAQ isOpen={isFAQOpen} onClose={() => setIsFAQOpen(false)} />
    </footer>
  );
};

export default Footer;
