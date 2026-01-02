import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getApiUserId } from '@/lib/auth/session';
import { generatePinCopy, applyTemplate } from '@/lib/pinterest/copy-generator';
import { generateEnhancedCopy, generateCopyVariations } from '@/lib/copy-engine/copy-generator';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Helper to validate UUID or return undefined
const optionalUuid = z.string().optional().nullable().transform(val => {
  if (!val || val.trim() === '') return undefined;
  // Basic UUID format check
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(val) ? val : undefined;
});

// Normalize collection value
const normalizeCollection = (val: string | null | undefined) => {
  if (!val) return undefined;
  const normalized = val.toLowerCase().trim();
  if (['grounding', 'wholeness', 'growth'].includes(normalized)) {
    return normalized as 'grounding' | 'wholeness' | 'growth';
  }
  return undefined;
};

const generateSchema = z.object({
  // Quote text - accept either 'quote' or 'quote_text' field names
  quote_text: z.string().optional().nullable().transform(val => val?.trim() || undefined),
  quote: z.string().optional().nullable().transform(val => val?.trim() || undefined),
  // Accept any string for collection - we'll normalize it later
  collection: z.string().optional().nullable().transform(normalizeCollection),
  mood: z.string().optional().nullable().transform(val => val || undefined),
  // Additional fields from settings page
  roomType: z.string().optional().nullable(),
  shopName: z.string().optional().nullable(),
  variations: z.number().optional().nullable(),
  // Or reference a quote/mockup/asset by ID - allow empty strings
  quoteId: optionalUuid,
  mockupId: optionalUuid,
  assetId: optionalUuid,
  // Optionally use a specific template
  templateId: optionalUuid,
  // Product link for templates - accept any string
  product_link: z.string().optional().nullable().transform(val => val || undefined),
});

export async function POST(request: NextRequest) {
  try {
    const userId = await getApiUserId();
    const supabase = await createServerSupabaseClient();

    const body = await request.json();

    // Debug logging - remove once issue is resolved
    console.log('[copy-templates/generate] Request body:', JSON.stringify(body, null, 2));

    const parseResult = generateSchema.safeParse(body);
    if (!parseResult.success) {
      console.error('[copy-templates/generate] Validation errors:', parseResult.error.issues);
      return NextResponse.json(
        { error: 'Invalid request data', details: parseResult.error.issues },
        { status: 400 }
      );
    }
    const data = parseResult.data;

    // Accept either 'quote' or 'quote_text' field
    let quoteText = data.quote_text || data.quote;
    let collection = data.collection;
    let mood = data.mood;

    // If quoteId, mockupId, or assetId provided, fetch the metadata
    if (data.quoteId) {
      const { data: quote } = await (supabase as any)
        .from('quotes')
        .select('text, collection, mood')
        .eq('id', data.quoteId)
        .single();

      if (quote) {
        quoteText = quoteText || quote.text;
        collection = collection || quote.collection;
        mood = mood || quote.mood;
      }
    }

    if (data.mockupId) {
      // Mockups have direct quote_id reference
      const { data: mockup } = await (supabase as any)
        .from('mockups')
        .select('quotes(text, collection, mood)')
        .eq('id', data.mockupId)
        .single();

      if (mockup?.quotes) {
        const quote = mockup.quotes;
        quoteText = quoteText || quote.text;
        collection = collection || quote.collection;
        mood = mood || quote.mood;
      }
    }

    if (data.assetId) {
      const { data: asset } = await (supabase as any)
        .from('assets')
        .select('quotes(text, collection, mood)')
        .eq('id', data.assetId)
        .single();

      if (asset?.quotes) {
        const quote = asset.quotes;
        quoteText = quoteText || quote.text;
        collection = collection || quote.collection;
        mood = mood || quote.mood;
      }
    }

    // Ensure we have required data
    if (!quoteText) {
      return NextResponse.json(
        { error: 'Quote text is required. Provide quote_text directly or a valid quoteId/mockupId/assetId.' },
        { status: 400 }
      );
    }

    // If request has roomType/shopName/variations, use the enhanced copy engine
    // This is for the settings page copy testing feature
    if (data.roomType || data.shopName || data.variations) {
      const variations = data.variations || 1;

      if (variations > 1) {
        // Generate multiple variations for A/B testing
        const copies = await generateCopyVariations(userId, {
          quote: quoteText,
          collection: collection,
          mood: mood,
          roomType: data.roomType || undefined,
          shopName: data.shopName || undefined,
        }, variations);

        return NextResponse.json({
          copies,
          source: 'enhanced-engine',
        });
      } else {
        // Generate single copy
        const copy = await generateEnhancedCopy(userId, {
          quote: quoteText,
          collection: collection,
          mood: mood,
          roomType: data.roomType || undefined,
          shopName: data.shopName || undefined,
        });

        return NextResponse.json({
          copy,
          source: 'enhanced-engine',
        });
      }
    }

    // If templateId provided, use that template
    if (data.templateId) {
      const { data: template } = await (supabase as any)
        .from('pin_copy_templates')
        .select('title_template, description_template')
        .eq('id', data.templateId)
        .single();

      if (!template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }

      const result = applyTemplate(template, {
        quote: quoteText,
        collection: collection,
        mood: mood,
        product_link: data.product_link,
      });

      // Generate hashtags and alt_text using auto-generator (templates only provide title/description)
      const autoGenerated = generatePinCopy({
        quote_text: quoteText,
        collection: collection || 'grounding',
        mood: mood,
      });

      return NextResponse.json({
        title: result.title,
        description: result.description,
        alt_text: autoGenerated.alt_text,
        hashtags: autoGenerated.hashtags,
        source: 'template',
      });
    }

    // Generate copy using the auto-generator
    const generated = generatePinCopy({
      quote_text: quoteText,
      collection: collection || 'grounding',
      mood: mood,
    });

    return NextResponse.json({
      ...generated,
      source: 'auto-generated',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[copy-templates/generate] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
