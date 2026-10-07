import React, { useState } from 'react';
import { ShieldCheck, Lock, HardDrive, WifiOff, Cpu, EyeOff, Sparkles, CheckCircle2, Bot, ArrowRight } from 'lucide-react';
import { Modal } from './Modal';
import { Link } from 'react-router-dom';

export interface PrivacyBadgeProps {
  className?: string;
  compact?: boolean;
  showAiDisclaimer?: boolean;
}

export const PrivacyBadge: React.FC<PrivacyBadgeProps> = ({
  className = '',
  compact = false,
  showAiDisclaimer = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="group relative inline-flex items-center">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer shadow-xs border ${
            compact
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-emerald-50/90 text-emerald-800 border-emerald-200/80 hover:bg-emerald-100 hover:border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/80'
          } ${className}`}
          title="Core tools run locally; AI features use external APIs — Click to view Privacy Guarantee"
          aria-label="Privacy guarantee: Core tools run locally, AI features use external APIs"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          <span>100% Private</span>
          <span className="hidden sm:inline font-normal text-emerald-600 dark:text-emerald-400">· Zero Uploads</span>
          {showAiDisclaimer && (
            <span className="hidden md:inline text-[10px] text-slate-500 dark:text-slate-400 font-normal border-l border-emerald-200 dark:border-emerald-800 pl-1.5 ml-0.5">
              Core local • AI external
            </span>
          )}
        </button>

        {/* Hover Tooltip */}
        <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex group-focus-within:flex flex-col items-center z-50 whitespace-nowrap transition-opacity duration-150">
          <div className="bg-slate-900 text-white text-[11px] font-medium py-1.5 px-3 rounded-lg shadow-xl border border-slate-700">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Core tools run locally; AI features use external APIs</span>
            </div>
          </div>
          <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1 border-r border-b border-slate-700"></div>
        </div>
      </div>

      <PrivacyGuaranteeModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

export const PrivacyGuaranteeModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Privacy & Architecture Guarantee"
      contentClassName="max-w-2xl"
    >
      <div className="space-y-4 text-slate-700 dark:text-slate-300 text-sm">
        {/* Highlight Card */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-200 dark:border-emerald-800/60">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-600 text-white shrink-0 shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Core tools run locally; AI features use external APIs
              </h3>
              <p className="mt-1 text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed">
                We believe in complete architectural transparency. Unlike traditional cloud PDF websites that silently upload your confidential documents, LAKPDF maintains a strict two-tier execution model:
              </p>
            </div>
          </div>
        </div>

        {/* Two-Tier Architectural Separation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Tier 1: Core Document Tools */}
          <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/40 dark:bg-emerald-950/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-md">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  Core Tools (100% Local)
                </span>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Zero Uploads</span>
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-xs mb-1">
                In-Browser WebAssembly Sandbox
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
                Merge, Split, Compress, Crop, Rotate, Redact, Sign, Encrypt, Watermark, Convert, OCR, and Passport Photo Maker execute entirely within your device&apos;s memory (RAM).
              </p>
            </div>
            <div className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-100/60 dark:bg-emerald-900/40 rounded p-1.5 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>0 bytes sent to external servers</span>
            </div>
          </div>

          {/* Tier 2: AI Features */}
          <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/40 dark:bg-indigo-950/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/60 px-2 py-0.5 rounded-md">
                  <Bot className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                  AI Features (External APIs)
                </span>
                <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">On-Demand Only</span>
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-xs mb-1">
                AI Summarizer & Interactive Q&A
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
                Specialized AI tools connect to external AI API providers (Google Gemini, OpenAI, or Groq) strictly when requested to produce summaries or answer prompts.
              </p>
            </div>
            <div className="text-[11px] font-medium text-indigo-800 dark:text-indigo-300 bg-indigo-100/60 dark:bg-indigo-900/40 rounded p-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>Never used to train public foundation models</span>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <div className="p-3 rounded-lg border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-hover/40">
            <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white text-xs mb-1">
              <WifiOff className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Works Completely Offline</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Once loaded, core tools work with Wi-Fi or data turned off. 100% air-gap capable for secure workflows.
            </p>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-hover/40">
            <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white text-xs mb-1">
              <HardDrive className="w-4 h-4 text-indigo-500" />
              <span>Zero Cloud Retention</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              We operate zero document databases. As soon as you reload or close the tab, all memory is instantly freed.
            </p>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-hover/40">
            <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white text-xs mb-1">
              <EyeOff className="w-4 h-4 text-rose-500" />
              <span>Safe for Sensitive Documents</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Engineered for Aadhaar cards, PAN cards, bank statements, tax returns, contracts, and exam certificates.
            </p>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-hover/40">
            <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white text-xs mb-1">
              <ShieldCheck className="w-4 h-4 text-primary-500" />
              <span>DPDP & GDPR Compliant</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Strict privacy by design respecting India&apos;s DPDP 2023 and European GDPR standards.
            </p>
          </div>
        </div>

        {/* Live Network Transparency Badge */}
        <div className="p-3 rounded-lg bg-slate-100 dark:bg-dark-hover border border-slate-200 dark:border-dark-border text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-slate-600 dark:text-slate-300 font-medium">Core Tools Network Sent:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">0 Bytes (Zero file upload)</span>
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
            Air-Gapped Ready
          </span>
        </div>

        {/* Action Footer */}
        <div className="pt-2 flex items-center justify-between">
          <Link
            to="/privacy-policy"
            onClick={onClose}
            className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
          >
            <span>Read Complete Privacy Policy</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </Modal>
  );
};
