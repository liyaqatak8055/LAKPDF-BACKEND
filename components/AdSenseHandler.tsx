/**
 * AdSense Route Handler
 * Handles ad refresh on route changes for SPA compatibility
 */

import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface AdSenseRouteHandlerProps {
    enableAds?: boolean;
    excludedRoutes?: string[];
}

/**
 * Component to handle AdSense ad refresh on route changes
 * Ensures ads are properly reloaded in SPA environment
 */
export const AdSenseRouteHandler: React.FC<AdSenseRouteHandlerProps> = ({
    enableAds = true,
    excludedRoutes = [
        '/admin',
    ],
}) => {
    const location = useLocation();
    const excluded = React.useMemo(() => excludedRoutes, [excludedRoutes.join('|')]);

    useEffect(() => {
        if (!enableAds || !import.meta.env.PROD) {
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
                // Push new ad requests
                const ads = document.querySelectorAll('.adsbygoogle');
                ads.forEach((ad) => {
                    // Only refresh if not already filled
                    if (!ad.getAttribute('data-ad-status')) {
                        (window.adsbygoogle = window.adsbygoogle || []).push({});
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
    useEffect(() => {
        if (import.meta.env.PROD) {
            try {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
            } catch (error) {
                console.debug('[AdSense] Ad initialization failed:', error);
            }
        }
    }, []);

    // Don't render ads in development
    if (!import.meta.env.PROD) {
        return (
            <div className={`bg-gray-100 p-4 text-center text-sm text-gray-500 ${className}`}>
                [Ad Placeholder - Production Only]
            </div>
        );
    }

    return (
        <ins
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
