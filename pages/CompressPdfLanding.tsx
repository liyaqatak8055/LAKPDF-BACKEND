import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import {
  Minimize2,
  Target,
  Zap,
  Shield,
  ChevronDown,
  ArrowRight,
  Lock,
  CheckCircle,
  FileText,
  Star,
  ShieldCheck,
  Gauge,
  SlidersHorizontal,
} from 'lucide-react';

/* ─── FAQ data ─────────────────────────────────────────────────────── */
const faqs = [
  {
    q: 'What is the best way to compress a PDF?',
    a: 'Use "Recommended" compression for everyday files — it shrinks size by 50–80% while keeping text sharp. For government forms or email limits, use "Target Size" mode to hit an exact KB limit.',
  },
  {
    q: 'How do I compress a PDF to a specific size like 100KB or 200KB?',
    a: 'Click "Compress PDF to 100KB" or "Compress PDF to 200KB" on this page. Those tools let you pick an exact target file size and automatically find the best quality that fits under it.',
  },
  {
    q: 'Will compression reduce PDF quality?',
    a: '"Recommended" and "Lossless" modes preserve text quality. Only "Extreme" mode visibly reduces image sharpness. Target-size mode tries to hit your limit with the least quality loss possible.',
  },
  {
    q: 'Is there a file size limit?',
    a: 'No fixed limit — all processing is browser-based. Very large PDFs (50MB+) may take longer depending on your device speed.',
  },
  {
    q: 'Are my files uploaded to a server?',
    a: 'No. Every step runs inside your browser using PDF-lib. Your documents never leave your device.',
  },
  {
    q: 'Which compression level should I choose?',
    a: 'For most uses, Recommended is ideal. Use Extreme for very large scanned PDFs where file size matters more than image sharpness. Use Lossless when you need zero quality reduction.',
  },
];

/* ─── Size Variant Cards ─────────────────────────────────────────────── */
const sizeVariants = [
  {
    size: '100 KB',
    path: '/compress-pdf-to-100kb',
    useCase: 'Govt forms, ITAR portals, visa applications',
    badge: 'Most popular',
    badgeColor: 'bg-red-100 text-red-700',
    emoji: '🏛️',
  },
  {
    size: '200 KB',
    path: '/compress-pdf-to-200kb',
    useCase: 'Job applications, HR portals, college uploads',
    badge: 'Highly searched',
    badgeColor: 'bg-blue-100 text-blue-700',
    emoji: '💼',
  },
  {
    size: '500 KB',
    path: '/compress-pdf-to-500kb',
    useCase: 'Email attachments, client reports, portfolios',
    badge: 'For larger files',
    badgeColor: 'bg-green-100 text-green-700',
    emoji: '📎',
  },
];

/* ─── Component ─────────────────────────────────────────────────────── */
const CompressPdfLanding: React.FC = () => {
  const navigate = useNavigate();
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Compress PDF Online Free',
    url: 'https://lakpdf.com/compress-pdf',
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    description: 'Compress PDF online for free. Reduce PDF file size with level or target-size compression. No upload, 100% browser-based.',
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <>
      <Helmet>
        <title>Compress PDF Online Free | Reduce PDF Size - LAK PDF</title>
        <meta name="description" content="Compress PDF online free and reduce file size instantly. Choose compression level or set a target size (100KB, 200KB, 500KB). No upload, 100% browser-based." />
        <link rel="canonical" href="https://lakpdf.com/compress-pdf" />
        <meta property="og:title" content="Compress PDF Online Free | Reduce PDF Size - LAK PDF" />
        <meta property="og:description" content="Compress PDF online free and reduce file size instantly. No signup, no watermark." />
        <meta property="og:url" content="https://lakpdf.com/compress-pdf" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>

      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-100 text-red-600 mb-5">
            <Minimize2 className="w-8 h-8" />
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4 leading-tight">
            Compress PDF Online Free
          </h1>
          <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto mb-8">
            Reduce PDF file size for email, government portals, college uploads, and WhatsApp sharing — without installing any software. Choose compression level or hit an exact KB target. All processing runs inside your browser; your file never leaves your device.
          </p>
          <button
            onClick={() => navigate('/compress')}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#e5323f] hover:bg-[#c92835] text-white font-bold text-lg shadow-lg shadow-red-200 transition-all duration-200 hover:scale-105"
          >
            <Minimize2 className="w-5 h-5" />
            Open PDF Compressor
            <ArrowRight className="w-5 h-5" />
          </button>
          <p className="mt-3 text-xs text-slate-400">No signup · No watermark · 100% free · Browser-based</p>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-12 text-sm text-slate-600">
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-green-600" /> No signup</span>
          <span className="inline-flex items-center gap-1.5"><Lock className="w-4 h-4 text-green-600" /> Files stay on your device</span>
          <span className="inline-flex items-center gap-1.5"><Star className="w-4 h-4 text-green-600" /> Completely free</span>
          <span className="inline-flex items-center gap-1.5"><FileText className="w-4 h-4 text-green-600" /> No watermark</span>
        </div>

        {/* Size Variants */}
        <section className="mb-14">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2 text-center">
            Compress PDF to a Specific Size
          </h2>
          <p className="text-center text-slate-500 mb-7 text-sm sm:text-base">
            Need your PDF under a specific KB limit? These dedicated tools auto-tune quality to hit your exact target.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {sizeVariants.map((v) => (
              <Link
                key={v.path}
                to={v.path}
                className="group flex flex-col gap-3 p-5 rounded-2xl border-2 border-slate-200 bg-white hover:border-red-300 hover:shadow-lg transition-all duration-200"
              >
                <div className="flex items-start justify-between">
                  <span className="text-3xl">{v.emoji}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${v.badgeColor}`}>
                    {v.badge}
                  </span>
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900">Compress PDF to {v.size}</p>
                  <p className="text-sm text-slate-500 mt-1">{v.useCase}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-red-600 group-hover:gap-2 transition-all">
                  Try it <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Compression Modes */}
        <section className="mb-14">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6">Two Ways to Compress</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex gap-4 p-5 rounded-2xl border border-slate-200 bg-white">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Gauge className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-slate-900">Level Mode</p>
                <p className="text-sm text-slate-500 mt-1">Pick Recommended, Extreme, or Lossless. Best for when you want a smaller file without worrying about an exact size limit.</p>
              </div>
            </div>
            <div className="flex gap-4 p-5 rounded-2xl border border-slate-200 bg-white">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-slate-900">Target Size Mode</p>
                <p className="text-sm text-slate-500 mt-1">Enter an exact KB or MB limit (e.g. 100KB). The tool binary-searches for the highest quality that fits under your target.</p>
              </div>
            </div>
          </div>
        </section>

        {/* How to Use */}
        <section className="mb-14">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6">How to Compress a PDF</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { step: 'Upload your PDF', detail: 'Click the upload area or drag and drop. No file size limit on the tool itself.' },
              { step: 'Choose compression', detail: 'Select a level (Recommended, Extreme, Lossless) or switch to Target Size mode.' },
              { step: 'Compress PDF', detail: 'Click Compress. The tool processes everything locally inside your browser.' },
              { step: 'Download', detail: 'See the size reduction stats and download your smaller PDF instantly.' },
            ].map((s, i) => (
              <div key={i} className="flex gap-4 p-4 rounded-xl border border-slate-200 bg-white">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white text-sm font-bold">{i + 1}</span>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{s.step}</p>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">{s.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Benefits */}
        <section className="mb-14">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6">Why Use LAK PDF Compressor?</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: <Zap className="w-5 h-5" />, title: 'Fast & Free', desc: 'Compress in seconds, no cost, no software installation.' },
              { icon: <Target className="w-5 h-5" />, title: 'Precise Target Size', desc: 'Set an exact KB target — useful for forms that reject oversized uploads.' },
              { icon: <Shield className="w-5 h-5" />, title: '100% Private', desc: 'PDF-lib runs entirely in your browser. Zero server uploads.' },
              { icon: <SlidersHorizontal className="w-5 h-5" />, title: 'Flexible Modes', desc: 'Level mode for general use, target mode for strict portals.' },
              { icon: <CheckCircle className="w-5 h-5" />, title: 'No Watermark', desc: 'Your compressed PDF is clean — no LAK PDF branding added.' },
              { icon: <Gauge className="w-5 h-5" />, title: 'See Exact Savings', desc: 'Before/after size stats shown after every compression.' },
            ].map((b, i) => (
              <div key={i} className="flex gap-4 p-4 rounded-xl border border-slate-200 bg-white">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">{b.icon}</div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{b.title}</p>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-14">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <div key={i} className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenFAQ(openFAQ === i ? null : i)}
                  className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                  aria-expanded={openFAQ === i}
                >
                  <span className="font-semibold text-slate-800 text-sm sm:text-base">{f.q}</span>
                  <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${openFAQ === i ? 'rotate-180' : ''}`} />
                </button>
                <div className={`overflow-hidden transition-all duration-200 ease-in-out ${openFAQ === i ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <p className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">{f.a}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Related Tools */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4">Related Tools</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { label: 'Merge PDF', to: '/merge' },
              { label: 'Split PDF', to: '/split' },
              { label: 'PDF to Word', to: '/pdf-to-word' },
              { label: 'Compress Image', to: '/compress-img' },
              { label: 'Compress PDF to 100KB', to: '/compress-pdf-to-100kb' },
              { label: 'Compress PDF to 200KB', to: '/compress-pdf-to-200kb' },
              { label: 'Compress PDF to 500KB', to: '/compress-pdf-to-500kb' },
            ].map((l) => (
              <Link key={l.to} to={l.to} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-colors">
                {l.label} <ArrowRight className="w-4 h-4" />
              </Link>
            ))}
          </div>
        </section>

        {/* CTA Bottom */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Ready to compress your PDF?</h2>
          <p className="text-slate-400 mb-6 text-sm sm:text-base">No account needed. Works instantly in your browser.</p>
          <button
            onClick={() => navigate('/compress')}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#e5323f] hover:bg-[#c92835] text-white font-bold transition-all duration-200 hover:scale-105"
          >
            <Minimize2 className="w-5 h-5" />
            Compress PDF Now
          </button>
        </div>
      </div>
    </>
  );
};

export default CompressPdfLanding;
