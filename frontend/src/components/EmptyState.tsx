import './EmptyState.css';

export function EmptyQuests() {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M16.24 7.76l-2.12 2.12m-4.24 4.24L7.76 16.24M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
        </svg>
      </div>
      <h3 className="empty-state-title">No Quests Available</h3>
      <p className="empty-state-message">
        It looks like there are no quests here yet. Check back later or create your own!
      </p>
    </div>
  );
}







