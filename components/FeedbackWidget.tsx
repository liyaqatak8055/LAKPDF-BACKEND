import React, { useState } from 'react';
import { Star, ThumbsUp, MessageSquare, X, Send } from 'lucide-react';
import { Button } from './Button';

interface FeedbackProps {
  toolName: string;
  onClose: () => void;
}

export const FeedbackWidget: React.FC<FeedbackProps> = ({ toolName, onClose }) => {
  const [step, setStep] = useState<'rating' | 'feedback' | 'thanks'>('rating');
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isUseful, setIsUseful] = useState<boolean | null>(null);

  const handleRating = (value: number) => {
    setRating(value);
    if (value >= 4) {
      setStep('thanks');
      saveFeedback(value, 'positive');
    } else {
      setStep('feedback');
    }
  };

  const saveFeedback = async (rate: number, useful: string) => {
    // Save to localStorage (in real app, send to server)
    const feedbackData = {
      tool: toolName,
      rating: rate,
      useful: useful,
      feedback: feedback,
      timestamp: Date.now(),
    };
    
    try {
      const raw = localStorage.getItem('lakpdf_feedback');
      const existing = raw ? JSON.parse(raw) : [];
      const safeArray = Array.isArray(existing) ? existing : [];
      safeArray.push(feedbackData);
      const trimmed = safeArray
        .filter((item) => item && typeof item === 'object')
        .slice(-100);
      localStorage.setItem('lakpdf_feedback', JSON.stringify(trimmed));
    } catch {
      // Ignore storage issues so UI never crashes.
    }
  };

  const handleFeedbackSubmit = () => {
    setStep('thanks');
    saveFeedback(rating, isUseful === null ? 'neutral' : isUseful ? 'positive' : 'negative');
  };

  return (
    <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8 z-50">
      {step === 'thanks' ? (
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 w-80 animate-slide-up">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ThumbsUp className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Thank You!</h3>
            <p className="text-slate-500 mb-4">Your feedback helps us improve.</p>
            <Button variant="primary" onClick={onClose}>Close</Button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 w-80 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900">How was your experience?</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <p className="text-sm text-slate-500 mb-4">
            Using <span className="font-medium text-primary-500">{toolName}</span>
          </p>

          {step === 'rating' && (
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRating(star)}
                  className="p-2 transition-transform hover:scale-110"
                >
                  <Star 
                    className={`w-8 h-8 ${
                      star <= rating 
                        ? 'text-yellow-400 fill-current' 
                        : 'text-slate-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          )}

          {step === 'feedback' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 font-medium">What could be better?</p>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setIsUseful(true)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    isUseful === true
                      ? 'bg-green-100 text-green-700 border-2 border-green-300'
                      : 'bg-slate-50 text-slate-600 border-2 border-transparent hover:border-slate-200'
                  }`}
                >
                  👍 Helpful
                </button>
                <button
                  onClick={() => setIsUseful(false)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    isUseful === false
                      ? 'bg-red-100 text-red-700 border-2 border-red-300'
                      : 'bg-slate-50 text-slate-600 border-2 border-transparent hover:border-slate-200'
                  }`}
                >
                  👎 Not helpful
                </button>
              </div>

              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Tell us more (optional)..."
                className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 
                         placeholder:text-slate-400 focus:bg-white focus:border-primary-400 
                         focus:ring-2 focus:ring-primary-100/50 outline-none transition-all resize-none"
                rows={3}
              />

              <Button variant="primary" className="w-full" onClick={handleFeedbackSubmit}>
                <Send className="w-4 h-4 mr-2" />
                Send Feedback
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Simple rating badge for tool pages
export const RatingBadge: React.FC<{ rating: number; reviews: number }> = ({ rating, reviews }) => {
  return (
    <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg">
      <Star className="w-4 h-4 text-yellow-500 fill-current" />
      <span className="text-sm font-bold text-yellow-700">{rating}</span>
      <span className="text-xs text-yellow-600">({reviews})</span>
    </div>
  );
};

// No watermark badge
export const NoWatermarkBadge: React.FC = () => {
  return (
    <div className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-xs font-semibold">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      No Watermark
    </div>
  );
};
