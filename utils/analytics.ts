/**
 * Analytics Utility
 * Lightweight analytics tracking for production
 */
import { API_BASE_URL } from './apiBase';

interface AnalyticsEvent {
    category: string;
    action: string;
    label?: string;
    value?: number;
}

interface PageView {
    path: string;
    title: string;
}

export interface WebVitalPayload {
    name: 'LCP' | 'INP' | 'CLS' | 'FCP' | 'TTFB' | 'FID';
    value: number;
    rating: 'good' | 'needs-improvement' | 'poor';
    id: string;
}

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
const ANALYTICS_ENABLED = import.meta.env.PROD;
const METRIC_ACTIONS = new Set(['tool_open', 'file_upload', 'process_success', 'download_click', 'drop_off_step']);
const FUNNEL_STATE_KEY = 'lakpdf_funnel_state_v1';

type FunnelStep = 'uploaded' | 'processed';
type FunnelState = Record<
    string,
    {
        lastStep: FunnelStep;
        updatedAt: number;
    }
>;

const readFunnelState = (): FunnelState => {
    if (typeof window === 'undefined') return {};
    try {
        const raw = sessionStorage.getItem(FUNNEL_STATE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
};

const writeFunnelState = (state: FunnelState): void => {
    if (typeof window === 'undefined') return;
    try {
        sessionStorage.setItem(FUNNEL_STATE_KEY, JSON.stringify(state));
    } catch {
        // Ignore storage errors so analytics never blocks UX.
    }
};

const emitEventToVendors = (event: AnalyticsEvent): void => {
    // Google Analytics 4
    if (window.gtag) {
        window.gtag('event', event.action, {
            event_category: event.category,
            event_label: event.label,
            value: event.value,
        });
    }

    // Plausible custom events
    if (window.plausible) {
        window.plausible(event.action, {
            props: {
                category: event.category,
                label: event.label,
            },
        });
    }
};

const relayMetricEvent = (event: AnalyticsEvent): void => {
    if (!METRIC_ACTIONS.has(event.action) || typeof window === 'undefined') return;
    const payload = {
        action: event.action,
        category: event.category,
        label: event.label || '',
        path: window.location.pathname || '/',
        ts: Date.now(),
    };
    const endpoint = `${API_BASE_URL}/metrics/event`;
    fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
    }).catch(() => {
        // Ignore telemetry network errors.
    });
};

const relayWebVital = (metric: WebVitalPayload): void => {
    if (!ANALYTICS_ENABLED || typeof window === 'undefined') return;
    if (!Number.isFinite(metric.value)) return;

    const endpoint = `${API_BASE_URL}/metrics/web-vital`;
    const payload = {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        id: metric.id,
        path: window.location.pathname || '/',
        ts: Date.now(),
    };

    fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
    }).catch(() => {
        // Ignore telemetry network errors.
    });
};

const updateFunnelState = (action: string): void => {
    if (typeof window === 'undefined') return;
    const path = window.location.pathname || '/';
    const state = readFunnelState();

    if (action === 'file_upload') {
        state[path] = {
            lastStep: 'uploaded',
            updatedAt: Date.now(),
        };
        writeFunnelState(state);
        return;
    }

    if (action === 'process_success') {
        state[path] = {
            lastStep: 'processed',
            updatedAt: Date.now(),
        };
        writeFunnelState(state);
        return;
    }

    if (action === 'download_click') {
        delete state[path];
        writeFunnelState(state);
    }
};

/**
 * Initialize analytics (Google Analytics or Plausible)
 */
export function initAnalytics(): void {
    if (ANALYTICS_ENABLED) {
        // Google Analytics 4 initialization
        if (window.gtag && GA_MEASUREMENT_ID) {
            console.log('[Analytics] Google Analytics initialized');
        }

        // Plausible Analytics (privacy-friendly alternative)
        // Add this script to index.html:
        // <script defer data-domain="yourdomain.com" src="https://plausible.io/js/script.js"></script>

        console.log('[Analytics] Analytics ready');
    }
}

/**
 * Track page view
 */
export function trackPageView(page: PageView): void {
    if (ANALYTICS_ENABLED) {
        // Google Analytics 4
        if (window.gtag && GA_MEASUREMENT_ID) {
            window.gtag('config', GA_MEASUREMENT_ID, {
                page_path: page.path,
                page_title: page.title,
            });
        }

        // Plausible (automatically tracks page views)
        if (window.plausible) {
            window.plausible('pageview');
        }

        console.log('[Analytics] Page view:', page.path);
    }
}

/**
 * Track custom event
 */
export function trackEvent(event: AnalyticsEvent): void {
    if (ANALYTICS_ENABLED) {
        emitEventToVendors(event);
        relayMetricEvent(event);
        if (event.action !== 'drop_off_step') {
            updateFunnelState(event.action);
        }
        console.log('[Analytics] Event:', event);
    }
}

export function trackDropOffStepForPath(path: string): void {
    if (!ANALYTICS_ENABLED || typeof window === 'undefined') return;
    const state = readFunnelState();
    const step = state[path];
    if (!step) return;

    const event: AnalyticsEvent = {
        category: 'Funnel',
        action: 'drop_off_step',
        label: `${path}:${step.lastStep}`,
    };
    emitEventToVendors(event);
    relayMetricEvent(event);
    console.log('[Analytics] Event:', event);

    delete state[path];
    writeFunnelState(state);
}

/**
 * Track tool usage
 */
export function trackToolUsage(toolName: string, action: string): void {
    trackEvent({
        category: 'Tool Usage',
        action: action,
        label: toolName,
    });
}

/**
 * Track file processing
 */
export function trackFileProcessing(
    toolName: string,
    fileType: string,
    fileSize: number,
    success: boolean
): void {
    trackEvent({
        category: 'File Processing',
        action: success ? 'Success' : 'Failed',
        label: `${toolName} - ${fileType}`,
        value: Math.round(fileSize / 1024), // Size in KB
    });
}

/**
 * Track errors
 */
export function trackError(
    errorName: string,
    errorMessage: string,
    fatal: boolean = false
): void {
    if (ANALYTICS_ENABLED) {
        // Google Analytics 4
        if (window.gtag) {
            window.gtag('event', 'exception', {
                description: `${errorName}: ${errorMessage}`,
                fatal: fatal,
            });
        }

        console.error('[Analytics] Error tracked:', errorName, errorMessage);
    }
}

/**
 * Track performance metrics
 */
export function trackPerformance(metricName: string, value: number): void {
    if (ANALYTICS_ENABLED) {
        // Google Analytics 4 - User Timing
        if (window.gtag) {
            window.gtag('event', 'timing_complete', {
                name: metricName,
                value: Math.round(value),
                event_category: 'Performance',
            });
        }

        console.log('[Analytics] Performance:', metricName, value);
    }
}

export function trackWebVital(metric: WebVitalPayload): void {
    if (!ANALYTICS_ENABLED) return;
    relayWebVital(metric);
    trackPerformance(`CWV_${metric.name}`, metric.value);
}

/**
 * Track user engagement
 */
export function trackEngagement(action: string, label?: string): void {
    trackEvent({
        category: 'User Engagement',
        action: action,
        label: label,
    });
}

// Type declarations for global analytics
declare global {
    interface Window {
        gtag?: (...args: any[]) => void;
        plausible?: (event: string, options?: any) => void;
    }
}

// Export analytics hooks for React components
export const useAnalytics = () => {
    return {
        trackPageView,
        trackEvent,
        trackToolUsage,
        trackFileProcessing,
        trackError,
        trackPerformance,
        trackWebVital,
        trackEngagement,
    };
};
