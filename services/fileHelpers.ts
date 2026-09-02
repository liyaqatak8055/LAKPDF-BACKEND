import { setLatestDownload } from '../utils/downloadCenter';

export const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const downloadPdf = (
  data: Uint8Array | Blob,
  filename: string,
  options?: { autoDownload?: boolean }
) => {
  const blob =
    data instanceof Blob
      ? data
      : new Blob([new Uint8Array(data)], { type: 'application/pdf' });
  const autoDownload = options?.autoDownload !== false;

  setLatestDownload({
    filename,
    blob,
    autoDownloaded: autoDownload,
  });

  if (!autoDownload) return;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const downloadFile = (
  data: Blob,
  filename: string,
  options?: { autoDownload?: boolean }
) => {
  const autoDownload = options?.autoDownload !== false;
  setLatestDownload({
    filename,
    blob: data,
    autoDownloaded: autoDownload,
  });

  if (!autoDownload) return;

  const url = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
