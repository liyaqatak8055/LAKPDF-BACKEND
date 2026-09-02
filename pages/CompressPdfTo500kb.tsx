import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import {
  Minimize2, Target, ChevronDown, ArrowRight, ShieldCheck,
  Lock, Star, FileText, Zap, Shield, CheckCircle, Mail,
} from 'lucide-react';

/* ─── Intent-specific content for 500KB ─────────────────────────── */
const USE_CASES = [
  { emoji: '📧', title: 'Email Attachments', desc: 'Gmail, Outlook and Yahoo have per-file attachment limits. 500KB is a safe target for sending PDFs through corporate email without hitting block limits.' },
  { emoji: '📊', title: 'Client Reports & Presentations', desc: 'Business reports, proposals and pitch decks often need to be emailed or shared via link. 500KB loads fast on any connection.' },
  { emoji: '🖼️', title: 'Portfolios & Brochures', desc: 'Creative portfolios, product brochures and lookbooks compress well to 500KB while keeping images visually sharp at screen resolution.' },
  { emoji: '📤', title: 'CRM & Cloud Uploads', desc: 'CRM systems, shared drives, and cloud storage services sometimes limit individual file uploads. 500KB ensures smooth uploads.' },
];

const FAQS = [
  { q: 'How do I compress a PDF to 500KB?', a: 'Click "Compress PDF to 500KB" above. Upload your PDF and the tool automatically finds the best image quality that keeps the file under 500KB. Most PDFs compress easily to this size.' },
  { q: 'Is 500KB good for email?', a: 'Yes — 500KB is ideal for email attachments. It is small enough to send through most corporate email servers, avoid spam filters, and load quickly for the recipient.' },
  { q: 'Will images look good at 500KB?', a: 'For a typical PDF with medium-resolution images, 500KB usually preserves very good visual quality. The tool maximizes image quality within the 500KB budget.' },
  { q: 'How large a PDF can I compress to 500KB?', a: 'There is no file size limit to upload. Larger source files (10MB+) will see more quality reduction than smaller ones, but text and vector content remains perfectly sharp at any size.' },
  { q: 'Can I share the compressed PDF directly?', a: 'Yes — download the compressed PDF and share it via email, WhatsApp, Google Drive, or any platform. No restrictions on the output file.' },
];

const CTAButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#e5323f] hover:bg-[#c92835] text-white font-bold text-lg shadow-lg shadow-red-200 transition-all duration-200 hover:scale-105"
  >
    <Target className="w-5 h-5" />
    Compress PDF to 500KB
    <ArrowRight className="w-5 h-5" />
  </button>
);

const CompressPdfTo500kb: React.FC = () => {
  const navigate = useNavigate();
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  const goToTool = () => {
    navigate('/compress?target=500');
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Compress PDF to 500KB Free',
    url: 'https://lakpdf.com/compress-pdf-to-500kb',
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    description: 'Compress PDF to 500KB online for free. Ideal for email attachments, client reports, portfolios and CRM uploads. Browser-based, no signup.',
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
        <title>Compress PDF to 500KB Online Free | Email & Reports - LAK PDF</title>
        <meta name="description" content="Compress PDF to 500KB online free. Perfect for email attachments, client reports, portfolios and CRM uploads. High quality output. No signup required." />
        <link rel="canonical" href="https://lakpdf.com/compress-pdf-to-500kb" />
        <meta property="og:title" content="Compress PDF to 500KB Online Free - LAK PDF" />
        <meta property="og:description" content="Compress PDF to 500KB free. Ideal for email, reports and portfolios. Fast, private, browser-based." />
        <meta property="og:url" content="https://lakpdf.com/compress-pdf-to-500kb" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>

      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-semibold mb-5">
            <Target className="w-3.5 h-3.5" /> Target: 500KB
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4 leading-tight">
            Compress PDF to 500KB
          </h1>
          <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto mb-8">
            Reduce your PDF to under 500KB — ideal for email attachments, client reports, design portfolios, and business presentations. At 500KB, images retain great visual quality while the file loads fast for anyone you share it with.
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
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6">When to Compress PDF to 500KB</h2>
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
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6">How to Compress PDF to 500KB</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { step: 'Open the compressor', detail: 'Click the button above — 500KB target is pre-selected for you.' },
              { step: 'Upload your PDF', detail: 'Drag and drop or browse. Any PDF works — reports, brochures, portfolios.' },
              { step: 'Auto-compress to 500KB', detail: 'Binary-search compression finds the best quality that fits under 500KB.' },
              { step: 'Download & share', detail: 'Download and send via email, WhatsApp or Google Drive instantly.' },
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
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6">Why LAK PDF for 500KB Compression?</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: <Target className="w-5 h-5" />, title: 'Precise Targeting', desc: 'Result is always right under 500KB — not 600KB, not 490KB if it can be higher.' },
              { icon: <Shield className="w-5 h-5" />, title: 'Private Processing', desc: 'Your PDF never reaches any server. Full local processing.' },
              { icon: <Zap className="w-5 h-5" />, title: 'Fast Compression', desc: 'Most files done in under 30 seconds even on mobile.' },
              { icon: <CheckCircle className="w-5 h-5" />, title: 'No Watermark', desc: 'Clean output — no branding, no stamps, no visible changes.' },
              { icon: <Mail className="w-5 h-5" />, title: 'Email-Ready', desc: 'Passes through Gmail, Outlook and corporate mail servers with ease.' },
              { icon: <Star className="w-5 h-5" />, title: 'Always Free', desc: 'No trial periods or credit limits. Free for everyone.' },
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
              { label: 'Compress PDF to 100KB', to: '/compress-pdf-to-100kb' },
              { label: 'Compress PDF to 200KB', to: '/compress-pdf-to-200kb' },
              { label: 'Merge PDF', to: '/merge' },
              { label: 'PDF to Word', to: '/pdf-to-word' },
            ].map((l) => (
              <Link key={l.to} to={l.to} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-colors">
                {l.label} <ArrowRight className="w-4 h-4" />
              </Link>
            ))}
          </div>
        </section>

        {/* CTA Bottom */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Compress your PDF to 500KB now</h2>
          <p className="text-slate-400 mb-6 text-sm sm:text-base">Email-ready, portfolio-ready. No account needed.</p>
          <CTAButton onClick={goToTool} />
        </div>
      </div>
    </>
  );
};

export default CompressPdfTo500kb;
