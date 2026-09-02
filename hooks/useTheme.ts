import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark' | 'system';

export const useTheme = () => {
    // Get initial theme from localStorage or default to light
    const getInitialTheme = (): Theme => {
        try {
            const stored = localStorage.getItem('lakpdf-theme');
            if (stored === 'light' || stored === 'dark' || stored === 'system') {
                return stored;
            }
        } catch {
            // ignore storage errors
        }
        return 'light';
    };

    const [theme, setTheme] = useState<Theme>(getInitialTheme);

    // Check system preference
    const getSystemTheme = (): 'light' | 'dark' => {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    };

    // Get actual theme to apply (resolve 'system' to light/dark)
    const getAppliedTheme = (): 'light' | 'dark' => {
        if (theme === 'system') {
            return getSystemTheme();
        }
        return theme;
    };

    // Apply theme to DOM
    useEffect(() => {
        const root = document.documentElement;
        const appliedTheme = getAppliedTheme();

        // Remove both classes first
        root.classList.remove('light', 'dark');

        // Add the appropriate class
        root.classList.add(appliedTheme);

        // Store preference
        try {
            localStorage.setItem('lakpdf-theme', theme);
        } catch {
            // ignore storage errors
        }
    }, [theme]);

    // Listen to system theme changes when in system mode
    useEffect(() => {
        if (theme !== 'system') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => {
            const root = document.documentElement;
            const systemTheme = getSystemTheme();
            root.classList.remove('light', 'dark');
            root.classList.add(systemTheme);
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);

    // Toggle between light and dark (skip system for quick toggle)
    const toggleTheme = () => {
        setTheme(prev => {
            if (prev === 'dark') return 'light';
            if (prev === 'light') return 'dark';
            // If system, toggle to opposite of current system preference
            return getSystemTheme() === 'dark' ? 'light' : 'dark';
        });
    };

    return {
        theme,
        setTheme,
        toggleTheme,
        appliedTheme: getAppliedTheme(),
    };
};
