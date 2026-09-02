export enum ToolType {
  MERGE = 'merge',
  SPLIT = 'split',
  COMPRESS = 'compress',
  IMG_TO_PDF = 'img-to-pdf',
  PDF_TO_IMG = 'pdf-to-img',
  ROTATE = 'rotate',
  PROTECT = 'protect',
  UNLOCK = 'unlock',
}

export interface PdfFile {
  id: string;
  file: File;
  name: string;
  size: number;
  previewUrl?: string; // For images or generated thumbnails
}

export interface ProcessingStatus {
  isProcessing: boolean;
  message: string;
  error?: string;
  success?: boolean;
}