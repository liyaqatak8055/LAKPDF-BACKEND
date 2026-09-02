import React from 'react';
import { Heart, Target, Eye } from 'lucide-react';

export const About: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-6">About Us</h1>
        <div className="w-20 h-1.5 bg-primary-400 mx-auto rounded-full"></div>
      </div>

      <div className="prose prose-lg prose-slate max-w-none text-slate-600 mb-16">
        <p className="text-xl leading-relaxed mb-8">
          <span className="font-bold text-slate-900">LAK PDF</span> is a modern, fast, and user-friendly online platform designed to make working with PDF and image files simple and efficient. Our goal is to provide powerful document tools that anyone can use — without installing software or dealing with complicated steps.
        </p>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 my-10">
          <h3 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Heart className="text-primary-400 fill-current w-6 h-6" />
            With LAK PDF, you can:
          </h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 list-none pl-0">
            {[
              "Create, compress, and convert PDF files",
              "Convert images to PDF and PDF to images",
              "Manage documents quickly and securely online",
              "Save time with smooth, browser-based tools"
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-primary-400"></div>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Founder Section */}
        <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-b from-slate-50 to-white rounded-2xl border border-slate-100 shadow-sm mb-10 text-center">
           <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg mb-4 bg-slate-200">
             <img 
               src="/founder.jpg" 
               alt="Leyaquat Ali Khan" 
               className="w-full h-full object-cover"
               onError={(e) => {
                 e.currentTarget.src = 'https://ui-avatars.com/api/?name=Leyaquat+Ali+Khan&background=random&color=fff&size=128';
               }}
             />
           </div>
           <h3 className="text-2xl font-bold text-slate-900 mb-1">Leyaquat Ali Khan</h3>
           <p className="text-primary-500 font-bold uppercase tracking-wider text-sm">Founder</p>
        </div>

        <p className="text-lg">
          We focus on speed, simplicity, and security. Your files are processed safely, and your privacy is always respected.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-gradient-to-br from-primary-50 to-white p-8 rounded-2xl border border-primary-100">
          <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-primary-500 mb-6">
            <Target className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Our Mission</h2>
          <p className="text-slate-600 leading-relaxed">
            To make PDF and document management easy, accessible, and reliable for everyone.
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-white p-8 rounded-2xl border border-blue-100">
          <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-500 mb-6">
            <Eye className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Our Vision</h2>
          <p className="text-slate-600 leading-relaxed">
            To become a trusted all-in-one document solution used worldwide.
          </p>
        </div>
      </div>
    </div>
  );
};
