import { PopupManager } from '@/components/popups/popup-manager';

// Note: HAVEN_USER_ID would be configured per deployment via environment variable
const HAVEN_USER_ID = process.env.NEXT_PUBLIC_HAVEN_USER_ID || '';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      {HAVEN_USER_ID && <PopupManager userId={HAVEN_USER_ID} />}
    </>
  );
}
