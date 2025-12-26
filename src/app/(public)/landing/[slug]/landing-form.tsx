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

export function LandingPageForm({ page }: Props) {
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
      className="min-h-screen flex items-center justify-center"
      style={{
        background: '#FAF8F5',
        padding: '3rem 1.5rem',
        position: 'relative',
      }}
    >
      {/* Background Image - matching Carrd exactly */}
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
      {/* Card Container - matches Carrd exactly */}
      <div
        className="w-full animate-fade-in"
        style={{
          maxWidth: '36rem',
        }}
      >
        {/* Main Card */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.973)',
            borderRadius: '0.5rem',
            boxShadow: '0rem 1.75rem 3.125rem 0rem rgba(0, 0, 0, 0.08)',
            overflow: 'hidden',
          }}
        >
          {/* Accent Bar */}
          <div
            style={{
              height: '0.375rem',
              width: '100%',
              background: colors.accent,
            }}
          />

          <div
            style={{
              padding: '3rem',
            }}
          >
            {/* Featured Image */}
            {page.featured_image_url && (
              <div
                style={{
                  marginBottom: '2rem',
                  marginLeft: '-1rem',
                  marginRight: '-1rem',
                }}
              >
                <img
                  src={page.featured_image_url}
                  alt=""
                  style={{
                    width: '100%',
                    height: '14rem',
                    objectFit: 'cover',
                    borderRadius: '0.25rem',
                  }}
                />
              </div>
            )}

            {/* Content */}
            <div
              style={{
                textAlign: 'center',
                marginBottom: '2rem',
              }}
            >
              {/* Badge */}
              {page.lead_magnet_type && (
                <span
                  style={{
                    display: 'inline-block',
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.6875rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    borderRadius: '9999px',
                    marginBottom: '1rem',
                    background: `${colors.accent}15`,
                    color: colors.accent,
                    fontFamily: 'var(--font-sans), "Figtree", system-ui, sans-serif',
                    fontWeight: 500,
                  }}
                >
                  Free {page.lead_magnet_type}
                </span>
              )}

              {/* Headline - Crimson Text, 1.75em, weight 400, line-height 1.25 */}
              <h1
                style={{
                  fontFamily: 'var(--font-serif), "Crimson Text", "Times New Roman", serif',
                  fontSize: '1.75em',
                  fontWeight: 400,
                  lineHeight: 1.25,
                  color: '#2C3E50',
                  marginBottom: '1rem',
                }}
              >
                {page.headline}
              </h1>

              {/* Subheadline - Figtree, 1.125em, weight 400, line-height 1.5 */}
              {page.subheadline && (
                <p
                  style={{
                    fontFamily: 'var(--font-sans), "Figtree", system-ui, sans-serif',
                    fontSize: '1.125em',
                    fontWeight: 400,
                    lineHeight: 1.5,
                    color: '#5D6D7E',
                  }}
                >
                  {page.subheadline}
                </p>
              )}
            </div>

            {/* Body Content */}
            {page.body_content && (
              <div
                style={{
                  marginBottom: '2rem',
                  textAlign: 'center',
                }}
              >
                <p
                  style={{
                    fontFamily: 'var(--font-sans), "Figtree", system-ui, sans-serif',
                    fontSize: '1em',
                    fontWeight: 400,
                    lineHeight: 1.5,
                    color: '#7F8C8D',
                  }}
                >
                  {page.body_content}
                </p>
              </div>
            )}

            {/* Divider */}
            <div
              style={{
                width: '3rem',
                height: '1px',
                margin: '0 auto 2rem',
                background: colors.accentLight,
              }}
            />

            {/* Form or Success */}
            {isSubmitted ? (
              <div
                className="animate-fade-in"
                style={{
                  textAlign: 'center',
                  padding: '2rem 0',
                }}
              >
                <div
                  style={{
                    width: '4rem',
                    height: '4rem',
                    borderRadius: '9999px',
                    margin: '0 auto 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `${colors.accent}15`,
                  }}
                >
                  <svg
                    style={{ width: '2rem', height: '2rem' }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke={colors.accent}
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2
                  style={{
                    fontFamily: 'var(--font-serif), "Crimson Text", serif',
                    fontSize: '1.5em',
                    fontWeight: 400,
                    lineHeight: 1.25,
                    color: '#2C3E50',
                    marginBottom: '0.5rem',
                  }}
                >
                  You&apos;re all set!
                </h2>
                <p
                  style={{
                    fontFamily: 'var(--font-sans), "Figtree", system-ui, sans-serif',
                    fontSize: '1em',
                    fontWeight: 400,
                    lineHeight: 1.5,
                    color: '#5D6D7E',
                  }}
                >
                  Check your inbox for your download.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {formFields.map((field, index) => (
                  <div
                    key={field.name}
                    style={{
                      marginBottom: index < formFields.length - 1 ? '1rem' : '1.5rem',
                    }}
                  >
                    <label
                      style={{
                        display: 'block',
                        fontFamily: 'var(--font-sans), "Figtree", system-ui, sans-serif',
                        fontSize: '0.6875rem',
                        fontWeight: 500,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        color: '#7F8C8D',
                        marginBottom: '0.5rem',
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
                    ) : (
                      <input
                        type={field.type}
                        name={field.name}
                        required={field.required}
                        placeholder={field.placeholder}
                        value={formData[field.name] || ''}
                        onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
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
                    )}
                  </div>
                ))}

                {error && (
                  <p
                    style={{
                      fontFamily: 'var(--font-sans), "Figtree", system-ui, sans-serif',
                      fontSize: '0.875em',
                      color: '#E74C3C',
                      textAlign: 'center',
                      marginBottom: '1rem',
                    }}
                  >
                    {error}
                  </p>
                )}

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
                    letterSpacing: '0.025em',
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
                  onMouseDown={(e) => {
                    if (!isSubmitting) {
                      e.currentTarget.style.transform = 'scale(0.98)';
                    }
                  }}
                  onMouseUp={(e) => {
                    if (!isSubmitting) {
                      e.currentTarget.style.transform = 'scale(1.02)';
                    }
                  }}
                >
                  {isSubmitting ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      <svg
                        style={{ width: '1rem', height: '1rem', animation: 'spin 1s linear infinite' }}
                        viewBox="0 0 24 24"
                      >
                        <circle
                          style={{ opacity: 0.25 }}
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          style={{ opacity: 0.75 }}
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    page.lead_magnet_title || 'Get Instant Access'
                  )}
                </button>

                <p
                  style={{
                    fontFamily: 'var(--font-sans), "Figtree", system-ui, sans-serif',
                    fontSize: '0.75em',
                    fontWeight: 400,
                    color: '#A0A0A0',
                    textAlign: 'center',
                    marginTop: '1rem',
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
