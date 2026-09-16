import React from 'react';
import {
  Briefcase,
  FileText,
  Sparkles,
  Layers,
  Code2,
  Calendar,
} from 'lucide-react';
import { CandidateProfile } from './types';

interface ProfileSummaryCardProps {
  profile: CandidateProfile;
  fileName?: string;
  totalQuestions?: number;
  overview?: string;
}

export const ProfileSummaryCard: React.FC<ProfileSummaryCardProps> = ({
  profile,
  fileName,
  totalQuestions,
  overview,
}) => {
  // Aggregate verified skills across all categories
  const allSkills = Array.from(
    new Set([
      ...(profile.skills?.programming_languages || []),
      ...(profile.skills?.frameworks || []),
      ...(profile.skills?.databases || []),
      ...(profile.skills?.tools || []),
      ...((profile.skills as any)?.languages || []),
      ...((profile.skills as any)?.tools_cloud || []),
      ...((profile.skills as any)?.other || []),
    ])
  ).filter((s) => typeof s === 'string' && s.trim().length > 0);

  const displayRole = profile.target_role?.trim() || 'Not specified in document';
  const displayExperience = profile.experience_level?.trim() || 'Not specified in document';
  const displayFileName = fileName || 'Uploaded Document.pdf';
  const displayTotalQuestions = typeof totalQuestions === 'number' ? totalQuestions : 0;

  return (
    <div className="space-y-6">
      {/* 1. Interview Summary */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-primary-600" />
              AI Interview Generator
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Interview Preparation
            </h2>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold self-start sm:self-auto shadow-xs">
            <Layers className="w-3.5 h-3.5 text-rose-400" />
            <span>Questions: {displayTotalQuestions}</span>
          </div>
        </div>

        {/* Compact Metadata Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5">
          {/* Resume PDF Name */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-150/80">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-primary-600" /> Resume Document
            </p>
            <p className="text-sm font-bold text-slate-900 truncate" title={displayFileName}>
              {displayFileName}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Candidate: {profile.name || 'Candidate'}</p>
          </div>

          {/* Detected Role */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-150/80">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-blue-600" /> Detected Role
            </p>
            <p
              className={`text-sm font-bold truncate ${
                displayRole === 'Not specified in document'
                  ? 'text-slate-400 italic font-normal'
                  : 'text-slate-900'
              }`}
            >
              {displayRole}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Primary interview track</p>
          </div>

          {/* Detected Experience */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-150/80">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Detected Experience
            </p>
            <p
              className={`text-sm font-bold truncate ${
                displayExperience === 'Not specified in document'
                  ? 'text-slate-400 italic font-normal'
                  : 'text-slate-900'
              }`}
            >
              {displayExperience}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Based on resume chronology</p>
          </div>
        </div>

        {overview && (
          <p className="text-xs sm:text-sm text-slate-600 mt-5 leading-relaxed bg-slate-50/60 p-3.5 rounded-2xl border border-slate-150/60">
            <strong className="text-slate-900 font-semibold">Summary: </strong>
            {overview}
          </p>
        )}
      </div>

      {/* 2. Detected Skills */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-primary-600" />
            <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Detected Skills
            </h3>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {allSkills.length > 0
              ? `${allSkills.length} skills detected in document`
              : 'No skills explicitly detected'}
          </span>
        </div>

        {allSkills.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {allSkills.map((skill, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 transition-colors shadow-2xs"
              >
                {skill}
              </span>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-150 text-xs text-slate-500 italic">
            Not specified in document
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileSummaryCard;
