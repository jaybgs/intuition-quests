import { useState } from 'react';
import './FAQ.css';

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    question: 'What is TrustQuests and how does it work?',
    answer: 'TrustQuests is a decentralized quest platform built on the Intuition network that connects creators with participants.\n\nCreators design quests with specific tasks and verification requirements, then deposit rewards (IQ points and TRUST tokens) into escrow. Participants complete quests by following instructions, submitting verification, and upon approval, automatically receive their rewards.\n\nThe platform uses blockchain technology to ensure transparent, secure, and automated reward distribution.'
  },
  {
    question: 'How do I get started on TrustQuests?',
    answer: 'Getting started is simple! First, connect your Ethereum-compatible wallet (MetaMask, WalletConnect, etc.) by clicking the "Connect Wallet" button in the top navigation. Make sure you\'re connected to the Intuition network.\n\nThen, browse available quests on the Discover page. Click "Start Quest" on any quest that interests you, follow the step-by-step instructions, complete the required verification tasks, and submit your completion.\n\nOnce verified, rewards are automatically distributed to your wallet.'
  },
  {
    question: 'What are IQ points and how do I earn them?',
    answer: 'IQ points are reputation and engagement points earned by completing quests on TrustQuests. They serve as a measure of your activity and contribution to the Intuition ecosystem. You earn IQ points automatically when you complete quests - the amount varies depending on the quest. IQ points help demonstrate your engagement level, can unlock certain features, and may be used for future platform benefits. They are non-transferable and tied to your account.'
  },
  {
    question: 'What are TRUST tokens and how do I receive them?',
    answer: 'TRUST is the native utility token of the Intuition network. Quest creators deposit TRUST tokens into a smart contract escrow as rewards for their quests. When you complete a quest and your verification is approved, the TRUST tokens are automatically transferred from the escrow contract directly to your connected wallet address. The amount you receive depends on the quest\'s reward structure - some quests offer fixed amounts, while others use FCFS (First Come First Served) or Raffle distribution methods.'
  },
  {
    question: 'How do I create and publish a quest?',
    answer: 'To create a quest, you need a Pro subscription. Once you\'re a Pro user, navigate to your Builder Dashboard (accessible from your profile or by clicking "Builder Dashboard" on your space page).\n\nClick "Create Quest" and you\'ll be guided through a step-by-step builder:\n\n(1) Set quest details (name, description, difficulty, duration)\n(2) Configure verification actions (social follows, website visits, document reading, quizzes, etc.)\n(3) Set rewards (IQ points and TRUST token deposits)\n(4) Choose distribution method (FCFS or Raffle)\n(5) Review and publish\n\nYour quest will be live immediately after publishing.'
  },
  {
    question: 'What verification methods can I use in quests?',
    answer: 'TrustQuests offers multiple verification methods to ensure authentic participation: Social Media Follows (Twitter/X, Discord, Telegram), Website Visits (with URL verification), Read Documentation (users must read and mark documents as read), Knowledge Quizzes (multiple choice questions), and more. Each quest can include multiple verification steps that participants must complete in sequence. Pro users have access to additional advanced verification methods and can combine multiple verification types in a single quest.'
  },
  {
    question: 'What are the benefits of becoming a Pro user?',
    answer: 'Pro users unlock powerful features including:\n\n• Quest Templates - Pre-built quest structures for quick setup\n• Advanced Verification Methods - Expanded verification options\n• Multiple Quest Management - Create and manage unlimited quests\n• Priority Support - Faster response times for assistance\n• Analytics Dashboard - Detailed insights into quest performance\n• Custom Quest Branding - Enhanced customization options\n• Early Access - Get new features before free users\n\nUpgrade to Pro through the subscription modal accessible from your profile or builder dashboard.'
  },
  {
    question: 'What happens if I start a quest but don\'t complete it?',
    answer: 'If you start a quest but don\'t complete all verification steps within the quest\'s duration, you won\'t receive rewards. However, your progress is automatically saved, so you can return to the quest at any time while it\'s still active and continue from where you left off. If a quest expires before you complete it, you\'ll need to wait for the creator to publish a new quest. There\'s no penalty for incomplete quests - you simply won\'t receive rewards until all requirements are met and verified.'
  },
  {
    question: 'How are rewards distributed and when will I receive them?',
    answer: 'Rewards are distributed automatically and instantly upon quest completion and verification approval. The process is fully automated through smart contracts:\n\n(1) You complete all quest requirements and submit verification\n(2) The system verifies your submissions (usually instant for automated checks)\n(3) IQ points are immediately credited to your account\n(4) TRUST tokens are automatically transferred from the escrow contract to your wallet address\n\nFor FCFS quests, rewards are distributed on a first-come, first-served basis. For Raffle quests, winners are randomly selected after the quest ends.'
  },
  {
    question: 'What is a Space and how do I create one?',
    answer: 'A Space is your personal hub on TrustQuests where you can organize your quests, build a community, and establish your brand identity. Anyone can create a space for free. To create one, go to the Discover page and click "Create Space". You\'ll be able to set your space name, description, logo, and customize your space\'s appearance. Spaces help you organize multiple quests, track follower engagement, and build a dedicated community around your brand or project. You can create multiple spaces if needed.'
  },
  {
    question: 'What\'s the difference between FCFS and Raffle quest distribution?',
    answer: 'FCFS (First Come First Served) quests distribute rewards immediately to participants on a first-come, first-served basis until the reward pool is depleted. If you complete the quest early, you\'re more likely to receive rewards. Raffle quests work differently: all participants who complete the quest requirements are entered into a random drawing. After the quest ends, winners are randomly selected from all eligible participants. Raffle quests are fairer for those who join later, while FCFS rewards early participants. Creators choose the distribution method when creating their quest.'
  },
  {
    question: 'Which wallets are supported and how do I connect?',
    answer: 'TrustQuests supports all Ethereum-compatible wallets including MetaMask, WalletConnect (which supports 100+ wallets like Coinbase Wallet, Trust Wallet, Rainbow, etc.), and other Web3 wallets. To connect, click the "Connect Wallet" button in the top navigation bar. Make sure your wallet is set to the Intuition network. If you need to switch networks, the platform will prompt you. Once connected, your wallet address will be used to receive TRUST token rewards and your account will be linked to your wallet for secure authentication.'
  },
  {
    question: 'Can I edit or cancel a quest after publishing it?',
    answer: 'Once a quest is published and participants have started it, you cannot edit the core requirements (verification steps, rewards, duration) as this would be unfair to participants. However, you can update the quest description and other non-critical details. If you need to cancel a quest, you can do so from your Builder Dashboard, but this should only be done in exceptional circumstances. If you cancel a quest, participants who already completed it will still receive their rewards, but new participants won\'t be able to join. Always review your quest carefully before publishing.'
  },
  {
    question: 'How do I track my quest progress and earnings?',
    answer: 'You can track your progress in several ways: (1) The "Quests" tab shows all quests you\'ve started with their completion status, (2) Your User Dashboard displays your total IQ points, TRUST token earnings, and quest completion statistics, (3) The "Rewards" tab shows a detailed history of all rewards you\'ve received, (4) Individual quest detail pages show your specific progress for that quest. All your data is stored securely and synced across devices when you connect with the same wallet.'
  },
  {
    question: 'What should I do if I encounter a problem or have a question?',
    answer: 'If you encounter any issues or have questions, there are several ways to get help: (1) Check this FAQ section for common questions, (2) Pro users have access to priority support through their dashboard, (3) Visit the Guide tab in your Builder Dashboard for detailed tutorials and documentation, (4) For technical issues with wallet connections or transactions, ensure you\'re on the correct network and have sufficient gas fees. The platform is designed to be user-friendly, but if you need assistance, our support team is here to help.'
  }
];

export function FAQ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleQuestion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  if (!isOpen) return null;

  return (
    <div className="faq-overlay" onClick={onClose}>
      <div className="faq-modal" onClick={(e) => e.stopPropagation()}>
        <div className="faq-header">
          <h2 className="faq-title">Frequently Asked Questions</h2>
          <button className="faq-close-button" onClick={onClose} aria-label="Close FAQ">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="faq-content">
          {faqData.map((item, index) => (
            <div key={index} className="faq-item">
              <button
                className={`faq-question ${openIndex === index ? 'open' : ''}`}
                onClick={() => toggleQuestion(index)}
                aria-expanded={openIndex === index}
              >
                <span>{item.question}</span>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`faq-chevron ${openIndex === index ? 'open' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {openIndex === index && (
                <div className="faq-answer">
                  {item.answer.split('\n\n').map((paragraph, pIndex) => (
                    <p key={pIndex}>{paragraph.trim()}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

