import { PopupFrequencyCap } from '@/types/popups';

const STORAGE_KEY = 'haven_popup_impressions';

interface ImpressionRecord {
  popup_id: string;
  session_id: string;
  timestamp: number;
  converted: boolean;
}

function getImpressions(): ImpressionRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveImpressions(impressions: ImpressionRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(impressions));
  } catch {
    // Storage might be full or disabled
  }
}

function getSessionId(): string {
  const key = 'haven_session_id';
  let sessionId = sessionStorage.getItem(key);
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem(key, sessionId);
  }
  return sessionId;
}

export function shouldShowPopup(popupId: string, frequencyCap: PopupFrequencyCap): boolean {
  const impressions = getImpressions();
  const sessionId = getSessionId();
  const now = Date.now();
  const oneDayAgo = now - (24 * 60 * 60 * 1000);

  const popupImpressions = impressions.filter(i => i.popup_id === popupId);

  switch (frequencyCap.type) {
    case 'once_ever':
      return popupImpressions.length === 0;

    case 'once_per_session':
      return !popupImpressions.some(i => i.session_id === sessionId);

    case 'once_per_day':
      return !popupImpressions.some(i => i.timestamp > oneDayAgo);

    case 'unlimited':
      if (frequencyCap.max_impressions) {
        return popupImpressions.length < frequencyCap.max_impressions;
      }
      return true;

    default:
      return true;
  }
}

export function recordImpression(popupId: string): void {
  const impressions = getImpressions();
  const sessionId = getSessionId();

  impressions.push({
    popup_id: popupId,
    session_id: sessionId,
    timestamp: Date.now(),
    converted: false,
  });

  // Clean up old impressions (older than 30 days)
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const cleanedImpressions = impressions.filter(i => i.timestamp > thirtyDaysAgo);

  saveImpressions(cleanedImpressions);
}

export function recordConversion(popupId: string): void {
  const impressions = getImpressions();
  const sessionId = getSessionId();

  const index = impressions.findIndex(
    i => i.popup_id === popupId && i.session_id === sessionId && !i.converted
  );

  if (index !== -1) {
    impressions[index].converted = true;
    saveImpressions(impressions);
  }
}

export function hasConverted(popupId: string): boolean {
  const impressions = getImpressions();
  return impressions.some(i => i.popup_id === popupId && i.converted);
}
