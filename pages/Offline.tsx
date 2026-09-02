import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { WifiOff, RefreshCw, Home, ArrowLeft } from 'lucide-react';

export const Offline: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Offline - LAK PDF</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <WifiOff className="w-12 h-12 text-slate-400" />
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            You are offline
          </h1>
          
          <p className="text-slate-500 mb-8">
            Check your internet connection and try again. 
            Some basic tools may still work offline.
          </p>

          <div className="space-y-4">
            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-2 bg-primary-500 text-white 
                       py-3 px-6 rounded-xl font-semibold hover:bg-primary-600 transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              Try Again
            </button>

            <Link
              to="/"
              className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-700 
                       py-3 px-6 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
            >
              <Home className="w-5 h-5" />
              Go to Homepage
            </Link>
          </div>

          {/* Offline Tools Info */}
          <div className="mt-12 p-6 bg-white rounded-xl border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-3">
              📱 Available Offline
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              If you've installed LAK PDF as an app, 
              some basic tools work without internet:
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="bg-slate-50 px-3 py-2 rounded-lg text-slate-600">
                History viewing
              </span>
              <span className="bg-slate-50 px-3 py-2 rounded-lg text-slate-600">
                Favorites
              </span>
              <span className="bg-slate-50 px-3 py-2 rounded-lg text-slate-600">
                Recently used
              </span>
              <span className="bg-slate-50 px-3 py-2 rounded-lg text-slate-600">
                Settings
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

