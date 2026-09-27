import React from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft,
  ShieldCheck, 
  Lock, 
  EyeOff, 
  ServerOff, 
  Cookie, 
  Mail, 
  CheckCircle2, 
  FileText, 
  Globe, 
  Scale 
} from "lucide-react";

export const PrivacyPolicy: React.FC = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <>
      <Helmet>
        <title>Privacy Policy – Client-Side Data Protection | LAK PDF</title>
        <meta
          name="description"
          content="Official Privacy Policy for LAK PDF. Understand our client-side WebAssembly document processing, zero server storage guarantees, and Google AdSense advertising disclosures."
        />
        <meta name="keywords" content="LAK PDF privacy policy, pdf privacy, client side pdf, zero server storage, gdpr pdf, adsense privacy policy" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://lakpdf.com/privacy-policy" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "Privacy Policy - LAK PDF",
          "description": "Privacy Policy for LAK PDF explaining client-side document processing, data privacy, and cookie disclosures.",
          "url": "https://lakpdf.com/privacy-policy",
          "publisher": {
            "@type": "Organization",
            "name": "LAK PDF",
            "url": "https://lakpdf.com"
          }
        })}</script>
      </Helmet>

      <div className="min-h-screen py-8 md:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Back Button */}
          <div className="mb-6 sm:mb-8">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-dark-surface border border-slate-200/90 dark:border-dark-border shadow-xs hover:shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all group"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1 text-slate-500 dark:text-slate-400 group-hover:text-primary-500" />
              <span>Back</span>
            </button>
          </div>

          {/* ── HEADER ── */}
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Privacy-First Architecture</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
              Privacy Policy
            </h1>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              At LAK PDF, your document privacy is not an afterthought — it is our core engineering standard.
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Last Updated & Verified: September 2026
            </p>
          </div>

          {/* ── KEY TAKEAWAYS / TL;DR STRIP ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-14">
            <div className="p-5 rounded-2xl bg-white dark:bg-dark-surface border border-slate-200/90 dark:border-dark-border shadow-sm flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                <ServerOff className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Zero Server File Storage</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  Your files are processed in your browser's local memory via WebAssembly. We do not store, copy, or retain your documents.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-dark-surface border border-slate-200/90 dark:border-dark-border shadow-sm flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 flex-shrink-0">
                <EyeOff className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">We Never View or Sell Data</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  No employee, automated bot, or advertiser can view the contents of your PDFs, scanned forms, photos, or signatures.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-dark-surface border border-slate-200/90 dark:border-dark-border shadow-sm flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex-shrink-0">
                <Cookie className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Transparent Ad Policies</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  We use Google AdSense to sustain free tools. You can opt out of personalized cookies at any time.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-dark-surface border border-slate-200/90 dark:border-dark-border shadow-sm flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">GDPR & DPDP 2023 Compliant</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  Engineered to respect international privacy standards, including European GDPR and India's Digital Personal Data Protection Act.
                </p>
              </div>
            </div>
          </div>

          {/* ── LEGAL CLAUSES ── */}
          <div className="bg-white dark:bg-dark-surface rounded-3xl border border-slate-200/90 dark:border-dark-border p-6 sm:p-10 shadow-sm space-y-10 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
            
            {/* Section 1 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="text-primary-500 font-bold">1.</span>
                <span>Who We Are & Scope of this Policy</span>
              </h2>
              <p>
                LAK PDF ("we", "our", or "us") operates the free online document platform located at <strong>https://lakpdf.com</strong>. This Privacy Policy governs all services, tools, software, and web applications offered under our domain.
              </p>
              <p>
                By accessing or using LAK PDF, you acknowledge and agree to the data collection and handling practices outlined in this policy. If you do not agree with this policy, please refrain from using our service.
              </p>
            </section>

            {/* Section 2 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="text-primary-500 font-bold">2.</span>
                <span>Client-Side Document Processing Architecture</span>
              </h2>
              <p>
                Unlike conventional PDF websites that transfer your sensitive files across the internet to remote servers, LAK PDF uses <strong>client-side WebAssembly, HTML5 Canvas, and modern Web Worker pipelines</strong>:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-600 dark:text-slate-300">
                <li>
                  <strong>Local In-Memory Execution:</strong> Core operations (Merge PDF, Split PDF, Compress PDF, Organize, Rotate, Crop, Sign, Govt Exam Resizer, and Image Conversions) execute completely within your device's browser memory (RAM).
                </li>
                <li>
                  <strong>No File Uploads:</strong> Your documents are never uploaded to, saved on, or indexed by our servers for these core operations.
                </li>
                <li>
                  <strong>Instant Discard:</strong> Once you close your browser tab or reload the page, your processed files are instantly flushed from your local device memory.
                </li>
              </ul>
            </section>

            {/* Section 3 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="text-primary-500 font-bold">3.</span>
                <span>Information We Collect</span>
              </h2>
              <p>We may collect limited non-personal and technical information to ensure service stability:</p>
              <ul className="list-disc pl-6 space-y-2 text-slate-600 dark:text-slate-300">
                <li>
                  <strong>Technical Device Logs:</strong> Browser version, operating system, screen resolution, language settings, and general telemetry to fix conversion bugs across different platforms.
                </li>
                <li>
                  <strong>Aggregated Analytics:</strong> Tool usage counts (e.g. how many times "Merge PDF" was executed) to understand popular tools and allocate development focus.
                </li>
                <li>
                  <strong>Communication Records:</strong> When you voluntarily email our support desk, we collect your email address and message contents solely to resolve your inquiry.
                </li>
              </ul>
            </section>

            {/* Section 4 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="text-primary-500 font-bold">4.</span>
                <span>Information We DO NOT Collect</span>
              </h2>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-dark-border space-y-2">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Strict Data Isolation Policy</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  We do not collect names, phone numbers, government ID numbers (Aadhaar, PAN, SSN), credit card details, physical addresses, or the text/images embedded within your uploaded documents.
                </p>
              </div>
            </section>

            {/* Section 5 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="text-primary-500 font-bold">5.</span>
                <span>Google AdSense & Cookie Disclosures</span>
              </h2>
              <p>
                To provide 100% free document utility tools without charging user fees or hiding features behind paywalls, LAK PDF displays advertisements through <strong>Google AdSense</strong>.
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-600 dark:text-slate-300">
                <li>
                  Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to our website or other websites.
                </li>
                <li>
                  Google's use of advertising cookies enables it and its partners to serve ads to users based on their visit to our sites and/or other sites on the Internet.
                </li>
                <li>
                  <strong>Managing Your Ad Preferences:</strong> Users may opt out of personalized advertising by visiting Google's official Ad Settings page:{" "}
                  <a 
                    href="https://adssettings.google.com/" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-primary-500 font-semibold hover:underline"
                  >
                    https://adssettings.google.com/
                  </a>.
                </li>
                <li>
                  Alternatively, users can opt out of third-party vendor cookies for personalized advertising by visiting{" "}
                  <a 
                    href="https://www.aboutads.info/choices/" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-primary-500 font-semibold hover:underline"
                  >
                    www.aboutads.info/choices/
                  </a>.
                </li>
              </ul>
            </section>

            {/* Section 6 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="text-primary-500 font-bold">6.</span>
                <span>AI Features & Data Handling</span>
              </h2>
              <p>
                For specialized AI tools (such as AI PDF Summarizer or AI PDF to MCQ), text extracted from your document is transmitted transiently to configured AI API providers (such as Google Gemini or OpenAI) solely to produce the requested answer or summary.
              </p>
              <p>
                Neither LAK PDF nor our API partners use your document text to train foundational public AI models. Data is discarded immediately following response generation.
              </p>
            </section>

            {/* Section 7 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="text-primary-500 font-bold">7.</span>
                <span>International Privacy Rights (GDPR & CCPA)</span>
              </h2>
              <p>
                Depending on your location, you hold specific statutory rights under data protection laws (including the EU General Data Protection Regulation and California Consumer Privacy Act):
              </p>
              <ul className="list-disc pl-6 space-y-1 text-slate-600 dark:text-slate-300">
                <li>Right of access and transparency regarding collected data.</li>
                <li>Right to request deletion of contact records or support correspondences.</li>
                <li>Right to opt-out of data sharing or non-essential cookies.</li>
              </ul>
            </section>

            {/* Section 8 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="text-primary-500 font-bold">8.</span>
                <span>Contacting Our Privacy Officer</span>
              </h2>
              <p>
                If you have questions, feedback, or requests regarding this Privacy Policy or your data rights, please contact our privacy compliance desk directly:
              </p>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-dark-border flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary-500" />
                <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                  Email:{" "}
                  <a href="mailto:liyaqatk960@gmail.com" className="text-primary-500 hover:underline">
                    liyaqatk960@gmail.com
                  </a>
                </span>
              </div>
            </section>

          </div>

        </div>
      </div>
    </>
  );
};
