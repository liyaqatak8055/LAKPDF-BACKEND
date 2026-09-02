import React from 'react';
import { Modal } from './Modal';
import { Shield, Lock, EyeOff, Server, FileCheck } from 'lucide-react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Privacy Policy">
      <div className="p-6 text-sm text-slate-600 space-y-6">
        <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex gap-3">
          <div className="bg-green-100 p-2 rounded-lg h-fit">
            <Shield className="w-5 h-5 text-green-600 shrink-0" />
          </div>
          <div>
            <h4 className="font-bold text-green-800 mb-1">Your Files Are Safe</h4>
            <p className="text-green-700 text-xs leading-relaxed">
              We do not upload your files to any server. All PDF processing happens directly in your browser using secure web technologies. Your documents never leave your device.
            </p>
          </div>
        </div>

        <section>
          <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
            <EyeOff className="w-4 h-4 text-primary-400" /> Information Collection
          </h4>
          <p className="leading-relaxed mb-3">
            LAK PDF ("we", "our", or "us") operates www.lakpdf.com. We prioritize your privacy and transparency.
          </p>
          <ul className="space-y-2">
            <li className="flex gap-2 items-start">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 shrink-0"></div>
              <span>We do not collect, view, or store the content of the files you process on this tool.</span>
            </li>
            <li className="flex gap-2 items-start">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 shrink-0"></div>
              <span>We may collect anonymous usage statistics (e.g., tools used) to improve performance.</span>
            </li>
            <li className="flex gap-2 items-start">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 shrink-0"></div>
              <span>We use local storage cookies to save your user preferences and session state.</span>
            </li>
          </ul>
        </section>

        <section>
          <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
            <Server className="w-4 h-4 text-primary-400" /> Third-Party Services
          </h4>
          <p className="leading-relaxed mb-2">
            We use trusted third-party services that may collect information to support our website functionality.
          </p>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
            <p className="font-bold text-slate-700 mb-1">Google AdSense</p>
            <p>We use Google AdSense to display advertisements. Google may use cookies to serve ads based on your prior visits to our website or other websites.</p>
          </div>
        </section>

        <section>
          <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary-400" /> Security
          </h4>
          <p className="leading-relaxed">
            We value your trust in using our tools. Since all critical processing is done client-side (on your own computer), potential security risks associated with file uploads are eliminated.
          </p>
        </section>

        <section className="border-t border-slate-100 pt-4 mt-4">
          <h4 className="font-bold text-slate-900 mb-2 text-xs uppercase tracking-wide">Contact Us</h4>
          <p className="text-xs text-slate-500">
            If you have any questions about our Privacy Policy, do not hesitate to contact us at <a href="mailto:liyaqatk960@gmail.com" className="text-primary-500 font-medium hover:underline">liyaqatk960@gmail.com</a>.
          </p>
        </section>
      </div>
    </Modal>
  );
};
