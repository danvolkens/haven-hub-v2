'use client';

import { useState, type ReactNode } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Sheet } from '@/components/ui';
import { cn } from '@/lib/utils';
import { CommandPalette } from '@/components/command-palette/command-palette';
import { WinnerAlertBanner } from '@/components/alerts/winner-alert';
import { useWinnerNotifications } from '@/hooks/use-winner-notifications';

function DashboardLayoutContent({ children }: { children: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Initialize winner notifications (shows toasts for new winners)
  useWinnerNotifications();

  return (
    <div className="min-h-screen bg-canvas">
      <CommandPalette />
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      <Sheet
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        side="left"
        size="md"
        showCloseButton={false}
      >
        <Sidebar />
      </Sheet>

      {/* Main content area */}
      <div
        className={cn(
          'transition-all duration-300',
          'lg:ml-64' // Will need to be dynamic based on collapsed state
        )}
      >
        <Header onMenuClick={() => setMobileMenuOpen(true)} />
        <main id="main-content" className="p-4 lg:p-6">
          {/* Winner Alert Banner */}
          <WinnerAlertBanner className="mb-4" />
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardLayoutContent>{children}</DashboardLayoutContent>;
}
