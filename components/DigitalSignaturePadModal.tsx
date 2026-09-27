import React, { useRef, useState, useEffect } from 'react';
import { PenTool, RotateCcw, Check, X, Palette, Sparkles } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface DigitalSignaturePadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSignature: (file: File) => void;
  examName?: string;
}

export const DigitalSignaturePadModal: React.FC<DigitalSignaturePadModalProps> = ({
  isOpen,
  onClose,
  onSaveSignature,
  examName = 'EXAM',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [inkColor, setInkColor] = useState<'#000000' | '#1e3a8a'>('#000000');
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Initialize canvas with pure white background
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set high internal resolution for crisp signature
    canvas.width = 600;
    canvas.height = 250;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }, [isOpen]);

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const coords = getCanvasCoords(e);
    lastPointRef.current = coords;
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentPoint = getCanvasCoords(e);
    const lastPoint = lastPointRef.current;

    if (lastPoint) {
      ctx.strokeStyle = inkColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(currentPoint.x, currentPoint.y);
      ctx.stroke();
    }

    lastPointRef.current = currentPoint;
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    lastPointRef.current = null;
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `${examName.toUpperCase()}_Digital_Signature.jpg`, {
          type: 'image/jpeg',
        });
        onSaveSignature(file);
        onClose();
      },
      'image/jpeg',
      0.95
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Draw Digital Signature (Finger or Mouse)"
      contentClassName="max-w-lg"
    >
      <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
        <p className="text-slate-600 dark:text-slate-400 text-xs">
          Sign directly inside the box using your <strong>touchscreen/finger</strong> on mobile or <strong>mouse</strong> on PC.
          We automatically optimize the signature to official <strong>10–20 KB</strong> specifications.
        </p>

        {/* Canvas Area */}
        <div className="relative border-2 border-dashed border-slate-300 dark:border-dark-border rounded-xl overflow-hidden bg-white shadow-inner select-none touch-none">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full h-[180px] sm:h-[200px] cursor-crosshair block"
          />

          {!hasDrawn && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-slate-300 dark:text-slate-400 select-none">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
                <PenTool className="w-4 h-4" /> Sign Here on Baseline
              </span>
            </div>
          )}

          {/* Dotted Baseline */}
          <div className="pointer-events-none absolute bottom-8 left-6 right-6 border-b border-dashed border-slate-200" />
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Ink Color Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Ink:</span>
            <button
              type="button"
              onClick={() => setInkColor('#000000')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all ${
                inkColor === '#000000'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-black inline-block"></span>
              <span>Black Ink (IBPS/SBI)</span>
            </button>

            <button
              type="button"
              onClick={() => setInkColor('#1e3a8a')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all ${
                inkColor === '#1e3a8a'
                  ? 'bg-blue-900 text-white border-blue-900'
                  : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-blue-900 inline-block"></span>
              <span>Blue Ink</span>
            </button>
          </div>

          {/* Clear Button */}
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1 px-3 py-1 text-xs text-rose-600 hover:text-rose-700 font-medium hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear Canvas</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-slate-200 dark:border-dark-border flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={!hasDrawn}
            className="flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Use this Signature (10–20 KB)</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};
