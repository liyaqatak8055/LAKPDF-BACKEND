import React from "react";
import { Helmet } from "react-helmet-async";

export const Disclaimer: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Helmet>
        <title>Disclaimer | LAK PDF</title>
        <meta
          name="description"
          content="Disclaimer and advertising disclosure for LAK PDF."
        />
      </Helmet>

      <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">Disclaimer</h1>
      <p className="text-sm text-slate-500 mb-8">Last updated: February 24, 2026</p>

      <div className="space-y-6 text-slate-700 leading-7">
        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">General Information</h2>
          <p>
            Content and tools on lakpdf.com are provided for general informational and utility purposes only. We make
            reasonable efforts to keep information accurate, but we do not guarantee completeness or suitability for every
            use case.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">No Professional Advice</h2>
          <p>
            Nothing on this website should be treated as legal, financial, medical, or professional advice.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Advertising Disclosure</h2>
          <p>
            This site displays third-party advertisements, including Google AdSense. Ads are served automatically and may
            be personalized based on cookies and browsing data.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">External Links</h2>
          <p>
            We may link to third-party websites. We are not responsible for the content, policies, or practices of those
            sites.
          </p>
        </section>
      </div>
    </div>
  );
};
