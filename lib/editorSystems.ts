// Core Systems for Production PDF Editor
import * as fabric from 'fabric';

// ============================================
// 1. LAYER MANAGEMENT SYSTEM
// ============================================

import { BaseElement, TextElement, DrawingElement, ShapeElement } from './types';

export class LayerManager {
    backgroundLayer: HTMLCanvasElement | null = null;
    editLayer: fabric.Canvas | null = null;

    initLayers(backgroundCanvas: HTMLCanvasElement, fabricCanvas: fabric.Canvas) {
        this.backgroundLayer = backgroundCanvas;
        this.backgroundLayer.style.pointerEvents = 'none';
        this.editLayer = fabricCanvas;
        this.editLayer.selection = true;
        this.editLayer.preserveObjectStacking = true;
        return this.editLayer;
    }

    syncLayerDimensions() {
        if (!this.backgroundLayer || !this.editLayer) return;
        const { width, height } = this.backgroundLayer;
        this.editLayer.setDimensions({ width, height });
    }

    syncElementsToFabric(elements: BaseElement[], transformer: CoordinateTransformer, zoom: number) {
        if (!this.editLayer) return;

        // Clear but preserve background? No, clear all objects.
        this.editLayer.clear();
        this.editLayer.backgroundColor = null; // Transparent

        elements.forEach(el => {
            let obj: fabric.Object | null = null;
            const left = transformer.pdfToScreenScalar(el.position.x, zoom);
            const top = transformer.pdfToScreenScalar(el.position.y, zoom);

            // Text Elements
            if (el.type === 'text') {
                const textEl = el as TextElement;
                const fontSize = transformer.pdfToScreenScalar(textEl.fontSize, zoom);
                obj = new fabric.IText(textEl.content, {
                    left, top,
                    fontSize,
                    fontFamily: textEl.font,
                    fill: textEl.color,
                    fontWeight: textEl.bold ? 'bold' : 'normal',
                    fontStyle: textEl.italic ? 'italic' : 'normal',
                    underline: textEl.underline,
                    // data: { id: el.id, type: 'text' } // Fabric 6 uses per-instance custom props usually via subclassing or loose typing
                } as any);
            }
            // Shape Elements
            else if (['rectangle', 'circle', 'line'].includes(el.type) || el.type === 'shape') {
                const shapeEl = el as ShapeElement;
                // Simplification for brevity in this step, focusing on Text/Drawing
            }
            // Drawing Elements
            else if (el.type === 'drawing') {
                const drawEl = el as DrawingElement;
                // Path reconstruction would go here
            }

            if (obj) {
                (obj as any).id = el.id; // Store ID for reverse lookup
                obj.selectable = !el.locked;
                obj.evented = !el.locked;
                this.editLayer.add(obj);
            }
        });

        this.editLayer.requestRenderAll();
    }

    clearEditLayer() {
        if (!this.editLayer) return;
        this.editLayer.clear();
    }

    dispose() {
        // ... (lines 40-42)
        if (this.editLayer) {
            this.editLayer.dispose();
            this.editLayer = null;
        }
    }
}

// ============================================
// 2. ZOOM-AWARE COORDINATE MAPPING
// ============================================

export interface Point {
    x: number;
    y: number;
}

export interface BBox {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
}

export interface NormalizedBBox {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
}

export class CoordinateTransformer {
    private baseScale = 1.5;

    setBaseScale(scale: number) {
        this.baseScale = scale;
    }

    getScale(zoom: number): number {
        return zoom * this.baseScale;
    }

    // Convert PDF coordinates to screen pixels
    pdfToScreen(coord: Point, zoom: number): Point {
        return {
            x: coord.x * zoom * this.baseScale,
            y: coord.y * zoom * this.baseScale,
        };
    }

    // Convert screen pixels to PDF coordinates
    screenToPdf(coord: Point, zoom: number): Point {
        return {
            x: coord.x / (zoom * this.baseScale),
            y: coord.y / (zoom * this.baseScale),
        };
    }
    // Scalar helpers
    pdfToScreenScalar(val: number, zoom: number): number {
        return val * zoom * this.baseScale;
    }

    screenToPdfScalar(val: number, zoom: number): number {
        return val / (zoom * this.baseScale);
    }

    // Normalize to 0-1 range (for storage)
    normalizeCoords(bbox: BBox, viewport: any): NormalizedBBox {
        return {
            x0: bbox.x0 / viewport.width,
            y0: bbox.y0 / viewport.height,
            x1: bbox.x1 / viewport.width,
            y1: bbox.y1 / viewport.height,
        };
    }

    // Denormalize from 0-1 to pixels (for rendering)
    denormalizeCoords(normalized: NormalizedBBox, viewport: any): BBox {
        return {
            x0: normalized.x0 * viewport.width,
            y0: normalized.y0 * viewport.height,
            x1: normalized.x1 * viewport.width,
            y1: normalized.y1 * viewport.height,
        };
    }
}

// ============================================
// 3. RENDER/EDIT MODE SYSTEM
// ============================================

export type EditorMode = 'render' | 'edit';

export class ModeManager {
    currentMode: EditorMode = 'edit';
    fabricCanvas: fabric.Canvas | null = null;

    setFabricCanvas(canvas: fabric.Canvas) {
        this.fabricCanvas = canvas;
    }

    switchMode(mode: EditorMode) {
        this.currentMode = mode;

        if (!this.fabricCanvas) return;

        if (mode === 'render') {
            // Render mode: Show PDF, disable editing
            this.fabricCanvas.selection = false;
            this.fabricCanvas.forEachObject(obj => {
                obj.selectable = false;
                obj.evented = false;
            });
        } else {
            // Edit mode: Enable editing
            this.fabricCanvas.selection = true;
            this.fabricCanvas.forEachObject(obj => {
                obj.selectable = true;
                obj.evented = true;
            });
        }

        this.fabricCanvas.renderAll();
    }

    isEditMode(): boolean {
        return this.currentMode === 'edit';
    }

    isRenderMode(): boolean {
        return this.currentMode === 'render';
    }
}

// ============================================
// 4. STABLE STATE STORAGE
// ============================================



export interface PageState {
    pageNumber: number;
    elements: BaseElement[];
    viewport: {
        width: number;
        height: number;
        scale: number;
    };
}

export interface EditorState {
    version: string;
    documentId: string;
    pages: PageState[];
    metadata: {
        createdAt: number;
        updatedAt: number;
        zoom: number;
        currentPage: number;
    };
}

export class StateManager {
    private state: EditorState;
    private storageKey: string;
    private autoSaveInterval: NodeJS.Timeout | null = null;
    private hasChanges = false;

    constructor(documentId: string) {
        this.storageKey = `lakpdf_data_${documentId}`;
        this.state = this.loadInternal();
    }

    private createEmptyState(): EditorState {
        return {
            version: '2.0',
            documentId: '',
            pages: [],
            metadata: {
                createdAt: Date.now(),
                updatedAt: Date.now(),
                zoom: 1,
                currentPage: 1,
            },
        };
    }

    // Internal Load
    private loadInternal(): EditorState {
        if (typeof window === 'undefined') {
            return this.createEmptyState();
        }
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error('Failed to load state:', e);
        }
        return this.createEmptyState();
    }

    // Public Load (Returns flat elements for Store)
    load(): BaseElement[] {
        return this.state.pages.flatMap(p => p.elements);
    }

    // Save to localStorage
    save() {
        if (!this.hasChanges) return;
        if (typeof window === 'undefined') return;
        this.state.metadata.updatedAt = Date.now();
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.state));
            this.hasChanges = false;
            console.log('Auto-saved state');
        } catch (e) {
            console.error('Failed to save state:', e);
        }
    }

    // Sync from Store Elements
    syncFromElements(elements: BaseElement[]) {
        // Group by page
        const pagesMap = new Map<number, BaseElement[]>();
        elements.forEach(el => {
            if (!pagesMap.has(el.page)) pagesMap.set(el.page, []);
            pagesMap.get(el.page)!.push(el);
        });

        // Update state pages
        // Preserve viewport info if we had it, or create new
        const newPages: PageState[] = [];
        pagesMap.forEach((pageElements, pageNum) => {
            const existingPage = this.state.pages.find(p => p.pageNumber === pageNum);
            newPages.push({
                pageNumber: pageNum,
                elements: pageElements,
                viewport: existingPage?.viewport || { width: 0, height: 0, scale: 1 }
            });
        });

        this.state.pages = newPages;
        this.hasChanges = true;
    }

    // Initialize page if not exists
    ensurePage(pageNum: number, viewport: any) {
        // logic handled in sync
    }

    // Add element (Legacy / Direct)
    addElement(pageNum: number, element: BaseElement) {
        // ... handled via sync usually
        this.hasChanges = true;
    }

    // Update element (Legacy)
    updateElement(pageNum: number, elementId: string, updates: Partial<BaseElement>) {
        this.hasChanges = true;
    }

    // Delete element
    deleteElement(pageNum: number, elementId: string) {
        this.hasChanges = true;
    }

    // Get all elements for page
    getPageElements(pageNum: number): BaseElement[] {
        return this.state.pages.find(p => p.pageNumber === pageNum)?.elements || [];
    }

    // Update metadata
    updateMetadata(updates: Partial<EditorState['metadata']>) {
        Object.assign(this.state.metadata, updates);
        this.save();
    }

    // Auto-save on changes
    enableAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        this.autoSaveInterval = setInterval(() => this.save(), 5000); // Every 5 seconds
    }

    disableAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }

    // Clear all state
    clear() {
        if (typeof window === 'undefined') {
            this.state = this.createEmptyState();
            return;
        }
        localStorage.removeItem(this.storageKey);
        this.state = this.createEmptyState();
    }
}

// ============================================
// 5. OPTIMIZED CANVAS REDRAW
// ============================================

export class RenderOptimizer {
    private needsRedraw = false;
    private redrawTimer: NodeJS.Timeout | null = null;
    private fabricCanvas: fabric.Canvas | null = null;

    setFabricCanvas(canvas: fabric.Canvas) {
        this.fabricCanvas = canvas;
    }

    // Mark for redraw (debounced)
    requestRedraw() {
        this.needsRedraw = true;

        if (this.redrawTimer) {
            clearTimeout(this.redrawTimer);
        }

        // Debounce: only redraw after 100ms of no changes
        this.redrawTimer = setTimeout(() => {
            if (this.needsRedraw) {
                this.performRedraw();
                this.needsRedraw = false;
            }
        }, 100);
    }

    // Only redraw Fabric canvas, NOT PDF background
    performRedraw() {
        if (this.fabricCanvas) {
            this.fabricCanvas.renderAll(); // Fast
        }
        // DO NOT call renderPage() - background stays static
    }

    dispose() {
        if (this.redrawTimer) {
            clearTimeout(this.redrawTimer);
            this.redrawTimer = null;
        }
    }
}
