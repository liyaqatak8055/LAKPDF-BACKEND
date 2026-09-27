/**
 * Centralized Route Definitions for LAKPDF
 * Prevents hardcoded path strings across components, navigation, and testing.
 */

export const APP_ROUTES = {
  // Core Pages
  HOME: '/',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  TOOLS: '/tools',
  ALL_TOOLS: '/all-tools',

  // PDF Core
  MERGE_PDF: '/merge',
  SPLIT_PDF: '/split',
  COMPRESS_PDF: '/compress',
  COMPRESS_PDF_LANDING: '/compress-pdf',
  COMPRESS_PDF_100KB: '/compress-pdf-to-100kb',
  COMPRESS_PDF_200KB: '/compress-pdf-to-200kb',
  COMPRESS_PDF_500KB: '/compress-pdf-to-500kb',
  ORGANIZE_PDF: '/organize-pdf',
  DELETE_PAGES: '/delete-page',

  // Image & Presentation
  IMG_TO_PDF: '/img-to-pdf',
  PDF_TO_IMG: '/pdf-to-img',
  COMPRESS_IMG: '/compress-img',
  ADVANCE_COMPRESS_IMG: '/advance-compress-img',
  MAKE_PPT: '/make-ppt',
  PASSPORT_PHOTO_MAKER: '/passport-photo-maker',
  GOVT_EXAM_RESIZER: '/govt-exam-resizer',

  // Security & Editing
  REDACT_PDF: '/redact-pdf',
  PROTECT_PDF: '/protect-pdf',
  UNLOCK_PDF: '/unlock-pdf',
  PDF_EDITOR: '/pdf-editor',
  AI_EDIT_PDF: '/ai-edit-pdf',
  ROTATE_PDF: '/rotate',
  PAGE_NUMBERS: '/page-number',
  WATERMARK_PDF: '/watermark',
  CROP_PDF: '/crop-pdf',
  SCAN_PDF: '/scan-pdf',
  SIGN_PDF: '/sign-pdf',
  OCR_PDF: '/ocr-pdf',
  COMPARE_PDF: '/compare-pdf',
  DETECT_DUPLICATES: '/detect-duplicates',

  // Format Conversion
  CONVERT_PDF: '/convert',
  PDF_TO_WORD: '/pdf-to-word',
  PDF_TO_POWERPOINT: '/pdf-to-powerpoint',
  WORD_TO_PDF: '/word-to-pdf',
  POWERPOINT_TO_PDF: '/powerpoint-to-pdf',
  PDF_TO_TEXT: '/pdf-to-text',

  // AI Document Suite
  SUMMARIZER_QA: '/summarizer-qa',
  AI_PDF_TO_MCQ: '/ai-pdf-to-mcq',
  AI_INTERVIEW_GENERATOR: '/ai-interview-generator',

  // Informational & Support
  ABOUT: '/about',
  CONTACT: '/contact',
  PRIVACY_POLICY: '/privacy-policy',
  TERMS_OF_SERVICE: '/terms-of-service',
  DISCLAIMER: '/disclaimer',
  LEARN_PDF: '/learn-pdf',
  BLOG: '/blog',
  SITEMAP: '/sitemap',
  OFFLINE: '/offline',

  // Admin Portal
  ADMIN: {
    ROOT: '/admin',
    LOGIN: '/admin/login',
    UNAUTHORIZED: '/admin/unauthorized',
    DASHBOARD: '/admin/dashboard',
    USERS: '/admin/users',
    TOOLS: '/admin/tools',
    ANALYTICS: '/admin/analytics',
    ANNOUNCEMENTS: '/admin/announcements',
    LOGS: '/admin/logs',
    SETTINGS: '/admin/settings',
  },
} as const;
