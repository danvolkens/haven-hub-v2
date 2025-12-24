'use client';

import { useCallback, useRef, useEffect } from 'react';

export function useAnnouncer() {
  const announcerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Create announcer element if it doesn't exist
    if (!document.getElementById('aria-live-announcer')) {
      const announcer = document.createElement('div');
      announcer.id = 'aria-live-announcer';
      announcer.setAttribute('aria-live', 'polite');
      announcer.setAttribute('aria-atomic', 'true');
      announcer.className = 'sr-only';
      document.body.appendChild(announcer);
      announcerRef.current = announcer;
    } else {
      announcerRef.current = document.getElementById('aria-live-announcer') as HTMLDivElement;
    }
  }, []);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (announcerRef.current) {
      announcerRef.current.setAttribute('aria-live', priority);
      announcerRef.current.textContent = '';
      // Small delay to ensure screen readers pick up the change
      requestAnimationFrame(() => {
        if (announcerRef.current) {
          announcerRef.current.textContent = message;
        }
      });
    }
  }, []);

  return { announce };
}
