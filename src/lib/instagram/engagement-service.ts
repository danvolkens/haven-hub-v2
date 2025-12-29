/**
 * Instagram Engagement Service
 * Prompt D.1: Daily engagement task queue and management
 */

import { createClient } from '@/lib/supabase/server';

// ============================================================================
// Types
// ============================================================================

export type TaskType = 'respond_comment' | 'respond_dm' | 'engage_account' | 'post_story' | 'follow_up_dm';
export type TimeSlot = 'morning' | 'afternoon' | 'evening';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'expired';

export interface EngagementTask {
  id: string;
  user_id: string;
  task_type: TaskType;
  priority: number;
  target_account: string | null;
  target_content_id: string | null;
  target_content_preview: string | null;
  scheduled_date: string;
  scheduled_slot: TimeSlot;
  status: TaskStatus;
  started_at: string | null;
  completed_at: string | null;
  skipped_reason: string | null;
  notes: string | null;
  response_used: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyEngagementSummary {
  date: string;
  slots: {
    morning: {
      tasks: EngagementTask[];
      completed: number;
      total: number;
    };
    afternoon: {
      tasks: EngagementTask[];
      completed: number;
      total: number;
    };
    evening: {
      tasks: EngagementTask[];
      completed: number;
      total: number;
    };
  };
  overallProgress: {
    completed: number;
    total: number;
    percentage: number;
  };
  accountsEngaged: number;
  commentsResponded: number;
  dmsReplied: number;
}

export interface DMTemplate {
  id: string;
  name: string;
  template_type: string;
  message_template: string;
  variables: string[];
  use_count: number;
  is_system: boolean;
}

// ============================================================================
// Time Slot Configuration (from Instagram Guide)
// ============================================================================

export const TIME_SLOT_CONFIG: Record<TimeSlot, { label: string; duration: string; description: string }> = {
  morning: {
    label: 'Morning',
    duration: '15 min',
    description: 'Comments, DMs, engage 5 accounts',
  },
  afternoon: {
    label: 'Afternoon',
    duration: '15 min',
    description: 'Comment responses, reciprocal engagement',
  },
  evening: {
    label: 'Evening',
    duration: '15 min',
    description: 'Final responses, Stories, DM replies',
  },
};

export const TASK_TYPE_CONFIG: Record<TaskType, { label: string; icon: string; action: string }> = {
  respond_comment: {
    label: 'Respond to Comment',
    icon: '💬',
    action: 'Reply to this comment',
  },
  respond_dm: {
    label: 'Respond to DM',
    icon: '✉️',
    action: 'Check and reply to DMs',
  },
  engage_account: {
    label: 'Engage Account',
    icon: '👋',
    action: 'Like, comment on their posts',
  },
  post_story: {
    label: 'Post Story',
    icon: '📱',
    action: 'Share a story',
  },
  follow_up_dm: {
    label: 'Follow-up DM',
    icon: '📩',
    action: 'Send follow-up message',
  },
};

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Generate daily engagement tasks for a user
 */
export async function generateDailyTasks(date: Date = new Date()): Promise<number> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Unauthorized');
  }

  // Use the database function
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('generate_daily_engagement_tasks', {
    p_user_id: user.id,
    p_date: date.toISOString().split('T')[0],
  });

  if (error) {
    console.error('Failed to generate daily tasks:', error);
    return 0;
  }

  return data as number;
}

/**
 * Get daily engagement summary
 */
export async function getDailySummary(date: Date = new Date()): Promise<DailyEngagementSummary> {
  const supabase = await createClient();
  const dateStr = date.toISOString().split('T')[0];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tasks, error } = await (supabase as any)
    .from('engagement_tasks')
    .select('*')
    .eq('scheduled_date', dateStr)
    .order('priority', { ascending: true });

  if (error) {
    console.error('Failed to fetch engagement tasks:', error);
  }

  const typedTasks = (tasks || []) as EngagementTask[];

  // Group by slot
  const morning = typedTasks.filter((t) => t.scheduled_slot === 'morning');
  const afternoon = typedTasks.filter((t) => t.scheduled_slot === 'afternoon');
  const evening = typedTasks.filter((t) => t.scheduled_slot === 'evening');

  const completed = typedTasks.filter((t) => t.status === 'completed');

  return {
    date: dateStr,
    slots: {
      morning: {
        tasks: morning,
        completed: morning.filter((t) => t.status === 'completed').length,
        total: morning.length,
      },
      afternoon: {
        tasks: afternoon,
        completed: afternoon.filter((t) => t.status === 'completed').length,
        total: afternoon.length,
      },
      evening: {
        tasks: evening,
        completed: evening.filter((t) => t.status === 'completed').length,
        total: evening.length,
      },
    },
    overallProgress: {
      completed: completed.length,
      total: typedTasks.length,
      percentage: typedTasks.length > 0 ? Math.round((completed.length / typedTasks.length) * 100) : 0,
    },
    accountsEngaged: completed.filter((t) => t.task_type === 'engage_account').length,
    commentsResponded: completed.filter((t) => t.task_type === 'respond_comment').length,
    dmsReplied: completed.filter((t) => t.task_type === 'respond_dm').length,
  };
}

/**
 * Get tasks for a specific time slot
 */
export async function getTasksBySlot(slot: TimeSlot, date: Date = new Date()): Promise<EngagementTask[]> {
  const supabase = await createClient();
  const dateStr = date.toISOString().split('T')[0];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('engagement_tasks')
    .select('*')
    .eq('scheduled_date', dateStr)
    .eq('scheduled_slot', slot)
    .order('priority', { ascending: true });

  if (error) {
    console.error('Failed to fetch tasks by slot:', error);
    return [];
  }

  return data as EngagementTask[];
}

/**
 * Update task status
 */
export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
  options?: {
    skippedReason?: string;
    notes?: string;
    responseUsed?: string;
  }
): Promise<EngagementTask | null> {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'in_progress') {
    updateData.started_at = new Date().toISOString();
  } else if (status === 'completed') {
    updateData.completed_at = new Date().toISOString();
  } else if (status === 'skipped') {
    updateData.skipped_reason = options?.skippedReason;
  }

  if (options?.notes) {
    updateData.notes = options.notes;
  }
  if (options?.responseUsed) {
    updateData.response_used = options.responseUsed;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('engagement_tasks')
    .update(updateData)
    .eq('id', taskId)
    .select()
    .single();

  if (error) {
    console.error('Failed to update task:', error);
    return null;
  }

  return data as EngagementTask;
}

/**
 * Complete a task
 */
export async function completeTask(taskId: string, notes?: string): Promise<EngagementTask | null> {
  return updateTaskStatus(taskId, 'completed', { notes });
}

/**
 * Skip a task
 */
export async function skipTask(taskId: string, reason?: string): Promise<EngagementTask | null> {
  return updateTaskStatus(taskId, 'skipped', { skippedReason: reason });
}

/**
 * Get DM templates
 */
export async function getDMTemplates(templateType?: string): Promise<DMTemplate[]> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('dm_templates')
    .select('*')
    .eq('is_active', true)
    .order('use_count', { ascending: false });

  if (templateType) {
    query = query.eq('template_type', templateType);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch DM templates:', error);
    return [];
  }

  return data as DMTemplate[];
}

/**
 * Fill DM template with variables
 */
export function fillDMTemplate(template: string, variables: Record<string, string>): string {
  let filled = template;
  for (const [key, value] of Object.entries(variables)) {
    filled = filled.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return filled;
}

/**
 * Get engagement stats for a date range
 */
export async function getEngagementStats(
  startDate: Date,
  endDate: Date
): Promise<{
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  accountsEngaged: number;
  averageMinutesPerDay: number;
}> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: stats, error } = await (supabase as any)
    .from('engagement_stats')
    .select('*')
    .gte('stat_date', startDate.toISOString().split('T')[0])
    .lte('stat_date', endDate.toISOString().split('T')[0]);

  if (error || !stats || stats.length === 0) {
    return {
      totalTasks: 0,
      completedTasks: 0,
      completionRate: 0,
      accountsEngaged: 0,
      averageMinutesPerDay: 0,
    };
  }

  const typedStats = stats as Array<{
    tasks_completed: number;
    tasks_skipped: number;
    accounts_engaged: number;
    total_minutes: number;
  }>;

  const totals = typedStats.reduce(
    (acc, day) => ({
      completed: acc.completed + day.tasks_completed,
      skipped: acc.skipped + day.tasks_skipped,
      accounts: acc.accounts + day.accounts_engaged,
      minutes: acc.minutes + day.total_minutes,
    }),
    { completed: 0, skipped: 0, accounts: 0, minutes: 0 }
  );

  const totalTasks = totals.completed + totals.skipped;

  return {
    totalTasks,
    completedTasks: totals.completed,
    completionRate: totalTasks > 0 ? Math.round((totals.completed / totalTasks) * 100) : 0,
    accountsEngaged: totals.accounts,
    averageMinutesPerDay: typedStats.length > 0 ? Math.round(totals.minutes / typedStats.length) : 0,
  };
}

/**
 * Add a target account for proactive engagement
 */
export async function addTargetAccount(
  instagramHandle: string,
  accountType: 'peer_brand' | 'influencer' | 'potential_customer' | 'partner' | 'other',
  notes?: string
): Promise<boolean> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('engagement_target_accounts').upsert(
    {
      user_id: user.id,
      instagram_handle: instagramHandle.replace('@', ''),
      account_type: accountType,
      notes,
    },
    { onConflict: 'user_id,instagram_handle' }
  );

  return !error;
}

/**
 * Get target accounts for engagement
 */
export async function getTargetAccounts(): Promise<
  Array<{
    id: string;
    instagram_handle: string;
    account_type: string;
    last_engaged_at: string | null;
    engagement_count: number;
    notes: string | null;
  }>
> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('engagement_target_accounts')
    .select('*')
    .eq('is_active', true)
    .order('last_engaged_at', { ascending: true, nullsFirst: true });

  if (error) {
    console.error('Failed to fetch target accounts:', error);
    return [];
  }

  return data;
}
