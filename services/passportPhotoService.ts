import jsPDF from 'jspdf';

export interface PassportPreset {
  id: string;
  name: string;
  country: string;
  widthMm: number;
  heightMm: number;
  widthPx300Dpi: number;
  heightPx300Dpi: number;
  category: 'popular' | 'india' | 'international' | 'visa';
  description: string;
}

export const PASSPORT_PRESETS: PassportPreset[] = [
  {
    id: 'in-passport',
    name: 'India Passport / Govt / UPSC / SSC',
    country: 'India',
    widthMm: 35,
    heightMm: 45,
    widthPx300Dpi: 413,
    heightPx300Dpi: 531,
    category: 'popular',
    description: 'Standard 3.5 × 4.5 cm for Indian Passport, UPSC, SSC, Railways, Banking, OTR, and State PSC exams.',
  },
  {
    id: 'in-pan',
    name: 'India PAN Card',
    country: 'India',
    widthMm: 25,
    heightMm: 35,
    widthPx300Dpi: 295,
    heightPx300Dpi: 413,
    category: 'india',
    description: 'Standard 2.5 × 3.5 cm official requirement for NSDL & UTIITSL PAN Card applications.',
  },
  {
    id: 'in-stamp',
    name: 'India Stamp Size',
    country: 'India',
    widthMm: 20,
    heightMm: 25,
    widthPx300Dpi: 236,
    heightPx300Dpi: 295,
    category: 'india',
    description: 'Standard 2.0 × 2.5 cm small stamp format for colleges, library cards, and identity passes.',
  },
  {
    id: 'us-visa',
    name: 'US Visa / Passport / Green Card (DS-160)',
    country: 'United States',
    widthMm: 51,
    heightMm: 51,
    widthPx300Dpi: 600,
    heightPx300Dpi: 600,
    category: 'popular',
    description: '2 × 2 inches (51 × 51 mm) square format required by US Department of State and USCIS.',
  },
  {
    id: 'schengen-visa',
    name: 'Schengen / Europe Visa',
    country: 'European Union',
    widthMm: 35,
    heightMm: 45,
    widthPx300Dpi: 413,
    heightPx300Dpi: 531,
    category: 'international',
    description: '35 × 45 mm format with 70–80% head coverage for France, Germany, Italy, Switzerland, and Schengen countries.',
  },
  {
    id: 'uk-passport',
    name: 'UK Passport / Visa',
    country: 'United Kingdom',
    widthMm: 35,
    heightMm: 45,
    widthPx300Dpi: 413,
    heightPx300Dpi: 531,
    category: 'international',
    description: '35 × 45 mm HM Passport Office specifications with light gray or cream background.',
  },
  {
    id: 'ca-visa',
    name: 'Canada Visa / Passport',
    country: 'Canada',
    widthMm: 50,
    heightMm: 70,
    widthPx300Dpi: 591,
    heightPx300Dpi: 827,
    category: 'international',
    description: '50 × 70 mm official Canadian immigration and citizenship passport photo standard.',
  },
  {
    id: 'au-visa',
    name: 'Australia / New Zealand Visa',
    country: 'Australia',
    widthMm: 35,
    heightMm: 45,
    widthPx300Dpi: 413,
    heightPx300Dpi: 531,
    category: 'international',
    description: '35 × 45 mm specification for Australian Department of Home Affairs visa and passport.',
  },
  {
    id: 'ae-visa',
    name: 'Dubai / UAE Visa',
    country: 'UAE',
    widthMm: 40,
    heightMm: 60,
    widthPx300Dpi: 472,
    heightPx300Dpi: 709,
    category: 'visa',
    description: '40 × 60 mm UAE immigration and tourist visa specification with white background.',
  },
];

export interface CropSettings {
  zoom: number; // 0.5 to 3.0
  panX: number; // in pixels
  panY: number; // in pixels
  rotation: number; // 0, 90, 180, 270
  tiltAngle: number; // -45 to 45 degrees
  backgroundColor: 'original' | 'white' | 'light-blue' | 'light-gray';
  border: 'none' | 'thin-white' | 'thin-black';
}

export interface PrintSheetOptions {
  paperSize: '4x6' | 'a4';
  photosCount?: number;
  backgroundColor?: string;
  showCuttingGuides?: boolean;
}

/**
 * Calculates pixel dimensions at 300 DPI for a given mm size.
 */
export const mmToPixels300Dpi = (mm: number): number => {
  return Math.round((mm * 300) / 25.4);
};

/**
 * Renders the single cropped passport photo to an HTML5 canvas at target 300 DPI resolution.
 */
export const renderCroppedPassportPhoto = (
  image: HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
  settings: CropSettings
): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  // Background color handling
  if (settings.backgroundColor === 'white') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  } else if (settings.backgroundColor === 'light-blue') {
    ctx.fillStyle = '#E0F2FE';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  } else if (settings.backgroundColor === 'light-gray') {
    ctx.fillStyle = '#F3F4F6';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  } else {
    // Default white base in case image has transparent areas
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  }

  ctx.save();

  // Move origin to canvas center for rotation & tilt
  ctx.translate(targetWidth / 2 + settings.panX, targetHeight / 2 + settings.panY);

  // Apply total rotation: 90-degree steps + fine tilt
  const totalAngleRad = ((settings.rotation + settings.tiltAngle) * Math.PI) / 180;
  ctx.rotate(totalAngleRad);

  // Compute base scale to cover target canvas (cover fit)
  const baseScale = Math.max(targetWidth / image.naturalWidth, targetHeight / image.naturalHeight);
  const finalScale = baseScale * settings.zoom;

  const drawW = image.naturalWidth * finalScale;
  const drawH = image.naturalHeight * finalScale;

  // Draw centered at transformed origin
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, -drawW / 2, -drawH / 2, drawW, drawH);

  ctx.restore();

  // Draw optional border
  if (settings.border === 'thin-black') {
    ctx.strokeStyle = '#D1D5DB';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, targetWidth - 2, targetHeight - 2);
  } else if (settings.border === 'thin-white') {
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, targetWidth - 4, targetHeight - 4);
  }

  return canvas;
};

/**
 * Arranges multiple passport photos onto a 4x6 inch or A4 printable sheet with cutting guides.
 */
export const generatePhotoSheet = (
  singlePhotoCanvas: HTMLCanvasElement,
  photoWidthMm: number,
  photoHeightMm: number,
  options: PrintSheetOptions
): HTMLCanvasElement => {
  // Dimensions at 300 DPI
  // 4x6 in = 101.6 x 152.4 mm -> 1200 x 1800 px (or landscape 1800 x 1200)
  // A4 = 210 x 297 mm -> 2480 x 3508 px
  let sheetW: number;
  let sheetH: number;

  if (options.paperSize === '4x6') {
    sheetW = 1800; // 6 inch width
    sheetH = 1200; // 4 inch height
  } else {
    sheetW = 2480; // 210 mm
    sheetH = 3508; // 297 mm
  }

  const sheetCanvas = document.createElement('canvas');
  sheetCanvas.width = sheetW;
  sheetCanvas.height = sheetH;
  const ctx = sheetCanvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  // Fill sheet background (crisp white)
  ctx.fillStyle = options.backgroundColor || '#FFFFFF';
  ctx.fillRect(0, 0, sheetW, sheetH);

  const photoW = singlePhotoCanvas.width;
  const photoH = singlePhotoCanvas.height;

  // Margin and gap calculation
  const marginMm = options.paperSize === '4x6' ? 5 : 12;
  const gapMm = 3;

  const marginPx = mmToPixels300Dpi(marginMm);
  const gapPx = mmToPixels300Dpi(gapMm);

  const usableW = sheetW - 2 * marginPx;
  const usableH = sheetH - 2 * marginPx;

  // Compute number of columns and rows that fit
  const cols = Math.floor((usableW + gapPx) / (photoW + gapPx));
  const rows = Math.floor((usableH + gapPx) / (photoH + gapPx));

  if (cols <= 0 || rows <= 0) {
    throw new Error('Photo dimensions too large for chosen paper sheet.');
  }

  // Calculate centering offset
  const gridTotalW = cols * photoW + (cols - 1) * gapPx;
  const gridTotalH = rows * photoH + (rows - 1) * gapPx;

  const startX = Math.floor(marginPx + (usableW - gridTotalW) / 2);
  const startY = Math.floor(marginPx + (usableH - gridTotalH) / 2);

  const maxPhotos = options.photosCount || cols * rows;
  let placed = 0;

  for (let r = 0; r < rows && placed < maxPhotos; r++) {
    for (let c = 0; c < cols && placed < maxPhotos; c++) {
      const x = startX + c * (photoW + gapPx);
      const y = startY + r * (photoH + gapPx);

      // Draw photo
      ctx.drawImage(singlePhotoCanvas, x, y, photoW, photoH);

      // Draw light cutting border
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, photoW, photoH);

      // Draw dashed scissor cutting guides at corners
      if (options.showCuttingGuides !== false) {
        ctx.save();
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);

        const markLen = 14;
        // Top-left
        ctx.beginPath();
        ctx.moveTo(x - markLen, y);
        ctx.lineTo(x, y);
        ctx.moveTo(x, y - markLen);
        ctx.lineTo(x, y);
        ctx.stroke();

        // Top-right
        ctx.beginPath();
        ctx.moveTo(x + photoW, y);
        ctx.lineTo(x + photoW + markLen, y);
        ctx.moveTo(x + photoW, y - markLen);
        ctx.lineTo(x + photoW, y);
        ctx.stroke();

        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(x - markLen, y + photoH);
        ctx.lineTo(x, y + photoH);
        ctx.moveTo(x, y + photoH);
        ctx.lineTo(x, y + photoH + markLen);
        ctx.stroke();

        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(x + photoW, y + photoH);
        ctx.lineTo(x + photoW + markLen, y + photoH);
        ctx.moveTo(x + photoW, y + photoH);
        ctx.lineTo(x + photoW, y + photoH + markLen);
        ctx.stroke();

        ctx.restore();
      }

      placed++;
    }
  }

  // Footer label on the printable sheet
  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    `LAK PDF Passport Photo Maker • ${placed} Photos (${photoWidthMm} × ${photoHeightMm} mm) • Print at 100% Scale / Actual Size`,
    sheetW / 2,
    sheetH - Math.max(16, marginPx / 2)
  );

  return sheetCanvas;
};

/**
 * Exports the sheet as a print-ready PDF using jsPDF.
 */
export const exportPassportPdf = (
  sheetCanvas: HTMLCanvasElement,
  paperSize: '4x6' | 'a4'
): Blob => {
  let doc: jsPDF;

  if (paperSize === '4x6') {
    // 6x4 inches landscape (152.4 x 101.6 mm)
    doc = new jsPDF({
      orientation: 'landscape',
      unit: 'in',
      format: [4, 6],
      compress: true,
    });
    const imgData = sheetCanvas.toDataURL('image/jpeg', 0.95);
    doc.addImage(imgData, 'JPEG', 0, 0, 6, 4);
  } else {
    // A4 portrait (210 x 297 mm)
    doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });
    const imgData = sheetCanvas.toDataURL('image/jpeg', 0.95);
    doc.addImage(imgData, 'JPEG', 0, 0, 210, 297);
  }

  return doc.output('blob');
};

/**
 * Optimizes a photo canvas specifically to meet Indian Government form requirements:
 * strictly between 20 KB and 50 KB (targets ~35 KB), in standard JPEG format.
 */
export const optimizeForGovtPortal = async (
  canvas: HTMLCanvasElement,
  minBytes: number = 20 * 1024,
  maxBytes: number = 50 * 1024
): Promise<Blob> => {
  let lowQuality = 0.4;
  let highQuality = 0.98;
  let bestBlob: Blob | null = null;

  for (let i = 0; i < 8; i++) {
    const midQuality = (lowQuality + highQuality) / 2;
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', midQuality)
    );

    if (!blob) break;

    if (blob.size <= maxBytes && blob.size >= minBytes) {
      bestBlob = blob;
      break;
    }

    if (blob.size > maxBytes) {
      highQuality = midQuality;
      bestBlob = blob;
    } else {
      lowQuality = midQuality;
      bestBlob = blob;
    }
  }

  if (!bestBlob) {
    return new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b || new Blob()), 'image/jpeg', 0.8)
    );
  }

  return bestBlob;
};
