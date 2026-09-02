import React from "react";
import { Helmet } from "react-helmet-async";

export const TermsOfService: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Helmet>
        <title>Terms of Service | LAK PDF</title>
        <meta
          name="description"
          content="Terms of Service for using LAK PDF tools, website access, and acceptable use."
        />
      </Helmet>

      <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">Terms of Service</h1>
      <p className="text-sm text-slate-500 mb-8">Last updated: February 24, 2026</p>

      <div className="space-y-6 text-slate-700 leading-7">
        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">1. Acceptance</h2>
          <p>
            By using lakpdf.com, you agree to these Terms. If you do not agree, please do not use the service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">2. Permitted Use</h2>
          <ul className="list-disc pl-6">
            <li>Use the service only for lawful purposes.</li>
            <li>Do not upload or process content you do not have rights to use.</li>
            <li>Do not attempt abuse, scraping attacks, or service disruption.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">3. Intellectual Property</h2>
          <p>
            LAK PDF branding, design, and code are protected. You retain ownership of your uploaded or processed files.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">4. Service Availability</h2>
          <p>
            We may update, suspend, or discontinue features at any time. We do not guarantee uninterrupted availability.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">5. Limitation of Liability</h2>
          <p>
            The service is provided on an "as is" basis. To the maximum extent permitted by law, LAK PDF is not liable
            for indirect or consequential damages arising from use of the service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">6. Contact</h2>
          <p>
            Questions about these Terms:
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
