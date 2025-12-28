/**
 * Instagram Notification System
 * Prompt 12.4: User notifications for important events
 */

import { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Types
// ============================================================================

export type NotificationType =
  | 'post_failed'
  | 'review_pending'
  | 'pool_critical'
  | 'rate_limit_warning'
  | 'token_expiring'
  | 'token_failed'
  | 'metrics_available';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  created_at: string;
}

export interface NotificationPreferences {
  email_enabled: boolean;
  email_on_failure: boolean;
  email_digest_enabled: boolean;
  digest_time: string;
}

// ============================================================================
// Notification Templates
// ============================================================================

const NOTIFICATION_TEMPLATES: Record<NotificationType, {
  title: string;
  getLink?: () => string;
}> = {
  post_failed: {
    title: 'Post Failed',
    getLink: () => '/dashboard/instagram/review',
  },
  review_pending: {
    title: 'Posts Awaiting Review',
    getLink: () => '/dashboard/instagram/review',
  },
  pool_critical: {
    title: 'Asset Pool Critical',
    getLink: () => '/dashboard/instagram/footage',
  },
  rate_limit_warning: {
    title: 'Rate Limit Warning',
    getLink: () => '/dashboard/instagram',
  },
  token_expiring: {
    title: 'Token Expiring Soon',
    getLink: () => '/dashboard/settings/instagram',
  },
  token_failed: {
    title: 'Token Refresh Failed',
    getLink: () => '/dashboard/settings/instagram',
  },
  metrics_available: {
    title: 'New Analytics Available',
    getLink: () => '/dashboard/instagram/analytics',
  },
};

// ============================================================================
// Functions
// ============================================================================

export async function createNotification(
  supabase: SupabaseClient,
  userId: string,
  type: NotificationType,
  message: string,
  link?: string
): Promise<void> {
  const template = NOTIFICATION_TEMPLATES[type];

  try {
    await (supabase as any)
      .from('instagram_notifications')
      .insert({
        user_id: userId,
        type,
        title: template.title,
        message,
        link: link || template.getLink?.() || null,
      });
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}

export async function getNotifications(
  supabase: SupabaseClient,
  userId: string,
  options?: {
    unreadOnly?: boolean;
    limit?: number;
  }
): Promise<Notification[]> {
  let query = (supabase as any)
    .from('instagram_notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(options?.limit || 20);

  if (options?.unreadOnly) {
    query = query.eq('read', false);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch notifications:', error);
    return [];
  }

  return data || [];
}

export async function getUnreadCount(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { count, error } = await (supabase as any)
    .from('instagram_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) {
    return 0;
  }

  return count || 0;
}

export async function markAsRead(
  supabase: SupabaseClient,
  userId: string,
  notificationIds: string[]
): Promise<void> {
  await (supabase as any)
    .from('instagram_notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .in('id', notificationIds);
}

export async function markAllAsRead(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  await (supabase as any)
    .from('instagram_notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
}

export async function getNotificationPreferences(
  supabase: SupabaseClient,
  userId: string
): Promise<NotificationPreferences> {
  const { data } = await (supabase as any)
    .from('instagram_notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  return {
    email_enabled: data?.email_enabled ?? false,
    email_on_failure: data?.email_on_failure ?? true,
    email_digest_enabled: data?.email_digest_enabled ?? false,
    digest_time: data?.digest_time ?? '09:00:00',
  };
}

export async function updateNotificationPreferences(
  supabase: SupabaseClient,
  userId: string,
  preferences: Partial<NotificationPreferences>
): Promise<void> {
  await (supabase as any)
    .from('instagram_notification_preferences')
    .upsert({
      user_id: userId,
      ...preferences,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
}

// ============================================================================
// Notification Triggers
// ============================================================================

export async function notifyPostFailed(
  supabase: SupabaseClient,
  userId: string,
  postId: string,
  error: string
): Promise<void> {
  await createNotification(
    supabase,
    userId,
    'post_failed',
    `Failed to publish post: ${error}`,
    `/dashboard/instagram/review`
  );
}

export async function notifyReviewPending(
  supabase: SupabaseClient,
  userId: string,
  count: number
): Promise<void> {
  await createNotification(
    supabase,
    userId,
    'review_pending',
    `You have ${count} post${count > 1 ? 's' : ''} awaiting review`
  );
}

export async function notifyPoolCritical(
  supabase: SupabaseClient,
  userId: string,
  poolType: 'footage' | 'music',
  collection: string,
  count: number
): Promise<void> {
  await createNotification(
    supabase,
    userId,
    'pool_critical',
    `${poolType === 'footage' ? 'Stock footage' : 'Music'} pool for "${collection}" is critical (${count} items remaining)`,
    `/dashboard/instagram/${poolType}`
  );
}

export async function notifyRateLimitWarning(
  supabase: SupabaseClient,
  userId: string,
  limitType: string,
  remaining: number
): Promise<void> {
  await createNotification(
    supabase,
    userId,
    'rate_limit_warning',
    `Approaching ${limitType} rate limit: ${remaining} remaining`
  );
}

export async function notifyTokenExpiring(
  supabase: SupabaseClient,
  userId: string,
  daysRemaining: number
): Promise<void> {
  await createNotification(
    supabase,
    userId,
    'token_expiring',
    `Your Instagram access token expires in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}. Please reconnect your account.`
  );
}
