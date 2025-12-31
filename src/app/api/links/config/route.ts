import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateConfig } from '@/lib/link-in-bio/link-service';

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  // Validate slug if provided
  if (body.slug) {
    // Slugs must be lowercase, alphanumeric, with hyphens only
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(body.slug)) {
      return NextResponse.json(
        { error: 'Slug must be lowercase letters, numbers, and hyphens only' },
        { status: 400 }
      );
    }

    // Check if slug is already taken by another user
    const { data: existingConfig } = await (supabase as any)
      .from('link_in_bio_config')
      .select('user_id')
      .eq('slug', body.slug)
      .neq('user_id', user.id)
      .single();

    if (existingConfig) {
      return NextResponse.json(
        { error: 'This URL is already taken. Please choose another.' },
        { status: 400 }
      );
    }
  }

  try {
    const config = await updateConfig(user.id, body);
    return NextResponse.json({ config });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update config' },
      { status: 500 }
    );
  }
}
