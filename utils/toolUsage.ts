import { trackEvent } from './analytics';

export interface RecentTool {
  path: string;
  title: string;
  lastUsedAt: number;
  useCount: number;
}

const RECENT_TOOLS_KEY = 'lakpdf_recent_tools';
const MAX_RECENT_TOOLS = 6;

const TOOL_TITLE_MAP: Record<string, string> = {
  // Core PDF Tools
  '/merge': 'Merge PDF',
  '/merge-pdf': 'Merge PDF',
  '/split': 'Split PDF',
  '/split-pdf': 'Split PDF',
  '/compress': 'Compress PDF',
  '/compress-pdf': 'Compress PDF',
  '/compress-pdf-to-100kb': 'Compress PDF to 100KB',
  '/compress-pdf-to-200kb': 'Compress PDF to 200KB',
  '/compress-pdf-to-500kb': 'Compress PDF to 500KB',
  '/organize-pdf': 'Organize PDF',
  '/rotate': 'Rotate PDF',
  '/rotate-pdf': 'Rotate PDF',
  '/page-number': 'Add Page Numbers',
  '/page-numbers': 'Add Page Numbers',
  '/add-page-numbers-to-pdf': 'Add Page Numbers',
  '/watermark': 'Watermark PDF',
  '/watermark-pdf': 'Watermark PDF',
  '/crop-pdf': 'Crop PDF',
  '/scan-pdf': 'Scan Document',
  '/scan-to-pdf': 'Scan Document',
  '/sign-pdf': 'Sign PDF',
  '/ocr-pdf': 'OCR PDF',
  '/compare-pdf': 'Compare PDF',
  '/delete-page': 'Delete Pages',
  '/delete-pages': 'Delete Pages',
  '/protect-pdf': 'Protect PDF',
  '/protect': 'Protect PDF',
  '/unlock-pdf': 'Unlock PDF',
  '/unlock': 'Unlock PDF',
  '/detect-duplicates': 'Detect Duplicates',

  // Conversion Tools
  '/convert': 'Convert PDF',
  '/img-to-pdf': 'Image to PDF',
  '/image-to-pdf': 'Image to PDF',
  '/jpg-to-pdf': 'JPG to PDF',
  '/pdf-to-img': 'PDF to Image',
  '/pdf-to-image': 'PDF to Image',
  '/pdf-to-jpg': 'PDF to JPG',
  '/pdf-to-word': 'PDF to Word',
  '/pdf-to-powerpoint': 'PDF to PowerPoint',
  '/word-to-pdf': 'Word to PDF',
  '/powerpoint-to-pdf': 'PowerPoint to PDF',
  '/make-ppt': 'Make PowerPoint',
  '/img-to-ppt': 'Image to PowerPoint',

  // Image & Utility Tools
  '/compress-img': 'Compress Image',
  '/compress-image': 'Compress Image',
  '/advance-compress-img': 'Compress Image to 50KB',
  '/passport-photo-maker': 'Passport Photo Maker',
  '/passport-photo': 'Passport Photo Maker',
  '/govt-exam-resizer': 'FormDocFixer',
  '/sarkari-resizer': 'FormDocFixer',
  '/exam-document-maker': 'FormDocFixer',
  '/ssc-photo-resizer': 'FormDocFixer',
  '/form-doc-fixer': 'FormDocFixer',
  '/formdocfixer': 'FormDocFixer',
  '/redact-pdf': 'Redact PDF',
  '/blackout-pdf': 'Blackout PDF',

  // AI & Editor Tools
  '/pdf-editor': 'PDF Editor',
  '/ai-edit-pdf': 'AI PDF Editor',
  '/pdf-to-text': 'PDF to Text OCR',
  '/summarizer-qa': 'AI PDF Summarizer',
  '/ai-pdf-to-mcq': 'AI PDF to MCQ',
  '/ai-interview-generator': 'AI Interview Generator',
  '/ai-interview-prep': 'AI Interview Prep',

  // Tools Directory
  '/tools': 'All Tools',
  '/all-tools': 'All Tools',
};

const NON_TOOL_PATHS = new Set([
  '/',
  '/dashboard',
  '/profile',
  '/about',
  '/contact',
  '/blog',
  '/privacy-policy',
  '/terms-of-service',
  '/disclaimer',
  '/sitemap',
  '/learn-pdf',
]);

const TOOL_PATH_SET = new Set(Object.keys(TOOL_TITLE_MAP));

function safeParseRecentTools(raw: string | null): RecentTool[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => item && typeof item.path === 'string' && typeof item.title === 'string')
      .map((item) => ({
        path: item.path,
        title: item.title,
        lastUsedAt: typeof item.lastUsedAt === 'number' ? item.lastUsedAt : Date.now(),
        useCount: typeof item.useCount === 'number' ? item.useCount : 1
      }));
  } catch {
    return [];
  }
}

function saveRecentTools(tools: RecentTool[]): void {
  try {
    localStorage.setItem(RECENT_TOOLS_KEY, JSON.stringify(tools));
  } catch {
    // Ignore storage write issues so tracking never breaks user flow.
  }
}

export function isToolRoute(path: string): boolean {
  if (!path || NON_TOOL_PATHS.has(path) || path.startsWith('/admin') || path.startsWith('/blog/')) {
    return false;
  }
  return true;
}

export function getToolTitle(path: string): string {
  return TOOL_TITLE_MAP[path] || 'PDF Tool';
}

export function getRecentTools(): RecentTool[] {
  if (typeof window === 'undefined') return [];
  try {
    return safeParseRecentTools(localStorage.getItem(RECENT_TOOLS_KEY)).sort(
      (a, b) => b.lastUsedAt - a.lastUsedAt
    );
  } catch {
    return [];
  }
}

export function saveRecentTool(path: string, title?: string): void {
  if (typeof window === 'undefined' || !isToolRoute(path)) return;

  const nextTitle = title || getToolTitle(path);
  const now = Date.now();
  const existing = getRecentTools();
  const match = existing.find((item) => item.path === path);

  const updated = match
    ? existing.map((item) =>
        item.path === path
          ? { ...item, title: nextTitle, lastUsedAt: now, useCount: item.useCount + 1 }
          : item
      )
    : [{ path, title: nextTitle, lastUsedAt: now, useCount: 1 }, ...existing];

  saveRecentTools(
    updated
      .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
      .slice(0, MAX_RECENT_TOOLS)
  );
}

export function recordToolOpen(path: string, source: string): void {
  if (!isToolRoute(path)) return;

  const title = getToolTitle(path);
  saveRecentTool(path, title);
  trackEvent({
    category: 'Tool Usage',
    action: 'tool_open',
    label: `${title} (${source})`
  });
}
