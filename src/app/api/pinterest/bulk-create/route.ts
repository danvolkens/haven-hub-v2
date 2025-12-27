import { NextRequest, NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth/session';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generatePinCopy } from '@/lib/pinterest/copy-generator';

interface BulkPinRequest {
  quote_ids: string[];
  board_id: string;
  schedule_strategy: 'immediate' | 'optimal' | 'spread';
  spread_days?: number;
  include_mockups?: boolean;
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

    // Get approved Pinterest assets for these quotes
    const { data: assets, error: assetsError } = await (supabase as any)
      .from('assets')
      .select(`
        id,
        file_url,
        format,
        quote_id,
        quotes (
          id,
          text,
          attribution,
          collection,
          mood
        )
      `)
      .eq('user_id', userId)
      .in('quote_id', quote_ids)
      .in('format', ['pinterest', 'pinterest_portrait', 'pinterest_square'])
      .eq('status', 'approved');

    if (assetsError) {
      console.error('Error fetching assets:', assetsError);
      return NextResponse.json(
        { error: 'Failed to fetch assets' },
        { status: 500 }
      );
    }

    // Optionally get approved mockups
    let mockups: any[] = [];
    if (include_mockups) {
      const { data: mockupData } = await (supabase as any)
        .from('mockups')
        .select(`
          id,
          file_url,
          quote_id,
          quotes (
            id,
            text,
            attribution,
            collection,
            mood
          )
        `)
        .eq('user_id', userId)
        .in('quote_id', quote_ids)
        .eq('status', 'approved');

      mockups = mockupData || [];
    }

    // Combine assets and mockups into a single list
    interface ImageItem {
      id: string;
      file_url: string;
      quote_id: string;
      quotes: {
        id: string;
        text: string;
        attribution?: string;
        collection: 'grounding' | 'wholeness' | 'growth';
        mood?: string;
      };
      type: 'asset' | 'mockup';
    }

    const allImages: ImageItem[] = [
      ...(assets || []).map((a: any) => ({ ...a, type: 'asset' as const })),
      ...mockups.map((m: any) => ({ ...m, type: 'mockup' as const })),
    ];

    if (allImages.length === 0) {
      return NextResponse.json(
        { error: 'No approved Pinterest assets found for the selected quotes' },
        { status: 404 }
      );
    }

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
      const quote = item.quotes;

      try {
        // Generate copy
        const copy = generatePinCopy({
          quote_text: quote.text,
          mantra_text: quote.attribution,
          collection: quote.collection,
          mood: quote.mood,
        });

        // Create the pin record
        const { data: pin, error: pinError } = await (supabase as any)
          .from('pins')
          .insert({
            user_id: userId,
            asset_id: item.type === 'asset' ? item.id : null,
            mockup_id: item.type === 'mockup' ? item.id : null,
            quote_id: quote.id,
            pinterest_board_id: board.pinterest_board_id,
            board_id: board.id,
            title: copy.title,
            description: `${copy.description}\n\n${copy.hashtags.map((h: string) => `#${h}`).join(' ')}`,
            alt_text: copy.alt_text,
            link: `https://havenandhold.com/products/${quote.id}`,
            image_url: item.file_url,
            collection: quote.collection,
            status: schedule_strategy === 'immediate' ? 'draft' : 'scheduled',
            scheduled_for: schedule_strategy === 'immediate' ? null : scheduleTimes[i].toISOString(),
          })
          .select('id, title, scheduled_for')
          .single();

        if (pinError) {
          result.errors.push(`Failed to create pin for ${item.type} ${item.id}: ${pinError.message}`);
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
        result.errors.push(`Error processing ${item.type} ${item.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
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

    // Get quotes that have at least one approved Pinterest-format asset
    const { data: quotesWithAssets, error } = await (supabase as any)
      .from('quotes')
      .select(`
        id,
        text,
        collection,
        mood,
        assets!inner (
          id,
          format,
          status,
          file_url
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .in('assets.format', ['pinterest', 'pinterest_portrait', 'pinterest_square'])
      .eq('assets.status', 'approved');

    if (error) {
      console.error('Error fetching quotes with assets:', error);
      return NextResponse.json(
        { error: 'Failed to fetch quotes' },
        { status: 500 }
      );
    }

    // Also get quotes with approved mockups
    const { data: quotesWithMockups } = await (supabase as any)
      .from('quotes')
      .select(`
        id,
        text,
        collection,
        mood,
        mockups!inner (
          id,
          status,
          file_url
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .eq('mockups.status', 'approved');

    // Merge and deduplicate quotes
    const quoteMap = new Map<string, any>();

    for (const quote of quotesWithAssets || []) {
      if (!quoteMap.has(quote.id)) {
        quoteMap.set(quote.id, {
          id: quote.id,
          text: quote.text,
          collection: quote.collection,
          mood: quote.mood,
          assetCount: (quote.assets || []).length,
          mockupCount: 0,
          previewUrl: quote.assets?.[0]?.file_url,
        });
      }
    }

    for (const quote of quotesWithMockups || []) {
      if (quoteMap.has(quote.id)) {
        const existing = quoteMap.get(quote.id);
        existing.mockupCount = (quote.mockups || []).length;
        if (!existing.previewUrl && quote.mockups?.[0]?.file_url) {
          existing.previewUrl = quote.mockups[0].file_url;
        }
      } else {
        quoteMap.set(quote.id, {
          id: quote.id,
          text: quote.text,
          collection: quote.collection,
          mood: quote.mood,
          assetCount: 0,
          mockupCount: (quote.mockups || []).length,
          previewUrl: quote.mockups?.[0]?.file_url,
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
