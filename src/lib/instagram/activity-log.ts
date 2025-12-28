/**
 * Instagram Activity Logging
 * Prompt 12.3: Comprehensive activity logging
 */

import { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Types
// ============================================================================

export type EventType =
  | 'post_scheduled'
  | 'post_published'
  | 'post_failed'
  | 'post_approved'
  | 'post_rejected'
  | 'video_generated'
  | 'video_generation_failed'
  | 'story_scheduled'
  | 'story_published'
  | 'tiktok_queued'
  | 'tiktok_posted'
  | 'metrics_synced'
  | 'auto_stories_scheduled'
  | 'token_refreshed'
  | 'token_refresh_failed'
  | 'footage_added'
  | 'music_added'
  | 'template_created'
  | 'hashtag_set_created';

export interface ActivityLogEntry {
  id: string;
  user_id: string;
  event_type: EventType;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

// ============================================================================
// Event Display Config
// ============================================================================

const EVENT_CONFIG: Record<EventType, { icon: string; label: string; color: string }> = {
  post_scheduled: { icon: '📅', label: 'Post Scheduled', color: 'blue' },
  post_published: { icon: '✅', label: 'Post Published', color: 'green' },
  post_failed: { icon: '❌', label: 'Post Failed', color: 'red' },
  post_approved: { icon: '👍', label: 'Post Approved', color: 'green' },
  post_rejected: { icon: '👎', label: 'Post Rejected', color: 'yellow' },
  video_generated: { icon: '🎬', label: 'Video Generated', color: 'purple' },
  video_generation_failed: { icon: '🎬', label: 'Video Failed', color: 'red' },
  story_scheduled: { icon: '📖', label: 'Story Scheduled', color: 'blue' },
  story_published: { icon: '📖', label: 'Story Published', color: 'green' },
  tiktok_queued: { icon: '🎵', label: 'TikTok Queued', color: 'pink' },
  tiktok_posted: { icon: '🎵', label: 'TikTok Posted', color: 'green' },
  metrics_synced: { icon: '📊', label: 'Metrics Synced', color: 'blue' },
  auto_stories_scheduled: { icon: '🤖', label: 'Auto Stories Scheduled', color: 'purple' },
  token_refreshed: { icon: '🔑', label: 'Token Refreshed', color: 'green' },
  token_refresh_failed: { icon: '🔑', label: 'Token Refresh Failed', color: 'red' },
  footage_added: { icon: '🎥', label: 'Footage Added', color: 'blue' },
  music_added: { icon: '🎵', label: 'Music Added', color: 'purple' },
  template_created: { icon: '📝', label: 'Template Created', color: 'blue' },
  hashtag_set_created: { icon: '#️⃣', label: 'Hashtag Set Created', color: 'blue' },
};

// ============================================================================
// Functions
// ============================================================================

export async function logActivity(
  supabase: SupabaseClient,
  userId: string,
  eventType: EventType,
  options?: {
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  try {
    await (supabase as any)
      .from('instagram_activity_log')
      .insert({
        user_id: userId,
        event_type: eventType,
        entity_type: options?.entityType || null,
        entity_id: options?.entityId || null,
        metadata: options?.metadata || {},
      });
  } catch (error) {
    // Don't throw - activity logging should not break the main flow
    console.error('Failed to log activity:', error);
  }
}

export async function getRecentActivity(
  supabase: SupabaseClient,
  userId: string,
  options?: {
    limit?: number;
    eventTypes?: EventType[];
  }
): Promise<ActivityLogEntry[]> {
  let query = (supabase as any)
    .from('instagram_activity_log')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(options?.limit || 20);

  if (options?.eventTypes?.length) {
    query = query.in('event_type', options.eventTypes);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch activity:', error);
    return [];
  }

  return data || [];
}

export function getEventConfig(eventType: EventType) {
  return EVENT_CONFIG[eventType] || {
    icon: '📌',
    label: eventType.replace(/_/g, ' '),
    color: 'gray',
  };
}

export function formatActivityMessage(entry: ActivityLogEntry): string {
  const config = getEventConfig(entry.event_type as EventType);

  switch (entry.event_type) {
    case 'post_scheduled':
      return `${config.icon} Post scheduled for ${entry.metadata.scheduled_for || 'later'}`;
    case 'post_published':
      return `${config.icon} Post published successfully`;
    case 'post_failed':
      return `${config.icon} Post failed: ${entry.metadata.error || 'Unknown error'}`;
    case 'video_generated':
      return `${config.icon} Video generated for quote "${entry.metadata.quote_text?.substring(0, 30)}..."`;
    case 'story_published':
      return `${config.icon} Story published`;
    case 'tiktok_queued':
      return `${config.icon} TikTok video queued for ${entry.metadata.scheduled_date || 'later'}`;
    case 'metrics_synced':
      return `${config.icon} Metrics synced for ${entry.metadata.post_count || 0} posts`;
    case 'auto_stories_scheduled':
      return `${config.icon} ${entry.metadata.count || 2} auto stories scheduled`;
    default:
      return `${config.icon} ${config.label}`;
  }
}
