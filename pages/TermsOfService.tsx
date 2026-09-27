import React from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft,
  Scale, 
  FileCheck, 
  ShieldAlert, 
  Copyright, 
  Mail, 
  CheckCircle2, 
  AlertTriangle,
  Award,
  Globe
} from "lucide-react";

export const TermsOfService: React.FC = () => {
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
        <title>Terms of Service – Fair & Transparent Terms | LAK PDF</title>
        <meta
          name="description"
          content="Terms of Service for LAK PDF. Learn about our permitted uses, user file ownership rights, client-side processing warranties, and acceptable use policy."
        />
        <meta name="keywords" content="LAK PDF terms of service, user agreement, terms of use, legal terms, document ownership" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://lakpdf.com/terms-of-service" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "Terms of Service - LAK PDF",
          "description": "Terms of Service governing the use of LAK PDF free online document tools.",
          "url": "https://lakpdf.com/terms-of-service",
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
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-50 dark:bg-primary-950/60 border border-primary-200/80 dark:border-primary-800/60 text-primary-700 dark:text-primary-300 text-xs font-semibold uppercase tracking-wider mb-5">
              <Scale className="w-3.5 h-3.5" />
              <span>User Agreement & Governance</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
              Terms of Service
            </h1>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              Clear, transparent, and fair legal terms designed to protect both our users and the LAK PDF platform.
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Last Updated & Effective: September 2026
            </p>
          </div>

          {/* ── TL;DR HIGHLIGHTS STRIP ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-14">
            <div className="p-5 rounded-2xl bg-white dark:bg-dark-surface border border-slate-200/90 dark:border-dark-border shadow-sm flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 flex-shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Free for Personal & Commercial Use</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  Students, freelancers, universities, and registered businesses are permitted to use our tools without licensing fees.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-dark-surface border border-slate-200/90 dark:border-dark-border shadow-sm flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                <Copyright className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">100% User Document Ownership</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  You retain all copyright and property rights to your documents. We claim zero rights or ownership over your files.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-dark-surface border border-slate-200/90 dark:border-dark-border shadow-sm flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex-shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Responsible & Lawful Usage</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  Users agree not to upload malware, corrupt payloads, or infringe on third-party intellectual property rights.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-dark-surface border border-slate-200/90 dark:border-dark-border shadow-sm flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex-shrink-0">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Zero Subscription Lock-in</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  No hidden trials, automatic credit card rebills, or forced watermarks on your generated documents.
                </p>
              </div>
            </div>
          </div>

          {/* ── LEGAL TERMS BODY ── */}
          <div className="bg-white dark:bg-dark-surface rounded-3xl border border-slate-200/90 dark:border-dark-border p-6 sm:p-10 shadow-sm space-y-10 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
            
            {/* Section 1 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="text-primary-500 font-bold">1.</span>
                <span>Acceptance of Terms</span>
              </h2>
              <p>
                By visiting, accessing, or utilizing any web service, software tool, or API on <strong>https://lakpdf.com</strong> ("LAK PDF"), you enter into a binding agreement to abide by these Terms of Service. If you do not accept these terms in full, you must immediately discontinue using our services.
              </p>
            </section>

            {/* Section 2 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="text-primary-500 font-bold">2.</span>
                <span>License & Permitted Use</span>
              </h2>
              <p>
                LAK PDF grants you a non-exclusive, non-transferable, revocable, worldwide license to access our platform and tools for personal, academic, educational, or commercial document processing purposes, subject to these Terms.
              </p>
              <ul className="list-disc pl-6 space-y-1.5 text-slate-600 dark:text-slate-300">
                <li>You may use LAK PDF without registering an account.</li>
                <li>You may convert, merge, compress, sign, or edit an unlimited number of documents.</li>
                <li>You agree not to bypass rate limits or compromise server stability.</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="text-primary-500 font-bold">3.</span>
                <span>Document Ownership & Intellectual Property</span>
              </h2>
              <p>
                <strong>Your Files Belong to You:</strong> You retain complete, unrestricted ownership of all files, documents, text, images, and data you process through LAK PDF. We do not claim any copyright, trademark, or ownership interest in your content.
              </p>
              <p>
                <strong>LAK PDF Platform Rights:</strong> All intellectual property rights in the website, including its brand name, logos, original software code, user interface designs, and documentation, remain the exclusive property of LAK PDF.
              </p>
            </section>

            {/* Section 4 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="text-primary-500 font-bold">4.</span>
                <span>Acceptable Use & Prohibited Conduct</span>
              </h2>
              <p>When using LAK PDF, you strictly agree NOT to:</p>
              <ul className="list-disc pl-6 space-y-2 text-slate-600 dark:text-slate-300">
                <li>Process documents containing malicious software, viruses, Trojan horses, or corrupted code designed to harm web browsers or infrastructure.</li>
                <li>Use automated scripts, bots, or scrapers to perform Denial-of-Service (DoS) attacks or degrade service performance for other users.</li>
                <li>Process, forge, or alter documents for fraudulent or unlawful purposes (such as fake identity credentials or academic dishonesty).</li>
                <li>Attempt to decompile, reverse-engineer, or extract proprietary server-side logic from the platform.</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="text-primary-500 font-bold">5.</span>
                <span>Client-Side Processing & Performance</span>
              </h2>
              <p>
                Because core operations run directly in your web browser via WebAssembly and Canvas engines, document processing speed is inherently tied to your device hardware, memory (RAM), and browser capabilities.
              </p>
              <p>
                While our tools are tested against industry-standard PDF specifications (ISO 32000), complex documents utilizing unsupported proprietary fonts or specialized print layers may render with minor visual variations. We encourage users to verify output documents before critical official submissions.
              </p>
            </section>

            {/* Section 6 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="text-primary-500 font-bold">6.</span>
                <span>Third-Party Advertisements & External Links</span>
              </h2>
              <p>
                LAK PDF integrates third-party advertising partners, notably Google AdSense, to finance free hosting and continuous development. We do not endorse or control the products or services advertised by third parties.
              </p>
            </section>

            {/* Section 7 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="text-primary-500 font-bold">7.</span>
                <span>Disclaimer of Warranties</span>
              </h2>
              <p>
                The services and tools on LAK PDF are provided strictly on an <strong>"AS IS"</strong> and <strong>"AS AVAILABLE"</strong> basis, without warranties of any kind, either express or implied, including but not limited to merchantability, fitness for a particular purpose, or non-infringement.
              </p>
            </section>

            {/* Section 8 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="text-primary-500 font-bold">8.</span>
                <span>Limitation of Liability</span>
              </h2>
              <p>
                To the fullest extent permitted by applicable law, LAK PDF, its creator, and contributors shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of data, profits, or business interruption, arising out of the use or inability to use our tools.
              </p>
            </section>

            {/* Section 9 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="text-primary-500 font-bold">9.</span>
                <span>Contacting Us</span>
              </h2>
              <p>
                If you have legal inquiries or questions regarding these Terms of Service, please contact our administrative desk:
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
