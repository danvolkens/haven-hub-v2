'use client';

import { useState } from 'react';
import type { LandingPage, FormField } from '@/types/leads';

interface Props {
  page: LandingPage;
}

export function LandingPageForm({ page }: Props) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        position: 'relative',
        fontSize: '18pt', // Carrd root font size
      }}
    >
      {/* Background Image */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: 'url(/images/brand/bg.jpg)',
          backgroundPosition: 'center',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          pointerEvents: 'none',
        }}
      />

      {/* Card Container */}
      <div
        className="w-full animate-fade-in"
        style={{
          width: '36rem',
          maxWidth: '100%',
          padding: '3rem',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Main Card */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.973)',
            borderRadius: '0.25rem',
            boxShadow: '0rem 1.75rem 3.125rem 1.25rem rgba(0, 0, 0, 0.51)',
            padding: '3rem',
          }}
        >
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <img
              src="/images/brand/logo.png"
              alt="Haven & Hold"
              style={{
                width: '9.5rem',
                height: 'auto',
                margin: '0 auto',
              }}
            />
          </div>

          {/* Headline - Crimson Text, 1.75em, line-height 1.25 */}
          <h1
            style={{
              fontFamily: 'var(--font-serif), "Crimson Text", "Times New Roman", serif',
              fontSize: '1.75em',
              fontWeight: 400,
              lineHeight: 1.25,
              color: '#2C3E50',
              textAlign: 'center',
              marginBottom: '1.5rem',
            }}
          >
            {page.headline || 'Quiet Anchors for Turbulent Minds'}
          </h1>

          {/* Subheadline - Figtree, 1.125em, line-height 1.5 */}
          {page.subheadline && (
            <p
              style={{
                fontFamily: 'var(--font-sans), "Figtree", system-ui, sans-serif',
                fontSize: '1.125em',
                fontWeight: 400,
                lineHeight: 1.5,
                color: '#5D6D7E',
                textAlign: 'center',
                marginBottom: '1.5rem',
              }}
            >
              {page.subheadline}
            </p>
          )}

          {/* Body Content */}
          {page.body_content && (
            <p
              style={{
                fontFamily: 'var(--font-sans), "Figtree", system-ui, sans-serif',
                fontSize: '1.125em',
                fontWeight: 400,
                lineHeight: 1.5,
                color: '#5D6D7E',
                textAlign: 'center',
                marginBottom: '1.5rem',
              }}
            >
              {page.body_content}
            </p>
          )}

          {/* Featured Image */}
          {page.featured_image_url && (
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <img
                src={page.featured_image_url}
                alt=""
                style={{
                  width: '16.875rem',
                  maxWidth: '100%',
                  height: 'auto',
                  borderRadius: '0.5rem',
                  margin: '0 auto',
                }}
              />
            </div>
          )}

          {/* CTA Text */}
          {page.lead_magnet_title && (
            <p
              style={{
                fontFamily: 'var(--font-sans), "Figtree", system-ui, sans-serif',
                fontSize: '1.125em',
                fontWeight: 400,
                lineHeight: 1.5,
                color: '#5D6D7E',
                textAlign: 'center',
                marginBottom: '1.5rem',
              }}
            >
              {page.lead_magnet_title}
            </p>
          )}

          {/* Form or Success */}
          {isSubmitted ? (
            <div
              className="animate-fade-in"
              style={{
                textAlign: 'center',
                padding: '1.5rem 0',
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
                  background: 'rgba(44, 62, 80, 0.1)',
                }}
              >
                <svg
                  style={{ width: '2rem', height: '2rem' }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="#2C3E50"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2
                style={{
                  fontFamily: 'var(--font-serif), "Crimson Text", serif',
                  fontSize: '1.75em',
                  fontWeight: 400,
                  lineHeight: 1.25,
                  color: '#2C3E50',
                  marginBottom: '1.5rem',
                }}
              >
                You&apos;re all set!
              </h2>
              <p
                style={{
                  fontFamily: 'var(--font-sans), "Figtree", system-ui, sans-serif',
                  fontSize: '1.125em',
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
                    marginBottom: index < formFields.length - 1 ? '1.5rem' : '1.5rem',
                  }}
                >
                  <input
                    type={field.type}
                    name={field.name}
                    required={field.required}
                    placeholder={field.placeholder || field.label}
                    value={formData[field.name] || ''}
                    onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '0.25rem',
                      fontFamily: 'var(--font-sans), "Figtree", system-ui, sans-serif',
                      fontSize: '1.125em',
                      fontWeight: 400,
                      lineHeight: 1.5,
                      color: '#2C3E50',
                      background: '#FFFFFF',
                      border: '1px solid #E8E4E0',
                      outline: 'none',
                      transition: 'border-color 0.25s ease',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#2C3E50';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#E8E4E0';
                    }}
                  />
                </div>
              ))}

              {error && (
                <p
                  style={{
                    fontFamily: 'var(--font-sans), "Figtree", system-ui, sans-serif',
                    fontSize: '1em',
                    color: '#E74C3C',
                    textAlign: 'center',
                    marginBottom: '1.5rem',
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
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.25rem',
                  fontFamily: 'var(--font-sans), "Figtree", system-ui, sans-serif',
                  fontSize: '1.125em',
                  fontWeight: 500,
                  color: '#FFFFFF',
                  background: '#2C3E50',
                  border: 'none',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.6 : 1,
                  transition: 'opacity 0.25s ease',
                }}
              >
                {isSubmitting ? 'Processing...' : 'Join the List'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
