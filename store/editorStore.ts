/**
 * Zustand Store for Canva-Like PDF Editor
 * Manages all editor state and actions
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type {
    EditorState,
    Layer,
    PageState,
    DocumentState,
    SelectionState,
    ClipboardState,
    HistoryState,
    UIState,
    EditorSnapshot,
    Tool,
    ViewMode,
    ExportOptions,
    PanelState,
    Transform
} from '../types/pdfEditor';
import {
    DEFAULT_ZOOM,
    MIN_ZOOM,
    MAX_ZOOM,
    MAX_HISTORY_SIZE,
    DEFAULT_GRID_SIZE
} from '../types/pdfEditor';

// ============ INITIAL STATES ============

const initialDocumentState: DocumentState = {
    fileName: '',
    fileSize: 0,
    totalPages: 0,
    currentPage: 1,
    zoom: DEFAULT_ZOOM,
    viewMode: 'continuous',
    showGrid: false,
    showRulers: true,
    snapToGrid: false,
    gridSize: DEFAULT_GRID_SIZE,
    isLoading: false,
    loadingProgress: 0,
    error: null
};

const initialSelectionState: SelectionState = {
    selectedLayers: [],
    hoveredLayer: null,
    isMultiSelect: false,
    selectionBox: null
};

const initialClipboardState: ClipboardState = {
    layers: [],
    cutMode: false
};

const initialHistoryState: HistoryState = {
    past: [],
    future: [],
    maxHistory: MAX_HISTORY_SIZE,
    canUndo: false,
    canRedo: false
};

const initialUIState: UIState = {
    activeTool: 'select',
    panelStates: {
        layers: true,
        properties: true,
        pages: true
    },
    isFullscreen: false,
    sidebarWidth: 280,
    propertiesPanelWidth: 320,
    showWelcomeScreen: true,
    showExportDialog: false,
    showShortcutsDialog: false
};

// ============ STORE IMPLEMENTATION ============

export const useEditorStore = create<EditorState>()(
    devtools(
        persist(
            (set, get) => ({
                // ============ STATE ============
                document: initialDocumentState,
                pages: new Map<number, PageState>(),
                layers: new Map<string, Layer>(),
                layerOrder: [],
                selection: initialSelectionState,
                clipboard: initialClipboardState,
                history: initialHistoryState,
                ui: initialUIState,

                // ============ ACTIONS ============
                actions: {
                    // ──────────────────────────────
                    // DOCUMENT ACTIONS
                    // ──────────────────────────────

                    loadPdf: async (file: File) => {
                        set({
                            document: {
                                ...get().document,
                                isLoading: true,
                                loadingProgress: 0,
                                error: null
                            }
                        });

                        try {
                            // This will be implemented with PDF.js worker
                            // For now, just set basic document info
                            set({
                                document: {
                                    ...get().document,
                                    fileName: file.name,
                                    fileSize: file.size,
                                    isLoading: false,
                                    loadingProgress: 100
                                }
                            });
                        } catch (error: any) {
                            set({
                                document: {
                                    ...get().document,
                                    isLoading: false,
                                    error: error.message || 'Failed to load PDF'
                                }
                            });
                        }
                    },

                    setCurrentPage: (page: number) => {
                        const { totalPages } = get().document;
                        if (page < 1 || page > totalPages) return;

                        set({
                            document: {
                                ...get().document,
                                currentPage: page
                            }
                        });
                    },

                    setZoom: (zoom: number) => {
                        const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
                        set({
                            document: {
                                ...get().document,
                                zoom: clampedZoom
                            }
                        });
                    },

                    setViewMode: (mode: ViewMode) => {
                        set({
                            document: {
                                ...get().document,
                                viewMode: mode
                            }
                        });
                    },

                    toggleGrid: () => {
                        set({
                            document: {
                                ...get().document,
                                showGrid: !get().document.showGrid
                            }
                        });
                    },

                    toggleRulers: () => {
                        set({
                            document: {
                                ...get().document,
                                showRulers: !get().document.showRulers
                            }
                        });
                    },

                    toggleSnapToGrid: () => {
                        set({
                            document: {
                                ...get().document,
                                snapToGrid: !get().document.snapToGrid
                            }
                        });
                    },

                    // ──────────────────────────────
                    // LAYER ACTIONS
                    // ──────────────────────────────

                    addLayer: (layerData) => {
                        const id = nanoid();
                        const now = Date.now();

                        const newLayer: Layer = {
                            ...layerData,
                            id,
                            createdAt: now,
                            modifiedAt: now
                        } as Layer;

                        const layers = new Map(get().layers);
                        layers.set(id, newLayer);

                        const layerOrder = [...get().layerOrder, id];

                        set({ layers, layerOrder });

                        // Take snapshot for undo
                        get().actions.takeSnapshot(`Add ${newLayer.type} layer`);

                        return id;
                    },

                    updateLayer: (id, updates) => {
                        const layers = new Map(get().layers);
                        const layer = layers.get(id);

                        if (!layer) return;

                        // Use Object.assign to avoid discriminated union type issues
                        const updatedLayer = Object.assign({}, layer, updates, {
                            modifiedAt: Date.now()
                        }) as Layer;

                        layers.set(id, updatedLayer);
                        set({ layers });
                    },

                    deleteLayer: (id) => {
                        const layers = new Map(get().layers);
                        const layerOrder = get().layerOrder.filter(layerId => layerId !== id);

                        layers.delete(id);

                        set({
                            layers,
                            layerOrder,
                            selection: {
                                ...get().selection,
                                selectedLayers: get().selection.selectedLayers.filter(layerId => layerId !== id)
                            }
                        });

                        get().actions.takeSnapshot('Delete layer');
                    },

                    duplicateLayer: (id) => {
                        const layer = get().layers.get(id);
                        if (!layer) return '';

                        const newId = nanoid();
                        const now = Date.now();

                        const duplicatedLayer: Layer = {
                            ...layer,
                            id: newId,
                            name: `${layer.name} (Copy)`,
                            transform: {
                                ...layer.transform,
                                x: layer.transform.x + 20,
                                y: layer.transform.y + 20
                            },
                            createdAt: now,
                            modifiedAt: now
                        };

                        const layers = new Map(get().layers);
                        layers.set(newId, duplicatedLayer);

                        const layerOrder = [...get().layerOrder, newId];

                        set({ layers, layerOrder });
                        get().actions.takeSnapshot('Duplicate layer');

                        return newId;
                    },

                    reorderLayers: (newOrder) => {
                        set({ layerOrder: newOrder });
                        get().actions.takeSnapshot('Reorder layers');
                    },

                    toggleLayerVisibility: (id) => {
                        get().actions.updateLayer(id, {
                            visible: !get().layers.get(id)?.visible
                        });
                    },

                    toggleLayerLock: (id) => {
                        get().actions.updateLayer(id, {
                            locked: !get().layers.get(id)?.locked
                        });
                    },

                    renameLayer: (id, name) => {
                        get().actions.updateLayer(id, { name });
                    },

                    // ──────────────────────────────
                    // SELECTION ACTIONS
                    // ──────────────────────────────

                    selectLayer: (id, multiSelect = false) => {
                        const { selectedLayers } = get().selection;

                        let newSelection: string[];

                        if (multiSelect) {
                            if (selectedLayers.includes(id)) {
                                newSelection = selectedLayers.filter(layerId => layerId !== id);
                            } else {
                                newSelection = [...selectedLayers, id];
                            }
                        } else {
                            newSelection = [id];
                        }

                        set({
                            selection: {
                                ...get().selection,
                                selectedLayers: newSelection,
                                isMultiSelect: newSelection.length > 1
                            }
                        });
                    },

                    deselectLayer: (id) => {
                        set({
                            selection: {
                                ...get().selection,
                                selectedLayers: get().selection.selectedLayers.filter(layerId => layerId !== id)
                            }
                        });
                    },

                    clearSelection: () => {
                        set({
                            selection: {
                                ...get().selection,
                                selectedLayers: [],
                                isMultiSelect: false
                            }
                        });
                    },

                    selectAll: () => {
                        const currentPage = get().document.currentPage;
                        const allLayersOnPage = get().layerOrder.filter(layerId => {
                            const layer = get().layers.get(layerId);
                            return layer && layer.pageNumber === currentPage;
                        });

                        set({
                            selection: {
                                ...get().selection,
                                selectedLayers: allLayersOnPage,
                                isMultiSelect: allLayersOnPage.length > 1
                            }
                        });
                    },

                    // ──────────────────────────────
                    // CLIPBOARD ACTIONS
                    // ──────────────────────────────

                    copySelectedLayers: () => {
                        const { selectedLayers } = get().selection;
                        const copiedLayers = selectedLayers
                            .map(id => get().layers.get(id))
                            .filter((layer): layer is Layer => layer !== undefined);

                        set({
                            clipboard: {
                                layers: copiedLayers,
                                cutMode: false
                            }
                        });
                    },

                    cutSelectedLayers: () => {
                        const { selectedLayers } = get().selection;
                        const cutLayers = selectedLayers
                            .map(id => get().layers.get(id))
                            .filter((layer): layer is Layer => layer !== undefined);

                        set({
                            clipboard: {
                                layers: cutLayers,
                                cutMode: true
                            }
                        });

                        // Delete the cut layers
                        selectedLayers.forEach(id => get().actions.deleteLayer(id));
                    },

                    pasteClipboard: () => {
                        const { layers: clipboardLayers, cutMode } = get().clipboard;
                        if (clipboardLayers.length === 0) return;

                        const currentPage = get().document.currentPage;
                        const newLayerIds: string[] = [];

                        clipboardLayers.forEach(layer => {
                            const newId = nanoid();
                            const now = Date.now();

                            const pastedLayer: Layer = {
                                ...layer,
                                id: newId,
                                pageNumber: currentPage,
                                transform: {
                                    ...layer.transform,
                                    x: layer.transform.x + (cutMode ? 0 : 20),
                                    y: layer.transform.y + (cutMode ? 0 : 20)
                                },
                                createdAt: now,
                                modifiedAt: now
                            };

                            const layers = new Map(get().layers);
                            layers.set(newId, pastedLayer);
                            set({ layers });

                            newLayerIds.push(newId);
                        });

                        const layerOrder = [...get().layerOrder, ...newLayerIds];
                        set({ layerOrder });

                        // Clear clipboard if it was a cut operation
                        if (cutMode) {
                            set({
                                clipboard: {
                                    layers: [],
                                    cutMode: false
                                }
                            });
                        }

                        get().actions.takeSnapshot('Paste layers');
                    },

                    deleteSelectedLayers: () => {
                        const { selectedLayers } = get().selection;
                        selectedLayers.forEach(id => get().actions.deleteLayer(id));
                        get().actions.clearSelection();
                    },

                    // ──────────────────────────────
                    // HISTORY ACTIONS
                    // ──────────────────────────────

                    takeSnapshot: (description) => {
                        const { pages, layers, layerOrder, history } = get();

                        const snapshot: EditorSnapshot = {
                            timestamp: Date.now(),
                            description,
                            pages: new Map(pages),
                            layers: new Map(layers),
                            layerOrder: [...layerOrder]
                        };

                        const newPast = [...history.past, snapshot];

                        // Limit history size
                        if (newPast.length > history.maxHistory) {
                            newPast.shift();
                        }

                        set({
                            history: {
                                ...history,
                                past: newPast,
                                future: [], // Clear redo stack
                                canUndo: true,
                                canRedo: false
                            }
                        });
                    },

                    undo: () => {
                        const { history } = get();
                        if (history.past.length === 0) return;

                        const snapshot = history.past[history.past.length - 1];
                        const newPast = history.past.slice(0, -1);

                        // Save current state to future
                        const currentSnapshot: EditorSnapshot = {
                            timestamp: Date.now(),
                            description: 'Current state',
                            pages: new Map(get().pages),
                            layers: new Map(get().layers),
                            layerOrder: [...get().layerOrder]
                        };

                        set({
                            pages: snapshot.pages,
                            layers: snapshot.layers,
                            layerOrder: snapshot.layerOrder,
                            history: {
                                ...history,
                                past: newPast,
                                future: [currentSnapshot, ...history.future],
                                canUndo: newPast.length > 0,
                                canRedo: true
                            }
                        });
                    },

                    redo: () => {
                        const { history } = get();
                        if (history.future.length === 0) return;

                        const snapshot = history.future[0];
                        const newFuture = history.future.slice(1);

                        // Save current state to past
                        const currentSnapshot: EditorSnapshot = {
                            timestamp: Date.now(),
                            description: 'Current state',
                            pages: new Map(get().pages),
                            layers: new Map(get().layers),
                            layerOrder: [...get().layerOrder]
                        };

                        set({
                            pages: snapshot.pages,
                            layers: snapshot.layers,
                            layerOrder: snapshot.layerOrder,
                            history: {
                                ...history,
                                past: [...history.past, currentSnapshot],
                                future: newFuture,
                                canUndo: true,
                                canRedo: newFuture.length > 0
                            }
                        });
                    },

                    clearHistory: () => {
                        set({
                            history: {
                                ...get().history,
                                past: [],
                                future: [],
                                canUndo: false,
                                canRedo: false
                            }
                        });
                    },

                    // ──────────────────────────────
                    // PAGE ACTIONS
                    // ──────────────────────────────

                    addPage: (afterPage) => {
                        // Implementation will be added with PDF worker
                        console.log('Add page after:', afterPage);
                    },

                    deletePage: (pageNumber) => {
                        // Implementation will be added with PDF worker
                        console.log('Delete page:', pageNumber);
                    },

                    duplicatePage: (pageNumber) => {
                        // Implementation will be added with PDF worker
                        console.log('Duplicate page:', pageNumber);
                    },

                    reorderPages: (fromPage, toPage) => {
                        // Implementation will be added with PDF worker
                        console.log('Reorder pages:', fromPage, 'to', toPage);
                    },

                    rotatePage: (pageNumber, degrees) => {
                        const pages = new Map(get().pages);
                        const page = pages.get(pageNumber);

                        if (page) {
                            const updatedPage: PageState = {
                                ...page,
                                rotation: (page.rotation + degrees) % 360
                            };
                            pages.set(pageNumber, updatedPage);
                            set({ pages });
                        }
                    },

                    // ──────────────────────────────
                    // TOOL ACTIONS
                    // ──────────────────────────────

                    setActiveTool: (tool) => {
                        set({
                            ui: {
                                ...get().ui,
                                activeTool: tool
                            }
                        });
                    },

                    // ──────────────────────────────
                    // UI ACTIONS
                    // ──────────────────────────────

                    togglePanel: (panel) => {
                        set({
                            ui: {
                                ...get().ui,
                                panelStates: {
                                    ...get().ui.panelStates,
                                    [panel]: !get().ui.panelStates[panel]
                                }
                            }
                        });
                    },

                    setFullscreen: (fullscreen) => {
                        set({
                            ui: {
                                ...get().ui,
                                isFullscreen: fullscreen
                            }
                        });
                    },

                    showExportDialog: () => {
                        set({
                            ui: {
                                ...get().ui,
                                showExportDialog: true
                            }
                        });
                    },

                    hideExportDialog: () => {
                        set({
                            ui: {
                                ...get().ui,
                                showExportDialog: false
                            }
                        });
                    },

                    // ──────────────────────────────
                    // EXPORT ACTIONS
                    // ──────────────────────────────

                    exportPdf: async (options) => {
                        // Implementation will be added with jsPDF
                        console.log('Export PDF with options:', options);
                        return new Blob([], { type: 'application/pdf' });
                    },

                    downloadPdf: async (options) => {
                        const blob = await get().actions.exportPdf(options);
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = get().document.fileName.replace('.pdf', '_edited.pdf');
                        a.click();
                        URL.revokeObjectURL(url);
                    }
                }
            }),
            {
                name: 'lak-pdf-editor-storage',
                // Only persist essential UI state and document settings
                partialize: (state) => ({
                    document: {
                        zoom: state.document.zoom,
                        viewMode: state.document.viewMode,
                        showGrid: state.document.showGrid,
                        showRulers: state.document.showRulers,
                        snapToGrid: state.document.snapToGrid,
                        gridSize: state.document.gridSize,
                    },
                    ui: {
                        activeTool: state.ui.activeTool,
                        panelStates: state.ui.panelStates,
                        sidebarWidth: state.ui.sidebarWidth,
                        propertiesPanelWidth: state.ui.propertiesPanelWidth,
                    },
                }),
            }
        ),
        { name: 'PDF Editor Store' }
    )
);

// ============ SELECTORS ============

export const useCurrentPage = () => useEditorStore(state => state.document.currentPage);
export const useZoom = () => useEditorStore(state => state.document.zoom);
export const useActiveTool = () => useEditorStore(state => state.ui.activeTool);
export const useSelectedLayers = () => useEditorStore(state => state.selection.selectedLayers);
export const useCanUndo = () => useEditorStore(state => state.history.canUndo);
export const useCanRedo = () => useEditorStore(state => state.history.canRedo);
export const useLayers = () => useEditorStore(state => state.layers);
export const useLayerOrder = () => useEditorStore(state => state.layerOrder);
