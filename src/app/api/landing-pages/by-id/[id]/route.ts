import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: page, error } = await (supabase as any)
      .from('landing_pages')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !page) {
      return NextResponse.json({ error: 'Landing page not found' }, { status: 404 });
    }

    return NextResponse.json(page);
  } catch (error) {
    console.error('Error fetching landing page:', error);
    return NextResponse.json({ error: 'Failed to load landing page' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const { data: existingPage } = await (supabase as any)
      .from('landing_pages')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!existingPage) {
      return NextResponse.json({ error: 'Landing page not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      slug,
      type,
      headline,
      subheadline,
      bodyContent,
      collection,
      leadMagnetType,
      leadMagnetTitle,
      featuredImageUrl,
      metaTitle,
      metaDescription,
      formFields,
    } = body;

    const { error: updateError } = await (supabase as any)
      .from('landing_pages')
      .update({
        name,
        slug,
        type,
        headline,
        subheadline,
        body_content: bodyContent,
        collection,
        lead_magnet_type: leadMagnetType,
        lead_magnet_title: leadMagnetTitle,
        featured_image_url: featuredImageUrl,
        meta_title: metaTitle,
        meta_description: metaDescription,
        form_fields: formFields,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating landing page:', error);
    return NextResponse.json({ error: 'Failed to update landing page' }, { status: 500 });
  }
}
