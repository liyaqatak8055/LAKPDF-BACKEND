export type ToolType =
    | 'select'
    | 'pan'
    | 'text'
    | 'draw'
    | 'eraser'
    | 'highlight'
    | 'underline'
    | 'strike'
    | 'crop'
    | 'whiteout'
    | 'rectangle'
    | 'circle'
    | 'line'
    | 'image'
    | 'signature'
    | 'checkbox'
    | 'radio'
    | 'comment'
    | 'shape'    // Added for legacy support
    | 'drawing'; // Added for legacy support

export interface Point {
    x: number;
    y: number;
}

export interface NormalizedPoint {
    x: number; // 0-1
    y: number; // 0-1
}

export interface BaseElement {
    id: string;
    type: ToolType;
    page: number;
    position: Point; // Base PDF Point Units (72 DPI)
    properties: any;
    opacity?: number;
    rotation?: number;
    locked?: boolean;
}

// Alias for legacy support if needed, or use BaseElement
export type EditorElement = BaseElement;

export interface TextElement extends BaseElement {
    type: 'text';
    content: string;
    font: string;
    fontSize: number;
    color: string;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    align: 'left' | 'center' | 'right';
    lineHeight: number;
    boxWidth: number;
    boxHeight?: number;
    source?: 'ocr' | 'manual' | 'pdf';
}

export interface DrawingElement extends BaseElement {
    type: 'draw' | 'drawing'; // Support both
    paths: Point[];
    color: string;
    width: number;
}

export interface ShapeElement extends BaseElement {
    type: 'shape' | 'rectangle' | 'circle' | 'line';
    dimensions: { width: number; height: number };
    strokeColor: string;
    strokeWidth: number;
    fillColor: string;
    shapeType: 'rectangle' | 'circle' | 'line'; // Redundant with type? Logic uses it?
}

export interface HighlightElement extends BaseElement {
    type: 'highlight';
    dimensions: { width: number; height: number };
    color: string;
    note?: string; // Added back
}

export interface ImageElement extends BaseElement {
    type: 'image';
    dataUrl: string;
    dimensions: { width: number; height: number };
}

export interface CheckboxElement extends BaseElement {
    type: 'checkbox';
    checked: boolean;
    size: number;
    dimensions?: { width: number; height: number }; // Added back
}

export interface RadioElement extends BaseElement {
    type: 'radio';
    checked: boolean;
    size: number;
    dimensions?: { width: number; height: number }; // Added back
}

export interface CommentElement extends BaseElement {
    type: 'comment';
    text: string;
    color: string;
    dimensions: { width: number; height: number };
}

export interface PdfMetadata {
    fileName: string;
    pageCount: number;
    originalWidth: number;
    originalHeight: number;
}

export interface LayerState {
    id: string;
    visible: boolean;
    locked: boolean;
    elements: string[];
}
