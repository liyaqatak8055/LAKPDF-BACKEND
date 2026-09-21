import React, { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Upload,
  FileText,
  Hand,
  Type,
  Eraser,
  Highlighter,
  Pencil,
  ImagePlus,
  Shapes,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Check,
  Download,
  PanelLeft,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Copy,
  ClipboardPaste,
  Layers,
  Lock,
  Unlock,
  Trash2,
  Replace,
  RotateCcw,
  Undo2,
  Redo2,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { pdfjs } from "../services/pdfService";
import { useEditorState } from "../components/pdf-editor/hooks/useEditorState";
import { PdfViewer, type ActiveEditorTool } from "../components/pdf-editor/PdfViewer";
import { PageThumbnails } from "../components/pdf-editor/PageThumbnails";
import { DocumentFlowEditor } from "../components/pdf-editor/DocumentFlowEditor";
import { PdfAnnotationType, PdfFitMode, type PdfAnnotation } from "../types/pdfEditor";
import { setLatestDownload } from "../utils/downloadCenter";
import { ToolSEOContent } from "../components/ToolSEOContent";

const hexToRgb = (hexValue: string) => {
  const hex = String(hexValue || "#000000").replace("#", "");
  const safe = hex.length === 3 ? hex.split("").map((v) => `${v}${v}`).join("") : hex.padEnd(6, "0").slice(0, 6);
  const r = parseInt(safe.slice(0, 2), 16) / 255;
  const g = parseInt(safe.slice(2, 4), 16) / 255;
  const b = parseInt(safe.slice(4, 6), 16) / 255;
  return rgb(r, g, b);
};

const clampZoom = (z: number) => Math.max(0.4, Math.min(3, z));
const formatFileSize = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return "0 KB";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};
const textFonts = ["Arial", "Times New Roman", "Courier New", "Verdana"] as const;

const getPdfFontByStyle = (style: { fontFamily?: string; fontWeight?: string | number; fontStyle?: string }) => {
  const family = (style.fontFamily || "Arial").toLowerCase();
  const weightStr = String(style.fontWeight || "").toLowerCase();
  const isBold = weightStr.includes("bold") || weightStr === "700" || weightStr === "800" || weightStr === "900";
  const isItalic = String(style.fontStyle || "").toLowerCase().includes("italic") || String(style.fontStyle || "").toLowerCase().includes("oblique");

  if (family.includes("times") || family.includes("serif") || family.includes("georgia")) {
    if (isBold && isItalic) return StandardFonts.TimesRomanBoldItalic;
    if (isBold) return StandardFonts.TimesRomanBold;
    if (isItalic) return StandardFonts.TimesRomanItalic;
    return StandardFonts.TimesRoman;
  }

  if (family.includes("courier") || family.includes("mono")) {
    if (isBold && isItalic) return StandardFonts.CourierBoldOblique;
    if (isBold) return StandardFonts.CourierBold;
    if (isItalic) return StandardFonts.CourierOblique;
    return StandardFonts.Courier;
  }

  if (isBold && isItalic) return StandardFonts.HelveticaBoldOblique;
  if (isBold) return StandardFonts.HelveticaBold;
  if (isItalic) return StandardFonts.HelveticaOblique;
  return StandardFonts.Helvetica;
};

type EditorTab = "annotate" | "edit";

const PdfEditor: React.FC = () => {
  const {
    document,
    selectedAnnotation,
    zoom,
    fitMode,
    showThumbnails,
    error,
    isLoading,
    canUndo,
    canRedo,
    setDocument,
    setSelectedAnnotation,
    setError,
    setZoom,
    setFitMode,
    toggleThumbnails,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    undo,
    redo,
    clearHistory,
  } = useEditorState();

  const [activeTool, setActiveTool] = useState<ActiveEditorTool>("move");
  const [shapeType, setShapeType] = useState<"rectangle" | "ellipse">("rectangle");
  const [pendingImageSrc, setPendingImageSrc] = useState<string | null>(null);
  const [editorTab, setEditorTab] = useState<EditorTab>("annotate");
  const [workspaceMode, setWorkspaceMode] = useState<"flow" | "canvas">("canvas");
  const [isPreparing, setIsPreparing] = useState(false);
  const [notice, setNotice] = useState("");
  const [selectedAnnotationIds, setSelectedAnnotationIds] = useState<string[]>([]);
  const [clipboard, setClipboard] = useState<PdfAnnotation[]>([]);
  const imagePickerRef = useRef<HTMLInputElement | null>(null);
  const replacePdfRef = useRef<HTMLInputElement | null>(null);

  const busy = isLoading || isPreparing;
  const selectedTextAnnotation: PdfAnnotation | null =
    selectedAnnotation && selectedAnnotation.type === PdfAnnotationType.TEXT ? (selectedAnnotation as PdfAnnotation) : null;

  const updateSelectedTextStyle = (updates: Record<string, any>) => {
    if (!selectedTextAnnotation) return;
    updateAnnotation(selectedTextAnnotation.id, {
      style: {
        ...selectedTextAnnotation.style,
        ...updates,
      },
      modifiedAt: new Date(),
    });
  };

  const selectedAnnotations = useMemo(() => {
    if (!document) return [] as PdfAnnotation[];
    const ids = new Set(selectedAnnotationIds);
    return document.annotations.filter((a) => ids.has(a.id));
  }, [document, selectedAnnotationIds]);

  const clearSelection = () => {
    setSelectedAnnotation(null);
    setSelectedAnnotationIds([]);
  };

  const selectSingleAnnotation = (annotation: PdfAnnotation | null) => {
    setSelectedAnnotation(annotation);
    setSelectedAnnotationIds(annotation ? [annotation.id] : []);
  };

  const toggleAnnotationSelection = (annotation: PdfAnnotation) => {
    if (!selectedAnnotation) {
      setSelectedAnnotation(annotation);
    }
    setSelectedAnnotationIds((prev) => (prev.includes(annotation.id) ? prev.filter((id) => id !== annotation.id) : [...prev, annotation.id]));
  };

  const bulkUpdateAnnotations = (updates: Array<{ id: string; updates: Partial<PdfAnnotation> }>) => {
    updates.forEach((item) => updateAnnotation(item.id, item.updates));
  };

  useEffect(() => {
    if (!selectedAnnotation) return;
    if (!selectedAnnotationIds.includes(selectedAnnotation.id)) {
      const nextPrimary = selectedAnnotations[0] || null;
      setSelectedAnnotation(nextPrimary);
    }
  }, [selectedAnnotation, selectedAnnotationIds, selectedAnnotations]);

  const setTool = (tool: ActiveEditorTool) => {
    setActiveTool(tool);
    if (tool !== "image") {
      setPendingImageSrc(null);
    }
    if (tool !== "move") {
      clearSelection();
    }
  };

  const onImagePickInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Failed to read image"));
        reader.readAsDataURL(file);
      });
      setPendingImageSrc(dataUrl);
      setTool("image");
      setNotice("Image selected. PDF par click karke place karein.");
    } catch {
      setError("Image load failed. Please try another image.");
    }
  };

  const requestImagePick = () => {
    imagePickerRef.current?.click();
  };

  const draftKeyForFile = (file: File) => `pdf-editor-draft:${file.name}:${file.size}:${file.lastModified}`;

  const loadFile = async (file: File, options?: { preserveAnnotations?: boolean }) => {
    if (!file || file.type !== "application/pdf") {
      setError("Please upload a valid PDF file.");
      return;
    }
    setIsPreparing(true);
    setError(null);
    setNotice("");
    try {
      const buffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: buffer }).promise;
      let restoredAnnotations: PdfAnnotation[] = [];
      let restoredPage = 1;

      if (!options?.preserveAnnotations) {
        const key = draftKeyForFile(file);
        const rawDraft = localStorage.getItem(key);
        if (rawDraft) {
          try {
            const parsed = JSON.parse(rawDraft);
            if (Array.isArray(parsed.annotations) && window.confirm("Saved draft mila hai. Restore karna hai?")) {
              restoredAnnotations = parsed.annotations;
              restoredPage = Number(parsed.currentPage || 1);
              setNotice("Draft restored.");
            }
          } catch {
            // ignore malformed drafts
          }
        }
      }

      const preserved = options?.preserveAnnotations && document ? document.annotations : restoredAnnotations;
      setDocument({
        id: `pdf-${Date.now()}`,
        fileName: file.name,
        fileSize: file.size,
        file,
        totalPages: pdf.numPages,
        currentPage: Math.max(1, Math.min(pdf.numPages, options?.preserveAnnotations && document ? document.currentPage : restoredPage)),
        zoom: 1,
        viewMode: 'single' as any,
        showGrid: false,
        showRulers: false,
        snapToGrid: false,
        gridSize: 20,
        isLoading: false,
        loadingProgress: 100,
        error: null,
        rotation: 0,
        viewport: {
          width: 0,
          height: 0,
          scale: 1,
          offsetX: 0,
          offsetY: 0,
        } as any,
        annotations: preserved.filter((a) => a.pageNumber <= pdf.numPages),
        isDirty: false,
        lastModified: new Date(),
      });
      setTool("move");
      clearSelection();
      clearHistory();
      if (options?.preserveAnnotations) {
        setNotice("PDF replaced. Existing annotations preserved.");
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load PDF file.");
    } finally {
      setIsPreparing(false);
    }
  };

  const onFileInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await loadFile(file);
    }
    event.target.value = "";
  };

  const onReplaceInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await loadFile(file, { preserveAnnotations: true });
    }
    event.target.value = "";
  };

  const handlePageSelect = (pageNumber: number) => {
    if (!document) return;
    setDocument({
      ...document,
      currentPage: pageNumber,
    });
    clearSelection();
  };

  const changePage = (delta: number) => {
    if (!document) return;
    const next = Math.max(1, Math.min(document.totalPages, document.currentPage + delta));
    handlePageSelect(next);
  };

  const resetEditor = () => {
    if (document?.file) {
      localStorage.removeItem(draftKeyForFile(document.file));
    }
    setDocument(null);
    clearSelection();
    setPendingImageSrc(null);
    setError(null);
    setNotice("");
    setTool("move");
  };

  const markDone = async () => {
    if (!document) {
      setNotice("Upload a PDF first.");
      return;
    }
    try {
      setIsPreparing(true);
      if (!document.file) {
        alert("Please select a PDF first.");
        setIsPreparing(false);
        return;
      }
      const sourceBytes = await document.file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(sourceBytes);
      const pages = pdfDoc.getPages();
      const embeddedFonts = new Map<string, any>();

      for (const rawAnnotation of document.annotations) {
        const annotation = rawAnnotation as PdfAnnotation;
        const pageIndex = Math.max(0, annotation.pageNumber - 1);
        const page = pages[pageIndex];
        if (!page) continue;
        const pageHeight = page.getHeight();
        const bounds = annotation.bounds || { x: 0, y: 0, width: 100, height: 40 };
        const scaleFactor = Number((annotation.data as any)?.canvasScale) || 1;
        const x = bounds.x / scaleFactor;
        const width = Math.max(1, bounds.width / scaleFactor);
        const height = Math.max(1, bounds.height / scaleFactor);
        const y = pageHeight - ((bounds.y + bounds.height) / scaleFactor);
        const style = annotation.style || {};

        if (annotation.type === PdfAnnotationType.TEXT) {
          const text = String(annotation.data?.text || "");
          if (!text) continue;

          // Draw solid whiteout background behind text to cover underlying PDF text
          const fillColor = style.fillColor;
          if (fillColor && fillColor !== "transparent") {
            page.drawRectangle({
              x: x - 2,
              y: y - 1,
              width: width + 4,
              height: height + 2,
              color: hexToRgb(fillColor || "#FFFFFF"),
              opacity: style.opacity ?? 1,
            });
          }

          const fontKey = getPdfFontByStyle(style);
          let font = embeddedFonts.get(fontKey);
          if (!font) {
            font = await pdfDoc.embedFont(fontKey);
            embeddedFonts.set(fontKey, font);
          }
          const fontSize = (style.fontSize || 16) / scaleFactor;
          const lines = text.split("\n");
          const maxLineWidth = Math.max(...lines.map((line) => font.widthOfTextAtSize(line || " ", fontSize)));
          const align = style.textAlign || "left";
          const drawX =
            align === "center"
              ? x + Math.max(0, (width - maxLineWidth) / 2)
              : align === "right"
                ? x + Math.max(0, width - maxLineWidth)
                : x;
          const lineHeight = fontSize * 1.22;
          lines.forEach((line, index) => {
            page.drawText(line || " ", {
              x: drawX,
              y: y + Math.max(1, height - lineHeight * (index + 0.82)),
              size: fontSize,
              font,
              color: hexToRgb(style.textColor || "#111827"),
            });
          });
          continue;
        }

        if (annotation.type === PdfAnnotationType.RECTANGLE || annotation.type === PdfAnnotationType.HIGHLIGHT || (annotation.type as any) === 'shape') {
          page.drawRectangle({
            x,
            y,
            width,
            height,
            borderColor: hexToRgb(style.strokeColor || "#2563eb"),
            borderWidth: style.strokeWidth || 1,
            color:
              annotation.type === PdfAnnotationType.HIGHLIGHT
                ? hexToRgb(style.fillColor || "#fde047")
                : undefined,
            opacity: style.opacity ?? 1,
          });
          continue;
        }

        if (annotation.type === PdfAnnotationType.CIRCLE || (annotation.type as any) === 'circle') {
          page.drawEllipse({
            x: x + width / 2,
            y: y + height / 2,
            xScale: width / 2,
            yScale: height / 2,
            borderColor: hexToRgb(style.strokeColor || "#2563eb"),
            borderWidth: style.strokeWidth || 1,
            opacity: style.opacity ?? 1,
          });
          continue;
        }

        if (annotation.type === PdfAnnotationType.FREEHAND || annotation.type === PdfAnnotationType.DRAWING || (annotation.type as any) === 'drawing') {
          const points = Array.isArray(annotation.data?.points) ? annotation.data.points : [];
          for (let i = 1; i < points.length; i += 1) {
            const p1 = points[i - 1];
            const p2 = points[i];
            page.drawLine({
              start: { x: p1.x, y: pageHeight - p1.y },
              end: { x: p2.x, y: pageHeight - p2.y },
              thickness: style.strokeWidth || 2,
              color: hexToRgb(style.strokeColor || "#1f2937"),
              opacity: style.opacity ?? 1,
            });
          }
          continue;
        }

        if (annotation.type === PdfAnnotationType.IMAGE || (annotation.type as any) === 'image') {
          const src = String(annotation.data?.src || "");
          if (!src.startsWith("data:image/")) continue;
          const base64 = src.split(",")[1];
          if (!base64) continue;
          const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
          const image = src.includes("image/png")
            ? await pdfDoc.embedPng(bytes)
            : await pdfDoc.embedJpg(bytes);
          page.drawImage(image, { x, y, width, height });
        }
      }

      const outBytes = await pdfDoc.save();
      const blob = new Blob([outBytes], { type: "application/pdf" });
      const sourceName = (document.file?.name || document.fileName || "edited").replace(/\.pdf$/i, "");
      const outputFilename = `${sourceName || "edited"}-edited.pdf`;
      setLatestDownload({
        filename: outputFilename,
        blob,
      });
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = outputFilename;
      a.click();
      URL.revokeObjectURL(url);
      setNotice("Edited PDF downloaded successfully.");
    } catch (e: any) {
      setError(e?.message || "Failed to export edited PDF.");
    } finally {
      setIsPreparing(false);
    }
  };

  const copySelected = () => {
    if (!selectedAnnotations.length) return;
    const payload = selectedAnnotations.map((a) => ({
      ...a,
      bounds: new DOMRect(a.bounds.x, a.bounds.y, a.bounds.width, a.bounds.height),
      data: { ...(a.data || {}) },
      style: { ...a.style },
    }));
    setClipboard(payload);
    setNotice(`${payload.length} annotation copied.`);
  };

  const pasteClipboard = () => {
    if (!document || !clipboard.length) return;
    const next = clipboard.map((a, idx) => {
      const id = `${a.type}-${Date.now()}-${idx}`;
      return {
        ...a,
        id,
        pageNumber: document.currentPage,
        bounds: new DOMRect(a.bounds.x + 18, a.bounds.y + 18, a.bounds.width, a.bounds.height),
        createdAt: new Date(),
        modifiedAt: new Date(),
        zIndex: (document.annotations.reduce((m, n) => Math.max(m, n.zIndex || 1), 1) || 1) + idx + 1,
      } as PdfAnnotation;
    });
    next.forEach((a) => addAnnotation(a));
    setSelectedAnnotation(next[next.length - 1] || null);
    setSelectedAnnotationIds(next.map((a) => a.id));
    setNotice(`${next.length} annotation pasted.`);
  };

  const duplicateSelected = () => {
    if (!document || !selectedAnnotations.length) return;
    const topBase = document.annotations.reduce((m, n) => Math.max(m, n.zIndex || 1), 1);
    const next = selectedAnnotations.map((a, idx) => ({
      ...a,
      id: `${a.type}-${Date.now()}-dup-${idx}`,
      pageNumber: document.currentPage,
      bounds: new DOMRect(a.bounds.x + 20, a.bounds.y + 20, a.bounds.width, a.bounds.height),
      data: { ...(a.data || {}) },
      style: { ...a.style },
      createdAt: new Date(),
      modifiedAt: new Date(),
      zIndex: topBase + idx + 1,
    })) as PdfAnnotation[];
    next.forEach((a) => addAnnotation(a));
    setSelectedAnnotation(next[next.length - 1] || null);
    setSelectedAnnotationIds(next.map((a) => a.id));
  };

  const deleteSelected = () => {
    if (!selectedAnnotations.length) return;
    selectedAnnotations.forEach((a) => {
      if (!a.data?.locked) {
        deleteAnnotation(a.id);
      }
    });
    clearSelection();
  };

  const updateSelectedStyle = (updates: Record<string, any>) => {
    selectedAnnotations.forEach((a) => {
      if (a.data?.locked) return;
      updateAnnotation(a.id, {
        style: { ...a.style, ...updates },
        modifiedAt: new Date(),
      });
    });
  };

  const toggleLockSelected = () => {
    if (!selectedAnnotations.length) return;
    const shouldLock = selectedAnnotations.some((a) => !a.data?.locked);
    selectedAnnotations.forEach((a) => {
      updateAnnotation(a.id, {
        data: { ...(a.data || {}), locked: shouldLock },
        modifiedAt: new Date(),
      });
    });
    setNotice(shouldLock ? "Selection locked." : "Selection unlocked.");
  };

  const bringSelectedToFront = () => {
    if (!document || !selectedAnnotations.length) return;
    let top = document.annotations.reduce((m, n) => Math.max(m, n.zIndex || 1), 1);
    selectedAnnotations.forEach((a) => {
      top += 1;
      updateAnnotation(a.id, { zIndex: top, modifiedAt: new Date() });
    });
  };

  const sendSelectedToBack = () => {
    if (!selectedAnnotations.length) return;
    let z = 1;
    selectedAnnotations.forEach((a) => {
      updateAnnotation(a.id, { zIndex: z, modifiedAt: new Date() });
      z += 1;
    });
  };

  useEffect(() => {
    if (!document?.file) return;
    const key = draftKeyForFile(document.file);
    const payload = {
      currentPage: document.currentPage,
      annotations: document.annotations,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(key, JSON.stringify(payload));
  }, [document?.file, document?.currentPage, document?.annotations]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!document) return;
      const target = event.target as HTMLElement | null;
      const tag = (target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable) return;

      const key = event.key.toLowerCase();
      const cmd = event.metaKey || event.ctrlKey;

      if (cmd && key === "c") {
        event.preventDefault();
        copySelected();
        return;
      }
      if (cmd && key === "v") {
        event.preventDefault();
        pasteClipboard();
        return;
      }

      if (key === "delete" || key === "backspace") {
        event.preventDefault();
        deleteSelected();
        return;
      }

      if (key === "v") setTool("move");
      if (key === "t") setTool("addText");
      if (key === "p") setTool("draw");
      if (key === "e") setTool("erase");
      if (key === "h") setTool("highlight");
      if (key === "i") setTool("image");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [document, selectedAnnotations, clipboard]);

  const toolButton = (tool: ActiveEditorTool, label: string, icon: React.ReactNode, action?: () => void) => {
    const isActive = activeTool === tool;
    return (
      <button
        type="button"
        key={tool + label}
        onClick={() => {
          setTool(tool);
          action?.();
        }}
        className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 sm:gap-2 transition-all select-none ${
          isActive
            ? "bg-primary-600 text-white shadow-sm shadow-primary-500/25 ring-1 ring-primary-500/30 font-bold"
            : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80"
        }`}
        aria-pressed={isActive}
        title={label}
      >
        <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">{icon}</span>
        <span className="whitespace-nowrap">{label}</span>
      </button>
    );
  };

  return (
    <>
      <Helmet>
        <title>Edit PDF Online | LAK PDF</title>
        <meta name="description" content="Edit PDF with a professional workspace: annotate, text, draw, image and export." />
        <link rel="canonical" href="https://lakpdf.com/pdf-editor" />
        <meta property="og:title" content="Edit PDF Online Free | PDF Editor - LAK PDF" />
        <meta property="og:description" content="Edit PDF online free with annotations, text, drawings, and image insertion. No signup required." />
        <meta property="og:url" content="https://lakpdf.com/pdf-editor" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://lakpdf.com/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Edit PDF Online Free | PDF Editor - LAK PDF" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Edit PDF Online Free | PDF Editor - LAK PDF" />
        <meta name="twitter:description" content="Edit PDF online free with annotations, text, drawings, and image insertion." />
        <meta name="twitter:image" content="https://lakpdf.com/og-image.png" />
      </Helmet>

      <div className="min-h-[calc(100vh-4rem)] bg-slate-100/70 dark:bg-dark-bg transition-colors">
        <h1 className="sr-only">Edit PDF Online Free</h1>
        <input ref={imagePickerRef} type="file" accept="image/*" className="hidden" onChange={onImagePickInput} />
        <input ref={replacePdfRef} type="file" accept="application/pdf" className="hidden" onChange={onReplaceInput} />

        {document && workspaceMode === "flow" && document.file ? (
          <DocumentFlowEditor
            file={document.file}
            fileName={document.fileName}
            onSwitchToCanvas={() => setWorkspaceMode("canvas")}
          />
        ) : (
          <>
            {document && (
              <header className="sticky top-16 z-40 border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xs">
            {/* Top Studio Bar */}
            <div className="h-16 px-4 sm:px-6 flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/60">
              {/* Document Meta Info */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-primary-500/20 flex-shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-800 dark:text-white truncate max-w-[160px] sm:max-w-xs md:max-w-sm">
                      {document.fileName || document.file?.name || "Document.pdf"}
                    </span>
                    <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300 border border-primary-100 dark:border-primary-900/40">
                      Studio
                    </span>
                  </div>
                  <div className="text-[12px] text-slate-400 dark:text-slate-500 flex items-center gap-2 font-medium">
                    <span>{document.totalPages} {document.totalPages === 1 ? "page" : "pages"}</span>
                    <span>•</span>
                    <span>{formatFileSize(document.fileSize)}</span>
                    <span className="hidden md:inline">•</span>
                    <span className="hidden md:inline text-emerald-600 dark:text-emerald-400 font-medium items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block mr-1" />Auto-saved
                    </span>
                  </div>
                </div>
              </div>

              {/* Center Quick History Controls */}
              <div className="hidden lg:flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={undo}
                  disabled={!canUndo}
                  className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer disabled:cursor-not-allowed"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={redo}
                  disabled={!canRedo}
                  className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer disabled:cursor-not-allowed"
                  title="Redo (Ctrl+Y)"
                >
                  <Redo2 className="w-4 h-4" />
                </button>
              </div>

              {/* Right Action Buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setWorkspaceMode("flow")}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition cursor-pointer"
                  title="Switch to Word Flow Mode for natural reflowable text editing"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Word Mode</span>
                </button>

                <button
                  type="button"
                  onClick={() => replacePdfRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 transition cursor-pointer"
                  title="Change Document"
                >
                  <Replace className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                  <span className="hidden sm:inline">Replace PDF</span>
                </button>

                <button
                  type="button"
                  onClick={resetEditor}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
                  title="Close & Clear"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Reset</span>
                </button>

                <button
                  type="button"
                  onClick={markDone}
                  disabled={busy}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-primary-600 via-primary-700 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 shadow-md shadow-primary-600/20 active:scale-98 transition disabled:opacity-50 cursor-pointer"
                >
                  {busy ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Exporting...</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      <span>Export PDF</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Studio Tools Bar */}
            <div className="py-2.5 px-4 sm:px-6 bg-slate-50/90 dark:bg-slate-900/90 flex items-center justify-between gap-3 overflow-x-auto border-b border-slate-200/60 dark:border-slate-800">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap">
                {/* Navigation Tools */}
                <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                  {toolButton("move", "Pan", <Hand className="h-4 w-4" />)}
                </div>

                <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-0.5 flex-shrink-0" />

                {/* Markup Tools */}
                <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                  {toolButton("addText", "Text", <Type className="h-4 w-4" />)}
                  {toolButton("draw", "Draw", <Pencil className="h-4 w-4" />)}
                  {toolButton("highlight", "Highlight", <Highlighter className="h-4 w-4" />)}
                  {toolButton("shape", shapeType === "rectangle" ? "Rectangle" : "Ellipse", <Shapes className="h-4 w-4" />, () => {
                    if (activeTool === "shape") {
                      setShapeType((prev) => (prev === "rectangle" ? "ellipse" : "rectangle"));
                    }
                  })}
                  {toolButton("image", "Image", <ImagePlus className="h-4 w-4" />, () => {
                    if (!pendingImageSrc) requestImagePick();
                  })}
                </div>

                <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-0.5 flex-shrink-0" />

                {/* Cleanup Tools */}
                <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                  {toolButton("erase", "Erase", <Eraser className="h-4 w-4" />)}
                </div>
              </div>

              {/* Right Pages Sidebar Toggle */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={toggleThumbnails}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border cursor-pointer ${
                    showThumbnails
                      ? "bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-950/60 dark:text-primary-300 dark:border-primary-800"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700"
                  }`}
                  title="Toggle Page Thumbnails"
                >
                  <PanelLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Thumbnails</span>
                </button>
              </div>
            </div>

            {/* Contextual Text Inspector */}
            {selectedTextAnnotation && (
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 px-4 sm:px-6 py-2 backdrop-blur-md">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Text Props</span>
                <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
                <button
                  type="button"
                  onClick={() => setTool("editText")}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Edit Content
                </button>
                <select
                  value={selectedTextAnnotation.style.fontFamily || "Arial"}
                  onChange={(e) => updateSelectedTextStyle({ fontFamily: e.target.value })}
                  className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  {textFonts.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <input
                    type="number"
                    min={8}
                    max={120}
                    value={selectedTextAnnotation.style.fontSize || 16}
                    onChange={(e) => {
                      const next = Number(e.target.value || 16);
                      if (!Number.isFinite(next)) return;
                      updateSelectedTextStyle({ fontSize: Math.max(8, Math.min(120, next)) });
                    }}
                    className="h-7 w-12 bg-transparent text-center text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
                  />
                  <span className="text-[11px] text-slate-400 pr-1.5 font-medium">px</span>
                </div>
                <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() =>
                      updateSelectedTextStyle({
                        fontWeight: selectedTextAnnotation.style.fontWeight === "bold" ? "normal" : "bold",
                      })
                    }
                    className={`p-1.5 rounded-md transition ${selectedTextAnnotation.style.fontWeight === "bold"
                      ? "bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-2xs font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                      }`}
                    title="Bold"
                  >
                    <Bold className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateSelectedTextStyle({
                        fontStyle: selectedTextAnnotation.style.fontStyle === "italic" ? "normal" : "italic",
                      })
                    }
                    className={`p-1.5 rounded-md transition ${selectedTextAnnotation.style.fontStyle === "italic"
                      ? "bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                      }`}
                    title="Italic"
                  >
                    <Italic className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateSelectedTextStyle({
                        textDecoration: selectedTextAnnotation.style.textDecoration === "underline" ? "none" : "underline",
                      })
                    }
                    className={`p-1.5 rounded-md transition ${selectedTextAnnotation.style.textDecoration === "underline"
                      ? "bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                      }`}
                    title="Underline"
                  >
                    <Underline className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400 font-medium">Color:</span>
                  <input
                    type="color"
                    value={selectedTextAnnotation.style.textColor || "#111827"}
                    onChange={(e) => updateSelectedTextStyle({ textColor: e.target.value })}
                    className="h-7 w-7 rounded-lg border border-slate-300 dark:border-slate-600 cursor-pointer p-0.5 bg-white"
                    title="Text color"
                  />
                </div>
                <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => updateSelectedTextStyle({ textAlign: "left" })}
                    className={`p-1.5 rounded-md transition ${(selectedTextAnnotation.style.textAlign || "left") === "left"
                      ? "bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                      }`}
                    title="Align left"
                  >
                    <AlignLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSelectedTextStyle({ textAlign: "center" })}
                    className={`p-1.5 rounded-md transition ${selectedTextAnnotation.style.textAlign === "center"
                      ? "bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                      }`}
                    title="Align center"
                  >
                    <AlignCenter className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSelectedTextStyle({ textAlign: "right" })}
                    className={`p-1.5 rounded-md transition ${selectedTextAnnotation.style.textAlign === "right"
                      ? "bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                      }`}
                    title="Align right"
                  >
                    <AlignRight className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedTextAnnotation) return;
                    deleteAnnotation(selectedTextAnnotation.id);
                    clearSelection();
                  }}
                  className="ml-auto inline-flex items-center gap-1 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 px-2.5 py-1 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 transition cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            )}

            {/* Contextual Shapes / Multi-Selection Inspector */}
            {selectedAnnotations.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-900/95 px-4 sm:px-6 py-2 backdrop-blur-md text-xs">
                <span className="px-2 py-0.5 rounded-md font-bold text-[11px] bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300">
                  {selectedAnnotations.length} {selectedAnnotations.length === 1 ? "item" : "items"} selected
                </span>
                <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />
                <button
                  type="button"
                  onClick={copySelected}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </button>
                <button
                  type="button"
                  onClick={pasteClipboard}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer"
                >
                  <ClipboardPaste className="h-3.5 w-3.5" />
                  Paste
                </button>
                <button
                  type="button"
                  onClick={duplicateSelected}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Duplicate
                </button>
                <button
                  type="button"
                  onClick={bringSelectedToFront}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer"
                >
                  <Layers className="h-3.5 w-3.5" />
                  Bring Front
                </button>
                <button
                  type="button"
                  onClick={sendSelectedToBack}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer"
                >
                  <Layers className="h-3.5 w-3.5" />
                  Send Back
                </button>
                <button
                  type="button"
                  onClick={toggleLockSelected}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer"
                >
                  {selectedAnnotations.every((a) => a.data?.locked) ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                  {selectedAnnotations.every((a) => a.data?.locked) ? "Unlock" : "Lock"}
                </button>
                <button
                  type="button"
                  onClick={deleteSelected}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/40 px-2.5 py-1 text-red-600 dark:text-red-400 hover:bg-red-100 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
                <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500">Stroke</span>
                  <input
                    type="color"
                    value={selectedAnnotations[0]?.style.strokeColor || "#2563eb"}
                    onChange={(e) => updateSelectedStyle({ strokeColor: e.target.value })}
                    className="h-6 w-6 rounded border border-slate-300 dark:border-slate-600 p-0.5 cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500">Fill</span>
                  <input
                    type="color"
                    value={(selectedAnnotations[0]?.style.fillColor && selectedAnnotations[0]?.style.fillColor !== "transparent")
                      ? selectedAnnotations[0].style.fillColor
                      : "#ffffff"}
                    onChange={(e) => updateSelectedStyle({ fillColor: e.target.value })}
                    className="h-6 w-6 rounded border border-slate-300 dark:border-slate-600 p-0.5 cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500">Width</span>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={selectedAnnotations[0]?.style.strokeWidth || 1}
                    onChange={(e) => updateSelectedStyle({ strokeWidth: Number(e.target.value) })}
                    className="w-16 accent-primary-600 cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500">Opacity</span>
                  <input
                    type="range"
                    min={0.1}
                    max={1}
                    step={0.05}
                    value={selectedAnnotations[0]?.style.opacity ?? 1}
                    onChange={(e) => updateSelectedStyle({ opacity: Number(e.target.value) })}
                    className="w-16 accent-primary-600 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </header>
        )}

        <div className={document ? "mx-auto max-w-[1800px] px-3 sm:px-6 py-5 pb-36" : "mx-auto max-w-3xl px-4 py-16"}>
          {(error || notice) && (
            <div className="mb-4 space-y-2">
              {error && <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/40 px-4 py-2.5 text-sm text-red-700 dark:text-red-300 font-medium shadow-2xs">{error}</div>}
              {notice && <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-2.5 text-sm text-emerald-700 dark:text-emerald-300 font-medium shadow-2xs">{notice}</div>}
            </div>
          )}

          {!document ? (
            <div className="max-w-2xl mx-auto py-8 sm:py-12 px-4">
              <div className="rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-8 sm:p-14 text-center shadow-lg shadow-slate-100 dark:shadow-none hover:border-primary-400 dark:hover:border-primary-600 transition-all duration-300">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white mx-auto mb-6 shadow-lg shadow-primary-500/25">
                  <FileText className="w-8 h-8" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Edit PDF Document
                </h2>
                <p className="mt-3 text-slate-500 dark:text-slate-400 text-sm sm:text-base max-w-md mx-auto">
                  Add text annotations, draw shapes, highlight sections, and insert images directly in your browser.
                </p>

                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <label className="inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-primary-600 via-primary-700 to-indigo-600 px-7 py-3.5 text-sm font-bold text-white shadow-md shadow-primary-600/20 hover:from-primary-700 hover:to-indigo-700 active:scale-98 transition">
                    <Upload className="h-4 w-4" />
                    <span>Choose PDF File</span>
                    <input type="file" accept="application/pdf" className="hidden" onChange={onFileInput} />
                  </label>
                </div>

                {/* Features Pill Badges */}
                <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">100% Private & In-Browser</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">No Signup or Limits</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Instant High-Res Export</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 shadow-sm overflow-hidden">
              <div className="grid min-h-[76vh] grid-cols-12">
                {showThumbnails && (
                  <aside className="col-span-12 sm:col-span-3 lg:col-span-2 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 overflow-y-auto">
                    <PageThumbnails document={document} currentPage={document.currentPage} onPageSelect={handlePageSelect} />
                  </aside>
                )}
                <div className={showThumbnails ? "col-span-12 sm:col-span-9 lg:col-span-10 bg-slate-100 dark:bg-slate-950/60" : "col-span-12 bg-slate-100 dark:bg-slate-950/60"}>
                  {busy ? (
                    <div className="flex h-full items-center justify-center py-20 text-slate-600 dark:text-slate-400">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm font-medium">Preparing editor...</span>
                      </div>
                    </div>
                  ) : (
                    <PdfViewer
                      document={document}
                      activeTool={activeTool}
                      shapeType={shapeType}
                      pendingImageSrc={pendingImageSrc}
                      selectedAnnotation={selectedAnnotation}
                      selectedAnnotationIds={selectedAnnotationIds}
                      zoom={zoom}
                      fitMode={fitMode as PdfFitMode}
                      onAnnotationAdd={addAnnotation}
                      onAnnotationSelect={selectSingleAnnotation}
                      onAnnotationToggleSelect={toggleAnnotationSelection}
                      onAnnotationUpdate={updateAnnotation}
                      onAnnotationBulkUpdate={bulkUpdateAnnotations}
                      onAnnotationDelete={deleteAnnotation}
                      onRequestToolChange={setTool}
                      onRequestImagePick={requestImagePick}
                      onConsumePendingImage={() => {
                        setPendingImageSrc(null);
                        setNotice("");
                      }}
                      onZoomChange={setZoom}
                      onFitModeChange={(mode) => setFitMode(mode as PdfFitMode)}
                      onPageChange={handlePageSelect}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Floating Bottom Canvas Dock */}
        {document && (
          <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
            <div className="flex items-center gap-2 sm:gap-3 rounded-2xl bg-slate-900/90 dark:bg-slate-950/90 px-4 py-2.5 text-white shadow-2xl backdrop-blur-md border border-white/10 ring-1 ring-black/20">
              {/* Page Navigator */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => changePage(-1)}
                  disabled={document.currentPage <= 1}
                  className="rounded-lg p-1.5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer disabled:cursor-not-allowed"
                  title="Previous Page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="px-2 text-center text-xs font-semibold tracking-wide text-slate-200 min-w-[70px]">
                  {document.currentPage} / {document.totalPages}
                </div>
                <button
                  type="button"
                  onClick={() => changePage(1)}
                  disabled={document.currentPage >= document.totalPages}
                  className="rounded-lg p-1.5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer disabled:cursor-not-allowed"
                  title="Next Page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="h-5 w-px bg-white/15" />

              {/* Zoom Controls */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setZoom(clampZoom(zoom - 0.1))}
                  className="rounded-lg p-1.5 hover:bg-white/10 transition cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  className="px-2 text-center text-xs font-semibold text-slate-200 hover:text-white min-w-[48px] rounded hover:bg-white/10 py-1 transition cursor-pointer"
                  title="Reset to 100%"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(clampZoom(zoom + 0.1))}
                  className="rounded-lg p-1.5 hover:bg-white/10 transition cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
              </div>

              <div className="h-5 w-px bg-white/15" />

              {/* Quick Undo / Redo in dock */}
              <button
                type="button"
                onClick={undo}
                disabled={!canUndo}
                className="rounded-lg p-1.5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer disabled:cursor-not-allowed"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={redo}
                disabled={!canRedo}
                className="rounded-lg p-1.5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer disabled:cursor-not-allowed"
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
          </>
        )}
      </div>
      <ToolSEOContent toolKey="/pdf-editor" />
    </>
  );
};

export default PdfEditor;
