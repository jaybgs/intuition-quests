import { useEffect, useRef } from 'react';

interface UseScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  delay?: number;
  disabled?: boolean;
}

/**
 * Enhanced hook for smooth scroll transitions (60fps).
 * Uses CSS transitions instead of keyframes to prevent jank.
 */
export function useScrollAnimation({
  threshold = 0.15,
  rootMargin = '0px',
  delay = 0,
  disabled = false
}: UseScrollAnimationOptions = {}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || disabled) return;

    // Initial state: Hidden below
    element.classList.add('reveal-status-hidden-below');

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target as HTMLElement;

          if (entry.isIntersecting) {
            // Visible: Apply delay and show
            if (delay > 0) {
              el.style.transitionDelay = `${delay}ms`;
            }
            el.classList.remove('reveal-status-hidden-below', 'reveal-status-hidden-above');
            el.classList.add('reveal-status-visible');
          } else {
            // Hidden: Remove delay (instant exit) and set direction
            el.style.transitionDelay = '0ms';

            const isBelow = entry.boundingClientRect.top > 0;

            el.classList.remove('reveal-status-visible');
            if (isBelow) {
              el.classList.add('reveal-status-hidden-below');
              el.classList.remove('reveal-status-hidden-above');
            } else {
              el.classList.add('reveal-status-hidden-above');
              el.classList.remove('reveal-status-hidden-below');
            }
          }
        });
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      if (element) {
        element.classList.remove(
          'reveal-status-visible',
          'reveal-status-hidden-below',
          'reveal-status-hidden-above'
        );
        element.style.transitionDelay = '';
        observer.unobserve(element);
      }
    };

  }, [threshold, rootMargin, delay, disabled]);

  return ref;
}