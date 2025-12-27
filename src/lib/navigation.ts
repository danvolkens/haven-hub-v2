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
  Mail,
  Zap,
  Bell,
  Target,
  TrendingUp,
  ListChecks,
  Tags,
  Bug,
  DollarSign,
  FileText,
  Clock,
  Store,
  Database,
  Plug,
  Package,
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
    name: 'Products',
    href: '/dashboard/products',
    icon: Package,
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
      { name: 'Pin Templates', href: '/dashboard/settings/pin-templates', icon: FileText },
      { name: 'Copy Engine', href: '/dashboard/settings/copy-templates', icon: Settings },
    ],
  },
  {
    name: 'Pinterest',
    items: [
      { name: 'Manager', href: '/dashboard/pinterest', icon: Pin },
      { name: 'Analytics', href: '/dashboard/pinterest/analytics', icon: BarChart3 },
      { name: 'Content Mix', href: '/dashboard/pinterest/analytics/content-mix', icon: PieChart },
      { name: 'Audiences', href: '/dashboard/pinterest/audiences', icon: Target },
      { name: 'Ads', href: '/dashboard/pinterest/ads', icon: Megaphone },
      { name: 'Campaign Wizard', href: '/dashboard/pinterest/campaign-wizard', icon: Megaphone },
      { name: 'A/B Tests', href: '/dashboard/pinterest/ab-tests', icon: FlaskConical },
      { name: 'Rules', href: '/dashboard/pinterest/settings/performance-rules', icon: Settings },
    ],
  },
  {
    name: 'Email',
    items: [
      { name: 'Overview', href: '/dashboard/email', icon: Mail },
      { name: 'Workflows', href: '/dashboard/email/workflows', icon: Zap },
      { name: 'Flows', href: '/dashboard/email/flows', icon: Zap },
      { name: 'Lists', href: '/dashboard/email/lists', icon: ListChecks },
      { name: 'Tags', href: '/dashboard/email/tags', icon: Tags },
      { name: 'Revenue', href: '/dashboard/email/revenue', icon: DollarSign },
      { name: 'Debug', href: '/dashboard/email/debug', icon: Bug },
      { name: 'Setup', href: '/dashboard/email/setup', icon: Settings },
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
      { name: 'Weekly Rhythm', href: '/dashboard/rhythm', icon: Clock },
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
    name: 'Analytics',
    items: [
      { name: 'Attribution', href: '/dashboard/analytics/attribution', icon: TrendingUp },
      { name: 'Scaling Playbook', href: '/dashboard/analytics/scaling-playbook', icon: Target },
      { name: 'Alerts', href: '/dashboard/settings/alerts', icon: Bell },
    ],
  },
  {
    name: 'Documentation',
    href: '/dashboard/docs',
    icon: BookOpen,
  },
  {
    name: 'Settings',
    items: [
      { name: 'Overview', href: '/dashboard/settings', icon: Settings },
      { name: 'Shopify', href: '/dashboard/settings/shopify', icon: Store },
      { name: 'Integrations', href: '/dashboard/setup', icon: Plug },
      { name: 'Data Export', href: '/dashboard/settings/data', icon: Database },
    ],
  },
];

export function isNavSection(item: NavItem | NavSection): item is NavSection {
  return 'items' in item;
}
