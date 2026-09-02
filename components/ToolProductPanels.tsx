import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FileText, HardDrive, ShieldCheck, Workflow } from 'lucide-react';

interface RelatedAction {
  label: string;
  to: string;
}

interface ToolStartPanelProps {
  supportedFormats: string[];
  fileSizeNote: string;
  privacyNote: string;
  workflowSteps: string[];
}

interface NextStepPanelProps {
  title: string;
  steps: string[];
}

interface RelatedActionsProps {
  actions: RelatedAction[];
}

export const ToolStartPanel: React.FC<ToolStartPanelProps> = ({
  supportedFormats,
  fileSizeNote,
  privacyNote,
  workflowSteps,
}) => {
  return (
    <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="space-y-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <FileText className="h-4 w-4 text-primary-500" />
            Supported formats
          </div>
          <p className="text-sm text-slate-600">{supportedFormats.join(', ')}</p>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <HardDrive className="h-4 w-4 text-primary-500" />
            File size
          </div>
          <p className="text-sm text-slate-600">{fileSizeNote}</p>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <ShieldCheck className="h-4 w-4 text-primary-500" />
            Privacy
          </div>
          <p className="text-sm text-slate-600">{privacyNote}</p>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Workflow className="h-4 w-4 text-primary-500" />
            Sample workflow
          </div>
          <ol className="space-y-2 text-sm text-slate-600">
            {workflowSteps.map((step, index) => (
              <li key={step} className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </aside>
  );
};

export const NextStepPanel: React.FC<NextStepPanelProps> = ({ title, steps }) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <ol className="mt-3 space-y-2 text-sm text-slate-600">
        {steps.map((step, index) => (
          <li key={step} className="flex gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-slate-600">
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
};

export const RelatedActions: React.FC<RelatedActionsProps> = ({ actions }) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-900">Related actions</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {actions.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:border-primary-200 hover:text-primary-600"
          >
            {action.label}
            <ArrowRight className="h-4 w-4" />
          </Link>
        ))}
      </div>
    </div>
  );
};
