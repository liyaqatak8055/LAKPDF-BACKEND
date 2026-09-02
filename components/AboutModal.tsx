import React from 'react';
import { Modal } from './Modal';
import { Heart, Target, Eye } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="About Us">
      <div className="p-6">
        <p className="text-slate-600 mb-6 leading-relaxed text-sm">
          <span className="font-bold text-slate-900">LAK PDF</span> is a modern, fast, and user-friendly online platform designed to make working with PDF and image files simple and efficient. Our goal is to provide powerful document tools that anyone can use — without installing software or dealing with complicated steps.
        </p>
        
        <div className="bg-slate-50 p-5 rounded-xl mb-6 border border-slate-100">
          <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2 text-sm">
            <Heart className="w-4 h-4 text-primary-400 fill-current" />
            With LAK PDF, you can:
          </h4>
          <ul className="space-y-2.5 text-sm text-slate-600">
             {[
               "Create, compress, and convert PDF files",
               "Convert images to PDF and PDF to images",
               "Manage documents quickly and securely online",
               "Save time with smooth, browser-based tools"
             ].map((item, i) => (
               <li key={i} className="flex items-start gap-2.5">
                 <div className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-1.5 shrink-0"></div>
                 {item}
               </li>
             ))}
          </ul>
        </div>

        {/* Founder Section */}
        <div className="flex items-center gap-4 p-4 mb-6 bg-gradient-to-r from-slate-50 to-white rounded-xl border border-slate-100 shadow-sm">
           <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-md shrink-0 bg-slate-200">
             <img 
               src="/founder.jpg" 
               alt="Leyaquat Ali Khan" 
               className="w-full h-full object-cover"
               onError={(e) => {
                 e.currentTarget.src = 'https://ui-avatars.com/api/?name=Leyaquat+Ali+Khan&background=random&color=fff';
               }}
             />
           </div>
           <div>
             <h3 className="font-bold text-slate-900 text-sm">Leyaquat Ali Khan</h3>
             <p className="text-xs font-bold text-primary-500 uppercase tracking-wide">Founder & CEO</p>
           </div>
        </div>

        <p className="text-slate-600 mb-8 italic text-sm border-l-4 border-primary-200 pl-4 py-1">
          We focus on speed, simplicity, and security. Your files are processed safely, and your privacy is always respected.
        </p>

        <div className="grid grid-cols-1 gap-4">
          <div className="bg-gradient-to-br from-primary-50 to-white p-4 rounded-xl border border-primary-100">
             <div className="flex items-center gap-2 mb-2">
               <Target className="w-4 h-4 text-primary-500" />
               <h3 className="font-bold text-slate-900 text-sm">Our Mission</h3>
             </div>
             <p className="text-xs text-slate-600 leading-relaxed">To make PDF and document management easy, accessible, and reliable for everyone.</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-xl border border-blue-100">
             <div className="flex items-center gap-2 mb-2">
               <Eye className="w-4 h-4 text-blue-500" />
               <h3 className="font-bold text-slate-900 text-sm">Our Vision</h3>
             </div>
             <p className="text-xs text-slate-600 leading-relaxed">To become a trusted all-in-one document solution used worldwide.</p>
          </div>
        </div>
      </div>
    </Modal>
  );
};
