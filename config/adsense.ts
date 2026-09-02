/**
 * Google AdSense Configuration
 * 
 * This file centralizes all AdSense settings for easy management.
 * Replace slot IDs with your actual AdSense ad unit IDs.
 * 
 * To create ad units:
 * 1. Go to https://adseense.google.com
 * 2. Go to "Ad units" → "By ad unit" → "Display ads"
 * 3. Create units and copy the slot IDs here
 */

export const AD_CONFIG = {
  /** Publisher ID */
  CLIENT_ID: String(import.meta.env.VITE_ADSENSE_CLIENT_ID || "ca-pub-9704679803624436"),
  
  /** Default ad slot IDs - Replace with your actual slot IDs */
  SLOTS: {
    /** Home page banner ad */
    HOME_BANNER: String(import.meta.env.VITE_AD_SLOT_HOME_BANNER || "9704679803624436"),
    /** Home page rectangle/medium ad */
    HOME_RECTANGLE: String(import.meta.env.VITE_AD_SLOT_HOME_RECTANGLE || "9704679803624436"),
    /** Tool pages bottom ad */
    TOOL_PAGE: String(import.meta.env.VITE_AD_SLOT_TOOL_PAGE || "9704679803624436"),
    /** Mobile-optimized adaptive ad */
    MOBILE_ADAPTIVE: String(import.meta.env.VITE_AD_SLOT_MOBILE_ADAPTIVE || "9704679803624436"),
    /** Sidebar ad (for future sidebar layout) */
    SIDEBAR: String(import.meta.env.VITE_AD_SLOT_SIDEBAR || "9704679803624436"),
  },
  
  /** Loading settings */
  LOADING: {
    /** Default delay before loading ads (ms) */
    DEFAULT_DELAY: 1500,
    /** Mobile delay (longer for better UX) */
    MOBILE_DELAY: 3000,
    /** Intersection observer root margin */
    ROOT_MARGIN: "200px",
  },
  
  /** Safety settings */
  SAFETY: {
    /** Minimum container width required (px) */
    MIN_WIDTH_DESKTOP: 300,
    /** Minimum container width for mobile (px) */
    MIN_WIDTH_MOBILE: 280,
    /** Maximum retry attempts */
    MAX_RETRIES: 2,
    /** Retry delay (ms) */
    RETRY_DELAY: 1000,
  },
};

/**
 * Get ad slot ID by name
 */
export function getAdSlot(slotName: keyof typeof AD_CONFIG.SLOTS): string {
  return AD_CONFIG.SLOTS[slotName];
}

/**
 * Check if AdSense script is loaded
 */
export function isAdSenseLoaded(): boolean {
  return typeof window !== 'undefined' && 
         typeof (window as any).adsbygoogle !== 'undefined';
}

/**
 * Preload AdSense script
 * Call this early in the app to ensure ads load faster
 */
export function preloadAdSense(): void {
  if (isAdSenseLoaded()) return;
  
  const script = document.createElement('script');
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CONFIG.CLIENT_ID}`;
  script.async = true;
  script.crossOrigin = 'anonymous';
  document.head.appendChild(script);
}

export default AD_CONFIG;
