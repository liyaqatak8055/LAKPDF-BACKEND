# LAK PDF - Free Online PDF Tools

A comprehensive suite of PDF utilities built with React, TypeScript, and Tailwind CSS. Features client-side processing for maximum privacy and speed.

## 🚀 Performance Features

### Ultra Fast Experience
- **Client-side JavaScript Tools**: All PDF operations happen in the browser - no server uploads required
- **Lazy Loading**: Pages are loaded on-demand using React.lazy() and Suspense
- **Web Workers Ready**: Heavy operations can be offloaded to web workers for better performance
- **Skeleton Loaders**: Beautiful loading states with shimmer animations for better UX

### Code Implementation
```tsx
// Lazy loading example
const Home = lazy(() => import("./pages/Home").then((m) => ({ default: m.Home })));

// Skeleton component
export const ToolCardSkeleton: React.FC = () => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200">
    <Skeleton variant="circular" width={48} height={48} />
    <Skeleton width="70%" height={24} className="mb-3" />
    {/* ... */}
  </div>
);
```

## 📱 Mobile First + PWA

### Features
- **Bottom Navigation Toolbar**: Mobile-optimized bottom nav with dropdown for tools
- **Add to Home Screen**: PWA manifest for installable app experience
- **Offline Support**: Service worker caches static assets for offline usage
- **Mobile Responsive**: Tailwind CSS with mobile-first breakpoints

### PWA Manifest (`public/manifest.json`)
- Standalone display mode
- App shortcuts for quick access to popular tools
- Theme colors and icons
- Splash screen configuration

### Service Worker (`public/sw.js`)
- Caches static assets on install
- Offline fallback page
- Background sync ready
- Push notification support (future)

## 🧠 AI Features (Future Ready)

Structure prepared for:
- AI PDF Summary
- PDF to Questions Generator
- Resume Analyzer
- Invoice Reader

## 📊 User Dashboard

### Features
- **Recent Files**: Track processing history with localStorage
- **Favorites**: Star your most-used tools
- **Statistics**: Tools used, files processed, last active
- **Activity Chart**: Visual breakdown of tool usage

### Implementation
```tsx
// File history hook
export const useFileHistory = () => {
  const [history, setHistory] = useLocalStorage<HistoryItem[]>('lakpdf_file_history', []);
  const addToHistory = useCallback((file) => {
    setHistory(prev => [newEntry, ...prev.slice(0, 49)]);
  }, []);
  return { history, addToHistory };
};
```

## 🌍 Multilingual Support (i18n)

### Supported Languages
- 🇺🇸 English (Default)
- 🇮🇳 Hindi
- 🇮🇳 Hinglish (Roman Hindi)

### Implementation
```ts
// hooks/useI18n.ts
export const translations: Translations = {
  'nav.home': { en: 'Home', hi: 'Home', hinglish: 'Home' },
  'action.selectFiles': { en: 'Select Files', hi: 'Select Files', hinglish: 'Select Files' },
  // ... more translations
};
```

## 📝 Blog + Tool Combo

### SEO Strategy
- Blog page at `/blog`
- Internal linking from blog posts to tools
- Hindi/Hinglish content for Indian audience
- SEO-optimized meta tags

### Example Blog Posts
- "PDF Size Kaise Kam Kare (Free)"
- "Online PDF Merge Best Tool"
- "PDF Password Remove Ka Tarika"

## 📈 Conversion Boost Features

### User Trust Elements
- **Usage Counter**: Shows "15K+ users" badge
- **Rating System**: Feedback widget after tool usage
- **No Watermark Badge**: Prominently displayed
- **Speed Claims**: "Lightning Fast", "100% Secure"

### Implementation
```tsx
export const UsageCounter: React.FC = () => {
  const [count, setCount] = useState(15000);
  // Grows over time to show popularity
};
```

## 🎨 UI/UX Features

### Visual Effects
- **Glassmorphism Cards**: Semi-transparent cards with blur
- **Drag & Drop**: Animated file upload zones
- **Gradient Buttons**: Primary gradient buttons
- **Micro-animations**: Hover effects, transitions
- **Shimmer Loading**: Animated skeleton screens

### Components Created
- `BottomNav.tsx` - Mobile bottom navigation
- `Skeleton.tsx` - Loading skeletons
- `FeedbackWidget.tsx` - Rating/feedback system
- `UsageCounter.tsx` - User count badge
- `FileUploader.tsx` - Drag & drop file upload

## 📁 Project Structure

```
lak-pdf/
├── components/
│   ├── BottomNav.tsx       # Mobile bottom navigation
│   ├── FileUploader.tsx    # Drag & drop uploader
│   ├── FeedbackWidget.tsx  # Rating system
│   ├── Layout.tsx          # Main layout with header/footer
│   ├── Skeleton.tsx        # Loading skeletons
│   └── UsageCounter.tsx    # User count badge
├── hooks/
│   ├── useHooks.ts         # Custom hooks (useOnlineStatus, etc.)
│   └── useI18n.ts          # Internationalization
├── pages/
│   ├── Blog.tsx            # SEO blog page
│   ├── Dashboard.tsx       # User dashboard
│   ├── Home.tsx            # Homepage with tool grid
│   └── Offline.tsx         # Offline fallback page
├── public/
│   ├── manifest.json       # PWA manifest
│   └── sw.js               # Service worker
├── App.tsx                 # Main app with routes
├── index.css               # Global styles & animations
└── index.html              # Entry point with PWA meta tags
```

## 🔧 Technical Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **Vite** - Fast build tool
- **React Router v7** - Client-side routing
- **React Helmet Async** - SEO meta tags
- **pdf-lib** - PDF manipulation
- **localStorage** - Data persistence

## 📱 Mobile Features

### Bottom Navigation
```tsx
const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/merge', icon: FilePlus, label: 'Tools' },
  { path: '/history', icon: History, label: 'History' },
  { path: '/profile', icon: User, label: 'Profile' },
];
```

### Safe Area Insets
- Proper padding for notched phones
- Keyboard-aware scrolling
- Touch-friendly target sizes (44px+)

## 🔐 Security Features

- **Client-side processing**: Files never leave the browser
- **No cookies**: Minimal tracking
- **HTTPS ready**: Works with SSL certificates
- **No watermark**: Free tools are truly free

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🏭 Production Environment Setup

1. Create production env file:
```bash
cp .env.production.example .env.production
```

2. Fill required keys in `.env.production`:
- `OPENROUTER_API_KEY`
- `ALLOWED_ORIGINS` (must include your frontend domains)

3. Validate env before deploy:
```bash
npm run check:env:prod
```

4. Build frontend bundle:
```bash
npm run build
```

5. Start production API server:
```bash
npm run start:prod
```

Notes:
- In production, server now fails fast if required env vars are missing.
- CORS is strict in production and blocks unknown origins by default.
- API server runs in cluster mode by default (`server/cluster.js`).
- AI endpoints are protected with bounded queue + concurrency controls.

Optional tuning vars:
- `WEB_CONCURRENCY` (cluster workers, default up to 4 based on CPU)
- `AI_MAX_CONCURRENT_REQUESTS` (per-process active AI calls)
- `AI_MAX_QUEUE_SIZE` (queued AI requests)
- `AI_TASK_TIMEOUT_MS` (queue task timeout)

## 📈 SEO Optimization

- Meta descriptions for all pages
- Open Graph tags for social sharing
- Canonical URLs
- Semantic HTML structure
- Fast page load times (Core Web Vitals)
- Mobile-friendly responsive design
- Hindi content for Indian market

## 🎯 Future Enhancements

- AI-powered PDF summarization
- Document scanner app integration
- Team collaboration features
- API for developers
- Browser extensions
- Mobile apps (iOS/Android)

## 📄 License

MIT License - Free for personal and commercial use.

---

Built with ❤️ for the Indian market
