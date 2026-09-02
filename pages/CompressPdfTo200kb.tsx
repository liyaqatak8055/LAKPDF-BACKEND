import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import {
  Minimize2, Target, ChevronDown, ArrowRight, ShieldCheck,
  Lock, Star, FileText, Zap, Shield, CheckCircle,
} from 'lucide-react';

/* ─── Intent-specific content for 200KB ─────────────────────────── */
const USE_CASES = [
  { emoji: '💼', title: 'Job Applications', desc: 'HR portals and applicant tracking systems commonly cap resume/CV PDFs at 200KB. Compressed documents load faster and are less likely to be rejected.' },
  { emoji: '🎓', title: 'University & College Portals', desc: 'Academic institutions often require admission documents, transcripts and certificates to be under 200KB for their online portals.' },
  { emoji: '🏢', title: 'Company Vendor Onboarding', desc: 'Procurement and supplier registration systems often restrict uploaded documents (invoices, contracts, certificates) to 200KB per file.' },
  { emoji: '📝', title: 'Online Application Forms', desc: 'Many online forms — scholarship portals, grant applications, NGO submissions — enforce a 200KB PDF limit.' },
];

const FAQS = [
  { q: 'How do I compress a PDF to 200KB?', a: 'Click the "Compress PDF to 200KB" button above. Upload your PDF and the tool automatically finds the best image quality that keeps the final file under 200KB.' },
  { q: 'Is 200KB enough for a resume PDF?', a: 'Yes, most resume PDFs with standard formatting and no high-res images will compress well under 200KB. A well-structured resume with one or two columns should reach 50–100KB.' },
  { q: 'What if the PDF cannot be reduced to 200KB?', a: 'Very large PDFs (100+ pages) or high-resolution photo-heavy documents may have a hard floor above 200KB. The tool returns the smallest achievable file and shows you the gap. Try splitting the PDF first.' },
  { q: 'Will table formatting be preserved?', a: 'Yes. Text, tables, and vector graphics are not affected by image compression. Only embedded images are downsampled to meet the target.' },
  { q: 'Can I compress multiple PDFs?', a: 'The tool currently handles one file at a time. Compress each PDF separately and download them individually.' },
];

const CTAButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#e5323f] hover:bg-[#c92835] text-white font-bold text-lg shadow-lg shadow-red-200 transition-all duration-200 hover:scale-105"
  >
    <Target className="w-5 h-5" />
    Compress PDF to 200KB
    <ArrowRight className="w-5 h-5" />
  </button>
);

const CompressPdfTo200kb: React.FC = () => {
  const navigate = useNavigate();
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  const goToTool = () => {
    navigate('/compress?target=200');
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Compress PDF to 200KB Free',
    url: 'https://lakpdf.com/compress-pdf-to-200kb',
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    description: 'Compress PDF to 200KB online for free. Ideal for job applications, HR portals, college admissions and scholarship uploads. Browser-based, no upload.',
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
        <title>Compress PDF to 200KB Online Free | Job Applications & Portals - LAK PDF</title>
        <meta name="description" content="Compress PDF to 200KB online free. Perfect for job applications, HR portals, university admissions and scholarship forms that require PDFs under 200KB. No signup." />
        <link rel="canonical" href="https://lakpdf.com/compress-pdf-to-200kb" />
        <meta property="og:title" content="Compress PDF to 200KB Online Free - LAK PDF" />
        <meta property="og:description" content="Compress PDF to 200KB free. Ideal for resumes, university admissions, and online application portals." />
        <meta property="og:url" content="https://lakpdf.com/compress-pdf-to-200kb" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>

      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-5">
            <Target className="w-3.5 h-3.5" /> Target: 200KB
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4 leading-tight">
            Compress PDF to 200KB
          </h1>
          <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto mb-8">
            Reduce your PDF to under 200KB for job applications, university portals, HR systems, and scholarship forms. The tool finds the highest quality that fits your limit automatically — all in your browser, nothing uploaded.
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
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6">When is a 200KB PDF Limit Required?</h2>
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
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6">How to Compress PDF to 200KB</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { step: 'Open the compressor', detail: 'Click the button above — the 200KB target is pre-selected for you.' },
              { step: 'Upload your PDF', detail: 'Drag and drop or browse. Accepts any PDF including scanned documents.' },
              { step: 'Auto-compress to 200KB', detail: 'The tool runs binary-search compression to fit within 200KB at the best quality.' },
              { step: 'Download instantly', detail: 'Check the size reduction stats and download your 200KB PDF.' },
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
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6">Why LAK PDF for 200KB Compression?</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: <Target className="w-5 h-5" />, title: 'Precise Targeting', desc: 'Binary-search algo ensures result is right under your 200KB limit.' },
              { icon: <Shield className="w-5 h-5" />, title: 'Private by Design', desc: 'PDF-lib runs in browser. No file ever reaches a server.' },
              { icon: <Zap className="w-5 h-5" />, title: 'Fast Turnaround', desc: 'Most files compressed in under 30 seconds.' },
              { icon: <CheckCircle className="w-5 h-5" />, title: 'No Watermark', desc: 'Output PDF is completely clean. No branding added.' },
              { icon: <Star className="w-5 h-5" />, title: 'Free Forever', desc: 'No subscription or credit system. Always free.' },
              { icon: <FileText className="w-5 h-5" />, title: 'All PDF Types', desc: 'Handles text, scanned, image-heavy PDFs equally.' },
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
              { label: 'Compress PDF to 500KB', to: '/compress-pdf-to-500kb' },
              { label: 'PDF to Word', to: '/pdf-to-word' },
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
          <h2 className="text-2xl font-bold text-white mb-2">Compress your PDF to 200KB now</h2>
          <p className="text-slate-400 mb-6 text-sm sm:text-base">Perfect for job applications and university portals. No account needed.</p>
          <CTAButton onClick={goToTool} />
        </div>
      </div>
    </>
  );
};

export default CompressPdfTo200kb;
