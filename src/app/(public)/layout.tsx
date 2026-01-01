import { Suspense } from 'react';
import { Crimson_Text, Figtree } from 'next/font/google';
import { PopupManager } from '@/components/popups/popup-manager';
import { PinterestClickIdCapture } from '@/components/pinterest/click-id-capture';

// Haven & Hold brand fonts (matching Carrd site)
const crimsonText = Crimson_Text({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-serif',
  display: 'swap',
});

const figtree = Figtree({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
});

// Note: HAVEN_USER_ID would be configured per deployment via environment variable
const HAVEN_USER_ID = process.env.NEXT_PUBLIC_HAVEN_USER_ID || '';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${crimsonText.variable} ${figtree.variable}`}>
      {/* Capture Pinterest Click ID from URL parameters */}
      <Suspense fallback={null}>
        <PinterestClickIdCapture />
      </Suspense>
      {children}
      {HAVEN_USER_ID && <PopupManager userId={HAVEN_USER_ID} />}
    </div>
  );
}
