export function preprocessCanvasForOcr(
  source: HTMLCanvasElement,
  options?: { contrastBoost?: number; thresholdOffset?: number; binarize?: boolean }
): HTMLCanvasElement {
  const config = {
    contrastBoost: options?.contrastBoost ?? 1.35,
    thresholdOffset: options?.thresholdOffset ?? 0,
    binarize: options?.binarize ?? true,
  };

  const out = document.createElement('canvas');
  out.width = source.width;
  out.height = source.height;
  const ctx = out.getContext('2d');
  if (!ctx) return source;

  ctx.drawImage(source, 0, 0);
  const imageData = ctx.getImageData(0, 0, out.width, out.height);
  const data = imageData.data;

  let sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    sum += lum;
  }
  const mean = sum / (data.length / 4);

  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const boosted = (lum - 128) * config.contrastBoost + 128;

    if (config.binarize) {
      const threshold = Math.max(90, Math.min(205, mean + config.thresholdOffset));
      const bin = boosted > threshold ? 255 : 0;
      data[i] = bin;
      data[i + 1] = bin;
      data[i + 2] = bin;
    } else {
      const v = Math.max(0, Math.min(255, Math.round(boosted)));
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
    }
    data[i + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);
  return out;
}

export function postProcessOcrText(raw: string): string {
  if (!raw) return '';

  let text = raw
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\u00A0/g, ' ')
    .replace(/[¦|]{3,}/g, '')
    .replace(/([A-Za-z])-\s*\n\s*([A-Za-z])/g, '$1$2')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')');

  const lines = text.split('\n').map((line) => line.trim());
  const cleaned: string[] = [];

  for (const line of lines) {
    if (!line) {
      const prev = cleaned[cleaned.length - 1];
      if (prev !== '') cleaned.push('');
      continue;
    }

    const normalized = line
      .replace(/^[•·●▪◦o]\s*/i, '• ')
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (/^[^A-Za-z0-9\u0900-\u097F]+$/.test(normalized)) continue;
    cleaned.push(normalized);
  }

  const merged: string[] = [];
  for (let i = 0; i < cleaned.length; i++) {
    const current = cleaned[i];
    if (current === '') {
      if (merged[merged.length - 1] !== '') merged.push('');
      continue;
    }

    const prev = merged[merged.length - 1];
    if (
      prev &&
      prev !== '' &&
      !/[.!?:;]$/.test(prev) &&
      /^[a-z0-9(]/.test(current) &&
      !/^•\s/.test(current)
    ) {
      merged[merged.length - 1] = `${prev} ${current}`;
    } else {
      merged.push(current);
    }
  }

  text = merged.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return text;
}
