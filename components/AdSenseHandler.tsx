/**
 * AdSense Route Handler
 * Handles ad refresh on route changes for SPA compatibility
 */

import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { AD_CONFIG } from '../config/adsense';

interface AdSenseRouteHandlerProps {
    enableAds?: boolean;
    excludedRoutes?: string[];
}

/**
 * Component to handle AdSense ad refresh on route changes
 * Ensures ads are properly reloaded in SPA environment
 */
export const AdSenseRouteHandler: React.FC<AdSenseRouteHandlerProps> = ({
    enableAds = AD_CONFIG.ENABLED,
    excludedRoutes = [
        '/admin',
    ],
}) => {
    const location = useLocation();
    const excluded = React.useMemo(() => excludedRoutes, [excludedRoutes.join('|')]);

    useEffect(() => {
        if (!enableAds || !AD_CONFIG.ENABLED || !import.meta.env.PROD) {
            return;
        }

        // Check if current route should have ads
        const shouldShowAds = !excluded.some((route) =>
            location.pathname.startsWith(route)
        );

        if (!shouldShowAds) {
            return;
        }

        // Refresh ads on route change
        try {
            // Wait for AdSense script to load
            if (window.adsbygoogle) {
                // Push new ad requests only for uninitialized slots
                const ads = document.querySelectorAll('.adsbygoogle');
                ads.forEach((ad) => {
                    const status = ad.getAttribute('data-ad-status') || ad.getAttribute('data-adsbygoogle-status');
                    const isPushed = ad.getAttribute('data-ad-pushed');
                    if (!status && !isPushed) {
                        ad.setAttribute('data-ad-pushed', 'true');
                        try {
                            (window.adsbygoogle = window.adsbygoogle || []).push({});
                        } catch {
                            // Silently ignore push errors on already-registered slots
                        }
                    }
                });
            }
        } catch (error) {
            // Silently fail - ads are not critical
            console.debug('[AdSense] Ad refresh failed:', error);
        }
    }, [location.pathname, enableAds, excluded]);

    return null;
};

/**
 * AdSense component for displaying ads
 */
interface AdSenseProps {
    slot: string;
    format?: 'auto' | 'fluid' | 'rectangle' | 'vertical' | 'horizontal';
    responsive?: boolean;
    className?: string;
}

export const AdSense: React.FC<AdSenseProps> = ({
    slot,
    format = 'auto',
    responsive = true,
    className = '',
}) => {
    const adRef = React.useRef<HTMLModElement | null>(null);

    useEffect(() => {
        if (AD_CONFIG.ENABLED && import.meta.env.PROD) {
            if (typeof (window as any).__loadAdSense === 'function') {
                (window as any).__loadAdSense();
            }
            if (adRef.current && !adRef.current.getAttribute('data-ad-pushed')) {
                adRef.current.setAttribute('data-ad-pushed', 'true');
                try {
                    (window.adsbygoogle = window.adsbygoogle || []).push({});
                } catch (error) {
                    console.debug('[AdSense] Ad initialization failed:', error);
                }
            }
        }
    }, []);

    // Don't render ads if disabled or in development
    if (!AD_CONFIG.ENABLED || !import.meta.env.PROD) {
        return null;
    }

    return (
        <ins
            ref={adRef}
            className={`adsbygoogle ${className}`}
            style={{ display: 'block' }}
            data-ad-client="ca-pub-9704679803624436"
            data-ad-slot={slot}
            data-ad-format={format}
            data-full-width-responsive={responsive ? 'true' : 'false'}
        />
    );
};

// Type declarations
declare global {
    interface Window {
        adsbygoogle?: any[];
    }
}
