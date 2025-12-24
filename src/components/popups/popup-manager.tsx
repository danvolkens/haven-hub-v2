'use client';

import { useEffect, useState, useCallback } from 'react';
import { Popup } from '@/types/popups';
import { PopupModal } from './popup-modal';
import {
  setupExitIntent,
  setupScrollDepth,
  setupTimeOnPage,
  setupPageViews,
  setupClickTrigger,
} from '@/lib/popups/trigger-handlers';
import {
  shouldShowPopup,
  recordImpression,
  hasConverted,
} from '@/lib/popups/frequency-tracker';

interface PopupManagerProps {
  userId: string;
}

export function PopupManager({ userId }: PopupManagerProps) {
  const [popups, setPopups] = useState<Popup[]>([]);
  const [activePopup, setActivePopup] = useState<Popup | null>(null);
  const [triggeredPopups, setTriggeredPopups] = useState<Set<string>>(new Set());

  // Fetch active popups
  useEffect(() => {
    async function fetchPopups() {
      try {
        const response = await fetch(`/api/popups/active?user_id=${userId}`);
        if (response.ok) {
          const { popups } = await response.json();
          setPopups(popups);
        }
      } catch (error) {
        console.error('Failed to fetch popups:', error);
      }
    }

    fetchPopups();
  }, [userId]);

  // Check targeting rules
  const matchesTargeting = useCallback((popup: Popup): boolean => {
    const { targeting } = popup;

    // Device targeting
    if (targeting.devices && targeting.devices.length > 0) {
      const isMobile = window.innerWidth < 768;
      const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
      const device = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';
      if (!targeting.devices.includes(device)) return false;
    }

    // URL rules
    if (targeting.url_contains && targeting.url_contains.length > 0) {
      if (!targeting.url_contains.some(str => window.location.href.includes(str))) {
        return false;
      }
    }
    if (targeting.url_excludes && targeting.url_excludes.length > 0) {
      if (targeting.url_excludes.some(str => window.location.href.includes(str))) {
        return false;
      }
    }

    // Conversion exclusion
    if (targeting.exclude_if_converted && hasConverted(popup.id)) {
      return false;
    }

    return true;
  }, []);

  // Trigger popup
  const triggerPopup = useCallback((popup: Popup) => {
    if (triggeredPopups.has(popup.id)) return;
    if (!shouldShowPopup(popup.id, popup.frequency_cap)) return;
    if (!matchesTargeting(popup)) return;

    setTriggeredPopups(prev => new Set([...prev, popup.id]));
    setActivePopup(popup);
    recordImpression(popup.id);

    // Track impression server-side
    fetch('/api/popups/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        popup_id: popup.id,
        event: 'impression',
      }),
    }).catch(console.error);
  }, [triggeredPopups, matchesTargeting]);

  // Set up trigger handlers
  useEffect(() => {
    const cleanups: (() => void)[] = [];

    popups.forEach(popup => {
      if (triggeredPopups.has(popup.id)) return;
      if (!shouldShowPopup(popup.id, popup.frequency_cap)) return;
      if (!matchesTargeting(popup)) return;

      switch (popup.trigger_type) {
        case 'exit_intent':
          cleanups.push(setupExitIntent(() => triggerPopup(popup)));
          break;
        case 'scroll_depth':
          const percentage = popup.trigger_config.percentage || 50;
          cleanups.push(setupScrollDepth(percentage, () => triggerPopup(popup)));
          break;
        case 'time_on_page':
          const seconds = popup.trigger_config.seconds || 30;
          cleanups.push(setupTimeOnPage(seconds, () => triggerPopup(popup)));
          break;
        case 'page_views':
          const count = popup.trigger_config.count || 3;
          cleanups.push(setupPageViews(count, () => triggerPopup(popup)));
          break;
        case 'click':
          const selector = popup.trigger_config.selector || '.trigger-popup';
          cleanups.push(setupClickTrigger(selector, () => triggerPopup(popup)));
          break;
      }
    });

    return () => {
      cleanups.forEach(cleanup => cleanup());
    };
  }, [popups, triggeredPopups, triggerPopup, matchesTargeting]);

  const handleClose = () => {
    setActivePopup(null);
  };

  const handleConversion = async () => {
    if (!activePopup) return;

    // Track conversion server-side
    await fetch('/api/popups/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        popup_id: activePopup.id,
        event: 'conversion',
      }),
    }).catch(console.error);
  };

  if (!activePopup) return null;

  return (
    <PopupModal
      popup={activePopup}
      onClose={handleClose}
      onConversion={handleConversion}
    />
  );
}
