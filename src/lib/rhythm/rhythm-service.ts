import { createServerSupabaseClient } from '@/lib/supabase/server';

export interface RhythmTask {
  id: string;
  user_id: string;
  day_of_week: number;
  task_name: string;
  task_description: string | null;
  category: 'content' | 'engagement' | 'analytics' | 'ads' | 'maintenance';
  sort_order: number;
  is_recurring: boolean;
  is_active: boolean;
  created_at: string;
  // Joined data
  completed_today?: boolean;
  completion_id?: string;
}

export interface TaskCompletion {
  id: string;
  task_id: string;
  completed_date: string;
  completed_at: string;
  notes: string | null;
}

export interface DailyProgress {
  date: string;
  dayOfWeek: number;
  dayName: string;
  totalTasks: number;
  completedTasks: number;
  tasks: RhythmTask[];
}

export interface WeeklyProgress {
  startDate: string;
  endDate: string;
  days: DailyProgress[];
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
}

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/**
 * Get tasks for a specific day with completion status
 */
export async function getTasksForDay(
  userId: string,
  date: Date = new Date()
): Promise<RhythmTask[]> {
  const supabase = await createServerSupabaseClient();
  const dayOfWeek = date.getDay();
  const dateString = date.toISOString().split('T')[0];

  // Get tasks for this day
  const { data: tasks, error } = await (supabase as any)
    .from('rhythm_tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('day_of_week', dayOfWeek)
    .eq('is_active', true)
    .order('sort_order');

  if (error || !tasks) {
    return [];
  }

  // Get completions for today
  const { data: completions } = await (supabase as any)
    .from('rhythm_task_completions')
    .select('*')
    .eq('user_id', userId)
    .eq('completed_date', dateString);

  const completionMap = new Map<string, TaskCompletion>(
    (completions || []).map((c: TaskCompletion) => [c.task_id, c])
  );

  return tasks.map((task: RhythmTask) => {
    const completion = completionMap.get(task.id);
    return {
      ...task,
      completed_today: !!completion,
      completion_id: completion?.id,
    };
  });
}

/**
 * Get weekly progress summary
 */
export async function getWeeklyProgress(
  userId: string,
  weekStart?: Date
): Promise<WeeklyProgress> {
  const supabase = await createServerSupabaseClient();

  // Calculate week start (Sunday)
  const start = weekStart || new Date();
  const day = start.getDay();
  start.setDate(start.getDate() - day);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  // Get all tasks
  const { data: tasks } = await (supabase as any)
    .from('rhythm_tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('sort_order');

  // Get all completions for this week
  const { data: completions } = await (supabase as any)
    .from('rhythm_task_completions')
    .select('*')
    .eq('user_id', userId)
    .gte('completed_date', start.toISOString().split('T')[0])
    .lte('completed_date', end.toISOString().split('T')[0]);

  const completionsByDate = new Map<string, Set<string>>();
  for (const completion of completions || []) {
    const date = completion.completed_date;
    if (!completionsByDate.has(date)) {
      completionsByDate.set(date, new Set());
    }
    completionsByDate.get(date)!.add(completion.task_id);
  }

  const days: DailyProgress[] = [];
  let totalTasks = 0;
  let completedTasks = 0;

  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    const dateString = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();

    const dayTasks = (tasks || []).filter(
      (t: RhythmTask) => t.day_of_week === dayOfWeek
    );
    const completedSet = completionsByDate.get(dateString) || new Set();

    const dayCompleted = dayTasks.filter((t: RhythmTask) =>
      completedSet.has(t.id)
    ).length;

    days.push({
      date: dateString,
      dayOfWeek,
      dayName: DAY_NAMES[dayOfWeek],
      totalTasks: dayTasks.length,
      completedTasks: dayCompleted,
      tasks: dayTasks.map((task: RhythmTask) => ({
        ...task,
        completed_today: completedSet.has(task.id),
      })),
    });

    totalTasks += dayTasks.length;
    completedTasks += dayCompleted;
  }

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
    days,
    totalTasks,
    completedTasks,
    completionRate: totalTasks > 0 ? completedTasks / totalTasks : 0,
  };
}

/**
 * Mark a task as completed for a specific date
 */
export async function completeTask(
  userId: string,
  taskId: string,
  date: Date = new Date(),
  notes?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createServerSupabaseClient();
  const dateString = date.toISOString().split('T')[0];

  // Verify task belongs to user
  const { data: task } = await (supabase as any)
    .from('rhythm_tasks')
    .select('id')
    .eq('id', taskId)
    .eq('user_id', userId)
    .single();

  if (!task) {
    return { success: false, error: 'Task not found' };
  }

  // Insert completion (upsert to handle duplicate)
  const { data, error } = await (supabase as any)
    .from('rhythm_task_completions')
    .upsert(
      {
        user_id: userId,
        task_id: taskId,
        completed_date: dateString,
        notes,
      },
      {
        onConflict: 'task_id,completed_date',
      }
    )
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, id: data.id };
}

/**
 * Uncomplete a task (remove completion)
 */
export async function uncompleteTask(
  userId: string,
  taskId: string,
  date: Date = new Date()
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  const dateString = date.toISOString().split('T')[0];

  const { error } = await (supabase as any)
    .from('rhythm_task_completions')
    .delete()
    .eq('user_id', userId)
    .eq('task_id', taskId)
    .eq('completed_date', dateString);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Create a new rhythm task
 */
export async function createTask(
  userId: string,
  task: {
    dayOfWeek: number;
    taskName: string;
    taskDescription?: string;
    category: 'content' | 'engagement' | 'analytics' | 'ads' | 'maintenance';
  }
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createServerSupabaseClient();

  // Get max sort order for this day
  const { data: existing } = await (supabase as any)
    .from('rhythm_tasks')
    .select('sort_order')
    .eq('user_id', userId)
    .eq('day_of_week', task.dayOfWeek)
    .order('sort_order', { ascending: false })
    .limit(1);

  const sortOrder = existing?.[0]?.sort_order + 1 || 0;

  const { data, error } = await (supabase as any)
    .from('rhythm_tasks')
    .insert({
      user_id: userId,
      day_of_week: task.dayOfWeek,
      task_name: task.taskName,
      task_description: task.taskDescription,
      category: task.category,
      sort_order: sortOrder,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, id: data.id };
}

/**
 * Update a rhythm task
 */
export async function updateTask(
  userId: string,
  taskId: string,
  updates: {
    taskName?: string;
    taskDescription?: string;
    category?: 'content' | 'engagement' | 'analytics' | 'ads' | 'maintenance';
    isActive?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const updateData: Record<string, any> = {};
  if (updates.taskName !== undefined) updateData.task_name = updates.taskName;
  if (updates.taskDescription !== undefined)
    updateData.task_description = updates.taskDescription;
  if (updates.category !== undefined) updateData.category = updates.category;
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

  const { error } = await (supabase as any)
    .from('rhythm_tasks')
    .update(updateData)
    .eq('id', taskId)
    .eq('user_id', userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Delete a rhythm task
 */
export async function deleteTask(
  userId: string,
  taskId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const { error } = await (supabase as any)
    .from('rhythm_tasks')
    .delete()
    .eq('id', taskId)
    .eq('user_id', userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get all tasks grouped by day
 */
export async function getAllTasks(
  userId: string
): Promise<Record<number, RhythmTask[]>> {
  const supabase = await createServerSupabaseClient();

  const { data: tasks } = await (supabase as any)
    .from('rhythm_tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('sort_order');

  const grouped: Record<number, RhythmTask[]> = {
    0: [],
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
  };

  for (const task of tasks || []) {
    grouped[task.day_of_week].push(task);
  }

  return grouped;
}
