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
  '/merge': 'Merge PDF',
  '/split': 'Split PDF',
  '/compress': 'Compress PDF',
  '/organize-pdf': 'Organize PDF',
  '/img-to-pdf': 'Image to PDF',
  '/pdf-to-img': 'PDF to Image',
  '/compress-img': 'Compress Image',
  '/advance-compress-img': 'Compress Image to 50kb',
  '/convert': 'Convert PDF',
  '/pdf-to-word': 'PDF to Word',
  '/pdf-to-powerpoint': 'PDF to PowerPoint',
  '/word-to-pdf': 'Word to PDF',
  '/powerpoint-to-pdf': 'PowerPoint to PDF',
  '/rotate': 'Rotate PDF',
  '/page-number': 'Add Page Numbers',
  '/watermark': 'Watermark PDF',
  '/crop-pdf': 'Crop PDF',
  '/scan-pdf': 'Scan to PDF',
  '/sign-pdf': 'Sign PDF',
  '/ocr-pdf': 'OCR PDF',
  '/compare-pdf': 'Compare PDF',
  '/delete-page': 'Delete Pages',
  '/summarizer-qa': 'AI Summarizer',
  '/detect-duplicates': 'Detect Duplicates',
  '/ai-pdf-to-mcq': 'AI PDF to MCQ',
  '/pdf-editor': 'PDF Editor',
  '/ai-interview-generator': 'AI Interview Generator'
};

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
  return TOOL_PATH_SET.has(path);
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
