import { trackWebVital } from './analytics';

// Web Vitals Performance Monitoring
export interface WebVitalsMetric {
    name: string;
    value: number;
    rating: 'good' | 'needs-improvement' | 'poor';
    delta: number;
    id: string;
}

// Thresholds based on web.dev recommendations
const THRESHOLDS = {
    LCP: { good: 2500, poor: 4000 },
    INP: { good: 200, poor: 500 },
    FID: { good: 100, poor: 300 },
    CLS: { good: 0.1, poor: 0.25 },
    FCP: { good: 1800, poor: 3000 },
    TTFB: { good: 800, poor: 1800 },
};

function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const threshold = THRESHOLDS[name as keyof typeof THRESHOLDS];
    if (!threshold) return 'good';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
}

// Report metric to console (can be extended to send to analytics)
function reportMetric(metric: WebVitalsMetric) {
    const emoji = metric.rating === 'good' ? '✅' : metric.rating === 'needs-improvement' ? '⚠️' : '❌';
    console.log(`${emoji} ${metric.name}: ${metric.value.toFixed(2)}ms (${metric.rating})`);

    if (['LCP', 'INP', 'CLS', 'FCP', 'TTFB', 'FID'].includes(metric.name)) {
        trackWebVital({
            name: metric.name as 'LCP' | 'INP' | 'CLS' | 'FCP' | 'TTFB' | 'FID',
            value: metric.value,
            rating: metric.rating,
            id: metric.id,
        });
    }
}

// Largest Contentful Paint (LCP)
export function measureLCP() {
    if (!('PerformanceObserver' in window)) return;

    try {
        const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1] as PerformanceEntry & { renderTime?: number; loadTime?: number };

            const value = lastEntry.renderTime || lastEntry.loadTime || 0;
            const metric: WebVitalsMetric = {
                name: 'LCP',
                value,
                rating: getRating('LCP', value),
                delta: value,
                id: `lcp-${Date.now()}`,
            };

            reportMetric(metric);
        });

        observer.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {
        console.error('LCP measurement failed:', e);
    }
}

// First Input Delay (FID)
export function measureFID() {
    if (!('PerformanceObserver' in window)) return;

    try {
        const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry: any) => {
                const value = entry.processingStart - entry.startTime;
                const metric: WebVitalsMetric = {
                    name: 'FID',
                    value,
                    rating: getRating('FID', value),
                    delta: value,
                    id: `fid-${Date.now()}`,
                };

                reportMetric(metric);
            });
        });

        observer.observe({ type: 'first-input', buffered: true });
    } catch (e) {
        console.error('FID measurement failed:', e);
    }
}

// Interaction to Next Paint (INP)
export function measureINP() {
    if (!('PerformanceObserver' in window)) return;

    let worstInteraction = 0;
    const seenInteraction = new Map<number, number>();
    let emitted = false;

    const emitCurrentINP = () => {
        if (emitted || worstInteraction <= 0) return;
        emitted = true;
        const metric: WebVitalsMetric = {
            name: 'INP',
            value: worstInteraction,
            rating: getRating('INP', worstInteraction),
            delta: worstInteraction,
            id: `inp-${Date.now()}`,
        };
        reportMetric(metric);
    };

    try {
        const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries() as Array<PerformanceEntry & { interactionId?: number; duration?: number }>;
            entries.forEach((entry) => {
                const interactionId = Number(entry.interactionId || 0);
                const duration = Number(entry.duration || 0);
                if (!interactionId || !Number.isFinite(duration) || duration <= 0) return;

                const previous = Number(seenInteraction.get(interactionId) || 0);
                if (duration > previous) {
                    seenInteraction.set(interactionId, duration);
                }
                if (duration > worstInteraction) {
                    worstInteraction = duration;
                }
            });
        });

        observer.observe({ type: 'event', buffered: true, durationThreshold: 16 } as PerformanceObserverInit);

        const finalize = () => {
            emitCurrentINP();
            observer.disconnect();
        };
        window.addEventListener('pagehide', finalize, { once: true });
        document.addEventListener(
            'visibilitychange',
            () => {
                if (document.visibilityState === 'hidden') emitCurrentINP();
            },
            { once: true }
        );
    } catch (e) {
        console.error('INP measurement failed:', e);
    }
}

// Cumulative Layout Shift (CLS)
export function measureCLS() {
    if (!('PerformanceObserver' in window)) return;

    let clsValue = 0;
    let sessionValue = 0;
    let sessionEntries: any[] = [];

    try {
        const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();

            entries.forEach((entry: any) => {
                if (!entry.hadRecentInput) {
                    const firstSessionEntry = sessionEntries[0];
                    const lastSessionEntry = sessionEntries[sessionEntries.length - 1];

                    if (
                        sessionValue &&
                        entry.startTime - lastSessionEntry.startTime < 1000 &&
                        entry.startTime - firstSessionEntry.startTime < 5000
                    ) {
                        sessionValue += entry.value;
                        sessionEntries.push(entry);
                    } else {
                        sessionValue = entry.value;
                        sessionEntries = [entry];
                    }

                    if (sessionValue > clsValue) {
                        clsValue = sessionValue;

                        const metric: WebVitalsMetric = {
                            name: 'CLS',
                            value: clsValue,
                            rating: getRating('CLS', clsValue),
                            delta: entry.value,
                            id: `cls-${Date.now()}`,
                        };

                        reportMetric(metric);
                    }
                }
            });
        });

        observer.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {
        console.error('CLS measurement failed:', e);
    }
}

// First Contentful Paint (FCP)
export function measureFCP() {
    if (!('PerformanceObserver' in window)) return;

    try {
        const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry) => {
                if (entry.name === 'first-contentful-paint') {
                    const value = entry.startTime;
                    const metric: WebVitalsMetric = {
                        name: 'FCP',
                        value,
                        rating: getRating('FCP', value),
                        delta: value,
                        id: `fcp-${Date.now()}`,
                    };

                    reportMetric(metric);
                }
            });
        });

        observer.observe({ type: 'paint', buffered: true });
    } catch (e) {
        console.error('FCP measurement failed:', e);
    }
}

// Time to First Byte (TTFB)
export function measureTTFB() {
    try {
        const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

        if (navigationEntry) {
            const value = navigationEntry.responseStart - navigationEntry.requestStart;
            const metric: WebVitalsMetric = {
                name: 'TTFB',
                value,
                rating: getRating('TTFB', value),
                delta: value,
                id: `ttfb-${Date.now()}`,
            };

            reportMetric(metric);
        }
    } catch (e) {
        console.error('TTFB measurement failed:', e);
    }
}

// Initialize all performance monitoring
export function initPerformanceMonitoring() {
    // Only run in browser and production
    if (typeof window === 'undefined') return;

    // Measure on page load
    if (document.readyState === 'complete') {
        measureAll();
    } else {
        window.addEventListener('load', measureAll);
    }
}

function measureAll() {
    measureTTFB();
    measureFCP();
    measureLCP();
    measureINP();
    measureFID();
    measureCLS();
}

// Export for manual triggering
export const performanceMonitoring = {
    measureLCP,
    measureINP,
    measureFID,
    measureCLS,
    measureFCP,
    measureTTFB,
    initPerformanceMonitoring,
};
