import type {
  PrepQuestionItem,
  CandidateProfile,
  ResumeAnalysisData,
  ProjectDeepDive,
  ReadinessScore,
  AnswerEvaluation,
  InterviewPrepKit,
} from '../../services/aiService';

export type PriorityFilter = 'all' | 'must_prepare' | 'important' | 'additional_practice';
export type DifficultyFilter = 'all' | 'easy' | 'medium' | 'hard' | 'advanced';
export type CategoryFilter = 'all' | 'Technical' | 'Projects' | 'HR' | 'Coding' | string;
export type SortOption = 'priority' | 'difficulty' | 'category';
export type AppLanguage = 'en' | 'hi' | 'hinglish';

export interface InterviewFilterState {
  searchQuery: string;
  category: CategoryFilter;
  difficulty: DifficultyFilter;
  priority: PriorityFilter;
  project: string;
  sort: SortOption;
  onlyUnprepared: boolean;
}

export interface MockMessage {
  id: string;
  role: 'interviewer' | 'candidate' | 'evaluation';
  content: string;
  timestamp: number;
  questionIndex?: number;
  evaluation?: {
    score: number;
    verdict?: string;
    feedback: string;
    what_went_well: string[];
    areas_to_improve: string[];
    model_delivery?: string;
  };
}

export type {
  PrepQuestionItem,
  CandidateProfile,
  ResumeAnalysisData,
  ProjectDeepDive,
  ReadinessScore,
  AnswerEvaluation,
  InterviewPrepKit,
};
