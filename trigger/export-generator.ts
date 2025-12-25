import { task, logger } from '@trigger.dev/sdk/v3';
import { createClient } from '@supabase/supabase-js';
import type { ExportGeneratorPayload } from '@/lib/trigger/client';

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface ExportConfig {
  tableName: string;
  columns: string[];
  defaultFields: string[];
  dateField?: string;
}

const EXPORT_CONFIGS: Record<string, ExportConfig> = {
  pins: {
    tableName: 'pins',
    columns: ['id', 'title', 'description', 'image_url', 'link', 'status', 'collection', 'impressions', 'saves', 'clicks', 'engagement_rate', 'published_at', 'created_at'],
    defaultFields: ['title', 'status', 'collection', 'impressions', 'saves', 'clicks', 'published_at'],
    dateField: 'created_at',
  },
  customers: {
    tableName: 'customers',
    columns: ['id', 'email', 'first_name', 'last_name', 'total_spent', 'total_orders', 'first_order_at', 'last_order_at', 'segment', 'lifecycle_stage', 'created_at'],
    defaultFields: ['email', 'first_name', 'last_name', 'total_spent', 'total_orders', 'segment'],
    dateField: 'created_at',
  },
  leads: {
    tableName: 'leads',
    columns: ['id', 'email', 'first_name', 'last_name', 'source', 'source_id', 'status', 'score', 'converted_at', 'created_at'],
    defaultFields: ['email', 'first_name', 'source', 'status', 'score', 'created_at'],
    dateField: 'created_at',
  },
  products: {
    tableName: 'products',
    columns: ['id', 'title', 'handle', 'product_type', 'vendor', 'status', 'price', 'inventory_quantity', 'collection', 'created_at'],
    defaultFields: ['title', 'product_type', 'status', 'price', 'inventory_quantity', 'collection'],
    dateField: 'created_at',
  },
  analytics: {
    tableName: 'pin_analytics_daily',
    columns: ['id', 'pin_id', 'date', 'impressions', 'saves', 'clicks', 'engagement_rate'],
    defaultFields: ['pin_id', 'date', 'impressions', 'saves', 'clicks'],
    dateField: 'date',
  },
};

function convertToCSV(data: Record<string, any>[], fields: string[]): string {
  if (data.length === 0) return '';

  // Header row
  const header = fields.join(',');

  // Data rows
  const rows = data.map((row) =>
    fields
      .map((field) => {
        const value = row[field];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string') {
          // Escape quotes and wrap in quotes if contains comma
          const escaped = value.replace(/"/g, '""');
          return escaped.includes(',') || escaped.includes('\n') ? `"${escaped}"` : escaped;
        }
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
      })
      .join(',')
  );

  return [header, ...rows].join('\n');
}

export const exportGeneratorTask = task({
  id: 'export-generator',

  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 30000,
    factor: 2,
  },

  run: async (payload: ExportGeneratorPayload) => {
    const supabase = getSupabaseClient();
    const { userId, exportType, format, dateRange, fields } = payload;

    logger.info('Starting export generation', { userId, exportType, format });

    // Get export config
    const config = EXPORT_CONFIGS[exportType];
    if (!config) {
      throw new Error(`Unknown export type: ${exportType}`);
    }

    // Determine fields to export
    const exportFields = fields && fields.length > 0
      ? fields.filter((f) => config.columns.includes(f))
      : config.defaultFields;

    if (exportFields.length === 0) {
      throw new Error('No valid fields specified for export');
    }

    // Build query
    let query = supabase
      .from(config.tableName as any)
      .select(exportFields.join(','))
      .eq('user_id', userId);

    // Apply date range if specified
    if (dateRange && config.dateField) {
      query = query.gte(config.dateField, dateRange.start);
      query = query.lte(config.dateField, dateRange.end);
    }

    // Execute query
    const { data, error } = await query;

    if (error) {
      logger.error('Failed to fetch export data', { error });
      throw new Error(`Failed to fetch data: ${error.message}`);
    }

    if (!data || data.length === 0) {
      logger.info('No data found for export');
      // Still create an export record but mark as empty
      await supabase.from('exports' as any).insert({
        user_id: userId,
        export_type: exportType,
        format,
        status: 'completed',
        row_count: 0,
        file_url: null,
        completed_at: new Date().toISOString(),
      });

      return { success: true, rowCount: 0, fileUrl: null };
    }

    logger.info(`Found ${data.length} rows to export`);

    // Generate export content
    let content: string;
    let contentType: string;
    let fileExtension: string;

    if (format === 'csv') {
      content = convertToCSV(data, exportFields);
      contentType = 'text/csv';
      fileExtension = 'csv';
    } else {
      content = JSON.stringify(data, null, 2);
      contentType = 'application/json';
      fileExtension = 'json';
    }

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${exportType}-${timestamp}.${fileExtension}`;

    // Upload to storage
    const storagePath = `exports/${userId}/${filename}`;
    const { error: uploadError } = await supabase.storage
      .from('exports')
      .upload(storagePath, content, {
        contentType,
        upsert: true,
      });

    let fileUrl: string | null = null;

    if (uploadError) {
      logger.warn('Failed to upload to storage, storing content inline', { error: uploadError });
      // Fallback: store content directly in database (for small exports)
      if (content.length < 500000) {
        // Max 500KB inline
        fileUrl = `data:${contentType};base64,${Buffer.from(content).toString('base64')}`;
      }
    } else {
      // Get signed URL
      const { data: signedUrl } = await supabase.storage
        .from('exports')
        .createSignedUrl(storagePath, 60 * 60 * 24 * 7); // 7 days

      fileUrl = signedUrl?.signedUrl || null;
    }

    // Create export record
    const { data: exportRecord, error: insertError } = await supabase
      .from('exports' as any)
      .insert({
        user_id: userId,
        export_type: exportType,
        format,
        status: 'completed',
        row_count: data.length,
        file_url: fileUrl,
        file_path: storagePath,
        fields_included: exportFields,
        date_range: dateRange,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      logger.error('Failed to create export record', { error: insertError });
    }

    // Log activity
    await supabase.rpc('log_activity', {
      p_user_id: userId,
      p_action_type: 'export_generated',
      p_details: {
        exportType,
        format,
        rowCount: data.length,
        fields: exportFields,
        exportId: exportRecord?.id,
      },
      p_executed: true,
      p_module: 'exports',
    });

    logger.info('Export generation complete', {
      userId,
      exportType,
      format,
      rowCount: data.length,
    });

    return {
      success: true,
      exportId: exportRecord?.id,
      rowCount: data.length,
      fileUrl,
      format,
    };
  },
});
