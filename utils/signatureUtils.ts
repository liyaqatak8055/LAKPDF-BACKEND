/**
 * Signature processing and Fill & Sign utility functions
 * Handles background transparency cleaning, ink recoloring, and date/initial stamping.
 */

export interface SignatureCleanOptions {
  removeWhiteBackground?: boolean;
  inkColor?: 'original' | 'black' | 'blue';
  threshold?: number; // 0 - 255, default 210
}

/**
 * Removes white/paper backgrounds from signatures and applies crisp ink recoloring
 */
export async function cleanSignatureImage(
  dataUrl: string,
  options: SignatureCleanOptions = {}
): Promise<string> {
  const {
    removeWhiteBackground = true,
    inkColor = 'original',
    threshold = 210,
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        if (removeWhiteBackground || inkColor !== 'original') {
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            if (a === 0) continue;

            // Perceptual brightness / luminance
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;

            if (removeWhiteBackground) {
              if (lum >= threshold) {
                // Background paper pixel -> completely transparent
                data[i + 3] = 0;
                continue;
              } else {
                // Soft anti-aliased edge calculation
                const edgeRatio = 1 - lum / threshold;
                const newAlpha = Math.min(255, Math.max(0, Math.round(edgeRatio * 255 * 1.5)));
                data[i + 3] = Math.min(a, newAlpha);
              }
            }

            // Apply selected ink color to non-transparent stroke pixels
            if (inkColor === 'blue') {
              data[i] = 0;       // Red
              data[i + 1] = 43;  // Green
              data[i + 2] = 127; // Blue (Royal Legal Navy)
            } else if (inkColor === 'black') {
              data[i] = 17;      // Red
              data[i + 1] = 17;  // Green
              data[i + 2] = 17;  // Blue (Deep Black)
            }
          }

          ctx.putImageData(imgData, 0, 0);
        }

        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        console.error('cleanSignatureImage failed:', err);
        resolve(dataUrl);
      }
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/**
 * Generates a clean, transparent PNG date stamp
 */
export function generateDateStamp(
  dateText: string,
  options: { inkColor?: 'black' | 'blue' } = {}
): string {
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 120;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const color = options.inkColor === 'blue' ? '#002B7F' : '#111111';
  ctx.fillStyle = color;
  ctx.font = '600 52px "Segoe UI", Arial, sans-serif';
  ctx.textBaseline = 'middle';

  const text = dateText.trim() || new Date().toISOString().split('T')[0];
  const metrics = ctx.measureText(text);
  const x = Math.max(10, (canvas.width - metrics.width) / 2);
  const y = canvas.height / 2;

  ctx.fillText(text, x, y);
  return canvas.toDataURL('image/png');
}

/**
 * Generates a typed signature with font choices
 */
export function generateTypedSignatureDataUrl(
  text: string,
  fontFamily: 'cursive' | 'serif' | 'sans' = 'cursive',
  inkColor: 'black' | 'blue' = 'black'
): string {
  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 240;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const fontStyle =
    fontFamily === 'cursive'
      ? '"Brush Script MT", "Segoe Script", "Dancing Script", cursive'
      : fontFamily === 'serif'
      ? 'Georgia, "Times New Roman", serif'
      : '"Trebuchet MS", Arial, sans-serif';

  const color = inkColor === 'blue' ? '#002B7F' : '#111111';
  ctx.fillStyle = color;
  ctx.font = `700 110px ${fontStyle}`;
  ctx.textBaseline = 'middle';

  const safeText = text.trim();
  const metrics = ctx.measureText(safeText);
  const textWidth = Math.min(canvas.width - 40, Math.ceil(metrics.width));
  const x = Math.max(20, (canvas.width - textWidth) / 2);
  const y = canvas.height / 2;

  ctx.fillText(safeText, x, y);
  return canvas.toDataURL('image/png');
}
