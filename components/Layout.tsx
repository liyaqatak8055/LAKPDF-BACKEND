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
import { AuthModal } from './AuthModal';
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
    '/convert': { title: 'Convert PDF Online | LAK PDF', description: 'Convert PDF documents into popular editable or shareable formats.' },
    '/pdf-to-word': { title: 'PDF to Word Online | LAK PDF', description: 'Convert PDF files to editable Word documents quickly.' },
    '/pdf-to-powerpoint': { title: 'PDF to PowerPoint Online | LAK PDF', description: 'Turn PDF pages into editable PowerPoint slides in a few steps.' },
    '/word-to-pdf': { title: 'Word to PDF Online | LAK PDF', description: 'Convert DOC and DOCX files to clean PDF format instantly.' },
    '/powerpoint-to-pdf': { title: 'PowerPoint to PDF Online | LAK PDF', description: 'Convert PPT and PPTX files into share-ready PDF documents.' },
    '/rotate': { title: 'Rotate PDF Pages Online | LAK PDF', description: 'Rotate PDF pages and fix orientation issues in seconds.' },
    '/page-number': { title: 'Add Page Numbers to PDF | LAK PDF', description: 'Insert page numbers into your PDF with easy position settings.' },
    '/watermark': { title: 'Watermark PDF Online | LAK PDF', description: 'Add text or image watermark to protect and brand PDF files.' },
    '/crop-pdf': { title: 'Crop PDF Online Free | LAK PDF', description: 'Crop PDF margins and remove unwanted white space with precision.' },
    '/scan-pdf': { title: 'Scan to PDF Online | LAK PDF', description: 'Convert scanned pages and photos into usable PDF documents.' },
    '/sign-pdf': { title: 'Sign PDF Online Free | LAK PDF', description: 'Add digital signatures to PDF files without complex setup.' },
    '/ocr-pdf': { title: 'OCR PDF Online | LAK PDF', description: 'Extract selectable text from scanned PDFs using OCR.' },
    '/compare-pdf': { title: 'Compare PDF Online | LAK PDF', description: 'Compare two PDF files and highlight differences quickly.' },
    '/delete-page': { title: 'Delete PDF Pages Online | LAK PDF', description: 'Remove unwanted pages from PDF documents in one click.' },
    '/detect-duplicates': { title: 'Detect Duplicate PDF Pages | LAK PDF', description: 'Find duplicate pages in PDF and clean file structure faster.' },
    '/summarizer-qa': { title: 'AI PDF Summarizer & Q&A | LAK PDF', description: 'Generate concise summaries and ask questions from your PDF content.' },
    '/ai-pdf-to-mcq': { title: 'AI PDF to MCQ Generator | LAK PDF', description: 'Create exam-style MCQs from PDF notes with answer keys and test mode.' },
    '/ai-interview-generator': { title: 'AI Interview Generator | LAK PDF', description: 'Generate technical and HR interview questions from resume or notes.' },
    '/pdf-editor': { title: 'PDF Editor Online | LAK PDF', description: 'Use normal PDF editor mode to add text, highlights, and shapes directly in your PDF.' },
  };
  const seo = toolSeoMap[location.pathname];
  const showToolBack = isToolRoute(location.pathname);
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
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-[#ff8a80] flex items-center justify-center text-white shadow-lg shadow-primary-400/20 transition-transform group-hover:scale-105">
                <Heart className="w-6 h-6 fill-current" strokeWidth={2} />
              </div>
              <span className="font-bold text-xl tracking-tight text-slate-800 dark:text-dark-text-primary">
                LAK <span className="text-primary-400">PDF</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${location.pathname === link.path
                    ? 'text-slate-900 bg-slate-100 dark:text-dark-text-primary dark:bg-dark-hover'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-dark-text-secondary dark:hover:text-dark-text-primary dark:hover:bg-dark-hover'
                    }`}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                to="/dashboard"
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${location.pathname === '/dashboard'
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
              className="md:hidden p-2 text-slate-600"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 w-full max-h-[calc(100vh-4rem)] overflow-y-auto overscroll-contain bg-white border-b border-slate-200 p-4 pb-8 flex flex-col gap-2 shadow-xl animate-in slide-in-from-top-2 duration-200 z-40">
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
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
        onLoginSuccess={(u) => setUser(u)}
      />

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
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-rose-600 flex items-center justify-center text-white font-bold shadow-md shadow-primary-500/20">
                  <Heart className="w-5 h-5 fill-current" />
                </div>
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
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-200 mb-4">PDF Tools</h4>
              <ul className="space-y-2.5 text-sm text-slate-400">
                <li><Link to="/merge" className="hover:text-white transition-colors">Merge PDF</Link></li>
                <li><Link to="/split" className="hover:text-white transition-colors">Split PDF</Link></li>
                <li><Link to="/compress" className="hover:text-white transition-colors">Compress PDF</Link></li>
                <li><Link to="/pdf-to-word" className="hover:text-white transition-colors">PDF to Word</Link></li>
                <li><Link to="/word-to-pdf" className="hover:text-white transition-colors">Word to PDF</Link></li>
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

          <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} LAK PDF. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link to="/privacy-policy" className="hover:text-slate-400 transition-colors">Privacy</Link>
              <Link to="/terms-of-service" className="hover:text-slate-400 transition-colors">Terms</Link>
              <Link to="/contact" className="hover:text-slate-400 transition-colors">Support</Link>
              <Link to="/sitemap.xml" className="hover:text-slate-400 transition-colors">Sitemap</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
