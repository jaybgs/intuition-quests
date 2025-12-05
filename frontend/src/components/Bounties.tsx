interface BountiesProps {
  onCreateBounty?: () => void;
  filterByUser?: boolean;
  hideHeader?: boolean;
}

export function Bounties({ onCreateBounty, filterByUser = false, hideHeader = false }: BountiesProps) {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      minHeight: 'calc(100vh - 200px)',
      padding: '40px 20px'
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: '20px',
        maxWidth: '600px',
        width: '100%',
        padding: '40px',
        background: 'rgba(26, 31, 53, 0.3)',
        backdropFilter: 'blur(36px)',
        WebkitBackdropFilter: 'blur(36px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
      }}>
        <h2 style={{ 
          fontSize: '32px',
          fontWeight: '700',
          color: 'var(--text-primary)',
          margin: 0,
          maxWidth: '100%'
        }}>
          Bounties coming soon!
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