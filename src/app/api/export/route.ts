import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateExport, recordExport, ExportOptions } from '@/lib/export/export-service';
import { EXPORT_CONFIGS, ExportType, ExportFormat } from '@/lib/export/export-config';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') as ExportType;
  const format = (searchParams.get('format') || 'csv') as ExportFormat;
  const fields = searchParams.get('fields')?.split(',') || [];
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const limit = searchParams.get('limit');

  // Validate type
  if (!type || !EXPORT_CONFIGS[type]) {
    return NextResponse.json(
      { error: 'Invalid export type' },
      { status: 400 }
    );
  }

  // Validate format
  if (!['csv', 'json'].includes(format)) {
    return NextResponse.json(
      { error: 'Invalid format. Must be csv or json' },
      { status: 400 }
    );
  }

  try {
    const options: ExportOptions = {
      type,
      format,
      fields,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    };

    const result = await generateExport(user.id, options);

    // Record export in history
    await recordExport(user.id, options, result.recordCount);

    // Return file as download
    return new NextResponse(result.data, {
      status: 200,
      headers: {
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'X-Record-Count': String(result.recordCount),
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Export failed' },
      { status: 500 }
    );
  }
}

// Get export configuration
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Return all export configs
  return NextResponse.json({
    configs: Object.values(EXPORT_CONFIGS),
  });
}
