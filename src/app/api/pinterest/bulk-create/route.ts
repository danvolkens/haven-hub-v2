import { NextRequest, NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth/session';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generatePinCopy, applyTemplate } from '@/lib/pinterest/copy-generator';

interface BulkPinRequest {
  quote_ids: string[];
  board_id: string;
  schedule_strategy: 'immediate' | 'optimal' | 'spread';
  spread_days?: number;
  include_mockups?: boolean;
  link_type?: 'product' | 'custom' | 'landing_page' | 'quiz';
  custom_url?: string;
  landing_page_slug?: string;
  quiz_slug?: string;
  copy_template_ids?: string[]; // Array of template IDs for random selection
}

interface BulkCreateResult {
  success: boolean;
  created: number;
  failed: number;
  errors: string[];
  pins: Array<{ id: string; title: string; scheduledFor: string | null }>;
}

/**
 * Calculate schedule times based on strategy
 */
function calculateScheduleTimes(
  count: number,
  strategy: 'immediate' | 'optimal' | 'spread',
  spreadDays: number
): Date[] {
  const times: Date[] = [];
  const now = new Date();

  switch (strategy) {
    case 'immediate':
      // All scheduled for now (1 minute apart to avoid conflicts)
      for (let i = 0; i < count; i++) {
        times.push(new Date(now.getTime() + i * 60000));
      }
      break;

    case 'optimal':
      // Use optimal Pinterest posting times: 8-11pm
      const optimalHours = [20, 21, 22]; // 8pm, 9pm, 10pm
      let dayOffset = 0;

      for (let i = 0; i < count; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() + dayOffset);
        date.setHours(optimalHours[i % optimalHours.length], Math.floor(Math.random() * 30), 0, 0);
        times.push(date);

        if ((i + 1) % optimalHours.length === 0) dayOffset++;
      }
      break;

    case 'spread':
      // Evenly distribute over spreadDays
      const intervalMs = (spreadDays * 24 * 60 * 60 * 1000) / Math.max(count, 1);

      for (let i = 0; i < count; i++) {
        const scheduleTime = new Date(now.getTime() + i * intervalMs);

        // Ensure within reasonable hours (8am - 10pm)
        const hour = scheduleTime.getHours();
        if (hour < 8) {
          scheduleTime.setHours(8, Math.floor(Math.random() * 30), 0, 0);
        } else if (hour >= 22) {
          scheduleTime.setDate(scheduleTime.getDate() + 1);
          scheduleTime.setHours(8, Math.floor(Math.random() * 30), 0, 0);
        }

        times.push(scheduleTime);
      }
      break;
  }

  return times;
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getApiUserId();
    const body: BulkPinRequest = await request.json();
    const {
      quote_ids,
      board_id,
      schedule_strategy,
      spread_days = 7,
      include_mockups = true,
      link_type = 'product',
      custom_url,
      landing_page_slug,
      quiz_slug,
      copy_template_ids,
    } = body;

    if (!quote_ids?.length) {
      return NextResponse.json(
        { error: 'quote_ids array is required' },
        { status: 400 }
      );
    }

    if (!board_id) {
      return NextResponse.json(
        { error: 'board_id is required' },
        { status: 400 }
      );
    }

    if (!schedule_strategy || !['immediate', 'optimal', 'spread'].includes(schedule_strategy)) {
      return NextResponse.json(
        { error: 'Valid schedule_strategy is required: immediate, optimal, or spread' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Get board info
    const { data: board, error: boardError } = await (supabase as any)
      .from('pinterest_boards')
      .select('id, pinterest_board_id, name, collection')
      .eq('id', board_id)
      .eq('user_id', userId)
      .single();

    if (boardError || !board) {
      return NextResponse.json(
        { error: 'Board not found' },
        { status: 404 }
      );
    }

    // Get approved assets from approval_items table
    const { data: approvedAssets, error: assetsError } = await (supabase as any)
      .from('approval_items')
      .select('id, reference_id, payload, collection')
      .eq('user_id', userId)
      .eq('type', 'asset')
      .eq('status', 'approved');

    if (assetsError) {
      console.error('Error fetching approved assets:', assetsError);
    }

    // Get approved mockups from approval_items table
    let approvedMockups: any[] = [];
    if (include_mockups) {
      const { data: mockupData, error: mockupsError } = await (supabase as any)
        .from('approval_items')
        .select('id, reference_id, payload, collection')
        .eq('user_id', userId)
        .eq('type', 'mockup')
        .eq('status', 'approved');

      if (mockupsError) {
        console.error('Error fetching approved mockups:', mockupsError);
      }
      approvedMockups = mockupData || [];
    }

    // Filter to only items from selected quotes and Pinterest formats
    const isPinterestFormat = (format: string | undefined) => {
      if (!format) return true; // Include if no format specified
      const lowerFormat = format.toLowerCase();
      return lowerFormat.includes('pinterest') || lowerFormat === 'pin';
    };

    const filteredAssets = (approvedAssets || []).filter((item: any) => {
      const payload = item.payload || {};
      const quoteId = payload.quoteId || payload.quote_id;
      return quote_ids.includes(quoteId) && isPinterestFormat(payload.format);
    });

    const filteredMockups = approvedMockups.filter((item: any) => {
      const payload = item.payload || {};
      const quoteId = payload.quoteId || payload.quote_id;
      return quote_ids.includes(quoteId);
    });

    // Combine into single list
    interface ImageItem {
      approvalItemId: string;
      referenceId: string;
      imageUrl: string;
      quoteId: string;
      quoteText: string;
      collection: string;
      mood?: string;
      productLink?: string;
      type: 'asset' | 'mockup';
    }

    const allImages: ImageItem[] = [
      ...filteredAssets.map((item: any) => ({
        approvalItemId: item.id,
        referenceId: item.reference_id,
        imageUrl: item.payload?.assetUrl || item.payload?.file_url || item.payload?.thumbnailUrl,
        quoteId: item.payload?.quoteId || item.payload?.quote_id,
        quoteText: item.payload?.quoteText || item.payload?.quote_text || '',
        collection: item.collection || item.payload?.collection || 'grounding',
        mood: item.payload?.mood,
        productLink: item.payload?.productLink || item.payload?.product_link,
        type: 'asset' as const,
      })),
      ...filteredMockups.map((item: any) => ({
        approvalItemId: item.id,
        referenceId: item.reference_id,
        imageUrl: item.payload?.file_url || item.payload?.thumbnailUrl,
        quoteId: item.payload?.quoteId || item.payload?.quote_id,
        quoteText: item.payload?.quoteText || item.payload?.quote_text || '',
        collection: item.collection || item.payload?.collection || 'grounding',
        mood: item.payload?.mood,
        productLink: item.payload?.productLink || item.payload?.product_link,
        type: 'mockup' as const,
      })),
    ].filter(item => item.imageUrl); // Only include items with valid image URLs

    if (allImages.length === 0) {
      return NextResponse.json(
        { error: 'No approved Pinterest assets found for the selected quotes' },
        { status: 404 }
      );
    }

    // Get user settings for default shop URL
    const { data: userSettings } = await (supabase as any)
      .from('user_settings')
      .select('shop_url, shop_name')
      .eq('user_id', userId)
      .single();

    const defaultShopUrl = userSettings?.shop_url || 'https://havenandhold.com';

    // Determine the base URL based on link_type
    let overrideLink: string | null = null;
    const siteBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://havenhub.app';

    if (link_type === 'custom' && custom_url) {
      overrideLink = custom_url;
    } else if (link_type === 'landing_page' && landing_page_slug) {
      overrideLink = `${siteBaseUrl}/landing/${landing_page_slug}`;
    } else if (link_type === 'quiz' && quiz_slug) {
      overrideLink = `${siteBaseUrl}/quiz/${quiz_slug}`;
    }
    // If link_type === 'product', overrideLink stays null and we use per-quote product links

    // Fetch quote data (text) and linked products for all quotes
    const allQuoteIds = [...new Set(allImages.filter(img => img.quoteId).map(img => img.quoteId))];
    const quoteDataMap = new Map<string, { text: string; product_link: string | null }>();

    if (allQuoteIds.length > 0) {
      // Fetch quotes with their direct product links and linked product_id
      const { data: quotes } = await (supabase as any)
        .from('quotes')
        .select('id, text, product_link, product_id')
        .in('id', allQuoteIds);

      // Fetch products linked to these quotes (via products.quote_id OR quotes.product_id)
      const productIds = (quotes || [])
        .filter((q: any) => q.product_id)
        .map((q: any) => q.product_id);

      const { data: productsByQuoteId } = await (supabase as any)
        .from('products')
        .select('id, quote_id, shopify_handle, shopify_product_id')
        .eq('user_id', userId)
        .in('quote_id', allQuoteIds);

      const { data: productsByProductId } = productIds.length > 0
        ? await (supabase as any)
            .from('products')
            .select('id, shopify_handle, shopify_product_id')
            .eq('user_id', userId)
            .in('id', productIds)
        : { data: [] };

      // Build maps for product URL lookup
      const shopUrl = userSettings?.shop_url || 'https://havenandhold.com';

      // Map: quote_id -> product URL (from products.quote_id)
      const quoteToProductUrl = new Map<string, string>();
      for (const product of productsByQuoteId || []) {
        if (product.quote_id && product.shopify_handle) {
          const productUrl = `${shopUrl.replace(/\/$/, '')}/products/${product.shopify_handle}`;
          quoteToProductUrl.set(product.quote_id, productUrl);
        }
      }

      // Map: product_id -> product URL (from quotes.product_id)
      const productIdToUrl = new Map<string, string>();
      for (const product of productsByProductId || []) {
        if (product.id && product.shopify_handle) {
          const productUrl = `${shopUrl.replace(/\/$/, '')}/products/${product.shopify_handle}`;
          productIdToUrl.set(product.id, productUrl);
        }
      }

      for (const quote of quotes || []) {
        // Priority:
        // 1. quote.product_link (manual URL)
        // 2. quote.product_id -> product URL
        // 3. products.quote_id -> product URL
        let productLink = quote.product_link || null;

        if (!productLink && quote.product_id) {
          productLink = productIdToUrl.get(quote.product_id) || null;
        }

        if (!productLink) {
          productLink = quoteToProductUrl.get(quote.id) || null;
        }

        quoteDataMap.set(quote.id, {
          text: quote.text || '',
          product_link: productLink,
        });
      }
    }

    // Fetch copy templates if specified (for random distribution)
    let copyTemplates: Array<{ id: string; title_template: string; description_template: string; collection: string | null }> = [];
    if (copy_template_ids && copy_template_ids.length > 0) {
      const { data: templates } = await (supabase as any)
        .from('pin_copy_templates')
        .select('id, title_template, description_template, collection')
        .in('id', copy_template_ids)
        .eq('user_id', userId);

      if (templates && templates.length > 0) {
        copyTemplates = templates;
      }
    }

    // Helper to get a random template from the array, filtered by collection
    const getRandomTemplate = (collection: string | null) => {
      if (copyTemplates.length === 0) return null;

      // First try to find templates matching this collection
      const collectionTemplates = collection
        ? copyTemplates.filter(t => t.collection === collection || t.collection === null)
        : copyTemplates;

      // If no matching templates, fall back to all templates
      const templatesPool = collectionTemplates.length > 0 ? collectionTemplates : copyTemplates;

      const randomIndex = Math.floor(Math.random() * templatesPool.length);
      return templatesPool[randomIndex];
    };

    // Calculate scheduling times
    const scheduleTimes = calculateScheduleTimes(
      allImages.length,
      schedule_strategy,
      spread_days
    );

    const result: BulkCreateResult = {
      success: false,
      created: 0,
      failed: 0,
      errors: [],
      pins: [],
    };

    // Create pins for each image
    for (let i = 0; i < allImages.length; i++) {
      const item = allImages[i];

      try {
        // Get quote text - prefer payload, fall back to database
        const quoteData = item.quoteId ? quoteDataMap.get(item.quoteId) : null;
        const quoteText = item.quoteText || quoteData?.text || '';

        // Generate copy - use template if provided, otherwise auto-generate
        let copy: { title: string; description: string; alt_text: string; hashtags: string[] };

        // Get a random template for this pin (filtered by collection)
        const selectedTemplate = getRandomTemplate(item.collection);

        if (selectedTemplate) {
          // Apply the randomly selected copy template with variable substitution
          const templateResult = applyTemplate(selectedTemplate, {
            quote: quoteText,
            collection: item.collection,
            mood: item.mood,
            product_link: overrideLink || item.productLink || quoteData?.product_link || defaultShopUrl,
            shop_name: userSettings?.shop_name || 'Haven & Hold',
          });

          // Generate hashtags and alt_text using the auto-generator
          const autoCopy = generatePinCopy({
            quote_text: quoteText,
            collection: item.collection as 'grounding' | 'wholeness' | 'growth',
            mood: item.mood,
          });

          copy = {
            title: templateResult.title,
            description: templateResult.description,
            alt_text: autoCopy.alt_text,
            hashtags: autoCopy.hashtags,
          };
        } else {
          // Auto-generate copy
          copy = generatePinCopy({
            quote_text: quoteText,
            collection: item.collection as 'grounding' | 'wholeness' | 'growth',
            mood: item.mood,
          });
        }

        // Create the pin record
        const { data: pin, error: pinError } = await (supabase as any)
          .from('pins')
          .insert({
            user_id: userId,
            asset_id: item.type === 'asset' ? item.referenceId : null,
            mockup_id: item.type === 'mockup' ? item.referenceId : null,
            quote_id: item.quoteId || null,
            pinterest_board_id: board.pinterest_board_id,
            board_id: board.id,
            title: copy.title,
            description: `${copy.description}\n\n${copy.hashtags.map((h: string) => `#${h}`).join(' ')}`,
            alt_text: copy.alt_text,
            link: overrideLink || item.productLink || quoteData?.product_link || defaultShopUrl,
            image_url: item.imageUrl,
            collection: item.collection,
            status: schedule_strategy === 'immediate' ? 'draft' : 'scheduled',
            scheduled_for: schedule_strategy === 'immediate' ? null : scheduleTimes[i].toISOString(),
          })
          .select('id, title, scheduled_for')
          .single();

        if (pinError) {
          result.errors.push(`Failed to create pin for ${item.type} ${item.referenceId}: ${pinError.message}`);
          result.failed++;
        } else {
          result.pins.push({
            id: pin.id,
            title: pin.title,
            scheduledFor: pin.scheduled_for,
          });
          result.created++;
        }
      } catch (err) {
        result.errors.push(`Error processing ${item.type} ${item.referenceId}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        result.failed++;
      }
    }

    result.success = result.created > 0;

    // Log activity
    if (result.created > 0) {
      await (supabase as any).rpc('log_activity', {
        p_user_id: userId,
        p_action_type: 'pins_bulk_created',
        p_details: {
          quoteCount: quote_ids.length,
          totalImages: allImages.length,
          created: result.created,
          failed: result.failed,
          strategy: schedule_strategy,
          spreadDays: spread_days,
          includeMockups: include_mockups,
          boardId: board_id,
          boardName: board.name,
          linkType: link_type,
          linkDestination: overrideLink || 'product',
          copyTemplateIds: copy_template_ids || null,
          copySource: copy_template_ids && copy_template_ids.length > 0 ? 'random-templates' : 'auto-generated',
        },
        p_executed: true,
        p_module: 'pinterest',
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Bulk create error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch quotes with approved assets (for UI selection)
export async function GET(request: NextRequest) {
  try {
    const userId = await getApiUserId();
    const supabase = await createServerSupabaseClient();

    // Get approved assets from approval_items
    const { data: approvedAssets, error: assetsError } = await (supabase as any)
      .from('approval_items')
      .select('id, reference_id, payload, collection')
      .eq('user_id', userId)
      .eq('type', 'asset')
      .eq('status', 'approved');

    if (assetsError) {
      console.error('Error fetching approved assets:', assetsError);
      return NextResponse.json(
        { error: 'Failed to fetch approved assets' },
        { status: 500 }
      );
    }

    // Get approved mockups from approval_items
    const { data: approvedMockups, error: mockupsError } = await (supabase as any)
      .from('approval_items')
      .select('id, reference_id, payload, collection')
      .eq('user_id', userId)
      .eq('type', 'mockup')
      .eq('status', 'approved');

    if (mockupsError) {
      console.error('Error fetching approved mockups:', mockupsError);
    }

    // Group by quote
    const quoteMap = new Map<string, {
      id: string;
      text: string;
      collection: string;
      mood?: string;
      assetCount: number;
      mockupCount: number;
      previewUrl?: string;
    }>();

    // Helper to check if format is Pinterest-compatible
    const isPinterestFormat = (format: string | undefined) => {
      if (!format) return true; // Include if no format specified
      const lowerFormat = format.toLowerCase();
      return lowerFormat.includes('pinterest') || lowerFormat === 'pin';
    };

    // Process approved assets
    for (const item of approvedAssets || []) {
      const payload = item.payload || {};
      const quoteId = payload.quoteId || payload.quote_id;
      const format = payload.format;

      // Only include Pinterest-format assets
      if (!quoteId || !isPinterestFormat(format)) continue;

      const imageUrl = payload.assetUrl || payload.file_url || payload.thumbnailUrl;

      if (quoteMap.has(quoteId)) {
        const existing = quoteMap.get(quoteId)!;
        existing.assetCount++;
        if (!existing.previewUrl && imageUrl) {
          existing.previewUrl = imageUrl;
        }
      } else {
        quoteMap.set(quoteId, {
          id: quoteId,
          text: payload.quoteText || payload.quote_text || 'Quote',
          collection: item.collection || payload.collection || 'grounding',
          mood: payload.mood,
          assetCount: 1,
          mockupCount: 0,
          previewUrl: imageUrl,
        });
      }
    }

    // Process approved mockups
    for (const item of approvedMockups || []) {
      const payload = item.payload || {};
      const quoteId = payload.quoteId || payload.quote_id;

      if (!quoteId) continue;

      const imageUrl = payload.file_url || payload.thumbnailUrl;

      if (quoteMap.has(quoteId)) {
        const existing = quoteMap.get(quoteId)!;
        existing.mockupCount++;
        if (!existing.previewUrl && imageUrl) {
          existing.previewUrl = imageUrl;
        }
      } else {
        quoteMap.set(quoteId, {
          id: quoteId,
          text: payload.quoteText || payload.quote_text || 'Quote',
          collection: item.collection || payload.collection || 'grounding',
          mood: payload.mood,
          assetCount: 0,
          mockupCount: 1,
          previewUrl: imageUrl,
        });
      }
    }

    return NextResponse.json({
      quotes: Array.from(quoteMap.values()),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Fetch quotes error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
