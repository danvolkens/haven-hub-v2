import {
  LayoutDashboard,
  Inbox,
  Quote,
  Image,
  Pin,
  Megaphone,
  FlaskConical,
  HelpCircle,
  Layers,
  MousePointerClick,
  Users,
  UserPlus,
  Gift,
  Ticket,
  BarChart3,
  Calendar,
  Link as LinkIcon,
  Share2,
  Settings,
  Heart,
  ShoppingBag,
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
    href: '/dashboard/approval-queue',
    icon: Inbox,
    badge: {
      queryKey: ['approval-counts'],
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
    ],
  },
  {
    name: 'Pinterest',
    items: [
      { name: 'Manager', href: '/dashboard/pinterest', icon: Pin },
      { name: 'Ads', href: '/dashboard/pinterest/ads', icon: Megaphone },
      { name: 'Tests', href: '/dashboard/pinterest/tests', icon: FlaskConical },
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
      { name: 'All', href: '/dashboard/customers', icon: Users },
      { name: 'Referrals', href: '/dashboard/customers/referrals', icon: UserPlus },
      { name: 'Win-Back', href: '/dashboard/customers/win-back', icon: Heart },
      { name: 'Gifts', href: '/dashboard/customers/gifts', icon: Gift },
    ],
  },
  {
    name: 'Campaigns',
    items: [
      { name: 'All', href: '/dashboard/campaigns', icon: Megaphone },
      { name: 'Coupons', href: '/dashboard/campaigns/coupons', icon: Ticket },
      { name: 'Calendar', href: '/dashboard/campaigns/calendar', icon: Calendar },
    ],
  },
  {
    name: 'Analytics',
    items: [
      { name: 'Attribution', href: '/dashboard/analytics/attribution', icon: BarChart3 },
      { name: 'Collections', href: '/dashboard/analytics/collections', icon: Layers },
    ],
  },
  {
    name: 'Content',
    items: [
      { name: 'Link-in-Bio', href: '/dashboard/content/link-in-bio', icon: LinkIcon },
      { name: 'Cross-Platform', href: '/dashboard/content/cross-platform', icon: Share2 },
    ],
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
