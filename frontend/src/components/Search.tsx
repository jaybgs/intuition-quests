import { useState, useEffect, useRef } from 'react';
import { spaceService } from '../services/spaceService';
import { questServiceBackend } from '../services/questServiceBackend';
import type { Space, Quest } from '../types';
import './Search.css';

interface SearchProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  onSpaceSelect?: (space: Space) => void;
  onQuestSelect?: (questId: string) => void;
  isAdmin?: boolean;
  onBuilderAccess?: (space: Space) => void;
}

export function Search({ 
  placeholder = 'Search quests, projects, spaces...', 
  onSearch,
  onSpaceSelect,
  onQuestSelect,
  isAdmin = false,
  onBuilderAccess
}: SearchProps) {
  const [query, setQuery] = useState('');
  const [spaceResults, setSpaceResults] = useState<Space[]>([]);
  const [questResults, setQuestResults] = useState<Quest[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Handle clicks outside search to close results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search for spaces and quests as user types
  useEffect(() => {
    const performSearch = async () => {
      const trimmedQuery = query.trim();
      
      if (trimmedQuery.length === 0) {
        setSpaceResults([]);
        setQuestResults([]);
        setShowResults(false);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      
      try {
        // Search spaces (async)
        const spaces = await spaceService.searchSpaces(trimmedQuery);
        setSpaceResults(spaces);
        
        // Search quests
        const allQuests = await questServiceBackend.getAllQuests();
        const lowerQuery = trimmedQuery.toLowerCase();
        const filteredQuests = allQuests.filter(quest => {
          const titleMatch = quest.title.toLowerCase().includes(lowerQuery);
          const descriptionMatch = quest.description?.toLowerCase().includes(lowerQuery);
          const projectMatch = quest.projectName?.toLowerCase().includes(lowerQuery);
          // Check if query matches quest ID or slug-like pattern
          const idMatch = quest.id.toLowerCase().includes(lowerQuery);
          return titleMatch || descriptionMatch || projectMatch || idMatch;
        });
        setQuestResults(filteredQuests.slice(0, 5)); // Limit to 5 quest results
        
        setShowResults(true);
      } catch (error) {
        console.error('Error performing search:', error);
        setSpaceResults([]);
        setQuestResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce search to avoid too many requests
    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(query);
    setShowResults(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleSpaceClick = (space: Space) => {
    onSpaceSelect?.(space);
    setQuery('');
    setShowResults(false);
  };

  const handleQuestClick = (questId: string) => {
    onQuestSelect?.(questId);
    setQuery('');
    setShowResults(false);
  };

  return (
    <div className="search-container-wrapper" ref={searchRef}>
      <form className="search-form" onSubmit={handleSubmit}>
        <div className="search-input-wrapper">
          <svg 
            className="search-icon" 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder={placeholder}
            value={query}
            onChange={handleChange}
            onFocus={() => {
              if (query.trim().length > 0 && (spaceResults.length > 0 || questResults.length > 0)) {
                setShowResults(true);
              }
            }}
          />
        </div>
      </form>
      
      {/* Search Results Dropdown */}
      {showResults && (spaceResults.length > 0 || questResults.length > 0 || isLoading) && (
        <div className="search-results-dropdown">
          {isLoading ? (
            <div className="search-results-loading">Searching...</div>
          ) : (
            <>
              {spaceResults.length > 0 && (
                <>
                  <div className="search-results-header">Spaces</div>
                  {spaceResults.map((space) => (
                    <div key={space.id} className="search-result-item-wrapper">
                      <div
                        className="search-result-item"
                        onClick={() => handleSpaceClick(space)}
                      >
                        {space.logo && (
                          <img 
                            src={space.logo} 
                            alt={space.name}
                            className="search-result-logo"
                          />
                        )}
                        <div className="search-result-content">
                          <div className="search-result-name">{space.name}</div>
                          <div className="search-result-slug">@{space.slug}</div>
                        </div>
                      </div>
                      {isAdmin && onBuilderAccess && (
                        <button
                          className="search-result-admin-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onBuilderAccess(space);
                            setQuery('');
                            setShowResults(false);
                          }}
                          title="Access Builder Profile (Admin Only)"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                            <path d="M9 12l2 2 4-4"/>
                          </svg>
                          Builder Access
                        </button>
                      )}
                    </div>
                  ))}
                </>
              )}
              {questResults.length > 0 && (
                <>
                  <div className="search-results-header">Quests</div>
                  {questResults.map((quest) => (
                    <div
                      key={quest.id}
                      className="search-result-item"
                      onClick={() => handleQuestClick(quest.id)}
                    >
                      <div className="search-result-content">
                        <div className="search-result-name">{quest.title}</div>
                        <div className="search-result-slug">{quest.projectName || 'Community Quest'}</div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}


