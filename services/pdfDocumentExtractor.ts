import { pdfjs } from './pdfService';

export interface ExtractedPageDocument {
  pageNumber: number;
  width: number;
  height: number;
  html: string;
}

interface RawTextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  isBold: boolean;
  isItalic: boolean;
}

const escapeHtml = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Extracts structured, reflowable HTML from a PDF document for seamless Word-like editing.
 */
export async function extractPdfToStructuredHtml(file: File): Promise<ExtractedPageDocument[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const pages: ExtractedPageDocument[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });
    const textContent = await page.getTextContent();
    const styles = textContent.styles || {};

    // 1. Collect and filter text items
    const rawItems: RawTextItem[] = [];
    textContent.items.forEach((item: any) => {
      const str = String(item.str || '');
      if (!str || str.trim().length === 0) return;

      const transform = item.transform || [1, 0, 0, 1, 0, 0];
      const vx = transform[4] * 1.5;
      const vy = viewport.height - (transform[5] * 1.5);
      const fontHeight = Math.abs(transform[3] || transform[0] || 12);
      const fontSize = Math.max(10, fontHeight * 1.5);

      const fontName = String(item.fontName || '').toLowerCase();
      const fontObj = styles[item.fontName];
      const isBold = fontName.includes('bold') || fontName.includes('black') || fontName.includes('heavy');
      const isItalic = fontName.includes('italic') || fontName.includes('oblique');

      let fontFamily = 'Arial, sans-serif';
      if (fontObj?.fontFamily) {
        fontFamily = fontObj.fontFamily;
      } else if (fontName.includes('times') || fontName.includes('serif')) {
        fontFamily = 'Georgia, "Times New Roman", serif';
      } else if (fontName.includes('courier') || fontName.includes('mono')) {
        fontFamily = 'Courier New, monospace';
      }

      rawItems.push({
        str,
        x: vx,
        y: vy - fontSize,
        width: item.width ? item.width * 1.5 : str.length * fontSize * 0.55,
        height: fontSize * 1.2,
        fontSize,
        fontFamily,
        isBold,
        isItalic,
      });
    });

    // 2. Group into horizontal lines
    type LineGroup = {
      avgY: number;
      height: number;
      items: RawTextItem[];
    };
    const lines: LineGroup[] = [];
    const sorted = [...rawItems].sort((a, b) => a.y - b.y);

    sorted.forEach((item) => {
      const tolerance = Math.max(5, item.height * 0.45);
      const existing = lines.find((line) => Math.abs(line.avgY - item.y) <= tolerance);
      if (existing) {
        existing.items.push(item);
        existing.avgY = existing.items.reduce((s, it) => s + it.y, 0) / existing.items.length;
        existing.height = Math.max(existing.height, item.height);
      } else {
        lines.push({
          avgY: item.y,
          height: item.height,
          items: [item],
        });
      }
    });

    lines.sort((a, b) => a.avgY - b.avgY);
    lines.forEach((l) => l.items.sort((a, b) => a.x - b.x));

    // 3. Render lines into semantic, clean HTML
    const htmlBlocks: string[] = [];

    // Check for passport photo or top images
    let embeddedPhotoHtml = '';
    try {
      const opList = await page.getOperatorList();
      const fnArray = opList.fnArray || [];
      const argsArray = opList.argsArray || [];
      for (let i = 0; i < fnArray.length; i++) {
        if (fnArray[i] === (pdfjs?.OPS?.paintImageXObject ?? 85)) {
          const imgId = argsArray[i]?.[0];
          if (imgId && typeof imgId === 'string') {
            const objs = page.objs || page.commonObjs;
            if (objs && typeof objs.get === 'function') {
              const imgData = objs.get(imgId);
              if (imgData && imgData.data && imgData.width > 30 && imgData.height > 30) {
                // Check if not full background
                if (imgData.width < viewport.width * 0.6 && imgData.height < viewport.height * 0.6) {
                  const canvas = document.createElement('canvas');
                  canvas.width = imgData.width;
                  canvas.height = imgData.height;
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    const imgDataObj = ctx.createImageData(imgData.width, imgData.height);
                    if (imgData.data.length === imgData.width * imgData.height * 4) {
                      imgDataObj.data.set(imgData.data);
                    } else if (imgData.data.length === imgData.width * imgData.height * 3) {
                      let s = 0;
                      let d = 0;
                      while (s < imgData.data.length) {
                        imgDataObj.data[d++] = imgData.data[s++];
                        imgDataObj.data[d++] = imgData.data[s++];
                        imgDataObj.data[d++] = imgData.data[s++];
                        imgDataObj.data[d++] = 255;
                      }
                    }
                    ctx.putImageData(imgDataObj, 0, 0);
                    const photoSrc = canvas.toDataURL('image/png');
                    embeddedPhotoHtml = `<div style="float: right; margin-left: 20px; margin-bottom: 15px; border: 2px solid #cbd5e1; padding: 2px; background: #ffffff; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.08);"><img src="${photoSrc}" alt="Photo" style="max-width: 120px; max-height: 150px; display: block; object-fit: contain;" /></div>`;
                  }
                }
              }
            }
          }
          break; // only take top photo
        }
      }
    } catch {
      // ignore photo error
    }

    if (embeddedPhotoHtml) {
      htmlBlocks.push(embeddedPhotoHtml);
    }

    // Process lines
    let inList = false;

    lines.forEach((line) => {
      // Merge adjacent fragments in line respecting character gaps
      let fullLineText = '';
      for (let i = 0; i < line.items.length; i++) {
        const it = line.items[i];
        const prev = line.items[i - 1];
        if (prev) {
          const gap = it.x - (prev.x + prev.width);
          const needsSpace = gap > (prev.fontSize * 0.22) && !fullLineText.endsWith(' ') && !it.str.startsWith(' ');
          fullLineText += (needsSpace ? ' ' : '') + it.str.trim();
        } else {
          fullLineText += it.str.trim();
        }
      }
      if (!fullLineText) return;

      const firstItem = line.items[0];
      const maxFontSize = Math.max(...line.items.map((it) => it.fontSize));
      const isLineBold = line.items.some((it) => it.isBold);
      const isCentered = firstItem.x > viewport.width * 0.25 && firstItem.x + line.items[line.items.length - 1].width < viewport.width * 0.85;

      // Section Header (e.g. "CAREER OBJECTIVE", "ACADEMIC QUALIFICATION", "PERSONAL PROFILE")
      const isHeaderBanner =
        (fullLineText.toUpperCase() === fullLineText && fullLineText.length > 4 && fullLineText.length < 50 && (isLineBold || maxFontSize >= 14)) ||
        fullLineText.includes('CURRICULUM') ||
        fullLineText.includes('RESUME');

      if (isHeaderBanner) {
        if (inList) {
          htmlBlocks.push('</ul>');
          inList = false;
        }

        if (fullLineText.includes('CURRICULUM') || fullLineText.includes('RESUME')) {
          htmlBlocks.push(
            `<h1 style="text-align: center; font-size: 22px; font-weight: 800; color: #0f172a; margin: 12px 0 16px 0; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;">${escapeHtml(fullLineText)}</h1>`
          );
        } else {
          htmlBlocks.push(
            `<h3 style="margin: 16px 0 8px 0; font-size: 15px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">${escapeHtml(fullLineText)}</h3>`
          );
        }
        return;
      }

      // Check for Highlight / Colored Banner (like "Post Applied for : MOBILE CRANE OPERATOR")
      if (fullLineText.toLowerCase().includes('post applied') || fullLineText.toLowerCase().includes('objective')) {
        if (inList) {
          htmlBlocks.push('</ul>');
          inList = false;
        }
        htmlBlocks.push(
          `<div style="background-color: #fef08a; border: 1px solid #fde047; padding: 8px 14px; margin: 12px 0; border-radius: 6px; font-weight: 700; color: #854d0e; text-align: center;">${escapeHtml(fullLineText)}</div>`
        );
        return;
      }

      // Check for List item (starts with bullet, dash, tick)
      const bulletMatch = fullLineText.match(/^([•\-\*\✓\✔\d+\.]|\:\-)\s*(.*)$/);
      if (bulletMatch) {
        if (!inList) {
          htmlBlocks.push('<ul style="margin: 8px 0 8px 24px; padding: 0; list-style-type: disc;">');
          inList = true;
        }

        // Check if list item has key-value structure: e.g. "Father's Name :- SHAKEEL" or "Date of Birth :- 12.04.2001"
        const content = bulletMatch[2] || fullLineText;
        const kvMatch = content.match(/^([^:\-]+?)\s*(?::\-|\:|\-)\s*(.+)$/);

        if (kvMatch) {
          const key = kvMatch[1].trim();
          const val = kvMatch[2].trim();
          htmlBlocks.push(
            `<li style="margin-bottom: 6px; line-height: 1.6; color: #334155;"><strong style="color: #0f172a; min-width: 140px; display: inline-block;">${escapeHtml(key)}:</strong> <span style="color: #1e293b; font-weight: 500;">${escapeHtml(val)}</span></li>`
          );
        } else {
          htmlBlocks.push(
            `<li style="margin-bottom: 6px; line-height: 1.6; color: #334155;">${escapeHtml(content)}</li>`
          );
        }
        return;
      }

      if (inList) {
        htmlBlocks.push('</ul>');
        inList = false;
      }

      // Check for key-value pair without bullet: e.g. "Mob. No.- +91 9721690190" or "E-mail ID- test@gmail.com"
      const directKv = fullLineText.match(/^([A-Za-z0-9\s\.\/]+?)\s*(?::\-|\:|\-)\s*(.+)$/);
      if (directKv && directKv[1].length < 30) {
        const key = directKv[1].trim();
        const val = directKv[2].trim();
        htmlBlocks.push(
          `<p style="margin: 4px 0; line-height: 1.5; color: #334155;"><strong style="color: #0f172a;">${escapeHtml(key)}:</strong> <span style="color: #1e293b;">${escapeHtml(val)}</span></p>`
        );
        return;
      }

      // Normal paragraph or text line
      const alignStyle = isCentered ? 'text-align: center;' : 'text-align: left;';
      const weightStyle = isLineBold ? 'font-weight: 700;' : 'font-weight: 400;';
      const sizeStyle = `font-size: ${Math.min(18, Math.max(12, Math.round(maxFontSize)))}px;`;

      htmlBlocks.push(
        `<p style="margin: 4px 0; line-height: 1.6; color: #1e293b; ${alignStyle} ${weightStyle} ${sizeStyle}">${escapeHtml(fullLineText)}</p>`
      );
    });

    if (inList) {
      htmlBlocks.push('</ul>');
    }

    const finalPageHtml = `
      <div class="a4-document-page" data-page="${pageNum}" style="position: relative; width: 100%; min-height: 100%; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        ${htmlBlocks.join('\n')}
      </div>
    `;

    pages.push({
      pageNumber: pageNum,
      width: viewport.width,
      height: viewport.height,
      html: finalPageHtml,
    });
  }

  return pages;
}
