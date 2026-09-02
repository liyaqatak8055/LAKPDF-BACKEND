import React from 'react';
import { Modal } from './Modal';
import { Mail, Globe, MessageSquare } from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Contact Us">
      <div className="p-6">
        <div className="text-center mb-8">
           <div className="w-12 h-12 bg-primary-50 text-primary-500 rounded-full flex items-center justify-center mx-auto mb-4">
             <MessageSquare className="w-6 h-6" />
           </div>
           <h3 className="text-lg font-bold text-slate-900 mb-2">We’d love to hear from you!</h3>
           <p className="text-sm text-slate-500 max-w-xs mx-auto">
             If you have any questions, feedback, or need support, feel free to contact us.
           </p>
        </div>

        <div className="grid grid-cols-1 gap-3 mb-8">
          <a href="mailto:liyaqatk960@gmail.com" className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-primary-300 hover:bg-slate-50 transition-colors group">
            <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center text-primary-500 group-hover:scale-110 transition-transform">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Email</p>
              <p className="font-medium text-slate-900 text-sm break-all">liyaqatk960@gmail.com</p>
            </div>
          </a>
          
          <a href="https://www.lakpdf.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-slate-50 transition-colors group">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Website</p>
              <p className="font-medium text-slate-900 text-sm">lakpdf.com</p>
            </div>
          </a>
        </div>

        <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
          <p className="font-bold text-slate-900 mb-3 text-sm">You can reach out for:</p>
          <div className="grid grid-cols-2 gap-y-2 gap-x-4">
            {[
              "Technical support 24*7", "Feature requests", "Bug reports", "General inquiries"
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                <div className="w-1 h-1 rounded-full bg-slate-400"></div>
                {item}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 mt-5 text-center font-medium">
            Our team will get back to you as soon as possible.
          </p>
        </div>
      </div>
    </Modal>
  );
};
