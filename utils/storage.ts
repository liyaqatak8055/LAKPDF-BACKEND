/**
 * State Persistence Utility
 * Saves and restores application state to/from localStorage
 * Prevents state loss on page refresh
 */

interface StorageOptions {
    expiryMinutes?: number;
    encrypt?: boolean;
}

interface StoredData<T> {
    data: T;
    timestamp: number;
    expiry?: number;
}

/**
 * Save data to localStorage with optional expiry
 */
export function saveToStorage<T>(
    key: string,
    data: T,
    options: StorageOptions = {}
): boolean {
    try {
        const { expiryMinutes } = options;

        const storedData: StoredData<T> = {
            data,
            timestamp: Date.now(),
            expiry: expiryMinutes ? Date.now() + expiryMinutes * 60 * 1000 : undefined,
        };

        localStorage.setItem(key, JSON.stringify(storedData));
        return true;
    } catch (error) {
        console.warn(`[Storage] Failed to save ${key}:`, error);
        return false;
    }
}

/**
 * Load data from localStorage with expiry check
 */
export function loadFromStorage<T>(key: string): T | null {
    try {
        const item = localStorage.getItem(key);
        if (!item) return null;

        const storedData: StoredData<T> = JSON.parse(item);

        // Check if data has expired
        if (storedData.expiry && Date.now() > storedData.expiry) {
            localStorage.removeItem(key);
            return null;
        }

        return storedData.data;
    } catch (error) {
        console.warn(`[Storage] Failed to load ${key}:`, error);
        return null;
    }
}

/**
 * Remove data from localStorage
 */
export function removeFromStorage(key: string): void {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.warn(`[Storage] Failed to remove ${key}:`, error);
    }
}

/**
 * Clear all app data from localStorage
 */
export function clearAllStorage(): void {
    try {
        const keys = Object.keys(localStorage);
        const appKeys = keys.filter(key => key.startsWith('lakpdf_'));
        appKeys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
        console.warn('[Storage] Failed to clear storage:', error);
    }
}

/**
 * Check if localStorage is available
 */
export function isStorageAvailable(): boolean {
    try {
        const test = '__storage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch {
        return false;
    }
}

/**
 * Get storage usage info
 */
export function getStorageInfo(): { used: number; available: number; percentage: number } {
    try {
        let used = 0;
        for (const key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                used += localStorage[key].length + key.length;
            }
        }

        // Most browsers allow 5-10MB, we'll use 5MB as conservative estimate
        const available = 5 * 1024 * 1024; // 5MB in bytes
        const percentage = (used / available) * 100;

        return {
            used,
            available,
            percentage: Math.min(percentage, 100),
        };
    } catch {
        return { used: 0, available: 0, percentage: 0 };
    }
}

// Predefined storage keys for the app
export const STORAGE_KEYS = {
    THEME: 'lakpdf_theme',
    RECENT_FILES: 'lakpdf_recent_files',
    USER_PREFERENCES: 'lakpdf_preferences',
    ANALYSIS_CACHE: 'lakpdf_analysis_cache',
    UPLOAD_STATE: 'lakpdf_upload_state',
} as const;

const APP_PREFIX = 'lakpdf_';
const MAX_APP_STORAGE_BYTES = 4.5 * 1024 * 1024; // Keep headroom under browser quota
const MAX_HISTORY_ITEMS = 50;
const MAX_FEEDBACK_ITEMS = 100;
const MAX_TEMPLATE_ITEMS = 40;
const HISTORY_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const FEEDBACK_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
const TEMP_MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12 hours

const readJsonSafe = <T>(key: string, fallback: T): T => {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
};

const writeJsonSafe = (key: string, value: unknown) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.warn(`[Storage] Failed to persist ${key}:`, error);
    }
};

const pruneArrayByTimestamp = (
    key: string,
    options: { maxItems: number; maxAgeMs?: number; timestampField?: string }
) => {
    const { maxItems, maxAgeMs, timestampField = 'timestamp' } = options;
    const parsed = readJsonSafe<any[]>(key, []);
    if (!Array.isArray(parsed)) {
        localStorage.removeItem(key);
        return;
    }

    const now = Date.now();
    const filtered = parsed
        .filter((item) => item && typeof item === 'object')
        .filter((item) => {
            if (!maxAgeMs) return true;
            const ts = Number(item[timestampField] ?? item.updatedAt ?? item.createdAt ?? 0);
            if (!Number.isFinite(ts) || ts <= 0) return false;
            return now - ts <= maxAgeMs;
        })
        .sort((a, b) => {
            const ta = Number(a[timestampField] ?? a.updatedAt ?? a.createdAt ?? 0);
            const tb = Number(b[timestampField] ?? b.updatedAt ?? b.createdAt ?? 0);
            return tb - ta;
        })
        .slice(0, maxItems);

    writeJsonSafe(key, filtered);
};

const pruneFormTemplates = () => {
    const key = 'lakpdf_form_templates';
    const parsed = readJsonSafe<Record<string, any>>(key, {});
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        localStorage.removeItem(key);
        return;
    }

    const entries = Object.entries(parsed)
        .filter(([, value]) => value && typeof value === 'object')
        .sort((a, b) => {
            const ta = Number(a[1]?.updatedAt ?? 0);
            const tb = Number(b[1]?.updatedAt ?? 0);
            return tb - ta;
        })
        .slice(0, MAX_TEMPLATE_ITEMS);

    writeJsonSafe(key, Object.fromEntries(entries));
};

const cleanupTempStorage = () => {
    const key = STORAGE_KEYS.UPLOAD_STATE;
    const parsed = readJsonSafe<{ timestamp?: number; expiry?: number } | null>(key, null);
    if (!parsed || typeof parsed !== 'object') {
        localStorage.removeItem(key);
        return;
    }

    const now = Date.now();
    const expiry = Number(parsed.expiry ?? 0);
    const timestamp = Number(parsed.timestamp ?? 0);
    const expiredByExpiry = Number.isFinite(expiry) && expiry > 0 && now > expiry;
    const expiredByAge = Number.isFinite(timestamp) && timestamp > 0 && now - timestamp > TEMP_MAX_AGE_MS;
    if (expiredByExpiry || expiredByAge) {
        localStorage.removeItem(key);
    }
};

const emergencyTrimIfNeeded = () => {
    const info = getStorageInfo();
    if (info.used <= MAX_APP_STORAGE_BYTES) return;

    // Drop cache-like keys first, preserve user preferences/session keys last.
    const removableKeys = [
        STORAGE_KEYS.ANALYSIS_CACHE,
        STORAGE_KEYS.UPLOAD_STATE,
        'lakpdf_feedback',
        'lakpdf_form_templates',
    ];
    removableKeys.forEach((key) => localStorage.removeItem(key));

    const history = readJsonSafe<any[]>('lakpdf_file_history', []);
    if (Array.isArray(history) && history.length > 0) {
        writeJsonSafe('lakpdf_file_history', history.slice(0, Math.min(20, history.length)));
    }
};

/**
 * Run startup storage maintenance:
 * - auto-delete old records
 * - cleanup temporary storage
 * - enforce hard limits (no unlimited growth)
 */
export const runStorageMaintenance = (): void => {
    try {
        pruneArrayByTimestamp('lakpdf_file_history', {
            maxItems: MAX_HISTORY_ITEMS,
            maxAgeMs: HISTORY_MAX_AGE_MS,
            timestampField: 'timestamp',
        });
        pruneArrayByTimestamp('lakpdf_feedback', {
            maxItems: MAX_FEEDBACK_ITEMS,
            maxAgeMs: FEEDBACK_MAX_AGE_MS,
            timestampField: 'timestamp',
        });
        pruneFormTemplates();
        cleanupTempStorage();
        emergencyTrimIfNeeded();

        // Best effort: remove unknown corrupt app keys.
        Object.keys(localStorage)
            .filter((key) => key.startsWith(APP_PREFIX))
            .forEach((key) => {
                const raw = localStorage.getItem(key);
                if (!raw) return;
                if (raw.length > 2 * 1024 * 1024) {
                    // Prevent a single oversized blob from blocking future writes.
                    localStorage.removeItem(key);
                }
            });
    } catch (error) {
        console.warn('[Storage] Maintenance skipped due to error:', error);
    }
};
