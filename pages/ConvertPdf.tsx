import React, { useState } from 'react';
import { FileUploader } from '../components/FileUploader';
import { Button } from '../components/Button';
import { PdfFile, ProcessingStatus } from '../types';
import { convertPdfToImages, downloadFile, formatBytes } from '../services/pdfService';
import { FileText, Image as ImageIcon, X, ArrowRight, Download, FileCheck2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Helmet } from 'react-helmet-async';
import { ToolSEOContent } from '../components/ToolSEOContent';

export const ConvertPdf: React.FC = () => {
  const [file, setFile] = useState<PdfFile | null>(null);
  const [readyZip, setReadyZip] = useState<{ blob: Blob; name: string } | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>({ isProcessing: false, message: '' });

  const handleFileSelected = (selectedFiles: File[]) => {
    if (selectedFiles.length > 0) {
      setFile({
        id: uuidv4(),
        file: selectedFiles[0],
        name: selectedFiles[0].name,
        size: selectedFiles[0].size,
      });
    }
  };

  const handleConvertToImages = async () => {
    if (!file) return;
    setStatus({ isProcessing: true, message: 'Converting PDF to Images...' });
    setReadyZip(null);

    try {
      const zipBlob = await convertPdfToImages(file.file);
      const filename = `converted-images-${file.name.replace('.pdf', '')}.zip`;
      setReadyZip({ blob: zipBlob, name: filename });
      downloadFile(zipBlob, filename, { autoDownload: false });
      setStatus({ isProcessing: false, message: 'Converted successfully. Click Download.', success: true });
    } catch (error) {
      console.error(error);
      setStatus({ isProcessing: false, message: 'Error converting file.', error: 'Failed' });
    }
  };

  const handleDownloadReady = () => {
    if (!readyZip) return;
    downloadFile(readyZip.blob, readyZip.name, { autoDownload: true });
  };

  return (
    <>
      <Helmet>
        <title>Convert PDF Online Free | PDF Converter - LAK PDF</title>
        <meta name="description" content="Convert PDF online free with a fast PDF converter workflow." />
        <link rel="canonical" href="https://lakpdf.com/convert" />
        <meta property="og:title" content="Convert PDF Online Free | PDF Converter - LAK PDF" />
        <meta property="og:description" content="Convert PDF online free with a fast PDF converter workflow." />
        <meta property="og:url" content="https://lakpdf.com/convert" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://lakpdf.com/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Convert PDF Online Free | PDF Converter - LAK PDF" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Convert PDF Online Free | PDF Converter - LAK PDF" />
        <meta name="twitter:description" content="Convert PDF to Word, PowerPoint, and images online free." />
        <meta name="twitter:image" content="https://lakpdf.com/og-image.png" />
      </Helmet>
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Convert PDF</h1>
        <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto">
          Convert your PDF files to other formats.
        </p>
      </div>

      {!file ? (
        <FileUploader
          onFilesSelected={handleFileSelected}
          multiple={false}
          icon={<FileText className="w-12 h-12 text-pink-400" />}
          title="Select PDF file"
          description="Drop your PDF here to convert it"
        />
      ) : (
        <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 md:p-8">
           <div className="flex items-start justify-between mb-8 pb-6 border-b border-slate-100">
             <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center text-red-500 font-bold shrink-0">
                 PDF
               </div>
               <div>
                 <h3 className="font-semibold text-slate-900 truncate max-w-[200px] md:max-w-xs">{file.name}</h3>
                 <p className="text-sm text-slate-500">{formatBytes(file.size)}</p>
               </div>
             </div>
             <button onClick={() => setFile(null)} className="text-slate-400 hover:text-red-500 transition-colors">
               <X />
             </button>
           </div>

           <div className="space-y-4">
              <h3 className="font-bold text-slate-900">Select Output Format</h3>
              
              <button 
                className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all group"
                onClick={handleConvertToImages}
                disabled={status.isProcessing}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-slate-700">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <span className="block font-semibold text-slate-900">PDF to JPG</span>
                    <span className="text-xs text-slate-500">Convert pages to images</span>
                  </div>
                </div>
                <ArrowRight className="text-slate-300 group-hover:text-slate-600 transition-colors" />
              </button>

              <button 
                className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 opacity-60 cursor-not-allowed"
                disabled
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <span className="block font-semibold text-slate-900">PDF to Word</span>
                    <span className="text-xs text-slate-500">Coming soon</span>
                  </div>
                </div>
              </button>

              {status.isProcessing && (
                <div className="text-center py-4 text-pink-500 font-medium animate-pulse">
                  Converting... Please wait
                </div>
              )}

              {status.message && !status.isProcessing && !readyZip && (
                <div
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    status.error
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : status.success
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-50 text-slate-700 border border-slate-200'
                  }`}
                >
                  {status.message}
                </div>
              )}

              {readyZip && (
                <div className="pt-2 rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                    <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <FileCheck2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-base font-semibold text-slate-900">Conversion complete</p>
                      <p className="text-sm text-slate-500">{readyZip.name} • {formatBytes(readyZip.blob.size)}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-col sm:flex-row gap-3">
                    <Button className="w-full sm:flex-1" onClick={handleDownloadReady}>
                      <Download className="w-4 h-4 mr-2" />
                      Download ZIP
                    </Button>
                    <Button
                      variant="secondary"
                      className="w-full sm:w-auto"
                      onClick={() => setReadyZip(null)}
                    >
                      Continue Editing
                    </Button>
                  </div>
                </div>
              )}
           </div>
        </div>
      )}
      <ToolSEOContent toolKey="/convert" />
    </div>
    </>
  );
};
