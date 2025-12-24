import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { captureLead } from '@/lib/leads/lead-service';

interface FormField {
  name: string;
  required: boolean;
}

// Public endpoint - no auth required
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get landing page by slug
    const { data: page } = await supabase
      .from('landing_pages')
      .select('id, user_id, form_fields')
      .eq('slug', slug)
      .eq('status', 'active')
      .single();

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    const body = await request.json();

    // Validate required fields
    const formFields = (page.form_fields || []) as FormField[];
    const requiredFields = formFields
      .filter((f) => f.required)
      .map((f) => f.name);

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Extract UTM params and metadata
    const metadata = {
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      utmSource: body.utm_source,
      utmMedium: body.utm_medium,
      utmCampaign: body.utm_campaign,
      utmContent: body.utm_content,
      referrer: request.headers.get('referer') || undefined,
    };

    // Remove UTM params from form data
    const formData = { ...body };
    delete formData.utm_source;
    delete formData.utm_medium;
    delete formData.utm_campaign;
    delete formData.utm_content;

    const result = await captureLead(page.user_id, page.id, formData, metadata);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you for subscribing!',
    });
  } catch (error) {
    console.error('Form submission error:', error);
    return NextResponse.json(
      { error: 'Failed to process submission' },
      { status: 500 }
    );
  }
}
