import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { PinterestClient, CreatePinRequest as PinterestCreatePinRequest } from '@/lib/integrations/pinterest/client';
import { checkRateLimit, pinterestLimiter } from '@/lib/cache/rate-limiter';
import type { CreatePinRequest, Pin } from '@/types/pinterest';

interface PinPublishResult {
  success: boolean;
  pin?: Pin;
  pinterestPinId?: string;
  error?: string;
}

export async function createPin(
  userId: string,
  request: CreatePinRequest
): Promise<PinPublishResult> {
  const supabase = await createServerSupabaseClient();

  try {
    // Get image URL from asset or mockup
    let imageUrl: string | null = null;
    let quoteId: string | null = null;
    let collection: string | null = null;

    if (request.assetId) {
      const { data: asset } = await (supabase as any)
        .from('assets')
        .select('file_url, quote_id, quotes(collection)')
        .eq('id', request.assetId)
        .single();

      if (asset) {
        imageUrl = asset.file_url;
        quoteId = asset.quote_id;
        collection = asset.quotes?.collection;
      }
    } else if (request.mockupId) {
      const { data: mockup } = await (supabase as any)
        .from('mockups')
        .select('file_url, quote_id, quotes(collection)')
        .eq('id', request.mockupId)
        .single();

      if (mockup) {
        imageUrl = mockup.file_url;
        quoteId = mockup.quote_id;
        collection = mockup.quotes?.collection;
      }
    }

    if (!imageUrl) {
      throw new Error('No valid image source provided');
    }

    // Get board info
    const { data: board } = await (supabase as any)
      .from('pinterest_boards')
      .select('pinterest_board_id')
      .eq('id', request.boardId)
      .eq('user_id', userId)
      .single();

    if (!board) {
      throw new Error('Board not found');
    }

    // Apply copy template if provided
    let finalTitle = request.title;
    let finalDescription = request.description;
    let copyVariant: string | null = null;

    if (request.copyTemplateId) {
      const { data: template } = await (supabase as any)
        .from('pin_copy_templates')
        .select('*')
        .eq('id', request.copyTemplateId)
        .single();

      if (template) {
        // Get quote for variable substitution
        const { data: quote } = quoteId
          ? await (supabase as any).from('quotes').select('text, collection, mood').eq('id', quoteId).single()
          : { data: null };

        const variables = {
          quote: quote?.text || '',
          collection: quote?.collection || collection || '',
          mood: quote?.mood || '',
          product_link: request.link || '',
          shop_name: 'Haven & Hold',
        };

        finalTitle = substituteVariables(template.title_template, variables);
        finalDescription = substituteVariables(template.description_template, variables);
        copyVariant = template.variant;

        // Update template usage
        await (supabase as any)
          .from('pin_copy_templates')
          .update({ times_used: template.times_used + 1 })
          .eq('id', template.id);
      }
    }

    // Create local pin record
    const { data: pin, error: pinError } = await (supabase as any)
      .from('pins')
      .insert({
        user_id: userId,
        asset_id: request.assetId,
        mockup_id: request.mockupId,
        quote_id: quoteId,
        pinterest_board_id: board.pinterest_board_id,
        board_id: request.boardId,
        title: finalTitle,
        description: finalDescription,
        link: request.link,
        image_url: imageUrl,
        copy_variant: copyVariant,
        copy_template_id: request.copyTemplateId,
        collection,
        status: request.scheduledFor ? 'scheduled' : 'draft',
        scheduled_for: request.scheduledFor,
      })
      .select()
      .single();

    if (pinError) {
      throw new Error(pinError.message);
    }

    // Log activity
    await (supabase as any).rpc('log_activity', {
      p_user_id: userId,
      p_action_type: request.scheduledFor ? 'pin_scheduled' : 'pin_created',
      p_details: {
        pinId: pin.id,
        boardId: request.boardId,
        scheduledFor: request.scheduledFor,
      },
      p_executed: true,
      p_module: 'pinterest',
      p_reference_id: pin.id,
      p_reference_table: 'pins',
    });

    return {
      success: true,
      pin: pin as Pin,
    };
  } catch (error) {
    console.error('Pin creation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function publishPin(
  userId: string,
  pinId: string
): Promise<PinPublishResult> {
  const supabase = await createServerSupabaseClient();
  const adminClient = getAdminClient();

  try {
    // Check rate limit
    const rateLimitResult = await checkRateLimit(pinterestLimiter, userId);
    if (!rateLimitResult.success) {
      throw new Error(`Rate limit exceeded. Try again in ${rateLimitResult.reset}s`);
    }

    // Get pin
    const { data: pin } = await (supabase as any)
      .from('pins')
      .select('*')
      .eq('id', pinId)
      .eq('user_id', userId)
      .single();

    if (!pin) {
      throw new Error('Pin not found');
    }

    if (pin.status === 'published') {
      throw new Error('Pin already published');
    }

    // Update status to publishing
    await (supabase as any)
      .from('pins')
      .update({ status: 'publishing' })
      .eq('id', pinId);

    // Get Pinterest credentials
    const accessToken = await (adminClient as any).rpc('get_credential', {
      p_user_id: userId,
      p_provider: 'pinterest',
      p_credential_type: 'access_token',
    });

    if (!accessToken.data) {
      throw new Error('Pinterest not connected');
    }

    const pinterestClient = new PinterestClient({ accessToken: accessToken.data });

    // Publish to Pinterest
    const pinterestPin = await pinterestClient.createPin({
      board_id: pin.pinterest_board_id,
      media_source: {
        source_type: 'image_url',
        url: pin.image_url,
      },
      title: pin.title,
      description: pin.description || undefined,
      link: pin.link || undefined,
      alt_text: pin.alt_text || pin.title,
    });

    // Update pin with Pinterest ID
    const { data: updatedPin } = await (supabase as any)
      .from('pins')
      .update({
        pinterest_pin_id: pinterestPin.id,
        status: 'published',
        published_at: new Date().toISOString(),
        last_error: null,
        retry_count: 0,
      })
      .eq('id', pinId)
      .select()
      .single();

    // Log activity
    await (supabase as any).rpc('log_activity', {
      p_user_id: userId,
      p_action_type: 'pin_published',
      p_details: {
        pinId,
        pinterestPinId: pinterestPin.id,
      },
      p_executed: true,
      p_module: 'pinterest',
      p_reference_id: pinId,
      p_reference_table: 'pins',
    });

    return {
      success: true,
      pin: updatedPin as Pin,
      pinterestPinId: pinterestPin.id,
    };
  } catch (error) {
    console.error('Pin publish error:', error);

    // Update pin with error - need to fetch current retry_count first
    const { data: currentPin } = await (supabase as any)
      .from('pins')
      .select('retry_count')
      .eq('id', pinId)
      .single();

    await (supabase as any)
      .from('pins')
      .update({
        status: 'failed',
        last_error: error instanceof Error ? error.message : 'Unknown error',
        retry_count: (currentPin?.retry_count || 0) + 1,
      })
      .eq('id', pinId);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function schedulePins(
  userId: string,
  pinIds: string[],
  startFrom?: string
): Promise<{ scheduled: number; errors: string[] }> {
  const supabase = await createServerSupabaseClient();
  const errors: string[] = [];
  let scheduled = 0;

  let nextSlot = startFrom ? new Date(startFrom) : new Date();

  for (const pinId of pinIds) {
    try {
      // Get next available slot
      const { data: slotResult } = await (supabase as any).rpc('get_next_pin_slot', {
        p_user_id: userId,
        p_after: nextSlot.toISOString(),
      });

      const scheduledFor = slotResult || nextSlot.toISOString();

      await (supabase as any)
        .from('pins')
        .update({
          status: 'scheduled',
          scheduled_for: scheduledFor,
        })
        .eq('id', pinId)
        .eq('user_id', userId)
        .eq('status', 'draft');

      nextSlot = new Date(scheduledFor);
      scheduled++;
    } catch (error) {
      errors.push(`Pin ${pinId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return { scheduled, errors };
}

function substituteVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{${key}}`, 'g'), value);
  }
  return result;
}

// ==========================================
// Bulk Pin Scheduling Strategies
// ==========================================

export type SchedulingStrategy = 'immediate' | 'optimal' | 'spread';

export interface BulkScheduleOptions {
  strategy: SchedulingStrategy;
  spreadDays?: number; // For 'spread' strategy (default: 7)
  pinsPerDay?: number; // For 'spread' strategy (default: 5)
  startDate?: Date; // Start date for scheduling (default: now)
}

export interface BulkScheduleResult {
  scheduled: number;
  failed: number;
  schedule: Array<{ pinId: string; scheduledFor: Date }>;
  errors: string[];
}

/**
 * Get optimal posting times based on historical pin performance
 * Defaults to common high-engagement times if no data available
 */
export async function getOptimalPostingTimes(
  userId: string,
  count: number = 4
): Promise<Date[]> {
  const supabase = await createServerSupabaseClient();

  // Try to get performance data by hour
  const { data: hourlyStats } = await (supabase as any)
    .from('pins')
    .select('published_at')
    .eq('user_id', userId)
    .eq('status', 'published')
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(100);

  // Default optimal times (in hours, local time assumptions)
  // Pinterest best times: 8-11am, 2-4pm, 8-11pm
  const defaultHours = [8, 12, 17, 20];

  // If we have enough data, analyze which hours perform best
  if (hourlyStats && hourlyStats.length >= 20) {
    // Count pins by hour
    const hourCounts: Record<number, number> = {};
    for (const pin of hourlyStats) {
      const hour = new Date(pin.published_at).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }

    // Get top hours
    const sortedHours = Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, count)
      .map(([hour]) => parseInt(hour));

    if (sortedHours.length >= count) {
      return sortedHours.map((hour) => {
        const date = new Date();
        date.setHours(hour, 0, 0, 0);
        return date;
      });
    }
  }

  // Return default optimal times
  return defaultHours.slice(0, count).map((hour) => {
    const date = new Date();
    date.setHours(hour, 0, 0, 0);
    return date;
  });
}

/**
 * Schedule multiple pins using a specific strategy
 */
export async function scheduleBulkPins(
  userId: string,
  pinIds: string[],
  options: BulkScheduleOptions
): Promise<BulkScheduleResult> {
  const supabase = await createServerSupabaseClient();
  const result: BulkScheduleResult = {
    scheduled: 0,
    failed: 0,
    schedule: [],
    errors: [],
  };

  if (pinIds.length === 0) {
    return result;
  }

  const startDate = options.startDate || new Date();
  let scheduleTimes: Date[] = [];

  switch (options.strategy) {
    case 'immediate':
      // All pins scheduled for now
      scheduleTimes = pinIds.map(() => new Date());
      break;

    case 'optimal':
      // Distribute pins across optimal posting times over the next days
      const optimalTimes = await getOptimalPostingTimes(userId, 4);
      const timesPerDay = optimalTimes.length;
      let dayOffset = 0;
      let timeIndex = 0;

      for (let i = 0; i < pinIds.length; i++) {
        const baseTime = new Date(optimalTimes[timeIndex]);
        baseTime.setDate(startDate.getDate() + dayOffset);
        baseTime.setMonth(startDate.getMonth());
        baseTime.setFullYear(startDate.getFullYear());

        // Add some random minutes to avoid exact same times
        baseTime.setMinutes(Math.floor(Math.random() * 15));

        scheduleTimes.push(baseTime);

        timeIndex++;
        if (timeIndex >= timesPerDay) {
          timeIndex = 0;
          dayOffset++;
        }
      }
      break;

    case 'spread':
      // Spread evenly over the specified number of days
      const spreadDays = options.spreadDays || 7;
      const pinsPerDay = options.pinsPerDay || Math.ceil(pinIds.length / spreadDays);

      // Calculate times to spread pins evenly
      const totalSlots = spreadDays * pinsPerDay;
      const interval = (spreadDays * 24 * 60) / Math.max(pinIds.length, 1); // minutes per pin

      for (let i = 0; i < pinIds.length; i++) {
        const scheduleTime = new Date(startDate);
        scheduleTime.setMinutes(scheduleTime.getMinutes() + i * interval);

        // Ensure we're within reasonable hours (8am - 10pm)
        const hour = scheduleTime.getHours();
        if (hour < 8) {
          scheduleTime.setHours(8, Math.floor(Math.random() * 30), 0, 0);
        } else if (hour >= 22) {
          // Move to next day at 8am
          scheduleTime.setDate(scheduleTime.getDate() + 1);
          scheduleTime.setHours(8, Math.floor(Math.random() * 30), 0, 0);
        }

        scheduleTimes.push(scheduleTime);
      }
      break;
  }

  // Apply schedules to pins
  for (let i = 0; i < pinIds.length; i++) {
    const pinId = pinIds[i];
    const scheduledFor = scheduleTimes[i];

    try {
      const { error } = await (supabase as any)
        .from('pins')
        .update({
          status: 'scheduled',
          scheduled_for: scheduledFor.toISOString(),
        })
        .eq('id', pinId)
        .eq('user_id', userId)
        .in('status', ['draft', 'scheduled']); // Allow rescheduling

      if (error) {
        result.errors.push(`Pin ${pinId}: ${error.message}`);
        result.failed++;
      } else {
        result.schedule.push({ pinId, scheduledFor });
        result.scheduled++;
      }
    } catch (error) {
      result.errors.push(
        `Pin ${pinId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      result.failed++;
    }
  }

  // Log bulk scheduling activity
  if (result.scheduled > 0) {
    await (supabase as any).rpc('log_activity', {
      p_user_id: userId,
      p_action_type: 'pins_bulk_scheduled',
      p_details: {
        strategy: options.strategy,
        totalPins: pinIds.length,
        scheduled: result.scheduled,
        failed: result.failed,
        spreadDays: options.spreadDays,
        pinsPerDay: options.pinsPerDay,
      },
      p_executed: true,
      p_module: 'pinterest',
    });
  }

  return result;
}

/**
 * Get the next available posting slot for a user
 * Avoids scheduling too close to existing scheduled pins
 */
export async function getNextAvailableSlot(
  userId: string,
  after: Date = new Date(),
  minGapMinutes: number = 30
): Promise<Date> {
  const supabase = await createServerSupabaseClient();

  // Get scheduled pins in the next 24 hours
  const endTime = new Date(after);
  endTime.setHours(endTime.getHours() + 24);

  const { data: scheduledPins } = await (supabase as any)
    .from('pins')
    .select('scheduled_for')
    .eq('user_id', userId)
    .eq('status', 'scheduled')
    .gte('scheduled_for', after.toISOString())
    .lte('scheduled_for', endTime.toISOString())
    .order('scheduled_for');

  if (!scheduledPins || scheduledPins.length === 0) {
    return after;
  }

  // Find a gap in the schedule
  let candidate = new Date(after);

  for (const pin of scheduledPins) {
    const pinTime = new Date(pin.scheduled_for);
    const gap = (pinTime.getTime() - candidate.getTime()) / (1000 * 60);

    if (gap >= minGapMinutes) {
      return candidate;
    }

    // Move candidate to after this pin + min gap
    candidate = new Date(pinTime.getTime() + minGapMinutes * 60 * 1000);
  }

  // If no gap found, schedule after the last pin
  const lastPin = scheduledPins[scheduledPins.length - 1];
  return new Date(
    new Date(lastPin.scheduled_for).getTime() + minGapMinutes * 60 * 1000
  );
}
