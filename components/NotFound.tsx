// 404 Not Found Component
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from './Button';
import { AdUnit } from './AdUnit';
import { Helmet } from 'react-helmet-async';
import { getAdSlot } from '../config/adsense';

const NotFound: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Page Not Found - LAK PDF</title>
        <meta name="description" content="The page you're looking for doesn't exist. Return to LAK PDF home." />
      </Helmet>

      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          {/* 404 Illustration */}
          <div className="mb-8">
            <div className="text-9xl font-bold text-slate-300 mb-4">404</div>
            <div className="text-6xl mb-4">📄</div>
          </div>

          {/* Content */}
          <h1 className="text-3xl font-bold text-slate-900 mb-4">
            Page Not Found
          </h1>

          <p className="text-slate-600 mb-8 leading-relaxed">
            The PDF tool you're looking for doesn't exist or has been moved.
            Let's get you back to creating amazing PDFs!
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link to="/">
              <Button variant="primary" size="lg">
                🏠 Go Home
              </Button>
            </Link>

            <Button
              variant="secondary"
              size="lg"
              onClick={() => window.history.back()}
            >
              ← Go Back
            </Button>
          </div>

          {/* Popular Tools */}
          <div className="text-left">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Popular Tools:
            </h3>
            <div className="grid grid-cols-1 gap-2">
              <Link
                to="/merge"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                🔗 Merge PDF
              </Link>
              <Link
                to="/compress"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                🗜️ Compress PDF
              </Link>
              <Link
                to="/img-to-pdf"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                🖼️ Image to PDF
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* AdSense - Bottom */}
      {import.meta.env.PROD && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4">
          <AdUnit
            slotId={getAdSlot("TOOL_PAGE")}
            format="horizontal"
            size="medium"
            lazy={true}
            delay={1000}
          />
        </div>
      )}
    </>
  );
};

export default NotFound;
