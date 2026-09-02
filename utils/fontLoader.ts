// Google Fonts Loader for PDF Editor
// Dynamically loads and caches Google Fonts for use in PDF editing

export interface FontConfig {
    name: string;
    family: string;
    weights?: number[];
    category: 'sans-serif' | 'serif' | 'monospace' | 'handwriting' | 'display' | 'hindi';
    popular?: boolean;
}

// Curated list of professional fonts
export const AVAILABLE_FONTS: FontConfig[] = [
    // Sans-Serif (Modern & Clean)
    { name: 'Inter', family: 'Inter', weights: [400, 500, 600, 700], category: 'sans-serif', popular: true },
    { name: 'Roboto', family: 'Roboto', weights: [400, 500, 700], category: 'sans-serif', popular: true },
    { name: 'Open Sans', family: 'Open Sans', weights: [400, 600, 700], category: 'sans-serif', popular: true },
    { name: 'Lato', family: 'Lato', weights: [400, 700], category: 'sans-serif' },
    { name: 'Montserrat', family: 'Montserrat', weights: [400, 600, 700], category: 'sans-serif', popular: true },
    { name: 'Poppins', family: 'Poppins', weights: [400, 500, 600, 700], category: 'sans-serif', popular: true },
    { name: 'Nunito', family: 'Nunito', weights: [400, 600, 700], category: 'sans-serif' },
    { name: 'Ubuntu', family: 'Ubuntu', weights: [400, 500, 700], category: 'sans-serif' },

    // Serif (Professional & Elegant)
    { name: 'Merriweather', family: 'Merriweather', weights: [400, 700], category: 'serif', popular: true },
    { name: 'Playfair Display', family: 'Playfair Display', weights: [400, 700], category: 'serif' },
    { name: 'PT Serif', family: 'PT Serif', weights: [400, 700], category: 'serif' },
    { name: 'Lora', family: 'Lora', weights: [400, 600, 700], category: 'serif' },
    { name: 'Crimson Text', family: 'Crimson Text', weights: [400, 600, 700], category: 'serif' },

    // Monospace (Code & Technical)
    { name: 'JetBrains Mono', family: 'JetBrains Mono', weights: [400, 500, 700], category: 'monospace' },
    { name: 'Source Code Pro', family: 'Source Code Pro', weights: [400, 600], category: 'monospace' },
    { name: 'IBM Plex Mono', family: 'IBM Plex Mono', weights: [400, 600], category: 'monospace' },

    // Display (Headlines & Branding)
    { name: 'Bebas Neue', family: 'Bebas Neue', weights: [400], category: 'display' },
    { name: 'Archivo Black', family: 'Archivo Black', weights: [400], category: 'display' },

    // Handwriting (Signatures & Personal)
    { name: 'Dancing Script', family: 'Dancing Script', weights: [400, 700], category: 'handwriting' },
    { name: 'Pacifico', family: 'Pacifico', weights: [400], category: 'handwriting' },

    // Hindi/Devanagari (Regional Support)
    { name: 'Noto Sans Devanagari', family: 'Noto Sans Devanagari', weights: [400, 600, 700], category: 'hindi', popular: true },
    { name: 'Poppins (Hindi)', family: 'Poppins', weights: [400, 600], category: 'hindi' },
    { name: 'Mukta', family: 'Mukta', weights: [400, 600, 700], category: 'hindi' },
];

// Font loading cache
const loadedFonts = new Set<string>();
const loadingFonts = new Map<string, Promise<void>>();

/**
 * Load a Google Font dynamically
 */
export const loadFont = async (fontConfig: FontConfig): Promise<void> => {
    const fontKey = fontConfig.family;

    // Already loaded
    if (loadedFonts.has(fontKey)) {
        return Promise.resolve();
    }

    // Currently loading
    if (loadingFonts.has(fontKey)) {
        return loadingFonts.get(fontKey)!;
    }

    // Start loading
    const loadPromise = new Promise<void>((resolve, reject) => {
        try {
            // Build Google Fonts URL with correct format
            const weights = fontConfig.weights || [400];
            // Google Fonts API v2 format: family=FontName:wght@400;700
            const weightsParam = weights.join(';');
            const fontFamily = fontConfig.family.replace(/ /g, '+');
            const fontUrl = `https://fonts.googleapis.com/css2?family=${fontFamily}:wght@${weightsParam}&display=swap`;

            // Create link element
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = fontUrl;

            link.onload = () => {
                // Use Font Loading API to verify the font loaded
                if ('fonts' in document) {
                    Promise.all(
                        weights.map(weight =>
                            (document as any).fonts.load(`${weight} 16px "${fontConfig.family}"`)
                        )
                    ).then(() => {
                        loadedFonts.add(fontKey);
                        loadingFonts.delete(fontKey);
                        resolve();
                    }).catch(() => {
                        // Font loaded in stylesheet but not via Font API - still consider it success
                        loadedFonts.add(fontKey);
                        loadingFonts.delete(fontKey);
                        resolve();
                    });
                } else {
                    // Fallback for browsers without Font Loading API
                    loadedFonts.add(fontKey);
                    loadingFonts.delete(fontKey);
                    resolve();
                }
            };

            link.onerror = () => {
                loadingFonts.delete(fontKey);
                console.warn(`Failed to load font stylesheet: ${fontConfig.name}`);
                reject(new Error(`Failed to load font: ${fontConfig.name}`));
            };

            document.head.appendChild(link);
        } catch (error) {
            loadingFonts.delete(fontKey);
            reject(error);
        }
    });

    loadingFonts.set(fontKey, loadPromise);
    return loadPromise;
};

/**
 * Preload popular fonts
 */
export const preloadPopularFonts = async (): Promise<void> => {
    const popularFonts = AVAILABLE_FONTS.filter(f => f.popular);
    await Promise.all(popularFonts.map(font => loadFont(font)));
};

/**
 * Load multiple fonts
 */
export const loadFonts = async (fonts: FontConfig[]): Promise<void> => {
    await Promise.all(fonts.map(font => loadFont(font)));
};

/**
 * Get font by name
 */
export const getFontByName = (name: string): FontConfig | undefined => {
    return AVAILABLE_FONTS.find(f => f.name === name);
};

/**
 * Get fonts by category
 */
export const getFontsByCategory = (category: FontConfig['category']): FontConfig[] => {
    return AVAILABLE_FONTS.filter(f => f.category === category);
};

/**
 * Check if font is loaded
 */
export const isFontLoaded = (fontFamily: string): boolean => {
    return loadedFonts.has(fontFamily);
};
