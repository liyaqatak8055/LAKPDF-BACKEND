/**
 * Centralized SEO content data for all tool pages.
 * Each key matches a route path from ROUTE_SEO in App.tsx.
 *
 * Content guidelines (from SEO_TOP10_CONTENT_UPGRADE_PACK.md):
 * - 120-220 word unique intro above uploader
 * - 4-6 FAQs below tool
 * - 3-5 internal links to related tools
 * - Trust block: privacy + no watermark + no signup
 * - Last updated date
 */

export interface HowToStep {
  step: string;
  detail: string;
}

export interface Benefit {
  title: string;
  description: string;
  icon: 'zap' | 'shield' | 'clock' | 'globe' | 'lock' | 'smartphone' | 'download' | 'layers' | 'eye' | 'check' | 'star' | 'target';
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface InternalLink {
  label: string;
  to: string;
}

export interface ToolSEOData {
  intro: string;
  howToUse: HowToStep[];
  benefits: Benefit[];
  faqs: FAQ[];
  internalLinks: InternalLink[];
  lastUpdated: string;
}

const toolSEOData: Record<string, ToolSEOData> = {
  "/compress": {
    intro: "Compress PDF online free in a few clicks with LAK PDF. This tool helps you reduce PDF file size for email, WhatsApp, college portals, and government uploads without complicated settings. Upload your file, choose compression level, and download a smaller PDF instantly. The process is fast and browser-based, so you do not need to install any software. If your PDF is too large to share, this compressor is designed for quick size reduction while keeping readability. You can also set a custom target file size in KB or MB for precise control. For best results, start with the recommended compression and switch to extreme compression only when you need a much smaller file. Whether you are compressing scanned documents, invoices, or assignment PDFs, LAK PDF handles it securely in your browser with no data uploaded to servers.",
    howToUse: [
      { step: "Upload your PDF", detail: "Click the upload area or drag and drop your PDF file. There is no fixed file size limit." },
      { step: "Choose compression mode", detail: "Select from Recommended, Extreme, or Lossless levels. Or switch to Target Size mode." },
      { step: "Compress", detail: "Click Compress PDF. The tool processes your file directly in the browser." },
      { step: "Download", detail: "Review the size reduction stats and download your optimized PDF instantly." },
    ],
    benefits: [
      { title: "Fast & Free", description: "Compress PDF files in seconds without any cost, signup, or software installation.", icon: "zap" },
      { title: "Custom Target Size", description: "Set a specific file size target (50KB, 100KB, 1MB, etc.) and the tool will find the best quality.", icon: "target" },
      { title: "100% Browser-Based", description: "Your PDF never leaves your device. All processing happens locally for maximum privacy.", icon: "shield" },
      { title: "Works on All Devices", description: "Use on desktop, tablet, or mobile. No app download required.", icon: "smartphone" },
    ],
    faqs: [
      { question: "How do I compress a PDF without losing quality?", answer: "Use the Recommended or Lossless compression level. Recommended reduces file size significantly while keeping text sharp. Lossless optimizes file structure without any quality reduction." },
      { question: "What is the best PDF size for email attachments?", answer: "Most email services allow up to 25 MB. For quick sharing, compress your PDF to under 5 MB. Use LAK PDF's target size feature to set a specific limit." },
      { question: "Can I compress scanned PDF files?", answer: "Yes, scanned PDFs often have large image content. Using Extreme compression or setting a target size will give the best reduction." },
      { question: "Is this PDF compressor free to use?", answer: "Yes, completely free with no limitations. No signup, no watermark, and no daily file limits." },
      { question: "Why is my compressed PDF still large?", answer: "Some PDFs are already optimized or contain high-resolution images that cannot be compressed further. Try Extreme compression or set a smaller target size." },
    ],
    internalLinks: [
      { label: "Merge PDF", to: "/merge" },
      { label: "Split PDF", to: "/split" },
      { label: "PDF to Word", to: "/pdf-to-word" },
      { label: "Sign PDF", to: "/sign-pdf" },
      { label: "Compress Image", to: "/compress-img" },
    ],
    lastUpdated: "2026-08-14",
  },

  "/merge": {
    intro: "Merge PDF online free and combine multiple PDF files into one organized document. LAK PDF makes it easy to upload files, reorder pages, and download a single merged PDF quickly. This is useful for combining invoices, resumes, reports, assignments, and scanned documents before sharing. The workflow is simple: add files, arrange order, and merge. You can merge two files or many files at once depending on your requirement. If you need to remove pages before combining, use Split PDF first and then merge the final version. Everything runs in your browser — your files are never uploaded to any external server, keeping your documents completely private and secure.",
    howToUse: [
      { step: "Select PDF files", detail: "Click the upload area or drag and drop multiple PDF files." },
      { step: "Arrange file order", detail: "Use the up and down arrows to reorder files in your desired sequence." },
      { step: "Merge", detail: "Click Merge PDF. All files are combined into one document in your browser." },
      { step: "Download", detail: "Download your merged PDF file instantly." },
    ],
    benefits: [
      { title: "Unlimited Files", description: "Merge as many PDF files as you need — no fixed limit on file count.", icon: "layers" },
      { title: "Drag & Reorder", description: "Easily rearrange file order before merging.", icon: "zap" },
      { title: "No Quality Loss", description: "Merged PDF retains all original formatting, images, and text quality.", icon: "eye" },
      { title: "Completely Private", description: "All merging happens in your browser. No files are uploaded to any server.", icon: "shield" },
    ],
    faqs: [
      { question: "How many PDF files can I merge at once?", answer: "There is no fixed limit. You can merge 2 or 20+ files. The actual limit depends on your device memory." },
      { question: "Can I change file order before merging?", answer: "Yes, use the arrow buttons to move files up or down before clicking Merge." },
      { question: "Does merging reduce PDF quality?", answer: "No, all pages, images, and text are preserved exactly as in the original files." },
      { question: "Is the merged PDF safe and private?", answer: "Yes, all processing happens in your browser. Files never leave your device." },
      { question: "Can I merge PDF files on mobile?", answer: "Yes, LAK PDF works on all mobile browsers including Chrome, Safari, and Firefox." },
    ],
    internalLinks: [
      { label: "Split PDF", to: "/split" },
      { label: "Organize PDF", to: "/organize-pdf" },
      { label: "Compress PDF", to: "/compress" },
      { label: "Delete Pages", to: "/delete-page" },
      { label: "Add Page Numbers", to: "/page-number" },
    ],
    lastUpdated: "2026-08-14",
  },

  "/split": {
    intro: "Split PDF online free to extract specific pages or divide one large file into smaller PDFs. LAK PDF is useful when you only need selected pages for submission, printing, or sharing. Upload the file, choose page range or pick individual pages, and download separate PDFs instantly. This saves time and avoids sending unnecessary pages. You can split by custom ranges and then merge pages again if needed. Whether you need to extract a single page from a 100-page report or split a document into chapters, LAK PDF handles it effortlessly in your browser.",
    howToUse: [
      { step: "Upload your PDF", detail: "Select or drag and drop the PDF file. The tool shows page thumbnails for easy selection." },
      { step: "Choose split mode", detail: "Select 'All pages', 'Range' (e.g. 1-5, 8), or click individual page thumbnails." },
      { step: "Split", detail: "Click Split PDF. The tool extracts selected pages into separate PDF files." },
      { step: "Download", detail: "Download individual PDFs or get all split files as a ZIP archive." },
    ],
    benefits: [
      { title: "Multiple Split Modes", description: "Split all pages, by range, or pick specific pages.", icon: "layers" },
      { title: "Visual Page Selection", description: "See thumbnail previews of every page to select exactly what you need.", icon: "eye" },
      { title: "Fast Processing", description: "Split even large PDFs in seconds. Everything runs locally.", icon: "zap" },
      { title: "Secure & Private", description: "No files uploaded to servers. Your documents stay on your device.", icon: "shield" },
    ],
    faqs: [
      { question: "How do I extract a single page from a PDF?", answer: "Upload your PDF, select Custom mode, click on the page thumbnail, and click Split. You get that page as a separate PDF." },
      { question: "Can I split a PDF by page range?", answer: "Yes, use Range mode and enter pages like '1-5, 8, 12-15'. The tool extracts those pages into a new PDF." },
      { question: "Will split files lose quality?", answer: "No, splitting preserves original quality. Text, images, and formatting remain the same." },
      { question: "Can I split password-protected PDF files?", answer: "If the PDF has restrictions, remove the password first, then split." },
      { question: "Is there a file size limit for splitting?", answer: "No fixed server limit since processing happens in your browser." },
    ],
    internalLinks: [
      { label: "Merge PDF", to: "/merge" },
      { label: "Delete Pages", to: "/delete-page" },
      { label: "Organize PDF", to: "/organize-pdf" },
      { label: "Compress PDF", to: "/compress" },
      { label: "Rotate PDF", to: "/rotate" },
    ],
    lastUpdated: "2026-08-14",
  },

  "/img-to-pdf": {
    intro: "Convert JPG to PDF online free with LAK PDF. Upload JPG, PNG, or multiple images and create a single PDF in the correct order. This tool is useful for document scans, certificates, notes, and form submissions where PDF format is required. Drag and drop images, reorder pages, and download your final PDF instantly. It works on desktop and mobile browsers without any app installation. If your output file is large, use Compress PDF after conversion to reduce file size. Whether you are preparing admission documents, ID proofs, or photo collections, converting images to PDF makes sharing and printing much easier.",
    howToUse: [
      { step: "Select images", detail: "Upload JPG, PNG, or other image files. Multiple images can be added at once." },
      { step: "Arrange order", detail: "Preview images and rearrange them in the desired page order." },
      { step: "Convert", detail: "Click Convert. All images are combined into a single PDF document." },
      { step: "Download", detail: "Download your image-based PDF instantly." },
    ],
    benefits: [
      { title: "Multiple Image Support", description: "Upload JPG, PNG, WebP formats. Convert single or batch images to one PDF.", icon: "layers" },
      { title: "Reorder Pages", description: "Drag and arrange images in any order before creating the final PDF.", icon: "zap" },
      { title: "No Quality Loss", description: "Images are embedded at original resolution for sharp, print-ready output.", icon: "eye" },
      { title: "Works on Mobile", description: "Take photos on your phone and convert to PDF in your mobile browser.", icon: "smartphone" },
    ],
    faqs: [
      { question: "Can I convert multiple JPG files into one PDF?", answer: "Yes, upload multiple images and LAK PDF combines them into a single multi-page PDF in your arranged order." },
      { question: "Is image quality preserved after conversion?", answer: "Yes, images are embedded at original resolution. The PDF looks as sharp as your original images." },
      { question: "Can I reorder images before creating PDF?", answer: "Yes, rearrange the image order after uploading. The final PDF follows your sequence." },
      { question: "Does this support PNG to PDF too?", answer: "Yes, LAK PDF supports JPG, PNG, WebP, and other common image formats." },
      { question: "How can I reduce file size after conversion?", answer: "Use the Compress PDF tool on LAK PDF to reduce the output file size." },
    ],
    internalLinks: [
      { label: "Compress PDF", to: "/compress" },
      { label: "PDF to Image", to: "/pdf-to-img" },
      { label: "Word to PDF", to: "/word-to-pdf" },
      { label: "Scan PDF", to: "/scan-pdf" },
      { label: "Compress Image", to: "/compress-img" },
    ],
    lastUpdated: "2026-08-14",
  },

  "/pdf-to-word": {
    intro: "Convert PDF to Word online free and get an editable DOCX file quickly. LAK PDF helps when you need to edit contracts, notes, resumes, or reports originally saved as PDF. Upload your PDF, process it, and download a Word file you can modify in Microsoft Word or Google Docs. For scanned files, the tool includes an OCR option to improve text extraction quality. This saves time compared to manual copy-paste and is designed for students, professionals, and office workflows. The conversion handles text, tables, and basic formatting securely.",
    howToUse: [
      { step: "Upload your PDF", detail: "Select the PDF you want to convert. The tool auto-detects text-based or scanned content." },
      { step: "Choose method", detail: "Use Auto mode for text PDFs, or enable OCR for scanned documents." },
      { step: "Convert", detail: "Click Convert. The tool generates an editable Word (DOCX) file." },
      { step: "Download", detail: "Download your Word document. Open in Microsoft Word or Google Docs." },
    ],
    benefits: [
      { title: "Smart Detection", description: "Auto-detects text-based vs scanned PDFs and applies the best conversion method.", icon: "zap" },
      { title: "OCR for Scanned PDFs", description: "Built-in OCR extracts text from scanned documents and image-based PDFs.", icon: "eye" },
      { title: "Editable Output", description: "Get a fully editable DOCX with preserved text, tables, and formatting.", icon: "check" },
      { title: "No Signup Required", description: "Convert completely free without creating any account.", icon: "shield" },
    ],
    faqs: [
      { question: "Will formatting stay same after conversion?", answer: "LAK PDF preserves text, basic formatting, and tables. Complex layouts may need minor adjustments." },
      { question: "Can I convert a scanned PDF to editable Word?", answer: "Yes, enable OCR before conversion to extract text from scanned pages." },
      { question: "Is this tool free for large files?", answer: "Yes, completely free with no file size restrictions." },
      { question: "Why are some tables misaligned?", answer: "Complex table layouts can be challenging. Try layout-preserving mode for better table accuracy." },
      { question: "Should I run OCR before PDF to Word?", answer: "Only for scanned pages. For text-based PDFs, Auto mode gives the best results." },
    ],
    internalLinks: [
      { label: "OCR PDF", to: "/ocr-pdf" },
      { label: "Word to PDF", to: "/word-to-pdf" },
      { label: "Compress PDF", to: "/compress" },
      { label: "PDF Editor", to: "/pdf-editor" },
      { label: "PDF to Text", to: "/pdf-to-text" },
    ],
    lastUpdated: "2026-08-14",
  },

  "/sign-pdf": {
    intro: "Sign PDF online free with LAK PDF and add your signature in seconds. Ideal for offer letters, agreements, declarations, and application forms. Upload your PDF, draw or type your signature, place it where needed, adjust size, and download the signed file. No printing or scanning required. Create a clean signature flow directly in your browser from desktop or mobile. LAK PDF supports draw, type, and upload signature modes giving you complete flexibility. The signed document maintains its original quality and formatting.",
    howToUse: [
      { step: "Upload your PDF", detail: "Select the PDF document you need to sign." },
      { step: "Create your signature", detail: "Draw, type in cursive font, or upload an image of your signature." },
      { step: "Place and adjust", detail: "Click on the page to place your signature. Resize and reposition it." },
      { step: "Save and download", detail: "Click Save to embed the signature permanently, then download." },
    ],
    benefits: [
      { title: "Three Signature Modes", description: "Draw with finger/mouse, type in cursive, or upload an existing signature image.", icon: "layers" },
      { title: "Multi-Page Support", description: "Navigate pages and place signatures on different pages.", icon: "zap" },
      { title: "No Printing Needed", description: "Skip the print-sign-scan cycle. Sign digitally in your browser.", icon: "clock" },
      { title: "Private & Secure", description: "Your document and signature never leave your device.", icon: "lock" },
    ],
    faqs: [
      { question: "Is online PDF signing legally valid?", answer: "Digital signatures are generally accepted for most personal and business documents. Check local regulations for legally binding contracts." },
      { question: "Can I draw and upload both signature types?", answer: "Yes, three modes — draw, type in cursive, or upload an image of your handwritten signature." },
      { question: "Can I sign multiple pages?", answer: "Yes, navigate between pages and place signatures on any page." },
      { question: "Does signing change PDF quality?", answer: "No, the signature is overlaid without altering original content quality." },
      { question: "Is my signed document private?", answer: "Yes, all processing happens in your browser. Nothing is uploaded to any server." },
    ],
    internalLinks: [
      { label: "PDF Editor", to: "/pdf-editor" },
      { label: "Merge PDF", to: "/merge" },
      { label: "Compress PDF", to: "/compress" },
      { label: "Watermark PDF", to: "/watermark" },
    ],
    lastUpdated: "2026-08-14",
  },

  "/ocr-pdf": {
    intro: "OCR PDF online free to extract text from scanned documents and image-based PDFs. LAK PDF converts non-selectable text into searchable, editable content for notes, assignments, and office files. Upload a scanned PDF, run OCR, and copy or export the extracted text. Especially useful for old scans, printed forms, and low-quality documents where normal copy-paste does not work. The OCR engine supports multiple languages and offers quality settings for accuracy. Export results as plain text, Word document, or searchable PDF.",
    howToUse: [
      { step: "Upload scanned PDF", detail: "Select a scanned or image-based PDF file." },
      { step: "Configure settings", detail: "Choose language, OCR quality (fast/balanced/accurate), and enhancement options." },
      { step: "Run OCR", detail: "Click OCR. The engine processes each page with progress tracking." },
      { step: "Copy or export", detail: "Review extracted text, copy to clipboard, or download as text/Word file." },
    ],
    benefits: [
      { title: "Multi-Language OCR", description: "Supports English, Hindi, and other languages for accurate extraction.", icon: "globe" },
      { title: "Quality Settings", description: "Choose Fast, Balanced, or Accurate modes to trade off speed vs precision.", icon: "target" },
      { title: "Multiple Exports", description: "Export as plain text, Word document, or searchable PDF.", icon: "download" },
      { title: "Browser-Based", description: "All OCR runs in your browser. No documents uploaded externally.", icon: "shield" },
    ],
    faqs: [
      { question: "What is OCR in PDF?", answer: "OCR (Optical Character Recognition) reads text from images and scanned documents, converting image-based text into selectable, searchable content." },
      { question: "Can OCR read scanned PDFs accurately?", answer: "Accuracy depends on scan quality and font clarity. Use Accurate mode and image enhancement for best results." },
      { question: "Which languages are supported?", answer: "English, Hindi, Spanish, French, German, and more. Select your language before running OCR." },
      { question: "Can I convert OCR output to Word?", answer: "Yes, export extracted text directly as a Word (DOCX) document." },
      { question: "Why does OCR accuracy vary?", answer: "It depends on image resolution, font type, text clarity, and document condition." },
    ],
    internalLinks: [
      { label: "PDF to Word", to: "/pdf-to-word" },
      { label: "PDF to Text", to: "/pdf-to-text" },
      { label: "Scan PDF", to: "/scan-pdf" },
      { label: "Compress PDF", to: "/compress" },
      { label: "PDF Editor", to: "/pdf-editor" },
    ],
    lastUpdated: "2026-08-14",
  },

  "/pdf-to-img": {
    intro: "Convert PDF to JPG online free and export each page as a high-quality image. LAK PDF makes it easy to create shareable visuals from PDF notes, slides, posters, and reports. Upload your file and download page images instantly. Useful for social media sharing, presentation snippets, and uploading individual pages where PDF is not accepted. Convert all pages at once or select specific pages. Output images maintain original resolution and clarity. No software installation needed — works in any modern browser.",
    howToUse: [
      { step: "Upload your PDF", detail: "Select or drag and drop the PDF file to convert." },
      { step: "Choose pages", detail: "Select all pages or pick specific pages to export as images." },
      { step: "Convert", detail: "Click Convert. Each page is rendered as a high-quality JPG image." },
      { step: "Download", detail: "Download individual images or get all pages as a ZIP archive." },
    ],
    benefits: [
      { title: "High-Quality Output", description: "Export pages as sharp, high-resolution JPG images for print and web.", icon: "eye" },
      { title: "Batch Conversion", description: "Convert all pages at once and download as a ZIP archive.", icon: "layers" },
      { title: "Free & Unlimited", description: "No file limits, no daily caps, no signup required.", icon: "star" },
      { title: "Browser-Based", description: "All conversion happens in your browser. No files uploaded.", icon: "shield" },
    ],
    faqs: [
      { question: "Can I convert all PDF pages to images at once?", answer: "Yes, LAK PDF converts all pages and lets you download them individually or as a ZIP file." },
      { question: "Does this support PNG output?", answer: "Currently exports as JPG which provides excellent quality with smaller sizes." },
      { question: "Will image quality remain sharp?", answer: "Yes, pages are rendered at high resolution for clear, sharp images." },
      { question: "Can I choose only selected pages?", answer: "Yes, select specific pages rather than converting the entire document." },
      { question: "Is PDF to JPG free on mobile?", answer: "Yes, works on all mobile browsers. Completely free on all devices." },
    ],
    internalLinks: [
      { label: "Image to PDF", to: "/img-to-pdf" },
      { label: "Compress Image", to: "/compress-img" },
      { label: "Crop PDF", to: "/crop-pdf" },
      { label: "Watermark PDF", to: "/watermark" },
      { label: "PDF to Word", to: "/pdf-to-word" },
    ],
    lastUpdated: "2026-08-14",
  },

  "/word-to-pdf": {
    intro: "Convert Word to PDF online free with one-click processing. LAK PDF supports DOC and DOCX to create professional PDF files for assignments, resumes, and office submissions. Upload your Word file and download PDF instantly while preserving structure and formatting. Ideal when a portal only accepts PDF format. No software installation or signup required. The conversion handles text, images, headers, footers, and basic formatting. Your files are processed securely in your browser.",
    howToUse: [
      { step: "Upload Word file", detail: "Select your DOC or DOCX file." },
      { step: "Convert", detail: "Click Convert. The tool generates a PDF from your Word document." },
      { step: "Preview", detail: "Review the converted PDF for correct formatting." },
      { step: "Download", detail: "Download your PDF file instantly." },
    ],
    benefits: [
      { title: "DOC & DOCX Support", description: "Upload both DOC and DOCX Word files.", icon: "layers" },
      { title: "Format Preservation", description: "Text, images, headers, and formatting are preserved.", icon: "check" },
      { title: "Instant Conversion", description: "Convert in seconds. No waiting, no queues, no signup.", icon: "zap" },
      { title: "Secure Processing", description: "Your Word file is processed locally and never shared.", icon: "shield" },
    ],
    faqs: [
      { question: "Does Word to PDF keep formatting?", answer: "LAK PDF preserves text, images, headers, and basic formatting. Complex features like macros may appear differently." },
      { question: "Can I convert DOCX and DOC both?", answer: "Yes, both DOC and DOCX formats are supported." },
      { question: "Is there a file size limit?", answer: "No fixed limit. Speed depends on your device and document complexity." },
      { question: "Can I convert multiple Word files?", answer: "Currently one at a time. Convert each, then use Merge PDF to combine." },
      { question: "Is this converter free?", answer: "Yes, completely free with no limitations, no watermarks, and no signup." },
    ],
    internalLinks: [
      { label: "PDF to Word", to: "/pdf-to-word" },
      { label: "Compress PDF", to: "/compress" },
      { label: "Merge PDF", to: "/merge" },
      { label: "Sign PDF", to: "/sign-pdf" },
      { label: "PowerPoint to PDF", to: "/powerpoint-to-pdf" },
    ],
    lastUpdated: "2026-08-14",
  },

  "/pdf-editor": {
    intro: "Edit PDF online free using LAK PDF editor. Add text, annotate, draw, insert images, and update document content directly in your browser. This editor helps students and professionals quickly fix typos, mark important lines, and prepare final documents without desktop software. Upload your PDF, make edits on any page, and export the updated version instantly. For signed workflows, edit first and then use Sign PDF. Everything runs in your browser for maximum speed and privacy.",
    howToUse: [
      { step: "Upload your PDF", detail: "Select or drag and drop the PDF file. All pages load for editing." },
      { step: "Make your edits", detail: "Use toolbar to add text, draw, highlight, or insert images." },
      { step: "Navigate pages", detail: "Switch between pages to edit across the entire document." },
      { step: "Save and download", detail: "Click Save to apply edits, then download the updated PDF." },
    ],
    benefits: [
      { title: "Rich Editing Tools", description: "Add text, draw, highlight, annotate, and insert images — all in one.", icon: "layers" },
      { title: "Multi-Page Editing", description: "Navigate and edit any page without switching tools.", icon: "zap" },
      { title: "No Software Needed", description: "Full editing in your web browser — works on desktop and mobile.", icon: "globe" },
      { title: "Instant Export", description: "All edits applied and PDF ready to download immediately.", icon: "download" },
    ],
    faqs: [
      { question: "Can I add text to an existing PDF online?", answer: "Yes, place new text anywhere on the page. Choose font size, color, and position." },
      { question: "Can I draw and highlight on PDF?", answer: "Yes, freehand drawing and highlighting tools are included." },
      { question: "Will edited PDF keep original layout?", answer: "Yes, edits are overlaid on original content. Existing layout remains unchanged." },
      { question: "Can I edit PDF on mobile browser?", answer: "Yes, the editor is responsive with touch gesture support." },
      { question: "Is online PDF editing secure?", answer: "Yes, all editing happens in your browser. Your PDF is never uploaded." },
    ],
    internalLinks: [
      { label: "Sign PDF", to: "/sign-pdf" },
      { label: "Compress PDF", to: "/compress" },
      { label: "Watermark PDF", to: "/watermark" },
      { label: "PDF to Word", to: "/pdf-to-word" },
      { label: "Add Page Numbers", to: "/page-number" },
    ],
    lastUpdated: "2026-08-14",
  },

  "/compress-img": {
    intro: "Compress image online free and reduce JPG, PNG, or WebP file sizes quickly without losing visible quality. LAK PDF image compressor is designed for fast web uploads, form submissions, and social media sharing. Upload your images, adjust quality settings, and download optimized files instantly. The tool processes images directly in your browser so your photos never leave your device. Whether you need to compress a profile photo or reduce image sizes for a website, LAK PDF delivers the best balance of quality and file size.",
    howToUse: [
      { step: "Upload images", detail: "Select JPG, PNG, or WebP images by clicking or dragging." },
      { step: "Adjust quality", detail: "Set the compression quality level for size vs detail balance." },
      { step: "Compress", detail: "Click Compress. All images are processed simultaneously." },
      { step: "Download", detail: "Download compressed images individually or as a ZIP." },
    ],
    benefits: [
      { title: "Batch Processing", description: "Compress multiple images at once.", icon: "layers" },
      { title: "Quality Control", description: "Adjust compression level for perfect size-quality balance.", icon: "target" },
      { title: "No File Limits", description: "No daily limits or file count restrictions.", icon: "star" },
      { title: "Privacy First", description: "Images processed in browser. No photos uploaded.", icon: "shield" },
    ],
    faqs: [
      { question: "How much can I reduce image file size?", answer: "Typically 40-80% depending on the image and settings." },
      { question: "Will images look blurry?", answer: "With moderate settings, quality difference is barely noticeable." },
      { question: "Can I compress PNG images?", answer: "Yes, JPG, PNG, and WebP are all supported." },
      { question: "Is this free?", answer: "Yes, completely free with no signup, watermarks, or limits." },
    ],
    internalLinks: [
      { label: "Compress to 50KB", to: "/advance-compress-img" },
      { label: "Image to PDF", to: "/img-to-pdf" },
      { label: "PDF to Image", to: "/pdf-to-img" },
      { label: "Compress PDF", to: "/compress" },
    ],
    lastUpdated: "2026-08-14",
  },

  "/advance-compress-img": {
    intro: "Compress image to 50KB online free for government forms, exam registrations, college admissions, and official uploads. LAK PDF advanced compressor lets you set a specific target file size in KB and automatically adjusts quality to match. Upload your photo, set the desired KB limit, and download a perfectly sized image. Essential when upload portals have strict size requirements like 50KB, 100KB, or 200KB. Works with JPG, PNG, and WebP formats.",
    howToUse: [
      { step: "Upload images", detail: "Select JPG, PNG, or WebP images. Batch processing supported." },
      { step: "Set target size", detail: "Enter target file size in KB (e.g., 50, 100, 200)." },
      { step: "Compress", detail: "Click Compress. Intelligent quality adjustment to reach your target." },
      { step: "Download", detail: "Download compressed images individually or as ZIP." },
    ],
    benefits: [
      { title: "Exact Size Targeting", description: "Set any KB target and the tool adjusts quality precisely.", icon: "target" },
      { title: "Perfect for Forms", description: "Meet strict size requirements for government portals and exams.", icon: "check" },
      { title: "Batch Processing", description: "Compress multiple images to same target size at once.", icon: "layers" },
      { title: "Browser-Based", description: "Photos processed locally. Nothing uploaded.", icon: "shield" },
    ],
    faqs: [
      { question: "How do I compress an image to exactly 50KB?", answer: "Upload your image, set target to 50 KB, and click Compress. The tool adjusts quality automatically." },
      { question: "Will the image look okay at 50KB?", answer: "For most photos, 50KB produces acceptable quality for form uploads." },
      { question: "Can I compress multiple images at once?", answer: "Yes, upload multiple images and all are compressed to your target." },
      { question: "What if target cannot be reached?", answer: "The tool returns the smallest possible result and indicates the target was not met." },
      { question: "Which formats are supported?", answer: "JPG, PNG, and WebP. Output is always JPG for maximum compatibility." },
    ],
    internalLinks: [
      { label: "Compress Image", to: "/compress-img" },
      { label: "Image to PDF", to: "/img-to-pdf" },
      { label: "Compress PDF", to: "/compress" },
      { label: "PDF to Image", to: "/pdf-to-img" },
    ],
    lastUpdated: "2026-08-14",
  },

  "/convert": {
    intro: "Convert PDF online free with LAK PDF's all-in-one converter. Choose from multiple conversion options including PDF to Word, PDF to PowerPoint, Word to PDF, and more. This hub page helps you find the right conversion tool. Whether you need an editable document or want to create a PDF from another format, LAK PDF has a dedicated tool. All tools are free, require no signup, and process files in your browser.",
    howToUse: [
      { step: "Choose conversion type", detail: "Select the conversion direction — PDF to Word, Word to PDF, etc." },
      { step: "Upload your file", detail: "Select or drag and drop the file to convert." },
      { step: "Convert", detail: "Click Convert. The file is processed in your browser." },
      { step: "Download", detail: "Download the converted file instantly." },
    ],
    benefits: [
      { title: "Multiple Formats", description: "Convert between PDF, Word, PowerPoint, JPG, and text.", icon: "layers" },
      { title: "Fast Conversion", description: "Files converted in seconds with no waiting.", icon: "zap" },
      { title: "Free & Unlimited", description: "All conversion tools free with no limits.", icon: "star" },
      { title: "Secure", description: "All conversions in your browser. Files never uploaded.", icon: "shield" },
    ],
    faqs: [
      { question: "What formats can I convert?", answer: "PDF to Word, PDF to PowerPoint, Word to PDF, PowerPoint to PDF, PDF to Image, and Image to PDF." },
      { question: "Is conversion quality good?", answer: "Yes, text, formatting, and images are preserved. Complex layouts may need minor adjustments." },
      { question: "Do I need an account?", answer: "No, all tools are completely free with no signup." },
    ],
    internalLinks: [
      { label: "PDF to Word", to: "/pdf-to-word" },
      { label: "Word to PDF", to: "/word-to-pdf" },
      { label: "PDF to PowerPoint", to: "/pdf-to-powerpoint" },
      { label: "PowerPoint to PDF", to: "/powerpoint-to-pdf" },
      { label: "Image to PDF", to: "/img-to-pdf" },
    ],
    lastUpdated: "2026-08-14",
  },

  "/pdf-to-powerpoint": {
    intro: "Convert PDF to PowerPoint online free and get editable PPT slides. LAK PDF helps turn PDF presentations, lecture notes, and reports into PowerPoint format. Upload your PDF, convert, and download a PPTX file ready for Microsoft PowerPoint or Google Slides. Each PDF page becomes a slide. For scanned PDFs, run OCR first to extract text before conversion.",
    howToUse: [
      { step: "Upload your PDF", detail: "Select the PDF with presentation content." },
      { step: "Convert", detail: "Click Convert. Each page becomes a PowerPoint slide." },
      { step: "Review", detail: "Check slide count and conversion status." },
      { step: "Download", detail: "Download the PPTX file." },
    ],
    benefits: [
      { title: "Page-to-Slide", description: "Each PDF page becomes a separate PowerPoint slide.", icon: "layers" },
      { title: "Editable Output", description: "Get PPTX editable in PowerPoint, Google Slides, or Keynote.", icon: "check" },
      { title: "Free & Fast", description: "Convert in seconds without signup.", icon: "zap" },
      { title: "Private", description: "Converted in your browser. No files uploaded.", icon: "shield" },
    ],
    faqs: [
      { question: "Will formatting transfer?", answer: "Text and basic layout are preserved. Complex designs may need adjustment." },
      { question: "Can I convert scanned PDFs?", answer: "Use OCR first to extract text, then convert." },
      { question: "Is this free?", answer: "Yes, completely free with no limitations." },
      { question: "What format is the output?", answer: "PPTX format, compatible with PowerPoint 2007+, Google Slides, and Keynote." },
    ],
    internalLinks: [
      { label: "PDF to Word", to: "/pdf-to-word" },
      { label: "PowerPoint to PDF", to: "/powerpoint-to-pdf" },
      { label: "OCR PDF", to: "/ocr-pdf" },
      { label: "Compress PDF", to: "/compress" },
    ],
    lastUpdated: "2026-08-14",
  },

  "/powerpoint-to-pdf": {
    intro: "Convert PowerPoint to PDF online free. Turn PPT or PPTX slides into a professional PDF document for sharing, printing, and portfolio use. Upload your PowerPoint file and download the PDF instantly. The conversion preserves slide content and is ideal for creating a non-editable, universally viewable version. No Microsoft Office installation required.",
    howToUse: [
      { step: "Upload PowerPoint", detail: "Select your PPT or PPTX file." },
      { step: "Convert", detail: "Click Convert. Each slide becomes a PDF page." },
      { step: "Preview", detail: "Review the converted PDF." },
      { step: "Download", detail: "Download your PDF instantly." },
    ],
    benefits: [
      { title: "PPT & PPTX", description: "Upload both PPT and PPTX formats.", icon: "layers" },
      { title: "Universal Viewing", description: "PDF looks the same on every device and platform.", icon: "globe" },
      { title: "Fast", description: "Convert in seconds. No queues.", icon: "zap" },
      { title: "No Office Needed", description: "Convert without PowerPoint installed.", icon: "check" },
    ],
    faqs: [
      { question: "Does it preserve animations?", answer: "PDF is static, so transitions and animations are not preserved." },
      { question: "Can I convert PPTX?", answer: "Yes, both PPT and PPTX are supported." },
      { question: "Is there a slide limit?", answer: "No fixed limit. Depends on browser memory." },
      { question: "Is this free?", answer: "Yes, completely free." },
    ],
    internalLinks: [
      { label: "PDF to PowerPoint", to: "/pdf-to-powerpoint" },
      { label: "Word to PDF", to: "/word-to-pdf" },
      { label: "Compress PDF", to: "/compress" },
      { label: "Merge PDF", to: "/merge" },
    ],
    lastUpdated: "2026-08-14",
  },

  "/rotate": {
    intro: "Rotate PDF pages online free and fix page orientation in a few clicks. LAK PDF is useful when scanned documents or downloaded PDFs have pages that are sideways or upside down. Upload your PDF, rotate individual or all pages by 90°, 180°, or 270°, and download the corrected document. Commonly needed for scanned certificates, forms, and misoriented documents. The rotation is permanent and maintains original quality.",
    howToUse: [
      { step: "Upload your PDF", detail: "Select the PDF with pages needing rotation." },
      { step: "Select pages", detail: "Click page thumbnails to select, or use Select All." },
      { step: "Choose angle", detail: "Rotate by 90° clockwise, counter-clockwise, or 180°." },
      { step: "Download", detail: "Save and download the corrected PDF." },
    ],
    benefits: [
      { title: "Individual Control", description: "Rotate specific pages without affecting others.", icon: "target" },
      { title: "Visual Preview", description: "See thumbnails before and after rotation.", icon: "eye" },
      { title: "Multiple Angles", description: "90°, 180°, or 270° rotation options.", icon: "layers" },
      { title: "Quality Preserved", description: "No compression or degradation.", icon: "shield" },
    ],
    faqs: [
      { question: "Can I rotate just one page?", answer: "Yes, select the specific page and apply rotation. Others remain unchanged." },
      { question: "Does rotating affect quality?", answer: "No, rotation is a metadata change with no content recompression." },
      { question: "Can I rotate 180 degrees?", answer: "Yes, 90° and 180° rotations are supported." },
      { question: "Is this free?", answer: "Yes, completely free." },
    ],
    internalLinks: [
      { label: "Organize PDF", to: "/organize-pdf" },
      { label: "Split PDF", to: "/split" },
      { label: "Crop PDF", to: "/crop-pdf" },
      { label: "Merge PDF", to: "/merge" },
      { label: "Delete Pages", to: "/delete-page" },
    ],
    lastUpdated: "2026-08-14",
  },

  "/page-number": {
    intro: "Add page numbers to PDF online free with custom position and format. LAK PDF helps add professional page numbering to documents, assignments, reports, and books. Choose position (top/bottom, left/center/right), starting number, and format style. Essential for academic submissions, legal documents, and multi-page PDFs that need organized references. Processing happens in your browser.",
    howToUse: [
      { step: "Upload your PDF", detail: "Select the document to add page numbers to." },
      { step: "Configure", detail: "Choose position, starting number, and format." },
      { step: "Preview", detail: "See how page numbers will appear." },
      { step: "Apply and download", detail: "Click Apply, then download the updated PDF." },
    ],
    benefits: [
      { title: "Custom Positioning", description: "Place numbers at top/bottom, left/center/right.", icon: "target" },
      { title: "Flexible Formatting", description: "Custom starting number and format options.", icon: "layers" },
      { title: "Professional Output", description: "Clean, consistent numbering for print and screen.", icon: "star" },
      { title: "Browser-Based", description: "All processing happens locally.", icon: "shield" },
    ],
    faqs: [
      { question: "Can I choose where numbers appear?", answer: "Yes, top or bottom, aligned left, center, or right." },
      { question: "Can I start from a specific number?", answer: "Yes, set a custom starting page number." },
      { question: "Will numbers overlap content?", answer: "Numbers are placed in margins. Small margins may cause overlap." },
      { question: "Is this free?", answer: "Yes, completely free." },
    ],
    internalLinks: [
      { label: "Merge PDF", to: "/merge" },
      { label: "Watermark PDF", to: "/watermark" },
      { label: "Compress PDF", to: "/compress" },
      { label: "Organize PDF", to: "/organize-pdf" },
      { label: "PDF Editor", to: "/pdf-editor" },
    ],
    lastUpdated: "2026-08-14",
  },

  "/watermark": {
    intro: "Add text watermark to PDF online free for branding, document protection, and ownership marking. LAK PDF lets you overlay custom text on every page with adjustable font size, opacity, color, and rotation. Ideal for marking drafts, confidential documents, company branding, and copyright protection. The watermark is embedded permanently for consistent display across all viewers.",
    howToUse: [
      { step: "Upload your PDF", detail: "Select the document to watermark." },
      { step: "Configure watermark", detail: "Enter text, adjust font size, opacity, color, and rotation." },
      { step: "Preview", detail: "See live preview of watermark placement." },
      { step: "Apply and download", detail: "Click Apply, then download the watermarked PDF." },
    ],
    benefits: [
      { title: "Full Customization", description: "Control text, size, opacity, color, and rotation.", icon: "target" },
      { title: "Document Protection", description: "Mark as Draft, Confidential, or add company branding.", icon: "lock" },
      { title: "All Pages", description: "Watermark applied consistently to every page.", icon: "layers" },
      { title: "Permanent", description: "Embedded in PDF, displays correctly everywhere.", icon: "shield" },
    ],
    faqs: [
      { question: "Can I adjust transparency?", answer: "Yes, set opacity from fully transparent to fully opaque." },
      { question: "Can I rotate the watermark?", answer: "Yes, set custom rotation angle. 45° is common for drafts." },
      { question: "Will it print?", answer: "Yes, the watermark is permanent and appears on print." },
      { question: "Is this free?", answer: "Yes, completely free." },
    ],
    internalLinks: [
      { label: "Sign PDF", to: "/sign-pdf" },
      { label: "PDF Editor", to: "/pdf-editor" },
      { label: "Compress PDF", to: "/compress" },
      { label: "Add Page Numbers", to: "/page-number" },
    ],
    lastUpdated: "2026-08-14",
  },

  "/crop-pdf": {
    intro: "Crop PDF pages online free and trim margins, borders, or unwanted areas. LAK PDF crop tool helps clean up page layout by removing excess whitespace, headers, footers, or unwanted content. Useful for resizing scanned documents, preparing print-ready files, and cleaning up pages before sharing. Upload, set crop area visually, and download the trimmed document.",
    howToUse: [
      { step: "Upload your PDF", detail: "Select the PDF to crop. Page previews are generated." },
      { step: "Set crop area", detail: "Drag handles or enter precise margin values." },
      { step: "Apply to pages", detail: "Apply to current page, selected pages, or all pages." },
      { step: "Download", detail: "Download the cropped PDF." },
    ],
    benefits: [
      { title: "Visual Cropping", description: "Drag handles directly on preview.", icon: "eye" },
      { title: "Batch Cropping", description: "Apply same crop to all pages.", icon: "layers" },
      { title: "Clean Output", description: "Remove whitespace and borders.", icon: "check" },
      { title: "Private", description: "All processing in your browser.", icon: "shield" },
    ],
    faqs: [
      { question: "Can I crop specific pages?", answer: "Yes, apply to current page, range, or all pages." },
      { question: "Is cropping permanent?", answer: "The crop sets a visible area. Some viewers may still show full content." },
      { question: "Can I remove margins?", answer: "Yes, use crop to trim excess margins." },
      { question: "Is this free?", answer: "Yes, completely free." },
    ],
    internalLinks: [
      { label: "Rotate PDF", to: "/rotate" },
      { label: "PDF to Image", to: "/pdf-to-img" },
      { label: "Compress PDF", to: "/compress" },
      { label: "Split PDF", to: "/split" },
      { label: "Organize PDF", to: "/organize-pdf" },
    ],
    lastUpdated: "2026-08-14",
  },

  "/scan-pdf": {
    intro: "Scan to PDF online and create clean, organized PDFs from your camera or scanned images. LAK PDF enhances image quality, adjusts contrast, and creates professional scanned PDFs. Ideal for digitizing paper documents, receipts, ID cards, and handwritten notes. Take a photo or upload a scan, apply enhancement filters, and download a clean PDF. Includes auto-enhancement for better readability.",
    howToUse: [
      { step: "Capture or upload", detail: "Use camera to scan, or upload existing images." },
      { step: "Enhance", detail: "Apply auto-enhancement, adjust brightness and contrast." },
      { step: "Arrange pages", detail: "Reorder scanned pages for the final document." },
      { step: "Create and download", detail: "Generate the enhanced PDF and download." },
    ],
    benefits: [
      { title: "Enhancement", description: "Auto-enhance for better readability.", icon: "eye" },
      { title: "Camera Scanning", description: "Use phone camera to scan directly.", icon: "smartphone" },
      { title: "Multi-Page", description: "Combine multiple pages into one PDF.", icon: "layers" },
      { title: "Professional", description: "Create clean, print-ready scanned PDFs.", icon: "star" },
    ],
    faqs: [
      { question: "Can I scan with my phone camera?", answer: "Yes, camera access is supported on mobile devices." },
      { question: "Does it enhance quality?", answer: "Yes, auto-enhancement adjusts brightness, contrast, and sharpness." },
      { question: "Can I scan multiple pages?", answer: "Yes, combine multiple pages into one PDF." },
      { question: "Is this free?", answer: "Yes, completely free." },
    ],
    internalLinks: [
      { label: "OCR PDF", to: "/ocr-pdf" },
      { label: "Image to PDF", to: "/img-to-pdf" },
      { label: "Compress PDF", to: "/compress" },
      { label: "Merge PDF", to: "/merge" },
    ],
    lastUpdated: "2026-08-14",
  },

  "/compare-pdf": {
    intro: "Compare PDF files online free and detect page-level differences between two documents. LAK PDF comparison tool identifies changes, additions, and deletions between versions. Useful for reviewing contract revisions, checking updates, and verifying print-ready files. Upload two PDFs side by side, and visual highlights show differences on each page.",
    howToUse: [
      { step: "Upload two PDFs", detail: "Select the original and revised PDF." },
      { step: "Compare", detail: "Click Compare. The tool analyzes page by page." },
      { step: "Review", detail: "Highlighted differences show where content changed." },
      { step: "Navigate", detail: "Browse pages to review all changes." },
    ],
    benefits: [
      { title: "Visual Comparison", description: "Highlighted differences for easy identification.", icon: "eye" },
      { title: "Page-by-Page", description: "Compare documents page by page.", icon: "layers" },
      { title: "Fast", description: "Analyze differences in seconds.", icon: "zap" },
      { title: "Free & Private", description: "No signup. Files processed in browser.", icon: "shield" },
    ],
    faqs: [
      { question: "Can I compare two versions?", answer: "Yes, upload original and revised. The tool highlights visual differences." },
      { question: "Does it show text differences?", answer: "It shows visual page-level differences. For text diff, use PDF to Text first." },
      { question: "Different page counts?", answer: "The tool compares matching pages. Extra pages are flagged." },
      { question: "Is this free?", answer: "Yes, completely free." },
    ],
    internalLinks: [
      { label: "Merge PDF", to: "/merge" },
      { label: "PDF to Word", to: "/pdf-to-word" },
      { label: "PDF to Text", to: "/pdf-to-text" },
      { label: "Compress PDF", to: "/compress" },
    ],
    lastUpdated: "2026-08-14",
  },

  "/delete-page": {
    intro: "Delete pages from PDF online free and save a cleaned document instantly. LAK PDF shows visual thumbnails of every page so you can select exactly which pages to remove. Useful for removing blank pages, cover pages, or unwanted sections before sharing or printing. Upload, preview, select pages to delete, and download the cleaned version. Remaining pages maintain original quality.",
    howToUse: [
      { step: "Upload your PDF", detail: "Select the PDF. All page thumbnails are displayed." },
      { step: "Select pages", detail: "Click thumbnails of pages to remove." },
      { step: "Delete", detail: "Click Delete. Selected pages are removed." },
      { step: "Download", detail: "Download the cleaned PDF." },
    ],
    benefits: [
      { title: "Visual Selection", description: "See thumbnails to accurately select pages.", icon: "eye" },
      { title: "Multi-Page Delete", description: "Select and remove multiple pages at once.", icon: "layers" },
      { title: "Quality Preserved", description: "Remaining pages retain original quality.", icon: "check" },
      { title: "Browser-Based", description: "All processing happens locally.", icon: "shield" },
    ],
    faqs: [
      { question: "Can I delete multiple pages?", answer: "Yes, select as many as needed and delete in one click." },
      { question: "Does it affect remaining pages?", answer: "No, remaining pages keep original quality intact." },
      { question: "Can I undo deletion?", answer: "Keep your original file as backup. Downloaded PDF has pages permanently removed." },
      { question: "Is this free?", answer: "Yes, completely free." },
    ],
    internalLinks: [
      { label: "Split PDF", to: "/split" },
      { label: "Merge PDF", to: "/merge" },
      { label: "Organize PDF", to: "/organize-pdf" },
      { label: "Rotate PDF", to: "/rotate" },
      { label: "Compress PDF", to: "/compress" },
    ],
    lastUpdated: "2026-08-14",
  },

  "/summarizer-qa": {
    intro: "Summarize PDF with AI and ask questions from your document instantly. LAK PDF AI Summarizer reads your PDF content and generates a concise summary with key points. Ask follow-up questions to extract specific information. Perfect for long research papers, reports, legal documents, and textbooks. Instead of reading 50 pages, get the main points in seconds and then drill down into specific topics.",
    howToUse: [
      { step: "Upload your PDF", detail: "Select a PDF to summarize. Text is extracted from all pages." },
      { step: "Get AI summary", detail: "AI generates a concise summary with key points." },
      { step: "Ask questions", detail: "Type natural language questions to get specific answers." },
      { step: "Export or copy", detail: "Copy summary and answers for your notes." },
    ],
    benefits: [
      { title: "AI-Powered", description: "Intelligent, concise summaries in seconds.", icon: "zap" },
      { title: "Q&A Feature", description: "Ask follow-up questions, get document-based answers.", icon: "check" },
      { title: "Time Saver", description: "Skip reading 50+ pages. Get key points instantly.", icon: "clock" },
      { title: "Multiple Docs", description: "Works with research papers, reports, textbooks, and more.", icon: "layers" },
    ],
    faqs: [
      { question: "How accurate are summaries?", answer: "AI captures main points well. For critical decisions, verify against original text." },
      { question: "Can I ask questions?", answer: "Yes, ask follow-up questions and get answers from the document content." },
      { question: "Does it work with scanned PDFs?", answer: "Works best with text-based PDFs. Run OCR first for scanned documents." },
      { question: "Is this free?", answer: "Yes, available for free on LAK PDF." },
    ],
    internalLinks: [
      { label: "AI PDF to MCQ", to: "/ai-pdf-to-mcq" },
      { label: "OCR PDF", to: "/ocr-pdf" },
      { label: "PDF to Text", to: "/pdf-to-text" },
      { label: "PDF to Word", to: "/pdf-to-word" },
      { label: "AI Interview Generator", to: "/ai-interview-generator" },
    ],
    lastUpdated: "2026-08-14",
  },

  "/ai-pdf-to-mcq": {
    intro: "Generate MCQs from PDF with AI for tests, revision, and exam practice. LAK PDF AI MCQ Generator reads your PDF and creates multiple-choice questions with correct answers and explanations. Designed for students preparing for exams, teachers creating question papers, and trainers building assessments. Upload study material and get ready-to-use MCQs in seconds.",
    howToUse: [
      { step: "Upload your PDF", detail: "Select study material, notes, or textbook PDF." },
      { step: "Configure", detail: "Choose number of questions and difficulty level." },
      { step: "Generate MCQs", detail: "AI analyzes content and generates questions." },
      { step: "Review and export", detail: "Review questions with answers, then copy or export." },
    ],
    benefits: [
      { title: "AI-Generated", description: "Intelligent, contextually relevant MCQs.", icon: "zap" },
      { title: "Answers & Explanations", description: "Each question includes correct answer and explanation.", icon: "check" },
      { title: "Difficulty Levels", description: "Set from easy to hard for targeted prep.", icon: "target" },
      { title: "Instant Results", description: "Generate dozens of questions in seconds.", icon: "clock" },
    ],
    faqs: [
      { question: "How many MCQs can I generate?", answer: "Multiple sets depending on content length. Longer documents yield more questions." },
      { question: "Are questions accurate?", answer: "AI generates based on your content. Review before formal assessments." },
      { question: "Can I choose difficulty?", answer: "Yes, set from easy to hard." },
      { question: "Does it work with handwritten notes?", answer: "Run OCR first for handwritten PDFs." },
      { question: "Is this free?", answer: "Yes, available for free on LAK PDF." },
    ],
    internalLinks: [
      { label: "AI Summarizer", to: "/summarizer-qa" },
      { label: "AI Interview Generator", to: "/ai-interview-generator" },
      { label: "OCR PDF", to: "/ocr-pdf" },
      { label: "PDF to Text", to: "/pdf-to-text" },
    ],
    lastUpdated: "2026-08-14",
  },

  "/ai-interview-generator": {
    intro: "Generate interview questions from your resume or PDF with AI. LAK PDF Interview Generator analyzes your resume, job description, or study material and creates technical, HR, and behavioral interview questions tailored to your profile. Perfect for job seekers, recruiters, and trainers. Upload your resume PDF, select question types, and get comprehensive practice questions with suggested answers.",
    howToUse: [
      { step: "Upload resume/PDF", detail: "Select your resume, job description, or relevant document." },
      { step: "Select question types", detail: "Choose Technical, HR, Behavioral, or mixed." },
      { step: "Generate", detail: "AI analyzes the document and generates tailored questions." },
      { step: "Review and practice", detail: "Review questions with suggested answers." },
    ],
    benefits: [
      { title: "Resume-Based", description: "Questions tailored to your experience and skills.", icon: "target" },
      { title: "Multiple Categories", description: "Technical, HR, Behavioral, and situational questions.", icon: "layers" },
      { title: "Suggested Answers", description: "Each question includes answer framework.", icon: "check" },
      { title: "Free to Use", description: "Unlimited questions for free, no signup.", icon: "star" },
    ],
    faqs: [
      { question: "Can I generate from my resume?", answer: "Yes, upload your resume and get questions based on your experience, skills, and projects." },
      { question: "What question types?", answer: "Technical, HR, Behavioral, and situational questions." },
      { question: "Are answers provided?", answer: "Yes, each question includes a suggested answer framework." },
      { question: "Can I use for different roles?", answer: "Yes, upload different resumes/JDs for role-specific questions." },
      { question: "Is this free?", answer: "Yes, completely free." },
    ],
    internalLinks: [
      { label: "AI Summarizer", to: "/summarizer-qa" },
      { label: "AI PDF to MCQ", to: "/ai-pdf-to-mcq" },
      { label: "PDF to Word", to: "/pdf-to-word" },
      { label: "Compress PDF", to: "/compress" },
    ],
    lastUpdated: "2026-08-14",
  },

  "/detect-duplicates": {
    intro: "Detect duplicate pages in PDF online and clean up repetitive content quickly. LAK PDF scans your document to find identical or very similar pages, helping remove redundant content before printing or sharing. Useful for merged documents with accidental repeats, scanned files with duplicate feeds, and reports with copy-pasted sections. Upload, analyze, and review results with visual comparison.",
    howToUse: [
      { step: "Upload your PDF", detail: "Select the PDF to check for duplicates." },
      { step: "Analyze", detail: "Click Detect. The tool compares all pages." },
      { step: "Review results", detail: "See duplicates with visual comparison and similarity scores." },
      { step: "Remove and download", detail: "Select duplicates to remove, download cleaned PDF." },
    ],
    benefits: [
      { title: "Smart Detection", description: "Identifies identical and near-identical pages.", icon: "eye" },
      { title: "Visual Comparison", description: "See duplicates side by side to confirm.", icon: "layers" },
      { title: "One-Click Cleanup", description: "Remove all duplicates and download clean document.", icon: "zap" },
      { title: "Secure", description: "All analysis in your browser.", icon: "shield" },
    ],
    faqs: [
      { question: "How does detection work?", answer: "Pages are rendered as images and compared visually. Similar pages above a threshold are flagged." },
      { question: "Can it detect near-identical pages?", answer: "Yes, visual comparison catches very similar pages too." },
      { question: "Can I choose which to keep?", answer: "Yes, review detected duplicates and select which to remove." },
      { question: "Is this free?", answer: "Yes, completely free." },
    ],
    internalLinks: [
      { label: "Delete Pages", to: "/delete-page" },
      { label: "Merge PDF", to: "/merge" },
      { label: "Organize PDF", to: "/organize-pdf" },
      { label: "Compress PDF", to: "/compress" },
    ],
    lastUpdated: "2026-08-14",
  },

  "/organize-pdf": {
    intro: "Organize PDF pages online and reorder them with simple drag-and-drop. LAK PDF organizer shows visual thumbnails so you can rearrange pages in any order. Perfect for fixing page sequence after scanning, rearranging slides, and organizing multi-section documents. Insert blank pages, move pages, and delete unwanted ones — all in one intuitive interface.",
    howToUse: [
      { step: "Upload your PDF", detail: "Select the PDF. All pages appear as draggable thumbnails." },
      { step: "Drag and reorder", detail: "Click and drag thumbnails to rearrange." },
      { step: "Insert or remove", detail: "Add blank pages or delete unwanted ones." },
      { step: "Save and download", detail: "Apply new order and download." },
    ],
    benefits: [
      { title: "Drag-and-Drop", description: "Intuitive interface for effortless reordering.", icon: "zap" },
      { title: "Visual Thumbnails", description: "See every page for accurate reordering.", icon: "eye" },
      { title: "Insert & Delete", description: "Add blank pages or remove unwanted ones.", icon: "layers" },
      { title: "Quality Preserved", description: "Content unchanged after reorganization.", icon: "shield" },
    ],
    faqs: [
      { question: "Can I move pages anywhere?", answer: "Yes, drag any thumbnail to any position." },
      { question: "Can I add blank pages?", answer: "Yes, insert blank pages at any position." },
      { question: "Does reordering affect quality?", answer: "No, pages are rearranged without recompression." },
      { question: "Is this free?", answer: "Yes, completely free." },
    ],
    internalLinks: [
      { label: "Merge PDF", to: "/merge" },
      { label: "Split PDF", to: "/split" },
      { label: "Delete Pages", to: "/delete-page" },
      { label: "Rotate PDF", to: "/rotate" },
      { label: "Add Page Numbers", to: "/page-number" },
    ],
    lastUpdated: "2026-08-14",
  },

  "/ai-edit-pdf": {
    intro: "Edit PDF online with AI assistance. LAK PDF AI Edit lets you click on any text in your PDF and edit it directly — whether it's a scanned document or a regular PDF. The AI automatically detects text regions using OCR and lets you modify, rewrite, or correct any content. Add highlights, underline sections, and export a clean, edited PDF instantly. No software installation, no account required. Perfect for editing contracts, certificates, reports, and any document where you need to change specific text.",
    howToUse: [
      { step: "Upload your PDF", detail: "Select a PDF to edit. Both text-based and scanned PDFs are supported." },
      { step: "Click to edit text", detail: "Click on any text region. AI detects and loads text for editing." },
      { step: "Make your edits", detail: "Type your changes. Add highlights, underlines, or annotations." },
      { step: "Export PDF", detail: "Download the edited PDF with all changes applied." },
    ],
    benefits: [
      { title: "Click-to-Edit", description: "Click any text region to edit directly — no complex tools needed.", icon: "zap" },
      { title: "OCR-Powered", description: "Automatically reads scanned PDFs and makes text editable.", icon: "eye" },
      { title: "Annotations", description: "Add highlights, underlines, and text annotations.", icon: "layers" },
      { title: "100% Browser-Based", description: "No upload to servers. Your document stays private.", icon: "shield" },
    ],
    faqs: [
      { question: "Can I edit scanned PDFs?", answer: "Yes, OCR automatically detects text in scanned documents and makes it editable." },
      { question: "Does editing change the original?", answer: "You download a new edited copy. The original file on your device is unchanged." },
      { question: "Can I add text to a PDF?", answer: "Yes, click any empty area or use the text tool to add new text." },
      { question: "Can I highlight and annotate?", answer: "Yes, select text to highlight or underline, and add sticky note annotations." },
      { question: "Is this free?", answer: "Yes, completely free with no limits or watermarks." },
    ],
    internalLinks: [
      { label: "PDF Editor", to: "/pdf-editor" },
      { label: "OCR PDF", to: "/ocr-pdf" },
      { label: "Sign PDF", to: "/sign-pdf" },
      { label: "Watermark PDF", to: "/watermark" },
    ],
    lastUpdated: "2026-08-14",
  },

  "/pdf-to-text": {
    intro: "Extract text from PDF online free and convert PDF content to plain text. LAK PDF text extractor reads text-based and scanned PDFs and outputs clean, copyable text. Useful for extracting data from reports, copying quotes, and creating text versions. For scanned documents, OCR is included. Upload, extract, and copy or download results instantly. No signup or software needed.",
    howToUse: [
      { step: "Upload your PDF", detail: "Select the PDF to extract text from." },
      { step: "Extract", detail: "Click Extract. Text PDFs are read directly; scanned PDFs use OCR." },
      { step: "Review", detail: "See extracted text in the output area." },
      { step: "Copy or download", detail: "Copy to clipboard or download as text file." },
    ],
    benefits: [
      { title: "Fast Extraction", description: "Extract text from PDF pages in seconds.", icon: "zap" },
      { title: "OCR Support", description: "Built-in OCR for scanned and image-based PDFs.", icon: "eye" },
      { title: "Clean Output", description: "Well-formatted plain text ready for use.", icon: "check" },
      { title: "Free & Private", description: "No signup. All processing in browser.", icon: "shield" },
    ],
    faqs: [
      { question: "Can I extract from scanned PDFs?", answer: "Yes, OCR recognizes and extracts text from scanned pages." },
      { question: "Is formatting preserved?", answer: "Plain text preserves content but not visual formatting. For formatted output, use PDF to Word." },
      { question: "Can I extract specific pages?", answer: "All pages are extracted. Copy the sections you need." },
      { question: "Is this free?", answer: "Yes, completely free." },
    ],
    internalLinks: [
      { label: "PDF to Word", to: "/pdf-to-word" },
      { label: "OCR PDF", to: "/ocr-pdf" },
      { label: "AI Summarizer", to: "/summarizer-qa" },
      { label: "Compress PDF", to: "/compress" },
    ],
    lastUpdated: "2026-08-14",
  },
};

export default toolSEOData;
