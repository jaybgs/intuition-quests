import { useState, useEffect } from 'react';

interface Project {
  id: string;
  title: string;
  description: string;
  image?: string;
}

// Mock projects data - replace with actual data from API
const projects: Project[] = [
  {
    id: '1',
    title: 'Project Alpha',
    description: 'Complete tasks and earn rewards in this exciting new project.',
  },
  {
    id: '2',
    title: 'Project Beta',
    description: 'Join the community and discover amazing opportunities.',
  },
  {
    id: '3',
    title: 'Project Gamma',
    description: 'Earn IQ and unlock exclusive features with this project.',
  },
];

export function DiscoverEarn() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % projects.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + projects.length) % projects.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % projects.length);
  };

  const currentProject = projects[currentIndex];

  return (
    <div className="discover-earn-container">
      <div className="slideshow-card">
        <button className="slideshow-nav slideshow-prev" onClick={goToPrevious} aria-label="Previous">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        
        <div className="slideshow-content">
          <div className="slideshow-image">
            <div className="project-placeholder">
              {currentProject.title.charAt(0)}
            </div>
          </div>
          <div className="slideshow-info">
            <h2 className="project-title">{currentProject.title}</h2>
            <p className="project-description">{currentProject.description}</p>
          </div>
        </div>

        <button className="slideshow-nav slideshow-next" onClick={goToNext} aria-label="Next">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>

      <div className="slideshow-indicators">
        {projects.map((_, index) => (
          <button
            key={index}
            className={`indicator ${index === currentIndex ? 'active' : ''}`}
            onClick={() => goToSlide(index)}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

