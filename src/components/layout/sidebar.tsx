'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { navigation, isNavSection, type NavItem, type NavSection } from '@/lib/navigation';
import { Badge, Button } from '@/components/ui';
import { useAuthContext } from '@/contexts/auth-context';

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebar-collapsed') === 'true';
    }
    return false;
  });
  const pathname = usePathname();
  const { user, signOut } = useAuthContext();

  const handleToggle = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', String(newState));
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r bg-surface transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          {!collapsed && (
            <Link href="/dashboard" className="text-h3 font-semibold text-charcoal">
              Haven Hub
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleToggle}
            className={cn(collapsed && 'mx-auto')}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2 scrollbar-thin">
          <ul className="space-y-1">
            {navigation.map((item, index) => {
              if (isNavSection(item)) {
                return (
                  <NavSectionComponent
                    key={item.name}
                    section={item}
                    collapsed={collapsed}
                    pathname={pathname}
                  />
                );
              }
              return (
                <NavItemComponent
                  key={item.href}
                  item={item}
                  collapsed={collapsed}
                  pathname={pathname}
                />
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t p-2">
          <div
            className={cn(
              'flex items-center gap-3 rounded-md p-2',
              collapsed ? 'justify-center' : ''
            )}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sage text-white text-body-sm font-medium">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="truncate text-body-sm font-medium">{user?.email}</p>
              </div>
            )}
            {!collapsed && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={signOut}
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavSectionComponent({
  section,
  collapsed,
  pathname,
}: {
  section: NavSection;
  collapsed: boolean;
  pathname: string;
}) {
  const [expanded, setExpanded] = useState(true);

  if (collapsed) {
    return (
      <>
        {section.items.map((item) => (
          <NavItemComponent
            key={item.href}
            item={item}
            collapsed={collapsed}
            pathname={pathname}
          />
        ))}
      </>
    );
  }

  return (
    <li>
      <button
        className="flex w-full items-center justify-between px-3 py-2 text-overline text-[var(--color-text-tertiary)] uppercase tracking-wider cursor-pointer hover:text-charcoal transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {section.name}
        <ChevronRight
          className={cn(
            'h-3 w-3 transition-transform',
            expanded && 'rotate-90'
          )}
        />
      </button>
      {expanded && (
        <ul className="mt-1 space-y-1">
          {section.items.map((item) => (
            <NavItemComponent
              key={item.href}
              item={item}
              collapsed={collapsed}
              pathname={pathname}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function NavItemComponent({
  item,
  collapsed,
  pathname,
}: {
  item: NavItem;
  collapsed: boolean;
  pathname: string;
}) {
  // Use exact match to avoid highlighting multiple items
  const isActive = pathname === item.href;
  const Icon = item.icon;

  // Fetch badge data if configured
  const { data: badgeData } = useQuery({
    queryKey: item.badge?.queryKey ?? ['_disabled'],
    queryFn: async () => {
      if (!item.badge?.queryKey?.length) return null;
      const endpoint = `/api/${item.badge.queryKey.join('/')}`;
      const res = await fetch(endpoint);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!item.badge?.queryKey?.length,
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const badgeCount = item.badge?.getValue(badgeData) ?? 0;

  return (
    <li>
      <Link
        href={item.href}
        className={cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-body transition-colors',
          isActive
            ? 'bg-sage-pale text-sage font-medium'
            : 'text-[var(--color-text-secondary)] hover:bg-elevated hover:text-charcoal',
          collapsed && 'justify-center px-2'
        )}
        title={collapsed ? item.name : undefined}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1">{item.name}</span>
            {badgeCount > 0 && (
              <Badge
                variant={isActive ? "default" : "primary"}
                size="sm"
                className={isActive ? "bg-sage text-white" : ""}
              >
                {badgeCount}
              </Badge>
            )}
          </>
        )}
        {collapsed && badgeCount > 0 && (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-sage" />
        )}
      </Link>
    </li>
  );
}
