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
