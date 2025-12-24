import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { AttributionEvent, AttributionEventType, AttributionSourceType, RevenueAttribution } from '@/types/attribution';

interface TrackEventParams {
  eventType: AttributionEventType;
  sourceType: AttributionSourceType;
  sourceId?: string;
  quoteId?: string;
  assetId?: string;
  productId?: string;
  customerId?: string;
  sessionId?: string;
  utmParams?: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
  };
  orderId?: string;
  orderTotal?: number;
}

export async function trackAttributionEvent(
  userId: string,
  params: TrackEventParams
): Promise<{ success: boolean; event?: AttributionEvent; error?: string }> {
  const supabase = await createServerSupabaseClient();

  try {
    const { data: event, error } = await (supabase as any)
      .from('attribution_events')
      .insert({
        user_id: userId,
        event_type: params.eventType,
        source_type: params.sourceType,
        source_id: params.sourceId,
        quote_id: params.quoteId,
        asset_id: params.assetId,
        product_id: params.productId,
        customer_id: params.customerId,
        session_id: params.sessionId,
        utm_source: params.utmParams?.source,
        utm_medium: params.utmParams?.medium,
        utm_campaign: params.utmParams?.campaign,
        utm_content: params.utmParams?.content,
        utm_term: params.utmParams?.term,
        order_id: params.orderId,
        order_total: params.orderTotal,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // Update content performance aggregates
    await updateContentPerformance(userId, params);

    return { success: true, event: event as AttributionEvent };
  } catch (error) {
    console.error('Track attribution event error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function updateContentPerformance(
  userId: string,
  params: TrackEventParams
): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const today = new Date().toISOString().split('T')[0];

  // Determine content type and ID
  let contentType: string | null = null;
  let contentId: string | null = null;

  if (params.quoteId) {
    contentType = 'quote';
    contentId = params.quoteId;
  } else if (params.assetId) {
    contentType = 'asset';
    contentId = params.assetId;
  } else if (params.productId) {
    contentType = 'product';
    contentId = params.productId;
  }

  if (!contentType || !contentId) return;

  // Prepare update based on event type
  const updates: Record<string, number> = {};

  switch (params.eventType) {
    case 'impression':
      updates.impressions = 1;
      break;
    case 'click':
      updates.clicks = 1;
      break;
    case 'save':
      updates.saves = 1;
      break;
    case 'add_to_cart':
      updates.add_to_carts = 1;
      break;
    case 'checkout':
      updates.checkouts = 1;
      break;
    case 'purchase':
      updates.purchases = 1;
      if (params.orderTotal) {
        updates.revenue = params.orderTotal;
      }
      break;
  }

  // Upsert daily performance
  const { data: existing } = await (supabase as any)
    .from('content_performance')
    .select('id, impressions, clicks, saves, add_to_carts, checkouts, purchases, revenue')
    .eq('user_id', userId)
    .eq('content_type', contentType)
    .eq('content_id', contentId)
    .eq('period_type', 'day')
    .eq('period_start', today)
    .single();

  if (existing) {
    await (supabase as any)
      .from('content_performance')
      .update({
        impressions: existing.impressions + (updates.impressions || 0),
        clicks: existing.clicks + (updates.clicks || 0),
        saves: existing.saves + (updates.saves || 0),
        add_to_carts: existing.add_to_carts + (updates.add_to_carts || 0),
        checkouts: existing.checkouts + (updates.checkouts || 0),
        purchases: existing.purchases + (updates.purchases || 0),
        revenue: existing.revenue + (updates.revenue || 0),
      })
      .eq('id', existing.id);
  } else {
    await (supabase as any)
      .from('content_performance')
      .insert({
        user_id: userId,
        content_type: contentType,
        content_id: contentId,
        period_type: 'day',
        period_start: today,
        ...updates,
      });
  }
}

export async function calculateRevenueAttribution(
  userId: string,
  orderId: string,
  orderTotal: number,
  orderDate: string,
  customerId?: string
): Promise<{ success: boolean; attributions?: RevenueAttribution[]; error?: string }> {
  const supabase = await createServerSupabaseClient();

  try {
    // Get default attribution model
    const { data: model } = await (supabase as any)
      .from('attribution_models')
      .select('*')
      .eq('user_id', userId)
      .eq('is_default', true)
      .single();

    const windowDays = model?.window_days || 7;
    const modelType = model?.model_type || 'last_touch';

    // Get touchpoints within attribution window
    const windowStart = new Date(orderDate);
    windowStart.setDate(windowStart.getDate() - windowDays);

    let query = (supabase as any)
      .from('attribution_events')
      .select('*')
      .eq('user_id', userId)
      .in('event_type', ['impression', 'click', 'save'])
      .gte('occurred_at', windowStart.toISOString())
      .lte('occurred_at', orderDate)
      .order('occurred_at', { ascending: true });

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    const { data: touchpoints } = await query;

    if (!touchpoints || touchpoints.length === 0) {
      return { success: true, attributions: [] };
    }

    // Calculate attribution weights based on model
    const attributions: RevenueAttribution[] = [];
    const weights = calculateWeights(touchpoints, modelType);

    for (let i = 0; i < touchpoints.length; i++) {
      const tp = touchpoints[i];
      const weight = weights[i];

      if (weight <= 0) continue;

      // Determine content type and ID
      let contentType = 'unknown';
      let contentId = tp.source_id || '';

      if (tp.quote_id) {
        contentType = 'quote';
        contentId = tp.quote_id;
      } else if (tp.asset_id) {
        contentType = 'asset';
        contentId = tp.asset_id;
      } else if (tp.product_id) {
        contentType = 'product';
        contentId = tp.product_id;
      }

      const attribution: Partial<RevenueAttribution> = {
        user_id: userId,
        order_id: orderId,
        order_total: orderTotal,
        order_date: orderDate,
        customer_id: customerId,
        model_id: model?.id,
        content_type: contentType,
        content_id: contentId,
        attribution_weight: weight,
        attributed_revenue: orderTotal * weight,
        touchpoint_type: tp.source_type,
        touchpoint_id: tp.source_id,
        touchpoint_at: tp.occurred_at,
      };

      const { data } = await (supabase as any)
        .from('revenue_attribution')
        .insert(attribution)
        .select()
        .single();

      if (data) {
        attributions.push(data as RevenueAttribution);
      }
    }

    return { success: true, attributions };
  } catch (error) {
    console.error('Calculate revenue attribution error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function calculateWeights(touchpoints: any[], modelType: string): number[] {
  const count = touchpoints.length;

  switch (modelType) {
    case 'first_touch':
      return touchpoints.map((_, i) => i === 0 ? 1 : 0);

    case 'last_touch':
      return touchpoints.map((_, i) => i === count - 1 ? 1 : 0);

    case 'linear':
      const equalWeight = 1 / count;
      return touchpoints.map(() => equalWeight);

    case 'time_decay': {
      // Half-life of 7 days
      const halfLife = 7 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      const rawWeights = touchpoints.map((tp) => {
        const age = now - new Date(tp.occurred_at).getTime();
        return Math.pow(0.5, age / halfLife);
      });
      const totalWeight = rawWeights.reduce((a, b) => a + b, 0);
      return rawWeights.map((w) => w / totalWeight);
    }

    case 'position_based': {
      if (count === 1) return [1];
      if (count === 2) return [0.5, 0.5];

      const middleWeight = 0.2 / (count - 2);
      return touchpoints.map((_, i) => {
        if (i === 0) return 0.4;
        if (i === count - 1) return 0.4;
        return middleWeight;
      });
    }

    default:
      return touchpoints.map(() => 1 / count);
  }
}

export async function getAttributionReport(
  userId: string,
  options?: {
    startDate?: string;
    endDate?: string;
    contentType?: string;
  }
): Promise<{
  totalRevenue: number;
  totalOrders: number;
  topContent: Array<{
    contentType: string;
    contentId: string;
    attributedRevenue: number;
    orderCount: number;
  }>;
}> {
  const supabase = await createServerSupabaseClient();

  let query = (supabase as any)
    .from('revenue_attribution')
    .select('content_type, content_id, attributed_revenue, order_id')
    .eq('user_id', userId);

  if (options?.startDate) {
    query = query.gte('order_date', options.startDate);
  }
  if (options?.endDate) {
    query = query.lte('order_date', options.endDate);
  }
  if (options?.contentType) {
    query = query.eq('content_type', options.contentType);
  }

  const { data } = await query;

  if (!data || data.length === 0) {
    return { totalRevenue: 0, totalOrders: 0, topContent: [] };
  }

  // Aggregate by content
  const contentMap = new Map<string, { revenue: number; orders: Set<string> }>();
  let totalRevenue = 0;
  const allOrders = new Set<string>();

  for (const attr of data) {
    const key = `${attr.content_type}:${attr.content_id}`;
    const existing = contentMap.get(key) || { revenue: 0, orders: new Set() };
    existing.revenue += attr.attributed_revenue;
    existing.orders.add(attr.order_id);
    contentMap.set(key, existing);

    totalRevenue += attr.attributed_revenue;
    allOrders.add(attr.order_id);
  }

  const topContent = Array.from(contentMap.entries())
    .map(([key, value]) => {
      const [contentType, contentId] = key.split(':');
      return {
        contentType,
        contentId,
        attributedRevenue: value.revenue,
        orderCount: value.orders.size,
      };
    })
    .sort((a, b) => b.attributedRevenue - a.attributedRevenue)
    .slice(0, 20);

  return {
    totalRevenue,
    totalOrders: allOrders.size,
    topContent,
  };
}
