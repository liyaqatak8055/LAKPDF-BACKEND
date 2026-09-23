import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  Heart,
  ChevronRight,
  X,
  LogOut,
  User as UserIcon,
  ChevronDown,
  Activity,
  Settings,
  KeyRound,
  Star,
  ArrowLeft,
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { Button } from './Button';
import { DarkModeToggle } from './DarkModeToggle';
const AuthModal = React.lazy(() => import('./AuthModal').then(m => ({ default: m.AuthModal })));
import { authService, User } from '../services/authService';
import { UsageCounter } from './UsageCounter';
import { useOnlineStatus } from '../hooks/useHooks';
import { isToolRoute } from '../utils/toolUsage';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = React.useState(false);
  const profileMenuRef = React.useRef<HTMLDivElement | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const siteUrl = 'https://lakpdf.com';
  const canonicalUrl = `${siteUrl}${location.pathname}`;
  const toolSeoMap: Record<string, { title: string; description: string }> = {
    '/merge': { title: 'Merge PDF Online Free | LAK PDF', description: 'Combine multiple PDF files into one document quickly and securely.' },
    '/split': { title: 'Split PDF Online Free | LAK PDF', description: 'Extract pages and split PDF into smaller files in seconds.' },
    '/compress': { title: 'Compress PDF Online Free | LAK PDF', description: 'Reduce PDF file size while keeping readable quality.' },
    '/organize-pdf': { title: 'Organize PDF Pages | LAK PDF', description: 'Reorder and manage PDF pages online in a simple workflow.' },
    '/img-to-pdf': { title: 'Image to PDF Converter | LAK PDF', description: 'Convert JPG and PNG images into PDF documents instantly.' },
    '/pdf-to-img': { title: 'PDF to Image Converter | LAK PDF', description: 'Convert PDF pages to high-quality image files online.' },
    '/compress-img': { title: 'Compress Image Online Free | LAK PDF', description: 'Reduce JPG and PNG image size quickly while preserving visual quality.' },
    '/advance-compress-img': { title: 'Compress Image to 50KB | LAK PDF', description: 'Compress photos and images close to 50KB for forms, exams, and uploads.' },
    '/make-ppt': { title: 'Make PPT - Images to PowerPoint | LAK PDF', description: 'Convert photos and images into professional PowerPoint presentations (.pptx) with smart aspect ratio auto-fit.' },
    '/img-to-ppt': { title: 'Image to PowerPoint Converter | LAK PDF', description: 'Turn JPG, PNG and photos into neatly formatted PowerPoint slides (.pptx).' },
    '/passport-photo-maker': { title: 'Passport Size Photo Maker | LAK PDF', description: 'Create official passport size photos online free. Auto-align face, change background, 4x6 & A4 print sheets, and 20-50KB form mode.' },
    '/passport-photo': { title: 'Passport Photo Maker Free | LAK PDF', description: 'Free passport size photo maker with biometric face guides and printable sheets.' },
    '/redact-pdf': { title: 'Redact PDF Online Free | LAK PDF', description: 'Permanently blackout and erase sensitive info from PDF files with true pixel sanitization.' },
    '/blackout-pdf': { title: 'Blackout PDF Online | LAK PDF', description: 'Permanently black out text and confidential data in PDF documents.' },
    '/convert': { title: 'Convert PDF Online | LAK PDF', description: 'Convert PDF documents into popular editable or shareable formats.' },
    '/pdf-to-word': { title: 'PDF to Word Online | LAK PDF', description: 'Convert PDF files to editable Word documents quickly.' },
    '/pdf-to-powerpoint': { title: 'PDF to PowerPoint Online | LAK PDF', description: 'Turn PDF pages into editable PowerPoint slides in a few steps.' },
    '/word-to-pdf': { title: 'Word to PDF Online | LAK PDF', description: 'Convert DOC and DOCX files to clean PDF format instantly.' },
    '/powerpoint-to-pdf': { title: 'PowerPoint to PDF Online | LAK PDF', description: 'Convert PPT and PPTX files into share-ready PDF documents.' },
    '/rotate': { title: 'Rotate PDF Pages Online | LAK PDF', description: 'Rotate PDF pages and fix orientation issues in seconds.' },
    '/page-number': { title: 'Add Page Numbers to PDF | LAK PDF', description: 'Insert page numbers into your PDF with easy position settings.' },
    '/watermark': { title: 'Watermark PDF Online | LAK PDF', description: 'Add text or image watermark to protect and brand PDF files.' },
    '/crop-pdf': { title: 'Crop PDF Online Free | LAK PDF', description: 'Crop PDF margins and remove unwanted white space with precision.' },
    '/scan-pdf': { title: 'Scan Document Online | LAK PDF', description: 'Convert scanned pages and photos into usable PDF documents.' },
    '/sign-pdf': { title: 'Sign PDF Online Free | LAK PDF', description: 'Add digital signatures to PDF files without complex setup.' },
    '/ocr-pdf': { title: 'OCR PDF Online | LAK PDF', description: 'Extract selectable text from scanned PDFs using OCR.' },
    '/compare-pdf': { title: 'Compare PDF Online | LAK PDF', description: 'Compare two PDF files and highlight differences quickly.' },
    '/delete-page': { title: 'Delete PDF Pages Online | LAK PDF', description: 'Remove unwanted pages from PDF documents in one click.' },
    '/detect-duplicates': { title: 'Detect Duplicate PDF Pages | LAK PDF', description: 'Find duplicate pages in PDF and clean file structure faster.' },
    '/summarizer-qa': { title: 'AI Summary | LAK PDF', description: 'Generate concise summaries and main topics from your document.' },
    '/ai-pdf-to-mcq': { title: 'AI PDF to MCQ Generator | LAK PDF', description: 'Create exam-style MCQs from PDF notes with answer keys and test mode.' },
    '/ai-interview-generator': { title: 'AI Interview Generator | LAK PDF', description: 'Generate technical and HR interview questions from resume or notes.' },
    '/pdf-editor': { title: 'PDF Editor Online | LAK PDF', description: 'Use normal PDF editor mode to add text, highlights, and shapes directly in your PDF.' },
    '/protect-pdf': { title: 'Protect PDF Online Free | LAK PDF', description: 'Password protect PDF documents with bank-grade encryption in your browser.' },
    '/unlock-pdf': { title: 'Unlock PDF Online Free | LAK PDF', description: 'Remove password and restrictions from PDF files instantly.' },
    '/unlock': { title: 'Unlock PDF Online Free | LAK PDF', description: 'Remove password and restrictions from PDF files instantly.' },
    '/pdf-to-text': { title: 'PDF to Text OCR Converter | LAK PDF', description: 'Extract clean selectable text and OCR from scanned PDF documents online.' },
    '/ai-edit-pdf': { title: 'AI PDF Editor Online | LAK PDF', description: 'Edit text, annotate, erase, and highlight PDFs directly with AI-powered OCR.' },
  };
  const seo = toolSeoMap[location.pathname];
  const showToolBack = isToolRoute(location.pathname) && location.pathname !== '/pdf-editor';
  const toolFaqSchema = seo
    ? {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: `How do I use ${seo.title.replace(' | LAK PDF', '')}?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Open the tool, upload your file, apply settings, and download the processed output.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is this tool free to use?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes, this tool is available on LAK PDF for online document processing workflows.',
          },
        },
      ],
    }
    : null;

  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  useEffect(() => {
    // Check for existing session on mount
    let cancelled = false;
    const hydrateAuth = async () => {
      const currentUser = authService.getCurrentUser();
      if (currentUser && !cancelled) {
        setUser(currentUser);
      }
      const freshUser = await authService.fetchCurrentUser();
      if (!cancelled) {
        setUser(freshUser);
      }
    };
    hydrateAuth();
    const eventName = authService.getAuthChangeEventName();
    const syncAuth = () => setUser(authService.getCurrentUser());
    window.addEventListener(eventName, syncAuth as EventListener);
    return () => {
      cancelled = true;
      window.removeEventListener(eventName, syncAuth as EventListener);
    };
  }, []);

  const openAuth = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
    setIsMobileMenuOpen(false);
    setIsProfileMenuOpen(false);
  };

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!profileMenuRef.current) return;
      if (!profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsProfileMenuOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileMenuOpen]);

  const navLinks = [
    { label: 'All Tools', path: '/tools' },
    { label: 'Learn', path: '/learn-pdf' },
    { label: 'Merge PDF', path: '/merge' },
    { label: 'Split PDF', path: '/split' },
    { label: 'Compress PDF', path: '/compress' },
    { label: 'Convert PDF', path: '/convert' },
  ];

  const handleToolBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/tools');
  };

  // Dedicated Admin layout bypasses consumer header/footer
  if (location.pathname.startsWith('/admin')) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f6f7f9] dark:bg-dark-bg">
      <Helmet>
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:url" content={canonicalUrl} />
        {seo && <title>{seo.title}</title>}
        {seo && <meta name="description" content={seo.description} />}
        {seo && <meta property="og:title" content={seo.title} />}
        {seo && <meta property="og:description" content={seo.description} />}
        {toolFaqSchema && <script type="application/ld+json">{JSON.stringify(toolFaqSchema)}</script>}
      </Helmet>
      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-amber-500 text-white text-center py-2 px-4 text-sm font-medium">
          <span>You are offline. Some features may be limited.</span>
        </div>
      )}

      <header className="sticky top-0 z-50 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-md border-b border-slate-200 dark:border-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-[68px]">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 sm:gap-2.5 group select-none py-1">
              <picture>
                <source srcSet="/logo-80x80.webp" type="image/webp" />
                <img
                  src="/logo-80x80.png"
                  alt="LAK PDF Logo"
                  width={38}
                  height={38}
                  decoding="async"
                  className="w-[38px] h-[38px] sm:w-[42px] sm:h-[42px] object-contain group-hover:animate-heartbeat transition-transform duration-300 group-hover:scale-105 drop-shadow-xs"
                />
              </picture>
              <span
                className="text-[1.75rem] sm:text-[2.05rem] md:text-[2.25rem] tracking-tight leading-none text-slate-900 dark:text-white flex items-center gap-1 sm:gap-1.5 font-black"
                style={{ fontFamily: '"Roboto Slab", Georgia, serif', fontWeight: 900 }}
              >
                <span className="font-black">LAK</span>
                <span className="text-primary-600 dark:text-primary-400 font-black">PDF</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-0.5 sm:gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${location.pathname === link.path
                    ? 'text-slate-900 bg-slate-100 dark:text-dark-text-primary dark:bg-dark-hover'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-dark-text-secondary dark:hover:text-dark-text-primary dark:hover:bg-dark-hover'
                    }`}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                to="/dashboard"
                className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${location.pathname === '/dashboard'
                  ? 'text-slate-900 bg-slate-100 dark:text-dark-text-primary dark:bg-dark-hover'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-dark-text-secondary dark:hover:text-dark-text-primary dark:hover:bg-dark-hover'
                  }`}
              >
                Dashboard
              </Link>
            </nav>

            {/* Actions */}
            <div className="hidden md:flex items-center gap-3">
              <DarkModeToggle />
              {user ? (
                <div className="relative" ref={profileMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-dark-surface rounded-full border border-slate-200 dark:border-dark-border hover:bg-slate-100 transition-colors"
                  >
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-7 h-7 rounded-full object-cover ring-2 ring-primary-200"
                      />
                    ) : (
                      <div className="w-7 h-7 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center text-primary-500 dark:text-primary-400">
                        <UserIcon className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <span className="text-sm font-medium text-slate-700 dark:text-dark-text-primary">{user.name}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isProfileMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="px-3 py-2 border-b border-slate-100 mb-1">
                        <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      </div>
                      <Link
                        to="/profile"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <UserIcon className="w-4 h-4" /> My Profile
                      </Link>
                      <Link
                        to="/dashboard#activity"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <Activity className="w-4 h-4" /> My Activity
                      </Link>
                      <Link
                        to="/dashboard#favorites"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <Star className="w-4 h-4" /> Favorites
                      </Link>
                      <Link
                        to="/profile#settings"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <Settings className="w-4 h-4" /> Settings
                      </Link>
                      <Link
                        to="/profile#security"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <KeyRound className="w-4 h-4" /> Change Password
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="w-4 h-4" /> Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={() => openAuth('login')}>Log in</Button>
                  <Button variant="primary" size="sm" onClick={() => openAuth('signup')}>Sign up</Button>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 text-slate-700 dark:text-slate-200 hover:text-slate-900 rounded-lg focus:outline-none transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full max-h-[calc(100vh-4rem)] overflow-y-auto overscroll-contain bg-white dark:bg-dark-surface border-b border-slate-200 dark:border-dark-border p-4 pb-8 flex flex-col gap-2 shadow-xl animate-in slide-in-from-top-2 duration-200 z-40">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="px-4 py-3 rounded-lg text-slate-700 hover:bg-slate-50 font-medium flex justify-between items-center"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
            ))}
            <Link
              to="/dashboard"
              className="px-4 py-3 rounded-lg text-slate-700 hover:bg-slate-50 font-medium flex justify-between items-center"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Dashboard
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>
            <div className="h-px bg-slate-100 my-2"></div>

            {user ? (
              <div className="space-y-3">
                <div className="px-4 py-2 flex items-center gap-3">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover ring-2 ring-primary-200" />
                  ) : (
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-500">
                      <UserIcon className="w-4 h-4" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-bold text-slate-900">{user.name}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/profile"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="px-3 py-2 rounded-lg bg-slate-50 text-slate-700 text-sm font-medium text-center"
                  >
                    My Profile
                  </Link>
                  <Link
                    to="/dashboard#activity"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="px-3 py-2 rounded-lg bg-slate-50 text-slate-700 text-sm font-medium text-center"
                  >
                    Activity
                  </Link>
                </div>
                <Button variant="danger" className="w-full justify-start px-4" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" /> Log Out
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Button variant="secondary" className="w-full" onClick={() => openAuth('login')}>Log in</Button>
                <Button variant="primary" className="w-full" onClick={() => openAuth('signup')}>Sign up</Button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Authentication Modal */}
      {isAuthModalOpen && (
        <React.Suspense fallback={null}>
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setAuthModalOpen(false)}
            initialMode={authMode}
            onLoginSuccess={(u) => setUser(u)}
          />
        </React.Suspense>
      )}

      {showToolBack && (
        <div className="w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <button
              type="button"
              onClick={handleToolBack}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>
        </div>
      )}

      <main className="tool-shell flex-grow overflow-x-hidden">
        {children}
      </main>


      {/* Usage Counter */}
      <UsageCounter />

      <footer className="bg-slate-900 dark:bg-slate-950 text-slate-300 py-14 border-t border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <picture>
                  <source srcSet="/logo-80x80.webp" type="image/webp" />
                  <img
                    src="/logo-80x80.png"
                    alt="LAK PDF Logo"
                    width={36}
                    height={36}
                    loading="lazy"
                    decoding="async"
                    className="w-9 h-9 object-contain animate-heartbeat transition-transform hover:scale-110"
                  />
                </picture>
                <span className="font-extrabold text-lg text-white tracking-tight">LAK PDF</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                Free, privacy-first online PDF tools. Merge, compress, convert, sign, and manage documents securely in your browser.
              </p>
              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>100% Client-Side Privacy</span>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-200 mb-4">Popular Tools</h4>
              <ul className="space-y-2.5 text-sm text-slate-400">
                <li><Link to="/redact-pdf" className="text-rose-400 font-semibold hover:text-white transition-colors flex items-center gap-1.5"><span>Redact PDF</span><span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-500/20 text-rose-300 font-bold">NEW</span></Link></li>
                <li><Link to="/passport-photo-maker" className="text-blue-400 font-semibold hover:text-white transition-colors flex items-center gap-1.5"><span>Passport Photo Maker</span><span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-500/20 text-blue-300 font-bold">NEW</span></Link></li>
                <li><Link to="/make-ppt" className="text-orange-400 font-semibold hover:text-white transition-colors flex items-center gap-1.5"><span>Make PPT from Images</span><span className="px-1.5 py-0.2 rounded text-[10px] bg-orange-500/20 text-orange-300 font-bold">NEW</span></Link></li>
                <li><Link to="/merge" className="hover:text-white transition-colors">Merge PDF</Link></li>
                <li><Link to="/split" className="hover:text-white transition-colors">Split PDF</Link></li>
                <li><Link to="/compress" className="hover:text-white transition-colors">Compress PDF</Link></li>
                <li><Link to="/advance-compress-img" className="hover:text-white transition-colors">Compress Image to 50KB</Link></li>
                <li><Link to="/pdf-to-word" className="hover:text-white transition-colors">PDF to Word</Link></li>
                <li><Link to="/sign-pdf" className="hover:text-white transition-colors">Sign PDF Online</Link></li>
                <li><Link to="/pdf-editor" className="hover:text-white transition-colors">PDF Editor</Link></li>
                <li><Link to="/tools" className="hover:text-primary-400 font-semibold transition-colors">View All 30+ Tools →</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-200 mb-4">Company & Legal</h4>
              <ul className="space-y-2.5 text-sm text-slate-400">
                <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link to="/contact" className="hover:text-white transition-colors">Contact Support</Link></li>
                <li><Link to="/learn-pdf" className="hover:text-white transition-colors">Learn PDF</Link></li>
                <li><Link to="/blog" className="hover:text-white transition-colors">Blog & Guides</Link></li>
                <li><Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link to="/disclaimer" className="hover:text-white transition-colors">Disclaimer</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-200 mb-4">Key Features</h4>
              <ul className="space-y-2.5 text-sm text-slate-400">
                <li className="flex items-center gap-2 text-slate-300">
                  <span className="text-primary-400 font-bold">✓</span> 100% Free • No Signup Required
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <span className="text-primary-400 font-bold">✓</span> Zero Server File Storage
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <span className="text-primary-400 font-bold">✓</span> Ultra-Fast WebAssembly Engine
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <span className="text-primary-400 font-bold">✓</span> Mobile & Tablet Responsive
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <span className="text-primary-400 font-bold">✓</span> Bank-Grade Browser Encryption
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <p>© {new Date().getFullYear()} LAK PDF. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy</Link>
              <Link to="/terms-of-service" className="hover:text-white transition-colors">Terms</Link>
              <Link to="/contact" className="hover:text-white transition-colors">Support</Link>
              <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Sitemap</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
