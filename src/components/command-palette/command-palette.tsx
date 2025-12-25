'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Search,
  Home,
  Pin,
  ShoppingBag,
  Users,
  BarChart,
  Settings,
  PlusCircle,
  Calendar,
  Tag,
  FileText,
  Zap,
  Command,
} from 'lucide-react';

interface CommandItem {
  id: string;
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  keywords?: string[];
  category: 'navigation' | 'action' | 'search';
}

export function CommandPalette() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Define commands
  const commands: CommandItem[] = useMemo(() => [
    // Navigation
    {
      id: 'nav-dashboard',
      title: 'Go to Dashboard',
      icon: Home,
      action: () => router.push('/dashboard'),
      keywords: ['home', 'main'],
      category: 'navigation',
    },
    {
      id: 'nav-pins',
      title: 'Go to Pins',
      icon: Pin,
      action: () => router.push('/dashboard/pins'),
      keywords: ['pinterest', 'content'],
      category: 'navigation',
    },
    {
      id: 'nav-products',
      title: 'Go to Products',
      icon: ShoppingBag,
      action: () => router.push('/dashboard/products'),
      keywords: ['shopify', 'store'],
      category: 'navigation',
    },
    {
      id: 'nav-customers',
      title: 'Go to Customers',
      icon: Users,
      action: () => router.push('/dashboard/customers'),
      keywords: ['leads', 'people'],
      category: 'navigation',
    },
    {
      id: 'nav-analytics',
      title: 'Go to Analytics',
      icon: BarChart,
      action: () => router.push('/dashboard/analytics'),
      keywords: ['stats', 'reports', 'metrics'],
      category: 'navigation',
    },
    {
      id: 'nav-campaigns',
      title: 'Go to Campaigns',
      icon: Zap,
      action: () => router.push('/dashboard/campaigns'),
      keywords: ['marketing', 'seasonal'],
      category: 'navigation',
    },
    {
      id: 'nav-calendar',
      title: 'Go to Calendar',
      icon: Calendar,
      action: () => router.push('/dashboard/calendar'),
      keywords: ['schedule', 'content'],
      category: 'navigation',
    },
    {
      id: 'nav-coupons',
      title: 'Go to Coupons',
      icon: Tag,
      action: () => router.push('/dashboard/campaigns/coupons'),
      keywords: ['discounts', 'codes'],
      category: 'navigation',
    },
    {
      id: 'nav-settings',
      title: 'Go to Settings',
      icon: Settings,
      action: () => router.push('/dashboard/settings'),
      keywords: ['preferences', 'config'],
      category: 'navigation',
    },
    // Actions
    {
      id: 'action-new-pin',
      title: 'Create New Pin',
      description: 'Schedule a new Pinterest pin',
      icon: PlusCircle,
      action: () => router.push('/dashboard/pinterest'),
      keywords: ['add', 'pinterest'],
      category: 'action',
    },
    {
      id: 'action-new-campaign',
      title: 'Create New Campaign',
      description: 'Start a new marketing campaign',
      icon: PlusCircle,
      action: () => router.push('/dashboard/campaigns/new'),
      keywords: ['add', 'marketing'],
      category: 'action',
    },
    {
      id: 'action-new-coupon',
      title: 'Create New Coupon',
      description: 'Create a discount code',
      icon: Tag,
      action: () => router.push('/dashboard/campaigns/coupons?create=true'),
      keywords: ['add', 'discount'],
      category: 'action',
    },
    {
      id: 'action-export',
      title: 'Export Data',
      description: 'Export your data to CSV or JSON',
      icon: FileText,
      action: () => router.push('/dashboard/settings/data'),
      keywords: ['download', 'csv'],
      category: 'action',
    },
  ], [router]);

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query) return commands;

    const lowerQuery = query.toLowerCase();
    return commands.filter(cmd =>
      cmd.title.toLowerCase().includes(lowerQuery) ||
      cmd.description?.toLowerCase().includes(lowerQuery) ||
      cmd.keywords?.some(k => k.includes(lowerQuery))
    );
  }, [commands, query]);

  // Keyboard shortcut to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(i =>
            i < filteredCommands.length - 1 ? i + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(i =>
            i > 0 ? i - 1 : filteredCommands.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
            setIsOpen(false);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex]);

  // Reset on open/close
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {
      navigation: [],
      action: [],
      search: [],
    };

    filteredCommands.forEach(cmd => {
      groups[cmd.category].push(cmd);
    });

    return groups;
  }, [filteredCommands]);

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Don't render anything when closed - Header has the trigger
  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Modal Overlay */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-charcoal/50 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />

        {/* Modal Content */}
        <div
          role="dialog"
          aria-modal="true"
          className="relative z-50 w-full max-w-lg mx-4 rounded-lg bg-surface shadow-elevation-3 overflow-hidden"
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b">
            <Search className="h-5 w-5 text-[var(--color-text-tertiary)]" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Search commands..."
              className="flex-1 bg-transparent border-0 outline-none text-base placeholder:text-[var(--color-text-tertiary)]"
            />
            <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 rounded border">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[400px] overflow-y-auto py-2">
            {filteredCommands.length === 0 ? (
              <div className="px-4 py-8 text-center text-[var(--color-text-secondary)]">
                No commands found
              </div>
            ) : (
              <>
                {groupedCommands.action.length > 0 && (
                  <div className="mb-2">
                    <div className="px-4 py-1 text-xs font-semibold text-[var(--color-text-tertiary)] uppercase">
                      Actions
                    </div>
                    {groupedCommands.action.map((cmd) => {
                      const globalIdx = filteredCommands.indexOf(cmd);
                      return (
                        <CommandRow
                          key={cmd.id}
                          command={cmd}
                          isSelected={globalIdx === selectedIndex}
                          onSelect={() => {
                            cmd.action();
                            setIsOpen(false);
                          }}
                        />
                      );
                    })}
                  </div>
                )}

                {groupedCommands.navigation.length > 0 && (
                  <div>
                    <div className="px-4 py-1 text-xs font-semibold text-[var(--color-text-tertiary)] uppercase">
                      Navigation
                    </div>
                    {groupedCommands.navigation.map((cmd) => {
                      const globalIdx = filteredCommands.indexOf(cmd);
                      return (
                        <CommandRow
                          key={cmd.id}
                          command={cmd}
                          isSelected={globalIdx === selectedIndex}
                          onSelect={() => {
                            cmd.action();
                            setIsOpen(false);
                          }}
                        />
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t bg-gray-50 flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-white rounded border">↑↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-white rounded border">↵</kbd>
                select
              </span>
            </div>
            <span className="flex items-center gap-1">
              <Command className="h-3 w-3" />K to open
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

function CommandRow({
  command,
  isSelected,
  onSelect,
}: {
  command: CommandItem;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const Icon = command.icon;

  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
        isSelected ? 'bg-sage-100 text-sage-900' : 'hover:bg-gray-50'
      }`}
    >
      <Icon className={`h-4 w-4 ${isSelected ? 'text-sage-600' : 'text-muted-foreground'}`} />
      <div className="flex-1 min-w-0">
        <div className="font-medium">{command.title}</div>
        {command.description && (
          <div className="text-sm text-muted-foreground truncate">
            {command.description}
          </div>
        )}
      </div>
    </button>
  );
}
