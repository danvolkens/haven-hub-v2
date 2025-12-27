import { getAdminClient } from '@/lib/supabase/admin';
import { PinterestClient, type PinterestBoard, type CreatePinRequest } from './client';
import { PINTEREST_CONFIG, getPinterestAuthUrl } from './config';

// Get Pinterest access token for user from integrations table
export async function getPinterestToken(userId: string): Promise<string | null> {
  const supabase = getAdminClient();

  // Try to get token from vault first
  try {
    const { data, error } = await supabase.rpc('get_credential', {
      p_user_id: userId,
      p_provider: 'pinterest',
      p_credential_type: 'access_token',
    });

    if (!error && data) {
      return data;
    }
  } catch (err) {
    console.log('Vault not available, checking metadata fallback');
  }

  // Fallback to metadata (for local dev when vault isn't available)
  const { data: integration } = await (supabase as any)
    .from('integrations')
    .select('metadata')
    .eq('user_id', userId)
    .eq('provider', 'pinterest')
    .eq('status', 'connected')
    .single();

  return integration?.metadata?._access_token || null;
}

// Create Pinterest client for user
export async function getPinterestClient(userId: string): Promise<PinterestClient | null> {
  const accessToken = await getPinterestToken(userId);
  if (!accessToken) return null;
  return new PinterestClient({ accessToken });
}

// Exchange OAuth code for tokens
export async function exchangePinterestCode(code: string, redirectUri: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const response = await fetch('https://api.pinterest.com/v5/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${PINTEREST_CONFIG.clientId}:${PINTEREST_CONFIG.clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || 'Failed to exchange Pinterest code');
  }

  return response.json();
}

// Refresh Pinterest access token
export async function refreshPinterestToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const response = await fetch('https://api.pinterest.com/v5/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${PINTEREST_CONFIG.clientId}:${PINTEREST_CONFIG.clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || 'Failed to refresh Pinterest token');
  }

  return response.json();
}

// Save Pinterest integration to database
export async function savePinterestIntegration(
  userId: string,
  credentials: { access_token: string; refresh_token: string; expires_in: number },
  userInfo: { username: string; profile_image?: string }
): Promise<void> {
  const supabase = getAdminClient();

  // Try to store tokens in vault (may fail in local dev without vault extension)
  try {
    await supabase.rpc('store_credential', {
      p_user_id: userId,
      p_provider: 'pinterest',
      p_credential_type: 'access_token',
      p_credential_value: credentials.access_token,
    });

    await supabase.rpc('store_credential', {
      p_user_id: userId,
      p_provider: 'pinterest',
      p_credential_type: 'refresh_token',
      p_credential_value: credentials.refresh_token,
    });
  } catch (err) {
    console.log('Vault storage not available, storing in metadata fallback');
  }

  const tokenExpiresAt = new Date(Date.now() + credentials.expires_in * 1000).toISOString();

  // Upsert integration record - include token in metadata as fallback for local dev
  await (supabase as any)
    .from('integrations')
    .upsert({
      user_id: userId,
      provider: 'pinterest',
      status: 'connected',
      metadata: {
        username: userInfo.username,
        profile_image: userInfo.profile_image,
        // Fallback for local dev when vault isn't available
        _access_token: credentials.access_token,
        _refresh_token: credentials.refresh_token,
      },
      token_expires_at: tokenExpiresAt,
      connected_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,provider',
    });
}

// Disconnect Pinterest
export async function disconnectPinterest(userId: string): Promise<void> {
  const supabase = getAdminClient();

  // Delete credentials from vault
  await supabase.rpc('delete_credentials', {
    p_user_id: userId,
    p_provider: 'pinterest',
  });

  // Update integration status
  await (supabase as any)
    .from('integrations')
    .update({
      status: 'disconnected',
      disconnected_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('provider', 'pinterest');
}

// Sync boards from Pinterest
export async function syncPinterestBoards(userId: string): Promise<PinterestBoard[]> {
  const client = await getPinterestClient(userId);
  if (!client) throw new Error('Pinterest not connected');

  const supabase = getAdminClient();
  const boards: PinterestBoard[] = [];
  let bookmark: string | undefined;

  // Fetch all boards with pagination
  do {
    const response = await client.getBoards({ page_size: 100, bookmark });
    boards.push(...response.items);
    bookmark = response.bookmark;
  } while (bookmark);

  // Upsert boards to database
  for (const board of boards) {
    await (supabase as any)
      .from('pinterest_boards')
      .upsert({
        user_id: userId,
        pinterest_board_id: board.id,
        name: board.name,
        description: board.description || '',
        privacy: board.privacy,
        pin_count: board.pin_count || 0,
        follower_count: board.follower_count || 0,
        synced_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,pinterest_board_id',
      });
  }

  return boards;
}

// Get boards from database
export async function getBoards(userId: string): Promise<any[]> {
  const supabase = getAdminClient();

  const { data, error } = await (supabase as any)
    .from('pinterest_boards')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

// Update board collection mapping
export async function updateBoardCollection(
  boardId: string,
  collection: 'grounding' | 'wholeness' | 'growth' | null,
  isPrimary: boolean = false
): Promise<void> {
  const supabase = getAdminClient();

  await (supabase as any)
    .from('pinterest_boards')
    .update({ collection, is_primary: isPrimary })
    .eq('id', boardId);
}

// Create a pin
export async function createPin(
  userId: string,
  data: {
    boardId: string; // Pinterest board ID
    imageUrl: string;
    title: string;
    description?: string;
    link?: string;
    altText?: string;
    assetId?: string;
    mockupId?: string;
    quoteId?: string;
    collection?: string;
    scheduledFor?: Date;
    // New fields for copy templates and hashtags
    copyTemplateId?: string;
    copyVariant?: string;
    hashtags?: string[];
  }
): Promise<{ pinId: string; status: string }> {
  const supabase = getAdminClient();

  // Get the internal board record
  const { data: board } = await (supabase as any)
    .from('pinterest_boards')
    .select('id')
    .eq('user_id', userId)
    .eq('pinterest_board_id', data.boardId)
    .single();

  // Build description with hashtags if provided
  let finalDescription = data.description || '';
  if (data.hashtags && data.hashtags.length > 0) {
    const hashtagString = data.hashtags.map(tag => `#${tag.replace(/^#/, '')}`).join(' ');
    // Append hashtags to description if there's room (500 char limit)
    if (finalDescription) {
      const combined = `${finalDescription}\n\n${hashtagString}`;
      if (combined.length <= 500) {
        finalDescription = combined;
      }
    } else {
      finalDescription = hashtagString;
    }
  }

  // Create pin record in database
  const { data: pin, error } = await (supabase as any)
    .from('pins')
    .insert({
      user_id: userId,
      pinterest_board_id: data.boardId,
      board_id: board?.id,
      image_url: data.imageUrl,
      title: data.title,
      description: finalDescription || null,
      link: data.link,
      alt_text: data.altText,
      asset_id: data.assetId,
      mockup_id: data.mockupId,
      quote_id: data.quoteId,
      collection: data.collection,
      copy_template_id: data.copyTemplateId,
      copy_variant: data.copyVariant,
      status: data.scheduledFor ? 'scheduled' : 'draft',
      scheduled_for: data.scheduledFor?.toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  return { pinId: pin.id, status: pin.status };
}

// Publish a pin to Pinterest
export async function publishPin(pinId: string): Promise<{ pinterestPinId: string }> {
  const supabase = getAdminClient();

  // Get pin data
  const { data: pin, error: fetchError } = await (supabase as any)
    .from('pins')
    .select('*, pinterest_boards(*)')
    .eq('id', pinId)
    .single();

  if (fetchError || !pin) throw new Error('Pin not found');

  // Get Pinterest client
  const client = await getPinterestClient(pin.user_id);
  if (!client) throw new Error('Pinterest not connected');

  // Update status to publishing
  await (supabase as any)
    .from('pins')
    .update({ status: 'publishing' })
    .eq('id', pinId);

  try {
    // Create pin on Pinterest
    const pinRequest: CreatePinRequest = {
      board_id: pin.pinterest_board_id,
      media_source: {
        source_type: 'image_url',
        url: pin.image_url,
      },
      title: pin.title,
      description: pin.description,
      link: pin.link,
      alt_text: pin.alt_text,
    };

    const pinterestPin = await client.createPin(pinRequest);

    // Update pin record with Pinterest ID
    await (supabase as any)
      .from('pins')
      .update({
        pinterest_pin_id: pinterestPin.id,
        status: 'published',
        published_at: new Date().toISOString(),
        last_error: null,
      })
      .eq('id', pinId);

    return { pinterestPinId: pinterestPin.id };
  } catch (error) {
    // Update status to failed
    await (supabase as any)
      .from('pins')
      .update({
        status: 'failed',
        last_error: error instanceof Error ? error.message : 'Unknown error',
        retry_count: pin.retry_count + 1,
      })
      .eq('id', pinId);

    throw error;
  }
}

// Get pins from database
export async function getPins(
  userId: string,
  options?: {
    status?: string;
    boardId?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ pins: any[]; total: number }> {
  const supabase = getAdminClient();

  let query = (supabase as any)
    .from('pins')
    .select('*, pinterest_boards(name)', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  if (options?.boardId) {
    query = query.eq('pinterest_board_id', options.boardId);
  }

  if (options?.limit) {
    query = query.range(
      options.offset || 0,
      (options.offset || 0) + options.limit - 1
    );
  }

  const { data, error, count } = await query;

  if (error) throw error;
  return { pins: data || [], total: count || 0 };
}

// Get scheduled pins for processing
export async function getScheduledPins(): Promise<any[]> {
  const supabase = getAdminClient();

  const { data } = await (supabase as any)
    .from('pins')
    .select('*')
    .eq('status', 'scheduled')
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(50);

  return data || [];
}

// Delete a pin
export async function deletePin(pinId: string, userId: string): Promise<void> {
  const supabase = getAdminClient();

  // Get pin to check if published
  const { data: pin } = await (supabase as any)
    .from('pins')
    .select('pinterest_pin_id, user_id')
    .eq('id', pinId)
    .single();

  if (!pin || pin.user_id !== userId) {
    throw new Error('Pin not found');
  }

  // If published, delete from Pinterest
  if (pin.pinterest_pin_id) {
    const client = await getPinterestClient(userId);
    if (client) {
      try {
        await client.deletePin(pin.pinterest_pin_id);
      } catch {
        // Ignore errors if pin already deleted on Pinterest
      }
    }
  }

  // Delete from database
  await (supabase as any)
    .from('pins')
    .delete()
    .eq('id', pinId);
}

// Get Pinterest connection status
export async function getPinterestStatus(userId: string): Promise<{
  connected: boolean;
  username?: string;
  profileImage?: string;
}> {
  const supabase = getAdminClient();

  const { data } = await (supabase as any)
    .from('integrations')
    .select('metadata, status')
    .eq('user_id', userId)
    .eq('provider', 'pinterest')
    .single();

  if (!data || data.status !== 'connected') {
    return { connected: false };
  }

  return {
    connected: true,
    username: data.metadata?.username,
    profileImage: data.metadata?.profile_image,
  };
}

// Sync analytics for all published pins
export async function syncPinAnalytics(userId: string): Promise<{
  synced: number;
  updated: number;
}> {
  const client = await getPinterestClient(userId);
  if (!client) throw new Error('Pinterest not connected');

  const supabase = getAdminClient();
  let synced = 0;
  let updated = 0;

  // Get all published pins with Pinterest IDs
  const { data: pins, error } = await (supabase as any)
    .from('pins')
    .select('id, pinterest_pin_id')
    .eq('user_id', userId)
    .eq('status', 'published')
    .not('pinterest_pin_id', 'is', null);

  if (error) throw error;
  if (!pins || pins.length === 0) {
    return { synced: 0, updated: 0 };
  }

  // Get analytics for each pin
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  for (const pin of pins) {
    try {
      const analytics = await client.getPinAnalytics(pin.pinterest_pin_id, {
        start_date: startDate,
        end_date: endDate,
        metric_types: ['IMPRESSION', 'SAVE', 'PIN_CLICK', 'OUTBOUND_CLICK'],
      });

      synced++;

      // Sum up the metrics from all_time aggregate
      const impressions = analytics.all_time?.impressions || 0;
      const saves = analytics.all_time?.saves || 0;
      const clicks = analytics.all_time?.clicks || 0;

      // Update pin with analytics
      const { error: updateError } = await (supabase as any)
        .from('pins')
        .update({
          impressions,
          saves,
          clicks,
          engagement_rate: impressions > 0 ? (saves + clicks) / impressions : 0,
          analytics_updated_at: new Date().toISOString(),
        })
        .eq('id', pin.id);

      if (!updateError) {
        updated++;
      }
    } catch (err) {
      console.error(`Failed to sync analytics for pin ${pin.id}:`, err);
    }
  }

  return { synced, updated };
}

export { getPinterestAuthUrl };
