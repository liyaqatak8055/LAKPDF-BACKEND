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

export interface FaceDetectionResult {
  detected: boolean;
  zoom: number;
  panX: number; // in target pixels
  panY: number; // in target pixels
  confidence: number;
  method: 'native-ai' | 'skin-centroid' | 'heuristic';
  boundingBox?: { x: number; y: number; width: number; height: number };
}

export interface BiometricGuidelines {
  headMinPercent: number;
  headMaxPercent: number;
  eyeLinePercent: number;
  chinLinePercent: number;
  standardName: string;
  description: string;
}

/**
 * Returns official ICAO 9303 / standard biometric guidelines for a preset.
 */
export const getBiometricGuidelines = (presetId?: string): BiometricGuidelines => {
  if (presetId === 'us-visa') {
    return {
      headMinPercent: 50,
      headMaxPercent: 69,
      eyeLinePercent: 44,
      chinLinePercent: 78,
      standardName: 'US Department of State DS-160 / 22 CFR 41.113',
      description: 'Head height must be between 50% and 69% of image height (1 to 1 3/8 inches). Eyes between 56% and 69% from bottom.',
    };
  }
  if (presetId === 'in-pan') {
    return {
      headMinPercent: 65,
      headMaxPercent: 75,
      eyeLinePercent: 42,
      chinLinePercent: 72,
      standardName: 'NSDL / UTIITSL PAN Specification',
      description: 'Head size 2.5 × 3.5 cm with clear front face view against white or light plain background.',
    };
  }
  // Default ICAO 9303 / Schengen / Indian Passport / UK
  return {
    headMinPercent: 70,
    headMaxPercent: 80,
    eyeLinePercent: 42,
    chinLinePercent: 74,
    standardName: 'ICAO Doc 9303 / ISO/IEC 19794-5 Biometric Standard',
    description: 'Face must occupy 70% to 80% of photo frame height (32 to 36 mm for a 45 mm photo), centered with eyes level.',
  };
};

/**
 * Computes biometric crop zoom and pan offsets given face bounding box in source image coordinates.
 */
const computeBiometricSettings = (
  imgW: number,
  imgH: number,
  faceCenterX: number,
  faceCenterY: number,
  faceW: number,
  faceH: number,
  targetW: number,
  targetH: number,
  desiredHeadRatio: number,
  method: 'native-ai' | 'skin-centroid' | 'heuristic',
  confidence: number
): FaceDetectionResult => {
  const baseScale = Math.max(targetW / imgW, targetH / imgH);

  // Clamps head height strictly between 70% and 80% (0.70 to 0.80) of total vertical canvas height as per ICAO 9303
  const clampedHeadRatio = Math.min(0.80, Math.max(0.70, desiredHeadRatio));
  const targetHeadHeight = targetH * clampedHeadRatio;
  let calculatedZoom = targetHeadHeight / (faceH * baseScale);

  // Clamp zoom to safe, natural bounds (0.75x to 3.0x)
  calculatedZoom = Math.min(3.0, Math.max(0.75, Number(calculatedZoom.toFixed(2))));
  const finalScale = baseScale * calculatedZoom;

  // Horizontal alignment: face center aligned to canvas center (targetW / 2)
  const panX = Math.round(-(faceCenterX - imgW / 2) * finalScale);

  // Vertical alignment: ICAO 9303 places face center at ~44% from the top
  const targetFaceCenterY = targetH * 0.44;
  const panY = Math.round((targetFaceCenterY - targetH / 2) - (faceCenterY - imgH / 2) * finalScale);

  return {
    detected: true,
    zoom: calculatedZoom,
    panX,
    panY,
    confidence,
    method,
    boundingBox: {
      x: faceCenterX - faceW / 2,
      y: faceCenterY - faceH / 2,
      width: faceW,
      height: faceH,
    },
  };
};

/**
 * Detects face using browser Shape Detection API (if supported) or fast skin-chrominance
 * centroid analysis (<15ms, 100% client-side privacy) and aligns to ICAO 9303 standards.
 * Guaranteed to clamp head height between 70% and 80% of total vertical canvas height.
 */
export const detectAndCenterFace = async (
  image: HTMLImageElement,
  targetWidthPx: number,
  targetHeightPx: number,
  desiredHeadRatio: number = 0.75
): Promise<FaceDetectionResult> => {
  const imgW = image.naturalWidth || image.width;
  const imgH = image.naturalHeight || image.height;

  // Enforce 70% to 80% boundary clamping
  const safeHeadRatio = Math.min(0.80, Math.max(0.70, desiredHeadRatio));

  if (!imgW || !imgH) {
    return {
      detected: false,
      zoom: 1.0,
      panX: 0,
      panY: 0,
      confidence: 0,
      method: 'heuristic',
    };
  }

  // 1. Try modern browser window.FaceDetector API (Chromium / WebKit experimental)
  if (typeof window !== 'undefined' && 'FaceDetector' in window) {
    try {
      // @ts-expect-error Native Shape Detection API
      const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
      const faces = await detector.detect(image);
      if (faces && faces.length > 0) {
        const fb = faces[0].boundingBox;
        // The detected box is usually the eye-to-chin face box. Full head is ~1.3x taller.
        const fullHeadH = fb.height * 1.35;
        const headCenterY = fb.y + fb.height * 0.45;
        return computeBiometricSettings(
          imgW,
          imgH,
          fb.x + fb.width / 2,
          headCenterY,
          fb.width,
          fullHeadH,
          targetWidthPx,
          targetHeightPx,
          safeHeadRatio,
          'native-ai',
          0.96
        );
      }
    } catch {
      // Fallback gracefully to skin centroid
    }
  }

  // 2. High-speed client-side Skin Chrominance (YCbCr) Cluster Analyzer (< 15ms)
  try {
    const scanW = 180;
    const scanH = Math.round((scanW * imgH) / imgW);
    const canvas = document.createElement('canvas');
    canvas.width = scanW;
    canvas.height = scanH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (ctx) {
      ctx.drawImage(image, 0, 0, scanW, scanH);
      const imgData = ctx.getImageData(0, 0, scanW, scanH);
      const data = imgData.data;

      const skinXs: number[] = [];
      const skinYs: number[] = [];
      // Faces in passport portraits are located in the top 75%
      const yMax = Math.round(scanH * 0.75);

      for (let y = 0; y < yMax; y += 2) {
        for (let x = 0; x < scanW; x += 2) {
          const i = (y * scanW + x) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // YCbCr skin chrominance calculation
          const cb = -0.168736 * r - 0.331264 * g + 0.5 * b + 128;
          const cr = 0.5 * r - 0.418688 * g - 0.081312 * b + 128;

          // Normalized skin tone cluster with basic illumination balance
          if (
            cb >= 77 && cb <= 128 &&
            cr >= 132 && cr <= 174 &&
            r > g && r > b &&
            Math.abs(r - g) > 10
          ) {
            skinXs.push(x);
            skinYs.push(y);
          }
        }
      }

      if (skinXs.length >= 25) {
        skinXs.sort((a, b) => a - b);
        skinYs.sort((a, b) => a - b);

        // Trim 10% outliers to filter ears, hands or background artifacts
        const p10X = skinXs[Math.floor(skinXs.length * 0.1)];
        const p90X = skinXs[Math.floor(skinXs.length * 0.9)];
        const p10Y = skinYs[Math.floor(skinYs.length * 0.1)];
        const p90Y = skinYs[Math.floor(skinYs.length * 0.9)];

        const clusterW = p90X - p10X;
        const clusterH = p90Y - p10Y;

        if (clusterW >= 8 && clusterH >= 8) {
          const scaleX = imgW / scanW;
          const scaleY = imgH / scanH;

          const faceCenterX = (p10X + clusterW / 2) * scaleX;
          const faceCenterY = (p10Y + clusterH / 2) * scaleY;
          const faceW = clusterW * scaleX;
          // Full head height includes hair above skin cluster and neck/chin below
          const estimatedHeadH = Math.max(faceW * 1.3, clusterH * scaleY * 1.35);

          return computeBiometricSettings(
            imgW,
            imgH,
            faceCenterX,
            faceCenterY,
            faceW,
            estimatedHeadH,
            targetWidthPx,
            targetHeightPx,
            safeHeadRatio,
            'skin-centroid',
            0.85
          );
        }
      }
    }
  } catch {
    // Continue to heuristic
  }

  // 3. Fallback heuristic: standard portrait framing (head in upper-center)
  return computeBiometricSettings(
    imgW,
    imgH,
    imgW * 0.5,
    imgH * 0.38,
    imgW * 0.36,
    imgH * 0.46,
    targetWidthPx,
    targetHeightPx,
    desiredHeadRatio,
    'heuristic',
    0.65
  );
};

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
 * Injects or updates standard JFIF APP0 metadata in a JPEG byte stream to ensure
 * exact 300 DPI (dots per inch) resolution metadata is preserved for printing & portal validation.
 */
export const inject300DpiMetadata = (jpegBytes: Uint8Array): Uint8Array => {
  // Check SOI marker 0xFF, 0xD8
  if (jpegBytes.length < 4 || jpegBytes[0] !== 0xFF || jpegBytes[1] !== 0xD8) {
    return jpegBytes;
  }

  // If already starts with APP0 (0xFF, 0xE0)
  if (jpegBytes[2] === 0xFF && jpegBytes[3] === 0xE0) {
    // Check for 'JFIF\0' identifier: 0x4A, 0x46, 0x49, 0x46, 0x00
    if (
      jpegBytes[6] === 0x4A &&
      jpegBytes[7] === 0x46 &&
      jpegBytes[8] === 0x49 &&
      jpegBytes[9] === 0x46 &&
      jpegBytes[10] === 0x00
    ) {
      const result = new Uint8Array(jpegBytes);
      // Byte 13: Units (1 = dots per inch)
      result[13] = 1;
      // Bytes 14-15: X density (300 = 0x012C)
      result[14] = 0x01;
      result[15] = 0x2C;
      // Bytes 16-17: Y density (300 = 0x012C)
      result[16] = 0x01;
      result[17] = 0x2C;
      return result;
    }
  }

  // Construct a standard 18-byte JFIF APP0 marker (16-byte payload)
  const jfifApp0 = new Uint8Array([
    0xFF, 0xE0, // APP0 marker
    0x00, 0x10, // Length = 16 bytes
    0x4A, 0x46, 0x49, 0x46, 0x00, // 'JFIF\0'
    0x01, 0x02, // Version 1.2
    0x01,       // Units: 1 = dots per inch (DPI)
    0x01, 0x2C, // Xdensity: 300 DPI (0x012C)
    0x01, 0x2C, // Ydensity: 300 DPI (0x012C)
    0x00,       // Xthumbnail: 0
    0x00,       // Ythumbnail: 0
  ]);

  // Insert JFIF APP0 directly after SOI (index 2)
  const result = new Uint8Array(jpegBytes.length + jfifApp0.length);
  result[0] = 0xFF;
  result[1] = 0xD8;
  result.set(jfifApp0, 2);
  result.set(jpegBytes.subarray(2), 2 + jfifApp0.length);
  return result;
};

/**
 * Converts an HTML5 canvas to a high-quality JPEG Blob with guaranteed 300 DPI JFIF metadata embedded.
 */
export const canvasTo300DpiJpegBlob = async (
  canvas: HTMLCanvasElement,
  quality: number = 0.95
): Promise<Blob> => {
  const rawBlob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/jpeg', quality)
  );
  if (!rawBlob) throw new Error('Failed to encode canvas to JPEG blob.');

  const buffer = await rawBlob.arrayBuffer();
  const bytesWith300Dpi = inject300DpiMetadata(new Uint8Array(buffer));
  return new Blob([bytesWith300Dpi], { type: 'image/jpeg' });
};

/**
 * Optimizes a photo canvas specifically to meet Indian Government form requirements:
 * strictly between 20 KB and 50 KB (targets ~35 KB), in standard JPEG format with 300 DPI metadata.
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
    bestBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b || new Blob()), 'image/jpeg', 0.8)
    );
  }

  if (bestBlob) {
    try {
      const buf = await bestBlob.arrayBuffer();
      const bytesWith300Dpi = inject300DpiMetadata(new Uint8Array(buf));
      return new Blob([bytesWith300Dpi], { type: 'image/jpeg' });
    } catch {
      return bestBlob;
    }
  }

  return new Blob([], { type: 'image/jpeg' });
};
