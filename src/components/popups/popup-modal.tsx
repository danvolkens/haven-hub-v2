'use client';

import { useState, useEffect } from 'react';
import { Popup } from '@/types/popups';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import { recordConversion } from '@/lib/popups/frequency-tracker';

interface PopupModalProps {
  popup: Popup;
  onClose: () => void;
  onConversion: () => void;
}

export function PopupModal({ popup, onClose, onConversion }: PopupModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 200);
  };

  const handleOverlayClick = () => {
    if (popup.close_on_overlay_click) {
      handleClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Submit to lead capture API
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source: 'popup',
          popup_id: popup.id,
        }),
      });

      recordConversion(popup.id);
      onConversion();
      setShowSuccess(true);

      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error) {
      console.error('Popup submission failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPositionStyles = (): string => {
    switch (popup.position) {
      case 'top': return 'items-start pt-20';
      case 'bottom': return 'items-end pb-20';
      case 'top_left': return 'items-start justify-start pt-20 pl-20';
      case 'top_right': return 'items-start justify-end pt-20 pr-20';
      case 'bottom_left': return 'items-end justify-start pb-20 pl-20';
      case 'bottom_right': return 'items-end justify-end pb-20 pr-20';
      default: return 'items-center justify-center';
    }
  };

  const getAnimationStyles = (): string => {
    if (!isVisible) {
      switch (popup.animation) {
        case 'slide_up': return 'translate-y-8 opacity-0';
        case 'slide_down': return '-translate-y-8 opacity-0';
        case 'zoom': return 'scale-95 opacity-0';
        case 'none': return '';
        default: return 'opacity-0';
      }
    }
    return 'translate-y-0 scale-100 opacity-100';
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex ${getPositionStyles()} transition-opacity duration-200 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleOverlayClick}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black"
        style={{ opacity: popup.overlay_opacity / 100 }}
      />

      {/* Modal */}
      <div
        className={`relative bg-white rounded-xl shadow-2xl transition-all duration-200 ${getAnimationStyles()}`}
        style={{
          maxWidth: popup.style.max_width || 480,
          backgroundColor: popup.style.background_color,
          color: popup.style.text_color,
          borderRadius: popup.style.border_radius,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        {popup.show_close_button && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-black/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* Content */}
        <div className="p-8">
          {showSuccess ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">✓</div>
              <p className="text-lg font-semibold">
                {popup.content.success_message || 'Thank you!'}
              </p>
            </div>
          ) : (
            <>
              {popup.content.image_url && (
                <img
                  src={popup.content.image_url}
                  alt=""
                  className="w-full h-48 object-cover rounded-lg mb-6"
                />
              )}

              {popup.content.headline && (
                <h2 className="text-2xl font-bold mb-2">{popup.content.headline}</h2>
              )}

              {popup.content.body && (
                <p className="text-muted-foreground mb-6">{popup.content.body}</p>
              )}

              {popup.content.discount_code && (
                <div className="bg-gray-100 rounded-lg p-4 mb-6 text-center">
                  <div className="text-sm text-muted-foreground mb-1">Your code:</div>
                  <div className="text-xl font-mono font-bold">
                    {popup.content.discount_code}
                  </div>
                </div>
              )}

              {popup.content.type === 'email_capture' && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    type="email"
                    placeholder={popup.content.email_placeholder || 'Enter your email'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                    style={{ backgroundColor: popup.style.accent_color }}
                  >
                    {isSubmitting ? 'Submitting...' : popup.content.cta_text || 'Subscribe'}
                  </Button>
                </form>
              )}

              {popup.content.type !== 'email_capture' && popup.content.cta_text && (
                <Button
                  className="w-full"
                  onClick={() => {
                    if (popup.content.cta_link) {
                      window.location.href = popup.content.cta_link;
                    }
                    recordConversion(popup.id);
                    onConversion();
                    handleClose();
                  }}
                  style={{ backgroundColor: popup.style.accent_color }}
                >
                  {popup.content.cta_text}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
