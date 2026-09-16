import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Mic,
  Send,
  Loader2,
  Award,
  Sparkles,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  Bot,
  User,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';
import { PrepQuestionItem, CandidateProfile, AnswerEvaluation } from './types';
import { Button } from '../Button';
import { aiService } from '../../services/aiService';

interface MockInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateProfile: CandidateProfile | null;
  questions: PrepQuestionItem[];
  language?: 'en' | 'hi' | 'hinglish';
}

interface ChatTurn {
  id: string;
  speaker: 'ai' | 'candidate';
  text: string;
  evaluation?: AnswerEvaluation;
  note?: string;
  category?: string;
  phase?: string;
}

export const MockInterviewModal: React.FC<MockInterviewModalProps> = ({
  isOpen,
  onClose,
  candidateProfile,
  questions,
  language = 'en',
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [history, isAiThinking, isEvaluating]);

  // Start interview when opened
  useEffect(() => {
    if (!isOpen) {
      setHistory([]);
      setCurrentStep(0);
      return;
    }

    const startInterview = async () => {
      setIsAiThinking(true);
      try {
        const stepData = await aiService.getMockInterviewStep({
          action: 'start',
          candidateName: candidateProfile?.name,
          role: candidateProfile?.target_role,
          currentStep: 0,
          questions,
          language,
        });

        setHistory([
          {
            id: 'init-1',
            speaker: 'ai',
            text: `${stepData.greeting}\n\n${stepData.question}`,
            note: stepData.interviewer_note,
            category: stepData.category,
            phase: stepData.phase,
          },
        ]);
      } catch {
        setHistory([
          {
            id: 'init-err',
            speaker: 'ai',
            text: `Hi ${candidateProfile?.name || 'there'}, let's begin your mock interview. Could you please introduce yourself and walk me through your technical background?`,
            note: 'Aim for a 60-90 second response focusing on your skills and passion.',
          },
        ]);
      } finally {
        setIsAiThinking(false);
      }
    };

    startInterview();
  }, [isOpen, candidateProfile, language]);

  if (!isOpen) return null;

  const handleSendAnswer = async () => {
    const answer = userInput.trim();
    if (!answer || isEvaluating || isAiThinking) return;

    // Add candidate's turn to history
    const candidateTurnId = `cand-${Date.now()}`;
    const newHistory = [
      ...history,
      {
        id: candidateTurnId,
        speaker: 'candidate' as const,
        text: answer,
      },
    ];
    setHistory(newHistory);
    setUserInput('');
    setIsEvaluating(true);

    // Get current question from history or questions list
    const lastAiTurn = [...history].reverse().find((t) => t.speaker === 'ai');
    const questionText = lastAiTurn ? lastAiTurn.text : 'Candidate background question';

    try {
      const evaluation = await aiService.evaluateInterviewAnswerDetailed(questionText, answer, {
        language,
      });

      // Update candidate message with evaluation
      setHistory((prev) =>
        prev.map((turn) => (turn.id === candidateTurnId ? { ...turn, evaluation } : turn))
      );

      // Now fetch next question
      setIsEvaluating(false);
      setIsAiThinking(true);

      const nextStepIdx = currentStep + 1;
      setCurrentStep(nextStepIdx);

      const nextStepData = await aiService.getMockInterviewStep({
        action: 'next',
        candidateName: candidateProfile?.name,
        role: candidateProfile?.target_role,
        currentStep: nextStepIdx,
        questions,
        language,
      });

      setHistory((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          speaker: 'ai',
          text: nextStepData.question,
          note: nextStepData.interviewer_note,
          category: nextStepData.category,
          phase: nextStepData.phase,
        },
      ]);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsEvaluating(false);
      setIsAiThinking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-4xl h-[90vh] max-h-[850px] shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-600 text-white flex items-center justify-center shadow-xs">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">AI Mock Interview Room</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                  Live Simulation
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Interviewer Alex • {candidateProfile?.target_role || 'Software Developer'} Candidate
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Stream */}
        <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/40">
          {history.map((turn) => {
            const isAi = turn.speaker === 'ai';

            return (
              <div
                key={turn.id}
                className={`flex gap-3 max-w-3xl ${isAi ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs shadow-xs ${
                    isAi ? 'bg-primary-600 text-white' : 'bg-slate-800 text-white'
                  }`}
                >
                  {isAi ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                <div className={`space-y-2 max-w-[85%] sm:max-w-[78%]`}>
                  {/* Bubble */}
                  <div
                    className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs whitespace-pre-line ${
                      isAi
                        ? 'bg-white border border-slate-200 text-slate-900 rounded-tl-sm'
                        : 'bg-primary-600 text-white rounded-tr-sm'
                    }`}
                  >
                    {turn.text}
                  </div>

                  {/* Interviewer whisper note */}
                  {turn.note && (
                    <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-150 text-[11px] text-blue-900 flex items-start gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>Interviewer tip: </strong> {turn.note}
                      </span>
                    </div>
                  )}

                  {/* Candidate Answer Evaluation Card */}
                  {turn.evaluation && (
                    <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2 text-xs animate-in fade-in">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs sm:text-sm">
                          <Award className="w-4 h-4 text-emerald-600" />
                          AI Score: {turn.evaluation.score} / 10
                          {turn.evaluation.verdict && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                              {turn.evaluation.verdict}
                            </span>
                          )}
                        </span>
                      </div>

                      <p className="text-slate-700 leading-relaxed">{turn.evaluation.feedback}</p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {((turn.evaluation.what_went_well && turn.evaluation.what_went_well.length > 0) ||
                          (turn.evaluation.strengths && turn.evaluation.strengths.length > 0)) && (
                          <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 text-[11px]">
                            <strong className="text-emerald-950 block mb-0.5">What went well:</strong>
                            <ul className="list-disc pl-3.5 text-emerald-900 space-y-0.5">
                              {(turn.evaluation.what_went_well || turn.evaluation.strengths || []).map(
                                (item, i) => (
                                  <li key={i}>{item}</li>
                                )
                              )}
                            </ul>
                          </div>
                        )}

                        {((turn.evaluation.areas_to_improve && turn.evaluation.areas_to_improve.length > 0) ||
                          (turn.evaluation.improvements && turn.evaluation.improvements.length > 0)) && (
                          <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-150 text-[11px]">
                            <strong className="text-amber-950 block mb-0.5">Areas to improve:</strong>
                            <ul className="list-disc pl-3.5 text-amber-900 space-y-0.5">
                              {(turn.evaluation.areas_to_improve || turn.evaluation.improvements || []).map(
                                (item, i) => (
                                  <li key={i}>{item}</li>
                                )
                              )}
                            </ul>
                          </div>
                        )}
                      </div>

                      {turn.evaluation.model_delivery && (
                        <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100 text-[11px] text-blue-900">
                          <strong className="text-blue-950 block mb-0.5">How to phrase it even better:</strong>
                          <p className="italic">"{turn.evaluation.model_delivery}"</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Thinking / Grading Indicator */}
          {(isAiThinking || isEvaluating) && (
            <div className="flex items-center gap-2.5 text-xs text-slate-500 p-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
              <span>
                {isEvaluating ? 'Interviewer evaluating your answer...' : 'Interviewer preparing next question...'}
              </span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-200 bg-white space-y-2">
          <div className="flex items-center gap-2">
            <textarea
              rows={2}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendAnswer();
                }
              }}
              placeholder="Speak or type your answer here (Press Enter to submit)..."
              disabled={isEvaluating || isAiThinking}
              className="flex-1 p-3 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-primary-500 outline-none resize-none bg-slate-50/60"
            />

            <Button
              variant="primary"
              size="md"
              disabled={!userInput.trim() || isEvaluating || isAiThinking}
              onClick={handleSendAnswer}
              className="bg-primary-600 hover:bg-primary-700 h-12 px-5 rounded-2xl shrink-0"
            >
              {isEvaluating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>Take your time to structure your thoughts using real examples from your resume.</span>
            <span>Step {currentStep + 1} of {Math.max(questions.length, 5)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
