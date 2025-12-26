'use client';

import { useState } from 'react';

interface QuizAnswer {
  id: string;
  text: string;
  scores: { grounding: number; wholeness: number; growth: number };
}

interface QuizQuestion {
  id: string;
  text: string;
  type: string;
  answers: QuizAnswer[];
}

interface QuizResult {
  collection: string;
  title: string;
  description: string;
  cta_text: string;
  cta_url: string;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  slug: string;
  require_email: boolean;
  questions: QuizQuestion[];
  results: QuizResult[];
}

interface Props {
  quiz: Quiz;
}

const COLLECTION_COLORS = {
  grounding: { accent: '#786350', bg: '#FAF6F1' },
  wholeness: { accent: '#7A9E7E', bg: '#F5FAF6' },
  growth: { accent: '#5B7B8C', bg: '#F5F8FA' },
};

export function QuizForm({ quiz }: Props) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [scores, setScores] = useState({ grounding: 0, wholeness: 0, growth: 0 });
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [result, setResult] = useState<QuizResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const questions = quiz.questions || [];
  const progress = questions.length > 0 ? ((currentQuestion + 1) / questions.length) * 100 : 0;

  const handleAnswer = (questionId: string, answer: QuizAnswer) => {
    setAnswers({ ...answers, [questionId]: answer.id });

    // Add answer scores
    const newScores = {
      grounding: scores.grounding + (answer.scores?.grounding || 0),
      wholeness: scores.wholeness + (answer.scores?.wholeness || 0),
      growth: scores.growth + (answer.scores?.growth || 0),
    };
    setScores(newScores);

    // Move to next question or show results
    if (currentQuestion < questions.length - 1) {
      setTimeout(() => setCurrentQuestion(currentQuestion + 1), 300);
    } else {
      // Quiz complete - show email form or results
      if (quiz.require_email) {
        setShowEmailForm(true);
      } else {
        calculateResult(newScores);
      }
    }
  };

  const calculateResult = (finalScores: typeof scores) => {
    const maxCollection = Object.entries(finalScores).reduce((a, b) =>
      a[1] > b[1] ? a : b
    )[0] as keyof typeof finalScores;

    const quizResult = quiz.results?.find((r) => r.collection === maxCollection);
    setResult(quizResult || null);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    try {
      await fetch(`/api/quiz/${quiz.slug}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, answers, scores }),
      });
    } catch (error) {
      console.error('Failed to submit quiz:', error);
    } finally {
      setIsSubmitting(false);
      calculateResult(scores);
    }
  };

  const getWinningCollection = () => {
    return Object.entries(scores).reduce((a, b) => (a[1] > b[1] ? a : b))[0] as keyof typeof COLLECTION_COLORS;
  };

  const colors = COLLECTION_COLORS[getWinningCollection()] || COLLECTION_COLORS.grounding;

  // Show result
  if (result) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: colors.bg }}
      >
        <div className="w-full max-w-lg animate-fade-in">
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(255, 255, 255, 0.97)',
              boxShadow: '0 4px 60px rgba(0, 0, 0, 0.08)',
            }}
          >
            <div className="h-1.5 w-full" style={{ background: colors.accent }} />
            <div className="p-8 sm:p-12 text-center">
              <div
                className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                style={{ background: `${colors.accent}15` }}
              >
                <svg
                  className="w-10 h-10"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke={colors.accent}
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                  />
                </svg>
              </div>

              <h1
                className="text-2xl sm:text-3xl mb-4"
                style={{
                  fontFamily: '"Crimson Text", serif',
                  color: '#2C3E50',
                }}
              >
                {result.title}
              </h1>

              <p
                className="text-base sm:text-lg mb-8 leading-relaxed"
                style={{
                  fontFamily: 'system-ui, sans-serif',
                  color: '#5D6D7E',
                }}
              >
                {result.description}
              </p>

              {result.cta_url && (
                <a
                  href={result.cta_url}
                  className="inline-block px-8 py-4 rounded-lg font-medium transition-all hover:scale-[1.02]"
                  style={{
                    background: colors.accent,
                    color: '#FFFFFF',
                    boxShadow: `0 4px 14px ${colors.accent}30`,
                  }}
                >
                  {result.cta_text || 'Shop Collection'}
                </a>
              )}
            </div>
          </div>

          <p className="text-center mt-6 text-xs" style={{ color: '#A0A0A0' }}>
            Haven & Hold
          </p>
        </div>
      </div>
    );
  }

  // Show email form
  if (showEmailForm) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(180deg, #FAF8F5 0%, #F5F2EE 100%)' }}
      >
        <div className="w-full max-w-lg animate-fade-in">
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(255, 255, 255, 0.97)',
              boxShadow: '0 4px 60px rgba(0, 0, 0, 0.08)',
            }}
          >
            <div className="h-1.5 w-full" style={{ background: colors.accent }} />
            <div className="p-8 sm:p-12 text-center">
              <h2
                className="text-xl sm:text-2xl mb-4"
                style={{
                  fontFamily: '"Crimson Text", serif',
                  color: '#2C3E50',
                }}
              >
                Almost there!
              </h2>

              <p
                className="text-base mb-6"
                style={{
                  fontFamily: 'system-ui, sans-serif',
                  color: '#5D6D7E',
                }}
              >
                Enter your email to see your personalized results
              </p>

              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full px-4 py-3 rounded-lg outline-none focus:ring-2"
                  style={{
                    background: '#FAF8F5',
                    border: '1px solid #E8E4E0',
                    fontFamily: 'system-ui, sans-serif',
                  }}
                />

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-lg font-medium transition-all disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
                  style={{
                    background: colors.accent,
                    color: '#FFFFFF',
                  }}
                >
                  {isSubmitting ? 'Loading...' : 'See My Results'}
                </button>
              </form>

              <p className="text-xs mt-4" style={{ color: '#A0A0A0' }}>
                We respect your privacy. Unsubscribe anytime.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show quiz questions
  const question = questions[currentQuestion];
  if (!question) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p>No questions available</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col p-4"
      style={{ background: 'linear-gradient(180deg, #FAF8F5 0%, #F5F2EE 100%)' }}
    >
      {/* Progress Bar */}
      <div className="w-full max-w-lg mx-auto mb-8">
        <div className="flex justify-between text-xs mb-2" style={{ color: '#7F8C8D' }}>
          <span>Question {currentQuestion + 1} of {questions.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background: colors.accent,
            }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-lg animate-fade-in">
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(255, 255, 255, 0.97)',
              boxShadow: '0 4px 60px rgba(0, 0, 0, 0.08)',
            }}
          >
            <div className="h-1.5 w-full" style={{ background: colors.accent }} />
            <div className="p-8 sm:p-12">
              <h2
                className="text-xl sm:text-2xl text-center mb-8"
                style={{
                  fontFamily: '"Crimson Text", serif',
                  color: '#2C3E50',
                }}
              >
                {question.text}
              </h2>

              <div className="space-y-3">
                {question.answers?.map((answer) => (
                  <button
                    key={answer.id}
                    onClick={() => handleAnswer(question.id, answer)}
                    className="w-full p-4 text-left rounded-lg transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                    style={{
                      background: answers[question.id] === answer.id ? `${colors.accent}15` : '#FAF8F5',
                      border: `1px solid ${answers[question.id] === answer.id ? colors.accent : '#E8E4E0'}`,
                      fontFamily: 'system-ui, sans-serif',
                      color: '#2C3E50',
                    }}
                  >
                    {answer.text}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="text-center mt-6 text-xs" style={{ color: '#A0A0A0' }}>
            Haven & Hold
          </p>
        </div>
      </div>
    </div>
  );
}
