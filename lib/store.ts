import { create } from 'zustand';
import { BaseElement, TextElement, DrawingElement, PdfMetadata, LayerState } from './types';

interface EditorStore {
    // State
    elements: BaseElement[];
    zoom: number;
    currentPage: number;
    pdfMetadata: PdfMetadata | null;
    layers: LayerState[];
    selectedElementId: string | null;
    history: BaseElement[][]; // Simple history stack
    historyIndex: number;
    isOcrComplete: boolean;
    ocrRunning: boolean;
    lastHistoryCommitAt: number;

    // Actions
    setElements: (elements: BaseElement[] | ((prev: BaseElement[]) => BaseElement[])) => void;
    addElement: (element: BaseElement) => void;
    updateElement: (id: string, updates: Partial<BaseElement>) => void;
    deleteElement: (id: string) => void;
    setZoom: (zoom: number) => void;
    setPage: (page: number) => void;
    setPdfMetadata: (metadata: PdfMetadata) => void;
    selectElement: (id: string | null) => void;
    undo: () => void;
    redo: () => void;
    setOcrStatus: (running: boolean, complete: boolean) => void;
    resetEditor: () => void;

    // Layer Management
    toggleLayer: (layerId: string) => void;
    lockLayer: (layerId: string) => void;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
    elements: [],
    zoom: 1,
    currentPage: 1,
    pdfMetadata: null,
    layers: [
        { id: 'background', visible: true, locked: true, elements: [] },
        { id: 'pdf-text', visible: true, locked: false, elements: [] }, // OCR
        { id: 'annotations', visible: true, locked: false, elements: [] } // Edits
    ],
    selectedElementId: null,
    history: [],
    historyIndex: -1,
    isOcrComplete: false,
    ocrRunning: false,
    lastHistoryCommitAt: 0,

    setElements: (elementsOrFn) => {
        const { history, historyIndex, elements: prevElements, lastHistoryCommitAt } = get();
        // Support functional updates
        const rawNextElements = typeof elementsOrFn === 'function'
            ? (elementsOrFn as any)(prevElements)
            : elementsOrFn;
        const nextElements = Array.isArray(rawNextElements) ? rawNextElements : [];

        if (nextElements === prevElements) return;

        const now = Date.now();
        const canCoalesce =
            history.length > 0 &&
            historyIndex === history.length - 1 &&
            nextElements.length === prevElements.length &&
            (now - lastHistoryCommitAt) < 140;

        const newHistory = history.slice(0, historyIndex + 1);
        if (canCoalesce) {
            newHistory[newHistory.length - 1] = nextElements;
        } else {
            newHistory.push(nextElements);
        }

        // Prevent unbounded history growth during drag/resize heavy interactions.
        const HISTORY_LIMIT = 220;
        const trimmedHistory =
            newHistory.length > HISTORY_LIMIT
                ? newHistory.slice(newHistory.length - HISTORY_LIMIT)
                : newHistory;
        set({
            elements: nextElements,
            history: trimmedHistory,
            historyIndex: trimmedHistory.length - 1,
            lastHistoryCommitAt: now
        });
    },

    addElement: (element) => {
        const { elements } = get();
        const newElements = [...elements, element];
        get().setElements(newElements);
    },

    updateElement: (id, updates) => {
        const { elements } = get();
        const next = elements.map(el => el.id === id ? { ...el, ...updates } : el);
        get().setElements(next);
    },

    deleteElement: (id) => {
        const { elements } = get();
        const next = elements.filter(el => el.id !== id);
        get().setElements(next);
    },

    setZoom: (zoomOrFn) => set(state => ({
        zoom: typeof zoomOrFn === 'function' ? (zoomOrFn as any)(state.zoom) : zoomOrFn
    })),
    setPage: (page) => set({ currentPage: page }),
    setPdfMetadata: (metadata) => set({ pdfMetadata: metadata }),
    selectElement: (id) => set({ selectedElementId: id }),

    undo: () => {
        const { history, historyIndex } = get();
        if (historyIndex > 0) {
            const prevIndex = historyIndex - 1;
            set({ elements: history[prevIndex], historyIndex: prevIndex });
        }
    },

    redo: () => {
        const { history, historyIndex } = get();
        if (historyIndex < history.length - 1) {
            const nextIndex = historyIndex + 1;
            set({ elements: history[nextIndex], historyIndex: nextIndex });
        }
    },

    setOcrStatus: (running, complete) => set({ ocrRunning: running, isOcrComplete: complete }),
    resetEditor: () => set({
        elements: [],
        zoom: 1,
        currentPage: 1,
        pdfMetadata: null,
        selectedElementId: null,
        history: [],
        historyIndex: -1,
        isOcrComplete: false,
        ocrRunning: false,
        lastHistoryCommitAt: 0
    }),

    toggleLayer: (layerId) => set(state => ({
        layers: state.layers.map(l => l.id === layerId ? { ...l, visible: !l.visible } : l)
    })),

    lockLayer: (layerId) => set(state => ({
        layers: state.layers.map(l => l.id === layerId ? { ...l, locked: !l.locked } : l)
    }))
}));
