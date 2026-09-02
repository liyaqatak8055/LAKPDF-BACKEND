import React, { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Upload,
  FileText,
  Menu,
  Grid3X3,
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
} from "lucide-react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { pdfjs } from "../services/pdfService";
import { useEditorState } from "../components/pdf-editor/hooks/useEditorState";
import { PdfViewer, type ActiveEditorTool } from "../components/pdf-editor/PdfViewer";
import { PageThumbnails } from "../components/pdf-editor/PageThumbnails";
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
const textFonts = ["Arial", "Times New Roman", "Courier New", "Verdana"] as const;

const getPdfFontByStyle = (style: { fontFamily?: string; fontWeight?: string; fontStyle?: string }) => {
  const family = (style.fontFamily || "Arial").toLowerCase();
  const isBold = style.fontWeight === "bold";
  const isItalic = style.fontStyle === "italic";

  if (family.includes("times")) {
    if (isBold && isItalic) return StandardFonts.TimesRomanBoldItalic;
    if (isBold) return StandardFonts.TimesRomanBold;
    if (isItalic) return StandardFonts.TimesRomanItalic;
    return StandardFonts.TimesRoman;
  }

  if (family.includes("courier")) {
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
  const [isPreparing, setIsPreparing] = useState(false);
  const [notice, setNotice] = useState("");
  const [selectedAnnotationIds, setSelectedAnnotationIds] = useState<string[]>([]);
  const [clipboard, setClipboard] = useState<PdfAnnotation[]>([]);
  const imagePickerRef = useRef<HTMLInputElement | null>(null);
  const replacePdfRef = useRef<HTMLInputElement | null>(null);

  const busy = isLoading || isPreparing;
  const selectedTextAnnotation =
    selectedAnnotation && selectedAnnotation.type === PdfAnnotationType.TEXT ? selectedAnnotation : null;

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
        file,
        totalPages: pdf.numPages,
        currentPage: Math.max(1, Math.min(pdf.numPages, options?.preserveAnnotations && document ? document.currentPage : restoredPage)),
        zoom: 1,
        rotation: 0,
        viewport: {
          width: 0,
          height: 0,
          scale: 1,
          offsetX: 0,
          offsetY: 0,
        },
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
      const sourceBytes = await document.file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(sourceBytes);
      const pages = pdfDoc.getPages();
      const embeddedFonts = new Map<string, any>();

      for (const annotation of document.annotations) {
        const pageIndex = Math.max(0, annotation.pageNumber - 1);
        const page = pages[pageIndex];
        if (!page) continue;
        const pageHeight = page.getHeight();
        const x = annotation.bounds.x;
        const width = Math.max(1, annotation.bounds.width);
        const height = Math.max(1, annotation.bounds.height);
        const y = pageHeight - annotation.bounds.y - height;

        if (annotation.type === PdfAnnotationType.TEXT) {
          const text = String(annotation.data?.text || "");
          if (!text) continue;

          // Draw solid whiteout background behind text to cover underlying PDF text
          const fillColor = annotation.style.fillColor;
          if (fillColor !== "transparent") {
            page.drawRectangle({
              x: x - 1,
              y: y - 1,
              width: width + 2,
              height: height + 2,
              color: hexToRgb(fillColor || "#FFFFFF"),
              opacity: annotation.style.opacity ?? 1,
            });
          }

          const fontKey = getPdfFontByStyle(annotation.style);
          let font = embeddedFonts.get(fontKey);
          if (!font) {
            font = await pdfDoc.embedFont(fontKey);
            embeddedFonts.set(fontKey, font);
          }
          const fontSize = annotation.style.fontSize || 16;
          const lines = text.split("\n");
          const maxLineWidth = Math.max(...lines.map((line) => font.widthOfTextAtSize(line || " ", fontSize)));
          const align = annotation.style.textAlign || "left";
          const drawX =
            align === "center"
              ? x + Math.max(0, (width - maxLineWidth) / 2)
              : align === "right"
                ? x + Math.max(0, width - maxLineWidth)
                : x;
          const lineHeight = fontSize * 1.25;
          lines.forEach((line, index) => {
            page.drawText(line || " ", {
              x: drawX,
              y: y + Math.max(2, height - lineHeight * (index + 1) + 2),
              size: fontSize,
              font,
              color: hexToRgb(annotation.style.textColor || "#111827"),
            });
          });
          continue;
        }

        if (annotation.type === PdfAnnotationType.RECTANGLE || annotation.type === PdfAnnotationType.HIGHLIGHT) {
          page.drawRectangle({
            x,
            y,
            width,
            height,
            borderColor: hexToRgb(annotation.style.strokeColor || "#2563eb"),
            borderWidth: annotation.style.strokeWidth || 1,
            color:
              annotation.type === PdfAnnotationType.HIGHLIGHT
                ? hexToRgb(annotation.style.fillColor || "#fde047")
                : undefined,
            opacity: annotation.style.opacity ?? 1,
          });
          continue;
        }

        if (annotation.type === PdfAnnotationType.CIRCLE) {
          page.drawEllipse({
            x: x + width / 2,
            y: y + height / 2,
            xScale: width / 2,
            yScale: height / 2,
            borderColor: hexToRgb(annotation.style.strokeColor || "#2563eb"),
            borderWidth: annotation.style.strokeWidth || 1,
            opacity: annotation.style.opacity ?? 1,
          });
          continue;
        }

        if (annotation.type === PdfAnnotationType.FREEHAND) {
          const points = Array.isArray(annotation.data?.points) ? annotation.data.points : [];
          for (let i = 1; i < points.length; i += 1) {
            const p1 = points[i - 1];
            const p2 = points[i];
            page.drawLine({
              start: { x: p1.x, y: pageHeight - p1.y },
              end: { x: p2.x, y: pageHeight - p2.y },
              thickness: annotation.style.strokeWidth || 2,
              color: hexToRgb(annotation.style.strokeColor || "#1f2937"),
              opacity: annotation.style.opacity ?? 1,
            });
          }
          continue;
        }

        if (annotation.type === PdfAnnotationType.IMAGE) {
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
      const sourceName = document.file.name.replace(/\.pdf$/i, "");
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

  const toolButton = (tool: ActiveEditorTool, label: string, icon: React.ReactNode, action?: () => void) => (
    <button
      type="button"
      key={tool + label}
      onClick={() => {
        setTool(tool);
        action?.();
      }}
      className={`h-14 min-w-[74px] border-r border-slate-200 px-3 text-xs font-medium transition ${activeTool === tool ? "bg-white text-[#3d54f5]" : "bg-[#f4f4f7] text-slate-600 hover:bg-white"
        }`}
      aria-pressed={activeTool === tool}
    >
      <span className="mx-auto mb-1 block w-fit">{icon}</span>
      <span className="block whitespace-nowrap">{label}</span>
    </button>
  );

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

      <div className="min-h-[calc(100vh-4rem)] bg-[#ececf2]">
        <h1 className="sr-only">Edit PDF Online Free</h1>
        <input ref={imagePickerRef} type="file" accept="image/*" className="hidden" onChange={onImagePickInput} />
        <input ref={replacePdfRef} type="file" accept="application/pdf" className="hidden" onChange={onReplaceInput} />

        {document && (
          <header className="sticky top-16 z-40 border-b border-slate-300 bg-white/95 backdrop-blur">
            <div className="h-24 border-b border-slate-200 px-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" type="button" aria-label="Menu">
                  <Menu className="h-6 w-6" />
                </button>
                <div className="text-5xl leading-none text-red-600">❤</div>
                <div className="text-5xl font-extrabold tracking-tight text-slate-900">LAK PDF</div>
              </div>
              <button className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" type="button" aria-label="More">
                <Grid3X3 className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={() => replacePdfRef.current?.click()}
                className="ml-2 inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Replace className="h-4 w-4" />
                Replace PDF
              </button>
            </div>

            <div className="h-20 flex items-center border-b border-slate-200 bg-[#f4f4f7]">
              <div className="px-5">
                <div className="inline-flex rounded-full bg-[#4b4d5a] p-1 text-sm text-white">
                  <button
                    type="button"
                    onClick={() => setEditorTab("annotate")}
                    className={`rounded-full px-4 py-1.5 ${editorTab === "annotate" ? "bg-white text-slate-800" : "text-white"}`}
                  >
                    Annotate
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorTab("edit")}
                    className={`rounded-full px-4 py-1.5 ${editorTab === "edit" ? "bg-white text-slate-800" : "text-white"}`}
                  >
                    Edit
                  </button>
                </div>
              </div>

              <div className="flex overflow-x-auto border-l border-slate-300">
                {toolButton("move", "Move", <Hand className="h-5 w-5" />)}
                {toolButton("addText", "Add Text", <Type className="h-5 w-5" />)}
                {toolButton("editText", "Edit Text", <Type className="h-5 w-5" />)}
                {toolButton("image", "Image", <ImagePlus className="h-5 w-5" />, () => {
                  if (!pendingImageSrc) requestImagePick();
                })}
                {toolButton("draw", "Pencil", <Pencil className="h-5 w-5" />)}
                {toolButton("highlight", "Highlight", <Highlighter className="h-5 w-5" />)}
                {toolButton("shape", shapeType === "rectangle" ? "Rect" : "Ellipse", <Shapes className="h-5 w-5" />, () => {
                  if (activeTool === "shape") {
                    setShapeType((prev) => (prev === "rectangle" ? "ellipse" : "rectangle"));
                  }
                })}
                {toolButton("erase", "Eraser", <Eraser className="h-5 w-5" />)}
                <button
                  type="button"
                  onClick={toggleThumbnails}
                  className={`h-14 min-w-[74px] border-r border-slate-200 px-3 text-xs font-medium transition ${showThumbnails ? "bg-white text-[#3d54f5]" : "bg-[#f4f4f7] text-slate-600 hover:bg-white"
                    }`}
                >
                  <span className="mx-auto mb-1 block w-fit"><PanelLeft className="h-5 w-5" /></span>
                  <span className="block whitespace-nowrap">Pages</span>
                </button>
              </div>
            </div>

            {selectedTextAnnotation && (
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-2">
                <button
                  type="button"
                  onClick={() => setTool("editText")}
                  className="rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Text mode
                </button>
                <select
                  value={selectedTextAnnotation.style.fontFamily || "Arial"}
                  onChange={(e) => updateSelectedTextStyle({ fontFamily: e.target.value })}
                  className="h-9 rounded border border-slate-300 bg-white px-2 text-sm text-slate-700"
                >
                  {textFonts.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>
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
                  className="h-9 w-20 rounded border border-slate-300 bg-white px-2 text-sm text-slate-700"
                />
                <button
                  type="button"
                  onClick={() =>
                    updateSelectedTextStyle({
                      fontWeight: selectedTextAnnotation.style.fontWeight === "bold" ? "normal" : "bold",
                    })
                  }
                  className={`rounded border px-2 py-2 ${selectedTextAnnotation.style.fontWeight === "bold"
                    ? "border-[#3d54f5] bg-[#eef1ff] text-[#2d45da]"
                    : "border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                  title="Bold"
                >
                  <Bold className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateSelectedTextStyle({
                      fontStyle: selectedTextAnnotation.style.fontStyle === "italic" ? "normal" : "italic",
                    })
                  }
                  className={`rounded border px-2 py-2 ${selectedTextAnnotation.style.fontStyle === "italic"
                    ? "border-[#3d54f5] bg-[#eef1ff] text-[#2d45da]"
                    : "border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                  title="Italic"
                >
                  <Italic className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateSelectedTextStyle({
                      textDecoration: selectedTextAnnotation.style.textDecoration === "underline" ? "none" : "underline",
                    })
                  }
                  className={`rounded border px-2 py-2 ${selectedTextAnnotation.style.textDecoration === "underline"
                    ? "border-[#3d54f5] bg-[#eef1ff] text-[#2d45da]"
                    : "border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                  title="Underline"
                >
                  <Underline className="h-4 w-4" />
                </button>
                <input
                  type="color"
                  value={selectedTextAnnotation.style.textColor || "#111827"}
                  onChange={(e) => updateSelectedTextStyle({ textColor: e.target.value })}
                  className="h-9 w-10 rounded border border-slate-300 bg-white p-1"
                  title="Text color"
                />
                <button
                  type="button"
                  onClick={() => updateSelectedTextStyle({ textAlign: "left" })}
                  className={`rounded border px-2 py-2 ${(selectedTextAnnotation.style.textAlign || "left") === "left"
                    ? "border-[#3d54f5] bg-[#eef1ff] text-[#2d45da]"
                    : "border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                  title="Align left"
                >
                  <AlignLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => updateSelectedTextStyle({ textAlign: "center" })}
                  className={`rounded border px-2 py-2 ${selectedTextAnnotation.style.textAlign === "center"
                    ? "border-[#3d54f5] bg-[#eef1ff] text-[#2d45da]"
                    : "border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                  title="Align center"
                >
                  <AlignCenter className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => updateSelectedTextStyle({ textAlign: "right" })}
                  className={`rounded border px-2 py-2 ${selectedTextAnnotation.style.textAlign === "right"
                    ? "border-[#3d54f5] bg-[#eef1ff] text-[#2d45da]"
                    : "border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                  title="Align right"
                >
                  <AlignRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedTextAnnotation) return;
                    deleteAnnotation(selectedTextAnnotation.id);
                    clearSelection();
                  }}
                  className="ml-2 rounded border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Delete text
                </button>
              </div>
            )}

            {selectedAnnotations.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-[#f8f9ff] px-4 py-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{selectedAnnotations.length} selected</span>
                <button
                  type="button"
                  onClick={copySelected}
                  className="inline-flex items-center gap-1 rounded border border-slate-300 px-2.5 py-1.5 text-sm text-slate-700 hover:bg-white"
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </button>
                <button
                  type="button"
                  onClick={pasteClipboard}
                  className="inline-flex items-center gap-1 rounded border border-slate-300 px-2.5 py-1.5 text-sm text-slate-700 hover:bg-white"
                >
                  <ClipboardPaste className="h-4 w-4" />
                  Paste
                </button>
                <button
                  type="button"
                  onClick={duplicateSelected}
                  className="inline-flex items-center gap-1 rounded border border-slate-300 px-2.5 py-1.5 text-sm text-slate-700 hover:bg-white"
                >
                  <Copy className="h-4 w-4" />
                  Duplicate
                </button>
                <button
                  type="button"
                  onClick={bringSelectedToFront}
                  className="inline-flex items-center gap-1 rounded border border-slate-300 px-2.5 py-1.5 text-sm text-slate-700 hover:bg-white"
                >
                  <Layers className="h-4 w-4" />
                  Bring front
                </button>
                <button
                  type="button"
                  onClick={sendSelectedToBack}
                  className="inline-flex items-center gap-1 rounded border border-slate-300 px-2.5 py-1.5 text-sm text-slate-700 hover:bg-white"
                >
                  <Layers className="h-4 w-4" />
                  Send back
                </button>
                <button
                  type="button"
                  onClick={toggleLockSelected}
                  className="inline-flex items-center gap-1 rounded border border-slate-300 px-2.5 py-1.5 text-sm text-slate-700 hover:bg-white"
                >
                  {selectedAnnotations.every((a) => a.data?.locked) ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  {selectedAnnotations.every((a) => a.data?.locked) ? "Unlock" : "Lock"}
                </button>
                <button
                  type="button"
                  onClick={deleteSelected}
                  className="inline-flex items-center gap-1 rounded border border-red-300 px-2.5 py-1.5 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
                <div className="mx-2 h-6 w-px bg-slate-200" />
                <label className="text-xs text-slate-600">Stroke</label>
                <input
                  type="color"
                  value={selectedAnnotations[0]?.style.strokeColor || "#2563eb"}
                  onChange={(e) => updateSelectedStyle({ strokeColor: e.target.value })}
                  className="h-8 w-9 rounded border border-slate-300 p-1"
                />
                <label className="text-xs text-slate-600">Fill</label>
                <input
                  type="color"
                  value={(selectedAnnotations[0]?.style.fillColor && selectedAnnotations[0]?.style.fillColor !== "transparent")
                    ? selectedAnnotations[0].style.fillColor
                    : "#ffffff"}
                  onChange={(e) => updateSelectedStyle({ fillColor: e.target.value })}
                  className="h-8 w-9 rounded border border-slate-300 p-1"
                />
                <label className="text-xs text-slate-600">Width</label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={selectedAnnotations[0]?.style.strokeWidth || 1}
                  onChange={(e) => updateSelectedStyle({ strokeWidth: Number(e.target.value) })}
                />
                <label className="text-xs text-slate-600">Opacity</label>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={selectedAnnotations[0]?.style.opacity ?? 1}
                  onChange={(e) => updateSelectedStyle({ opacity: Number(e.target.value) })}
                />
              </div>
            )}
          </header>
        )}

        <div className={document ? "mx-auto max-w-[1800px] px-4 py-5 pb-40" : "mx-auto max-w-3xl px-4 py-16"}>
          {(error || notice) && (
            <div className="mb-4 space-y-2">
              {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
              {notice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</div>}
            </div>
          )}

          {!document ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center shadow-sm">
              <FileText className="mx-auto mb-4 h-11 w-11 text-slate-400" />
              <p className="text-slate-700 text-2xl font-semibold">Select PDF</p>
              <p className="mt-2 text-slate-500">Upload one PDF to open editor tools.</p>
              <div className="mt-8 flex justify-center">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#3557f0] px-6 py-3 text-base font-semibold text-white hover:bg-[#2d49cd]">
                  <Upload className="h-4 w-4" />
                  Select PDF
                  <input type="file" accept="application/pdf" className="hidden" onChange={onFileInput} />
                </label>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-[16px_1fr] gap-3">
              <div className="rounded-full bg-slate-300/80 shadow-inner" />
              <div className="rounded-xl border border-slate-300 bg-white/70 shadow-sm overflow-hidden">
                <div className="grid min-h-[76vh] grid-cols-12">
                  {showThumbnails && (
                    <aside className="col-span-2 border-r border-slate-200 bg-slate-50 p-3 overflow-y-auto">
                      <PageThumbnails document={document} currentPage={document.currentPage} onPageSelect={handlePageSelect} />
                    </aside>
                  )}
                  <div className={showThumbnails ? "col-span-10 bg-[#e7e7ed]" : "col-span-12 bg-[#e7e7ed]"}>
                    {busy ? (
                      <div className="flex h-full items-center justify-center py-20 text-slate-600">Preparing editor...</div>
                    ) : (
                      <PdfViewer
                        document={document}
                        activeTool={activeTool}
                        shapeType={shapeType}
                        pendingImageSrc={pendingImageSrc}
                        selectedAnnotation={selectedAnnotation}
                        selectedAnnotationIds={selectedAnnotationIds}
                        zoom={zoom}
                        fitMode={fitMode}
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
            </div>
          )}
        </div>

        {document && (
          <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2">
            <div className="flex items-center gap-3 rounded-xl bg-[#454855] px-4 py-3 text-white shadow-2xl">
              <button className="rounded border border-white/20 p-1.5 hover:bg-white/10" onClick={() => changePage(-1)} type="button">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="min-w-[92px] text-center text-xl font-semibold">
                {document.currentPage} / {document.totalPages}
              </div>
              <button className="rounded border border-white/20 p-1.5 hover:bg-white/10" onClick={() => changePage(1)} type="button">
                <ChevronRight className="h-4 w-4" />
              </button>

              <div className="mx-1 h-8 w-px bg-white/20" />

              <button className="rounded border border-white/20 p-1.5 hover:bg-white/10" onClick={() => setZoom(clampZoom(zoom - 0.1))} type="button">
                <ZoomOut className="h-4 w-4" />
              </button>
              <div className="min-w-[70px] text-center text-lg font-semibold">{Math.round(zoom * 100)}%</div>
              <button className="rounded border border-white/20 p-1.5 hover:bg-white/10" onClick={() => setZoom(clampZoom(zoom + 0.1))} type="button">
                <ZoomIn className="h-4 w-4" />
              </button>

              <div className="mx-1 h-8 w-px bg-white/20" />

              <button
                type="button"
                onClick={markDone}
                className="inline-flex items-center gap-2 rounded-lg bg-[#f88d8d] px-4 py-2 font-semibold text-white hover:bg-[#ef7f7f]"
              >
                <Check className="h-4 w-4" />
                Save changes
              </button>

              <button type="button" onClick={undo} disabled={!canUndo} className="rounded border border-white/20 px-2 py-1 disabled:opacity-40 hover:bg-white/10">Undo</button>
              <button type="button" onClick={redo} disabled={!canRedo} className="rounded border border-white/20 px-2 py-1 disabled:opacity-40 hover:bg-white/10">Redo</button>
              <button type="button" onClick={resetEditor} className="rounded border border-white/20 px-2 py-1 hover:bg-white/10">Reset</button>
            </div>
          </div>
        )}
      </div>
      <ToolSEOContent toolKey="/pdf-editor" />
    </>
  );
};

export default PdfEditor;
