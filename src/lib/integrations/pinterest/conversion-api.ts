import crypto from 'crypto';
import { getAdminClient } from '@/lib/supabase/admin';

export interface ConversionEvent {
  eventName: 'page_visit' | 'view_category' | 'search' | 'add_to_cart' |
             'checkout' | 'lead' | 'signup' | 'watch_video' | 'custom';
  eventId?: string;
  eventTime?: Date;
  email?: string;
  phone?: string;
  clickId?: string; // Pinterest click ID (epik)
  externalId?: string;
  currency?: string;
  value?: number;
  contentIds?: string[];
  contentName?: string;
  contentCategory?: string;
  numItems?: number;
  orderId?: string;
  actionSource?: 'web' | 'app_ios' | 'app_android' | 'offline';
}

function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value.toLowerCase().trim()).digest('hex');
}

export async function trackConversionEvent(
  userId: string,
  event: ConversionEvent
): Promise<{ success: boolean; error?: string }> {
  const supabase = getAdminClient();

  const eventId = event.eventId || `${event.eventName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const { error } = await (supabase as any)
    .from('pinterest_conversion_events')
    .insert({
      user_id: userId,
      event_name: event.eventName,
      event_id: eventId,
      event_time: event.eventTime || new Date(),
      email_hash: event.email ? hashValue(event.email) : null,
      phone_hash: event.phone ? hashValue(event.phone) : null,
      click_id: event.clickId,
      external_id: event.externalId ? hashValue(event.externalId) : null,
      currency: event.currency || 'USD',
      value: event.value,
      content_ids: event.contentIds,
      content_name: event.contentName,
      content_category: event.contentCategory,
      num_items: event.numItems,
      order_id: event.orderId,
      action_source: event.actionSource || 'web',
    });

  if (error) {
    console.error('Failed to track conversion event:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function sendEventsToPinterest(userId: string): Promise<{
  sent: number;
  failed: number;
  errors: string[];
}> {
  const supabase = getAdminClient();

  // Get Pinterest integration with access token
  const { data: integration } = await (supabase as any)
    .from('integrations')
    .select('access_token_encrypted, metadata')
    .eq('user_id', userId)
    .eq('provider', 'pinterest')
    .eq('status', 'connected')
    .single();

  if (!integration) {
    return { sent: 0, failed: 0, errors: ['Pinterest not connected'] };
  }

  const adAccountId = integration.metadata?.ad_account_id;
  if (!adAccountId) {
    return { sent: 0, failed: 0, errors: ['No ad account connected'] };
  }

  // Get pending events (up to 1000 per batch)
  const { data: events, error: fetchError } = await (supabase as any)
    .from('pinterest_conversion_events')
    .select('*')
    .eq('user_id', userId)
    .eq('sent_to_pinterest', false)
    .order('event_time', { ascending: true })
    .limit(1000);

  if (fetchError) {
    return { sent: 0, failed: 0, errors: [`Failed to fetch events: ${fetchError.message}`] };
  }

  if (!events || events.length === 0) {
    return { sent: 0, failed: 0, errors: [] };
  }

  // Format events for Pinterest API
  const pinterestEvents = events.map((e: any) => {
    const userData: Record<string, any> = {};
    if (e.email_hash) userData.em = [e.email_hash];
    if (e.phone_hash) userData.ph = [e.phone_hash];
    if (e.click_id) userData.click_id = e.click_id;
    if (e.external_id) userData.external_id = [e.external_id];

    const customData: Record<string, any> = {};
    if (e.currency) customData.currency = e.currency;
    if (e.value !== null && e.value !== undefined) customData.value = e.value.toString();
    if (e.content_ids?.length) customData.content_ids = e.content_ids;
    if (e.content_name) customData.content_name = e.content_name;
    if (e.content_category) customData.content_category = e.content_category;
    if (e.num_items) customData.num_items = e.num_items;
    if (e.order_id) customData.order_id = e.order_id;

    return {
      event_name: e.event_name.toUpperCase(),
      action_source: e.action_source,
      event_time: Math.floor(new Date(e.event_time).getTime() / 1000),
      event_id: e.event_id,
      user_data: userData,
      custom_data: Object.keys(customData).length > 0 ? customData : undefined,
      partner_name: 'haven_hub',
    };
  });

  // Send to Pinterest Conversion API
  // Note: In production, access_token should be decrypted first
  const accessToken = integration.access_token_encrypted;

  try {
    const response = await fetch(
      `https://api.pinterest.com/v5/ad_accounts/${adAccountId}/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: pinterestEvents }),
      }
    );

    const responseData = await response.json();

    if (!response.ok) {
      // Update events with error
      const eventIds = events.map((e: any) => e.id);
      await (supabase as any)
        .from('pinterest_conversion_events')
        .update({
          error: responseData.message || `API error: ${response.status}`,
          pinterest_response: responseData,
        })
        .in('id', eventIds);

      return {
        sent: 0,
        failed: events.length,
        errors: [responseData.message || `API error: ${response.status}`]
      };
    }

    // Mark as sent
    const eventIds = events.map((e: any) => e.id);
    await (supabase as any)
      .from('pinterest_conversion_events')
      .update({
        sent_to_pinterest: true,
        sent_at: new Date().toISOString(),
        pinterest_response: responseData,
        error: null,
      })
      .in('id', eventIds);

    return { sent: events.length, failed: 0, errors: [] };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    return { sent: 0, failed: events.length, errors: [error] };
  }
}

// Send events for all users with pending events
export async function sendAllPendingEvents(): Promise<{
  usersProcessed: number;
  totalSent: number;
  totalFailed: number;
  errors: string[];
}> {
  const supabase = getAdminClient();

  // Get unique users with pending events
  const { data: pendingUsers, error: queryError } = await (supabase as any)
    .from('pinterest_conversion_events')
    .select('user_id')
    .eq('sent_to_pinterest', false)
    .limit(100);

  if (queryError) {
    return { usersProcessed: 0, totalSent: 0, totalFailed: 0, errors: [queryError.message] };
  }

  // Get unique user IDs
  const userIds = [...new Set(pendingUsers?.map((p: any) => p.user_id) || [])];

  let totalSent = 0;
  let totalFailed = 0;
  const errors: string[] = [];

  for (const userId of userIds) {
    const result = await sendEventsToPinterest(userId as string);
    totalSent += result.sent;
    totalFailed += result.failed;
    errors.push(...result.errors);
  }

  return {
    usersProcessed: userIds.length,
    totalSent,
    totalFailed,
    errors,
  };
}

// Track common event types with convenience functions
export async function trackLead(
  userId: string,
  email: string,
  options?: {
    clickId?: string;
    externalId?: string;
    source?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  return trackConversionEvent(userId, {
    eventName: 'lead',
    email,
    clickId: options?.clickId,
    externalId: options?.externalId,
    contentName: options?.source || 'Lead Capture',
  });
}

export async function trackSignup(
  userId: string,
  email: string,
  options?: {
    clickId?: string;
    externalId?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  return trackConversionEvent(userId, {
    eventName: 'signup',
    email,
    clickId: options?.clickId,
    externalId: options?.externalId,
  });
}

export async function trackAddToCart(
  userId: string,
  options: {
    email?: string;
    clickId?: string;
    productIds: string[];
    productNames?: string[];
    value?: number;
    currency?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  return trackConversionEvent(userId, {
    eventName: 'add_to_cart',
    email: options.email,
    clickId: options.clickId,
    contentIds: options.productIds,
    contentName: options.productNames?.join(', '),
    value: options.value,
    currency: options.currency || 'USD',
    numItems: options.productIds.length,
  });
}

export async function trackCheckout(
  userId: string,
  options: {
    email?: string;
    clickId?: string;
    orderId: string;
    productIds: string[];
    value: number;
    currency?: string;
    numItems?: number;
  }
): Promise<{ success: boolean; error?: string }> {
  return trackConversionEvent(userId, {
    eventName: 'checkout',
    email: options.email,
    clickId: options.clickId,
    orderId: options.orderId,
    contentIds: options.productIds,
    value: options.value,
    currency: options.currency || 'USD',
    numItems: options.numItems || options.productIds.length,
  });
}

export async function trackViewCategory(
  userId: string,
  options: {
    email?: string;
    clickId?: string;
    externalId?: string;
    categoryName: string;
    productIds?: string[];
    numItems?: number;
  }
): Promise<{ success: boolean; error?: string }> {
  return trackConversionEvent(userId, {
    eventName: 'view_category',
    email: options.email,
    clickId: options.clickId,
    externalId: options.externalId,
    contentCategory: options.categoryName,
    contentIds: options.productIds,
    numItems: options.numItems,
  });
}

export async function trackPageVisit(
  userId: string,
  options: {
    email?: string;
    clickId?: string;
    externalId?: string;
    pageName?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  return trackConversionEvent(userId, {
    eventName: 'page_visit',
    email: options.email,
    clickId: options.clickId,
    externalId: options.externalId,
    contentName: options.pageName,
  });
}

export async function trackSearch(
  userId: string,
  options: {
    email?: string;
    clickId?: string;
    externalId?: string;
    searchQuery: string;
    numResults?: number;
  }
): Promise<{ success: boolean; error?: string }> {
  return trackConversionEvent(userId, {
    eventName: 'search',
    email: options.email,
    clickId: options.clickId,
    externalId: options.externalId,
    contentName: options.searchQuery,
    numItems: options.numResults,
  });
}
