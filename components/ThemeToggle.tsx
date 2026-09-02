import React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export const ThemeToggle: React.FC = () => {
    const { theme, setTheme, appliedTheme } = useTheme();
    const [showMenu, setShowMenu] = React.useState(false);

    const themes: Array<{ value: 'light' | 'dark' | 'system'; label: string; icon: any }> = [
        { value: 'light', label: 'Light', icon: Sun },
        { value: 'dark', label: 'Dark', icon: Moon },
        { value: 'system', label: 'System', icon: Monitor },
    ];

    return (
        <div className="relative">
            {/* Toggle Button */}
            <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-dark-hover 
                   transition-colors duration-200 group"
                aria-label="Toggle theme"
                title={`Current: ${theme === 'system' ? `System (${appliedTheme})` : theme}`}
            >
                {appliedTheme === 'dark' ? (
                    <Moon className="w-5 h-5 text-slate-700 dark:text-dark-text-primary 
                          group-hover:text-primary-600 dark:group-hover:text-primary-400
                          transition-transform group-hover:rotate-12" />
                ) : (
                    <Sun className="w-5 h-5 text-slate-700 dark:text-dark-text-primary 
                         group-hover:text-primary-600 dark:group-hover:text-primary-400
                         transition-transform group-hover:rotate-12" />
                )}
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowMenu(false)}
                    />

                    {/* Menu */}
                    <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-dark-surface 
                          border border-slate-200 dark:border-dark-border rounded-lg 
                          shadow-lg z-50 overflow-hidden
                          animate-in fade-in slide-in-from-top-2 duration-200">
                        {themes.map(({ value, label, icon: Icon }) => (
                            <button
                                key={value}
                                onClick={() => {
                                    setTheme(value);
                                    setShowMenu(false);
                                }}
                                className={`w-full px-4 py-2.5 text-left flex items-center gap-3
                           transition-colors duration-200
                           ${theme === value
                                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                                        : 'text-slate-700 dark:text-dark-text-secondary hover:bg-slate-50 dark:hover:bg-dark-hover'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                <span className="text-sm font-medium">{label}</span>
                                {theme === value && (
                                    <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};
