/**
 * File size limits and format constraints across LAKPDF
 */

// File size limits in bytes
export const FILE_SIZE_LIMITS = {
  // Maximum PDF file size for client-side processing (50 MB)
  MAX_PDF_SIZE_BYTES: 50 * 1024 * 1024,
  // Maximum image file size for conversion/compression (25 MB)
  MAX_IMAGE_SIZE_BYTES: 25 * 1024 * 1024,
  // Maximum document file size (Word, PPT) (30 MB)
  MAX_DOCUMENT_SIZE_BYTES: 30 * 1024 * 1024,
  // Default maximum number of files allowed in batch operations
  MAX_BATCH_FILES: 50,
} as const;

// Common Government Exam & Portal Preset Limits (in KB)
export const GOVT_EXAM_LIMITS = {
  PHOTO: {
    MIN_KB: 20,
    MAX_KB: 50,
    DEFAULT_WIDTH_PX: 350,
    DEFAULT_HEIGHT_PX: 450,
    ASPECT_RATIO: 3.5 / 4.5,
  },
  SIGNATURE: {
    MIN_KB: 10,
    MAX_KB: 20,
    DEFAULT_WIDTH_PX: 350,
    DEFAULT_HEIGHT_PX: 150,
    ASPECT_RATIO: 3.5 / 1.5,
  },
  CERTIFICATE_PDF: {
    MAX_KB: 200,
  },
} as const;

// Supported MIME types
export const MIME_TYPES = {
  PDF: 'application/pdf',
  JPEG: 'image/jpeg',
  PNG: 'image/png',
  WEBP: 'image/webp',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  DOC: 'application/msword',
  PPTX: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  PPT: 'application/vnd.ms-powerpoint',
} as const;
