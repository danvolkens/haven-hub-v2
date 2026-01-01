'use client';

import { useEffect } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import { getPinterestClickId, getEpikFromCookie } from '@/lib/pinterest/click-id';

interface PinterestTrackerProps {
  userId: string;
  categoryName?: string;
  productIds?: string[];
  trackOnMount?: boolean;
}

/**
 * Pinterest Conversion Tracker Component
 *
 * Place this component on pages where you want to track Pinterest conversions.
 * It automatically captures the Pinterest Click ID (_epik) from URL parameters
 * and stores it in a cookie for later use.
 *
 * For category pages, set categoryName and trackOnMount=true to automatically
 * track view_category events.
 */
export function PinterestTracker({
  userId,
  categoryName,
  productIds,
  trackOnMount = false,
}: PinterestTrackerProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  useEffect(() => {
    // Capture Click ID from URL if present
    const clickId = getPinterestClickId(searchParams);

    // Track view_category event if configured
    if (trackOnMount && categoryName && userId) {
      trackViewCategory(userId, categoryName, productIds, clickId);
    }
  }, [userId, categoryName, productIds, trackOnMount, searchParams, pathname]);

  // This component doesn't render anything
  return null;
}

/**
 * Track a view_category event
 */
async function trackViewCategory(
  userId: string,
  categoryName: string,
  productIds?: string[],
  clickId?: string | null
) {
  try {
    // Get Click ID from cookie if not provided
    const epik = clickId || getEpikFromCookie();

    const response = await fetch('/api/pinterest/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        eventType: 'view_category',
        categoryName,
        productIds,
        clickId: epik,
      }),
    });

    if (!response.ok) {
      console.error('Failed to track Pinterest event:', await response.text());
    }
  } catch (error) {
    console.error('Error tracking Pinterest event:', error);
  }
}

/**
 * Hook to get the current Pinterest Click ID
 */
export function usePinterestClickId(): string | null {
  const searchParams = useSearchParams();

  // Get Click ID on each render (URL takes precedence)
  return getPinterestClickId(searchParams);
}

/**
 * Manual tracking function for use in event handlers
 */
export async function trackPinterestEvent(
  userId: string,
  eventType: 'page_visit' | 'view_category' | 'search' | 'add_to_cart' | 'lead',
  data: {
    categoryName?: string;
    searchQuery?: string;
    productIds?: string[];
    value?: number;
    email?: string;
  }
): Promise<boolean> {
  try {
    const clickId = getEpikFromCookie();

    const response = await fetch('/api/pinterest/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        eventType,
        clickId,
        ...data,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error tracking Pinterest event:', error);
    return false;
  }
}
