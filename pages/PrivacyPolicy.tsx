import React from "react";
import { Helmet } from "react-helmet-async";

export const PrivacyPolicy: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Helmet>
        <title>Privacy Policy | LAK PDF</title>
        <meta
          name="description"
          content="Privacy Policy for LAK PDF describing data handling, cookies, and advertising disclosures."
        />
      </Helmet>

      <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">Privacy Policy</h1>
      <p className="text-sm text-slate-500 mb-8">Last updated: February 24, 2026</p>

      <div className="space-y-6 text-slate-700 leading-7">
        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">1. Who We Are</h2>
          <p>
            LAK PDF provides browser-based PDF tools at <strong>lakpdf.com</strong>. This page explains how we collect,
            use, and protect information.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">2. Information We Collect</h2>
          <p>We may collect:</p>
          <ul className="list-disc pl-6">
            <li>Basic account details you provide (name and email).</li>
            <li>Technical logs such as browser type, device type, and usage analytics.</li>
            <li>Cookie/local storage data used for preferences and session continuity.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">3. Files and Document Processing</h2>
          <p>
            Most core PDF operations are processed in-browser. AI features may send extracted document text to configured
            AI providers to generate requested responses. Where server-side processing is used, files or text are handled
            only to complete the requested operation and are not used for unrelated purposes.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">4. Advertising and Cookies</h2>
          <p>
            We use Google AdSense to display ads. Google and its partners may use cookies to serve personalized or
            non-personalized ads based on your visit to this and other websites.
          </p>
          <p>
            You can manage ad personalization using Google Ad Settings:
            {" "}
            <a className="text-primary-500 hover:underline" href="https://adssettings.google.com/" target="_blank" rel="noreferrer">
              adssettings.google.com
            </a>
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">5. Third-Party Services</h2>
          <p>
            We may use trusted third-party tools for analytics, ads, security, and performance monitoring. Their data
            handling is governed by their own policies.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">6. Contact</h2>
          <p>
            For privacy requests or questions, contact:
            {" "}
            <a className="text-primary-500 hover:underline" href="mailto:liyaqatk960@gmail.com">
              liyaqatk960@gmail.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
};
