# LAKPDF — Modern Client-First PDF & Document Intelligence Suite

[![Production](https://img.shields.io/badge/status-production-success.svg)](https://lakpdf.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646cff.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-4.0-38bdf8.svg)](https://tailwindcss.com/)

[LAKPDF](https://lakpdf.com) is a high-performance, private-by-design PDF and document utility platform. All core PDF, image, and document operations run 100% client-side in the browser using WebAssembly and Web Workers—files never leave the user's device unless explicitly sent to AI features.

---

## 📑 Table of Contents
- [Architecture & Core Principles](#architecture--core-principles)
- [Feature Suite (35+ Tools)](#feature-suite-35-tools)
- [Directory Structure](#directory-structure)
- [Tech Stack](#tech-stack)
- [Environment Configuration](#environment-configuration)
- [Local Development](#local-development)
- [Production Deployment](#production-deployment)
- [Testing & Quality Assurance](#testing--quality-assurance)

---

## 🏛️ Architecture & Core Principles

1. **Zero-Upload Privacy First**: All file splitting, merging, rotating, watermarking, redacting, converting, and compressing are executed client-side via `pdf-lib`, `pdfjs-dist`, and HTML5 Canvas.
2. **Sub-second Navigation & Lazy Loading**: Every page and heavy utility is asynchronously chunked via `React.lazy()` and `safeImport()` with a bulletproof scroll restoration engine.
3. **Robust Backend API**: An Express.js microservice (`/server`) provides:
   - User authentication (JWT with HTTP-only cookies, Google OAuth, password reset).
   - High-throughput AI Document Intelligence with concurrency queues and rate limiting (OpenRouter, Groq, DeepInfra, Gemini).
   - Comprehensive Admin Portal & Telemetry (Core Web Vitals, active sessions, tool metrics).
4. **Mobile First PWA**: Service Worker caching, offline fallback (`/offline`), responsive layouts, and installable PWA manifest.

---

## 🛠️ Feature Suite (35+ Tools)

### 1. Core PDF Utilities
- **Merge PDF** (`/merge`): Combine multiple PDFs in custom order with drag-and-drop.
- **Split PDF** (`/split`): Extract specific pages or split into distinct documents.
- **Compress PDF** (`/compress`, `/compress-pdf`): Multi-tier compression with preset limits (100KB, 200KB, 500KB).
- **Organize & Delete Pages** (`/organize-pdf`, `/delete-page`): Visual page sorter and page remover.
- **Rotate PDF** (`/rotate`): Fix landscape/portrait orientations.
- **Crop PDF** (`/crop-pdf`): Trim unwanted margins with interactive bounding boxes.
- **Page Numbers** (`/page-number`): Insert custom numbering formats, positions, and fonts.
- **Watermark PDF** (`/watermark`): Protect documents with custom text or image watermarks.
- **Compare PDF** (`/compare-pdf`): Visual side-by-side diffing between two documents.
- **Detect Duplicate Pages** (`/detect-duplicates`): Identify identical or repetitive pages automatically.

### 2. Sarkari & Government Exam Utilities (FormDocFixer)
- **FormDocFixer / Govt Exam Resizer** (`/govt-exam-resizer`):
  - Pre-configured specifications for SSC CGL/CHSL, UPSC OTR, IBPS, SBI PO, NEET, RRB, and State PSCs.
  - Photo Resizer (exact 20–50KB JPEG output, 350x450px).
  - Signature Resizer (exact 10–20KB output).
  - Integrated Date & Name Stamper (complying with NTA/SSC rules).
  - Biometric face centering and background cleanup.
- **Passport Photo Maker** (`/passport-photo-maker`): Biometric face guidelines, 3.5x4.5cm cropping, and printable 4x6 & A4 sheets.

### 3. Document Security & Redaction
- **Redact PDF** (`/redact-pdf`): True irreversible pixel-level sanitization for Aadhaar, PAN, bank details, and signatures.
- **Protect PDF** (`/protect-pdf`): Encrypt PDFs with bank-grade passwords and access restrictions.
- **Unlock PDF** (`/unlock-pdf`): Remove passwords and permissions from owned PDF files.

### 4. Conversion & Office Suite
- **Image to PDF** (`/img-to-pdf`): Convert JPG, PNG, WEBP into multi-page PDFs.
- **PDF to Image** (`/pdf-to-img`): High-resolution PNG/JPG extraction from PDF pages.
- **Make PPT / Image to PowerPoint** (`/make-ppt`): Convert images into formatted 16:9 or 4:3 PPTX slides with auto-fit.
- **PDF to Word** (`/pdf-to-word`) & **Word to PDF** (`/word-to-pdf`).
- **PDF to PowerPoint** (`/pdf-to-powerpoint`) & **PowerPoint to PDF** (`/powerpoint-to-pdf`).
- **OCR & PDF to Text** (`/pdf-to-text`, `/ocr-pdf`): Extract selectable text using OCR.

### 5. AI Document Intelligence Suite
- **PDF Summarizer & QA** (`/summarizer-qa`): Interactive chat with documents and executive summaries.
- **AI PDF to MCQ Generator** (`/ai-pdf-to-mcq`): Generate practice tests, quizzes, and revision flashcards.
- **AI Interview Question Generator** (`/ai-interview-generator`): Extract technical, HR, and behavioral interview questions from resumes.

### 6. Administration & Governance
- **Admin Dashboard** (`/admin/dashboard`): User management, tool telemetry, system configuration, audit logs, and performance vitals.

---

## 📁 Directory Structure

```
lakpdf/
├── admin/                  # Admin portal layouts, dashboards, telemetry & user management
├── components/             # Reusable UI & infrastructure components
│   ├── ErrorBoundary.tsx   # React error boundary wrapping every route
│   ├── GlobalErrorHandler.tsx # Window error, chunk retry & ad error suppressor
│   ├── Layout.tsx          # Responsive navigation, header, drawer & footer
│   ├── PageLoader.tsx      # Suspense fallback with graceful timeout
│   ├── RouteAnalyticsTracker.tsx # Page view and drop-off analytics
│   ├── RouteSeoManager.tsx # Dynamic document title, meta tags & JSON-LD
│   ├── ScrollToTop.tsx     # Non-blocking scroll coordinate restoration
│   └── ...                 # UI widgets (FileUploader, DarkModeToggle, Modals)
├── config/                 # Application configuration & SEO manifests
│   ├── adsense.ts          # Google AdSense ad slot configuration
│   ├── seoRoutes.ts        # Route titles, descriptions & JSON-LD schema
│   └── toolSEOData.ts      # Comprehensive SEO knowledge data
├── constants/              # Centralized immutable constants
│   ├── apiEndpoints.ts     # Backend API route mapping
│   ├── fileLimits.ts       # File size limits & govt exam specs
│   ├── routes.ts           # Centralized application routes
│   └── index.ts            # Barrel exports
├── hooks/                  # Custom React hooks (auth, i18n, online status, storage)
├── pages/                  # Routed tool and informational pages
├── public/                 # Static assets, PWA manifest, service worker
├── server/                 # Express.js backend API
│   ├── aiQueue.js          # Asynchronous bounded task queue for AI
│   ├── aiService.js        # Multi-provider AI interface (OpenRouter, Groq, DeepInfra)
│   ├── authStore.js        # MongoDB user store & session handling
│   ├── cluster.js          # Multi-process production cluster manager
│   └── index.js            # Express server route definitions & middleware
├── services/               # Client-side business logic & processing services
│   ├── authService.ts      # Client auth client with refresh token interceptors
│   ├── govtExamService.ts  # Image compression, cropping & stamping algorithms
│   ├── pdfService.ts       # Core pdf-lib operations
│   └── redactService.ts    # Canvas-based true pixel redaction
├── tests/                  # Playwright end-to-end test suites
├── utils/                  # Pure utility functions (analytics, formatters, sanitizers)
├── App.tsx                 # Root application router & lazy route definitions
├── index.html              # HTML5 entry point with resource hints & PWA meta
├── package.json            # Node.js dependencies and script commands
└── vite.config.ts          # Vite build, compression & proxy configuration
```

---

## 💻 Tech Stack

- **Frontend**: React 19, TypeScript 5.8, Tailwind CSS 4.0, Vite 6.2, React Router 7.
- **Client Processing**: `pdf-lib`, `pdfjs-dist`, `tesseract.js`, `pptxgenjs`, HTML5 Canvas.
- **Backend Server**: Node.js, Express 4, MongoDB (Mongoose), JWT, Cookie-Parser, CORS.
- **AI Integrations**: OpenRouter, Groq, DeepInfra, Google Gemini.
- **Testing**: Playwright End-to-End Suite.

---

## ⚙️ Environment Configuration

Copy the template configuration file:
```bash
cp .env.example .env
```

Review `.env.example` to configure:
- `VITE_API_BASE_URL`: Backend API endpoint (defaults to proxy in local dev).
- `MONGODB_URI`: MongoDB connection string.
- `JWT_SECRET`: Secret key for session tokens.
- `OPENROUTER_API_KEY` / `GROQ_API_KEY`: API keys for document AI features.

---

## 🚀 Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Both Frontend and Backend Concurrently
```bash
npm run dev:full
```
- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:8787`

Or run them individually in separate terminals:
```bash
# Frontend only
npm run dev

# Backend API server only
npm run dev:server
```

---

## 📦 Production Deployment

### 1. Type Check & Build
```bash
npm run type-check
npm run build
```

### 2. Validate Production Environment
```bash
npm run check:env:prod
```

### 3. Run Production Server (Cluster Mode)
```bash
npm run start:prod
```

---

## 🧪 Testing & Quality Assurance

Run type safety verification:
```bash
npm run type-check
```

Run Playwright end-to-end tests:
```bash
# Run all tests
npm test

# Run FormDocFixer (Govt Exam Resizer) specific tests
npx playwright test tests/form-doc-fixer-e2e.spec.ts

# Run cross-browser blank-page tests
npx playwright test tests/cross-browser-blank-page.spec.ts
```

---

## 📄 License
This project is licensed under the MIT License.
