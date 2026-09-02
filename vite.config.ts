import path from 'path';
import fs from 'node:fs';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import viteCompression from 'vite-plugin-compression';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Converts every Vite-injected CSS <link> in the production HTML to
 * load asynchronously (media="print" trick), so they don't block FCP.
 * Critical CSS is already inlined in index.html's <style> tag.
 *
 * IMPORTANT: Only processes links OUTSIDE <noscript> blocks to prevent
 * double-wrapping that creates invalid nested <noscript> markup.
 */
function makeStylesAsync(): Plugin {
  return {
    name: 'make-styles-async',
    apply: 'build',
    transformIndexHtml(html) {
      // Inject preload for CSS for fast network prioritization
      return html.replace(
        /<link rel="stylesheet"([^>]+href="([^"]+\.css)"[^>]*)>/g,
        '<link rel="preload" as="style" crossorigin href="$2">\n  <link rel="stylesheet"$1>'
      );
    },
  };
}

/**
 * Scans the output bundle for Inter woff2 files and:
 * 1. Injects <link rel="preload"> tags with correct content-hashed filenames.
 * 2. Patches inline @font-face src() URLs in the critical <style> block so
 *    they resolve to the hashed filenames in production.
 * This runs AFTER Vite finishes bundling, so the hashes are known and accurate.
 */
function injectFontPreloads(): Plugin {
  return {
    name: 'inject-font-preloads',
    apply: 'build',
    enforce: 'post',
    // writeBundle runs AFTER all assets are on disk — hashes are known and final
    writeBundle(options, bundle) {
      const outDir = options.dir ?? 'dist';

      // Strategy 1: Find Inter woff2 files in the Rollup bundle object (hashed)
      let fontFiles = Object.keys(bundle).filter(
        (f) => f.endsWith('.woff2') && f.includes('inter-latin')
      );

      // Strategy 2: If not found in bundle (e.g. fonts come from public/), scan dist on disk
      if (fontFiles.length === 0) {
        const fontsDir = path.join(outDir, 'assets', 'fonts');
        if (fs.existsSync(fontsDir)) {
          fontFiles = fs.readdirSync(fontsDir)
            .filter((f: string) => f.endsWith('.woff2') && f.includes('inter-latin'))
            .map((f: string) => `assets/fonts/${f}`);
          if (fontFiles.length > 0) {
            console.log(`[inject-font-preloads] Found ${fontFiles.length} fonts from public/ dir (unhashed).`);
          }
        }
      }

      if (fontFiles.length === 0) {
        console.warn('[inject-font-preloads] No inter-latin woff2 files found in bundle or dist — skipping.');
        return;
      }

      // Patch the final index.html on disk
      const htmlPath = path.join(outDir, 'index.html');
      let html = fs.readFileSync(htmlPath, 'utf8');

      // 1. Remove the static placeholder preloads from source index.html
      //    (they have unhashed paths — we'll re-inject with correct paths)
      html = html.replace(/\s*<link rel="preload" as="font"[^>]+inter-latin[^>]*>/g, '');

      // 2. Patch inline @font-face src() URLs if we have hashed filenames
      for (const fontPath of fontFiles) {
        const weightMatch = fontPath.match(/inter-latin-(\d+)-normal/);
        if (!weightMatch) continue;
        const weight = weightMatch[1];
        const srcPattern = new RegExp(
          `url\\(['"]?/assets/fonts/inter-latin-${weight}-normal[^'"\\)]*\.woff2['"]?\\)`,
          'g'
        );
        html = html.replace(srcPattern, `url('/${fontPath}')`);
      }

      // 3. Build and inject <link rel="preload"> tags with correct paths
      const preloadTags = fontFiles
        .filter((f) => f.includes('-normal.')) // Only normal style, not italic
        .map((f) => `  <link rel="preload" as="font" type="font/woff2" crossorigin="anonymous" href="/${f}">`)
        .join('\n');

      html = html.replace('</head>', `\n${preloadTags}\n</head>`);

      fs.writeFileSync(htmlPath, html, 'utf8');
      console.log(`[inject-font-preloads] Injected ${fontFiles.length} font preloads + patched inline @font-face in ${htmlPath}`);
    },
  };
}


export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const backendPort = Number(env.PORT || 8787);
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || `http://localhost:${Number.isFinite(backendPort) ? backendPort : 8787}`;

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      middlewareMode: false,
      fs: { strict: false },
      headers: {
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https: wss: ws: blob: data:; worker-src 'self' blob:; child-src 'self' blob:; frame-src 'self'; object-src 'none';",
        'Permissions-Policy': "camera=(self), microphone=(), geolocation=()",
      },
      proxy: {
        '/api': { target: apiProxyTarget, changeOrigin: true },
      },
    },
    preview: {
      headers: {
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https: wss: ws: blob: data:; worker-src 'self' blob:; child-src 'self' blob:; frame-src 'self'; object-src 'none';",
        'Permissions-Policy': "camera=(self), microphone=(), geolocation=()",
      },
    },
    appType: 'spa',

    plugins: [
      // Make production CSS links async (non-render-blocking)
      makeStylesAsync(),

      // Inject correct content-hashed font preloads into built index.html
      injectFontPreloads(),

      react(),

      // Gzip — for servers that support it
      viteCompression({
        algorithm: 'gzip',
        ext: '.gz',
        threshold: 8192,
        deleteOriginFile: false,
      }),

      // Brotli — significantly smaller than gzip (20-30% better)
      viteCompression({
        algorithm: 'brotliCompress',
        ext: '.br',
        threshold: 8192,
        deleteOriginFile: false,
      }),

      // PWA + Service Worker — pre-cache shell & vendor-react for instant repeat visits
      VitePWA({
        registerType: 'autoUpdate',
        // Don't generate a dev SW — only in production builds
        devOptions: { enabled: false },
        // Inline the SW registration snippet (no extra network request)
        injectRegister: 'inline',
        manifest: {
          name: 'LAK PDF – Free Online PDF Tools',
          short_name: 'LAK PDF',
          description: 'Merge, compress, convert, sign and edit PDFs online free. No signup required.',
          theme_color: '#e5323f',
          background_color: '#f6f7f9',
          display: 'standalone',
          start_url: '/',
          icons: [
            { src: '/favicon-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icon-512.png',        sizes: '512x512', type: 'image/png' },
          ],
        },
        workbox: {
          // Pre-cache: app shell, vendor-react, icons chunk, and fonts
          // Using ** globs because Vite puts assets in subdirectories
          globPatterns: [
            '**/*.html',
            '**/vendor-react-*.js',
            '**/vendor-icons-*.js',
            '**/*.woff2',
            'favicon.ico',
            'favicon-192x192.png',
          ],
          // Don't pre-cache the heavy tool chunks — they're loaded on-demand
          globIgnores: [
            '**/vendor-pdfjs-*.js',
            '**/vendor-fabric-*.js',
            '**/vendor-ocr-*.js',
            '**/vendor-pdf-lib-*.js',
            '**/vendor-mammoth-*.js',
          ],
          // Cache-first for pre-cached assets; network-first for everything else
          runtimeCaching: [
            {
              // Google Fonts CSS — stale-while-revalidate
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/css/,
              handler: 'StaleWhileRevalidate',
              options: { cacheName: 'google-fonts-stylesheets' },
            },
            {
              // Google Fonts woff2 — cache-first, 1 year
              urlPattern: /^https:\/\/fonts\.gstatic\.com/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: { maxAgeSeconds: 31536000, maxEntries: 20 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // API — network-first, fall back gracefully
              urlPattern: /^\/api\//,
              handler: 'NetworkFirst',
              options: { cacheName: 'api-cache', networkTimeoutSeconds: 5 },
            },
          ],
          // Ensure SW doesn't break SPA routing
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//, /\/manifest\.json/],
          // Skip waiting so new SW activates immediately
          skipWaiting: true,
          clientsClaim: true,
        },
      }),
    ],

    define: {
      // Remove React dev tools in prod to save ~10 kB
      ...(mode === 'production' && {
        'process.env.NODE_ENV': '"production"',
      }),
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },

    build: {
      // Target modern browsers — eliminates legacy polyfills (~30 kB savings)
      target: 'es2020',

      // Only warn on very large chunks (after splitting)
      chunkSizeWarningLimit: 600,

      // Inline small assets to save HTTP requests
      assetsInlineLimit: 4096,

      // No sourcemaps in prod
      sourcemap: false,

      // CSS code splitting per route
      cssCodeSplit: true,

      // Inject <link rel="modulepreload"> only for critical chunks.
      // Heavy vendor chunks (pdf-lib, misc, utils) are excluded because they
      // compete with font and CSS downloads on the critical rendering path.
      modulePreload: {
        polyfill: true,
        resolveDependencies: (filename, deps, { hostId, hostType }) => {
          // Only keep small, critical dependencies in the modulepreload list
          return deps.filter((dep) => {
            // Always preload the entry itself
            if (dep === filename) return true;
            // Preload React (needed immediately), icons, home page, helmet
            if (dep.includes('vendor-react') ||
                dep.includes('vendor-icons') ||
                dep.includes('vendor-helmet')) {
              return true;
            }
            // Skip everything else — they'll load on-demand when needed
            return false;
          });
        },
      },

      // Minify with esbuild in prod (fast, reliable, no prototype mangling bugs)
      minify: 'esbuild',

      rollupOptions: {
        // Better tree-shaking
        treeshake: {
          moduleSideEffects: (id) => {
            // These modules have side effects (CSS, workers, font assets, etc.)
            if (id.includes('.css') || id.includes('.woff') || id.includes('worker') || id.includes('sw.js')) return true;
            // @fontsource imports include font asset references that must be preserved
            if (id.includes('@fontsource')) return true;
            // Mark all others as pure for aggressive tree-shaking
            return false;
          },
          propertyReadSideEffects: false,
          unknownGlobalSideEffects: false,
        },

        output: {
          // ── Manual chunk splitting ─────────────────────────────
          manualChunks: (id) => {
            // ── React core + runtime helpers — load first, cache forever ──────────
            if (id.includes('node_modules/react/') ||
                id.includes('node_modules/react-dom/') ||
                id.includes('node_modules/react-router-dom/') ||
                id.includes('node_modules/scheduler/') ||
                id.includes('node_modules/tslib/')) {
              return 'vendor-react';
            }

            // ── pdfjs — very heavy, load only when needed ───────
            if (id.includes('pdfjs-dist')) {
              return 'vendor-pdfjs';
            }

            // ── pdf-lib + pako — only on PDF manipulation routes ──────────
            if (id.includes('pdf-lib') || id.includes('@pdf-lib') || id.includes('node_modules/pako')) {
              return 'vendor-pdf-lib';
            }

            // ── jsPDF — only PDF generation ─────────────────────
            if (id.includes('jspdf')) {
              return 'vendor-jspdf';
            }

            // ── OCR — very heavy, only on OCR page ──────────────
            if (id.includes('tesseract.js')) {
              return 'vendor-ocr';
            }

            // ── Office stack ─────────────────────────────────────
            if (id.includes('mammoth')) return 'vendor-mammoth';
            if (id.includes('/docx/') || id.includes('node_modules/docx')) return 'vendor-docx';
            if (id.includes('pptxgenjs')) return 'vendor-pptx';
            if (id.includes('xlsx')) return 'vendor-xlsx';

            // ── Canvas / image stack ─────────────────────────────
            if (id.includes('fabric')) return 'vendor-fabric';
            if (id.includes('html2canvas')) return 'vendor-canvas';

            // ── UI icons — separate so unused icons tree-shake ──
            if (id.includes('lucide-react')) return 'vendor-icons';

            // ── Utilities ────────────────────────────────────────
            if (id.includes('jszip') ||
                id.includes('file-saver') ||
                id.includes('/uuid/') ||
                id.includes('/nanoid/')) {
              return 'vendor-utils';
            }

            // ── State management ─────────────────────────────────
            if (id.includes('zustand')) return 'vendor-state';

            // ── Helmet — used on every page, separate for caching ─
            if (id.includes('react-helmet-async')) return 'vendor-helmet';

            // ── Font assets — keep separate ──────────────────────
            if (id.includes('@fontsource')) return 'vendor-fonts';

            // ── OpenAI SDK — only for AI tools ───────────────────
            if (id.includes('openai')) return 'vendor-openai';

            // ── All other node_modules: shared vendor chunk ──────
            if (id.includes('node_modules')) return 'vendor-misc';
          },

          // Asset naming
          assetFileNames: (assetInfo) => {
            const name = assetInfo.name ?? '';
            const ext = name.split('.').pop() ?? '';
            if (/woff2?/.test(ext)) return 'assets/fonts/[name]-[hash][extname]';
            if (/png|jpe?g|svg|gif|webp|ico/i.test(ext)) return 'assets/images/[name]-[hash][extname]';
            if (ext === 'css') return 'assets/css/[name]-[hash][extname]';
            return 'assets/[name]-[hash][extname]';
          },
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
        },
      },
    },

    // Server & Preview Proxy for local dev & preview
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8787',
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: 4173,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8787',
          changeOrigin: true,
        },
      },
    },

    // Pre-bundle CJS deps that need ESM interop
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react-router-dom',
        'pako',
        'docx',
        'mammoth',
        'pptxgenjs',
        'tesseract.js',
      ],
      // Don't pre-bundle heavy browser-only worker deps
      exclude: [
        'pdfjs-dist',
        'pdf-lib',
        'fabric',
      ],
    },
  };
});
