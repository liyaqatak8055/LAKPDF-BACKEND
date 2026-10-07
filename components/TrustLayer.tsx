import React, { useEffect, useState } from 'react';
import { FileText, ShieldCheck, Sparkles, Activity, Layers3, Lock, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../utils/apiBase';
import { PrivacyGuaranteeModal } from './PrivacyBadgeModal';

interface TrustLayerProps {
  toolCount: number;
}

type ServiceStatus = 'checking' | 'online' | 'unavailable';

const fetchFilesProcessedToday = async (): Promise<number | null> => {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(`${API_BASE_URL}/metrics/files-processed-today`, {
      method: 'GET',
      credentials: 'omit',
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!response.ok) return null;
    const data = await response.json();
    const value = Number(data?.filesProcessedToday);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
};

const fetchServiceStatus = async (): Promise<ServiceStatus> => {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      credentials: 'omit',
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!response.ok) return 'unavailable';
    const data = await response.json();
    return data?.ok === true ? 'online' : 'unavailable';
  } catch {
    return 'unavailable';
  }
};

export const TrustLayer: React.FC<TrustLayerProps> = ({ toolCount }) => {
  const [filesProcessedToday, setFilesProcessedToday] = useState<number | null>(null);
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>('checking');
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const [filesToday, status] = await Promise.all([
        fetchFilesProcessedToday(),
        fetchServiceStatus(),
      ]);

      if (cancelled) return;
      setFilesProcessedToday(filesToday);
      setServiceStatus(status);
    };

    let timer: number;
    const trigger = () => {
      window.removeEventListener('scroll', trigger);
      window.removeEventListener('pointerdown', trigger);
      window.clearTimeout(timer);
      if (!cancelled) {
        if ('requestIdleCallback' in window) {
          (window as Window & typeof globalThis).requestIdleCallback(() => {
            if (!cancelled) load();
          }, { timeout: 4000 });
        } else {
          load();
        }
      }
    };

    window.addEventListener('scroll', trigger, { passive: true, once: true });
    window.addEventListener('pointerdown', trigger, { passive: true, once: true });
    timer = window.setTimeout(trigger, 6000);

    return () => {
      cancelled = true;
      window.removeEventListener('scroll', trigger);
      window.removeEventListener('pointerdown', trigger);
      window.clearTimeout(timer);
    };
  }, []);

  const statusLabel =
    serviceStatus === 'checking'
      ? 'Checking now'
      : serviceStatus === 'online'
        ? 'Online now'
        : 'Status unavailable';

  const statusTone =
    serviceStatus === 'online'
      ? 'text-emerald-700 dark:text-emerald-400'
      : serviceStatus === 'checking'
        ? 'text-slate-600 dark:text-slate-400'
        : 'text-amber-700 dark:text-amber-400';

  return (
    <section className="mx-auto max-w-7xl px-4 pb-4 md:px-8">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6 dark:border-dark-border dark:bg-dark-surface">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(380px,1fr)] lg:items-start">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200/80 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Two-Tier Trust Guarantee
            </div>
            <h2 className="text-xl font-bold text-slate-900 md:text-2xl dark:text-dark-text-primary">
              Core tools run locally; AI features use external APIs
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 md:text-base dark:text-dark-text-secondary">
              Core PDF and image utilities (Merge, Compress, Split, Redact, Sign, Crop, Rotate, Encrypt, Watermark, OCR, Passport Photos) run 100% locally in your browser RAM with zero cloud uploads or server storage. Optional generative AI features (AI Summarizer, Q&A) communicate directly with external AI API providers only upon your explicit request.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-medium">
              <button
                type="button"
                onClick={() => setIsPrivacyModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>View Architecture Guarantee</span>
              </button>
              <Link to="/privacy-policy" className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
                Read Privacy Policy
              </Link>
              <Link to="/terms-of-service" className="text-slate-600 hover:text-slate-900 dark:text-dark-text-secondary dark:hover:text-dark-text-primary">
                Terms of Service
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-4 dark:border-dark-border dark:bg-dark-bg/60">
              <div className="mb-2 flex items-center gap-2 text-slate-500 dark:text-dark-text-muted">
                <Layers3 className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">Tools</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-dark-text-primary">{toolCount}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-dark-text-muted">Available workflows</p>
            </div>

            <div className="rounded-lg border border-slate-200 p-4 dark:border-dark-border dark:bg-dark-bg/60">
              <div className="mb-2 flex items-center gap-2 text-slate-500 dark:text-dark-text-muted">
                <FileText className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">Processed today</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-dark-text-primary">
                {filesProcessedToday === null ? '—' : filesProcessedToday.toLocaleString('en-IN')}
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-dark-text-muted">
                {filesProcessedToday === null ? 'Live metric unavailable' : 'Successful outputs'}
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 p-4 dark:border-dark-border dark:bg-dark-bg/60">
              <div className="mb-2 flex items-center gap-2 text-slate-500 dark:text-dark-text-muted">
                <Sparkles className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">Formats</span>
              </div>
              <p className="text-sm font-semibold leading-6 text-slate-900 dark:text-dark-text-primary">
                PDF, JPG, PNG, BMP, DOC, DOCX, PPT, PPTX
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-dark-text-muted">Supported in current tools</p>
            </div>

            <div className="rounded-lg border border-slate-200 p-4 dark:border-dark-border dark:bg-dark-bg/60">
              <div className="mb-2 flex items-center gap-2 text-slate-500 dark:text-dark-text-muted">
                <Activity className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">Service status</span>
              </div>
              <p className={`text-lg font-bold ${statusTone}`}>{statusLabel}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-dark-text-muted">Live API health check</p>
            </div>
          </div>
        </div>
      </div>

      <PrivacyGuaranteeModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
      />
    </section>
  );
};
