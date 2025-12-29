/**
 * Monthly Planning Service
 * Prompt H.2: Monthly content theme planning
 *
 * 3-Month Structure:
 * - Month 1: Launch/Foundation
 * - Month 2: Growth/Expansion
 * - Month 3: Optimize/Accelerate
 */

import { createClient } from '@/lib/supabase/server';
import { generateWeeklyCalendar, type WeekType } from './calendar-generator';

// ============================================================================
// Types
// ============================================================================

export interface WeekTheme {
  week: number;
  theme: string;
  focus: string;
  week_type: WeekType;
}

export interface MonthlyKPIs {
  followers?: string;
  engagement_rate?: string;
  quiz_clicks?: number;
  website_traffic?: string;
  saves?: string;
  repeat_customers?: string;
  email_list?: string;
}

export interface MonthlyPlan {
  id?: string;
  month_number: number;
  theme_name: string;
  description: string | null;
  week_themes: WeekTheme[];
  kpis: MonthlyKPIs;
  is_active?: boolean;
}

export interface MonthlyPlanProgress {
  month_number: number;
  weeks_completed: number;
  total_weeks: number;
  posts_scheduled: number;
  posts_published: number;
  kpi_progress: {
    metric: string;
    target: string;
    current: string | number;
    on_track: boolean;
  }[];
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Get monthly plan for a specific month
 */
export async function getMonthlyPlan(monthNumber: number): Promise<MonthlyPlan | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('get_monthly_plan', {
    p_user_id: user.id,
    p_month_number: monthNumber,
  });

  if (error || !data || data.length === 0) {
    console.error('Failed to get monthly plan:', error);
    return null;
  }

  return data[0] as MonthlyPlan;
}

/**
 * Get all monthly plans (templates or user-customized)
 */
export async function getAllMonthlyPlans(): Promise<MonthlyPlan[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // First try user's custom themes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: userThemes } = await (supabase as any)
    .from('monthly_themes')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('month_number');

  if (userThemes && userThemes.length > 0) {
    return userThemes as MonthlyPlan[];
  }

  // Fall back to templates
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: templates } = await (supabase as any)
    .from('monthly_theme_templates')
    .select('*')
    .eq('is_active', true)
    .order('display_order');

  return (templates || []) as MonthlyPlan[];
}

/**
 * Initialize user's monthly themes from templates
 */
export async function initializeMonthlyThemes(): Promise<boolean> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc('initialize_user_monthly_themes', {
    p_user_id: user.id,
  });

  if (error) {
    console.error('Failed to initialize monthly themes:', error);
    return false;
  }

  return true;
}

/**
 * Update a monthly plan
 */
export async function updateMonthlyPlan(
  monthNumber: number,
  updates: Partial<Pick<MonthlyPlan, 'theme_name' | 'description' | 'week_themes' | 'kpis'>>
): Promise<boolean> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('monthly_themes')
    .upsert(
      {
        user_id: user.id,
        month_number: monthNumber,
        ...updates,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,month_number' }
    );

  return !error;
}

/**
 * Generate calendars for all weeks in a month
 */
export async function generateMonthCalendars(
  monthNumber: number,
  startDate: Date
): Promise<{
  month_number: number;
  weeks: {
    week: number;
    theme: string;
    week_type: WeekType;
    calendar: Awaited<ReturnType<typeof generateWeeklyCalendar>>;
  }[];
}> {
  const plan = await getMonthlyPlan(monthNumber);

  if (!plan) {
    throw new Error(`No plan found for month ${monthNumber}`);
  }

  const weeks = [];

  for (let i = 0; i < plan.week_themes.length; i++) {
    const weekTheme = plan.week_themes[i];
    const weekStartDate = new Date(startDate);
    weekStartDate.setDate(weekStartDate.getDate() + i * 7);

    const calendar = await generateWeeklyCalendar(weekTheme.week_type, weekStartDate);

    weeks.push({
      week: weekTheme.week,
      theme: weekTheme.theme,
      week_type: weekTheme.week_type,
      calendar,
    });
  }

  return {
    month_number: monthNumber,
    weeks,
  };
}

/**
 * Get month progress
 */
export async function getMonthProgress(
  monthNumber: number,
  startDate: Date
): Promise<MonthlyPlanProgress | null> {
  const supabase = await createClient();
  const plan = await getMonthlyPlan(monthNumber);

  if (!plan) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Calculate date range for the month (4 weeks)
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 28);

  // Get scheduled and published posts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: posts } = await (supabase as any)
    .from('instagram_scheduled_posts')
    .select('status, scheduled_at')
    .gte('scheduled_at', startDate.toISOString())
    .lt('scheduled_at', endDate.toISOString());

  const scheduled = posts?.filter((p: { status: string }) => p.status === 'scheduled').length || 0;
  const published = posts?.filter((p: { status: string }) => p.status === 'published').length || 0;

  // Calculate weeks completed
  const today = new Date();
  let weeksCompleted = 0;
  for (let i = 0; i < 4; i++) {
    const weekEnd = new Date(startDate);
    weekEnd.setDate(weekEnd.getDate() + (i + 1) * 7);
    if (today > weekEnd) weeksCompleted++;
  }

  // Mock KPI progress (would need actual metrics integration)
  const kpiProgress = Object.entries(plan.kpis).map(([metric, target]) => ({
    metric,
    target: String(target),
    current: 'N/A',
    on_track: false,
  }));

  return {
    month_number: monthNumber,
    weeks_completed: weeksCompleted,
    total_weeks: plan.week_themes.length,
    posts_scheduled: scheduled,
    posts_published: published,
    kpi_progress: kpiProgress,
  };
}

/**
 * Get current month based on user's start date
 */
export async function getCurrentMonthNumber(campaignStartDate: Date): Promise<number> {
  const today = new Date();
  const diffTime = today.getTime() - campaignStartDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const monthNumber = Math.floor(diffDays / 28) + 1;

  return Math.min(Math.max(monthNumber, 1), 3); // Clamp between 1 and 3
}
