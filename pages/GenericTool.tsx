import React from 'react';
import { Wrench } from 'lucide-react';
import { Button } from '../components/Button';
import { Link } from 'react-router-dom';

export const GenericTool: React.FC<{ title: string; description: string }> = ({ title, description }) => {
  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6 text-slate-400">
        <Wrench className="w-10 h-10" />
      </div>
      <h1 className="text-3xl font-bold text-slate-900 mb-4">{title}</h1>
      <p className="text-lg text-slate-500 mb-8">{description}</p>
      
      <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-6 mb-8">
        <p className="text-yellow-800 font-medium">
          Tool Under Construction
        </p>
        <p className="text-sm text-yellow-600 mt-2">
          We are currently building the {title} feature. It will be available in the next update.
          For now, try our Merge or Image to PDF tools which are fully functional!
        </p>
      </div>

      <Link to="/">
        <Button variant="secondary">Back to Home</Button>
      </Link>
    </div>
  );
};