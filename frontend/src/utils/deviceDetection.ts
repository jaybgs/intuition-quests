/**
 * Device detection utilities
 * Determines if the user is on a PC/desktop device vs mobile/tablet
 */

/**
 * Check if the user is on a PC/desktop device
 * @returns true if PC/desktop, false if mobile/tablet
 */
export function isPCDevice(): boolean {
  // Check if we have access to window object (client-side)
  if (typeof window === 'undefined') {
    return true; // Assume PC for server-side rendering
  }

  // Check for touch capability (most mobile devices have touch)
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Check screen width (most tablets/mobile are <= 1024px, but some large tablets exist)
  const screenWidth = window.screen.width || window.innerWidth;

  // Check user agent for mobile keywords
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = ['mobile', 'android', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone', 'opera mini', 'iemobile'];

  // Check if it's clearly a mobile device
  const isMobileByUA = mobileKeywords.some(keyword => userAgent.includes(keyword));

  // iPad detection is tricky - iPad Pro can be large but still identified as mobile
  const isTablet = userAgent.includes('ipad') ||
                   (userAgent.includes('macintosh') && hasTouch) || // iPad Pro with Safari
                   (screenWidth <= 1024 && hasTouch);

  // Consider it a PC if:
  // - No touch capability AND screen width > 1024px, OR
  // - Explicitly not mobile by user agent AND screen width > 768px
  const isPC = (!hasTouch && screenWidth > 1024) ||
               (!isMobileByUA && screenWidth > 768 && !isTablet);

  console.log('🖥️ Device detection:', {
    hasTouch,
    screenWidth,
    isMobileByUA,
    isTablet,
    userAgent: userAgent.substring(0, 100) + '...',
    isPC
  });

  return isPC;
}

/**
 * Check if the user is on a mobile/tablet device
 * @returns true if mobile/tablet, false if PC
 */
export function isMobileDevice(): boolean {
  return !isPCDevice();
}
