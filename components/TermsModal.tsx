import React from 'react';
import { Modal } from './Modal';
import { ScrollText, ShieldAlert, FileX, Scale } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Terms of Service">
      <div className="p-6 text-sm text-slate-600 space-y-6">
        <section>
          <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-primary-400" /> Acceptance of Terms
          </h4>
          <p className="leading-relaxed mb-2">
            By accessing and using LAK PDF, you accept and agree to be bound by the terms and provision of this agreement.
          </p>
        </section>

        <section>
          <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
            <FileX className="w-4 h-4 text-primary-400" /> Copyright & Content Policy
          </h4>
          <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
            <p className="font-bold text-orange-800 mb-2 text-xs uppercase tracking-wide">Strict Policy</p>
            <p className="text-orange-900 mb-2">
              LAK PDF respects the intellectual property rights of others. Users are strictly prohibited from uploading, converting, or processing content that violates copyright laws.
            </p>
            <ul className="list-disc pl-4 space-y-1 text-orange-800">
              <li>You must own the copyright or have permission to use any files you upload.</li>
              <li>We do not claim ownership of your content.</li>
              <li>We do not screen content, but we reserve the right to terminate service for repeat infringers.</li>
            </ul>
          </div>
        </section>

        <section>
          <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-primary-400" /> User Responsibility
          </h4>
          <p className="leading-relaxed">
            You are solely responsible for the data, text, software, music, sound, photographs, graphics, video, messages or other materials ("content") that you upload or process using our tools. We claim no intellectual property rights over the material you provide to the service.
          </p>
        </section>

        <section>
          <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
            <Scale className="w-4 h-4 text-primary-400" /> Limitation of Liability
          </h4>
          <p className="leading-relaxed">
            In no event shall LAK PDF be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on LAK PDF's website.
          </p>
        </section>

        <div className="pt-4 border-t border-slate-100 text-xs text-slate-400">
          Last updated: {new Date().toLocaleDateString()}
        </div>
      </div>
    </Modal>
  );
};
