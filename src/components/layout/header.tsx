'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, Bell, Menu, Command, Check, AlertCircle, Info } from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface HeaderProps {
  onMenuClick?: () => void;
}

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning';
  title: string;
  message: string;
  href?: string;
  time: string;
  read: boolean;
}

// Mock notifications - will be connected to real data
const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'info',
    title: 'Setup incomplete',
    message: 'Complete your setup wizard to unlock all features',
    href: '/dashboard/setup',
    time: '2 min ago',
    read: false,
  },
  {
    id: '2',
    type: 'success',
    title: 'Pin published',
    message: 'Your quote "Growth begins..." was published to Pinterest',
    href: '/dashboard/pinterest/analytics',
    time: '1 hour ago',
    read: false,
  },
  {
    id: '3',
    type: 'warning',
    title: 'Approval needed',
    message: '3 items are waiting for your review',
    href: '/dashboard/approvals',
    time: '3 hours ago',
    read: false,
  },
];

export function Header({ onMenuClick }: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState(mockNotifications);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <Check className="h-4 w-4 text-success" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-warning" />;
      default:
        return <Info className="h-4 w-4 text-sage" />;
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-surface px-4 lg:px-6">
      {/* Left side */}
      <div className="flex items-center gap-4">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Search trigger */}
        <button
          className="hidden md:flex items-center gap-2 rounded-md border bg-elevated px-3 py-1.5 text-body-sm text-[var(--color-text-tertiary)] hover:border-sage/50 transition-colors cursor-pointer"
          onClick={() => {
            // Will open command palette
            const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
            document.dispatchEvent(event);
          }}
        >
          <Search className="h-4 w-4" />
          <span>Search...</span>
          <kbd className="ml-4 hidden sm:inline-flex items-center gap-1 rounded border bg-surface px-1.5 text-caption">
            <Command className="h-3 w-3" />K
          </kbd>
        </button>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Mode indicator - will be replaced with actual component */}
        <Badge variant="secondary" className="hidden sm:flex">
          Supervised
        </Badge>

        {/* Notifications */}
        <div className="relative" ref={dropdownRef}>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label="Notifications"
            onClick={() => setIsOpen(!isOpen)}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-error text-[10px] font-medium text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>

          {/* Dropdown */}
          {isOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border bg-surface shadow-lg">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <h3 className="text-h4">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-body-sm text-sage hover:text-sage/80 cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-body-sm text-[var(--color-text-tertiary)]">
                    No notifications
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <Link
                      key={notification.id}
                      href={notification.href || '#'}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        'flex gap-3 px-4 py-3 hover:bg-elevated transition-colors cursor-pointer',
                        !notification.read && 'bg-sage/5'
                      )}
                    >
                      <div className="mt-0.5">{getIcon(notification.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-body-sm font-medium">{notification.title}</p>
                        <p className="text-caption text-[var(--color-text-secondary)] truncate">
                          {notification.message}
                        </p>
                        <p className="text-caption text-[var(--color-text-tertiary)] mt-1">
                          {notification.time}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="mt-2 h-2 w-2 rounded-full bg-sage" />
                      )}
                    </Link>
                  ))
                )}
              </div>

              <div className="border-t px-4 py-3">
                <button
                  onClick={() => {
                    markAllRead();
                    setIsOpen(false);
                  }}
                  className="text-body-sm text-sage hover:text-sage/80 cursor-pointer"
                >
                  Dismiss all
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
