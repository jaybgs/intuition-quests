import './Raids.css';

interface RaidsProps {
  onCreateQuest?: () => void;
  filterByUser?: boolean;
  hideHeader?: boolean;
}

export function Raids({ onCreateQuest, filterByUser = false, hideHeader = false }: RaidsProps) {
  return (
    <div className="raids-container" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      minHeight: 'calc(100vh - 200px)',
      padding: '40px 20px'
    }}>
      <div className="raids-glass-container" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: '20px',
        maxWidth: '600px',
        width: '100%'
      }}>
        <h2 className="raids-text" style={{ 
          fontSize: '32px',
          fontWeight: '700',
          color: 'var(--text-primary)',
          margin: 0,
          maxWidth: '100%'
        }}>
          Raids coming soon!
          </h2>
        <p style={{ 
          fontSize: '18px',
          color: 'var(--text-secondary)',
          margin: 0
        }}>
          Check back later!
        </p>
      </div>
    </div>
  );
}