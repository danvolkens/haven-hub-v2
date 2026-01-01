'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { getPinterestClickId } from '@/lib/pinterest/click-id';

/**
 * Pinterest Click ID Capture Component
 *
 * Silently captures the Pinterest Click ID (_epik) from URL parameters
 * and stores it in a cookie for later use in conversion tracking.
 *
 * Place this component in the root layout of public-facing pages.
 * It doesn't render anything visible.
 */
export function PinterestClickIdCapture() {
  const searchParams = useSearchParams();

  useEffect(() => {
    // This will extract _epik from URL and store in cookie
    getPinterestClickId(searchParams);
  }, [searchParams]);

  // This component doesn't render anything
  return null;
}
