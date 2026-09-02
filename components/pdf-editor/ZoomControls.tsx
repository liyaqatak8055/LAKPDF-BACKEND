// Zoom Controls Component - Zoom and fit controls
import React from 'react';
import { ZoomIn, ZoomOut, Maximize, RotateCcw } from 'lucide-react';
import type { PdfFitMode } from '../../types/pdfEditor';

interface ZoomControlsProps {
  zoom: number;
  fitMode: PdfFitMode;
  onZoomChange: (zoom: number) => void;
  onFitModeChange: (fitMode: PdfFitMode) => void;
  minZoom: number;
  maxZoom: number;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  zoom,
  fitMode,
  onZoomChange,
  onFitModeChange,
  minZoom,
  maxZoom
}) => {
  const zoomIn = () => onZoomChange(Math.min(maxZoom, zoom * 1.2));
  const zoomOut = () => onZoomChange(Math.max(minZoom, zoom / 1.2));
  const resetZoom = () => onZoomChange(1.0);

  return (
    <div className="flex items-center gap-2 bg-white rounded-lg shadow-lg border border-slate-200 p-2">
      <button
        onClick={zoomOut}
        disabled={zoom <= minZoom}
        className="p-2 hover:bg-slate-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        title="Zoom Out"
      >
        <ZoomOut className="w-4 h-4" />
      </button>

      <span className="text-sm font-medium min-w-[60px] text-center">
        {Math.round(zoom * 100)}%
      </span>

      <button
        onClick={zoomIn}
        disabled={zoom >= maxZoom}
        className="p-2 hover:bg-slate-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        title="Zoom In"
      >
        <ZoomIn className="w-4 h-4" />
      </button>

      <div className="w-px h-6 bg-slate-200 mx-1" />

      <button
        onClick={resetZoom}
        className="p-2 hover:bg-slate-100 rounded"
        title="Reset Zoom"
      >
        <RotateCcw className="w-4 h-4" />
      </button>

      <button
        onClick={() => onFitModeChange('fit-width')}
        className={`p-2 hover:bg-slate-100 rounded ${
          fitMode === 'fit-width' ? 'bg-blue-100 text-blue-600' : ''
        }`}
        title="Fit Width"
      >
        <Maximize className="w-4 h-4" />
      </button>
    </div>
  );
};
