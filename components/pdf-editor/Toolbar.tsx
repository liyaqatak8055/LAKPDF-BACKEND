// Toolbar Component - Tool selection and options
import React from 'react';
import { MousePointer, Type, Image, Highlighter, Square, Circle, Minus, Eraser, Hand, ZoomIn, Edit3 } from 'lucide-react';
import { PdfEditorTool } from '../../types/pdfEditor';

interface ToolbarProps {
  currentTool: PdfEditorTool;
  onToolChange: (tool: PdfEditorTool) => void;
  selectedAnnotation: any;
  onAnnotationUpdate: (id: string, updates: Partial<any>) => void;
  onAnnotationDelete: (id: string) => void;
}

const tools = [
  { id: 'select' as PdfEditorTool, icon: MousePointer, label: 'Select', description: 'Select and move annotations' },
  { id: 'text' as PdfEditorTool, icon: Type, label: 'Text', description: 'Add text annotations' },
  { id: 'image' as PdfEditorTool, icon: Image, label: 'Image', description: 'Add images' },
  { id: 'highlight' as PdfEditorTool, icon: Highlighter, label: 'Highlight', description: 'Highlight text' },
  { id: 'rectangle' as PdfEditorTool, icon: Square, label: 'Rectangle', description: 'Draw rectangles' },
  { id: 'circle' as PdfEditorTool, icon: Circle, label: 'Circle', description: 'Draw circles' },
  { id: 'line' as PdfEditorTool, icon: Minus, label: 'Line', description: 'Draw lines' },
  { id: 'freehand' as PdfEditorTool, icon: Edit3, label: 'Draw', description: 'Freehand drawing' },
  { id: 'eraser' as PdfEditorTool, icon: Eraser, label: 'Erase', description: 'Remove annotations' },
];

export const Toolbar: React.FC<ToolbarProps> = ({
  currentTool,
  onToolChange,
  selectedAnnotation,
  onAnnotationUpdate,
  onAnnotationDelete
}) => {
  return (
    <div className="flex items-center gap-1 p-3 bg-white border-b border-slate-200 overflow-x-auto">
      {/* Tool Selection */}
      <div className="flex items-center gap-1">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-all min-w-[60px] ${
              currentTool === tool.id
                ? 'bg-blue-100 text-blue-600 shadow-sm ring-1 ring-blue-200'
                : 'hover:bg-slate-100 text-slate-600 hover:shadow-sm'
            }`}
            title={`${tool.label}: ${tool.description}`}
          >
            <tool.icon className="w-5 h-5" />
            <span className="text-xs font-medium">{tool.label}</span>
          </button>
        ))}
      </div>

      {/* Separator */}
      {selectedAnnotation && (
        <>
          <div className="w-px h-8 bg-slate-300 mx-2" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Edit</span>

            {/* Color picker for selected annotation */}
            {selectedAnnotation && (
              <input
                type="color"
                value={selectedAnnotation.style?.strokeColor || '#ff0000'}
                onChange={(e) => onAnnotationUpdate(selectedAnnotation.id, {
                  style: { ...selectedAnnotation.style, strokeColor: e.target.value }
                })}
                className="w-8 h-8 rounded border border-slate-300 cursor-pointer"
                title="Change color"
              />
            )}

            {/* Font size for text annotations */}
            {selectedAnnotation?.type === 'text' && (
              <select
                value={selectedAnnotation.style?.fontSize || 14}
                onChange={(e) => onAnnotationUpdate(selectedAnnotation.id, {
                  style: { ...selectedAnnotation.style, fontSize: parseInt(e.target.value) }
                })}
                className="text-xs border border-slate-300 rounded px-2 py-1"
              >
                {[10, 12, 14, 16, 18, 20, 24, 28, 32, 36].map(size => (
                  <option key={size} value={size}>{size}px</option>
                ))}
              </select>
            )}

            {/* Delete button */}
            <button
              onClick={() => onAnnotationDelete(selectedAnnotation.id)}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete annotation"
            >
              <Eraser className="w-4 h-4" />
            </button>
          </div>
        </>
      )}

      {/* Tool Help */}
      <div className="ml-auto text-xs text-slate-400 hidden sm:block">
        {tools.find(t => t.id === currentTool)?.description || 'Select a tool to start editing'}
      </div>
    </div>
  );
};
