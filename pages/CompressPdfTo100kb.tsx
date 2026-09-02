import React, { useRef, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import {
  Minimize2, Target, ChevronDown, ArrowRight, ShieldCheck,
  Lock, Star, FileText, Zap, Shield, CheckCircle,
} from 'lucide-react';

/* ─── Intent-specific content for 100KB ─────────────────────────── */
const USE_CASES = [
  { emoji: '🏛️', title: 'Government Forms', desc: 'Most government portals (NIC, ITAR, passport) reject PDFs over 100KB. This tool gets you exactly under the limit.' },
  { emoji: '📋', title: 'Visa & Immigration', desc: 'Visa applications, embassy documents and immigration portals commonly enforce a 100KB limit on uploaded documents.' },
  { emoji: '🎓', title: 'Exam Registrations', desc: 'UPSC, NTS, university entrance portals often mandate a max file size of 100KB for admit card and certificate uploads.' },
  { emoji: '🏥', title: 'Healthcare Portals', desc: 'Hospital and insurance portals may require scanned prescriptions or reports to be under 100KB.' },
];

const FAQS = [
  { q: 'How do I compress a PDF to exactly 100KB?', a: 'Upload your PDF, click "Compress to 100KB". The tool uses a binary-search algorithm to find the highest possible quality that fits under 100KB. Most PDFs can be reduced to this size.' },
  { q: 'What if my PDF cannot be compressed to 100KB?', a: 'Some PDFs (like scanned images at very high resolution) have a hard lower limit. The tool will return the smallest achievable file and show you how close it got. Try splitting the PDF and compressing each part separately.' },
  { q: 'Why do government websites require PDF under 100KB?', a: 'Government portals often use older infrastructure with strict upload limits. 100KB is a common threshold for ID documents and form uploads.' },
  { q: 'Will the text remain readable after compression to 100KB?', a: 'For text-based PDFs, yes — text is not an image, so it compresses perfectly. For scanned or image-heavy PDFs, quality will reduce somewhat but should stay legible at normal viewing sizes.' },
  { q: 'Can I compress a multi-page PDF to 100KB?', a: 'Yes, but the tool compresses the whole file, so more pages = harder to achieve a very small target. Consider using Split PDF to extract specific pages first, then compress.' },
];

/* ─── Shared CTA button section ─────────────────────────────────── */
const CTAButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#e5323f] hover:bg-[#c92835] text-white font-bold text-lg shadow-lg shadow-red-200 transition-all duration-200 hover:scale-105"
  >
    <Target className="w-5 h-5" />
    Compress PDF to 100KB
    <ArrowRight className="w-5 h-5" />
  </button>
);

/* ─── Component ─────────────────────────────────────────────────── */
const CompressPdfTo100kb: React.FC = () => {
  const navigate = useNavigate();
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  // When the user clicks CTA, navigate to the real tool with target preset
  const goToTool = () => {
    navigate('/compress?target=100');
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Compress PDF to 100KB Free',
    url: 'https://lakpdf.com/compress-pdf-to-100kb',
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    description: 'Compress PDF to 100KB online for free. Ideal for government forms, visa applications, and exam portals. Browser-based, no upload.',
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <>
      <Helmet>
        <title>Compress PDF to 100KB Online Free | Government Forms - LAK PDF</title>
        <meta name="description" content="Compress PDF to 100KB online free. Perfect for government portals, visa applications, UPSC, NTS and exam registrations that enforce a 100KB upload limit. No signup." />
        <link rel="canonical" href="https://lakpdf.com/compress-pdf-to-100kb" />
        <meta property="og:title" content="Compress PDF to 100KB Online Free - LAK PDF" />
        <meta property="og:description" content="Compress PDF to 100KB free. Works for govt portals, visa forms, exam portals. 100% browser-based." />
        <meta property="og:url" content="https://lakpdf.com/compress-pdf-to-100kb" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>

      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-semibold mb-5">
            <Target className="w-3.5 h-3.5" /> Target: 100KB
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4 leading-tight">
            Compress PDF to 100KB
          </h1>
          <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto mb-8">
            Instantly reduce your PDF to under 100KB — the file size limit enforced by government portals, visa applications, exam registrations, and insurance uploads. No software, no signup. The tool runs entirely in your browser.
          </p>
          <CTAButton onClick={goToTool} />
          <p className="mt-3 text-xs text-slate-400">No signup · No watermark · 100% free · Browser-based</p>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-12 text-sm text-slate-600">
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-green-600" /> No signup</span>
          <span className="inline-flex items-center gap-1.5"><Lock className="w-4 h-4 text-green-600" /> Files stay on your device</span>
          <span className="inline-flex items-center gap-1.5"><Star className="w-4 h-4 text-green-600" /> Completely free</span>
          <span className="inline-flex items-center gap-1.5"><FileText className="w-4 h-4 text-green-600" /> No watermark</span>
        </div>

        {/* Use Cases */}
        <section className="mb-14">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6">
            When is 100KB Limit Required?
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {USE_CASES.map((u, i) => (
              <div key={i} className="flex gap-4 p-5 rounded-2xl border border-slate-200 bg-white">
                <span className="text-3xl shrink-0">{u.emoji}</span>
                <div>
                  <p className="font-bold text-slate-900">{u.title}</p>
                  <p className="text-sm text-slate-500 mt-1">{u.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section className="mb-14">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6">How to Compress PDF to 100KB</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { step: 'Open the compressor', detail: 'Click the button above to open the PDF compressor with the 100KB target pre-selected.' },
              { step: 'Upload your PDF', detail: 'Drag and drop your file or click to browse. Works with any PDF — text, scanned, or mixed.' },
              { step: 'Compress automatically', detail: 'The tool runs a binary search to find the best quality that fits within 100KB.' },
              { step: 'Download your file', detail: 'Review compression stats and download. The file will be within the 100KB limit.' },
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

        {/* Why Choose */}
        <section className="mb-14">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6">Why LAK PDF for 100KB Compression?</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: <Target className="w-5 h-5" />, title: 'Binary Search Precision', desc: 'Automatically finds highest quality that fits under exactly 100KB.' },
              { icon: <Shield className="w-5 h-5" />, title: 'Private Processing', desc: 'Files never leave your browser. Zero server uploads.' },
              { icon: <Zap className="w-5 h-5" />, title: 'Instant Result', desc: 'Most files compress in under 30 seconds — even large scanned PDFs.' },
              { icon: <CheckCircle className="w-5 h-5" />, title: 'No Watermark', desc: 'Compressed PDF is clean — no added branding or visible changes.' },
              { icon: <Star className="w-5 h-5" />, title: 'Completely Free', desc: 'No subscription, no hidden limits, no account required.' },
              { icon: <FileText className="w-5 h-5" />, title: 'Any PDF Type', desc: 'Works with text PDFs, scanned documents, invoices, and certificates.' },
            ].map((b, i) => (
              <div key={i} className="flex gap-3 p-4 rounded-xl border border-slate-200 bg-white">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">{b.icon}</div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{b.title}</p>
                  <p className="text-xs text-slate-500 mt-1">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-14">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {FAQS.map((f, i) => (
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
              { label: 'Compress PDF (all options)', to: '/compress-pdf' },
              { label: 'Compress PDF to 200KB', to: '/compress-pdf-to-200kb' },
              { label: 'Compress PDF to 500KB', to: '/compress-pdf-to-500kb' },
              { label: 'Split PDF', to: '/split' },
              { label: 'Compress Image', to: '/compress-img' },
            ].map((l) => (
              <Link key={l.to} to={l.to} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-colors">
                {l.label} <ArrowRight className="w-4 h-4" />
              </Link>
            ))}
          </div>
        </section>

        {/* CTA Bottom */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Compress your PDF to 100KB now</h2>
          <p className="text-slate-400 mb-6 text-sm sm:text-base">Ready for any government portal or official upload. No account needed.</p>
          <CTAButton onClick={goToTool} />
        </div>
      </div>
    </>
  );
};

export default CompressPdfTo100kb;
