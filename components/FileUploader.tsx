import React, { useRef, useState } from 'react';
import { Upload, FileType, AlertCircle } from 'lucide-react';
import { Button } from './Button';
import { trackEvent } from '../utils/analytics';

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  helperText?: string;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onFilesSelected,
  accept = ".pdf",
  multiple = true,
  title = "Choose PDF files",
  description = "or drop PDFs here",
  icon,
  helperText = "Browser-based file selection"
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const validateFile = (file: File): boolean => {
    if (!accept || accept === '*') return true;
    const acceptedTypes = accept.split(',').map(t => t.trim().toLowerCase());
    const fileName = file.name.toLowerCase();
    const fileType = file.type.toLowerCase();

    return acceptedTypes.some(type => {
      if (type.startsWith('.')) {
        return fileName.endsWith(type);
      }
      if (type.endsWith('/*')) {
        const baseType = type.replace('/*', '');
        return fileType.startsWith(baseType);
      }
      return fileType === type;
    });
  };



  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const submitFiles = (files: File[]) => {
    const invalidFile = files.find((file) => !validateFile(file));
    if (invalidFile) {
      setError(`Unsupported file type: ${invalidFile.name}`);
      trackEvent({
        category: 'File Upload',
        action: 'file_rejected',
        label: invalidFile.name
      });
      return;
    }

    try {
      trackEvent({
        category: 'File Upload',
        action: 'file_upload',
        label: `${title} (${files.length})`
      });
      onFilesSelected(files);
    } catch (err) {
      console.error('[FileUploader] Failed to handle selected files:', err);
      setError('Could not process selected file(s). Please try again.');
      trackEvent({
        category: 'File Upload',
        action: 'file_select_error',
        label: title
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files.length > 0) {
      submitFiles(Array.from(e.target.files));
      // Reset input so same file can be selected again if needed
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    setError(null);

    const droppedFiles = Array.from(e.dataTransfer.files || []) as File[];
    if (droppedFiles.length === 0) return;
    submitFiles(multiple ? droppedFiles : droppedFiles.slice(0, 1));
  };

  return (
    <div
      className={`flex flex-col items-center text-center rounded-xl border border-dashed px-4 py-8 sm:py-10 transition-colors ${isDragActive ? 'border-primary-300 bg-primary-50/70' : 'border-slate-300 bg-white'
        }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center">
        {icon || <Upload className="w-16 h-16 mx-auto mb-4 text-slate-400" />}
        <h3 className="text-xl font-semibold text-slate-900 mb-2">{title}</h3>
        <p className="text-slate-500 mb-6 max-w-sm">{description}</p>

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
        />

        <Button
          variant="primary"
          size="lg"
          className="mt-2 w-full sm:w-auto sm:min-w-[220px] px-5 sm:px-8 py-3 text-base mx-auto"
          onClick={(e) => {
            e.stopPropagation(); // 🔥 safety
            handleClick();
          }}
        >
          <Upload className="mr-2 h-5 w-5" />
          {title}
        </Button>

        {error && (
          <div className="mt-4 flex items-center gap-2 text-sm text-red-500 animate-in slide-in-from-bottom-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {!error && (
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-400 font-medium uppercase tracking-wide">
            <FileType className="w-3 h-3" />
            <span>{helperText}</span>
          </div>
        )}
      </div>
    </div>
  );
};
