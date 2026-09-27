import React, { useEffect, Suspense, lazy } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// Layout & System Components
import { Layout } from "./components/Layout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AdSenseRouteHandler } from "./components/AdSenseHandler";
import { RouteSeoManager } from "./components/RouteSeoManager";
import { ScrollToTop } from "./components/ScrollToTop";
import { RouteAnalyticsTracker } from "./components/RouteAnalyticsTracker";
import { PageLoader } from "./components/PageLoader";
import { GlobalErrorHandler } from "./components/GlobalErrorHandler";

// Utilities
import { safeImport } from "./utils/safeImport";
import { initPerformanceMonitoring } from "./utils/performance";

// Eagerly loaded home page for fastest LCP
import Home from "./pages/Home";

/* ================= LAZY LOADING UTILITIES ================= */
const createLazyComponent = (importFunc: () => Promise<any>, componentName: string) => {
  return lazy(() => safeImport(importFunc, componentName));
};

/* ================= LAZY LOADED PAGES & TOOLS ================= */
// User Dashboard & Profile
const Dashboard = createLazyComponent(
  () => import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })),
  "Dashboard"
);
const Profile = createLazyComponent(
  () => import("./pages/Profile").then((m) => ({ default: m.Profile })),
  "Profile"
);

// Core PDF Utilities
const MergePdf = createLazyComponent(() => import("./pages/MergePdf"), "Merge PDF");
const SplitPdf = createLazyComponent(() => import("./pages/SplitPdf"), "Split PDF");
const CompressPdf = createLazyComponent(() => import("./pages/CompressPdf"), "Compress PDF");
const OrganizePdf = createLazyComponent(() => import("./pages/OrganizePdf"), "Organize PDF");
const DeletePage = createLazyComponent(() => import("./pages/DeletePage"), "Delete Pages");

// Target Size Compression Landing Pages (SEO)
const CompressPdfLanding = createLazyComponent(() => import("./pages/CompressPdfLanding"), "Compress PDF Landing");
const CompressPdfTo100kb = createLazyComponent(() => import("./pages/CompressPdfTo100kb"), "Compress PDF to 100KB");
const CompressPdfTo200kb = createLazyComponent(() => import("./pages/CompressPdfTo200kb"), "Compress PDF to 200KB");
const CompressPdfTo500kb = createLazyComponent(() => import("./pages/CompressPdfTo500kb"), "Compress PDF to 500KB");

// Image & Presentation
const ImageToPdf = createLazyComponent(() => import("./pages/ImageToPdf"), "Image to PDF");
const PdfToJpg = createLazyComponent(() => import("./pages/PdfToJpg"), "PDF to Image");
const CompressImage = createLazyComponent(
  () => import("./pages/CompressImage").then((m) => ({ default: m.CompressImage })),
  "Compress Image"
);
const AdvanceCompressImage = createLazyComponent(
  () => import("./pages/AdvanceCompressImage").then((m) => ({ default: m.AdvanceCompressImage })),
  "Compress Image to 50kb"
);
const MakePpt = createLazyComponent(() => import("./pages/MakePpt"), "Make PPT");
const PassportPhotoMaker = createLazyComponent(() => import("./pages/PassportPhotoMaker"), "Passport Photo Maker");
const GovtExamResizer = createLazyComponent(() => import("./pages/GovtExamResizer"), "Govt Exam Resizer");

// Document Security & Page Manipulation
const RedactPdf = createLazyComponent(() => import("./pages/RedactPdf"), "Redact PDF");
const ProtectPdf = createLazyComponent(
  () => import("./pages/ProtectPdf").then((m) => ({ default: m.ProtectPdf })),
  "Protect PDF"
);
const UnlockPdf = createLazyComponent(
  () => import("./pages/UnlockPdf").then((m) => ({ default: m.UnlockPdf })),
  "Unlock PDF"
);
const RotatePdf = createLazyComponent(
  () => import("./pages/RotatePdf").then((m) => ({ default: m.RotatePdf })),
  "Rotate PDF"
);
const PageNumbers = createLazyComponent(
  () => import("./pages/PageNumbers").then((m) => ({ default: m.PageNumbers })),
  "Page Numbers"
);
const WatermarkPdf = createLazyComponent(
  () => import("./pages/WatermarkPdf").then((m) => ({ default: m.WatermarkPdf })),
  "Watermark PDF"
);
const CropPdf = createLazyComponent(
  () => import("./pages/CropPdf").then((m) => ({ default: m.CropPdf })),
  "Crop PDF"
);
const ScanPdf = createLazyComponent(
  () => import("./pages/ScanPdf").then((m) => ({ default: m.ScanPdf })),
  "Scan Document"
);
const SignPdf = createLazyComponent(
  () => import("./pages/SignPdf").then((m) => ({ default: m.SignPdf })),
  "Sign PDF"
);
const OcrPdf = createLazyComponent(
  () => import("./pages/OcrPdf").then((m) => ({ default: m.OcrPdf })),
  "OCR PDF"
);
const ComparePdf = createLazyComponent(
  () => import("./pages/ComparePdf").then((m) => ({ default: m.ComparePdf })),
  "Compare PDF"
);
const DetectDuplicatePages = createLazyComponent(() => import("./pages/DetectDuplicatePages"), "Detect Duplicate Pages");
const PdfEditor = createLazyComponent(() => import("./pages/PdfEditor"), "PDF Editor");
const AiEditPdf = createLazyComponent(() => import("./pages/AiEditPdf"), "AI Edit PDF");
const PdfToText = createLazyComponent(
  () => import("./pages/PdfToText").then((m) => ({ default: m.PdfToText })),
  "PDF to Text"
);

// Format Conversion
const ConvertPdf = createLazyComponent(
  () => import("./pages/ConvertPdf").then((m) => ({ default: m.ConvertPdf })),
  "Convert PDF"
);
const PdfToWord = createLazyComponent(
  () => import("./pages/PdfToWord").then((m) => ({ default: m.PdfToWord })),
  "PDF to Word"
);
const PdfToPowerPoint = createLazyComponent(
  () => import("./pages/PdfToPowerPoint").then((m) => ({ default: m.PdfToPowerPoint })),
  "PDF to PowerPoint"
);
const WordToPdf = createLazyComponent(
  () => import("./pages/WordToPdf").then((m) => ({ default: m.WordToPdf })),
  "Word to PDF"
);
const PowerPointToPdf = createLazyComponent(
  () => import("./pages/PowerPointToPdf").then((m) => ({ default: m.PowerPointToPdf })),
  "PowerPoint to PDF"
);

// AI Document Intelligence Suite
const PdfSummarizerQA = createLazyComponent(() => import("./pages/PdfSummarizerQA"), "AI Summary");
const AiPdfToMcq = createLazyComponent(() => import("./pages/AiPdfToMcq"), "AI PDF to MCQ Generator");
const AiInterviewGenerator = createLazyComponent(() => import("./pages/AiInterviewGenerator"), "AI Interview Question Generator");

// Content & Informational Pages
const AllTools = createLazyComponent(() => import("./pages/AllTools"), "All Tools");
const About = createLazyComponent(
  () => import("./pages/About").then((m) => ({ default: m.About })),
  "About"
);
const Contact = createLazyComponent(
  () => import("./pages/Contact").then((m) => ({ default: m.Contact })),
  "Contact"
);
const PrivacyPolicy = createLazyComponent(
  () => import("./pages/PrivacyPolicy").then((m) => ({ default: m.PrivacyPolicy })),
  "Privacy Policy"
);
const TermsOfService = createLazyComponent(
  () => import("./pages/TermsOfService").then((m) => ({ default: m.TermsOfService })),
  "Terms of Service"
);
const Disclaimer = createLazyComponent(
  () => import("./pages/Disclaimer").then((m) => ({ default: m.Disclaimer })),
  "Disclaimer"
);
const LearnPdf = createLazyComponent(
  () => import("./pages/LearnPdf").then((m) => ({ default: m.LearnPdf })),
  "Learn PDF"
);
const Blog = createLazyComponent(
  () => import("./pages/Blog").then((m) => ({ default: m.Blog })),
  "Blog"
);
const BlogPost = createLazyComponent(
  () => import("./pages/Blog").then((m) => ({ default: m.BlogPost })),
  "Blog Post"
);
const Sitemap = createLazyComponent(() => import("./pages/Sitemap"), "Sitemap");
const Offline = createLazyComponent(() => import("./pages/Offline"), "Offline");
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

/* ================= MAIN APPLICATION ROUTER ================= */
const App: React.FC = () => {
  // Initialize performance monitoring in production
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
              {/* Home & User Account */}
              <Route path="/" element={<ErrorBoundary componentName="Home"><Home /></ErrorBoundary>} />
              <Route path="/dashboard" element={<ErrorBoundary componentName="Dashboard"><Dashboard /></ErrorBoundary>} />
              <Route path="/profile" element={<ErrorBoundary componentName="Profile"><Profile /></ErrorBoundary>} />
              <Route path="/tools" element={<ErrorBoundary componentName="All Tools"><AllTools /></ErrorBoundary>} />
              <Route path="/all-tools" element={<ErrorBoundary componentName="All Tools"><AllTools /></ErrorBoundary>} />

              {/* Core PDF Utilities */}
              <Route path="/merge" element={<ErrorBoundary componentName="Merge PDF"><MergePdf /></ErrorBoundary>} />
              <Route path="/split" element={<ErrorBoundary componentName="Split PDF"><SplitPdf /></ErrorBoundary>} />
              <Route path="/compress" element={<ErrorBoundary componentName="Compress PDF"><CompressPdf /></ErrorBoundary>} />
              <Route path="/compress-pdf" element={<ErrorBoundary componentName="Compress PDF Landing"><CompressPdfLanding /></ErrorBoundary>} />
              <Route path="/compress-pdf-to-100kb" element={<ErrorBoundary componentName="Compress PDF to 100KB"><CompressPdfTo100kb /></ErrorBoundary>} />
              <Route path="/compress-pdf-to-200kb" element={<ErrorBoundary componentName="Compress PDF to 200KB"><CompressPdfTo200kb /></ErrorBoundary>} />
              <Route path="/compress-pdf-to-500kb" element={<ErrorBoundary componentName="Compress PDF to 500KB"><CompressPdfTo500kb /></ErrorBoundary>} />
              <Route path="/organize-pdf" element={<ErrorBoundary componentName="Organize PDF"><OrganizePdf /></ErrorBoundary>} />
              <Route path="/delete-page" element={<ErrorBoundary componentName="Delete Pages"><DeletePage /></ErrorBoundary>} />
              <Route path="/delete-pages" element={<ErrorBoundary componentName="Delete Pages"><DeletePage /></ErrorBoundary>} />

              {/* Image & Presentation */}
              <Route path="/img-to-pdf" element={<ErrorBoundary componentName="Image to PDF"><ImageToPdf /></ErrorBoundary>} />
              <Route path="/image-to-pdf" element={<ErrorBoundary componentName="Image to PDF"><ImageToPdf /></ErrorBoundary>} />
              <Route path="/pdf-to-img" element={<ErrorBoundary componentName="PDF to Image"><PdfToJpg /></ErrorBoundary>} />
              <Route path="/pdf-to-image" element={<ErrorBoundary componentName="PDF to Image"><PdfToJpg /></ErrorBoundary>} />
              <Route path="/compress-img" element={<ErrorBoundary componentName="Compress Image"><CompressImage /></ErrorBoundary>} />
              <Route path="/compress-image" element={<ErrorBoundary componentName="Compress Image"><CompressImage /></ErrorBoundary>} />
              <Route path="/advance-compress-img" element={<ErrorBoundary componentName="Compress Image to 50kb"><AdvanceCompressImage /></ErrorBoundary>} />
              <Route path="/make-ppt" element={<ErrorBoundary componentName="Make PPT"><MakePpt /></ErrorBoundary>} />
              <Route path="/img-to-ppt" element={<ErrorBoundary componentName="Make PPT"><MakePpt /></ErrorBoundary>} />
              <Route path="/pdf-to-ppt" element={<ErrorBoundary componentName="Make PPT"><MakePpt /></ErrorBoundary>} />
              <Route path="/passport-photo-maker" element={<ErrorBoundary componentName="Passport Photo Maker"><PassportPhotoMaker /></ErrorBoundary>} />
              <Route path="/passport-photo" element={<ErrorBoundary componentName="Passport Photo Maker"><PassportPhotoMaker /></ErrorBoundary>} />

              {/* Govt Exam Resizer (FormDocFixer) & Route Aliases */}
              <Route path="/govt-exam-resizer" element={<ErrorBoundary componentName="Govt Exam Resizer"><GovtExamResizer /></ErrorBoundary>} />
              <Route path="/sarkari-resizer" element={<Navigate to="/govt-exam-resizer" replace />} />
              <Route path="/exam-document-maker" element={<Navigate to="/govt-exam-resizer" replace />} />
              <Route path="/ssc-photo-resizer" element={<Navigate to="/govt-exam-resizer" replace />} />
              <Route path="/form-doc-fixer" element={<Navigate to="/govt-exam-resizer" replace />} />
              <Route path="/formdocfixer" element={<Navigate to="/govt-exam-resizer" replace />} />

              {/* Security & PDF Manipulation */}
              <Route path="/redact-pdf" element={<ErrorBoundary componentName="Redact PDF"><RedactPdf /></ErrorBoundary>} />
              <Route path="/blackout-pdf" element={<ErrorBoundary componentName="Redact PDF"><RedactPdf /></ErrorBoundary>} />
              <Route path="/protect-pdf" element={<ErrorBoundary componentName="Protect PDF"><ProtectPdf /></ErrorBoundary>} />
              <Route path="/protect" element={<ErrorBoundary componentName="Protect PDF"><ProtectPdf /></ErrorBoundary>} />
              <Route path="/unlock-pdf" element={<ErrorBoundary componentName="Unlock PDF"><UnlockPdf /></ErrorBoundary>} />
              <Route path="/unlock" element={<ErrorBoundary componentName="Unlock PDF"><UnlockPdf /></ErrorBoundary>} />
              <Route path="/rotate" element={<ErrorBoundary componentName="Rotate PDF"><RotatePdf /></ErrorBoundary>} />
              <Route path="/rotate-pdf" element={<ErrorBoundary componentName="Rotate PDF"><RotatePdf /></ErrorBoundary>} />
              <Route path="/page-number" element={<ErrorBoundary componentName="Add Page Numbers"><PageNumbers /></ErrorBoundary>} />
              <Route path="/page-numbers" element={<ErrorBoundary componentName="Add Page Numbers"><PageNumbers /></ErrorBoundary>} />
              <Route path="/watermark" element={<ErrorBoundary componentName="Watermark PDF"><WatermarkPdf /></ErrorBoundary>} />
              <Route path="/watermark-pdf" element={<ErrorBoundary componentName="Watermark PDF"><WatermarkPdf /></ErrorBoundary>} />
              <Route path="/crop-pdf" element={<ErrorBoundary componentName="Crop PDF"><CropPdf /></ErrorBoundary>} />
              <Route path="/scan-pdf" element={<ErrorBoundary componentName="Scan Document"><ScanPdf /></ErrorBoundary>} />
              <Route path="/sign-pdf" element={<ErrorBoundary componentName="Sign PDF"><SignPdf /></ErrorBoundary>} />
              <Route path="/ocr-pdf" element={<ErrorBoundary componentName="OCR PDF"><OcrPdf /></ErrorBoundary>} />
              <Route path="/compare-pdf" element={<ErrorBoundary componentName="Compare PDF"><ComparePdf /></ErrorBoundary>} />
              <Route path="/detect-duplicates" element={<ErrorBoundary componentName="Detect Duplicates"><DetectDuplicatePages /></ErrorBoundary>} />
              <Route path="/pdf-editor" element={<ErrorBoundary componentName="PDF Editor"><PdfEditor /></ErrorBoundary>} />
              <Route path="/ai-edit-pdf" element={<ErrorBoundary componentName="AI Edit PDF"><AiEditPdf /></ErrorBoundary>} />
              <Route path="/pdf-to-text" element={<ErrorBoundary componentName="PDF to Text"><PdfToText /></ErrorBoundary>} />

              {/* Format Conversions */}
              <Route path="/convert" element={<ErrorBoundary componentName="Convert PDF"><ConvertPdf /></ErrorBoundary>} />
              <Route path="/pdf-to-word" element={<ErrorBoundary componentName="PDF to Word"><PdfToWord /></ErrorBoundary>} />
              <Route path="/pdf-to-powerpoint" element={<ErrorBoundary componentName="PDF to PowerPoint"><PdfToPowerPoint /></ErrorBoundary>} />
              <Route path="/word-to-pdf" element={<ErrorBoundary componentName="Word to PDF"><WordToPdf /></ErrorBoundary>} />
              <Route path="/powerpoint-to-pdf" element={<ErrorBoundary componentName="PowerPoint to PDF"><PowerPointToPdf /></ErrorBoundary>} />

              {/* AI Document Intelligence */}
              <Route path="/summarizer-qa" element={<ErrorBoundary componentName="AI Summary"><PdfSummarizerQA /></ErrorBoundary>} />
              <Route path="/ai-pdf-to-mcq" element={<ErrorBoundary componentName="AI PDF to MCQ Generator"><AiPdfToMcq /></ErrorBoundary>} />
              <Route path="/ai-interview-generator" element={<ErrorBoundary componentName="AI Interview Question Generator"><AiInterviewGenerator /></ErrorBoundary>} />
              <Route path="/ai-interview-prep" element={<ErrorBoundary componentName="AI Interview Prep"><AiInterviewGenerator /></ErrorBoundary>} />

              {/* Route Aliases */}
              <Route path="/pdf-to-jpg" element={<Navigate to="/pdf-to-img" replace />} />
              <Route path="/jpg-to-pdf" element={<Navigate to="/img-to-pdf" replace />} />
              <Route path="/merge-pdf" element={<Navigate to="/merge" replace />} />
              <Route path="/split-pdf" element={<Navigate to="/split" replace />} />
              <Route path="/scan-to-pdf" element={<Navigate to="/scan-pdf" replace />} />
              <Route path="/add-page-numbers-to-pdf" element={<Navigate to="/page-number" replace />} />

              {/* Informational & Company Pages */}
              <Route path="/about" element={<ErrorBoundary componentName="About"><About /></ErrorBoundary>} />
              <Route path="/contact" element={<ErrorBoundary componentName="Contact"><Contact /></ErrorBoundary>} />
              <Route path="/privacy-policy" element={<ErrorBoundary componentName="Privacy Policy"><PrivacyPolicy /></ErrorBoundary>} />
              <Route path="/terms-of-service" element={<ErrorBoundary componentName="Terms of Service"><TermsOfService /></ErrorBoundary>} />
              <Route path="/disclaimer" element={<ErrorBoundary componentName="Disclaimer"><Disclaimer /></ErrorBoundary>} />
              <Route path="/learn-pdf" element={<ErrorBoundary componentName="Learn PDF"><LearnPdf /></ErrorBoundary>} />
              <Route path="/blog" element={<ErrorBoundary componentName="Blog"><Blog /></ErrorBoundary>} />
              <Route path="/blog/:slug" element={<ErrorBoundary componentName="Blog Post"><BlogPost /></ErrorBoundary>} />
              <Route path="/sitemap" element={<ErrorBoundary componentName="Sitemap"><Sitemap /></ErrorBoundary>} />
              <Route path="/offline" element={<ErrorBoundary componentName="Offline"><Offline /></ErrorBoundary>} />

              {/* Admin Portal Routes */}
              <Route path="/admin/login" element={<ErrorBoundary componentName="Admin Login"><AdminLogin /></ErrorBoundary>} />
              <Route path="/admin/unauthorized" element={<ErrorBoundary componentName="Admin Unauthorized"><AdminUnauthorized /></ErrorBoundary>} />
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
                <Route path="dashboard" element={<ErrorBoundary componentName="Admin Dashboard"><AdminDashboard /></ErrorBoundary>} />
                <Route path="users" element={<ErrorBoundary componentName="Admin Users"><AdminUsers /></ErrorBoundary>} />
                <Route path="tools" element={<ErrorBoundary componentName="Admin Tools"><AdminTools /></ErrorBoundary>} />
                <Route path="analytics" element={<ErrorBoundary componentName="Admin Analytics"><AdminAnalytics /></ErrorBoundary>} />
                <Route path="announcements" element={<ErrorBoundary componentName="Admin Announcements"><AdminAnnouncements /></ErrorBoundary>} />
                <Route path="logs" element={<ErrorBoundary componentName="Admin Logs"><AdminLogs /></ErrorBoundary>} />
                <Route path="settings" element={<ErrorBoundary componentName="Admin Settings"><AdminSettings /></ErrorBoundary>} />
              </Route>

              {/* 404 Catch-All */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </Layout>
      </GlobalErrorHandler>
    </BrowserRouter>
  );
};

export default App;
