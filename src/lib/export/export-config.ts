// Export configuration for each data type

export type ExportType =
  | 'leads'
  | 'customers'
  | 'orders'
  | 'pins'
  | 'quotes'
  | 'assets'
  | 'analytics';

export type ExportFormat = 'csv' | 'json';

export interface ExportField {
  key: string;
  label: string;
  default: boolean;
  formatter?: (value: any) => string;
}

export interface ExportConfig {
  type: ExportType;
  label: string;
  description: string;
  fields: ExportField[];
  defaultDateRange: number; // days
  maxRecords: number;
}

export const EXPORT_CONFIGS: Record<ExportType, ExportConfig> = {
  leads: {
    type: 'leads',
    label: 'Leads',
    description: 'Quiz responses and email subscribers',
    defaultDateRange: 30,
    maxRecords: 50000,
    fields: [
      { key: 'id', label: 'ID', default: true },
      { key: 'email', label: 'Email', default: true },
      { key: 'segment', label: 'Segment', default: true },
      { key: 'source', label: 'Source', default: true },
      { key: 'quiz_completed', label: 'Quiz Completed', default: true },
      { key: 'converted', label: 'Converted to Customer', default: true },
      { key: 'created_at', label: 'Created At', default: true },
      { key: 'utm_source', label: 'UTM Source', default: false },
      { key: 'utm_medium', label: 'UTM Medium', default: false },
      { key: 'utm_campaign', label: 'UTM Campaign', default: false },
    ],
  },
  customers: {
    type: 'customers',
    label: 'Customers',
    description: 'Customer profiles and purchase history',
    defaultDateRange: 90,
    maxRecords: 50000,
    fields: [
      { key: 'id', label: 'ID', default: true },
      { key: 'email', label: 'Email', default: true },
      { key: 'shopify_customer_id', label: 'Shopify ID', default: true },
      { key: 'segment', label: 'Segment', default: true },
      { key: 'order_count', label: 'Order Count', default: true },
      { key: 'total_spent', label: 'Total Spent', default: true },
      { key: 'first_order_at', label: 'First Order', default: true },
      { key: 'last_order_at', label: 'Last Order', default: true },
      { key: 'journey_stage', label: 'Journey Stage', default: true },
      { key: 'loyalty_tier', label: 'Loyalty Tier', default: false },
      { key: 'lifetime_points', label: 'Lifetime Points', default: false },
    ],
  },
  orders: {
    type: 'orders',
    label: 'Orders',
    description: 'Order history with line items',
    defaultDateRange: 90,
    maxRecords: 100000,
    fields: [
      { key: 'id', label: 'ID', default: true },
      { key: 'shopify_order_id', label: 'Shopify Order ID', default: true },
      { key: 'customer_email', label: 'Customer Email', default: true },
      { key: 'total', label: 'Total', default: true },
      { key: 'subtotal', label: 'Subtotal', default: true },
      { key: 'discount_total', label: 'Discount', default: true },
      { key: 'item_count', label: 'Item Count', default: true },
      { key: 'status', label: 'Status', default: true },
      { key: 'created_at', label: 'Created At', default: true },
      { key: 'attribution_channel', label: 'Attribution Channel', default: false },
      { key: 'coupon_code', label: 'Coupon Code', default: false },
    ],
  },
  pins: {
    type: 'pins',
    label: 'Pinterest Pins',
    description: 'Pin performance and scheduling data',
    defaultDateRange: 30,
    maxRecords: 10000,
    fields: [
      { key: 'id', label: 'ID', default: true },
      { key: 'title', label: 'Title', default: true },
      { key: 'board_name', label: 'Board', default: true },
      { key: 'status', label: 'Status', default: true },
      { key: 'impressions', label: 'Impressions', default: true },
      { key: 'saves', label: 'Saves', default: true },
      { key: 'clicks', label: 'Clicks', default: true },
      { key: 'engagement_rate', label: 'Engagement Rate', default: true },
      { key: 'published_at', label: 'Published At', default: true },
      { key: 'link', label: 'Link', default: false },
      { key: 'pinterest_pin_id', label: 'Pinterest ID', default: false },
    ],
  },
  quotes: {
    type: 'quotes',
    label: 'Quotes',
    description: 'Quote content and generation data',
    defaultDateRange: 90,
    maxRecords: 10000,
    fields: [
      { key: 'id', label: 'ID', default: true },
      { key: 'text', label: 'Text', default: true },
      { key: 'attribution', label: 'Attribution', default: true },
      { key: 'collection', label: 'Collection', default: true },
      { key: 'mood', label: 'Mood', default: true },
      { key: 'status', label: 'Status', default: true },
      { key: 'assets_count', label: 'Assets Generated', default: true },
      { key: 'created_at', label: 'Created At', default: true },
    ],
  },
  assets: {
    type: 'assets',
    label: 'Assets',
    description: 'Generated design assets',
    defaultDateRange: 90,
    maxRecords: 50000,
    fields: [
      { key: 'id', label: 'ID', default: true },
      { key: 'quote_text', label: 'Quote', default: true },
      { key: 'format', label: 'Format', default: true },
      { key: 'status', label: 'Status', default: true },
      { key: 'quality_score', label: 'Quality Score', default: true },
      { key: 'url', label: 'URL', default: true },
      { key: 'created_at', label: 'Created At', default: true },
    ],
  },
  analytics: {
    type: 'analytics',
    label: 'Analytics',
    description: 'Daily performance metrics',
    defaultDateRange: 30,
    maxRecords: 1000,
    fields: [
      { key: 'date', label: 'Date', default: true },
      { key: 'revenue', label: 'Revenue', default: true },
      { key: 'orders', label: 'Orders', default: true },
      { key: 'new_customers', label: 'New Customers', default: true },
      { key: 'new_leads', label: 'New Leads', default: true },
      { key: 'quiz_completions', label: 'Quiz Completions', default: true },
      { key: 'pin_impressions', label: 'Pin Impressions', default: true },
      { key: 'pin_clicks', label: 'Pin Clicks', default: true },
    ],
  },
};
