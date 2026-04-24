import { Star, X, CheckCircle, ThumbsUp, Clock, MessageCircle, Target, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface RatingViewProps {
  sessionPartner: {
    name: string;
    avatar: string;
    sport: string;
    position: string;
    type: 'athlete' | 'coach';
  };
  sessionDetails: {
    date: string;
    location: string;
    duration: string;
  };
  onBack?: () => void;
  onSubmit?: (rating: RatingData) => Promise<void> | void;
}

interface RatingData {
  overallRating: number;
  skillLevel: number;
  punctuality: number;
  communication: number;
  attitude: number;
  wouldTrainAgain: boolean;
  feedback: string;
}

export function RatingView({ sessionPartner, sessionDetails, onBack, onSubmit }: RatingViewProps) {
  const [overallRating, setOverallRating] = useState(0);
  const [hoverOverallRating, setHoverOverallRating] = useState(0);
  const [skillLevel, setSkillLevel] = useState(0);
  const [punctuality, setPunctuality] = useState(0);
  const [communication, setCommunication] = useState(0);
  const [attitude, setAttitude] = useState(0);
  const [wouldTrainAgain, setWouldTrainAgain] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (overallRating === 0) {
      toast.error('Please provide an overall rating');
      return;
    }

    const ratingData: RatingData = {
      overallRating,
      skillLevel,
      punctuality,
      communication,
      attitude,
      wouldTrainAgain,
      feedback,
    };

    setSubmitting(true);
    try {
      await onSubmit?.(ratingData);
      setShowSuccessModal(true);
    } catch {
      // onSubmit is expected to toast its own error
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (
    rating: number, 
    setRating: (val: number) => void, 
    hoverRating?: number, 
    setHoverRating?: (val: number) => void,
    size: 'small' | 'large' = 'small'
  ) => {
    const starSize = size === 'large' ? 'w-10 h-10' : 'w-6 h-6';
    const activeRating = hoverRating || rating;

    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating && setHoverRating(star)}
            onMouseLeave={() => setHoverRating && setHoverRating(0)}
            className="transition-transform active:scale-90"
          >
            <Star
              className={`${starSize} transition-colors ${
                star <= activeRating
                  ? 'text-amber-400 fill-amber-400'
                  : 'text-slate-300'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 px-6 py-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-white/10 rounded-full transition-colors -ml-2"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
          )}
          <h2 className="text-white font-semibold">Rate Your Session</h2>
        </div>

        {/* Partner Info Card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
              {sessionPartner.avatar}
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold">{sessionPartner.name}</h3>
              <p className="text-sm text-indigo-100">{sessionPartner.position} • {sessionPartner.sport}</p>
            </div>
            <div className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-lg text-xs text-white border border-white/30">
              {sessionPartner.type === 'coach' ? 'Coach' : 'Athlete'}
            </div>
          </div>
          
          {/* Session Details */}
          <div className="flex flex-wrap gap-3 text-sm text-indigo-100">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{sessionDetails.date}</span>
            </div>
            <div className="flex items-center gap-1">
              <Target className="w-4 h-4" />
              <span>{sessionDetails.duration}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Rating Form */}
      <div className="p-6 space-y-6">
        {/* Overall Rating */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="text-slate-900 font-semibold mb-2">Overall Experience</h3>
          <p className="text-sm text-slate-600 mb-4">How was your session with {sessionPartner.name}?</p>
          
          <div className="flex flex-col items-center gap-3">
            {renderStars(overallRating, setOverallRating, hoverOverallRating, setHoverOverallRating, 'large')}
            <p className="text-sm text-slate-500">
              {overallRating === 0 && 'Tap to rate'}
              {overallRating === 1 && 'Poor'}
              {overallRating === 2 && 'Fair'}
              {overallRating === 3 && 'Good'}
              {overallRating === 4 && 'Very Good'}
              {overallRating === 5 && 'Excellent'}
            </p>
          </div>
        </div>

        {/* Category Ratings */}
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
          <h3 className="text-slate-900 font-semibold mb-1">Rate Specific Areas</h3>
          <p className="text-sm text-slate-600 mb-4">Help others understand your experience</p>

          {/* Skill Level */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-slate-700 font-medium">Skill Level</span>
              </div>
              {renderStars(skillLevel, setSkillLevel)}
            </div>
            <p className="text-xs text-slate-500 ml-7">how well skill level meets their designated level of play</p>
          </div>

          {/* Punctuality */}
          <div className="border-t border-slate-100 pt-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" />
                <span className="text-sm text-slate-700 font-medium">Punctuality</span>
              </div>
              {renderStars(punctuality, setPunctuality)}
            </div>
            <p className="text-xs text-slate-500 ml-7">On-time arrival and reliability</p>
          </div>

          {/* Communication */}
          <div className="border-t border-slate-100 pt-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-purple-600" />
                <span className="text-sm text-slate-700 font-medium">Communication</span>
              </div>
              {renderStars(communication, setCommunication)}
            </div>
            <p className="text-xs text-slate-500 ml-7">Clear and responsive messaging</p>
          </div>

          {/* Attitude */}
          <div className="border-t border-slate-100 pt-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ThumbsUp className="w-5 h-5 text-amber-600" />
                <span className="text-sm text-slate-700 font-medium">Attitude</span>
              </div>
              {renderStars(attitude, setAttitude)}
            </div>
            <p className="text-xs text-slate-500 ml-7">Positive and respectful demeanor</p>
          </div>
        </div>

        {/* Would Train Again */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="text-slate-900 font-semibold mb-3">Would you train with {sessionPartner.name} again?</h3>
          
          <div className="flex gap-3">
            <button
              onClick={() => setWouldTrainAgain(true)}
              className={`flex-1 py-3 rounded-xl border-2 transition-all ${
                wouldTrainAgain
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                  : 'border-slate-300 text-slate-700 hover:border-slate-400'
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <ThumbsUp className={`w-6 h-6 ${wouldTrainAgain ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className="text-sm font-medium">Yes</span>
              </div>
            </button>
            
            <button
              onClick={() => setWouldTrainAgain(false)}
              className={`flex-1 py-3 rounded-xl border-2 transition-all ${
                !wouldTrainAgain
                  ? 'bg-red-50 border-red-500 text-red-700'
                  : 'border-slate-300 text-slate-700 hover:border-slate-400'
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <X className={`w-6 h-6 ${!wouldTrainAgain ? 'text-red-600' : 'text-slate-400'}`} />
                <span className="text-sm font-medium">No</span>
              </div>
            </button>
          </div>
        </div>

        {/* Written Feedback */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="text-slate-900 font-semibold mb-2">Additional Feedback</h3>
          <p className="text-sm text-slate-600 mb-3">Share more details about your experience (optional)</p>
          
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="What went well? What could be improved? Any specific highlights..."
            rows={5}
            maxLength={500}
            className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none transition-colors resize-none"
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-slate-500">Your feedback helps the community</p>
            <p className="text-xs text-slate-400">{feedback.length}/500</p>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-xs text-blue-800 leading-relaxed">
            <strong>Privacy Note:</strong> After administrative review, your rating will be visible to {sessionPartner.name} and may be displayed on their profile. Written feedback is private and only used to improve the community.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2 pb-20">
          <button
            onClick={onBack}
            className="flex-1 px-4 py-4 rounded-xl border-2 border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={overallRating === 0 || submitting}
            className={`flex-1 px-4 py-4 rounded-xl font-medium transition-all shadow-sm ${
              overallRating === 0 || submitting
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white active:scale-[0.98]'
            }`}
          >
            {submitting ? 'Submitting…' : 'Submit Rating'}
          </button>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-8 text-center">
            <div className="w-20 h-20 bg-emerald-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-slate-900 font-semibold text-xl mb-2">Rating Submitted!</h3>
            <p className="text-slate-600 mb-2">
              Thank you for your feedback. Your rating is under admin review and will appear on their profile once approved.
            </p>
            <p className="text-sm text-slate-400 mb-6">This usually takes less than 24 hours.</p>
            <button
              onClick={() => {
                setShowSuccessModal(false);
                onBack && onBack();
              }}
              className="w-full bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white py-3 rounded-xl transition-all shadow-sm"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}