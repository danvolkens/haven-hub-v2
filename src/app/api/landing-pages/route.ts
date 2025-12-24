import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/auth/session';
import { createLandingPage } from '@/lib/leads/lead-service';

const createSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(200),
  type: z.enum(['lead_magnet', 'quiz', 'newsletter', 'product']),
  headline: z.string().min(1).max(200),
  subheadline: z.string().max(300).optional(),
  bodyContent: z.string().optional(),
  leadMagnetType: z.enum(['ebook', 'wallpaper', 'printable', 'guide', 'checklist', 'video']).optional(),
  leadMagnetTitle: z.string().optional(),
  collection: z.enum(['grounding', 'wholeness', 'growth']).optional(),
  formFields: z.array(z.object({
    name: z.string(),
    type: z.enum(['text', 'email', 'tel', 'select', 'checkbox', 'textarea']),
    label: z.string(),
    required: z.boolean(),
    placeholder: z.string().optional(),
    options: z.array(z.string()).optional(),
  })).optional(),
  klaviyoListId: z.string().optional(),
  klaviyoTags: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const userId = await getUserId();

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    let query = (supabase as any)
      .from('landing_pages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ pages: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    const body = await request.json();

    const data = createSchema.parse(body);
    const result = await createLandingPage(userId, data);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      page: result.page,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body', details: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
