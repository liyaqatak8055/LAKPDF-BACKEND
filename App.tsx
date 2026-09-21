import React, { useEffect, Suspense, lazy, useRef, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import { Layout } from "./components/Layout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AdSenseRouteHandler } from "./components/AdSenseHandler";
import { safeImport } from "./utils/safeImport";
import { initPerformanceMonitoring } from "./utils/performance";
import { trackDropOffStepForPath, trackPageView } from "./utils/analytics";
import { isToolRoute, recordToolOpen } from "./utils/toolUsage";

import Home from "./pages/Home";

type RouteSeo = {
  title: string;
  description: string;
  canonicalPath: string;
};

const SITE_URL = "https://lakpdf.com";

const ROUTE_SEO: Record<string, RouteSeo> = {
  "/merge": {
    title: "Merge PDF Online Free | Combine PDF Files - LAK PDF",
    description: "Merge PDF files online for free. Combine multiple PDFs in seconds without installing software.",
    canonicalPath: "/merge",
  },
  "/split": {
    title: "Split PDF Online Free | Extract Pages - LAK PDF",
    description: "Split PDF online for free. Extract pages or separate PDF files in one click.",
    canonicalPath: "/split",
  },
  "/compress": {
    title: "Compress PDF Online Free | Reduce PDF Size - LAK PDF",
    description: "Compress PDF online free and reduce file size quickly while keeping quality.",
    canonicalPath: "/compress",
  },
  "/compress-pdf": {
    title: "Compress PDF Online Free | Reduce PDF Size - LAK PDF",
    description: "Compress PDF online free and reduce file size instantly. Choose compression level or set a target size (100KB, 200KB, 500KB). No upload, browser-based.",
    canonicalPath: "/compress-pdf",
  },
  "/compress-pdf-to-100kb": {
    title: "Compress PDF to 100KB Online Free | Government Forms - LAK PDF",
    description: "Compress PDF to 100KB online free. Perfect for government portals, visa applications, UPSC and exam registrations that enforce a 100KB upload limit.",
    canonicalPath: "/compress-pdf-to-100kb",
  },
  "/compress-pdf-to-200kb": {
    title: "Compress PDF to 200KB Online Free | Job Applications & Portals - LAK PDF",
    description: "Compress PDF to 200KB online free. Perfect for job applications, HR portals, university admissions and scholarship forms requiring PDFs under 200KB.",
    canonicalPath: "/compress-pdf-to-200kb",
  },
  "/compress-pdf-to-500kb": {
    title: "Compress PDF to 500KB Online Free | Email & Reports - LAK PDF",
    description: "Compress PDF to 500KB online free. Ideal for email attachments, client reports, portfolios and CRM uploads. High quality output. No signup required.",
    canonicalPath: "/compress-pdf-to-500kb",
  },
  "/organize-pdf": {
    title: "Organize PDF Pages Online | Reorder PDF - LAK PDF",
    description: "Organize PDF pages online. Reorder, move and manage pages with a simple drag-and-drop workflow.",
    canonicalPath: "/organize-pdf",
  },
  "/img-to-pdf": {
    title: "JPG to PDF Online Free | Image to PDF Converter - LAK PDF",
    description: "Convert JPG, PNG and images to PDF online for free in seconds.",
    canonicalPath: "/img-to-pdf",
  },
  "/pdf-to-img": {
    title: "PDF to JPG Online Free | Convert PDF to Images - LAK PDF",
    description: "Convert PDF to JPG images online for free. Export pages as high-quality images.",
    canonicalPath: "/pdf-to-img",
  },
  "/compress-img": {
    title: "Compress Image Online Free | Reduce Image Size - LAK PDF",
    description: "Compress image online free and reduce JPG/PNG size quickly.",
    canonicalPath: "/compress-img",
  },
  "/advance-compress-img": {
    title: "Compress Image to 50KB Online Free - LAK PDF",
    description: "Compress image to 50KB online free for forms, exams and uploads.",
    canonicalPath: "/advance-compress-img",
  },
  "/make-ppt": {
    title: "Make PPT Online Free | Images to PowerPoint Converter - LAK PDF",
    description: "Convert JPG, PNG, WEBP and photos to PowerPoint (.pptx) online free. Smart aspect ratio prevents stretching. Custom 16:9 widescreen or 4:3 layouts. 100% private.",
    canonicalPath: "/make-ppt",
  },
  "/img-to-ppt": {
    title: "Image to PowerPoint Converter Free | JPG to PPT - LAK PDF",
    description: "Turn photos and images into beautifully formatted PowerPoint presentations (.pptx). Zero distortion, drag-and-drop organizer, and instant PPTX download.",
    canonicalPath: "/make-ppt",
  },
  "/passport-photo-maker": {
    title: "Passport Size Photo Maker Online Free | 3.5x4.5 cm Photo Resizer - LAK PDF",
    description: "Create official passport photos online free. Auto-align face, change background, resize to 3.5x4.5 cm, 2x2 inch, or PAN card size. Generate printable 4x6 & A4 sheets.",
    canonicalPath: "/passport-photo-maker",
  },
  "/passport-photo": {
    title: "Passport Photo Maker Free | 3.5x4.5 cm Photo Resizer - LAK PDF",
    description: "Free online passport size photo maker with biometric face guides, 4x6 & A4 print sheets, and 20-50KB government form compression.",
    canonicalPath: "/passport-photo-maker",
  },
  "/redact-pdf": {
    title: "Redact PDF Online Free | Permanently Blackout Sensitive Info - LAK PDF",
    description: "Permanently redact and blackout sensitive information from PDF online for free. Hide Aadhaar, bank details, phone numbers, and signatures with true pixel sanitization. 100% private.",
    canonicalPath: "/redact-pdf",
  },
  "/blackout-pdf": {
    title: "Blackout PDF Online Free | Permanently Hide Sensitive Data - LAK PDF",
    description: "Blackout and erase confidential text and numbers from PDF files with true permanent sanitization. No data recovery possible.",
    canonicalPath: "/redact-pdf",
  },
  "/convert": {
    title: "Convert PDF Online Free | PDF Converter - LAK PDF",
    description: "Convert PDF online free with a fast PDF converter workflow.",
    canonicalPath: "/convert",
  },
  "/pdf-to-word": {
    title: "PDF to Word Online Free | Convert PDF to DOCX - LAK PDF",
    description: "Convert PDF to Word online for free and download editable DOCX files.",
    canonicalPath: "/pdf-to-word",
  },
  "/pdf-to-powerpoint": {
    title: "PDF to PowerPoint Online Free | PDF to PPT - LAK PDF",
    description: "Convert PDF to PowerPoint online for free and get editable PPT files.",
    canonicalPath: "/pdf-to-powerpoint",
  },
  "/word-to-pdf": {
    title: "Word to PDF Online Free | DOCX to PDF - LAK PDF",
    description: "Convert Word to PDF online free. Upload DOC/DOCX and download PDF instantly.",
    canonicalPath: "/word-to-pdf",
  },
  "/powerpoint-to-pdf": {
    title: "PowerPoint to PDF Online Free | PPT to PDF - LAK PDF",
    description: "Convert PowerPoint to PDF online free. Turn PPT/PPTX slides into PDF quickly.",
    canonicalPath: "/powerpoint-to-pdf",
  },
  "/rotate": {
    title: "Rotate PDF Pages Online Free - LAK PDF",
    description: "Rotate PDF pages online free. Fix page orientation in a few clicks.",
    canonicalPath: "/rotate",
  },
  "/page-number": {
    title: "Add Page Numbers to PDF Online Free - LAK PDF",
    description: "Add page numbers to PDF online for free with custom position and format.",
    canonicalPath: "/page-number",
  },
  "/watermark": {
    title: "Watermark PDF Online Free | Add Text Watermark - LAK PDF",
    description: "Add text watermark to PDF online free for branding and document protection.",
    canonicalPath: "/watermark",
  },
  "/crop-pdf": {
    title: "Crop PDF Online Free | Trim PDF Pages - LAK PDF",
    description: "Crop PDF pages online for free. Trim margins and clean up document layout.",
    canonicalPath: "/crop-pdf",
  },
  "/scan-pdf": {
    title: "Scan Document Online | CamScanner-Grade Scanner - LAK PDF",
    description: "Scan documents online free with camera or photos. Automatic contrast enhancement and high visual fidelity.",
    canonicalPath: "/scan-pdf",
  },
  "/sign-pdf": {
    title: "Sign PDF Online Free | Add Signature - LAK PDF",
    description: "Sign PDF online for free. Add your digital signature and download instantly.",
    canonicalPath: "/sign-pdf",
  },
  "/ocr-pdf": {
    title: "OCR PDF Online Free | Extract Text from PDF - LAK PDF",
    description: "OCR PDF online free and extract searchable text from scanned PDF files.",
    canonicalPath: "/ocr-pdf",
  },
  "/compare-pdf": {
    title: "Compare PDF Online Free | Find PDF Differences - LAK PDF",
    description: "Compare PDF files online for free and detect page-level differences quickly.",
    canonicalPath: "/compare-pdf",
  },
  "/delete-page": {
    title: "Delete PDF Pages Online Free - LAK PDF",
    description: "Delete pages from PDF online for free and save a cleaned PDF instantly.",
    canonicalPath: "/delete-page",
  },
  "/summarizer-qa": {
    title: "AI Summary Online Free - LAK PDF",
    description: "Summarize PDF and documents with AI instantly with clean main topic formatting.",
    canonicalPath: "/summarizer-qa",
  },
  "/ai-pdf-to-mcq": {
    title: "AI PDF to MCQ Generator Online - LAK PDF",
    description: "Generate MCQs from PDF with AI for tests, revision and practice.",
    canonicalPath: "/ai-pdf-to-mcq",
  },
  "/ai-interview-generator": {
    title: "AI Interview Question Generator from Resume - LAK PDF",
    description: "Generate technical, HR and behavioral interview questions from your resume with AI.",
    canonicalPath: "/ai-interview-generator",
  },
  "/pdf-editor": {
    title: "Edit PDF Online Free | PDF Editor - LAK PDF",
    description: "Edit PDF online for free. Add text, draw, annotate and update pages quickly.",
    canonicalPath: "/pdf-editor",
  },
  "/detect-duplicates": {
    title: "Detect Duplicate PDF Pages Online - LAK PDF",
    description: "Detect duplicate pages in PDF online and clean repetitive pages fast.",
    canonicalPath: "/detect-duplicates",
  },
  "/protect-pdf": {
    title: "Protect PDF Online Free | Password Protect PDF - LAK PDF",
    description: "Password protect PDF online free. Add encryption to prevent unauthorized access to your PDF documents.",
    canonicalPath: "/protect-pdf",
  },
  "/unlock-pdf": {
    title: "Unlock PDF Online Free | Remove Password from PDF - LAK PDF",
    description: "Unlock password-protected PDF files online for free. Remove security restrictions, owner passwords, and permissions instantly. 100% private.",
    canonicalPath: "/unlock-pdf",
  },
  "/unlock": {
    title: "Unlock PDF Online Free | Remove Password from PDF - LAK PDF",
    description: "Unlock password-protected PDF files online for free. Remove security restrictions, owner passwords, and permissions instantly.",
    canonicalPath: "/unlock-pdf",
  },
  "/pdf-to-text": {
    title: "PDF to Text Online Free | OCR Text Extractor - LAK PDF",
    description: "Convert PDF to text online free. Extract searchable text and perform OCR on scanned PDFs.",
    canonicalPath: "/pdf-to-text",
  },
  "/ai-edit-pdf": {
    title: "AI PDF Editor Online Free | Edit, Erase & Annotate - LAK PDF",
    description: "Edit PDF documents online with AI-assisted text editing, erase, highlight and OCR tools. Free and browser-based.",
    canonicalPath: "/ai-edit-pdf",
  },
};

const upsertMeta = (name: string, content: string) => {
  let tag = document.head.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", name);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
};

const upsertProperty = (property: string, content: string) => {
  let tag = document.head.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("property", property);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
};

const upsertCanonical = (href: string) => {
  let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
};

const upsertJsonLd = (id: string, data: object) => {
  let script = document.head.querySelector(`script[data-jsonld="${id}"]`) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-jsonld", id);
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
};

// Per-tool JSON-LD structured data
const TOOL_JSON_LD: Record<string, object> = {
  "/merge": { "@context": "https://schema.org", "@type": "WebApplication", "name": "Merge PDF Online Free", "url": "https://lakpdf.com/merge", "applicationCategory": "UtilitiesApplication", "operatingSystem": "Web", "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }, "description": "Merge multiple PDF files into one document online for free. No signup required." },
  "/compress": { "@context": "https://schema.org", "@type": "WebApplication", "name": "Compress PDF Online Free", "url": "https://lakpdf.com/compress", "applicationCategory": "UtilitiesApplication", "operatingSystem": "Web", "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }, "description": "Compress PDF files online for free and reduce PDF size while keeping quality." },
  "/compress-pdf": { "@context": "https://schema.org", "@type": "WebApplication", "name": "Compress PDF Online Free", "url": "https://lakpdf.com/compress-pdf", "applicationCategory": "UtilitiesApplication", "operatingSystem": "Web", "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }, "description": "Compress PDF online free with level or target-size modes. Reduce PDF file size for email, portals and sharing." },
  "/compress-pdf-to-100kb": { "@context": "https://schema.org", "@type": "WebApplication", "name": "Compress PDF to 100KB Free", "url": "https://lakpdf.com/compress-pdf-to-100kb", "applicationCategory": "UtilitiesApplication", "operatingSystem": "Web", "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }, "description": "Compress PDF to 100KB online free. Ideal for government portals, visa applications and exam registrations." },
  "/compress-pdf-to-200kb": { "@context": "https://schema.org", "@type": "WebApplication", "name": "Compress PDF to 200KB Free", "url": "https://lakpdf.com/compress-pdf-to-200kb", "applicationCategory": "UtilitiesApplication", "operatingSystem": "Web", "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }, "description": "Compress PDF to 200KB online free. Perfect for job applications, HR portals and college admissions." },
  "/compress-pdf-to-500kb": { "@context": "https://schema.org", "@type": "WebApplication", "name": "Compress PDF to 500KB Free", "url": "https://lakpdf.com/compress-pdf-to-500kb", "applicationCategory": "UtilitiesApplication", "operatingSystem": "Web", "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }, "description": "Compress PDF to 500KB online free. Ideal for email attachments, client reports and design portfolios." },
  "/pdf-to-word": { "@context": "https://schema.org", "@type": "WebApplication", "name": "PDF to Word Converter Free", "url": "https://lakpdf.com/pdf-to-word", "applicationCategory": "UtilitiesApplication", "operatingSystem": "Web", "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }, "description": "Convert PDF to Word (DOCX) online for free. Download editable Word document instantly." },
  "/word-to-pdf": { "@context": "https://schema.org", "@type": "WebApplication", "name": "Word to PDF Converter Free", "url": "https://lakpdf.com/word-to-pdf", "applicationCategory": "UtilitiesApplication", "operatingSystem": "Web", "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }, "description": "Convert Word DOCX to PDF online for free. Fast and secure conversion." },
  "/split": { "@context": "https://schema.org", "@type": "WebApplication", "name": "Split PDF Online Free", "url": "https://lakpdf.com/split", "applicationCategory": "UtilitiesApplication", "operatingSystem": "Web", "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }, "description": "Split PDF files online for free. Extract pages from PDF quickly." },
  "/img-to-pdf": { "@context": "https://schema.org", "@type": "WebApplication", "name": "Image to PDF Converter Free", "url": "https://lakpdf.com/img-to-pdf", "applicationCategory": "UtilitiesApplication", "operatingSystem": "Web", "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }, "description": "Convert JPG, PNG and images to PDF online for free in seconds." },
  "/pdf-to-img": { "@context": "https://schema.org", "@type": "WebApplication", "name": "PDF to JPG Converter Free", "url": "https://lakpdf.com/pdf-to-img", "applicationCategory": "UtilitiesApplication", "operatingSystem": "Web", "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }, "description": "Convert PDF to JPG images online for free. Export PDF pages as high quality images." },
  "/compress-img": { "@context": "https://schema.org", "@type": "WebApplication", "name": "Compress Image Online Free", "url": "https://lakpdf.com/compress-img", "applicationCategory": "UtilitiesApplication", "operatingSystem": "Web", "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }, "description": "Compress image online free and reduce JPG/PNG file size without losing quality." },
  "/advance-compress-img": { "@context": "https://schema.org", "@type": "WebApplication", "name": "Compress Image to 50KB Free", "url": "https://lakpdf.com/advance-compress-img", "applicationCategory": "UtilitiesApplication", "operatingSystem": "Web", "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }, "description": "Compress image to 50KB online free for forms, exams and government portals." },
  "/make-ppt": { "@context": "https://schema.org", "@type": "WebApplication", "name": "Make PPT - Images to PowerPoint Converter", "url": "https://lakpdf.com/make-ppt", "applicationCategory": "UtilitiesApplication", "operatingSystem": "All (Web Browser)", "browserRequirements": "Requires JavaScript. Requires HTML5.", "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }, "description": "Convert images and photos into professional PowerPoint presentations online for free with smart aspect ratio auto-fit.", "featureList": "Zero distortion auto-fit, 16:9 and 4:3 slide ratios, multi-image layouts, reordering and rotation, instant PPTX download" },
  "/img-to-ppt": { "@context": "https://schema.org", "@type": "WebApplication", "name": "Image to PowerPoint Converter Free", "url": "https://lakpdf.com/img-to-ppt", "applicationCategory": "UtilitiesApplication", "operatingSystem": "All (Web Browser)", "browserRequirements": "Requires JavaScript. Requires HTML5.", "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }, "description": "Turn photos into clean PowerPoint slides online without stretching or quality loss.", "featureList": "Smart aspect ratio fit, 16:9 & 4:3 screen support, 100% browser-based privacy" },
  "/passport-photo-maker": { "@context": "https://schema.org", "@type": "WebApplication", "name": "Passport Size Photo Maker", "url": "https://lakpdf.com/passport-photo-maker", "applicationCategory": "MultimediaApplication", "operatingSystem": "All (Web Browser)", "browserRequirements": "Requires JavaScript. Requires HTML5 Canvas.", "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }, "description": "Create compliant passport photos online free with biometric face alignment, 4x6 and A4 printable sheets, and 20-50KB govt form compression.", "featureList": "Biometric face guide, 3.5x4.5cm, 2x2 inch, PAN card, 4x6 & A4 print sheets, PDF export, 20-50KB optimizer" },
  "/passport-photo": { "@context": "https://schema.org", "@type": "WebApplication", "name": "Passport Photo Maker Free", "url": "https://lakpdf.com/passport-photo-maker", "applicationCategory": "MultimediaApplication", "operatingSystem": "All (Web Browser)", "browserRequirements": "Requires JavaScript. Requires HTML5 Canvas.", "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }, "description": "Free passport size photo maker with printable 4x6 sheet generator.", "featureList": "Biometric face guide, 300 DPI high resolution, 100% private" },
  "/redact-pdf": { "@context": "https://schema.org", "@type": "WebApplication", "name": "Redact PDF - Permanently Blackout Sensitive Info", "url": "https://lakpdf.com/redact-pdf", "applicationCategory": "SecurityApplication", "operatingSystem": "All (Web Browser)", "browserRequirements": "Requires JavaScript. Requires HTML5 Canvas.", "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }, "description": "Permanently redact and blackout confidential information from PDFs online with true pixel sanitization.", "featureList": "True pixel sanitization, interactive blackout and whiteout boxes, keyword search auto-redact, metadata scrub, 100% client-side" },
  "/blackout-pdf": { "@context": "https://schema.org", "@type": "WebApplication", "name": "Blackout PDF Online", "url": "https://lakpdf.com/redact-pdf", "applicationCategory": "SecurityApplication", "operatingSystem": "All (Web Browser)", "browserRequirements": "Requires JavaScript. Requires HTML5 Canvas.", "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }, "description": "Permanently black out text in PDF documents online free.", "featureList": "True pixel redaction, 100% private" },
  "/sign-pdf": { "@context": "https://schema.org", "@type": "WebApplication", "name": "Sign PDF Online Free", "url": "https://lakpdf.com/sign-pdf", "applicationCategory": "UtilitiesApplication", "operatingSystem": "Web", "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }, "description": "Sign PDF online for free. Add digital signature to PDF and download instantly." },
  "/pdf-editor": { "@context": "https://schema.org", "@type": "WebApplication", "name": "PDF Editor Online Free", "url": "https://lakpdf.com/pdf-editor", "applicationCategory": "UtilitiesApplication", "operatingSystem": "Web", "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }, "description": "Edit PDF online for free. Add text, draw, annotate and update PDF files instantly." },
  "/ocr-pdf": { "@context": "https://schema.org", "@type": "WebApplication", "name": "OCR PDF Online Free", "url": "https://lakpdf.com/ocr-pdf", "applicationCategory": "UtilitiesApplication", "operatingSystem": "Web", "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }, "description": "OCR PDF online free and extract searchable text from scanned PDF files." },
  "/summarizer-qa": { "@context": "https://schema.org", "@type": "WebApplication", "name": "AI Summary", "url": "https://lakpdf.com/summarizer-qa", "applicationCategory": "UtilitiesApplication", "operatingSystem": "Web", "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }, "description": "Summarize PDF and documents with AI and ask questions from your document instantly." },
  "/ai-pdf-to-mcq": { "@context": "https://schema.org", "@type": "WebApplication", "name": "AI PDF to MCQ Generator", "url": "https://lakpdf.com/ai-pdf-to-mcq", "applicationCategory": "UtilitiesApplication", "operatingSystem": "Web", "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }, "description": "Generate MCQs from PDF with AI for tests, revision and practice." },
  "/ai-interview-generator": { "@context": "https://schema.org", "@type": "WebApplication", "name": "AI Interview Question Generator", "url": "https://lakpdf.com/ai-interview-generator", "applicationCategory": "UtilitiesApplication", "operatingSystem": "Web", "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }, "description": "Generate technical, HR and behavioral interview questions from your resume with AI." },
  "/protect-pdf": { "@context": "https://schema.org", "@type": "WebApplication", "name": "Protect PDF Online Free", "url": "https://lakpdf.com/protect-pdf", "applicationCategory": "SecurityApplication", "operatingSystem": "Web", "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }, "description": "Password protect PDF documents online free with AES encryption." },
  "/unlock-pdf": { "@context": "https://schema.org", "@type": "WebApplication", "name": "Unlock PDF Online Free", "url": "https://lakpdf.com/unlock-pdf", "applicationCategory": "SecurityApplication", "operatingSystem": "Web", "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }, "description": "Unlock password-protected PDF files online for free and remove encryption restrictions." },
  "/pdf-to-text": { "@context": "https://schema.org", "@type": "WebApplication", "name": "PDF to Text OCR Extractor Free", "url": "https://lakpdf.com/pdf-to-text", "applicationCategory": "UtilitiesApplication", "operatingSystem": "Web", "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }, "description": "Extract text and run OCR on PDF documents online free." },
  "/ai-edit-pdf": { "@context": "https://schema.org", "@type": "WebApplication", "name": "AI PDF Editor Free", "url": "https://lakpdf.com/ai-edit-pdf", "applicationCategory": "UtilitiesApplication", "operatingSystem": "Web", "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }, "description": "Edit, erase and annotate text in PDF files with AI OCR." },
};

const RouteSeoManager = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const routeSeo = ROUTE_SEO[pathname];
    if (!routeSeo) return;

    // Title + description
    document.title = routeSeo.title;
    upsertMeta("description", routeSeo.description);
    upsertCanonical(`${SITE_URL}${routeSeo.canonicalPath}`);

    // Open Graph tags (for WhatsApp, Facebook, LinkedIn)
    upsertProperty("og:title", routeSeo.title);
    upsertProperty("og:description", routeSeo.description);
    upsertProperty("og:url", `${SITE_URL}${routeSeo.canonicalPath}`);
    upsertProperty("og:type", "website");

    // Twitter card tags
    upsertMeta("twitter:title", routeSeo.title);
    upsertMeta("twitter:description", routeSeo.description);
    upsertMeta("twitter:card", "summary_large_image");

    // Per-tool JSON-LD structured data
    const toolLd = TOOL_JSON_LD[pathname];
    if (toolLd) {
      upsertJsonLd("tool-page", toolLd);
    }
  }, [pathname]);

  return null;
};



/* ================= SCROLL TO TOP ================= */
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

const RouteAnalyticsTracker = () => {
  const location = useLocation();
  const previousPathRef = useRef<string>("");

  useEffect(() => {
    const currentPath = location.pathname;
    if (previousPathRef.current && previousPathRef.current !== currentPath) {
      trackDropOffStepForPath(previousPathRef.current);
    }

    trackPageView({
      path: currentPath,
      title: document.title || "LAK PDF",
    });

    if (isToolRoute(currentPath) && previousPathRef.current !== currentPath) {
      recordToolOpen(currentPath, "route_visit");
    }

    previousPathRef.current = currentPath;
  }, [location.pathname]);

  useEffect(() => {
    const onBeforeUnload = () => {
      const currentPath = window.location.pathname || "";
      trackDropOffStepForPath(currentPath);
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  return null;
};

/* ================= LOADER ================= */
const PageLoader = () => {
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowFallback(true), 12000);
    return () => window.clearTimeout(timer);
  }, []);

  if (!showFallback) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-6 text-center shadow-sm">
        <h3 className="text-xl font-bold text-slate-900 mb-2">Still loading...</h3>
        <p className="text-slate-600 text-sm mb-5">
          Network ya cache issue ke wajah se page load delay ho raha hai.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700"
          >
            Refresh
          </button>
          <button
            onClick={() => window.location.assign("/")}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
};

/* ================= LAZY LOADING UTILITIES ================= */
const createLazyComponent = (importFunc: () => Promise<any>, componentName: string) => {
  return lazy(() => safeImport(importFunc, componentName));
};

/* ================= LAZY PAGES ================= */
// Dashboard - Preload on hover
const Dashboard = createLazyComponent(
  () => import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })),
  "Dashboard"
);
const Profile = createLazyComponent(
  () => import("./pages/Profile").then((m) => ({ default: m.Profile })),
  "Profile"
);

// Core PDF
const MergePdf = createLazyComponent(() => import("./pages/MergePdf"), "Merge PDF");
const SplitPdf = createLazyComponent(() => import("./pages/SplitPdf"), "Split PDF");
const CompressPdf = createLazyComponent(() => import("./pages/CompressPdf"), "Compress PDF");
const OrganizePdf = createLazyComponent(() => import("./pages/OrganizePdf"), "Organize PDF");

// Compress PDF landing pages (SEO keyword variants)
const CompressPdfLanding = createLazyComponent(() => import("./pages/CompressPdfLanding"), "Compress PDF Landing");
const CompressPdfTo100kb = createLazyComponent(() => import("./pages/CompressPdfTo100kb"), "Compress PDF to 100KB");
const CompressPdfTo200kb = createLazyComponent(() => import("./pages/CompressPdfTo200kb"), "Compress PDF to 200KB");
const CompressPdfTo500kb = createLazyComponent(() => import("./pages/CompressPdfTo500kb"), "Compress PDF to 500KB");

// Image
const ImageToPdf = createLazyComponent(() => import("./pages/ImageToPdf"), "Image to PDF");
const PdfToJpg = createLazyComponent(() => import("./pages/PdfToJpg"), "PDF to Image");
const CompressImage = createLazyComponent(() =>
  import("./pages/CompressImage").then((m) => ({ default: m.CompressImage }))
  , "Compress Image");
const DeletePage = createLazyComponent(() =>
  import("./pages/DeletePage")
  , "Delete Pages");



const AdvanceCompressImage = createLazyComponent(() =>
  import("./pages/AdvanceCompressImage").then((m) => ({
    default: m.AdvanceCompressImage,
  }))
  , "Compress Image to 50kb");

// Conversion
const ConvertPdf = createLazyComponent(() =>
  import("./pages/ConvertPdf").then((m) => ({ default: m.ConvertPdf }))
  , "Convert PDF");
const PdfToWord = createLazyComponent(() =>
  import("./pages/PdfToWord").then((m) => ({ default: m.PdfToWord }))
  , "PDF to Word");

const PdfToPowerPoint = createLazyComponent(() =>
  import("./pages/PdfToPowerPoint").then((m) => ({
    default: m.PdfToPowerPoint,
  }))
  , "PDF to PowerPoint");
const WordToPdf = createLazyComponent(() =>
  import("./pages/WordToPdf").then((m) => ({ default: m.WordToPdf }))
  , "Word to PDF");

const PowerPointToPdf = createLazyComponent(() =>
  import("./pages/PowerPointToPdf").then((m) => ({
    default: m.PowerPointToPdf,
  }))
  , "PowerPoint to PDF");

// Tools
const RotatePdf = createLazyComponent(() =>
  import("./pages/RotatePdf").then((m) => ({ default: m.RotatePdf }))
  , "Rotate PDF");
const PageNumbers = createLazyComponent(() =>
  import("./pages/PageNumbers").then((m) => ({ default: m.PageNumbers }))
  , "Page Numbers");

const WatermarkPdf = createLazyComponent(() =>
  import("./pages/WatermarkPdf").then((m) => ({
    default: m.WatermarkPdf,
  }))
  , "Watermark PDF");
const CropPdf = createLazyComponent(() =>
  import("./pages/CropPdf").then((m) => ({ default: m.CropPdf }))
  , "Crop PDF");
const ScanPdf = createLazyComponent(() =>
  import("./pages/ScanPdf").then((m) => ({ default: m.ScanPdf }))
  , "Scan Document");
const SignPdf = createLazyComponent(() =>
  import("./pages/SignPdf").then((m) => ({ default: m.SignPdf }))
  , "Sign PDF");
const OcrPdf = createLazyComponent(() =>
  import("./pages/OcrPdf").then((m) => ({ default: m.OcrPdf }))
  , "OCR PDF");
const ComparePdf = createLazyComponent(() =>
  import("./pages/ComparePdf").then((m) => ({ default: m.ComparePdf }))
  , "Compare PDF");

const PdfSummarizerQA = createLazyComponent(() => import("./pages/PdfSummarizerQA"), "AI Summary");
const AiPdfToMcq = createLazyComponent(() => import("./pages/AiPdfToMcq"), "AI PDF to MCQ Generator");
const AiInterviewGenerator = createLazyComponent(() => import("./pages/AiInterviewGenerator"), "AI Interview Question Generator");
const PdfEditor = createLazyComponent(() => import("./pages/PdfEditor"), "PDF Editor");



// Additional New Tools
const DetectDuplicatePages = createLazyComponent(() => import("./pages/DetectDuplicatePages"), "Detect Duplicate Pages");
const ProtectPdf = createLazyComponent(() =>
  import("./pages/ProtectPdf").then((m) => ({ default: m.ProtectPdf }))
  , "Protect PDF");
const UnlockPdf = createLazyComponent(() =>
  import("./pages/UnlockPdf").then((m) => ({ default: m.UnlockPdf }))
  , "Unlock PDF");
const MakePpt = createLazyComponent(() => import("./pages/MakePpt"), "Make PPT");
const PassportPhotoMaker = createLazyComponent(() => import("./pages/PassportPhotoMaker"), "Passport Photo Maker");
const RedactPdf = createLazyComponent(() => import("./pages/RedactPdf"), "Redact PDF");
const PdfToText = createLazyComponent(() =>
  import("./pages/PdfToText").then((m) => ({ default: m.PdfToText }))
  , "PDF to Text");
const AiEditPdf = createLazyComponent(() => import("./pages/AiEditPdf"), "AI Edit PDF");

// Company
const About = createLazyComponent(() =>
  import("./pages/About").then((m) => ({ default: m.About }))
  , "About");
const Contact = createLazyComponent(() =>
  import("./pages/Contact").then((m) => ({ default: m.Contact }))
  , "Contact");
const PrivacyPolicy = createLazyComponent(() =>
  import("./pages/PrivacyPolicy").then((m) => ({ default: m.PrivacyPolicy }))
  , "Privacy Policy");
const TermsOfService = createLazyComponent(() =>
  import("./pages/TermsOfService").then((m) => ({ default: m.TermsOfService }))
  , "Terms of Service");
const Disclaimer = createLazyComponent(() =>
  import("./pages/Disclaimer").then((m) => ({ default: m.Disclaimer }))
  , "Disclaimer");
const LearnPdf = createLazyComponent(() =>
  import("./pages/LearnPdf").then((m) => ({ default: m.LearnPdf }))
  , "Learn PDF");
const Blog = createLazyComponent(() =>
  import("./pages/Blog").then((m) => ({ default: m.Blog }))
  , "Blog");
const BlogPost = createLazyComponent(() =>
  import("./pages/Blog").then((m) => ({ default: m.BlogPost }))
  , "Blog Post");

// All Tools Page
const AllTools = createLazyComponent(() => import("./pages/AllTools"), "All Tools");

// 404 Page
const NotFound = createLazyComponent(() => import("./components/NotFound"), "Not Found");

// Admin Portal Pages
const AdminLogin = createLazyComponent(() => import("./admin/AdminLogin"), "Admin Login");
const AdminUnauthorized = createLazyComponent(() => import("./admin/AdminUnauthorized"), "Admin Unauthorized");
const ProtectedAdminRoute = createLazyComponent(() => import("./admin/ProtectedAdminRoute"), "Protected Admin Route");
const AdminLayout = createLazyComponent(() => import("./admin/AdminLayout"), "Admin Layout");
const AdminDashboard = createLazyComponent(() => import("./admin/AdminDashboard"), "Admin Dashboard");
const AdminUsers = createLazyComponent(() => import("./admin/AdminUsers"), "Admin Users");
const AdminTools = createLazyComponent(() => import("./admin/AdminTools"), "Admin Tools");
const AdminAnalytics = createLazyComponent(() => import("./admin/AdminAnalytics"), "Admin Analytics");
const AdminAnnouncements = createLazyComponent(() => import("./admin/AdminAnnouncements"), "Admin Announcements");
const AdminLogs = createLazyComponent(() => import("./admin/AdminLogs"), "Admin Logs");
const AdminSettings = createLazyComponent(() => import("./admin/AdminSettings"), "Admin Settings");

/* ================= GLOBAL ERROR HANDLING ================= */
const GlobalErrorHandler: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  React.useEffect(() => {
    // Only enable global error handlers in production
    if (import.meta.env.PROD) {
      const CHUNK_RELOAD_KEY = 'lakpdf_chunk_reload_once';
      const handleUnhandledError = (event: ErrorEvent) => {
        const errorMessage = event.message || event.error?.message || '';
        const errorStack = event.error?.stack || '';
        const target = event.target as any;
        const targetSrc = String(target?.src || target?.href || event.filename || '');

        // Suppress AdSense, third-party ad-related, ad-blockers (ERR_BLOCKED_BY_CLIENT) and script errors
        const isAdError =
          errorMessage.includes('adsbygoogle') ||
          errorMessage.includes('googlesyndication') ||
          errorMessage.includes('doubleclick') ||
          errorMessage.includes('SecurityError') ||
          errorMessage.includes('cross-origin') ||
          errorMessage.includes('iframe') ||
          errorMessage.includes('gpt') ||
          errorMessage.includes('google_ads') ||
          errorStack.includes('pagead') ||
          errorStack.includes('adservice') ||
          targetSrc.includes('pagead') ||
          targetSrc.includes('googlesyndication') ||
          targetSrc.includes('doubleclick') ||
          (!event.error && (!errorMessage || errorMessage === 'Script error.'));

        if (isAdError) {
          // Silently suppress ad-related errors
          event.preventDefault();
          event.stopPropagation();
          return false;
        }

        // Only log app-specific errors for debugging
        if (event.error || errorMessage) {
          console.error('[GlobalErrorHandler] Unhandled error:', event.error || errorMessage);
        }
      };

      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        const reason = event.reason?.message || event.reason?.toString() || '';

        // Suppress AdSense promise rejections
        const isAdRejection =
          reason.includes('adsbygoogle') ||
          reason.includes('googlesyndication') ||
          reason.includes('SecurityError') ||
          reason.includes('cross-origin') ||
          reason.includes('iframe') ||
          reason.includes('doubleclick');

        if (isAdRejection) {
          console.debug('[GlobalErrorHandler] Ad promise rejection suppressed:', reason);
          event.preventDefault();
          return false;
        }

        console.error('[GlobalErrorHandler] Unhandled promise rejection:', event.reason);
      };

      // Handle chunk load failures specifically
      const handleChunkError = (event: ErrorEvent) => {
        const errorMessage = event.message || event.error?.message || '';
        // Ignore browser extension errors
        if (errorMessage.includes('chrome-extension://') || errorMessage.includes('moz-extension://')) {
          return;
        }

        const isChunkError =
          errorMessage.includes('Loading chunk') ||
          errorMessage.includes('Failed to fetch dynamically imported module');

        if (isChunkError) {
          console.error('[GlobalErrorHandler] Chunk load failure:', event.error);

          const hasRetried = sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1';
          if (hasRetried) {
            sessionStorage.removeItem(CHUNK_RELOAD_KEY);
            return;
          }

          sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
          setTimeout(() => window.location.reload(), 1000);
          event.preventDefault();
        }
      };

      // Use capture phase to catch errors before they bubble
      window.addEventListener('error', handleUnhandledError, true);
      window.addEventListener('unhandledrejection', handleUnhandledRejection);
      window.addEventListener('error', handleChunkError);

      return () => {
        window.removeEventListener('error', handleUnhandledError, true);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        window.removeEventListener('error', handleChunkError);
      };
    }
  }, []);

  return <>{children}</>;
};

/* ================= APP ================= */
const App: React.FC = () => {
  // Initialize performance monitoring
  useEffect(() => {
    if (import.meta.env.PROD) {
      initPerformanceMonitoring();
    }
  }, []);



  return (
    <BrowserRouter>
      <GlobalErrorHandler>
        <ScrollToTop />
        <RouteSeoManager />
        <RouteAnalyticsTracker />
        <AdSenseRouteHandler />
        <Layout>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/dashboard" element={
                <ErrorBoundary componentName="Dashboard">
                  <Dashboard />
                </ErrorBoundary>
              } />
              <Route path="/profile" element={
                <ErrorBoundary componentName="Profile">
                  <Profile />
                </ErrorBoundary>
              } />
              <Route path="/tools" element={
                <ErrorBoundary componentName="All Tools">
                  <AllTools />
                </ErrorBoundary>
              } />
              <Route path="/all-tools" element={
                <ErrorBoundary componentName="All Tools">
                  <AllTools />
                </ErrorBoundary>
              } />

              {/* PDF Core */}
              <Route path="/merge" element={
                <ErrorBoundary componentName="Merge PDF">
                  <MergePdf />
                </ErrorBoundary>
              } />
              <Route path="/split" element={
                <ErrorBoundary componentName="Split PDF">
                  <SplitPdf />
                </ErrorBoundary>
              } />
              <Route path="/compress" element={
                <ErrorBoundary componentName="Compress PDF">
                  <CompressPdf />
                </ErrorBoundary>
              } />
              <Route path="/compress-pdf" element={
                <ErrorBoundary componentName="Compress PDF Landing">
                  <CompressPdfLanding />
                </ErrorBoundary>
              } />
              <Route path="/compress-pdf-to-100kb" element={
                <ErrorBoundary componentName="Compress PDF to 100KB">
                  <CompressPdfTo100kb />
                </ErrorBoundary>
              } />
              <Route path="/compress-pdf-to-200kb" element={
                <ErrorBoundary componentName="Compress PDF to 200KB">
                  <CompressPdfTo200kb />
                </ErrorBoundary>
              } />
              <Route path="/compress-pdf-to-500kb" element={
                <ErrorBoundary componentName="Compress PDF to 500KB">
                  <CompressPdfTo500kb />
                </ErrorBoundary>
              } />
              <Route path="/organize-pdf" element={
                <ErrorBoundary componentName="Organize PDF">
                  <OrganizePdf />
                </ErrorBoundary>
              } />

              {/* Image */}
              <Route path="/img-to-pdf" element={
                <ErrorBoundary componentName="Image to PDF">
                  <ImageToPdf />
                </ErrorBoundary>
              } />
              <Route path="/image-to-pdf" element={
                <ErrorBoundary componentName="Image to PDF">
                  <ImageToPdf />
                </ErrorBoundary>
              } />
              <Route path="/pdf-to-img" element={
                <ErrorBoundary componentName="PDF to Image">
                  <PdfToJpg />
                </ErrorBoundary>
              } />
              <Route path="/pdf-to-image" element={
                <ErrorBoundary componentName="PDF to Image">
                  <PdfToJpg />
                </ErrorBoundary>
              } />
              <Route path="/compress-img" element={
                <ErrorBoundary componentName="Compress Image">
                  <CompressImage />
                </ErrorBoundary>
              } />
              <Route path="/compress-image" element={
                <ErrorBoundary componentName="Compress Image">
                  <CompressImage />
                </ErrorBoundary>
              } />
              <Route path="/advance-compress-img" element={
                <ErrorBoundary componentName="Compress Image to 50kb">
                  <AdvanceCompressImage />
                </ErrorBoundary>
              } />
              <Route path="/make-ppt" element={
                <ErrorBoundary componentName="Make PPT">
                  <MakePpt />
                </ErrorBoundary>
              } />
              <Route path="/img-to-ppt" element={
                <ErrorBoundary componentName="Make PPT">
                  <MakePpt />
                </ErrorBoundary>
              } />
              <Route path="/passport-photo-maker" element={
                <ErrorBoundary componentName="Passport Photo Maker">
                  <PassportPhotoMaker />
                </ErrorBoundary>
              } />
              <Route path="/passport-photo" element={
                <ErrorBoundary componentName="Passport Photo Maker">
                  <PassportPhotoMaker />
                </ErrorBoundary>
              } />
              <Route path="/redact-pdf" element={
                <ErrorBoundary componentName="Redact PDF">
                  <RedactPdf />
                </ErrorBoundary>
              } />
              <Route path="/blackout-pdf" element={
                <ErrorBoundary componentName="Redact PDF">
                  <RedactPdf />
                </ErrorBoundary>
              } />

              {/* Conversion */}
              <Route path="/convert" element={
                <ErrorBoundary componentName="Convert PDF">
                  <ConvertPdf />
                </ErrorBoundary>
              } />
              <Route path="/pdf-to-word" element={
                <ErrorBoundary componentName="PDF to Word">
                  <PdfToWord />
                </ErrorBoundary>
              } />
              <Route path="/pdf-to-powerpoint" element={
                <ErrorBoundary componentName="PDF to PowerPoint">
                  <PdfToPowerPoint />
                </ErrorBoundary>
              } />
              <Route path="/word-to-pdf" element={
                <ErrorBoundary componentName="Word to PDF">
                  <WordToPdf />
                </ErrorBoundary>
              } />
              <Route path="/powerpoint-to-pdf" element={
                <ErrorBoundary componentName="PowerPoint to PDF">
                  <PowerPointToPdf />
                </ErrorBoundary>
              } />

              {/* Tools */}
              <Route path="/rotate" element={
                <ErrorBoundary componentName="Rotate PDF">
                  <RotatePdf />
                </ErrorBoundary>
              } />
              <Route path="/rotate-pdf" element={
                <ErrorBoundary componentName="Rotate PDF">
                  <RotatePdf />
                </ErrorBoundary>
              } />
              <Route path="/page-number" element={
                <ErrorBoundary componentName="Add Page Numbers">
                  <PageNumbers />
                </ErrorBoundary>
              } />
              <Route path="/page-numbers" element={
                <ErrorBoundary componentName="Add Page Numbers">
                  <PageNumbers />
                </ErrorBoundary>
              } />

              <Route path="/watermark" element={
                <ErrorBoundary componentName="Watermark PDF">
                  <WatermarkPdf />
                </ErrorBoundary>
              } />
              <Route path="/watermark-pdf" element={
                <ErrorBoundary componentName="Watermark PDF">
                  <WatermarkPdf />
                </ErrorBoundary>
              } />
              <Route path="/crop-pdf" element={
                <ErrorBoundary componentName="Crop PDF">
                  <CropPdf />
                </ErrorBoundary>
              } />
              <Route path="/scan-pdf" element={
                <ErrorBoundary componentName="Scan Document">
                  <ScanPdf />
                </ErrorBoundary>
              } />
              <Route path="/sign-pdf" element={
                <ErrorBoundary componentName="Sign PDF">
                  <SignPdf />
                </ErrorBoundary>
              } />
              <Route path="/ocr-pdf" element={
                <ErrorBoundary componentName="OCR PDF">
                  <OcrPdf />
                </ErrorBoundary>
              } />
              <Route path="/compare-pdf" element={
                <ErrorBoundary componentName="Compare PDF">
                  <ComparePdf />
                </ErrorBoundary>
              } />
              <Route path="/delete-page" element={
                <ErrorBoundary componentName="Delete Pages">
                  <DeletePage />
                </ErrorBoundary>
              } />
              <Route path="/delete-pages" element={
                <ErrorBoundary componentName="Delete Pages">
                  <DeletePage />
                </ErrorBoundary>
              } />
              <Route path="/protect-pdf" element={
                <ErrorBoundary componentName="Protect PDF">
                  <ProtectPdf />
                </ErrorBoundary>
              } />
              <Route path="/protect" element={
                <ErrorBoundary componentName="Protect PDF">
                  <ProtectPdf />
                </ErrorBoundary>
              } />
              <Route path="/unlock-pdf" element={
                <ErrorBoundary componentName="Unlock PDF">
                  <UnlockPdf />
                </ErrorBoundary>
              } />
              <Route path="/unlock" element={
                <ErrorBoundary componentName="Unlock PDF">
                  <UnlockPdf />
                </ErrorBoundary>
              } />
              <Route path="/summarizer-qa" element={
                <ErrorBoundary componentName="AI Summary">
                  <PdfSummarizerQA />
                </ErrorBoundary>
              } />
              <Route path="/ai-pdf-to-mcq" element={
                <ErrorBoundary componentName="AI PDF to MCQ Generator">
                  <AiPdfToMcq />
                </ErrorBoundary>
              } />
              <Route path="/ai-interview-generator" element={
                <ErrorBoundary componentName="AI Interview Question Generator">
                  <AiInterviewGenerator />
                </ErrorBoundary>
              } />
              <Route path="/ai-interview-prep" element={
                <ErrorBoundary componentName="AI Interview Prep">
                  <AiInterviewGenerator />
                </ErrorBoundary>
              } />
              <Route path="/pdf-editor" element={
                <ErrorBoundary componentName="PDF Editor">
                  <PdfEditor />
                </ErrorBoundary>
              } />
              <Route path="/ai-edit-pdf" element={
                <ErrorBoundary componentName="AI Edit PDF">
                  <AiEditPdf />
                </ErrorBoundary>
              } />
              <Route path="/pdf-to-text" element={
                <ErrorBoundary componentName="PDF to Text">
                  <PdfToText />
                </ErrorBoundary>
              } />

              {/* Alias Redirects to prevent 404 on client-side routing */}
              <Route path="/pdf-to-jpg" element={<Navigate to="/pdf-to-img" replace />} />
              <Route path="/jpg-to-pdf" element={<Navigate to="/img-to-pdf" replace />} />
              <Route path="/merge-pdf" element={<Navigate to="/merge" replace />} />
              <Route path="/split-pdf" element={<Navigate to="/split" replace />} />
              <Route path="/scan-to-pdf" element={<Navigate to="/scan-pdf" replace />} />
              <Route path="/add-page-numbers-to-pdf" element={<Navigate to="/page-number" replace />} />

              {/* New Tools */}
              <Route path="/detect-duplicates" element={
                <ErrorBoundary componentName="Detect Duplicates">
                  <DetectDuplicatePages />
                </ErrorBoundary>
              } />
              {/* Company */}
              <Route path="/about" element={
                <ErrorBoundary componentName="About">
                  <About />
                </ErrorBoundary>
              } />
              <Route path="/contact" element={
                <ErrorBoundary componentName="Contact">
                  <Contact />
                </ErrorBoundary>
              } />
              <Route path="/privacy-policy" element={
                <ErrorBoundary componentName="Privacy Policy">
                  <PrivacyPolicy />
                </ErrorBoundary>
              } />
              <Route path="/terms-of-service" element={
                <ErrorBoundary componentName="Terms of Service">
                  <TermsOfService />
                </ErrorBoundary>
              } />
              <Route path="/disclaimer" element={
                <ErrorBoundary componentName="Disclaimer">
                  <Disclaimer />
                </ErrorBoundary>
              } />
              <Route path="/learn-pdf" element={
                <ErrorBoundary componentName="Learn PDF">
                  <LearnPdf />
                </ErrorBoundary>
              } />
              <Route path="/blog" element={
                <ErrorBoundary componentName="Blog">
                  <Blog />
                </ErrorBoundary>
              } />
              <Route path="/blog/:slug" element={
                <ErrorBoundary componentName="Blog Post">
                  <BlogPost />
                </ErrorBoundary>
              } />

              {/* Admin Portal Routes */}
              <Route path="/admin/login" element={
                <ErrorBoundary componentName="Admin Login">
                  <AdminLogin />
                </ErrorBoundary>
              } />
              <Route path="/admin/unauthorized" element={
                <ErrorBoundary componentName="Admin Unauthorized">
                  <AdminUnauthorized />
                </ErrorBoundary>
              } />
              <Route
                path="/admin"
                element={
                  <ErrorBoundary componentName="Admin Protected Route">
                    <ProtectedAdminRoute>
                      <AdminLayout />
                    </ProtectedAdminRoute>
                  </ErrorBoundary>
                }
              >
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={
                  <ErrorBoundary componentName="Admin Dashboard">
                    <AdminDashboard />
                  </ErrorBoundary>
                } />
                <Route path="users" element={
                  <ErrorBoundary componentName="Admin Users">
                    <AdminUsers />
                  </ErrorBoundary>
                } />
                <Route path="tools" element={
                  <ErrorBoundary componentName="Admin Tools">
                    <AdminTools />
                  </ErrorBoundary>
                } />
                <Route path="analytics" element={
                  <ErrorBoundary componentName="Admin Analytics">
                    <AdminAnalytics />
                  </ErrorBoundary>
                } />
                <Route path="announcements" element={
                  <ErrorBoundary componentName="Admin Announcements">
                    <AdminAnnouncements />
                  </ErrorBoundary>
                } />
                <Route path="logs" element={
                  <ErrorBoundary componentName="Admin Logs">
                    <AdminLogs />
                  </ErrorBoundary>
                } />
                <Route path="settings" element={
                  <ErrorBoundary componentName="Admin Settings">
                    <AdminSettings />
                  </ErrorBoundary>
                } />
              </Route>

              {/* 404 Fallback */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </Layout>
      </GlobalErrorHandler>
    </BrowserRouter>
  );
};

export default App;
