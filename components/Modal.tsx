import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  hideDefaultHeader?: boolean;
  contentClassName?: string;
  bodyClassName?: string;
  backdropClassName?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  hideDefaultHeader = false,
  contentClassName = '',
  bodyClassName = '',
  backdropClassName = '',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  useBodyScrollLock(isOpen);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Close on click outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="lak-modal fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-hidden overscroll-none">
      {/* Backdrop with blur */}
      <div 
        className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in ${backdropClassName}`}
        onClick={handleBackdropClick}
      />

      {/* Modal Content */}
      <div
        ref={modalRef}
        className={`lak-modal-content relative bg-white rounded-2xl shadow-2xl w-[94%] sm:w-[92%] max-w-[560px] max-h-[92dvh] sm:max-h-[80vh] min-h-0 overflow-hidden flex flex-col animate-in zoom-in-95 slide-in-from-bottom-2 duration-300 ${contentClassName}`}
      >
        {/* Header */}
        {!hideDefaultHeader && (
          <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-white sticky top-0 z-10">
            <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
            <button 
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Body */}
        <div
          className={`p-0 flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y custom-scrollbar ${bodyClassName}`}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
