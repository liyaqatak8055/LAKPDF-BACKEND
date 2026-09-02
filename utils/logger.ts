/**
 * Production-safe logger utility
 * Only logs in development mode, keeps production console clean
 */

const isDev = import.meta.env.DEV;

export const logger = {
    /**
     * Standard log - only in development
     */
    log: (...args: any[]) => {
        if (isDev) {
            console.log(...args);
        }
    },

    /**
     * Info log - only in development
     */
    info: (...args: any[]) => {
        if (isDev) {
            console.info(...args);
        }
    },

    /**
     * Warning - always shown (important for debugging)
     */
    warn: (...args: any[]) => {
        console.warn(...args);
    },

    /**
     * Error - always shown (critical for debugging)
     */
    error: (...args: any[]) => {
        console.error(...args);
    },

    /**
     * Debug - only in development
     */
    debug: (...args: any[]) => {
        if (isDev) {
            console.debug(...args);
        }
    },
};

// Convenience exports
export const { log, info, warn, error, debug } = logger;
export default logger;
