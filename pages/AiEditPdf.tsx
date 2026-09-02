import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eraser,
  FileText,
  Highlighter,
  Loader2,
  MousePointer2,
  ScanSearch,
  Type,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import Tesseract from "tesseract.js";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { FileUploader } from "../components/FileUploader";
import { Button } from "../components/Button";
import { formatBytes, pdfjs } from "../services/pdfService";
import { ToolSEOContent } from "../components/ToolSEOContent";

type EditorTool = "select" | "edit-text" | "add-text" | "erase" | "highlight";
type TokenSource = "pdf" | "ocr";

interface EditableToken {
  id: string;
  pageNumber: number;
  text: string;
  editedText: string;
  xRatio: number;
  yRatio: number;
  widthRatio: number;
  heightRatio: number;
  fontRatio: number;
  source: TokenSource;
}

interface AddedText {
  id: string;
  pageNumber: number;
  text: string;
  xRatio: number;
  yRatio: number;
  fontRatio: number;
}

interface HighlightMark {
  id: string;
  pageNumber: number;
  xRatio: number;
  yRatio: number;
  widthRatio: number;
  heightRatio: number;
}

interface PageRenderInfo {
  width: number;
  height: number;
}

interface DragState {
  kind: "token" | "added";
  id: string;
  startX: number;
  startY: number;
  origXRatio: number;
  origYRatio: number;
}

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

const clampRatio = (value: number) => Math.max(0, Math.min(1, value));
const makeId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;

const tools: { id: EditorTool; label: string; icon: React.ReactNode }[] = [
  { id: "select", label: "Move", icon: <MousePointer2 className="h-4 w-4" /> },
  { id: "edit-text", label: "Edit Text", icon: <Type className="h-4 w-4" /> },
  { id: "erase", label: "Eraser", icon: <Eraser className="h-4 w-4" /> },
  { id: "highlight", label: "Highlight", icon: <Highlighter className="h-4 w-4" /> },
  { id: "add-text", label: "Add Text", icon: <Type className="h-4 w-4" /> },
];

const AiEditPdf: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState(0);
  const [extractError, setExtractError] = useState("");

  const [pdfDoc, setPdfDoc] = useState<any | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1.25);
  const [renderingPage, setRenderingPage] = useState(false);
  const [pageInfo, setPageInfo] = useState<PageRenderInfo>({ width: 1, height: 1 });

  const [tokens, setTokens] = useState<EditableToken[]>([]);
  const [addedTexts, setAddedTexts] = useState<AddedText[]>([]);
  const [highlights, setHighlights] = useState<HighlightMark[]>([]);
  const [deletedTokenIds, setDeletedTokenIds] = useState<Set<string>>(new Set());

  const [tool, setTool] = useState<EditorTool>("edit-text");
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [editingTokenId, setEditingTokenId] = useState<string | null>(null);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrStatus, setOcrStatus] = useState("");

  const [thumbnailUrls, setThumbnailUrls] = useState<string[]>([]);
  const [thumbnailLoading, setThumbnailLoading] = useState(false);

  const [applying, setApplying] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [highlightStart, setHighlightStart] = useState<{ x: number; y: number } | null>(null);
  const [highlightPreview, setHighlightPreview] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const [dragState, setDragState] = useState<DragState | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const pageTokens = useMemo(() => tokens.filter((token) => token.pageNumber === currentPage), [tokens, currentPage]);

  const visiblePageTokens = useMemo(
    () => pageTokens.filter((token) => !deletedTokenIds.has(token.id)),
    [pageTokens, deletedTokenIds]
  );

  const pageAddedTexts = useMemo(() => addedTexts.filter((item) => item.pageNumber === currentPage), [addedTexts, currentPage]);

  const pageHighlights = useMemo(() => highlights.filter((item) => item.pageNumber === currentPage), [highlights, currentPage]);

  const selectedToken = useMemo(
    () => visiblePageTokens.find((token) => token.id === selectedTokenId) || null,
    [visiblePageTokens, selectedTokenId]
  );

  const stepUploadDone = Boolean(file);
  const stepExtractDone = !extracting && tokens.length > 0;
  const stepEditDone =
    tokens.some((t) => t.text !== t.editedText) || deletedTokenIds.size > 0 || addedTexts.length > 0 || highlights.length > 0;
  const stepGenerateDone = Boolean(successMessage);

  const clearDocState = useCallback(async () => {
    if (pdfDoc) {
      try {
        await pdfDoc.destroy();
      } catch {
        // no-op
      }
    }

    setPdfDoc(null);
    setTotalPages(0);
    setCurrentPage(1);
    setTokens([]);
    setAddedTexts([]);
    setHighlights([]);
    setDeletedTokenIds(new Set());
    setSelectedTokenId(null);
    setEditingTokenId(null);
    setSuccessMessage("");
    setErrorMessage("");
    setOcrStatus("");
    setThumbnailUrls([]);
  }, [pdfDoc]);

  useEffect(() => {
    return () => {
      if (pdfDoc) {
        pdfDoc.destroy().catch(() => undefined);
      }
    };
  }, [pdfDoc]);

  const renderCurrentPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;
    try {
      setRenderingPage(true);
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale: zoom });
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) return;

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      setPageInfo({ width: canvas.width, height: canvas.height });

      await page.render({ canvasContext: context, viewport }).promise;
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to render page.");
    } finally {
      setRenderingPage(false);
    }
  }, [pdfDoc, currentPage, zoom]);

  useEffect(() => {
    renderCurrentPage();
  }, [renderCurrentPage]);

  useEffect(() => {
    let cancelled = false;

    const loadThumbnails = async () => {
      if (!pdfDoc || !totalPages) {
        setThumbnailUrls([]);
        return;
      }

      try {
        setThumbnailLoading(true);
        const urls: string[] = [];
        for (let p = 1; p <= totalPages; p++) {
          const page = await pdfDoc.getPage(p);
          const viewport = page.getViewport({ scale: 0.22 });
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          const context = canvas.getContext("2d");
          if (!context) continue;
          await page.render({ canvasContext: context, viewport }).promise;
          urls.push(canvas.toDataURL("image/png"));
        }

        if (!cancelled) {
          setThumbnailUrls(urls);
        }
      } catch {
        if (!cancelled) {
          setThumbnailUrls([]);
        }
      } finally {
        if (!cancelled) {
          setThumbnailLoading(false);
        }
      }
    };

    loadThumbnails();

    return () => {
      cancelled = true;
    };
  }, [pdfDoc, totalPages]);

  const extractEditableTokensFromPdf = async (selected: File) => {
    setExtracting(true);
    setExtractError("");
    setErrorMessage("");
    setSuccessMessage("");
    setExtractProgress(0);

    try {
      const bytes = await selected.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: bytes });
      const loadedPdf = await loadingTask.promise;
      setPdfDoc(loadedPdf);
      setTotalPages(loadedPdf.numPages || 0);
      setCurrentPage(1);

      const nextTokens: EditableToken[] = [];
      for (let pageNumber = 1; pageNumber <= loadedPdf.numPages; pageNumber++) {
        const page = await loadedPdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1 });
        const content = await page.getTextContent();
        const entries = (content.items || []) as any[];

        entries.forEach((entry) => {
          const text = String(entry?.str || "").replace(/\s+/g, " ").trim();
          if (!text) return;
          const transform = Array.isArray(entry?.transform) ? entry.transform : [1, 0, 0, 1, 0, 0];
          const fontSize = Math.max(8, Math.abs(Number(transform[3] || 0)) || Math.abs(Number(entry?.height || 0)) || 11);
          const x = Number(transform[4] || 0);
          const yBottom = Number(transform[5] || 0);
          const width = Math.max(1, Number(entry?.width || 0));
          const height = Math.max(1, Math.abs(Number(entry?.height || fontSize)));
          const yTop = viewport.height - yBottom - height;

          nextTokens.push({
            id: makeId("pdf"),
            pageNumber,
            text,
            editedText: text,
            xRatio: clampRatio(x / viewport.width),
            yRatio: clampRatio(yTop / viewport.height),
            widthRatio: clampRatio(width / viewport.width),
            heightRatio: clampRatio(height / viewport.height),
            fontRatio: clampRatio(fontSize / viewport.height),
            source: "pdf",
          });
        });

        setExtractProgress(Math.round((pageNumber / loadedPdf.numPages) * 100));
      }

      setTokens(nextTokens);
      if (!nextTokens.length) {
        setExtractError("No selectable text found. Run OCR for scanned page.");
      }
    } catch (err: any) {
      setExtractError(err?.message || "Failed to extract PDF text.");
    } finally {
      setExtracting(false);
    }
  };

  const handleFileSelected = async (files: File[]) => {
    const selected = files[0];
    if (!selected) return;

    if (selected.size > MAX_FILE_SIZE_BYTES) {
      setExtractError("File too large. Max size is 50MB.");
      return;
    }

    await clearDocState();
    setFile(selected);
    await extractEditableTokensFromPdf(selected);
  };

  const runOcrOnCurrentPage = async () => {
    if (!pdfDoc || ocrRunning) return;

    setOcrRunning(true);
    setOcrStatus("Preparing OCR engine...");
    setErrorMessage("");

    let worker: any = null;

    try {
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale: 2.2 });
      const ocrCanvas = document.createElement("canvas");
      ocrCanvas.width = Math.floor(viewport.width);
      ocrCanvas.height = Math.floor(viewport.height);
      const ctx = ocrCanvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context unavailable.");

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, ocrCanvas.width, ocrCanvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;

      const imageDataUrl = ocrCanvas.toDataURL("image/png");

      worker = await Tesseract.createWorker("eng", 1, {
        logger: (message: any) => {
          if (message?.status === "recognizing text") {
            setOcrStatus(`Recognizing text ${Math.round((message.progress || 0) * 100)}%`);
          }
        },
      });

      setOcrStatus("Reading scanned text...");
      const result = await worker.recognize(imageDataUrl);
      const words = result?.data?.words || [];

      const ocrTokens: EditableToken[] = words
        .filter((word: any) => {
          const text = String(word?.text || "").trim();
          return text.length > 0;
        })
        .map((word: any) => {
          const text = String(word?.text || "").trim();
          const x0 = Number(word?.bbox?.x0 || 0);
          const y0 = Number(word?.bbox?.y0 || 0);
          const x1 = Number(word?.bbox?.x1 || x0 + 1);
          const y1 = Number(word?.bbox?.y1 || y0 + 1);
          const width = Math.max(1, x1 - x0);
          const height = Math.max(1, y1 - y0);

          return {
            id: makeId("ocr"),
            pageNumber: currentPage,
            text,
            editedText: text,
            xRatio: clampRatio(x0 / ocrCanvas.width),
            yRatio: clampRatio(y0 / ocrCanvas.height),
            widthRatio: clampRatio(width / ocrCanvas.width),
            heightRatio: clampRatio(height / ocrCanvas.height),
            fontRatio: clampRatio((height * 0.85) / ocrCanvas.height),
            source: "ocr",
          };
        });

      setTokens((prev) => {
        const withoutCurrentOcr = prev.filter((token) => !(token.pageNumber === currentPage && token.source === "ocr"));
        return [...withoutCurrentOcr, ...ocrTokens];
      });

      setOcrStatus(`OCR done. ${ocrTokens.length} text word(s) detected on page ${currentPage}.`);
    } catch (err: any) {
      setErrorMessage(err?.message || "OCR failed on this page.");
      setOcrStatus("");
    } finally {
      if (worker) {
        await worker.terminate();
      }
      setOcrRunning(false);
    }
  };

  const getStageCoords = (clientX: number, clientY: number) => {
    const stage = stageRef.current;
    if (!stage || !pageInfo.width || !pageInfo.height) return null;
    const rect = stage.getBoundingClientRect();
    const x = Math.max(0, Math.min(pageInfo.width, clientX - rect.left));
    const y = Math.max(0, Math.min(pageInfo.height, clientY - rect.top));
    return { x, y };
  };

  const startDragging = (kind: "token" | "added", id: string, event: React.MouseEvent, xRatio: number, yRatio: number) => {
    if (tool !== "select") return;
    const coords = getStageCoords(event.clientX, event.clientY);
    if (!coords) return;

    event.preventDefault();
    event.stopPropagation();

    setDragState({
      kind,
      id,
      startX: coords.x,
      startY: coords.y,
      origXRatio: xRatio,
      origYRatio: yRatio,
    });
  };

  const handleStageClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (dragState || !pageInfo.width || !pageInfo.height) return;

    if (tool === "add-text") {
      const coords = getStageCoords(event.clientX, event.clientY);
      if (!coords) return;
      const text = window.prompt("Enter text to place:", "New text");
      if (!text?.trim()) return;

      setAddedTexts((prev) => [
        ...prev,
        {
          id: makeId("add"),
          pageNumber: currentPage,
          text: text.trim(),
          xRatio: clampRatio(coords.x / pageInfo.width),
          yRatio: clampRatio(coords.y / pageInfo.height),
          fontRatio: clampRatio(14 / pageInfo.height),
        },
      ]);
      return;
    }

    if (tool === "highlight") {
      const coords = getStageCoords(event.clientX, event.clientY);
      if (!coords) return;
      setHighlightStart(coords);
      setHighlightPreview({ x: coords.x, y: coords.y, width: 0, height: 0 });
    }
  };

  const handleStageMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (dragState && pageInfo.width && pageInfo.height) {
      const coords = getStageCoords(event.clientX, event.clientY);
      if (!coords) return;

      const dx = coords.x - dragState.startX;
      const dy = coords.y - dragState.startY;

      const nextXRatio = clampRatio((dragState.origXRatio * pageInfo.width + dx) / pageInfo.width);
      const nextYRatio = clampRatio((dragState.origYRatio * pageInfo.height + dy) / pageInfo.height);

      if (dragState.kind === "token") {
        setTokens((prev) => prev.map((item) => (item.id === dragState.id ? { ...item, xRatio: nextXRatio, yRatio: nextYRatio } : item)));
      } else {
        setAddedTexts((prev) =>
          prev.map((item) => (item.id === dragState.id ? { ...item, xRatio: nextXRatio, yRatio: nextYRatio } : item))
        );
      }
      return;
    }

    if (tool !== "highlight" || !highlightStart || !pageInfo.width || !pageInfo.height) return;
    const coords = getStageCoords(event.clientX, event.clientY);
    if (!coords) return;

    const x = Math.min(highlightStart.x, coords.x);
    const y = Math.min(highlightStart.y, coords.y);
    const width = Math.abs(coords.x - highlightStart.x);
    const height = Math.abs(coords.y - highlightStart.y);
    setHighlightPreview({ x, y, width, height });
  };

  const handleStageMouseUp = () => {
    if (dragState) {
      setDragState(null);
      return;
    }

    if (tool !== "highlight" || !highlightPreview || !pageInfo.width || !pageInfo.height) {
      setHighlightStart(null);
      setHighlightPreview(null);
      return;
    }

    if (highlightPreview.width >= 8 && highlightPreview.height >= 8) {
      setHighlights((prev) => [
        ...prev,
        {
          id: makeId("hl"),
          pageNumber: currentPage,
          xRatio: clampRatio(highlightPreview.x / pageInfo.width),
          yRatio: clampRatio(highlightPreview.y / pageInfo.height),
          widthRatio: clampRatio(highlightPreview.width / pageInfo.width),
          heightRatio: clampRatio(highlightPreview.height / pageInfo.height),
        },
      ]);
    }

    setHighlightStart(null);
    setHighlightPreview(null);
  };

  const handleTokenClick = (token: EditableToken) => {
    if (tool === "erase") {
      setDeletedTokenIds((prev) => {
        const next = new Set(prev);
        next.add(token.id);
        return next;
      });
      return;
    }

    setSelectedTokenId(token.id);
    if (tool === "edit-text") {
      setEditingTokenId(token.id);
    }
  };

  const handleApplyAndDownload = async () => {
    if (!file) {
      setErrorMessage("Upload a PDF first.");
      return;
    }

    setApplying(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const bytes = await file.arrayBuffer();
      const outPdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const font = await outPdf.embedFont(StandardFonts.Helvetica);
      const pages = outPdf.getPages();

      let changeCount = 0;

      const changedTokens = tokens.filter((token) => token.editedText !== token.text || deletedTokenIds.has(token.id));

      for (const token of changedTokens) {
        const page = pages[token.pageNumber - 1];
        if (!page) continue;

        const pageWidth = page.getWidth();
        const pageHeight = page.getHeight();

        const x = token.xRatio * pageWidth;
        const top = token.yRatio * pageHeight;
        const width = Math.max(2, token.widthRatio * pageWidth);
        const height = Math.max(2, token.heightRatio * pageHeight);
        const y = pageHeight - top - height;

        page.drawRectangle({
          x: Math.max(0, x - 1.5),
          y: Math.max(0, y - 1.5),
          width: Math.min(pageWidth, width + 3),
          height: Math.min(pageHeight, height + 3),
          color: rgb(1, 1, 1),
        });

        if (!deletedTokenIds.has(token.id)) {
          const nextText = token.editedText.trim();
          if (nextText) {
            const fontSize = Math.max(8, token.fontRatio * pageHeight || 11);
            page.drawText(nextText, {
              x,
              y: Math.max(0, y + 1),
              size: fontSize,
              font,
              color: rgb(0, 0, 0),
            });
            changeCount += 1;
          }
        } else {
          changeCount += 1;
        }
      }

      for (const mark of highlights) {
        const page = pages[mark.pageNumber - 1];
        if (!page) continue;
        const pageWidth = page.getWidth();
        const pageHeight = page.getHeight();
        const x = mark.xRatio * pageWidth;
        const top = mark.yRatio * pageHeight;
        const width = Math.max(2, mark.widthRatio * pageWidth);
        const height = Math.max(2, mark.heightRatio * pageHeight);
        const y = pageHeight - top - height;

        page.drawRectangle({
          x,
          y,
          width,
          height,
          color: rgb(1, 0.95, 0.35),
        });
        changeCount += 1;
      }

      for (const add of addedTexts) {
        const page = pages[add.pageNumber - 1];
        if (!page) continue;
        const pageWidth = page.getWidth();
        const pageHeight = page.getHeight();
        const x = add.xRatio * pageWidth;
        const top = add.yRatio * pageHeight;
        const y = pageHeight - top;
        const fontSize = Math.max(10, add.fontRatio * pageHeight || 14);

        page.drawText(add.text, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        });
        changeCount += 1;
      }

      if (!changeCount) {
        setErrorMessage("No edits to apply yet.");
        return;
      }

      const editedBytes = await outPdf.save();
      const blob = new Blob([editedBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${file.name.replace(/\.pdf$/i, "")}-edited.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      setSuccessMessage(`Done. ${changeCount} change(s) applied and PDF generated.`);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to generate edited PDF.");
    } finally {
      setApplying(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Edit PDF Online | LAK PDF</title>
        <meta
          name="description"
          content="Edit scanned and regular PDFs with click-to-edit text, OCR detection, highlights, and direct PDF generation."
        />
        <link rel="canonical" href="https://lakpdf.com/ai-edit-pdf" />
        <meta property="og:title" content="Edit PDF Online with AI | Click-to-Edit - LAK PDF" />
        <meta property="og:description" content="Edit PDF online with AI. Click any text to edit, OCR scanned PDFs, add highlights and annotations." />
        <meta property="og:url" content="https://lakpdf.com/ai-edit-pdf" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://lakpdf.com/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Edit PDF Online with AI | Click-to-Edit - LAK PDF" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Edit PDF Online with AI | Click-to-Edit - LAK PDF" />
        <meta name="twitter:description" content="Edit PDF online with AI. Click any text to edit, OCR scanned PDFs, add highlights and annotations." />
        <meta name="twitter:image" content="https://lakpdf.com/og-image.png" />
      </Helmet>

      <div className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="mx-auto max-w-7xl space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">PDF Editor</h1>
            <p className="mt-1 text-sm text-slate-600">Scanned PDF editing with OCR + direct click-to-edit workflow.</p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <FileUploader
              onFilesSelected={handleFileSelected}
              accept=".pdf,application/pdf"
              multiple={false}
              title="Select PDF File"
              description="Drag & Drop PDF here or choose file (Max size: 50MB)"
              icon={<FileText className="mx-auto mb-4 h-14 w-14 text-slate-400" />}
            />

            {file && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <span className="font-semibold">{file.name}</span> ({formatBytes(file.size)})
              </div>
            )}

            {extracting && (
              <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Extracting text layer... {extractProgress}%
              </div>
            )}

            {extractError && <p className="mt-3 text-sm text-amber-700">{extractError}</p>}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <p className="font-semibold text-slate-800">Progress Pipeline</p>
              <p className={stepUploadDone ? "text-emerald-700" : "text-slate-600"}>1. Upload PDF {stepUploadDone ? "✓" : ""}</p>
              <p className={stepExtractDone ? "text-emerald-700" : extracting ? "text-blue-700" : "text-slate-600"}>
                2. Extract text layer {stepExtractDone ? "✓" : extracting ? "(in progress)" : ""}
              </p>
              <p className={stepEditDone ? "text-emerald-700" : "text-slate-600"}>3. Edit text on canvas {stepEditDone ? "✓" : ""}</p>
              <p className={stepGenerateDone ? "text-emerald-700" : applying ? "text-blue-700" : "text-slate-600"}>
                4. Generate PDF {stepGenerateDone ? "✓" : applying ? "(in progress)" : ""}
              </p>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1 || renderingPage}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Prev
              </Button>
              <span className="text-xs text-slate-600">Page {currentPage}/{Math.max(1, totalPages)}</span>
              <Button
                variant="secondary"
                onClick={() => setCurrentPage((p) => Math.min(Math.max(totalPages, 1), p + 1))}
                disabled={totalPages < 2 || currentPage >= totalPages || renderingPage}
              >
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
              <Button variant="secondary" onClick={() => setZoom((z) => Math.max(0.7, Number((z - 0.15).toFixed(2))))}>
                <ZoomOut className="mr-1 h-4 w-4" /> Zoom Out
              </Button>
              <Button variant="secondary" onClick={() => setZoom((z) => Math.min(2.5, Number((z + 0.15).toFixed(2))))}>
                <ZoomIn className="mr-1 h-4 w-4" /> Zoom In
              </Button>
              <Button variant="secondary" onClick={runOcrOnCurrentPage} disabled={!pdfDoc || ocrRunning || applying}>
                {ocrRunning ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <ScanSearch className="mr-1 h-4 w-4" />}
                OCR Current Page
              </Button>
            </div>

            {ocrStatus && <p className="mb-3 text-xs text-blue-700">{ocrStatus}</p>}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <aside className="lg:col-span-3">
                <div className="h-[360px] sm:h-[460px] lg:h-[600px] overflow-auto rounded border border-slate-200 bg-slate-100 p-2">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Thumbnails</p>
                  {thumbnailLoading && (
                    <div className="mb-2 flex items-center gap-2 text-xs text-slate-600">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading...
                    </div>
                  )}

                  <div className="space-y-2">
                    {Array.from({ length: Math.max(totalPages, 0) }, (_, idx) => idx + 1).map((pageNumber) => {
                      const active = pageNumber === currentPage;
                      const thumbSrc = thumbnailUrls[pageNumber - 1];
                      return (
                        <button
                          key={pageNumber}
                          onClick={() => setCurrentPage(pageNumber)}
                          className={`w-full rounded border p-1 text-left transition ${
                            active ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <p className="mb-1 text-[11px] text-slate-600">Page {pageNumber}</p>
                          {thumbSrc ? (
                            <img src={thumbSrc} alt={`Thumbnail ${pageNumber}`} className="w-full rounded border border-slate-200" />
                          ) : (
                            <div className="h-24 w-full rounded border border-slate-200 bg-slate-200" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </aside>

              <div className="lg:col-span-9">
                <div className="pdf-preview h-[360px] sm:h-[460px] lg:h-[600px] overflow-auto rounded border border-slate-200 bg-slate-100 p-2 sm:p-3">
                  <div
                    ref={stageRef}
                    className={`relative mx-auto w-fit ${tool === "select" ? "cursor-move" : "cursor-crosshair"}`}
                    onClick={handleStageClick}
                    onMouseMove={handleStageMouseMove}
                    onMouseUp={handleStageMouseUp}
                    onMouseLeave={handleStageMouseUp}
                  >
                    {renderingPage && (
                      <div className="absolute left-3 top-3 z-20 flex items-center gap-2 rounded bg-white px-2 py-1 text-xs text-slate-600 shadow">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Rendering...
                      </div>
                    )}

                    <canvas ref={canvasRef} className="block rounded bg-white shadow" />

                    <div className="absolute inset-0 z-10">
                      {pageHighlights.map((item) => (
                        <div
                          key={item.id}
                          className="absolute border border-yellow-400 bg-yellow-300/50"
                          style={{
                            left: item.xRatio * pageInfo.width,
                            top: item.yRatio * pageInfo.height,
                            width: item.widthRatio * pageInfo.width,
                            height: item.heightRatio * pageInfo.height,
                          }}
                        />
                      ))}

                      {highlightPreview && (
                        <div
                          className="absolute border border-yellow-500 bg-yellow-300/50"
                          style={{
                            left: highlightPreview.x,
                            top: highlightPreview.y,
                            width: highlightPreview.width,
                            height: highlightPreview.height,
                          }}
                        />
                      )}

                      {visiblePageTokens.map((token) => {
                        const left = token.xRatio * pageInfo.width;
                        const top = token.yRatio * pageInfo.height;
                        const width = Math.max(14, token.widthRatio * pageInfo.width);
                        const height = Math.max(12, token.heightRatio * pageInfo.height);
                        const selected = selectedTokenId === token.id;
                        const editing = editingTokenId === token.id;

                        return (
                          <div
                            key={token.id}
                            className={`absolute ${selected ? "ring-2 ring-blue-400" : "ring-1 ring-transparent"}`}
                            style={{ left, top, width, minHeight: height }}
                            onMouseDown={(e) => startDragging("token", token.id, e, token.xRatio, token.yRatio)}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTokenClick(token);
                            }}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              if (tool !== "edit-text") return;
                              setEditingTokenId(token.id);
                              setSelectedTokenId(token.id);
                            }}
                          >
                            {editing ? (
                              <input
                                autoFocus
                                value={token.editedText}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setTokens((prev) =>
                                    prev.map((item) => (item.id === token.id ? { ...item, editedText: value } : item))
                                  );
                                }}
                                onBlur={() => setEditingTokenId(null)}
                                onMouseDown={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") setEditingTokenId(null);
                                  if (e.key === "Escape") {
                                    setTokens((prev) =>
                                      prev.map((item) => (item.id === token.id ? { ...item, editedText: item.text } : item))
                                    );
                                    setEditingTokenId(null);
                                  }
                                }}
                                className="w-full rounded border border-blue-300 bg-white px-1 py-0.5 text-xs text-slate-900 shadow"
                              />
                            ) : (
                              <div className="cursor-text rounded bg-white/75 px-1 py-0.5 text-[11px] text-slate-900">{token.editedText}</div>
                            )}
                          </div>
                        );
                      })}

                      {pageAddedTexts.map((item) => (
                        <div
                          key={item.id}
                          className="absolute rounded bg-white/85 px-1 py-0.5 text-xs text-slate-900 ring-1 ring-emerald-400"
                          style={{ left: item.xRatio * pageInfo.width, top: item.yRatio * pageInfo.height }}
                          onMouseDown={(e) => startDragging("added", item.id, e, item.xRatio, item.yRatio)}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {item.text}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-3 z-20 mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur">
              <div className="flex min-w-max items-center gap-2">
                {tools.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setTool(item.id)}
                    className={`inline-flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs transition ${
                      tool === item.id
                        ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                        : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {selectedToken && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                <p>
                  <span className="font-semibold">Selected:</span> {selectedToken.text}
                </p>
                <p>
                  <span className="font-semibold">Current:</span> {selectedToken.editedText}
                </p>
                <p>
                  <span className="font-semibold">Source:</span> {selectedToken.source.toUpperCase()}
                </p>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-3">
              <Button onClick={handleApplyAndDownload} isLoading={applying} disabled={!file || extracting || ocrRunning}>
                <Download className="mr-2 h-4 w-4" />
                Apply Changes & Download
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setDeletedTokenIds(new Set());
                  setHighlights([]);
                  setAddedTexts([]);
                  setTokens((prev) => prev.map((item) => ({ ...item, editedText: item.text })));
                }}
                disabled={applying}
              >
                Reset Edits
              </Button>
            </div>

            {errorMessage && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}
          </section>
        </div>
      </div>
      <ToolSEOContent toolKey="/ai-edit-pdf" />
    </>
  );
};

export default AiEditPdf;
