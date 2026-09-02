/**
 * fix-helmet-meta.mjs
 * Adds og:image + Twitter card meta tags to all tool pages,
 * and adds missing canonical/og:url/og:type where needed.
 *
 * Run: node scripts/fix-helmet-meta.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const OG_IMAGE = 'https://lakpdf.com/og-image.png';
const SITE = 'https://lakpdf.com';

// ── Tool pages: [filename, canonical-path, title, description] ─────────
const PAGES = [
  // Pages that already have canonical/og:url/og:type but are missing og:image + twitter
  ['pages/MergePdf.tsx',           '/merge',               'Merge PDF Online Free | Combine PDF Files - LAK PDF',                     'Merge PDF files online for free. Combine multiple PDFs in seconds without installing software.'],
  ['pages/SplitPdf.tsx',           '/split',               'Split PDF Online Free | Extract PDF Pages - LAK PDF',                     'Split PDF online for free. Extract pages or separate PDF files in one click.'],
  ['pages/WordToPdf.tsx',          '/word-to-pdf',         'Word to PDF Online Free | DOCX to PDF - LAK PDF',                        'Convert Word to PDF online free. Upload DOC/DOCX and download PDF instantly.'],
  ['pages/PowerPointToPdf.tsx',    '/powerpoint-to-pdf',   'PowerPoint to PDF Online Free | PPT to PDF - LAK PDF',                   'Convert PowerPoint to PDF online free. Turn PPT/PPTX slides into PDF quickly.'],
  ['pages/PdfToJpg.tsx',           '/pdf-to-img',          'PDF to JPG Online Free | Convert PDF to Images - LAK PDF',               'Convert PDF to JPG images online for free. Export pages as high-quality images.'],
  ['pages/SignPdf.tsx',            '/sign-pdf',            'Sign PDF Online Free | Add Signature - LAK PDF',                         'Sign PDF online for free. Add your digital signature and download instantly.'],
  ['pages/ScanPdf.tsx',            '/scan-pdf',            'Scan to PDF Online | OCR Scanner - LAK PDF',                            'Scan to PDF online and enhance readability with OCR-ready processing.'],
  ['pages/OcrPdf.tsx',             '/ocr-pdf',             'OCR PDF Online Free | Extract Text from PDF - LAK PDF',                  'OCR PDF online free and extract searchable text from scanned PDF files.'],
  ['pages/RotatePdf.tsx',          '/rotate',              'Rotate PDF Pages Online Free - LAK PDF',                                 'Rotate PDF pages online free. Fix page orientation in a few clicks.'],
  ['pages/WatermarkPdf.tsx',       '/watermark',           'Watermark PDF Online Free | Add Text Watermark - LAK PDF',               'Add text watermark to PDF online free for branding and document protection.'],
  ['pages/DeletePage.tsx',         '/delete-page',         'Delete PDF Pages Online Free - LAK PDF',                                 'Delete pages from PDF online for free and save a cleaned PDF instantly.'],
  ['pages/CropPdf.tsx',            '/crop-pdf',            'Crop PDF Online Free | Trim PDF Pages - LAK PDF',                       'Crop PDF pages online for free. Trim margins and clean up document layout.'],
  ['pages/ImageToPdf.tsx',         '/img-to-pdf',          'JPG to PDF Online Free | Image to PDF Converter - LAK PDF',              'Convert JPG, PNG and images to PDF online for free in seconds.'],
  ['pages/CompressImage.tsx',      '/compress-img',        'Compress Image Online Free | Reduce Image Size - LAK PDF',               'Compress image online free and reduce JPG/PNG size quickly without losing quality.'],
  ['pages/AdvanceCompressImage.tsx','/advance-compress-img','Advanced Image Compressor Online Free - LAK PDF',                       'Advanced image compression with quality control and format conversion.'],
  ['pages/OrganizePdf.tsx',        '/organize-pdf',        'Organize PDF Pages Online | Reorder PDF - LAK PDF',                     'Organize PDF pages online. Reorder, move and manage pages with a simple drag-and-drop workflow.'],
  ['pages/PageNumbers.tsx',        '/page-number',         'Add Page Numbers to PDF Online Free - LAK PDF',                         'Add page numbers to PDF online for free with custom position and format.'],
  ['pages/ProtectPdf.tsx',         '/protect-pdf',         'Protect PDF Online Free | Password Protect PDF - LAK PDF',              'Password protect PDF online free. Add encryption to prevent unauthorized access to your PDF.'],
  ['pages/ConvertPdf.tsx',         '/convert',             'Convert PDF Online Free | PDF Converter - LAK PDF',                     'Convert PDF to Word, PowerPoint, and images online free.'],
  ['pages/PdfToPowerPoint.tsx',    '/pdf-to-powerpoint',   'PDF to PowerPoint Online Free | PDF to PPT - LAK PDF',                  'Convert PDF to PowerPoint online free. Export PDF slides to editable PPT.'],
  ['pages/PdfToText.tsx',          '/pdf-to-text',         'PDF to Text Online Free | Extract Text from PDF - LAK PDF',             'Extract text from PDF online free. Convert PDF content to plain text instantly.'],
  ['pages/ComparePdf.tsx',         '/compare-pdf',         'Compare PDF Files Online Free - LAK PDF',                               'Compare two PDF files online and highlight differences instantly.'],
  ['pages/DetectDuplicatePages.tsx','/detect-duplicates',  'Detect Duplicate PDF Pages Online Free - LAK PDF',                      'Detect and remove duplicate pages from PDF online for free.'],

  // Pages missing canonical + og:url + og:type + og:image + twitter
  ['pages/CompressPdf.tsx',        '/compress',            'Compress PDF Online Free | Reduce PDF Size - LAK PDF',                   'Compress PDF online free and reduce file size quickly while keeping quality. Choose compression level or set a custom target size.'],
  ['pages/PdfToWord.tsx',          '/pdf-to-word',         'PDF to Word Online Free | Convert PDF to DOCX - LAK PDF',               'Convert PDF to Word online free. Export editable DOCX from any PDF.'],
  ['pages/AiEditPdf.tsx',          '/ai-edit-pdf',         'Edit PDF Online with AI | Click-to-Edit - LAK PDF',                     'Edit PDF online with AI. Click any text to edit, OCR scanned PDFs, add highlights and annotations.'],
  ['pages/AiInterviewGenerator.tsx','/ai-interview-generator','AI Interview Question Generator from Resume - LAK PDF',              'Generate technical, HR, and behavioral interview questions from your resume PDF with AI.'],
  ['pages/AiPdfToMcq.tsx',         '/ai-pdf-to-mcq',       'AI PDF to MCQ Generator Online Free - LAK PDF',                         'Generate MCQs from PDF with AI for tests, revision, and exam practice.'],
  ['pages/PdfSummarizerQA.tsx',    '/summarizer-qa',       'AI PDF Summarizer & Q&A Online Free - LAK PDF',                         'Summarize PDF with AI and ask questions from your document instantly.'],
  ['pages/PdfEditor.tsx',          '/pdf-editor',          'Edit PDF Online Free | PDF Editor - LAK PDF',                           'Edit PDF online free with annotations, text, drawings, and image insertion.'],
];

let patchedCount = 0;
let skippedCount = 0;

for (const [relPath, canonPath, title, desc] of PAGES) {
  const filePath = resolve(ROOT, relPath);
  let src;
  try {
    src = readFileSync(filePath, 'utf8');
  } catch {
    console.warn(`⚠️  Not found: ${relPath}`);
    continue;
  }

  const canonicalUrl = `${SITE}${canonPath}`;
  const alreadyHasImage = src.includes('og:image');
  const alreadyHasTwitter = src.includes('twitter:card');
  const alreadyHasCanonical = src.includes('rel="canonical"');
  const alreadyHasOgUrl = src.includes('og:url');
  const alreadyHasOgType = src.includes('og:type');

  if (alreadyHasImage && alreadyHasTwitter && alreadyHasCanonical && alreadyHasOgUrl && alreadyHasOgType) {
    console.log(`✅ Already complete: ${relPath}`);
    skippedCount++;
    continue;
  }

  let modified = src;

  // Build the tags to inject just before </Helmet>
  const injections = [];

  if (!alreadyHasCanonical) {
    injections.push(`        <link rel="canonical" href="${canonicalUrl}" />`);
  }
  if (!alreadyHasOgUrl) {
    injections.push(`        <meta property="og:url" content="${canonicalUrl}" />`);
  }
  if (!alreadyHasOgType) {
    injections.push(`        <meta property="og:type" content="website" />`);
  }
  if (!alreadyHasImage) {
    injections.push(`        <meta property="og:image" content="${OG_IMAGE}" />`);
    injections.push(`        <meta property="og:image:width" content="1200" />`);
    injections.push(`        <meta property="og:image:height" content="630" />`);
    injections.push(`        <meta property="og:image:alt" content="${title}" />`);
  }
  if (!alreadyHasTwitter) {
    injections.push(`        <meta name="twitter:card" content="summary_large_image" />`);
    injections.push(`        <meta name="twitter:title" content="${title}" />`);
    injections.push(`        <meta name="twitter:description" content="${desc}" />`);
    injections.push(`        <meta name="twitter:image" content="${OG_IMAGE}" />`);
  }

  if (injections.length === 0) {
    console.log(`✅ Already complete: ${relPath}`);
    skippedCount++;
    continue;
  }

  // Insert before first </Helmet>
  const insertBefore = '      </Helmet>';
  const idx = modified.indexOf(insertBefore);
  if (idx === -1) {
    // Try indented variant
    const alt = '        </Helmet>';
    const idx2 = modified.indexOf(alt);
    if (idx2 === -1) {
      console.warn(`⚠️  Could not find </Helmet> in: ${relPath}`);
      continue;
    }
    modified = modified.slice(0, idx2) + injections.join('\n') + '\n' + modified.slice(idx2);
  } else {
    modified = modified.slice(0, idx) + injections.join('\n') + '\n' + modified.slice(idx);
  }

  writeFileSync(filePath, modified, 'utf8');
  console.log(`✅ Patched (${injections.length} tags): ${relPath}`);
  patchedCount++;
}

console.log(`\n🎯 Done! Patched: ${patchedCount} | Already complete: ${skippedCount}`);
