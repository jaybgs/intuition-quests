import { useState, useEffect, useRef } from 'react';
import { spaceService } from '../services/spaceService';
import type { Space } from '../types';
import './Search.css';

interface SearchProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  onSpaceSelect?: (space: Space) => void;
  isAdmin?: boolean;
  onBuilderAccess?: (space: Space) => void;
}

export function Search({ 
  placeholder = 'Search quests, projects, spaces...', 
  onSearch,
  onSpaceSelect,
  isAdmin = false,
  onBuilderAccess
}: SearchProps) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Space[]>([]);
  const [showResults, setShowResults] = useState(false);
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

  // Search for spaces as user types
  useEffect(() => {
    if (query.trim().length > 0) {
      const results = spaceService.searchSpaces(query);
      setSearchResults(results);
      setShowResults(true);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
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
              if (query.trim().length > 0 && searchResults.length > 0) {
                setShowResults(true);
              }
            }}
          />
        </div>
      </form>
      
      {/* Search Results Dropdown */}
      {showResults && searchResults.length > 0 && (
        <div className="search-results-dropdown">
          <div className="search-results-header">Spaces</div>
          {searchResults.map((space) => (
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
        </div>
      )}
    </div>
  );
}


