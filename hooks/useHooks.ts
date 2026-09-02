import { useState, useEffect, useCallback } from 'react';

// Hook to detect online/offline status
export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};

// Hook for PWA installation prompt
export const usePWAInstall = () => {
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!installPrompt) return false;

    const promptEvent = installPrompt as any;
    await promptEvent.prompt();
    
    const { outcome } = await promptEvent.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setIsInstallable(false);
    }
    
    setInstallPrompt(null);
    return outcome === 'accepted';
  }, [installPrompt]);

  return { install, isInstalled, isInstallable };
};

// Hook for local storage with reactive state
export const useLocalStorage = <T,>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue] as const;
};

// Hook for tracking file operations history
export const useFileHistory = () => {
  const [history, setHistory] = useLocalStorage<Array<{
    id: string;
    name: string;
    type: string;
    tool: string;
    timestamp: number;
    size?: number;
  }>>('lakpdf_file_history', []);

  const addToHistory = useCallback((file: {
    name: string;
    type: string;
    tool: string;
    size?: number;
  }) => {
    const newEntry = {
      id: Math.random().toString(36).substr(2, 9),
      ...file,
      timestamp: Date.now(),
    };
    setHistory((prev) => [newEntry, ...prev.slice(0, 49)]); // Keep last 50 entries
    return newEntry;
  }, [setHistory]);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, [setHistory]);

  const removeFromHistory = useCallback((id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  }, [setHistory]);

  return { history, addToHistory, clearHistory, removeFromHistory };
};

// Hook for favorites
export const useFavorites = () => {
  const [favorites, setFavorites] = useLocalStorage<string[]>('lakpdf_favorites', []);

  const toggleFavorite = useCallback((toolId: string) => {
    setFavorites((prev) => 
      prev.includes(toolId) 
        ? prev.filter((id) => id !== toolId)
        : [...prev, toolId]
    );
  }, [setFavorites]);

  const isFavorite = useCallback((toolId: string) => {
    return favorites.includes(toolId);
  }, [favorites]);

  return { favorites, toggleFavorite, isFavorite };
};

// Hook for debounced value
export const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
};

// Hook for tracking usage statistics
export const useUsageStats = () => {
  const [stats, setStats] = useLocalStorage<{
    toolsUsed: number;
    filesProcessed: number;
    lastActive: number;
  }>('lakpdf_stats', {
    toolsUsed: 0,
    filesProcessed: 0,
    lastActive: Date.now(),
  });

  const incrementUsage = useCallback((filesCount: number = 1) => {
    setStats((prev) => ({
      ...prev,
      toolsUsed: prev.toolsUsed + 1,
      filesProcessed: prev.filesProcessed + filesCount,
      lastActive: Date.now(),
    }));
  }, [setStats]);

  return { stats, incrementUsage };
};

// Hook for mobile detection
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

