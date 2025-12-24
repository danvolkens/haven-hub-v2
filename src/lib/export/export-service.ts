import { createClient } from '@/lib/supabase/server';
import { EXPORT_CONFIGS, ExportType, ExportFormat } from './export-config';

export interface ExportOptions {
  type: ExportType;
  format: ExportFormat;
  fields: string[];
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export interface ExportResult {
  data: string;
  filename: string;
  mimeType: string;
  recordCount: number;
}

// Get query for each export type
function getExportQuery(
  supabase: any,
  type: ExportType,
  userId: string,
  startDate?: Date,
  endDate?: Date
) {
  const start = startDate?.toISOString();
  const end = endDate?.toISOString();

  switch (type) {
    case 'leads':
      let leadsQuery = (supabase as any)
        .from('leads')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (start) leadsQuery = leadsQuery.gte('created_at', start);
      if (end) leadsQuery = leadsQuery.lte('created_at', end);
      return leadsQuery;

    case 'customers':
      let customersQuery = (supabase as any)
        .from('customers')
        .select(`
          *,
          customer_loyalty(tier, points_balance, lifetime_points_earned)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (start) customersQuery = customersQuery.gte('created_at', start);
      if (end) customersQuery = customersQuery.lte('created_at', end);
      return customersQuery;

    case 'orders':
      let ordersQuery = (supabase as any)
        .from('customer_orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (start) ordersQuery = ordersQuery.gte('created_at', start);
      if (end) ordersQuery = ordersQuery.lte('created_at', end);
      return ordersQuery;

    case 'pins':
      let pinsQuery = (supabase as any)
        .from('pins')
        .select(`
          *,
          boards(name),
          pin_analytics(impressions, saves, clicks, engagement_rate)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (start) pinsQuery = pinsQuery.gte('created_at', start);
      if (end) pinsQuery = pinsQuery.lte('created_at', end);
      return pinsQuery;

    case 'quotes':
      let quotesQuery = (supabase as any)
        .from('quotes')
        .select(`
          *,
          assets(count)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (start) quotesQuery = quotesQuery.gte('created_at', start);
      if (end) quotesQuery = quotesQuery.lte('created_at', end);
      return quotesQuery;

    case 'assets':
      let assetsQuery = (supabase as any)
        .from('assets')
        .select(`
          *,
          quotes(text)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (start) assetsQuery = assetsQuery.gte('created_at', start);
      if (end) assetsQuery = assetsQuery.lte('created_at', end);
      return assetsQuery;

    case 'analytics':
      let analyticsQuery = (supabase as any)
        .from('daily_metrics')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });
      if (start) analyticsQuery = analyticsQuery.gte('date', start.split('T')[0]);
      if (end) analyticsQuery = analyticsQuery.lte('date', end.split('T')[0]);
      return analyticsQuery;

    default:
      throw new Error(`Unknown export type: ${type}`);
  }
}

// Transform row data based on field selection
function transformRow(row: any, type: ExportType, fields: string[]): Record<string, any> {
  const result: Record<string, any> = {};

  for (const field of fields) {
    switch (type) {
      case 'pins':
        if (field === 'board_name') {
          result[field] = row.boards?.name || '';
        } else if (['impressions', 'saves', 'clicks', 'engagement_rate'].includes(field)) {
          result[field] = row.pin_analytics?.[0]?.[field] || 0;
        } else {
          result[field] = row[field];
        }
        break;

      case 'customers':
        if (field === 'loyalty_tier') {
          result[field] = row.customer_loyalty?.tier || 'none';
        } else if (field === 'lifetime_points') {
          result[field] = row.customer_loyalty?.lifetime_points_earned || 0;
        } else {
          result[field] = row[field];
        }
        break;

      case 'assets':
        if (field === 'quote_text') {
          result[field] = row.quotes?.text || '';
        } else {
          result[field] = row[field];
        }
        break;

      case 'quotes':
        if (field === 'assets_count') {
          result[field] = row.assets?.[0]?.count || 0;
        } else {
          result[field] = row[field];
        }
        break;

      default:
        result[field] = row[field];
    }
  }

  return result;
}

// Format value for CSV
function formatCSVValue(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  const str = String(value);
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Generate CSV output
function generateCSV(data: Record<string, any>[], fields: string[], type: ExportType): string {
  const config = EXPORT_CONFIGS[type];
  const fieldLabels = fields.map(f => {
    const field = config?.fields.find(cf => cf.key === f);
    return field?.label || f;
  });

  const header = fieldLabels.join(',');
  const rows = data.map(row =>
    fields.map(f => formatCSVValue(row[f])).join(',')
  );

  return [header, ...rows].join('\n');
}

// Generate JSON output
function generateJSON(data: Record<string, any>[]): string {
  return JSON.stringify(data, null, 2);
}

// Main export function
export async function generateExport(
  userId: string,
  options: ExportOptions
): Promise<ExportResult> {
  const supabase = await createClient();
  const config = EXPORT_CONFIGS[options.type];

  if (!config) {
    throw new Error(`Invalid export type: ${options.type}`);
  }

  // Validate fields
  const validFields = config.fields.map(f => f.key);
  const selectedFields = options.fields.filter(f => validFields.includes(f));

  if (selectedFields.length === 0) {
    // Use default fields
    selectedFields.push(...config.fields.filter(f => f.default).map(f => f.key));
  }

  // Build and execute query
  const query = getExportQuery(
    supabase,
    options.type,
    userId,
    options.startDate,
    options.endDate
  );

  const limit = Math.min(options.limit || config.maxRecords, config.maxRecords);
  const { data, error } = await query.limit(limit);

  if (error) {
    throw new Error(`Export query failed: ${error.message}`);
  }

  if (!data || data.length === 0) {
    // Return empty file
    const emptyData = options.format === 'csv'
      ? selectedFields.join(',')
      : '[]';

    return {
      data: emptyData,
      filename: `${options.type}-export-${Date.now()}.${options.format}`,
      mimeType: options.format === 'csv' ? 'text/csv' : 'application/json',
      recordCount: 0,
    };
  }

  // Transform data
  const transformedData = data.map((row: any) =>
    transformRow(row, options.type, selectedFields)
  );

  // Generate output
  const output = options.format === 'csv'
    ? generateCSV(transformedData, selectedFields, options.type)
    : generateJSON(transformedData);

  const timestamp = new Date().toISOString().split('T')[0];

  return {
    data: output,
    filename: `${options.type}-export-${timestamp}.${options.format}`,
    mimeType: options.format === 'csv' ? 'text/csv' : 'application/json',
    recordCount: transformedData.length,
  };
}

// Record export in history
export async function recordExport(
  userId: string,
  options: ExportOptions,
  recordCount: number
): Promise<void> {
  const supabase = await createClient();

  await (supabase as any).from('export_history').insert({
    user_id: userId,
    export_type: options.type,
    format: options.format,
    fields: options.fields,
    start_date: options.startDate?.toISOString(),
    end_date: options.endDate?.toISOString(),
    record_count: recordCount,
    created_at: new Date().toISOString(),
  });
}
