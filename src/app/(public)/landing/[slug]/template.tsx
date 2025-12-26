'use client';

import { useState } from 'react';
import type { LandingPage, FormField } from '@/types/leads';

interface Props {
  page: LandingPage;
}

// Collection-specific accent colors
const COLLECTION_ACCENTS = {
  grounding: {
    accent: '#786350',
    accentLight: '#A89B8C',
  },
  wholeness: {
    accent: '#7A9E7E',
    accentLight: '#A4C4A8',
  },
  growth: {
    accent: '#5B7B8C',
    accentLight: '#8BAAB8',
  },
};

export function LandingPageTemplate({ page }: Props) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const collection = page.collection || 'grounding';
  const colors = COLLECTION_ACCENTS[collection as keyof typeof COLLECTION_ACCENTS] || COLLECTION_ACCENTS.grounding;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/landing-pages/${page.slug}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Submission failed');
      }

      setIsSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formFields: FormField[] = page.form_fields || [
    { name: 'email', type: 'email', label: 'Email', required: true },
  ];

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 sm:p-8"
      style={{
        background: 'linear-gradient(180deg, #FAF8F5 0%, #F5F2EE 100%)',
      }}
    >
      {/* Subtle texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          mixBlendMode: 'overlay',
        }}
      />

      <div className="relative w-full max-w-lg animate-fade-in">
        {/* Main Card */}
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(255, 255, 255, 0.97)',
            boxShadow: '0 4px 60px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04)',
          }}
        >
          {/* Accent Bar */}
          <div
            className="h-1.5 w-full"
            style={{ background: colors.accent }}
          />

          <div className="px-8 py-10 sm:px-12 sm:py-14">
            {/* Featured Image */}
            {page.featured_image_url && (
              <div className="mb-8 -mx-4 sm:-mx-6">
                <img
                  src={page.featured_image_url}
                  alt=""
                  className="w-full h-48 sm:h-56 object-cover rounded-lg"
                />
              </div>
            )}

            {/* Content */}
            <div className="text-center mb-8">
              {/* Badge */}
              {page.lead_magnet_type && (
                <span
                  className="inline-block px-3 py-1 text-xs uppercase tracking-widest rounded-full mb-4"
                  style={{
                    background: `${colors.accent}15`,
                    color: colors.accent,
                    fontFamily: 'system-ui, sans-serif',
                    fontWeight: 500,
                  }}
                >
                  Free {page.lead_magnet_type}
                </span>
              )}

              {/* Headline */}
              <h1
                className="text-2xl sm:text-3xl leading-tight mb-4"
                style={{
                  fontFamily: '"Crimson Text", "Times New Roman", serif',
                  color: '#2C3E50',
                  fontWeight: 400,
                }}
              >
                {page.headline}
              </h1>

              {/* Subheadline */}
              {page.subheadline && (
                <p
                  className="text-base sm:text-lg leading-relaxed"
                  style={{
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    color: '#5D6D7E',
                    fontWeight: 400,
                  }}
                >
                  {page.subheadline}
                </p>
              )}
            </div>

            {/* Body Content */}
            {page.body_content && (
              <div className="mb-8 text-center">
                <p
                  className="text-sm leading-relaxed"
                  style={{
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    color: '#7F8C8D',
                  }}
                >
                  {page.body_content}
                </p>
              </div>
            )}

            {/* Divider */}
            <div
              className="w-12 h-px mx-auto mb-8"
              style={{ background: colors.accentLight }}
            />

            {/* Form or Success */}
            {isSubmitted ? (
              <div className="text-center py-8 animate-fade-in">
                <div
                  className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center"
                  style={{ background: `${colors.accent}15` }}
                >
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke={colors.accent}
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2
                  className="text-xl mb-2"
                  style={{
                    fontFamily: '"Crimson Text", serif',
                    color: '#2C3E50',
                  }}
                >
                  You&apos;re all set!
                </h2>
                <p
                  className="text-sm"
                  style={{
                    fontFamily: 'system-ui, sans-serif',
                    color: '#5D6D7E',
                  }}
                >
                  Check your inbox for your download.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {formFields.map((field) => (
                  <div key={field.name}>
                    <label
                      className="block text-xs uppercase tracking-wider mb-2"
                      style={{
                        fontFamily: 'system-ui, sans-serif',
                        color: '#7F8C8D',
                        fontWeight: 500,
                      }}
                    >
                      {field.label}
                      {field.required && <span style={{ color: colors.accent }}> *</span>}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        name={field.name}
                        required={field.required}
                        placeholder={field.placeholder}
                        value={formData[field.name] || ''}
                        onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                        rows={4}
                        className="w-full px-4 py-3 rounded-lg transition-all duration-200 outline-none focus:ring-2"
                        style={{
                          fontFamily: 'system-ui, sans-serif',
                          fontSize: '0.9375rem',
                          color: '#2C3E50',
                          background: '#FAF8F5',
                          border: '1px solid #E8E4E0',
                        }}
                      />
                    ) : (
                      <input
                        type={field.type}
                        name={field.name}
                        required={field.required}
                        placeholder={field.placeholder}
                        value={formData[field.name] || ''}
                        onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg transition-all duration-200 outline-none focus:ring-2"
                        style={{
                          fontFamily: 'system-ui, sans-serif',
                          fontSize: '0.9375rem',
                          color: '#2C3E50',
                          background: '#FAF8F5',
                          border: '1px solid #E8E4E0',
                        }}
                      />
                    )}
                  </div>
                ))}

                {error && (
                  <p className="text-sm text-red-600 text-center">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-lg font-medium transition-all duration-200 disabled:opacity-60 hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    fontFamily: 'system-ui, sans-serif',
                    fontSize: '0.9375rem',
                    letterSpacing: '0.025em',
                    color: '#FFFFFF',
                    background: colors.accent,
                    boxShadow: `0 4px 14px ${colors.accent}30`,
                  }}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    page.lead_magnet_title || 'Get Instant Access'
                  )}
                </button>

                <p
                  className="text-xs text-center pt-2"
                  style={{
                    fontFamily: 'system-ui, sans-serif',
                    color: '#A0A0A0',
                  }}
                >
                  We respect your privacy. Unsubscribe anytime.
                </p>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <p
          className="text-center mt-6 text-xs"
          style={{
            fontFamily: 'system-ui, sans-serif',
            color: '#A0A0A0',
          }}
        >
          Haven & Hold
        </p>
      </div>
    </div>
  );
}
