import React, { useEffect, useRef, useState, useCallback } from 'react';
import { pdfjs } from '../../services/pdfService';
import { PdfAnnotationType, type PdfDocument, type PdfAnnotation, type PdfFitMode } from '../../types/pdfEditor';

export type ActiveEditorTool =
  | 'move'
  | 'addText'
  | 'editText'
  | 'draw'
  | 'highlight'
  | 'erase'
  | 'image'
  | 'shape';

interface PdfViewerProps {
  document: PdfDocument;
  activeTool: ActiveEditorTool;
  shapeType: 'rectangle' | 'ellipse';
  pendingImageSrc: string | null;
  selectedAnnotation: PdfAnnotation | null;
  selectedAnnotationIds: string[];
  zoom: number;
  fitMode: PdfFitMode;
  onAnnotationAdd: (annotation: PdfAnnotation) => void;
  onAnnotationSelect: (annotation: PdfAnnotation | null) => void;
  onAnnotationToggleSelect: (annotation: PdfAnnotation) => void;
  onAnnotationUpdate: (id: string, updates: Partial<PdfAnnotation>) => void;
  onAnnotationBulkUpdate: (updates: Array<{ id: string; updates: Partial<PdfAnnotation> }>) => void;
  onAnnotationDelete: (id: string) => void;
  onRequestToolChange: (tool: ActiveEditorTool) => void;
  onRequestImagePick: () => void;
  onConsumePendingImage: () => void;
  onZoomChange: (zoom: number) => void;
  onFitModeChange: (fitMode: PdfFitMode) => void;
  onPageChange: (pageNumber: number) => void;
}

type Point = { x: number; y: number };
type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se';

const MIN_ANNOTATION_SIZE = 16;

const normalizeRect = (start: Point, end: Point) => {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.max(1, Math.abs(end.x - start.x));
  const height = Math.max(1, Math.abs(end.y - start.y));
  return { x, y, width, height };
};

const clampPage = (pageNum: number, totalPages: number) => Math.min(totalPages, Math.max(1, pageNum));

const clampSize = (value: number) => Math.max(MIN_ANNOTATION_SIZE, value);
const DEFAULT_TEXT_BOX = { width: 160, height: 36 };

export const PdfViewer: React.FC<PdfViewerProps> = ({
  document,
  activeTool,
  shapeType,
  pendingImageSrc,
  selectedAnnotation,
  selectedAnnotationIds,
  zoom,
  onAnnotationAdd,
  onAnnotationSelect,
  onAnnotationToggleSelect,
  onAnnotationUpdate,
  onAnnotationBulkUpdate,
  onAnnotationDelete,
  onRequestToolChange,
  onRequestImagePick,
  onConsumePendingImage,
  onPageChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isRenderingRef = useRef(false);
  const queuedRenderRef = useRef<{ pageNum: number; scale: number } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [currentPageNum, setCurrentPageNum] = useState(document.currentPage);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [pageTextItems, setPageTextItems] = useState<Array<{
    id: string;
    originalStr: string;
    currentStr: string;
    x: number;
    y: number;
    width: number;
    height: number;
    fontSize: number;
    fontFamily: string;
    isModified: boolean;
  }>>([]);
  const [activeEditingId, setActiveEditingId] = useState<string | null>(null);

  const [drawStart, setDrawStart] = useState<Point | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<Point | null>(null);
  const [freehandPoints, setFreehandPoints] = useState<Point[]>([]);

  const [draggingAnnotationId, setDraggingAnnotationId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });
  const [groupDragState, setGroupDragState] = useState<{
    startPoint: Point;
    ids: string[];
    startBoundsMap: Record<string, DOMRect>;
  } | null>(null);

  const [resizeState, setResizeState] = useState<{
    annotationId: string;
    handle: ResizeHandle;
    startPoint: Point;
    startBounds: DOMRect;
  } | null>(null);
  const [textEditor, setTextEditor] = useState<{ id: string; value: string } | null>(null);
  const textEditorRef = useRef<{ id: string; value: string } | null>(null);

  const pageAnnotations = document.annotations.filter((a) => a.pageNumber === currentPageNum);

  useEffect(() => {
    const loadPdf = async () => {
      if (!document.file) return;
      setIsLoading(true);
      try {
        const arrayBuffer = await document.file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        setPdfDocument(pdf);
      } catch (error) {
        console.error('Failed to load PDF:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadPdf();
  }, [document.file]);

  const renderPage = useCallback(
    async (pageNum: number, scale: number = 1.5) => {
      if (!pdfDocument || !canvasRef.current) return;
      if (isRenderingRef.current) {
        queuedRenderRef.current = { pageNum, scale };
        return;
      }
      isRenderingRef.current = true;
      try {
        const page = await pdfDocument.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;
        setCanvasSize({ width: viewport.width, height: viewport.height });
        context.clearRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: context, viewport }).promise;

        // Extract text items from PDF page for real-time natural editing
        try {
          const textContent = await page.getTextContent();
          const items: Array<{
            id: string;
            originalStr: string;
            currentStr: string;
            x: number;
            y: number;
            width: number;
            height: number;
            fontSize: number;
            fontFamily: string;
            fontWeight: string | number;
            fontStyle: string;
            isModified: boolean;
          }> = [];

          const styles = (textContent as any).styles || {};

          textContent.items.forEach((item: any, idx: number) => {
            const str = String(item.str || '');
            if (!str || str.trim().length === 0) return;
            const transform = item.transform || [1, 0, 0, 1, 0, 0];
            const [vx, vy] = typeof viewport.convertToViewportPoint === 'function'
              ? viewport.convertToViewportPoint(transform[4], transform[5])
              : [(transform[4] * scale), viewport.height - (transform[5] * scale)];

            const fontHeight = Math.abs(transform[3] || transform[0] || 12);
            const fontSize = Math.max(9, fontHeight * scale);
            const x = Math.max(0, vx - 2);
            const y = Math.max(0, vy - (fontSize * 0.85) - 2);
            const width = Math.max(20, (item.width ? item.width * scale : str.length * fontSize * 0.55)) + 6;
            const height = (fontSize * 1.18) + 4;

            const fontNameLower = String(item.fontName || '').toLowerCase();
            const fontObj = styles[item.fontName];
            const isBold = fontNameLower.includes('bold') || fontNameLower.includes('black') || fontNameLower.includes('heavy');
            const isItalic = fontNameLower.includes('italic') || fontNameLower.includes('oblique');

            let fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
            if (fontObj?.fontFamily) {
              fontFamily = `${fontObj.fontFamily}, system-ui, -apple-system, sans-serif`;
            } else if (fontNameLower.includes('times') || fontNameLower.includes('serif') || fontNameLower.includes('georgia')) {
              fontFamily = 'Georgia, "Times New Roman", Times, serif';
            } else if (fontNameLower.includes('mono') || fontNameLower.includes('courier')) {
              fontFamily = 'ui-monospace, "Courier New", Courier, monospace';
            }

            items.push({
              id: `txt_${pageNum}_${idx}`,
              originalStr: str,
              currentStr: str,
              x,
              y,
              width,
              height,
              fontSize,
              fontFamily,
              fontWeight: isBold ? '700' : '400',
              fontStyle: isItalic ? 'italic' : 'normal',
              isModified: false,
            });
          });

          setPageTextItems(items);
        } catch (textErr) {
          console.warn('Text content extraction warning:', textErr);
        }

        if (containerRef.current) {
          containerRef.current.scrollTop = 0;
        }
      } catch (error) {
        console.error('Failed to render page:', error);
      } finally {
        isRenderingRef.current = false;
        const queued = queuedRenderRef.current;
        if (queued) {
          queuedRenderRef.current = null;
          void renderPage(queued.pageNum, queued.scale);
        }
      }
    },
    [pdfDocument]
  );

  useEffect(() => {
    setCurrentPageNum(document.currentPage);
  }, [document.currentPage]);

  useEffect(() => {
    if (pdfDocument && !isLoading) {
      renderPage(currentPageNum, zoom);
    }
  }, [pdfDocument, currentPageNum, zoom, isLoading, renderPage]);

  useEffect(() => {
    return () => {
      queuedRenderRef.current = null;
      isRenderingRef.current = false;
    };
  }, []);

  const resetInteraction = () => {
    setDrawStart(null);
    setDrawCurrent(null);
    setFreehandPoints([]);
    setDraggingAnnotationId(null);
    setGroupDragState(null);
    setResizeState(null);
  };

  useEffect(() => {
    textEditorRef.current = textEditor;
  }, [textEditor]);

  useEffect(() => {
    if (activeTool !== "addText" && activeTool !== "editText" && textEditorRef.current) {
      commitTextEditor();
    }
  }, [activeTool]);

  const getCanvasPoint = (e: React.MouseEvent): Point | null => {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePageDelta = (delta: number) => {
    const next = clampPage(currentPageNum + delta, document.totalPages);
    setCurrentPageNum(next);
    onPageChange(next);
    onAnnotationSelect(null);
    resetInteraction();
  };

  const measureTextBounds = (text: string, style: PdfAnnotation["style"]) => {
    if (!text) {
      return { width: DEFAULT_TEXT_BOX.width, height: DEFAULT_TEXT_BOX.height };
    }
    const fontSize = style.fontSize || 16;
    const fontFamily = style.fontFamily || "Arial";
    const fontStyle = style.fontStyle || "normal";
    const fontWeight = style.fontWeight || "normal";
    const lines = text.split("\n");
    let maxWidth = 0;

    const probeCanvas = window.document.createElement("canvas");
    const ctx = probeCanvas.getContext("2d");
    if (ctx) {
      ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
      lines.forEach((line) => {
        maxWidth = Math.max(maxWidth, ctx.measureText(line || " ").width);
      });
    } else {
      maxWidth = Math.max(...lines.map((line) => (line.length || 1) * (fontSize * 0.58)));
    }

    const nextWidth = Math.max(80, Math.ceil(maxWidth) + 20);
    const nextHeight = Math.max(32, Math.ceil(lines.length * fontSize * 1.35) + 12);
    return { width: nextWidth, height: nextHeight };
  };

  const commitText = (point: Point) => {
    const id = `text-${Date.now()}`;
    const initialText = '';
    const newAnnotation: PdfAnnotation = {
      id,
      type: PdfAnnotationType.TEXT,
      pageNumber: currentPageNum,
      bounds: new DOMRect(point.x, point.y, DEFAULT_TEXT_BOX.width, DEFAULT_TEXT_BOX.height),
      data: { text: initialText },
      style: {
        strokeColor: '#3b82f6',
        strokeWidth: 1,
        fillColor: '#FFFFFF',
        opacity: 1,
        fontSize: 16,
        textColor: '#111827',
        fontFamily: 'Arial',
        textAlign: 'left',
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none',
      },
      createdAt: new Date(),
      modifiedAt: new Date(),
      isVisible: true,
      zIndex: 10,
    };

    onAnnotationAdd({
      ...newAnnotation,
    });
    textEditorRef.current = { id, value: initialText };
    setTextEditor({ id, value: initialText });
    onAnnotationSelect(newAnnotation);
    onRequestToolChange('editText');
  };

  const commitTextEditor = () => {
    const currentEditor = textEditorRef.current;
    if (!currentEditor) return;
    const value = currentEditor.value.trim();
    if (!value) {
      const annotation = pageAnnotations.find((a) => a.id === currentEditor.id);
      if (annotation) {
        onAnnotationDelete(annotation.id);
      }
      textEditorRef.current = null;
      setTextEditor(null);
      return;
    }
    const annotation = pageAnnotations.find((a) => a.id === currentEditor.id);
    if (!annotation) {
      textEditorRef.current = null;
      setTextEditor(null);
      return;
    }
    const bounds = measureTextBounds(value, annotation.style);
    onAnnotationUpdate(annotation.id, {
      data: {
        ...annotation.data,
        text: value,
      },
      bounds: new DOMRect(annotation.bounds.x, annotation.bounds.y, bounds.width, bounds.height),
      modifiedAt: new Date(),
    });
    textEditorRef.current = null;
    setTextEditor(null);
  };

  const startTextEdit = (annotation: PdfAnnotation) => {
    if (textEditorRef.current?.id === annotation.id) return;
    const nextEditor = {
      id: annotation.id,
      value: String(annotation.data?.text || ''),
    };
    textEditorRef.current = nextEditor;
    setTextEditor(nextEditor);
    onAnnotationSelect(annotation);
  };

  const placeImage = (point: Point, src: string) => {
    onAnnotationAdd({
      id: `image-${Date.now()}`,
      type: PdfAnnotationType.IMAGE,
      pageNumber: currentPageNum,
      bounds: new DOMRect(point.x, point.y, 170, 170),
      data: { src },
      style: {
        strokeColor: '#64748b',
        strokeWidth: 1,
        fillColor: 'transparent',
        opacity: 1,
      },
      createdAt: new Date(),
      modifiedAt: new Date(),
      isVisible: true,
      zIndex: 1,
    });
  };

  const isAnnotationLocked = (annotation: PdfAnnotation) => Boolean(annotation.data?.locked);

  const applyResize = (nextPoint: Point) => {
    if (!resizeState) return;
    const annotation = pageAnnotations.find((a) => a.id === resizeState.annotationId);
    if (!annotation) return;

    const dx = nextPoint.x - resizeState.startPoint.x;
    const dy = nextPoint.y - resizeState.startPoint.y;

    let nextX = resizeState.startBounds.x;
    let nextY = resizeState.startBounds.y;
    let nextW = resizeState.startBounds.width;
    let nextH = resizeState.startBounds.height;

    if (resizeState.handle === 'se') {
      nextW = clampSize(resizeState.startBounds.width + dx);
      nextH = clampSize(resizeState.startBounds.height + dy);
    }
    if (resizeState.handle === 'sw') {
      nextW = clampSize(resizeState.startBounds.width - dx);
      nextH = clampSize(resizeState.startBounds.height + dy);
      nextX = resizeState.startBounds.x + (resizeState.startBounds.width - nextW);
    }
    if (resizeState.handle === 'ne') {
      nextW = clampSize(resizeState.startBounds.width + dx);
      nextH = clampSize(resizeState.startBounds.height - dy);
      nextY = resizeState.startBounds.y + (resizeState.startBounds.height - nextH);
    }
    if (resizeState.handle === 'nw') {
      nextW = clampSize(resizeState.startBounds.width - dx);
      nextH = clampSize(resizeState.startBounds.height - dy);
      nextX = resizeState.startBounds.x + (resizeState.startBounds.width - nextW);
      nextY = resizeState.startBounds.y + (resizeState.startBounds.height - nextH);
    }

    onAnnotationUpdate(annotation.id, {
      bounds: new DOMRect(nextX, nextY, nextW, nextH),
      modifiedAt: new Date(),
    });
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (textEditorRef.current) {
      commitTextEditor();
    }

    const point = getCanvasPoint(e);
    if (!point) return;

    if (activeTool === 'addText') {
      commitText(point);
      return;
    }

    if (activeTool === 'image') {
      if (pendingImageSrc) {
        placeImage(point, pendingImageSrc);
        onConsumePendingImage();
      } else {
        onRequestImagePick();
      }
      return;
    }

    if (activeTool === 'shape' || activeTool === 'highlight') {
      setDrawStart(point);
      setDrawCurrent(point);
      return;
    }

    if (activeTool === 'draw') {
      setDrawStart(point);
      setDrawCurrent(point);
      setFreehandPoints([point]);
      return;
    }

    if (activeTool !== 'move') {
      onAnnotationSelect(null);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    const point = getCanvasPoint(e);
    if (!point) return;

    if (groupDragState && activeTool === 'move') {
      const dx = point.x - groupDragState.startPoint.x;
      const dy = point.y - groupDragState.startPoint.y;
      onAnnotationBulkUpdate(
        groupDragState.ids.map((id) => {
          const start = groupDragState.startBoundsMap[id];
          return {
            id,
            updates: {
              bounds: new DOMRect(start.x + dx, start.y + dy, start.width, start.height),
              modifiedAt: new Date(),
            },
          };
        })
      );
      return;
    }

    if (resizeState && activeTool === 'move') {
      applyResize(point);
      return;
    }

    if (draggingAnnotationId && activeTool === 'move') {
      const annotation = pageAnnotations.find((a) => a.id === draggingAnnotationId);
      if (!annotation) return;
      onAnnotationUpdate(annotation.id, {
        bounds: new DOMRect(point.x - dragOffset.x, point.y - dragOffset.y, annotation.bounds.width, annotation.bounds.height),
        modifiedAt: new Date(),
      });
      return;
    }

    if (!drawStart) return;

    if (activeTool === 'draw') {
      setDrawCurrent(point);
      setFreehandPoints((prev) => [...prev, point]);
      return;
    }

    if (activeTool === 'shape' || activeTool === 'highlight') {
      setDrawCurrent(point);
    }
  };

  const handleCanvasMouseUp = (e: React.MouseEvent) => {
    const point = getCanvasPoint(e);

    if (groupDragState) {
      setGroupDragState(null);
      return;
    }

    if (resizeState) {
      setResizeState(null);
      return;
    }

    if (draggingAnnotationId) {
      setDraggingAnnotationId(null);
      return;
    }

    if (!drawStart || !point) return;

    if (activeTool === 'shape' || activeTool === 'highlight') {
      const rect = normalizeRect(drawStart, point);
      if (rect.width > 6 && rect.height > 6) {
        const isHighlight = activeTool === 'highlight';
        onAnnotationAdd({
          id: `${activeTool}-${Date.now()}`,
          type: isHighlight
            ? PdfAnnotationType.HIGHLIGHT
            : shapeType === 'ellipse'
              ? PdfAnnotationType.CIRCLE
              : PdfAnnotationType.RECTANGLE,
          pageNumber: currentPageNum,
          bounds: new DOMRect(rect.x, rect.y, rect.width, rect.height),
          data: {},
          style: {
            strokeColor: isHighlight ? '#facc15' : '#2563eb',
            strokeWidth: isHighlight ? 1 : 2,
            fillColor: isHighlight ? '#fde047' : 'transparent',
            opacity: isHighlight ? 0.45 : 1,
          },
          createdAt: new Date(),
          modifiedAt: new Date(),
          isVisible: true,
          zIndex: 1,
        });
      }
    }

    if (activeTool === 'draw' && freehandPoints.length > 1) {
      const xs = freehandPoints.map((p) => p.x);
      const ys = freehandPoints.map((p) => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const maxX = Math.max(...xs);
      const maxY = Math.max(...ys);
      onAnnotationAdd({
        id: `freehand-${Date.now()}`,
        type: PdfAnnotationType.FREEHAND,
        pageNumber: currentPageNum,
        bounds: new DOMRect(minX, minY, Math.max(1, maxX - minX), Math.max(1, maxY - minY)),
        data: { points: freehandPoints },
        style: {
          strokeColor: '#1f2937',
          strokeWidth: 2,
          fillColor: 'transparent',
          opacity: 1,
        },
        createdAt: new Date(),
        modifiedAt: new Date(),
        isVisible: true,
        zIndex: 1,
      });
    }

    setDrawStart(null);
    setDrawCurrent(null);
    setFreehandPoints([]);
  };

  const handleAnnotationClick = (e: React.MouseEvent, annotation: PdfAnnotation) => {
    e.stopPropagation();
    if (activeTool === 'move' && (e.shiftKey || e.metaKey || e.ctrlKey)) {
      onAnnotationToggleSelect(annotation);
      return;
    }

    if (activeTool === 'erase') {
      if (isAnnotationLocked(annotation)) return;
      onAnnotationDelete(annotation.id);
      onAnnotationSelect(null);
      return;
    }

    if (activeTool === 'editText' && annotation.type === PdfAnnotationType.TEXT) {
      if (isAnnotationLocked(annotation)) return;
      startTextEdit(annotation);
      return;
    }

    if (activeTool === 'addText' && annotation.type === PdfAnnotationType.TEXT) {
      if (isAnnotationLocked(annotation)) return;
      startTextEdit(annotation);
      return;
    }

    if (activeTool === 'move') {
      onAnnotationSelect(annotation);
    }
  };

  const handleAnnotationMouseDown = (e: React.MouseEvent, annotation: PdfAnnotation) => {
    if (activeTool !== 'move') return;
    if (isAnnotationLocked(annotation)) return;
    e.stopPropagation();
    const point = getCanvasPoint(e);
    if (!point) return;
    const idsForGroupDrag = selectedAnnotationIds.filter((id) => {
      const a = pageAnnotations.find((x) => x.id === id);
      return a && !isAnnotationLocked(a);
    });
    if (idsForGroupDrag.length > 1 && idsForGroupDrag.includes(annotation.id)) {
      const startBoundsMap: Record<string, DOMRect> = {};
      idsForGroupDrag.forEach((id) => {
        const a = pageAnnotations.find((x) => x.id === id);
        if (a) {
          startBoundsMap[id] = a.bounds;
        }
      });
      setGroupDragState({
        startPoint: point,
        ids: idsForGroupDrag,
        startBoundsMap,
      });
      return;
    }
    setDraggingAnnotationId(annotation.id);
    setDragOffset({ x: point.x - annotation.bounds.x, y: point.y - annotation.bounds.y });
    onAnnotationSelect(annotation);
  };

  const handleResizeHandleMouseDown = (e: React.MouseEvent, annotation: PdfAnnotation, handle: ResizeHandle) => {
    if (activeTool !== 'move') return;
    if (isAnnotationLocked(annotation)) return;
    e.stopPropagation();
    const point = getCanvasPoint(e);
    if (!point) return;
    setResizeState({
      annotationId: annotation.id,
      handle,
      startPoint: point,
      startBounds: annotation.bounds,
    });
    onAnnotationSelect(annotation);
  };

  const renderAnnotation = (annotation: PdfAnnotation) => {
    const isSelected = selectedAnnotationIds.includes(annotation.id) || selectedAnnotation?.id === annotation.id;
    const isEditingText = textEditor?.id === annotation.id && annotation.type === PdfAnnotationType.TEXT;
    const showOutline = annotation.type !== PdfAnnotationType.TEXT
      ? (isSelected || activeTool === 'shape' || activeTool === 'highlight')
      : (isSelected && activeTool === 'move');

    const baseStyle: React.CSSProperties = {
      left: annotation.bounds.x,
      top: annotation.bounds.y,
      width: annotation.bounds.width,
      height: annotation.bounds.height,
      zIndex: annotation.zIndex,
      opacity: annotation.style.opacity ?? 1,
      borderColor: showOutline ? (isSelected ? '#3b82f6' : annotation.style.strokeColor || '#2563eb') : 'transparent',
      borderWidth: showOutline ? (annotation.type === PdfAnnotationType.HIGHLIGHT ? 1 : annotation.style.strokeWidth || 1) : 0,
      borderStyle: showOutline ? 'solid' : 'none',
      backgroundColor:
        annotation.type === PdfAnnotationType.HIGHLIGHT
          ? annotation.style.fillColor || '#fde047'
          : annotation.type === PdfAnnotationType.TEXT
            ? (annotation.style.fillColor === 'transparent' ? 'transparent' : (annotation.style.fillColor || '#FFFFFF'))
            : annotation.style.fillColor && annotation.style.fillColor !== 'transparent'
              ? annotation.style.fillColor
              : 'transparent',
      borderRadius: annotation.type === PdfAnnotationType.CIRCLE ? '9999px' : 0,
    };

    return (
      <div
        key={annotation.id}
        className="absolute pointer-events-auto cursor-pointer"
        style={baseStyle}
        onClick={(e) => handleAnnotationClick(e, annotation)}
        onMouseDown={(e) => handleAnnotationMouseDown(e, annotation)}
      >
        {annotation.type === PdfAnnotationType.TEXT && !isEditingText && (
          <div
            className="w-full h-full px-2 py-1 select-none overflow-hidden flex items-center bg-white rounded-xs"
            style={{
              color: annotation.style.textColor || '#111827',
              fontSize: annotation.style.fontSize || 16,
              fontFamily: annotation.style.fontFamily || 'Arial',
              fontWeight: annotation.style.fontWeight || 'normal',
              fontStyle: annotation.style.fontStyle || 'normal',
              textDecoration: annotation.style.textDecoration || 'none',
              textAlign: annotation.style.textAlign || 'left',
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              lineHeight: 1.3,
            }}
          >
            {String(annotation.data?.text || '')}
          </div>
        )}

        {annotation.type === PdfAnnotationType.TEXT && isEditingText && (
          <textarea
            autoFocus
            value={textEditor?.value || ''}
            placeholder="Type text..."
            onBlur={commitTextEditor}
            onChange={(ev) => {
              const nextValue = ev.target.value;
              setTextEditor((prev) => {
                if (!prev) return prev;
                const next = { ...prev, value: nextValue };
                textEditorRef.current = next;
                return next;
              });
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onFocus={(e) => {
              e.currentTarget.select();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                commitTextEditor();
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                textEditorRef.current = null;
                setTextEditor(null);
              }
            }}
            className="h-full w-full resize-none border border-[#3557f0] bg-white/95 px-1 py-0.5 outline-none"
            style={{
              color: annotation.style.textColor || '#111827',
              fontSize: annotation.style.fontSize || 16,
              fontFamily: annotation.style.fontFamily || 'Arial',
              fontWeight: annotation.style.fontWeight || 'normal',
              fontStyle: annotation.style.fontStyle || 'normal',
              textDecoration: annotation.style.textDecoration || 'none',
              textAlign: annotation.style.textAlign || 'left',
              whiteSpace: "pre-wrap",
              lineHeight: 1.2,
            }}
          />
        )}

        {annotation.type === PdfAnnotationType.IMAGE && annotation.data?.src && (
          <img src={annotation.data.src} alt="annotation" className="h-full w-full object-contain" draggable={false} />
        )}

        {isAnnotationLocked(annotation) && (
          <div className="pointer-events-none absolute -top-6 -right-1 rounded bg-slate-900/90 px-1.5 py-0.5 text-[10px] text-white shadow">
            locked
          </div>
        )}

        {annotation.type === PdfAnnotationType.FREEHAND && (
          <svg className="absolute inset-0 h-full w-full overflow-visible">
            <polyline
              points={String(
                (annotation.data?.points || [])
                  .map((p: Point) => `${p.x - annotation.bounds.x},${p.y - annotation.bounds.y}`)
                  .join(' ')
              )}
              fill="none"
              stroke={annotation.style.strokeColor || '#1f2937'}
              strokeWidth={annotation.style.strokeWidth || 2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}

        {isSelected && activeTool === 'move' && annotation.type !== PdfAnnotationType.FREEHAND && !isAnnotationLocked(annotation) && (
          <>
            {(['nw', 'ne', 'sw', 'se'] as ResizeHandle[]).map((handle) => {
              const handleStyle: React.CSSProperties = {
                position: 'absolute',
                width: 10,
                height: 10,
                borderRadius: 9999,
                backgroundColor: '#3557f0',
                border: '2px solid white',
                boxShadow: '0 0 0 1px #3557f0',
                cursor: `${handle}-resize`,
              };

              if (handle === 'nw') {
                handleStyle.left = -6;
                handleStyle.top = -6;
              }
              if (handle === 'ne') {
                handleStyle.right = -6;
                handleStyle.top = -6;
              }
              if (handle === 'sw') {
                handleStyle.left = -6;
                handleStyle.bottom = -6;
              }
              if (handle === 'se') {
                handleStyle.right = -6;
                handleStyle.bottom = -6;
              }

              return (
                <div
                  key={handle}
                  style={handleStyle}
                  onMouseDown={(e) => handleResizeHandleMouseDown(e, annotation, handle)}
                />
              );
            })}
          </>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-slate-600">Loading PDF...</p>
        </div>
      </div>
    );
  }

  const previewRect = drawStart && drawCurrent ? normalizeRect(drawStart, drawCurrent) : null;

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-auto bg-[#e5e7eb]">
      <div className="flex justify-center p-5 pb-32 min-h-full">
        <div
          className="relative bg-white shadow-[0_10px_28px_rgba(0,0,0,0.16)] border border-slate-300"
          style={{ width: canvasSize.width || undefined, height: canvasSize.height || undefined }}
        >
          <canvas
            ref={canvasRef}
            className="block"
            style={{ maxWidth: '100%', height: 'auto', cursor: activeTool === 'move' ? 'default' : 'crosshair' }}
          />

          <div
            className="absolute inset-0"
            style={{ width: canvasSize.width, height: canvasSize.height }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={resetInteraction}
          >
            {/* Interactive Extracted Text Layer for 1-Click Natural Editing */}
            {(activeTool === 'editText' || activeTool === 'move') && pageTextItems.map((item) => {
              const isEditing = activeEditingId === item.id;
              const isModified = item.currentStr !== item.originalStr;

              return (
                <div
                  key={item.id}
                  style={{
                    position: 'absolute',
                    left: item.x,
                    top: item.y,
                    minWidth: Math.max(24, item.width),
                    minHeight: item.height,
                    zIndex: isEditing ? 30 : isModified ? 15 : 2,
                    backgroundColor: isEditing || isModified ? '#FFFFFF' : 'transparent',
                  }}
                  className="cursor-text select-none"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveEditingId(item.id);
                  }}
                >
                  {isEditing ? (
                    <input
                      autoFocus
                      type="text"
                      value={item.currentStr}
                      onChange={(e) => {
                        const nextVal = e.target.value;
                        setPageTextItems((prev) =>
                          prev.map((t) => (t.id === item.id ? { ...t, currentStr: nextVal, isModified: true } : t))
                        );
                      }}
                      onBlur={() => {
                        setActiveEditingId(null);
                        if (item.currentStr !== item.originalStr) {
                          onAnnotationAdd({
                            id: `edited_${item.id}`,
                            type: 'text' as any,
                            pageNumber: currentPageNum,
                            bounds: new DOMRect(item.x, item.y, item.width, item.height),
                            data: {
                              text: item.currentStr,
                              originalText: item.originalStr,
                              isExistingText: true,
                            },
                            style: {
                              textColor: '#0f172a',
                              fillColor: '#FFFFFF',
                              fontSize: Math.round(item.fontSize),
                              fontFamily: item.fontFamily,
                              fontWeight: item.fontWeight,
                              fontStyle: item.fontStyle,
                            },
                            createdAt: new Date(),
                            modifiedAt: new Date(),
                            isVisible: true,
                            zIndex: 20,
                          });
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
                        }
                      }}
                      className="w-full h-full bg-white text-slate-900 px-0.5 py-0 outline-none border-none"
                      style={{
                        fontSize: item.fontSize,
                        fontFamily: item.fontFamily,
                        fontWeight: item.fontWeight,
                        fontStyle: item.fontStyle,
                        lineHeight: 1,
                        WebkitFontSmoothing: 'antialiased',
                      }}
                    />
                  ) : (
                    <div
                      className="w-full h-full px-0.5 py-0 select-none flex items-center bg-transparent"
                      style={{
                        fontSize: item.fontSize,
                        fontFamily: item.fontFamily,
                        fontWeight: item.fontWeight,
                        fontStyle: item.fontStyle,
                        color: isModified ? '#0f172a' : 'transparent',
                        lineHeight: 1,
                        WebkitFontSmoothing: 'antialiased',
                      }}
                    >
                      {item.currentStr}
                    </div>
                  )}
                </div>
              );
            })}

            {pageAnnotations.map(renderAnnotation)}

            {previewRect && (activeTool === 'shape' || activeTool === 'highlight') && (
              <div
                className="absolute"
                style={{
                  left: previewRect.x,
                  top: previewRect.y,
                  width: previewRect.width,
                  height: previewRect.height,
                  border: `2px dashed ${activeTool === 'highlight' ? '#facc15' : '#3b82f6'}`,
                  borderRadius: activeTool === 'shape' && shapeType === 'ellipse' ? '9999px' : 0,
                  backgroundColor: activeTool === 'highlight' ? 'rgba(253, 224, 71, 0.35)' : 'rgba(59, 130, 246, 0.12)',
                }}
              />
            )}

            {activeTool === 'draw' && freehandPoints.length > 1 && (
              <svg className="absolute inset-0 h-full w-full pointer-events-none">
                <polyline
                  points={freehandPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke="#1f2937"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-lg bg-white/95 border border-slate-200 px-3 py-1.5 shadow-sm">
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => handlePageDelta(-1)}
                disabled={currentPageNum <= 1}
                className="h-7 w-7 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
              >
                ←
              </button>
              <span className="font-medium text-slate-700">{currentPageNum} / {document.totalPages}</span>
              <button
                onClick={() => handlePageDelta(1)}
                disabled={currentPageNum >= document.totalPages}
                className="h-7 w-7 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
              >
                →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
