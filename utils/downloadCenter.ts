import { trackEvent } from './analytics';

export interface LatestDownload {
  filename: string;
  blob: Blob;
  toolPath: string;
  createdAt: number;
  autoDownloaded: boolean;
}

type Listener = (download: LatestDownload | null) => void;

let latestDownload: LatestDownload | null = null;
const listeners = new Set<Listener>();

const notifyListeners = () => {
  listeners.forEach((listener) => listener(latestDownload));
};

const resolveToolPath = (toolPath?: string): string => {
  if (toolPath && toolPath.startsWith('/')) return toolPath;
  if (typeof window !== 'undefined' && window.location?.pathname) {
    return window.location.pathname;
  }
  return '/tools';
};

export const setLatestDownload = (payload: {
  filename: string;
  blob: Blob;
  toolPath?: string;
  autoDownloaded?: boolean;
}): void => {
  latestDownload = {
    filename: payload.filename,
    blob: payload.blob,
    toolPath: resolveToolPath(payload.toolPath),
    createdAt: Date.now(),
    autoDownloaded: payload.autoDownloaded !== false,
  };
  notifyListeners();
};

export const getLatestDownload = (): LatestDownload | null => latestDownload;

export const clearLatestDownload = (): void => {
  latestDownload = null;
  notifyListeners();
};

export const subscribeLatestDownload = (listener: Listener): (() => void) => {
  listeners.add(listener);
  listener(latestDownload);
  return () => {
    listeners.delete(listener);
  };
};

export const triggerDownloadFromCenter = (download?: LatestDownload | null): boolean => {
  const target = download ?? latestDownload;
  if (!target) return false;

  const url = URL.createObjectURL(target.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = target.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  trackEvent({
    category: 'File Processing',
    action: 'download_click',
    label: `${target.filename} (download_center)`,
  });

  latestDownload = {
    ...target,
    autoDownloaded: true,
  };
  notifyListeners();

  return true;
};
