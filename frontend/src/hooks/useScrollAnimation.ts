import { useEffect, useRef } from 'react';

interface UseScrollAnimationOptions {
    threshold?: number;
    rootMargin?: string;
    delay?: number;
    disabled?: boolean;
    once?: boolean; // New option to control play-once behavior
}

/**
 * Hook for smooth scroll transitions.
 * @param options Configuration options
 * @returns Ref to attach to the element
 */
export function useScrollAnimation({
    threshold = 0.15,
    rootMargin = '0px',
    delay = 0,
    disabled = false,
    once = true // Default to true (play once) to fix the "scrolling up" issue
}: UseScrollAnimationOptions = {}) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const element = ref.current;
        if (!element || disabled) return;

        // Initial state: Hidden below
        // We only add this if the element hasn't been revealed yet
        if (!element.classList.contains('reveal-status-visible')) {
            element.classList.add('reveal-status-hidden-below');
        }

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

                        // If once is true, stop observing so it never hides again
                        if (once) {
                            observer.unobserve(el);
                        }
                    } else {
                        // Only hide if NOT in 'once' mode
                        if (!once) {
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
                    }
                });
            },
            { threshold, rootMargin }
        );

        observer.observe(element);

        return () => {
            if (element) {
                // Cleanup if component unmounts
                observer.unobserve(element);
            }
        };

    }, [threshold, rootMargin, delay, disabled, once]);

    return ref;
}
