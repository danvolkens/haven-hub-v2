/**
 * Post-Quiz Instagram Engagement
 * Prompt E.2: Customer engagement workflow after quiz completion
 *
 * Engagement sequence:
 * Day 1: Follow (if public)
 * Day 2: Like 2-3 recent posts
 * Day 3: Leave genuine comment on most relevant post
 * Day 7+: Watch for UGC (tagged posts or brand mentions)
 */

import { createClient } from '@/lib/supabase/server';

// ============================================================================
// Types
// ============================================================================

export type EngagementStatus =
  | 'pending'
  | 'following'
  | 'engaged'
  | 'commented'
  | 'ugc_received'
  | 'completed'
  | 'skipped';

export type TaskType = 'follow' | 'like_posts' | 'comment' | 'check_ugc' | 'send_dm';

export interface QuizEngagement {
  id: string;
  email: string;
  instagram_handle: string;
  is_public_account: boolean;
  has_purchased: boolean;
  order_id: string | null;
  purchased_at: string | null;
  followed_at: string | null;
  engaged_at: string | null;
  commented_at: string | null;
  ugc_received_at: string | null;
  engagement_status: EngagementStatus;
  notes: string | null;
  created_at: string;
}

export interface EngagementTask {
  id: string;
  quiz_engagement_id: string;
  task_type: TaskType;
  day_number: number;
  scheduled_for: string;
  instagram_handle: string;
  status: 'pending' | 'completed' | 'skipped' | 'failed';
  completed_at: string | null;
  notes: string | null;
}

export interface UGCMention {
  id: string;
  source: 'instagram_tag' | 'instagram_mention' | 'hashtag' | 'story_mention' | 'manual';
  instagram_handle: string;
  content_url: string | null;
  content_type: string;
  content_preview: string | null;
  media_url: string | null;
  status: 'pending' | 'approved' | 'featured' | 'declined' | 'expired';
  featured_at: string | null;
  thanked_at: string | null;
  reposted_at: string | null;
  discovered_at: string;
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Trigger post-quiz engagement workflow
 * Called when an order is confirmed
 */
export async function triggerPostQuizEngagement(
  email: string,
  instagramHandle: string,
  orderId?: string
): Promise<string | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error('No authenticated user');
    return null;
  }

  if (!instagramHandle) {
    return null;
  }

  // Use database function
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('trigger_post_quiz_engagement', {
    p_user_id: user.id,
    p_email: email,
    p_instagram_handle: instagramHandle.replace('@', ''),
    p_order_id: orderId || null,
  });

  if (error) {
    console.error('Failed to trigger post-quiz engagement:', error);
    return null;
  }

  return data as string;
}

/**
 * Get pending engagement tasks for today
 */
export async function getTodayEngagementTasks(): Promise<EngagementTask[]> {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('post_quiz_engagement_tasks')
    .select('*')
    .eq('scheduled_for', today)
    .eq('status', 'pending')
    .order('day_number', { ascending: true });

  if (error) {
    console.error('Failed to fetch engagement tasks:', error);
    return [];
  }

  return data as EngagementTask[];
}

/**
 * Complete an engagement task
 */
export async function completeEngagementTask(
  taskId: string,
  notes?: string
): Promise<boolean> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('post_quiz_engagement_tasks')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      notes,
    })
    .eq('id', taskId);

  if (error) {
    console.error('Failed to complete task:', error);
    return false;
  }

  // Update parent engagement record based on task type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: task } = await (supabase as any)
    .from('post_quiz_engagement_tasks')
    .select('quiz_engagement_id, task_type')
    .eq('id', taskId)
    .single();

  if (task) {
    await updateEngagementStatus(task.quiz_engagement_id, task.task_type);
  }

  return true;
}

/**
 * Update engagement record status based on completed task
 */
async function updateEngagementStatus(
  engagementId: string,
  taskType: TaskType
): Promise<void> {
  const supabase = await createClient();

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  switch (taskType) {
    case 'follow':
      updates.followed_at = new Date().toISOString();
      updates.engagement_status = 'following';
      break;
    case 'like_posts':
    case 'comment':
      updates.engaged_at = new Date().toISOString();
      updates.engagement_status = 'engaged';
      if (taskType === 'comment') {
        updates.commented_at = new Date().toISOString();
        updates.engagement_status = 'commented';
      }
      break;
    case 'check_ugc':
      // Don't update status - this is just a check
      break;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('quiz_instagram_engagement')
    .update(updates)
    .eq('id', engagementId);
}

/**
 * Skip an engagement task
 */
export async function skipEngagementTask(
  taskId: string,
  reason?: string
): Promise<boolean> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('post_quiz_engagement_tasks')
    .update({
      status: 'skipped',
      notes: reason,
    })
    .eq('id', taskId);

  return !error;
}

/**
 * Get all quiz engagements
 */
export async function getQuizEngagements(
  status?: EngagementStatus
): Promise<QuizEngagement[]> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('quiz_instagram_engagement')
    .select('*')
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('engagement_status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch quiz engagements:', error);
    return [];
  }

  return data as QuizEngagement[];
}

// ============================================================================
// UGC Monitoring Functions
// ============================================================================

/**
 * Record a UGC mention
 */
export async function recordUGCMention(
  source: UGCMention['source'],
  instagramHandle: string,
  contentUrl?: string,
  contentType?: string,
  contentPreview?: string,
  mediaUrl?: string
): Promise<string | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('ugc_mentions')
    .insert({
      user_id: user.id,
      source,
      instagram_handle: instagramHandle.replace('@', ''),
      content_url: contentUrl,
      content_type: contentType,
      content_preview: contentPreview,
      media_url: mediaUrl,
      status: 'pending',
      // Stories expire after 24 hours
      expires_at: source === 'story_mention'
        ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        : null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to record UGC mention:', error);
    return null;
  }

  // Update any matching quiz engagement
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('quiz_instagram_engagement')
    .update({
      ugc_received_at: new Date().toISOString(),
      engagement_status: 'ugc_received',
    })
    .eq('instagram_handle', instagramHandle.replace('@', ''));

  return data?.id;
}

/**
 * Get pending UGC mentions
 */
export async function getPendingUGCMentions(): Promise<UGCMention[]> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('ugc_mentions')
    .select('*')
    .eq('status', 'pending')
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('discovered_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch UGC mentions:', error);
    return [];
  }

  return data as UGCMention[];
}

/**
 * Update UGC mention status
 */
export async function updateUGCStatus(
  mentionId: string,
  status: UGCMention['status'],
  featured?: { at: Date; on: string }
): Promise<boolean> {
  const supabase = await createClient();

  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (featured) {
    updates.featured_at = featured.at.toISOString();
    updates.featured_on = featured.on;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('ugc_mentions')
    .update(updates)
    .eq('id', mentionId);

  return !error;
}

/**
 * Mark UGC as thanked
 */
export async function markUGCThanked(mentionId: string): Promise<boolean> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('ugc_mentions')
    .update({
      thanked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', mentionId);

  return !error;
}

/**
 * Mark UGC as reposted
 */
export async function markUGCReposted(mentionId: string): Promise<boolean> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('ugc_mentions')
    .update({
      reposted_at: new Date().toISOString(),
      status: 'featured',
      updated_at: new Date().toISOString(),
    })
    .eq('id', mentionId);

  return !error;
}

// ============================================================================
// Hashtags/Mentions to Monitor
// ============================================================================

export const BRAND_HASHTAGS = ['#MyHavenAndHold', '#HavenAndHold'];
export const BRAND_HANDLE = '@havenandhold';
