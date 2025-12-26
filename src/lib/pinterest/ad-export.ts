import { createServerSupabaseClient } from '@/lib/supabase/server';

export interface AdExportConfig {
  utmSource: string; // Default: 'pinterest'
  utmMedium: string; // Default: 'paid_social'
  utmCampaign: string; // Campaign name
  utmContent?: string; // Optional asset identifier
  utmTerm?: string; // Optional keyword/targeting info
}

export interface AdExportRow {
  imageUrl: string;
  title: string;
  description: string;
  destinationUrl: string;
  altText?: string;
  collection?: string;
  quoteId?: string;
  assetId?: string;
  // Pinterest Ads CSV format fields
  pinId?: string;
  boardId?: string;
}

export interface AdExportResult {
  rows: AdExportRow[];
  csvContent: string;
  totalAssets: number;
}

/**
 * Build a URL with UTM parameters
 */
export function buildUtmUrl(baseUrl: string, config: AdExportConfig): string {
  try {
    const url = new URL(baseUrl);

    url.searchParams.set('utm_source', config.utmSource || 'pinterest');
    url.searchParams.set('utm_medium', config.utmMedium || 'paid_social');
    url.searchParams.set('utm_campaign', config.utmCampaign);

    if (config.utmContent) {
      url.searchParams.set('utm_content', config.utmContent);
    }

    if (config.utmTerm) {
      url.searchParams.set('utm_term', config.utmTerm);
    }

    return url.toString();
  } catch {
    // If URL parsing fails, append parameters manually
    const params = new URLSearchParams();
    params.set('utm_source', config.utmSource || 'pinterest');
    params.set('utm_medium', config.utmMedium || 'paid_social');
    params.set('utm_campaign', config.utmCampaign);

    if (config.utmContent) {
      params.set('utm_content', config.utmContent);
    }

    if (config.utmTerm) {
      params.set('utm_term', config.utmTerm);
    }

    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}${params.toString()}`;
  }
}

/**
 * Generate Pinterest Ads CSV from approved assets/pins
 */
export async function generateAdExport(
  userId: string,
  assetIds: string[],
  config: AdExportConfig
): Promise<AdExportResult> {
  const supabase = await createServerSupabaseClient();

  // Get assets with their related data
  const { data: assets, error } = await (supabase as any)
    .from('assets')
    .select(
      `
      id,
      file_url,
      title,
      description,
      product_link,
      quotes (
        id,
        text,
        collection
      )
    `
    )
    .eq('user_id', userId)
    .in('id', assetIds);

  if (error) {
    throw new Error(`Failed to fetch assets: ${error.message}`);
  }

  if (!assets || assets.length === 0) {
    return {
      rows: [],
      csvContent: '',
      totalAssets: 0,
    };
  }

  const rows: AdExportRow[] = assets.map((asset: any) => {
    const destinationUrl = buildUtmUrl(asset.product_link || '', {
      ...config,
      utmContent: asset.id, // Use asset ID as content identifier
    });

    return {
      imageUrl: asset.file_url,
      title: asset.title || asset.quotes?.text?.substring(0, 100) || 'Untitled',
      description:
        asset.description ||
        asset.quotes?.text ||
        'Beautiful wall art for your space',
      destinationUrl,
      altText: asset.title || asset.quotes?.text?.substring(0, 100),
      collection: asset.quotes?.collection,
      quoteId: asset.quotes?.id,
      assetId: asset.id,
    };
  });

  const csvContent = generatePinterestAdsCsv(rows);

  return {
    rows,
    csvContent,
    totalAssets: rows.length,
  };
}

/**
 * Generate Pinterest Ads Manager compatible CSV
 * Format follows Pinterest's bulk upload requirements
 */
function generatePinterestAdsCsv(rows: AdExportRow[]): string {
  // Pinterest Ads CSV headers
  const headers = [
    'Image URL',
    'Title',
    'Description',
    'Destination URL',
    'Alt Text',
  ];

  const csvRows = [
    headers.join(','),
    ...rows.map((row) =>
      [
        escapeCsvField(row.imageUrl),
        escapeCsvField(row.title),
        escapeCsvField(row.description),
        escapeCsvField(row.destinationUrl),
        escapeCsvField(row.altText || row.title),
      ].join(',')
    ),
  ];

  return csvRows.join('\n');
}

/**
 * Escape CSV field values
 */
function escapeCsvField(value: string | undefined): string {
  if (!value) return '""';

  // If value contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (
    value.includes(',') ||
    value.includes('"') ||
    value.includes('\n') ||
    value.includes('\r')
  ) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

/**
 * Generate export from approved pins
 */
export async function generateAdExportFromPins(
  userId: string,
  pinIds: string[],
  config: AdExportConfig
): Promise<AdExportResult> {
  const supabase = await createServerSupabaseClient();

  // Get pins with their related data
  const { data: pins, error } = await (supabase as any)
    .from('pins')
    .select(
      `
      id,
      image_url,
      title,
      description,
      link,
      collection,
      quote_id
    `
    )
    .eq('user_id', userId)
    .in('id', pinIds);

  if (error) {
    throw new Error(`Failed to fetch pins: ${error.message}`);
  }

  if (!pins || pins.length === 0) {
    return {
      rows: [],
      csvContent: '',
      totalAssets: 0,
    };
  }

  const rows: AdExportRow[] = pins.map((pin: any) => {
    const destinationUrl = buildUtmUrl(pin.link || '', {
      ...config,
      utmContent: pin.id,
    });

    return {
      imageUrl: pin.image_url,
      title: pin.title || 'Untitled',
      description: pin.description || 'Beautiful wall art for your space',
      destinationUrl,
      altText: pin.title,
      collection: pin.collection,
      quoteId: pin.quote_id,
      pinId: pin.id,
    };
  });

  const csvContent = generatePinterestAdsCsv(rows);

  return {
    rows,
    csvContent,
    totalAssets: rows.length,
  };
}

/**
 * Export approved items from the approvals queue
 */
export async function generateAdExportFromApprovals(
  userId: string,
  config: AdExportConfig
): Promise<AdExportResult> {
  const supabase = await createServerSupabaseClient();

  // Get approved items from the approval queue
  const { data: approvals, error } = await (supabase as any)
    .from('approvals')
    .select(
      `
      id,
      item_type,
      item_id,
      details
    `
    )
    .eq('user_id', userId)
    .eq('status', 'approved')
    .in('item_type', ['pin', 'asset', 'mockup'])
    .order('approved_at', { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(`Failed to fetch approvals: ${error.message}`);
  }

  if (!approvals || approvals.length === 0) {
    return {
      rows: [],
      csvContent: '',
      totalAssets: 0,
    };
  }

  const rows: AdExportRow[] = [];

  for (const approval of approvals) {
    const details = approval.details || {};

    // Build destination URL with UTM parameters
    const destinationUrl = buildUtmUrl(details.product_link || details.link || '', {
      ...config,
      utmContent: approval.item_id,
    });

    rows.push({
      imageUrl: details.image_url || details.file_url || '',
      title: details.title || 'Untitled',
      description: details.description || 'Beautiful wall art for your space',
      destinationUrl,
      altText: details.title,
      collection: details.collection,
      assetId: approval.item_type === 'asset' ? approval.item_id : undefined,
      pinId: approval.item_type === 'pin' ? approval.item_id : undefined,
    });
  }

  // Filter out rows without image URLs
  const validRows = rows.filter((row) => row.imageUrl);

  const csvContent = generatePinterestAdsCsv(validRows);

  return {
    rows: validRows,
    csvContent,
    totalAssets: validRows.length,
  };
}
