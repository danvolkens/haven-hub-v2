import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/assets
 * List assets with optional filters
 *
 * Query params:
 * - quote_id: Filter by quote ID
 * - status: Filter by status (pending, approved, rejected)
 * - format: Filter by format (instagram_post, instagram_story, pinterest_pin, etc.)
 * - type: Filter by type (image, video)
 * - limit: Number of results (default 50)
 * - offset: Pagination offset (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const quoteId = searchParams.get('quote_id');
    const status = searchParams.get('status');
    const format = searchParams.get('format');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = (supabase as any)
      .from('assets')
      .select(`
        id,
        quote_id,
        url,
        thumbnail_url,
        type,
        format,
        status,
        width,
        height,
        file_key,
        metadata,
        created_at,
        updated_at
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (quoteId) {
      query = query.eq('quote_id', quoteId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (format) {
      query = query.eq('format', format);
    }

    if (type) {
      query = query.eq('type', type);
    }

    const { data: assets, error } = await query;

    if (error) {
      console.error('Error fetching assets:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(assets || []);
  } catch (error) {
    console.error('Error fetching assets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
