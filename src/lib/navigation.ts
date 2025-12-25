import {
  LayoutDashboard,
  Inbox,
  Quote,
  Image,
  Frame,
  Pin,
  Megaphone,
  FlaskConical,
  BarChart3,
  PieChart,
  HelpCircle,
  Layers,
  MousePointerClick,
  ShoppingBag,
  Users,
  UserPlus,
  Heart,
  Gift,
  Ticket,
  Calendar,
  Link as LinkIcon,
  Share2,
  Settings,
  BookOpen,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: {
    queryKey: string[];
    getValue: (data: unknown) => number;
  };
}

export interface NavSection {
  name: string;
  items: NavItem[];
}

export const navigation: (NavItem | NavSection)[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Approvals',
    href: '/dashboard/approvals',
    icon: Inbox,
    badge: {
      queryKey: ['approvals', 'counts'],
      getValue: (data: unknown) => {
        if (data && typeof data === 'object' && 'total' in data) {
          return (data as { total: number }).total;
        }
        return 0;
      },
    },
  },
  {
    name: 'Create',
    items: [
      { name: 'Quotes', href: '/dashboard/quotes', icon: Quote },
      { name: 'Assets', href: '/dashboard/assets', icon: Image },
      { name: 'Mockups', href: '/dashboard/settings/mockups', icon: Frame },
    ],
  },
  {
    name: 'Pinterest',
    items: [
      { name: 'Manager', href: '/dashboard/pinterest', icon: Pin },
      { name: 'Analytics', href: '/dashboard/pinterest/analytics', icon: BarChart3 },
      { name: 'Content Mix', href: '/dashboard/pinterest/analytics/content-mix', icon: PieChart },
      { name: 'Ads', href: '/dashboard/pinterest/ads', icon: Megaphone },
      { name: 'Campaign Wizard', href: '/dashboard/pinterest/campaign-wizard', icon: Megaphone },
      { name: 'A/B Tests', href: '/dashboard/pinterest/ab-tests', icon: FlaskConical },
      { name: 'Rules', href: '/dashboard/pinterest/settings/performance-rules', icon: Settings },
    ],
  },
  {
    name: 'Leads',
    items: [
      { name: 'Quiz', href: '/dashboard/leads/quiz', icon: HelpCircle },
      { name: 'Landing Pages', href: '/dashboard/leads/landing-pages', icon: Layers },
      { name: 'Popups', href: '/dashboard/leads/popups', icon: MousePointerClick },
      { name: 'Abandonment', href: '/dashboard/leads/abandonment', icon: ShoppingBag },
    ],
  },
  {
    name: 'Customers',
    items: [
      { name: 'Overview', href: '/dashboard/customers', icon: Users },
      { name: 'Referrals', href: '/dashboard/customers/referrals', icon: UserPlus },
      { name: 'Win-Back', href: '/dashboard/customers/win-back', icon: Heart },
      { name: 'Gifts', href: '/dashboard/customers/gifts', icon: Gift },
    ],
  },
  {
    name: 'Campaigns',
    items: [
      { name: 'Overview', href: '/dashboard/campaigns', icon: Megaphone },
      { name: 'Coupons', href: '/dashboard/campaigns/coupons', icon: Ticket },
      { name: 'Calendar', href: '/dashboard/calendar', icon: Calendar },
    ],
  },
  {
    name: 'Content',
    items: [
      { name: 'Link-in-Bio', href: '/dashboard/links', icon: LinkIcon },
      { name: 'Cross-Platform', href: '/dashboard/analytics/cross-platform', icon: Share2 },
    ],
  },
  {
    name: 'Documentation',
    href: '/dashboard/docs',
    icon: BookOpen,
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
];

export function isNavSection(item: NavItem | NavSection): item is NavSection {
  return 'items' in item;
}
