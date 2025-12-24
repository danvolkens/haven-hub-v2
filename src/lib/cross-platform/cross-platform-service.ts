import { createClient } from '@/lib/supabase/server';
import { CrossPlatformContent, Platform, ContentType } from '@/types/cross-platform';

// Winner thresholds by platform
const WINNER_THRESHOLDS: Record<Platform, { engagement_rate: number; min_views: number }> = {
  instagram: { engagement_rate: 0.03, min_views: 1000 },
  tiktok: { engagement_rate: 0.05, min_views: 5000 },
  youtube: { engagement_rate: 0.02, min_views: 1000 },
  twitter: { engagement_rate: 0.02, min_views: 500 },
  other: { engagement_rate: 0.03, min_views: 500 },
};

export async function addContent(
  userId: string,
  content: {
    platform: Platform;
    original_url: string;
    content_type: ContentType;
    title?: string;
    description?: string;
    image_url?: string;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    posted_at?: string;
  }
): Promise<CrossPlatformContent> {
  const supabase = await createClient();

  // Calculate engagement rate
  const engagement_rate = content.views > 0
    ? (content.likes + content.comments + content.shares + content.saves) / content.views
    : 0;

  // Calculate performance score
  const { data: scoreData } = await (supabase as any).rpc('calculate_performance_score', {
    p_views: content.views,
    p_likes: content.likes,
    p_comments: content.comments,
    p_shares: content.shares,
    p_saves: content.saves,
  });

  // Check if winner
  const threshold = WINNER_THRESHOLDS[content.platform];
  const is_winner =
    content.views >= threshold.min_views &&
    engagement_rate >= threshold.engagement_rate;

  const { data, error } = await (supabase as any)
    .from('cross_platform_content')
    .insert({
      user_id: userId,
      ...content,
      engagement_rate,
      performance_score: scoreData,
      is_winner,
      winner_detected_at: is_winner ? new Date().toISOString() : null,
      metrics_updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to add content: ${error.message}`);
  return data;
}

export async function updateMetrics(
  contentId: string,
  metrics: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  }
): Promise<CrossPlatformContent> {
  const supabase = await createClient();

  // Get current content
  const { data: current } = await (supabase as any)
    .from('cross_platform_content')
    .select('*')
    .eq('id', contentId)
    .single();

  if (!current) throw new Error('Content not found');

  // Calculate new engagement rate
  const engagement_rate = metrics.views > 0
    ? (metrics.likes + metrics.comments + metrics.shares + metrics.saves) / metrics.views
    : 0;

  // Calculate performance score
  const { data: scoreData } = await (supabase as any).rpc('calculate_performance_score', {
    p_views: metrics.views,
    p_likes: metrics.likes,
    p_comments: metrics.comments,
    p_shares: metrics.shares,
    p_saves: metrics.saves,
  });

  // Check if now a winner
  const threshold = WINNER_THRESHOLDS[current.platform as Platform];
  const is_winner =
    metrics.views >= threshold.min_views &&
    engagement_rate >= threshold.engagement_rate;

  const { data, error } = await (supabase as any)
    .from('cross_platform_content')
    .update({
      ...metrics,
      engagement_rate,
      performance_score: scoreData,
      is_winner,
      winner_detected_at: is_winner && !current.is_winner
        ? new Date().toISOString()
        : current.winner_detected_at,
      metrics_updated_at: new Date().toISOString(),
    })
    .eq('id', contentId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update metrics: ${error.message}`);
  return data;
}

export async function getWinners(userId: string): Promise<CrossPlatformContent[]> {
  const supabase = await createClient();

  const { data } = await (supabase as any)
    .from('cross_platform_content')
    .select('*')
    .eq('user_id', userId)
    .eq('is_winner', true)
    .order('performance_score', { ascending: false });

  return data || [];
}

export async function getUnadaptedWinners(userId: string): Promise<CrossPlatformContent[]> {
  const supabase = await createClient();

  const { data } = await (supabase as any)
    .from('cross_platform_content')
    .select('*')
    .eq('user_id', userId)
    .eq('is_winner', true)
    .eq('adapted_to_pinterest', false)
    .order('performance_score', { ascending: false });

  return data || [];
}

export async function markAdapted(
  contentId: string,
  pinterestPinId: string
): Promise<void> {
  const supabase = await createClient();

  await (supabase as any)
    .from('cross_platform_content')
    .update({
      adapted_to_pinterest: true,
      pinterest_pin_id: pinterestPinId,
      adapted_at: new Date().toISOString(),
    })
    .eq('id', contentId);
}
