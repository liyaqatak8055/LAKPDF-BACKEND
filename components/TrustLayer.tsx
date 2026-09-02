import React, { useEffect, useState } from 'react';
import { FileText, ShieldCheck, Sparkles, Activity, Layers3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../utils/apiBase';

interface TrustLayerProps {
  toolCount: number;
}

type ServiceStatus = 'checking' | 'online' | 'unavailable';

const fetchFilesProcessedToday = async (): Promise<number | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/metrics/files-processed-today`, {
      method: 'GET',
      credentials: 'omit',
      cache: 'no-store',
    });
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
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      credentials: 'omit',
      cache: 'no-store',
    });
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

    load();
    return () => {
      cancelled = true;
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
      ? 'text-emerald-700'
      : serviceStatus === 'checking'
        ? 'text-slate-600'
        : 'text-amber-700';

  return (
    <section className="mx-auto max-w-7xl px-4 pb-4 md:px-8">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(380px,1fr)] lg:items-start">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              <ShieldCheck className="h-4 w-4 text-primary-500" />
              Privacy summary
            </div>
            <h2 className="text-xl font-bold text-slate-900 md:text-2xl">
              Clear handling for core tools and AI features
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
              Most everyday PDF tools run in your browser. AI tools are different: they may send extracted text to configured AI providers so they can generate answers. Files and text are used only for the workflow you request, as described in the privacy policy.
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm font-medium">
              <Link to="/privacy-policy" className="text-primary-600 hover:text-primary-700">
                Read Privacy Policy
              </Link>
              <Link to="/terms-of-service" className="text-slate-600 hover:text-slate-900">
                Terms of Service
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="mb-2 flex items-center gap-2 text-slate-500">
                <Layers3 className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">Tools</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{toolCount}</p>
              <p className="mt-1 text-sm text-slate-500">Available workflows</p>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <div className="mb-2 flex items-center gap-2 text-slate-500">
                <FileText className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">Processed today</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {filesProcessedToday === null ? '—' : filesProcessedToday.toLocaleString('en-IN')}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {filesProcessedToday === null ? 'Live metric unavailable' : 'Successful outputs'}
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <div className="mb-2 flex items-center gap-2 text-slate-500">
                <Sparkles className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">Formats</span>
              </div>
              <p className="text-sm font-semibold leading-6 text-slate-900">
                PDF, JPG, PNG, BMP, DOC, DOCX, PPT, PPTX
              </p>
              <p className="mt-1 text-sm text-slate-500">Supported in current tools</p>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <div className="mb-2 flex items-center gap-2 text-slate-500">
                <Activity className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">Service status</span>
              </div>
              <p className={`text-lg font-bold ${statusTone}`}>{statusLabel}</p>
              <p className="mt-1 text-sm text-slate-500">Live API health check</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
