import React, { useState } from 'react';
import { ShieldCheck, Lock, HardDrive, WifiOff, CheckCircle2, Cpu, EyeOff, X, Sparkles } from 'lucide-react';
import { Modal } from './Modal';

export const PrivacyBadge: React.FC<{ className?: string; compact?: boolean }> = ({
  className = '',
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer shadow-xs border ${
          compact
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
            : 'bg-emerald-50/90 text-emerald-800 border-emerald-200/80 hover:bg-emerald-100 hover:border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/80'
        } ${className}`}
        title="Click to view our 100% Client-Side Privacy Guarantee"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
        <span>100% Private</span>
        <span className="hidden sm:inline font-normal text-emerald-600 dark:text-emerald-400">· Zero Uploads</span>
      </button>

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
      title="100% Client-Side Privacy Guarantee"
      contentClassName="max-w-xl"
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
                Your files never touch any remote server
              </h3>
              <p className="mt-1 text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed">
                Unlike traditional PDF websites that upload your confidential documents to cloud servers,
                LAKPDF processes PDF, images, and signatures <strong>100% locally inside your web browser</strong> using WebAssembly and HTML5 Canvas.
              </p>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="p-3 rounded-lg border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-hover/40">
            <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white text-xs mb-1.5">
              <Cpu className="w-4 h-4 text-primary-500" />
              <span>In-Browser Processing</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Your device&apos;s own CPU and memory do all the heavy lifting. Nothing is uploaded, stored, or snooped.
            </p>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-hover/40">
            <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white text-xs mb-1.5">
              <WifiOff className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Works Completely Offline</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Once loaded, you can literally turn off your Wi-Fi or mobile data — the tools will continue to work flawlessly.
            </p>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-hover/40">
            <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white text-xs mb-1.5">
              <HardDrive className="w-4 h-4 text-indigo-500" />
              <span>Zero Cloud Retention</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              We have zero file database. As soon as you refresh or close the tab, all temporary memory is immediately freed.
            </p>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-hover/40">
            <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white text-xs mb-1.5">
              <EyeOff className="w-4 h-4 text-rose-500" />
              <span>Safe for Sensitive Docs</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Perfect for Aadhaar cards, PAN cards, bank statements, tax filings, legal contracts, and exam certificates.
            </p>
          </div>
        </div>

        {/* Live Network Transparency Badge */}
        <div className="p-3 rounded-lg bg-slate-100 dark:bg-dark-hover border border-slate-200 dark:border-dark-border text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-slate-600 dark:text-slate-300 font-medium">Network Data Sent:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">0 Bytes (Zero file upload)</span>
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
            Air-Gapped Ready
          </span>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </Modal>
  );
};
