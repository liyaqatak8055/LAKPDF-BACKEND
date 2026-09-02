import { useState, useEffect, useCallback } from 'react';
import { saveToStorage, loadFromStorage, STORAGE_KEYS } from '../utils/storage';

/**
 * Custom hook for persistent state that survives page refreshes
 * Automatically saves to localStorage and restores on mount
 */
export function usePersistedState<T>(
    key: string,
    initialValue: T,
    expiryMinutes?: number
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
    // Initialize state from localStorage or use initial value
    const [state, setState] = useState<T>(() => {
        const stored = loadFromStorage<T>(key);
        return stored !== null ? stored : initialValue;
    });

    // Update localStorage whenever state changes
    useEffect(() => {
        saveToStorage(key, state, { expiryMinutes });
    }, [key, state, expiryMinutes]);

    // Clear function to reset to initial value
    const clearState = useCallback(() => {
        setState(initialValue);
        localStorage.removeItem(key);
    }, [key, initialValue]);

    return [state, setState, clearState];
}

/**
 * Hook for managing file upload state with persistence
 */
export function usePersistedFiles() {
    return usePersistedState<File[]>(STORAGE_KEYS.UPLOAD_STATE, [], 30);
}

/**
 * Hook for managing user preferences with persistence
 */
export function usePersistedPreferences() {
    const defaultPreferences = {
        compressionQuality: 0.8,
        defaultFormat: 'pdf',
        autoDownload: false,
        showTutorials: true,
    };

    return usePersistedState(
        STORAGE_KEYS.USER_PREFERENCES,
        defaultPreferences
    );
}

export default usePersistedState;
