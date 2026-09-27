import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  ShieldCheck, 
  Zap, 
  Globe, 
  Lock, 
  Cpu, 
  Sparkles, 
  Target, 
  Eye, 
  Award, 
  CheckCircle2, 
  ArrowRight, 
  Users, 
  FileText,
  Mail,
  Heart
} from 'lucide-react';

export const About: React.FC = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <>
      <Helmet>
        <title>About Us – Mission, Security & Story | LAK PDF</title>
        <meta
          name="description"
          content="Learn about LAK PDF, our mission to democratize document processing, our 100% browser-based security architecture, and the team behind the platform."
        />
        <meta name="keywords" content="about LAK PDF, free pdf tools, client-side pdf, pdf privacy, Leyaquat Ali Khan, online pdf editor" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://lakpdf.com/about" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "AboutPage",
          "name": "About LAK PDF",
          "description": "Learn about LAK PDF and our mission to provide free, private, browser-based document tools.",
          "url": "https://lakpdf.com/about",
          "mainEntity": {
            "@type": "Organization",
            "name": "LAK PDF",
            "url": "https://lakpdf.com",
            "logo": "https://lakpdf.com/logo-80x80.webp",
            "founder": {
              "@type": "Person",
              "name": "Leyaquat Ali Khan"
            }
          }
        })}</script>
      </Helmet>

      <div className="min-h-screen py-8 md:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Back Button */}
          <div className="mb-6 sm:mb-8">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-dark-surface border border-slate-200/90 dark:border-dark-border shadow-xs hover:shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all group"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1 text-slate-500 dark:text-slate-400 group-hover:text-primary-500" />
              <span>Back</span>
            </button>
          </div>

          {/* ── HERO SECTION ── */}
          <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-50 dark:bg-primary-950/60 border border-primary-200/80 dark:border-primary-800/60 text-primary-700 dark:text-primary-300 text-xs font-semibold uppercase tracking-wider mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Next-Generation Document Utility</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight mb-6">
              Making PDF Tools <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 via-sky-500 to-indigo-600">Fast, Free & Truly Private</span>
            </h1>

            <p className="text-base sm:text-xl text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              LAK PDF was built to solve a simple problem: most online PDF converters are slow, locked behind predatory subscriptions, and upload your sensitive personal files to unknown third-party servers. We changed that.
            </p>
          </div>

          {/* ── KEY METRICS / STATS STRIP ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-20">
            {[
              { label: "Free PDF & Image Tools", value: "30+", icon: <FileText className="w-5 h-5 text-primary-500" /> },
              { label: "Client-Side Processing", value: "100%", icon: <Lock className="w-5 h-5 text-emerald-500" /> },
              { label: "Zero Wait Queues", value: "0 sec", icon: <Zap className="w-5 h-5 text-amber-500" /> },
              { label: "Global Reach", value: "100+ Countries", icon: <Globe className="w-5 h-5 text-sky-500" /> }
            ].map((stat, idx) => (
              <div 
                key={idx} 
                className="bg-white dark:bg-dark-surface p-6 rounded-2xl border border-slate-200/80 dark:border-dark-border shadow-sm hover:shadow-md transition-shadow text-center flex flex-col items-center justify-center"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800/80 flex items-center justify-center mb-3">
                  {stat.icon}
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-1">
                  {stat.value}
                </div>
                <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* ── OUR STORY & FOUNDER SECTION ── */}
          <div className="bg-gradient-to-br from-slate-50 via-white to-sky-50/30 dark:from-dark-surface dark:via-dark-surface dark:to-slate-900/60 rounded-3xl border border-slate-200/80 dark:border-dark-border p-8 md:p-12 mb-20 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              <div className="lg:col-span-4 flex flex-col items-center text-center">
                <div className="relative mb-4">
                  <div className="w-36 h-36 md:w-44 md:h-44 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl bg-gradient-to-tr from-primary-400 to-indigo-500 p-1">
                    <img 
                      src="/founder.jpg" 
                      alt="Leyaquat Ali Khan – Founder of LAK PDF" 
                      className="w-full h-full object-cover rounded-full bg-slate-100"
                      onError={(e) => {
                        e.currentTarget.src = 'https://ui-avatars.com/api/?name=Leyaquat+Ali+Khan&background=0284c7&color=fff&size=200&bold=true';
                      }}
                    />
                  </div>
                  <div className="absolute bottom-1 right-2 bg-emerald-500 text-white p-1.5 rounded-full border-2 border-white dark:border-dark-surface shadow-md" title="Verified Creator">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>

                <h3 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
                  Leyaquat Ali Khan
                </h3>
                <p className="text-primary-600 dark:text-primary-400 font-semibold text-xs uppercase tracking-wider mt-1">
                  Founder & Lead Architect
                </p>
                <div className="flex items-center gap-2 mt-3 text-slate-500 dark:text-slate-400 text-xs">
                  <Heart className="w-3.5 h-3.5 text-rose-500 fill-current" />
                  <span>Building for students & professionals</span>
                </div>
              </div>

              <div className="lg:col-span-8 space-y-4 text-slate-600 dark:text-slate-300 leading-relaxed text-sm sm:text-base">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-4">
                  Why We Built LAK PDF
                </h2>
                <p>
                  Like millions of students, job applicants, and office workers, we experienced the daily frustration of dealing with basic document tasks: merging marksheets, converting photos to 50KB for government forms, signing agreements, or extracting pages.
                </p>
                <p>
                  Almost every popular PDF site forced users through a gauntlet of countdown timers, credit card paywalls, 2-file hourly limits, and mandatory email registrations. Worse, they required uploading private contracts, medical reports, and identity cards to distant cloud servers.
                </p>
                <p className="font-medium text-slate-800 dark:text-slate-100">
                  LAK PDF was engineered to break this model. By leveraging modern client-side WebAssembly, your documents are parsed, manipulated, and rendered directly inside your own web browser's memory. Your files never leave your device.
                </p>
              </div>

            </div>
          </div>

          {/* ── 4 CORE PILLARS ── */}
          <div className="mb-20">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-3">
                Our Core Pillars
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
                Every tool, button, and algorithm on LAK PDF is guided by these four non-negotiable standards:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="bg-white dark:bg-dark-surface p-7 rounded-2xl border border-slate-200/80 dark:border-dark-border shadow-sm hover:border-primary-400 dark:hover:border-primary-600 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-5">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  1. Zero Server Storage & Complete Privacy
                </h3>
                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                  Your privacy is our primary engineering requirement. Core operations (Merge, Split, Rotate, Crop, Compress, Sign) run strictly in your browser via WebAssembly. We do not store, view, or sell your documents.
                </p>
              </div>

              <div className="bg-white dark:bg-dark-surface p-7 rounded-2xl border border-slate-200/80 dark:border-dark-border shadow-sm hover:border-primary-400 dark:hover:border-primary-600 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-5">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  2. Blazing Fast WebAssembly Performance
                </h3>
                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                  No slow cloud upload queues. By compiling native C/C++ and Rust document engines to WebAssembly, LAK PDF compresses and converts 50MB files in seconds with zero network lag.
                </p>
              </div>

              <div className="bg-white dark:bg-dark-surface p-7 rounded-2xl border border-slate-200/80 dark:border-dark-border shadow-sm hover:border-primary-400 dark:hover:border-primary-600 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-950/60 border border-primary-100 dark:border-primary-800 text-primary-600 dark:text-primary-400 flex items-center justify-center mb-5">
                  <Award className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  3. 100% Free Forever – No Paywalls
                </h3>
                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                  No credit cards. No surprise trials. No watermarks stamped across your resumes or contracts. All 30+ tools are freely accessible to students, freelancers, and businesses.
                </p>
              </div>

              <div className="bg-white dark:bg-dark-surface p-7 rounded-2xl border border-slate-200/80 dark:border-dark-border shadow-sm hover:border-primary-400 dark:hover:border-primary-600 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-5">
                  <Cpu className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  4. Universal Cross-Platform Compatibility
                </h3>
                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                  No bulky software installations. LAK PDF runs seamlessly on Chrome, Safari, Firefox, and Edge across Windows, macOS, Linux, iOS, and Android with full touch and mobile responsiveness.
                </p>
              </div>

            </div>
          </div>

          {/* ── MISSION & VISION ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
            <div className="bg-gradient-to-br from-primary-500/10 via-primary-500/5 to-transparent dark:from-primary-950/40 dark:via-dark-surface dark:to-transparent p-8 md:p-10 rounded-3xl border border-primary-200 dark:border-primary-900/60">
              <div className="w-12 h-12 bg-primary-500 text-white rounded-2xl shadow-lg shadow-primary-500/30 flex items-center justify-center mb-6">
                <Target className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Our Mission</h2>
              <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed">
                To democratize document utility technology by providing state-of-the-art PDF manipulation, conversion, and compression tools that are completely free, private, and effortless for every person on earth.
              </p>
            </div>

            <div className="bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent dark:from-indigo-950/40 dark:via-dark-surface dark:to-transparent p-8 md:p-10 rounded-3xl border border-indigo-200 dark:border-indigo-900/60">
              <div className="w-12 h-12 bg-indigo-500 text-white rounded-2xl shadow-lg shadow-indigo-500/30 flex items-center justify-center mb-6">
                <Eye className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Our Vision</h2>
              <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed">
                To become the world's most trusted, privacy-respecting document productivity suite, continuously evolving with privacy-safe AI tools and unmatched web engineering standards.
              </p>
            </div>
          </div>

          {/* ── BOTTOM CTA BANNER ── */}
          <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-primary-950 to-slate-900 dark:from-dark-surface dark:via-primary-950/50 dark:to-dark-surface rounded-3xl p-8 sm:p-12 text-center text-white border border-slate-800 shadow-xl">
            <div className="relative z-10 max-w-2xl mx-auto space-y-6">
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                Ready to Experience Seamless PDF Editing?
              </h2>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Explore our full suite of 30+ free tools. No account, no credit card, and zero installation required.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                <Link
                  to="/tools"
                  className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-7 py-3 rounded-xl font-bold shadow-lg shadow-primary-500/30 transition-all hover:scale-105"
                >
                  <span>Explore All 30+ Tools</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 bg-slate-800/90 hover:bg-slate-700 text-slate-200 px-6 py-3 rounded-xl font-semibold border border-slate-700 transition-all"
                >
                  <Mail className="w-4 h-4" />
                  <span>Contact Our Team</span>
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};
