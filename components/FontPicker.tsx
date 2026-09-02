import React, { useState, useEffect, useRef } from 'react';
import { Check, ChevronDown, Search, Star } from 'lucide-react';
import { AVAILABLE_FONTS, FontConfig, loadFont, isFontLoaded } from '../utils/fontLoader';

interface FontPickerProps {
    selectedFont: string;
    onFontChange: (fontFamily: string) => void;
    className?: string;
}

export const FontPicker: React.FC<FontPickerProps> = ({
    selectedFont,
    onFontChange,
    className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [loadedFonts, setLoadedFonts] = useState<Set<string>>(new Set());
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Filter fonts based on search
    const filteredFonts = AVAILABLE_FONTS.filter(font =>
        font.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        font.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Group fonts by category
    const popularFonts = filteredFonts.filter(f => f.popular);
    const categorizedFonts = {
        'sans-serif': filteredFonts.filter(f => f.category === 'sans-serif' && !f.popular),
        'serif': filteredFonts.filter(f => f.category === 'serif'),
        'monospace': filteredFonts.filter(f => f.category === 'monospace'),
        'display': filteredFonts.filter(f => f.category === 'display'),
        'handwriting': filteredFonts.filter(f => f.category === 'handwriting'),
        'hindi': filteredFonts.filter(f => f.category === 'hindi'),
    };

    // Load font on hover
    const handleFontHover = async (font: FontConfig) => {
        if (!isFontLoaded(font.family)) {
            try {
                await loadFont(font);
                setLoadedFonts(prev => new Set(prev).add(font.family));
            } catch (error) {
                console.error('Failed to load font:', error);
            }
        }
    };

    // Handle font selection
    const handleFontSelect = async (font: FontConfig) => {
        try {
            await loadFont(font);
            onFontChange(font.family);
            setIsOpen(false);
        } catch (error) {
            console.error('Failed to load font:', error);
        }
    };

    const selectedFontConfig = AVAILABLE_FONTS.find(f => f.family === selectedFont);

    return (
        <div ref={dropdownRef} className={`relative ${className}`}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-dark-surface border 
                   border-slate-300 dark:border-dark-border rounded-lg hover:border-primary-400 
                   dark:hover:border-primary-500 transition-colors text-sm font-medium
                   text-slate-700 dark:text-dark-text-primary w-full min-w-0 sm:min-w-[160px]"
                type="button"
            >
                <span
                    className="flex-1 text-left truncate"
                    style={{ fontFamily: selectedFont }}
                >
                    {selectedFontConfig?.name || selectedFont}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-dark-surface 
                        max-w-[min(20rem,calc(100vw-2rem))]
                        border border-slate-200 dark:border-dark-border rounded-lg shadow-xl 
                        z-50 max-h-[400px] flex flex-col overflow-hidden">
                    {/* Search */}
                    <div className="p-3 border-b border-slate-200 dark:border-dark-border">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search fonts..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-dark-bg border border-slate-200 
                           dark:border-dark-border rounded-lg text-sm text-slate-700 dark:text-dark-text-primary
                           placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Font List */}
                    <div className="overflow-y-auto flex-1">
                        {/* Popular Fonts */}
                        {popularFonts.length > 0 && !searchQuery && (
                            <div className="px-3 py-2">
                                <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold text-slate-500 dark:text-dark-text-muted uppercase">
                                    <Star className="w-3 h-3 fill-current" />
                                    <span>Popular</span>
                                </div>
                                {popularFonts.map((font) => (
                                    <FontItem
                                        key={font.family}
                                        font={font}
                                        isSelected={selectedFont === font.family}
                                        onSelect={handleFontSelect}
                                        onHover={handleFontHover}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Category Groups */}
                        {Object.entries(categorizedFonts).map(([category, fonts]) => {
                            if (fonts.length === 0) return null;

                            const categoryLabels: Record<string, string> = {
                                'sans-serif': 'Sans Serif',
                                'serif': 'Serif',
                                'monospace': 'Monospace',
                                'display': 'Display',
                                'handwriting': 'Handwriting',
                                'hindi': 'Hindi / देवनागरी',
                            };

                            return (
                                <div key={category} className="px-3 py-2 border-t border-slate-100 dark:border-dark-border">
                                    <div className="px-2 py-1 text-xs font-semibold text-slate-500 dark:text-dark-text-muted uppercase">
                                        {categoryLabels[category]}
                                    </div>
                                    {fonts.map((font) => (
                                        <FontItem
                                            key={font.family}
                                            font={font}
                                            isSelected={selectedFont === font.family}
                                            onSelect={handleFontSelect}
                                            onHover={handleFontHover}
                                        />
                                    ))}
                                </div>
                            );
                        })}

                        {/* No Results */}
                        {filteredFonts.length === 0 && (
                            <div className="p-8 text-center text-slate-500 dark:text-dark-text-muted text-sm">
                                No fonts found matching "{searchQuery}"
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// Font Item Component
interface FontItemProps {
    font: FontConfig;
    isSelected: boolean;
    onSelect: (font: FontConfig) => void;
    onHover: (font: FontConfig) => void;
}

const FontItem: React.FC<FontItemProps> = ({ font, isSelected, onSelect, onHover }) => {
    return (
        <button
            onClick={() => onSelect(font)}
            onMouseEnter={() => onHover(font)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg
                  transition-colors text-left ${isSelected
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'hover:bg-slate-50 dark:hover:bg-dark-hover text-slate-700 dark:text-dark-text-secondary'
                }`}
            type="button"
        >
            <span
                className="text-sm font-medium truncate"
                style={{ fontFamily: font.family }}
            >
                {font.name}
            </span>
            {isSelected && (
                <Check className="w-4 h-4 flex-shrink-0 ml-2" />
            )}
        </button>
    );
};
