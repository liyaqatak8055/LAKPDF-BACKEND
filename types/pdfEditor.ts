/**
 * Core Type Definitions for Canva-Like PDF Editor
 * Defines all layer types, state structures, and interfaces
 */

// ============ LAYER TYPES ============

export type LayerType = 'text' | 'image' | 'shape' | 'drawing' | 'highlight' | 'signature';
export type ShapeType = 'rectangle' | 'circle' | 'arrow' | 'line';
export type Tool = 'select' | 'text' | 'image' | 'shape' | 'draw' | 'highlight' | 'pan';
export type ViewMode = 'single' | 'continuous';
export type TextAlign = 'left' | 'center' | 'right' | 'justify';
export type FontWeight = 'normal' | 'bold';
export type FontStyle = 'normal' | 'italic';
export type TextDecoration = 'none' | 'underline' | 'line-through';

// ============ BASE LAYER ============

export interface Transform {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number; // degrees
    scaleX: number;
    scaleY: number;
}

export interface BaseLayer {
    id: string;
    type: LayerType;
    pageNumber: number;
    name: string;
    visible: boolean;
    locked: boolean;
    opacity: number; // 0-1
    zIndex: number;
    transform: Transform;
    createdAt: number;
    modifiedAt: number;
}

// ============ TEXT LAYER ============

export interface TextLayer extends BaseLayer {
    type: 'text';
    content: string;
    fontFamily: string;
    fontSize: number;
    fontWeight: FontWeight;
    fontStyle: FontStyle;
    textDecoration: TextDecoration;
    color: string;
    backgroundColor: string;
    textAlign: TextAlign;
    lineHeight: number;
    letterSpacing: number;
    isEditable: boolean; // From original PDF or newly added
    isEditing: boolean; // Currently being edited
}

// ============ IMAGE LAYER ============

export interface ImageFilters {
    brightness: number; // 0-200
    contrast: number; // 0-200
    saturation: number; // 0-200
    blur: number; // 0-10
    grayscale: number; // 0-1
}

export interface ImageLayer extends BaseLayer {
    type: 'image';
    src: string; // Data URL or blob URL
    originalWidth: number;
    originalHeight: number;
    filters: ImageFilters;
    flipX: boolean;
    flipY: boolean;
    cropData?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

// ============ SHAPE LAYER ============

export interface ShapeLayer extends BaseLayer {
    type: 'shape';
    shapeType: ShapeType;
    fill: string;
    stroke: string;
    strokeWidth: number;
    cornerRadius?: number; // For rectangles
    startPoint?: { x: number; y: number }; // For arrows/lines
    endPoint?: { x: number; y: number }; // For arrows/lines
    arrowHeadSize?: number; // For arrows
}

// ============ DRAWING LAYER ============

export interface DrawingPath {
    points: Array<{ x: number; y: number; pressure?: number }>;
    timestamp: number;
}

export interface DrawingLayer extends BaseLayer {
    type: 'drawing';
    paths: DrawingPath[];
    strokeColor: string;
    strokeWidth: number;
    smoothing: number; // 0-1
    eraserMode: boolean;
}

// ============ HIGHLIGHT LAYER ============

export interface HighlightLayer extends BaseLayer {
    type: 'highlight';
    color: string;
    blendMode: 'multiply' | 'screen' | 'overlay';
}

// ============ SIGNATURE LAYER ============

export interface SignatureLayer extends BaseLayer {
    type: 'signature';
    signatureData: string; // Base64 image or SVG path
    signatureType: 'drawn' | 'typed' | 'image';
}

// Union type for all layers
export type Layer =
    | TextLayer
    | ImageLayer
    | ShapeLayer
    | DrawingLayer
    | HighlightLayer
    | SignatureLayer;

// ============ PAGE STATE ============

export interface PageState {
    pageNumber: number;
    width: number;
    height: number;
    rotation: number; // 0, 90, 180, 270
    originalPdfData: ArrayBuffer | null;
    renderedCanvas: HTMLCanvasElement | null;
    layers: string[]; // Layer IDs on this page
    isDirty: boolean; // Has unsaved changes
    thumbnail: string | null; // Data URL for thumbnail
}

// ============ DOCUMENT STATE ============

export interface DocumentState {
    fileName: string;
    fileSize: number;
    totalPages: number;
    currentPage: number;
    zoom: number; // 0.25 - 3.0
    viewMode: ViewMode;
    showGrid: boolean;
    showRulers: boolean;
    snapToGrid: boolean;
    gridSize: number; // pixels
    isLoading: boolean;
    loadingProgress: number;
    error: string | null;
    isDirty?: boolean;
    annotations?: Layer[];
}

// ============ SELECTION STATE ============

export interface SelectionState {
    selectedLayers: string[];
    hoveredLayer: string | null;
    isMultiSelect: boolean;
    selectionBox: {
        x: number;
        y: number;
        width: number;
        height: number;
    } | null;
}

// ============ CLIPBOARD STATE ============

export interface ClipboardState {
    layers: Layer[];
    cutMode: boolean; // true = cut, false = copy
}

// ============ HISTORY STATE ============

export interface EditorSnapshot {
    timestamp: number;
    description: string;
    pages: Map<number, PageState>;
    layers: Map<string, Layer>;
    layerOrder: string[];
}

export interface HistoryState {
    past: EditorSnapshot[];
    future: EditorSnapshot[];
    maxHistory: number;
    canUndo: boolean;
    canRedo: boolean;
}

// ============ UI STATE ============

export interface PanelState {
    layers: boolean;
    properties: boolean;
    pages: boolean;
}

export interface UIState {
    activeTool: Tool;
    panelStates: PanelState;
    isFullscreen: boolean;
    sidebarWidth: number;
    propertiesPanelWidth: number;
    showWelcomeScreen: boolean;
    showExportDialog: boolean;
    showShortcutsDialog: boolean;
}

// ============ EXPORT OPTIONS ============

export interface ExportOptions {
    format: 'pdf' | 'png' | 'jpg';
    flatten: boolean; // Flatten layers into single image
    optimize: boolean; // Compress and optimize
    quality: number; // 0-100 for images
    preserveLinks: boolean;
    preserveForms: boolean;
    pageRange: 'all' | 'current' | 'custom';
    customPages?: number[];
}

// ============ EDITOR ACTIONS ============

export interface EditorActions {
    // Document actions
    loadPdf: (file: File) => Promise<void>;
    setCurrentPage: (page: number) => void;
    setZoom: (zoom: number) => void;
    setViewMode: (mode: ViewMode) => void;
    toggleGrid: () => void;
    toggleRulers: () => void;
    toggleSnapToGrid: () => void;

    // Layer actions
    addLayer: (layer: Omit<Layer, 'id' | 'createdAt' | 'modifiedAt'>) => string;
    updateLayer: (id: string, updates: Partial<Layer>) => void;
    deleteLayer: (id: string) => void;
    duplicateLayer: (id: string) => string;
    reorderLayers: (newOrder: string[]) => void;
    toggleLayerVisibility: (id: string) => void;
    toggleLayerLock: (id: string) => void;
    renameLayer: (id: string, name: string) => void;

    // Selection actions
    selectLayer: (id: string, multiSelect?: boolean) => void;
    deselectLayer: (id: string) => void;
    clearSelection: () => void;
    selectAll: () => void;

    // Clipboard actions
    copySelectedLayers: () => void;
    cutSelectedLayers: () => void;
    pasteClipboard: () => void;
    deleteSelectedLayers: () => void;

    // History actions
    undo: () => void;
    redo: () => void;
    takeSnapshot: (description: string) => void;
    clearHistory: () => void;

    // Page actions
    addPage: (afterPage?: number) => void;
    deletePage: (pageNumber: number) => void;
    duplicatePage: (pageNumber: number) => void;
    reorderPages: (fromPage: number, toPage: number) => void;
    rotatePage: (pageNumber: number, degrees: number) => void;

    // Tool actions
    setActiveTool: (tool: Tool) => void;

    // UI actions
    togglePanel: (panel: keyof PanelState) => void;
    setFullscreen: (fullscreen: boolean) => void;
    showExportDialog: () => void;
    hideExportDialog: () => void;

    // Export actions
    exportPdf: (options: ExportOptions) => Promise<Blob>;
    downloadPdf: (options: ExportOptions) => Promise<void>;
}

// ============ COMPLETE EDITOR STATE ============

export interface EditorState {
    document: DocumentState;
    pages: Map<number, PageState>;
    layers: Map<string, Layer>;
    layerOrder: string[]; // Global z-index order
    selection: SelectionState;
    clipboard: ClipboardState;
    history: HistoryState;
    ui: UIState;
    actions: EditorActions;
    // Additional properties for compatibility
    currentTool?: Tool;
    selectedAnnotation?: Layer | null;
    undoStack?: EditorSnapshot[];
    redoStack?: EditorSnapshot[];
    fitMode?: PdfFitMode;
    showThumbnails?: boolean;
    showToolbar?: boolean;
    id?: string;
}

// ============ WORKER MESSAGES ============

export type WorkerMessageType =
    | 'load-pdf'
    | 'render-page'
    | 'extract-text'
    | 'extract-images'
    | 'export-pdf'
    | 'optimize-pdf';

export interface WorkerMessage {
    type: WorkerMessageType;
    taskId: string;
    data?: any;
}

export interface WorkerResponse {
    type: 'result' | 'error' | 'progress';
    taskId: string;
    result?: any;
    error?: string;
    progress?: number;
    message?: string;
}

// ============ RENDER OPTIONS ============

export interface RenderOptions {
    scale: number;
    rotation: number;
    includeAnnotations: boolean;
    includeTextLayer: boolean;
}

// ============ CANVAS CONTEXT ============

export interface CanvasContext {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    scale: number;
}

// ============ DRAG STATE ============

export interface DragState {
    isDragging: boolean;
    dragType: 'move' | 'resize' | 'rotate' | null;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    resizeHandle: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | null;
    originalTransform: Transform | null;
}

// ============ UTILITY TYPES ============

export type Point = { x: number; y: number };
export type Size = { width: number; height: number };
export type Rect = Point & Size;
export type Color = string; // CSS color string

// ============ VALIDATION ============

export const isTextLayer = (layer: Layer): layer is TextLayer => layer.type === 'text';
export const isImageLayer = (layer: Layer): layer is ImageLayer => layer.type === 'image';
export const isShapeLayer = (layer: Layer): layer is ShapeLayer => layer.type === 'shape';
export const isDrawingLayer = (layer: Layer): layer is DrawingLayer => layer.type === 'drawing';
export const isHighlightLayer = (layer: Layer): layer is HighlightLayer => layer.type === 'highlight';
export const isSignatureLayer = (layer: Layer): layer is SignatureLayer => layer.type === 'signature';

// ============ CONSTANTS ============

export const DEFAULT_ZOOM = 1.0;
export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 3.0;
export const ZOOM_STEP = 0.1;

// ============ TYPE ALIASES & COMPATIBILITY TYPES ============

// Aliases for backward compatibility
export type PdfEditorState = EditorState;
export type PdfEditorAction = EditorActions;
export enum PdfEditorActionType {
  LOAD_PDF = 'LOAD_PDF',
  SET_CURRENT_PAGE = 'SET_CURRENT_PAGE',
  SET_ZOOM = 'SET_ZOOM',
  ADD_ANNOTATION = 'ADD_ANNOTATION',
  DELETE_ANNOTATION = 'DELETE_ANNOTATION',
  UPDATE_ANNOTATION = 'UPDATE_ANNOTATION',
  UNDO = 'UNDO',
  REDO = 'REDO'
}
export type PdfDocument = DocumentState & { pages?: any[] };
export type PdfPage = PageState;
export type PdfViewport = CanvasContext;
export const PdfAnnotationType = {
  TEXT: 'text',
  IMAGE: 'image',
  RECTANGLE: 'rectangle',
  CIRCLE: 'circle',
  SHAPE: 'shape',
  DRAWING: 'drawing',
  FREEHAND: 'drawing',
  HIGHLIGHT: 'highlight',
  SIGNATURE: 'signature',
  ERASER: 'eraser',
} as const;
export type PdfAnnotationType = (typeof PdfAnnotationType)[keyof typeof PdfAnnotationType] | LayerType;
export type PdfCoordinateMapper = {
  pageToCanvas: (x: number, y: number) => Point;
  canvasToPage: (x: number, y: number) => Point;
};
export type PdfPerformanceMetrics = {
  renderTime: number;
  memoryUsage: number;
  fps: number;
};
export enum PdfFitMode {
  PAGE_WIDTH = 'page-width',
  PAGE_HEIGHT = 'page-height',
  PAGE_FIT = 'page-fit',
  ACTUAL_SIZE = 'actual-size'
}
export type PdfTextContent = {
  text: string;
  items: Array<{ str: string; x: number; y: number; width: number; height: number }>;
};
export type PdfEditorConfig = {
  enableTextExtraction: boolean;
  enableAnnotations: boolean;
  enableDrawing: boolean;
};
export enum PdfEditorTool {
  SELECT = 'select',
  TEXT = 'text',
  IMAGE = 'image',
  SHAPE = 'shape',
  DRAW = 'draw',
  HIGHLIGHT = 'highlight',
  PAN = 'pan'
}

export const DEFAULT_GRID_SIZE = 20;
export const DEFAULT_FONT_SIZE = 16;
export const DEFAULT_FONT_FAMILY = 'Arial, sans-serif';
export const DEFAULT_TEXT_COLOR = '#000000';
export const DEFAULT_STROKE_WIDTH = 2;
export const DEFAULT_SHAPE_FILL = '#3b82f6';
export const DEFAULT_SHAPE_STROKE = '#1e40af';

export const SELECTION_HANDLE_SIZE = 8;
export const ROTATION_HANDLE_OFFSET = 30;
export const MIN_LAYER_SIZE = 10;

export const MAX_HISTORY_SIZE = 50;
export const DEBOUNCE_DELAY = 16; // ~60fps
