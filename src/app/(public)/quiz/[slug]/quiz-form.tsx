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
        className="min-h-screen flex items-center justify-center"
        style={{
          background: '#FAF8F5',
          padding: '3rem 1.5rem',
          position: 'relative',
        }}
      >
        {/* Background Image */}
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundImage: 'url(https://havenandhold-b.carrd.co/assets/images/bg.jpg)',
            backgroundPosition: 'center',
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
            opacity: 0.15,
            pointerEvents: 'none',
          }}
        />

        <div
          className="w-full animate-fade-in"
          style={{ maxWidth: '36rem' }}
        >
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.973)',
              borderRadius: '0.5rem',
              boxShadow: '0rem 1.75rem 3.125rem 0rem rgba(0, 0, 0, 0.08)',
              overflow: 'hidden',
            }}
          >
            <div style={{ height: '0.375rem', width: '100%', background: colors.accent }} />
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <div
                style={{
                  width: '5rem',
                  height: '5rem',
                  borderRadius: '9999px',
                  margin: '0 auto 1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `${colors.accent}15`,
                }}
              >
                <svg
                  style={{ width: '2.5rem', height: '2.5rem' }}
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
                style={{
                  fontFamily: 'var(--font-serif), "Crimson Text", serif',
                  fontSize: '1.75em',
                  fontWeight: 400,
                  lineHeight: 1.25,
                  color: '#2C3E50',
                  marginBottom: '1rem',
                }}
              >
                {result.title}
              </h1>

              <p
                style={{
                  fontFamily: 'var(--font-sans), "Figtree", system-ui, sans-serif',
                  fontSize: '1.125em',
                  fontWeight: 400,
                  lineHeight: 1.5,
                  color: '#5D6D7E',
                  marginBottom: '2rem',
                }}
              >
                {result.description}
              </p>

              {result.cta_url && (
                <a
                  href={result.cta_url}
                  style={{
                    display: 'inline-block',
                    padding: '1rem 2rem',
                    borderRadius: '0.375rem',
                    fontFamily: 'var(--font-sans), "Figtree", system-ui, sans-serif',
                    fontSize: '1em',
                    fontWeight: 500,
                    color: '#FFFFFF',
                    background: colors.accent,
                    boxShadow: `0 4px 14px ${colors.accent}30`,
                    textDecoration: 'none',
                    transition: 'transform 0.2s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.02)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  {result.cta_text || 'Shop Collection'}
                </a>
              )}
            </div>
          </div>

          <p
            style={{
              fontFamily: 'var(--font-sans), "Figtree", system-ui, sans-serif',
              fontSize: '0.75em',
              fontWeight: 400,
              color: '#A0A0A0',
              textAlign: 'center',
              marginTop: '1.5rem',
            }}
          >
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
        className="min-h-screen flex items-center justify-center"
        style={{
          background: '#FAF8F5',
          padding: '3rem 1.5rem',
          position: 'relative',
        }}
      >
        {/* Background Image */}
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundImage: 'url(https://havenandhold-b.carrd.co/assets/images/bg.jpg)',
            backgroundPosition: 'center',
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
            opacity: 0.15,
            pointerEvents: 'none',
          }}
        />

        <div
          className="w-full animate-fade-in"
          style={{ maxWidth: '36rem' }}
        >
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.973)',
              borderRadius: '0.5rem',
              boxShadow: '0rem 1.75rem 3.125rem 0rem rgba(0, 0, 0, 0.08)',
              overflow: 'hidden',
            }}
          >
            <div style={{ height: '0.375rem', width: '100%', background: colors.accent }} />
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <h2
                style={{
                  fontFamily: 'var(--font-serif), "Crimson Text", serif',
                  fontSize: '1.5em',
                  fontWeight: 400,
                  lineHeight: 1.25,
                  color: '#2C3E50',
                  marginBottom: '1rem',
                }}
              >
                Almost there!
              </h2>

              <p
                style={{
                  fontFamily: 'var(--font-sans), "Figtree", system-ui, sans-serif',
                  fontSize: '1.125em',
                  fontWeight: 400,
                  lineHeight: 1.5,
                  color: '#5D6D7E',
                  marginBottom: '1.5rem',
                }}
              >
                Enter your email to see your personalized results
              </p>

              <form onSubmit={handleEmailSubmit}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  style={{
                    width: '100%',
                    padding: '0.875rem 1rem',
                    borderRadius: '0.375rem',
                    fontFamily: 'var(--font-sans), "Figtree", system-ui, sans-serif',
                    fontSize: '1em',
                    fontWeight: 400,
                    lineHeight: 1.5,
                    color: '#2C3E50',
                    background: '#FAF8F5',
                    border: '1px solid #E8E4E0',
                    outline: 'none',
                    marginBottom: '1rem',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = colors.accent;
                    e.target.style.boxShadow = `0 0 0 2px ${colors.accent}20`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E8E4E0';
                    e.target.style.boxShadow = 'none';
                  }}
                />

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    borderRadius: '0.375rem',
                    fontFamily: 'var(--font-sans), "Figtree", system-ui, sans-serif',
                    fontSize: '1em',
                    fontWeight: 500,
                    color: '#FFFFFF',
                    background: colors.accent,
                    border: 'none',
                    boxShadow: `0 4px 14px ${colors.accent}30`,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    opacity: isSubmitting ? 0.6 : 1,
                    transition: 'transform 0.2s, opacity 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSubmitting) {
                      e.currentTarget.style.transform = 'scale(1.02)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  {isSubmitting ? 'Loading...' : 'See My Results'}
                </button>
              </form>

              <p
                style={{
                  fontFamily: 'var(--font-sans), "Figtree", system-ui, sans-serif',
                  fontSize: '0.75em',
                  fontWeight: 400,
                  color: '#A0A0A0',
                  marginTop: '1rem',
                }}
              >
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
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: '#FAF8F5',
          padding: '3rem 1.5rem',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-sans), "Figtree", system-ui, sans-serif',
            color: '#5D6D7E',
          }}
        >
          No questions available
        </p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: '#FAF8F5',
        padding: '3rem 1.5rem',
        position: 'relative',
      }}
    >
      {/* Background Image */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: 'url(https://havenandhold-b.carrd.co/assets/images/bg.jpg)',
          backgroundPosition: 'center',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          opacity: 0.15,
          pointerEvents: 'none',
        }}
      />

      {/* Progress Bar */}
      <div
        style={{
          width: '100%',
          maxWidth: '36rem',
          margin: '0 auto 2rem',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontFamily: 'var(--font-sans), "Figtree", system-ui, sans-serif',
            fontSize: '0.75em',
            color: '#7F8C8D',
            marginBottom: '0.5rem',
          }}
        >
          <span>Question {currentQuestion + 1} of {questions.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div
          style={{
            width: '100%',
            height: '0.375rem',
            background: '#E8E4E0',
            borderRadius: '9999px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: colors.accent,
              transition: 'width 0.5s ease',
            }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div
        className="flex-1 flex items-center justify-center"
        style={{ position: 'relative' }}
      >
        <div
          className="w-full animate-fade-in"
          style={{ maxWidth: '36rem' }}
        >
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.973)',
              borderRadius: '0.5rem',
              boxShadow: '0rem 1.75rem 3.125rem 0rem rgba(0, 0, 0, 0.08)',
              overflow: 'hidden',
            }}
          >
            <div style={{ height: '0.375rem', width: '100%', background: colors.accent }} />
            <div style={{ padding: '3rem' }}>
              <h2
                style={{
                  fontFamily: 'var(--font-serif), "Crimson Text", serif',
                  fontSize: '1.5em',
                  fontWeight: 400,
                  lineHeight: 1.25,
                  color: '#2C3E50',
                  textAlign: 'center',
                  marginBottom: '2rem',
                }}
              >
                {question.text}
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {question.answers?.map((answer) => (
                  <button
                    key={answer.id}
                    onClick={() => handleAnswer(question.id, answer)}
                    style={{
                      width: '100%',
                      padding: '1rem',
                      textAlign: 'left',
                      borderRadius: '0.375rem',
                      fontFamily: 'var(--font-sans), "Figtree", system-ui, sans-serif',
                      fontSize: '1em',
                      fontWeight: 400,
                      lineHeight: 1.5,
                      color: '#2C3E50',
                      background: answers[question.id] === answer.id ? `${colors.accent}15` : '#FAF8F5',
                      border: `1px solid ${answers[question.id] === answer.id ? colors.accent : '#E8E4E0'}`,
                      cursor: 'pointer',
                      transition: 'transform 0.2s, border-color 0.2s, background 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.01)';
                      if (answers[question.id] !== answer.id) {
                        e.currentTarget.style.borderColor = colors.accent;
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      if (answers[question.id] !== answer.id) {
                        e.currentTarget.style.borderColor = '#E8E4E0';
                      }
                    }}
                    onMouseDown={(e) => {
                      e.currentTarget.style.transform = 'scale(0.99)';
                    }}
                    onMouseUp={(e) => {
                      e.currentTarget.style.transform = 'scale(1.01)';
                    }}
                  >
                    {answer.text}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p
            style={{
              fontFamily: 'var(--font-sans), "Figtree", system-ui, sans-serif',
              fontSize: '0.75em',
              fontWeight: 400,
              color: '#A0A0A0',
              textAlign: 'center',
              marginTop: '1.5rem',
            }}
          >
            Haven & Hold
          </p>
        </div>
      </div>
    </div>
  );
}
