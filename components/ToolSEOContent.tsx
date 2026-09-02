import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Zap,
  Shield,
  Clock,
  Globe,
  Lock,
  Smartphone,
  Download,
  Layers,
  Eye,
  CheckCircle,
  Star,
  Target,
  ChevronDown,
  ArrowRight,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import toolSEOData, { type Benefit, type FAQ, type ToolSEOData } from '../config/toolSEOData';

/* ── Icon map ─────────────────────────────────────────────────────────── */
const iconMap: Record<Benefit['icon'], React.ReactNode> = {
  zap: <Zap className="w-5 h-5" />,
  shield: <Shield className="w-5 h-5" />,
  clock: <Clock className="w-5 h-5" />,
  globe: <Globe className="w-5 h-5" />,
  lock: <Lock className="w-5 h-5" />,
  smartphone: <Smartphone className="w-5 h-5" />,
  download: <Download className="w-5 h-5" />,
  layers: <Layers className="w-5 h-5" />,
  eye: <Eye className="w-5 h-5" />,
  check: <CheckCircle className="w-5 h-5" />,
  star: <Star className="w-5 h-5" />,
  target: <Target className="w-5 h-5" />,
};

/* ── FAQ Accordion Item ───────────────────────────────────────────────── */
const FAQItem: React.FC<{ faq: FAQ; isOpen: boolean; onToggle: () => void }> = ({
  faq,
  isOpen,
  onToggle,
}) => (
  <div className="border border-slate-200 rounded-xl overflow-hidden">
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50 transition-colors cursor-pointer"
      aria-expanded={isOpen}
    >
      <span className="font-semibold text-slate-800 text-sm sm:text-base">{faq.question}</span>
      <ChevronDown
        className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${
          isOpen ? 'rotate-180' : ''
        }`}
      />
    </button>
    <div
      className={`overflow-hidden transition-all duration-200 ease-in-out ${
        isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
      }`}
    >
      <p className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">{faq.answer}</p>
    </div>
  </div>
);

/* ── Main Component ───────────────────────────────────────────────────── */
interface ToolSEOContentProps {
  toolKey: string;
}

const SITE_URL = 'https://lakpdf.com';

export const ToolSEOContent: React.FC<ToolSEOContentProps> = ({ toolKey }) => {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const data = toolSEOData[toolKey] || null;

  if (!data) return null;

  // Build FAQPage JSON-LD
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: data.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  // Build HowTo JSON-LD
  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: `How to use ${toolKey.replace(/^\//, '').replace(/-/g, ' ')} tool`,
    step: data.howToUse.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.step,
      text: s.detail,
    })),
  };

  return (
    <>
      {/* FAQPage + HowTo structured data */}
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(howToJsonLd)}</script>
      </Helmet>

      <section className="mt-16 space-y-14 max-w-4xl mx-auto" aria-label="Tool information">
        {/* ── Introduction ──────────────────────────────────────────── */}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4">
            About This Tool
          </h2>
          <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
            {data.intro}
          </p>
        </div>

        {/* ── How to Use ────────────────────────────────────────────── */}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6">
            How to Use
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {data.howToUse.map((step, index) => (
              <div
                key={index}
                className="flex gap-4 p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white text-sm font-bold">
                  {index + 1}
                </span>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{step.step}</p>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Benefits ──────────────────────────────────────────────── */}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6">
            Benefits
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {data.benefits.map((benefit, index) => (
              <div
                key={index}
                className="flex gap-4 p-4 rounded-xl border border-slate-200 bg-white"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  {iconMap[benefit.icon]}
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{benefit.title}</p>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── FAQ Accordion ─────────────────────────────────────────── */}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6">
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {data.faqs.map((faq, index) => (
              <FAQItem
                key={index}
                faq={faq}
                isOpen={openFAQ === index}
                onToggle={() => setOpenFAQ(openFAQ === index ? null : index)}
              />
            ))}
          </div>
        </div>

        {/* ── Internal Links ────────────────────────────────────────── */}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4">
            Related Tools
          </h2>
          <div className="flex flex-wrap gap-3">
            {data.internalLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              >
                {link.label}
                <ArrowRight className="w-4 h-4" />
              </Link>
            ))}
          </div>
        </div>

        {/* ── Trust Block ───────────────────────────────────────────── */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-green-600" /> No signup required
            </span>
            <span className="inline-flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-green-600" /> No watermark
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-green-600" /> 100% private
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Star className="w-4 h-4 text-green-600" /> Completely free
            </span>
          </div>
          <p className="text-center text-xs text-slate-400 mt-3">
            Last updated: {data.lastUpdated}
          </p>
        </div>
      </section>
    </>
  );
};

export default ToolSEOContent;
