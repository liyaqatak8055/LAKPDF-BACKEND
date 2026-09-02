# Professional PDF Editor Architecture

## Overview
This document outlines the architecture of the revamped `EditPdf.tsx` component, which now uses a centralized state management system (Zustand) and a professional rendering pipeline.

## 1. State Management (Zustand)
The `useEditorStore` (in `lib/store.ts`) acts as the Single Source of Truth for the application. It manages:
- **Elements**: All user annotations (Text, Shapes, Drawings, Images). Stored in **Base Units** (PDF Points, zoom-independent).
- **Zoom**: The current zoom level.
- **History**: Undo/Redo stack for elements.
- **OCR State**: `isOcrComplete`, `ocrRunning`, status.
- **PDF Metadata**: Page counts, dimensions.

## 2. Rendering Pipeline
The editor uses a layered rendering approach to ensure performance and correctness:

### Layer 1: PDF Background (Canvas)
- Renders the PDF page as a high-quality raster image.
- **Purely visual**. No interaction.
- Managed by `pdfjs-dist`.

### Layer 2: Fabric.js (Input Layer)
- An invisible/transparent layer that handles **User Inputs** (Clicks, Drags, Drawing).
- **Transient**: Objects created here are immediately converted to Store Elements and removed from Fabric.
- **Persistence**: Edits are persisted to the Store via `addElementToStore`.
- **Drawing**: Freehand drawings are captured via `path:created`, converted to simplified points, and stored.

### Layer 3: Overlay (View Layer)
- Renders the **Store Elements** as HTML/SVG overlays on top of the PDF.
- **Zoom-Aware**: Applies scaling (`zoom * 1.5`) to element positions and sizes during render.
- **Scaling Logic**: `Base Units * Zoom Factor = Screen Pixels`.
- **Text**: Rendered as `<div>` for crisp text and editing.
- **Shapes/Drawings**: Rendered as `<svg>` elements with `<g transform="scale(...)">` for perfect vector scaling.

## 3. Coordinate System
- **Storage**: All elements are stored in **Base Units** (relative to PDF Points at 100% scale).
- **Input**: Fabric inputs (Screen Pixels) are normalized: `Input / Zoom = Base Unit`.
- **Output**: Render loop scales Base Units: `Base Unit * Zoom = Screen Pixels`.
- This ensures that elements stay correctly positioned relative to the PDF content when zooming or resizing.

## 4. OCR Integration
- **Single Run**: OCR runs once per document/page and populates the store.
- **Status**: Tracked via `isOcrComplete` in Store.
- **Layering**: OCR text is rendered as part of the Overlay layer (Layer 3), allowing selection and editing.

## 5. File Saving
- **Vector PDF**: Uses `pdf-lib` to generate a true PDF.
- **Embedding**: Embeds User Annotations (Text, Shapes) as vector objects into the PDF structure.
- **Quality**: Preserves original PDF quality (no rasterization of background).

## Directory Structure
- `pages/EditPdf.tsx`: Main component (View + Input Logic).
- `lib/store.ts`: Zustand Store (State Logic).
- `lib/types.ts`: TypeScript Definitions (Domain Models).
- `lib/editorSystems.ts`: Helper utilities (Coordinate transforms, etc).
