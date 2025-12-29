/**
 * TikTok Attribution Tracking
 * Prompt K.4: TikTok → Shopify conversion attribution
 *
 * Funnel: TikTok Video → Profile Visit → Link Click → Quiz/Shop → Purchase
 *
 * UTM Parameters:
 * - utm_source=tiktok
 * - utm_medium=organic
 * - utm_campaign={{content_pillar}}
 * - utm_content={{post_id}}
 */

import { createClient } from '@/lib/supabase/server';

// ============================================================================
// Types
// ============================================================================

export interface AttributionEvent {
  session_id: string;
  visitor_id?: string;
  tiktok_post_id?: string;
  content_pillar?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  landing_page?: string;
  referrer?: string;
}

export interface ConversionEvent {
  session_id: string;
  event_type: 'quiz_started' | 'quiz_completed' | 'email_captured' | 'added_to_cart' | 'checkout_started' | 'purchase_made';
  email_address?: string;
  order_id?: string;
  order_value?: number;
  products_purchased?: string[];
}

export interface ConversionFunnel {
  total_sessions: number;
  profile_visits: number;
  link_clicks: number;
  quiz_starts: number;
  quiz_completions: number;
  email_captures: number;
  cart_adds: number;
  checkouts: number;
  purchases: number;
  total_revenue: number;
  conversion_rate: number;
}

export interface TopConvertingPost {
  post_id: string;
  title: string;
  content_pillar: string;
  sessions: number;
  purchases: number;
  revenue: number;
  conversion_rate: number;
}

export interface PillarConversion {
  pillar: string;
  sessions: number;
  views: number;
  purchases: number;
  revenue: number;
  conversion_rate: number;
}

// ============================================================================
// UTM Generation
// ============================================================================

/**
 * Generate UTM parameters for a TikTok post
 */
export function generateUTMParams(
  postId: string,
  contentPillar: string,
  medium: 'organic' | 'paid' = 'organic'
): Record<string, string> {
  return {
    utm_source: 'tiktok',
    utm_medium: medium,
    utm_campaign: contentPillar,
    utm_content: postId,
  };
}

/**
 * Generate full URL with UTM parameters
 */
export function generateTrackingUrl(
  baseUrl: string,
  postId: string,
  contentPillar: string
): string {
  const params = generateUTMParams(postId, contentPillar);
  const url = new URL(baseUrl);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}

/**
 * Generate link-in-bio URLs with tracking
 */
export function generateLinkInBioUrls(
  baseUrl: string,
  postId: string,
  contentPillar: string
): {
  featured: string;
  popular: string;
  bundles: string;
  freebie: string;
  shop: string;
} {
  const addParams = (path: string) => {
    return generateTrackingUrl(`${baseUrl}${path}`, postId, contentPillar);
  };

  return {
    featured: addParams('/featured'),
    popular: addParams('/collections/best-sellers'),
    bundles: addParams('/collections/bundles'),
    freebie: addParams('/freebie'),
    shop: addParams('/collections/all'),
  };
}

// ============================================================================
// Attribution Recording
// ============================================================================

/**
 * Record a new attribution session
 */
export async function recordAttribution(
  event: AttributionEvent
): Promise<string | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Look up post ID from utm_content if provided
  let tiktokPostId = event.tiktok_post_id;
  if (!tiktokPostId && event.utm_content) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: post } = await (supabase as any)
      .from('tiktok_queue')
      .select('id')
      .eq('id', event.utm_content)
      .single();

    tiktokPostId = post?.id;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('tiktok_attribution')
    .insert({
      user_id: user?.id,
      session_id: event.session_id,
      visitor_id: event.visitor_id,
      tiktok_post_id: tiktokPostId,
      content_pillar: event.content_pillar || event.utm_campaign,
      utm_source: event.utm_source,
      utm_medium: event.utm_medium,
      utm_campaign: event.utm_campaign,
      utm_content: event.utm_content,
      landing_page: event.landing_page,
      referrer: event.referrer,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to record attribution:', error);
    return null;
  }

  return data.id;
}

/**
 * Update session with page views
 */
export async function updateSessionPages(
  sessionId: string,
  pages: string[]
): Promise<boolean> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('tiktok_attribution')
    .update({
      pages_viewed: pages,
      updated_at: new Date().toISOString(),
    })
    .eq('session_id', sessionId);

  return !error;
}

/**
 * Record a conversion event
 */
export async function recordConversion(
  event: ConversionEvent
): Promise<boolean> {
  const supabase = await createClient();

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  switch (event.event_type) {
    case 'quiz_started':
      updates.quiz_started = true;
      break;
    case 'quiz_completed':
      updates.quiz_completed = true;
      break;
    case 'email_captured':
      updates.email_captured = true;
      updates.email_address = event.email_address;
      break;
    case 'added_to_cart':
      updates.added_to_cart = true;
      break;
    case 'checkout_started':
      updates.checkout_started = true;
      break;
    case 'purchase_made':
      updates.purchase_made = true;
      updates.order_id = event.order_id;
      updates.order_value = event.order_value;
      updates.products_purchased = event.products_purchased;
      break;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('tiktok_attribution')
    .update(updates)
    .eq('session_id', event.session_id);

  return !error;
}

// ============================================================================
// Attribution Analytics
// ============================================================================

/**
 * Get conversion funnel for a period
 */
export async function getConversionFunnel(
  startDate: Date,
  endDate: Date
): Promise<ConversionFunnel> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createEmptyFunnel();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sessions } = await (supabase as any)
    .from('tiktok_attribution')
    .select('*')
    .eq('user_id', user.id)
    .eq('utm_source', 'tiktok')
    .gte('landed_at', startDate.toISOString())
    .lte('landed_at', endDate.toISOString());

  if (!sessions || sessions.length === 0) {
    return createEmptyFunnel();
  }

  const stats = {
    total_sessions: sessions.length,
    profile_visits: sessions.length, // All sessions came from profile
    link_clicks: sessions.length, // All sessions are link clicks
    quiz_starts: 0,
    quiz_completions: 0,
    email_captures: 0,
    cart_adds: 0,
    checkouts: 0,
    purchases: 0,
    total_revenue: 0,
  };

  for (const session of sessions) {
    if (session.quiz_started) stats.quiz_starts++;
    if (session.quiz_completed) stats.quiz_completions++;
    if (session.email_captured) stats.email_captures++;
    if (session.added_to_cart) stats.cart_adds++;
    if (session.checkout_started) stats.checkouts++;
    if (session.purchase_made) {
      stats.purchases++;
      stats.total_revenue += session.order_value || 0;
    }
  }

  return {
    ...stats,
    conversion_rate: stats.total_sessions > 0
      ? Math.round((stats.purchases / stats.total_sessions) * 10000) / 100
      : 0,
  };
}

/**
 * Get top converting posts
 */
export async function getTopConvertingPosts(
  limit: number = 10
): Promise<TopConvertingPost[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Get attribution data grouped by post
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sessions } = await (supabase as any)
    .from('tiktok_attribution')
    .select(`
      tiktok_post_id,
      purchase_made,
      order_value,
      tiktok_queue(title, content_pillar)
    `)
    .eq('user_id', user.id)
    .not('tiktok_post_id', 'is', null);

  if (!sessions) return [];

  // Group by post
  const postStats = new Map<string, {
    title: string;
    content_pillar: string;
    sessions: number;
    purchases: number;
    revenue: number;
  }>();

  for (const session of sessions) {
    const postId = session.tiktok_post_id;
    const existing = postStats.get(postId) || {
      title: session.tiktok_queue?.title || 'Untitled',
      content_pillar: session.tiktok_queue?.content_pillar || 'unknown',
      sessions: 0,
      purchases: 0,
      revenue: 0,
    };

    existing.sessions++;
    if (session.purchase_made) {
      existing.purchases++;
      existing.revenue += session.order_value || 0;
    }

    postStats.set(postId, existing);
  }

  // Convert to array and sort by revenue
  return Array.from(postStats.entries())
    .map(([postId, stats]) => ({
      post_id: postId,
      ...stats,
      conversion_rate: stats.sessions > 0
        ? Math.round((stats.purchases / stats.sessions) * 10000) / 100
        : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

/**
 * Get conversion by content pillar
 */
export async function getPillarConversions(): Promise<PillarConversion[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Get attribution data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sessions } = await (supabase as any)
    .from('tiktok_attribution')
    .select('content_pillar, purchase_made, order_value')
    .eq('user_id', user.id)
    .eq('utm_source', 'tiktok');

  if (!sessions) return [];

  // Get views by pillar
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: metrics } = await (supabase as any)
    .from('tiktok_post_metrics')
    .select(`
      views,
      tiktok_queue!inner(content_pillar)
    `)
    .eq('user_id', user.id);

  // Aggregate views by pillar
  const pillarViews = new Map<string, number>();
  for (const m of metrics || []) {
    const pillar = m.tiktok_queue?.content_pillar;
    if (pillar) {
      pillarViews.set(pillar, (pillarViews.get(pillar) || 0) + (m.views || 0));
    }
  }

  // Aggregate sessions by pillar
  const pillarStats = new Map<string, { sessions: number; purchases: number; revenue: number }>();

  for (const session of sessions) {
    const pillar = session.content_pillar || 'unknown';
    const existing = pillarStats.get(pillar) || { sessions: 0, purchases: 0, revenue: 0 };

    existing.sessions++;
    if (session.purchase_made) {
      existing.purchases++;
      existing.revenue += session.order_value || 0;
    }

    pillarStats.set(pillar, existing);
  }

  return Array.from(pillarStats.entries())
    .map(([pillar, stats]) => ({
      pillar,
      sessions: stats.sessions,
      views: pillarViews.get(pillar) || 0,
      purchases: stats.purchases,
      revenue: stats.revenue,
      conversion_rate: stats.sessions > 0
        ? Math.round((stats.purchases / stats.sessions) * 10000) / 100
        : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

// ============================================================================
// Helpers
// ============================================================================

function createEmptyFunnel(): ConversionFunnel {
  return {
    total_sessions: 0,
    profile_visits: 0,
    link_clicks: 0,
    quiz_starts: 0,
    quiz_completions: 0,
    email_captures: 0,
    cart_adds: 0,
    checkouts: 0,
    purchases: 0,
    total_revenue: 0,
    conversion_rate: 0,
  };
}
