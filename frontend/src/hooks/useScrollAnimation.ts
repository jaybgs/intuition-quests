import { useEffect, useRef } from 'react';

/**
 * Custom hook for scroll-triggered animations
 * Applies fade-in and slide-up animation when element enters viewport
 */
export function useScrollAnimation(options?: {
  threshold?: number;
  rootMargin?: string;
  once?: boolean; // If true, only animate once (don't remove class when scrolling out)
}) {
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const {
      threshold = 0.1,
      rootMargin = '100px 0px 0px 0px',
      once = true,
    } = options || {};

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (!once || !hasAnimatedRef.current) {
              entry.target.classList.add('animate-in');
              hasAnimatedRef.current = true;
              
              if (once) {
                observer.unobserve(entry.target);
              }
            }
          } else if (!once) {
            entry.target.classList.remove('animate-in');
          }
        });
      },
      { threshold, rootMargin }
    );

    // Check if element is already in view on mount - make it immediately visible
    const rect = element.getBoundingClientRect();
    const isInView = rect.top < window.innerHeight && rect.bottom > 0;
    
    if (isInView && !hasAnimatedRef.current) {
      // First visible elements should be immediately visible, no animation
      element.classList.add('animate-in');
      hasAnimatedRef.current = true;
      return; // Don't set up observer for immediately visible elements
    }

    observer.observe(element);

    // Fallback: ensure element is visible after 2 seconds
    const fallbackTimeout = setTimeout(() => {
      if (!hasAnimatedRef.current && element) {
        element.classList.add('animate-in');
        hasAnimatedRef.current = true;
        observer.unobserve(element);
      }
    }, 2000);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
      clearTimeout(fallbackTimeout);
    };
  }, [options?.threshold, options?.rootMargin, options?.once]);

  return ref;
}