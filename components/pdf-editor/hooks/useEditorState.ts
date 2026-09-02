// PDF Editor State Management Hook
import { useReducer, useCallback, useRef, useEffect } from 'react';
import type {
  PdfEditorState,
  PdfEditorAction,
  PdfAnnotation
} from '../../../types/pdfEditor';
import {
  PdfEditorActionType,
  PdfEditorTool,
  PdfFitMode
} from '../../../types/pdfEditor';

const initialState: PdfEditorState = {
  document: null,
  currentTool: PdfEditorTool.SELECT,
  selectedAnnotation: null,
  isLoading: false,
  error: null,
  undoStack: [],
  redoStack: [],
  zoom: 1.0,
  fitMode: PdfFitMode.ACTUAL_SIZE,
  showThumbnails: true,
  showToolbar: true
};

// Action types for the reducer
type EditorAction =
  | { type: 'SET_DOCUMENT'; payload: PdfEditorState['document'] }
  | { type: 'SET_TOOL'; payload: PdfEditorTool }
  | { type: 'SET_SELECTED_ANNOTATION'; payload: PdfAnnotation | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_ZOOM'; payload: number }
  | { type: 'SET_FIT_MODE'; payload: PdfFitMode }
  | { type: 'TOGGLE_THUMBNAILS' }
  | { type: 'TOGGLE_TOOLBAR' }
  | { type: 'ADD_ANNOTATION'; payload: PdfAnnotation }
  | { type: 'UPDATE_ANNOTATION'; payload: { id: string; updates: Partial<PdfAnnotation> } }
  | { type: 'DELETE_ANNOTATION'; payload: string }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'CLEAR_HISTORY' };

function editorReducer(state: PdfEditorState, action: EditorAction): PdfEditorState {
  switch (action.type) {
    case 'SET_DOCUMENT':
      return {
        ...state,
        document: action.payload,
        error: null
      };

    case 'SET_TOOL':
      return {
        ...state,
        currentTool: action.payload,
        selectedAnnotation: null // Clear selection when changing tools
      };

    case 'SET_SELECTED_ANNOTATION':
      return {
        ...state,
        selectedAnnotation: action.payload
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };

    case 'SET_ZOOM':
      return {
        ...state,
        zoom: action.payload,
        fitMode: PdfFitMode.ACTUAL_SIZE // Reset fit mode when manually setting zoom
      };

    case 'SET_FIT_MODE':
      return {
        ...state,
        fitMode: action.payload
      };

    case 'TOGGLE_THUMBNAILS':
      return {
        ...state,
        showThumbnails: !state.showThumbnails
      };

    case 'TOGGLE_TOOLBAR':
      return {
        ...state,
        showToolbar: !state.showToolbar
      };

    case 'ADD_ANNOTATION': {
      if (!state.document) return state;

      const newAnnotation = action.payload;
      const updatedDocument = {
        ...state.document,
        annotations: [...state.document.annotations, newAnnotation]
      };

      // Add to undo stack
      const newAction: PdfEditorAction = {
        id: `action_${Date.now()}`,
        type: PdfEditorActionType.ADD_ANNOTATION,
        timestamp: new Date(),
        data: newAnnotation,
        description: `Added ${newAnnotation.type} annotation`
      };

      return {
        ...state,
        document: updatedDocument,
        undoStack: [...state.undoStack, newAction],
        redoStack: [] // Clear redo stack when new action is performed
      };
    }

    case 'UPDATE_ANNOTATION': {
      if (!state.document) return state;

      const { id, updates } = action.payload;
      const annotationIndex = state.document.annotations.findIndex(a => a.id === id);

      if (annotationIndex === -1) return state;

      const oldAnnotation = state.document.annotations[annotationIndex];
      const updatedAnnotation = { ...oldAnnotation, ...updates };

      const updatedAnnotations = [...state.document.annotations];
      updatedAnnotations[annotationIndex] = updatedAnnotation;

      const updatedDocument = {
        ...state.document,
        annotations: updatedAnnotations
      };

      // Add to undo stack
      const newAction: PdfEditorAction = {
        id: `action_${Date.now()}`,
        type: PdfEditorActionType.UPDATE_ANNOTATION,
        timestamp: new Date(),
        data: { id, oldAnnotation, newAnnotation: updatedAnnotation },
        description: `Updated ${updatedAnnotation.type} annotation`
      };

      return {
        ...state,
        document: updatedDocument,
        selectedAnnotation:
          state.selectedAnnotation?.id === id
            ? (updatedAnnotation as PdfAnnotation)
            : state.selectedAnnotation,
        undoStack: [...state.undoStack, newAction],
        redoStack: []
      };
    }

    case 'DELETE_ANNOTATION': {
      if (!state.document) return state;

      const annotationId = action.payload;
      const annotationToDelete = state.document.annotations.find(a => a.id === annotationId);

      if (!annotationToDelete) return state;

      const updatedDocument = {
        ...state.document,
        annotations: state.document.annotations.filter(a => a.id !== annotationId)
      };

      // Clear selection if deleted annotation was selected
      const newSelectedAnnotation = state.selectedAnnotation?.id === annotationId
        ? null
        : state.selectedAnnotation;

      // Add to undo stack
      const newAction: PdfEditorAction = {
        id: `action_${Date.now()}`,
        type: PdfEditorActionType.DELETE_ANNOTATION,
        timestamp: new Date(),
        data: annotationToDelete,
        description: `Deleted ${annotationToDelete.type} annotation`
      };

      return {
        ...state,
        document: updatedDocument,
        selectedAnnotation: newSelectedAnnotation,
        undoStack: [...state.undoStack, newAction],
        redoStack: []
      };
    }

    case 'UNDO': {
      if (state.undoStack.length === 0 || !state.document) return state;

      const actionToUndo = state.undoStack[state.undoStack.length - 1];
      const newUndoStack = state.undoStack.slice(0, -1);

      let updatedDocument = { ...state.document };
      let newRedoStack = [...state.redoStack, actionToUndo];

      // Apply reverse operation
      switch (actionToUndo.type) {
        case PdfEditorActionType.ADD_ANNOTATION:
          updatedDocument.annotations = updatedDocument.annotations.filter(
            a => a.id !== (actionToUndo.data as PdfAnnotation).id
          );
          break;

        case PdfEditorActionType.DELETE_ANNOTATION:
          updatedDocument.annotations = [...updatedDocument.annotations, actionToUndo.data as PdfAnnotation];
          break;

        case PdfEditorActionType.UPDATE_ANNOTATION:
          const { id, oldAnnotation } = actionToUndo.data as any;
          const updateIndex = updatedDocument.annotations.findIndex(a => a.id === id);
          if (updateIndex !== -1) {
            updatedDocument.annotations[updateIndex] = oldAnnotation;
          }
          break;
      }

      return {
        ...state,
        document: updatedDocument,
        undoStack: newUndoStack,
        redoStack: newRedoStack
      };
    }

    case 'REDO': {
      if (state.redoStack.length === 0 || !state.document) return state;

      const actionToRedo = state.redoStack[state.redoStack.length - 1];
      const newRedoStack = state.redoStack.slice(0, -1);

      let updatedDocument = { ...state.document };
      let newUndoStack = [...state.undoStack, actionToRedo];

      // Apply forward operation
      switch (actionToRedo.type) {
        case PdfEditorActionType.ADD_ANNOTATION:
          updatedDocument.annotations = [...updatedDocument.annotations, actionToRedo.data as PdfAnnotation];
          break;

        case PdfEditorActionType.DELETE_ANNOTATION:
          updatedDocument.annotations = updatedDocument.annotations.filter(
            a => a.id !== (actionToRedo.data as PdfAnnotation).id
          );
          break;

        case PdfEditorActionType.UPDATE_ANNOTATION:
          const { id, newAnnotation } = actionToRedo.data as any;
          const redoIndex = updatedDocument.annotations.findIndex(a => a.id === id);
          if (redoIndex !== -1) {
            updatedDocument.annotations[redoIndex] = newAnnotation;
          }
          break;
      }

      return {
        ...state,
        document: updatedDocument,
        undoStack: newUndoStack,
        redoStack: newRedoStack
      };
    }

    case 'CLEAR_HISTORY':
      return {
        ...state,
        undoStack: [],
        redoStack: []
      };

    default:
      return state;
  }
}

export function useEditorState() {
  const [state, dispatch] = useReducer(editorReducer, initialState);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-save functionality
  useEffect(() => {
    if (state.document?.isDirty) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      autoSaveTimeoutRef.current = setTimeout(() => {
        // Auto-save logic would go here
        console.log('Auto-saving document...');
        if (state.document) {
          // Mark as saved
          state.document.isDirty = false;
          state.document.lastModified = new Date();
        }
      }, 30000); // 30 seconds
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [state.document?.isDirty]);

  // Actions
  const setDocument = useCallback((document: PdfEditorState['document']) => {
    dispatch({ type: 'SET_DOCUMENT', payload: document });
  }, []);

  const setTool = useCallback((tool: PdfEditorTool) => {
    dispatch({ type: 'SET_TOOL', payload: tool });
  }, []);

  const setSelectedAnnotation = useCallback((annotation: PdfAnnotation | null) => {
    dispatch({ type: 'SET_SELECTED_ANNOTATION', payload: annotation });
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  const setZoom = useCallback((zoom: number) => {
    dispatch({ type: 'SET_ZOOM', payload: zoom });
  }, []);

  const setFitMode = useCallback((fitMode: PdfFitMode) => {
    dispatch({ type: 'SET_FIT_MODE', payload: fitMode });
  }, []);

  const toggleThumbnails = useCallback(() => {
    dispatch({ type: 'TOGGLE_THUMBNAILS' });
  }, []);

  const toggleToolbar = useCallback(() => {
    dispatch({ type: 'TOGGLE_TOOLBAR' });
  }, []);

  const addAnnotation = useCallback((annotation: PdfAnnotation) => {
    dispatch({ type: 'ADD_ANNOTATION', payload: annotation });
  }, []);

  const updateAnnotation = useCallback((id: string, updates: Partial<PdfAnnotation>) => {
    dispatch({ type: 'UPDATE_ANNOTATION', payload: { id, updates } });
  }, []);

  const deleteAnnotation = useCallback((id: string) => {
    dispatch({ type: 'DELETE_ANNOTATION', payload: id });
  }, []);

  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, []);

  const clearHistory = useCallback(() => {
    dispatch({ type: 'CLEAR_HISTORY' });
  }, []);

  // Computed values
  const canUndo = state.undoStack.length > 0;
  const canRedo = state.redoStack.length > 0;
  const hasUnsavedChanges = state.document?.isDirty || false;

  return {
    // State
    ...state,

    // Computed values
    canUndo,
    canRedo,
    hasUnsavedChanges,

    // Actions
    setDocument,
    setTool,
    setSelectedAnnotation,
    setLoading,
    setError,
    setZoom,
    setFitMode,
    toggleThumbnails,
    toggleToolbar,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    undo,
    redo,
    clearHistory
  };
}
