import { getAdminClient } from '@/lib/supabase/admin';

export interface SeasonalPeriod {
  id: string;
  name: string;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
  tags: string[];
}

// Define seasonal periods that should trigger content rotation
export const SEASONAL_PERIODS: SeasonalPeriod[] = [
  // Q1
  { id: 'new_years', name: "New Year's", startMonth: 12, startDay: 26, endMonth: 1, endDay: 7, tags: ['new_year', 'fresh_start', 'new_beginnings'] },
  { id: 'valentines', name: "Valentine's Day", startMonth: 2, startDay: 1, endMonth: 2, endDay: 14, tags: ['valentines', 'love', 'self_love'] },
  { id: 'spring', name: 'Spring', startMonth: 3, startDay: 1, endMonth: 5, endDay: 31, tags: ['spring', 'renewal', 'growth'] },
  { id: 'easter', name: 'Easter', startMonth: 3, startDay: 15, endMonth: 4, endDay: 30, tags: ['easter', 'rebirth', 'hope'] },

  // Q2
  { id: 'mothers_day', name: "Mother's Day", startMonth: 5, startDay: 1, endMonth: 5, endDay: 15, tags: ['mothers_day', 'mom', 'family'] },
  { id: 'mental_health_month', name: 'Mental Health Awareness Month', startMonth: 5, startDay: 1, endMonth: 5, endDay: 31, tags: ['mental_health', 'awareness', 'wellness'] },
  { id: 'fathers_day', name: "Father's Day", startMonth: 6, startDay: 1, endMonth: 6, endDay: 20, tags: ['fathers_day', 'dad', 'family'] },
  { id: 'summer', name: 'Summer', startMonth: 6, startDay: 1, endMonth: 8, endDay: 31, tags: ['summer', 'vacation', 'relax'] },

  // Q3
  { id: 'back_to_school', name: 'Back to School', startMonth: 8, startDay: 1, endMonth: 9, endDay: 15, tags: ['back_to_school', 'learning', 'new_chapter'] },
  { id: 'suicide_prevention', name: 'Suicide Prevention Month', startMonth: 9, startDay: 1, endMonth: 9, endDay: 30, tags: ['suicide_prevention', 'mental_health', 'support'] },
  { id: 'self_care_september', name: 'Self-Care September', startMonth: 9, startDay: 1, endMonth: 9, endDay: 30, tags: ['self_care', 'wellness', 'mindfulness'] },
  { id: 'fall', name: 'Fall', startMonth: 9, startDay: 1, endMonth: 11, endDay: 30, tags: ['fall', 'autumn', 'cozy'] },

  // Q4
  { id: 'halloween', name: 'Halloween', startMonth: 10, startDay: 15, endMonth: 10, endDay: 31, tags: ['halloween', 'spooky', 'fun'] },
  { id: 'thanksgiving', name: 'Thanksgiving', startMonth: 11, startDay: 15, endMonth: 11, endDay: 30, tags: ['thanksgiving', 'gratitude', 'family'] },
  { id: 'winter', name: 'Winter', startMonth: 12, startDay: 1, endMonth: 2, endDay: 28, tags: ['winter', 'cozy', 'rest'] },
  { id: 'christmas', name: 'Christmas/Holiday Season', startMonth: 12, startDay: 1, endMonth: 12, endDay: 31, tags: ['christmas', 'holiday', 'gift', 'joy'] },
];

function isDateInPeriod(date: Date, period: SeasonalPeriod): boolean {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // Handle periods that span year boundary (e.g., Dec 26 - Jan 7)
  if (period.startMonth > period.endMonth) {
    return (month > period.startMonth || (month === period.startMonth && day >= period.startDay)) ||
           (month < period.endMonth || (month === period.endMonth && day <= period.endDay));
  }

  // Normal period within same year
  if (month > period.startMonth && month < period.endMonth) return true;
  if (month === period.startMonth && day >= period.startDay) return true;
  if (month === period.endMonth && day <= period.endDay) return true;

  return false;
}

export function getActiveSeasons(date: Date = new Date()): SeasonalPeriod[] {
  return SEASONAL_PERIODS.filter(period => isDateInPeriod(date, period));
}

export function getActiveTags(date: Date = new Date()): string[] {
  const activeSeasons = getActiveSeasons(date);
  const allTags = activeSeasons.flatMap(s => s.tags);
  return [...new Set(allTags)]; // Remove duplicates
}

export interface SeasonalActivationResult {
  userId: string;
  pinsActivated: number;
  pinsDeactivated: number;
  campaignsActivated: number;
  campaignsPaused: number;
  approvalsCreated: number;
}

// Process seasonal activation for a single user
export async function processSeasonalActivation(
  userId: string,
  date: Date = new Date()
): Promise<SeasonalActivationResult> {
  const supabase = getAdminClient();
  const activeTags = getActiveTags(date);

  const result: SeasonalActivationResult = {
    userId,
    pinsActivated: 0,
    pinsDeactivated: 0,
    campaignsActivated: 0,
    campaignsPaused: 0,
    approvalsCreated: 0,
  };

  // Get user's global mode setting
  const { data: settings } = await (supabase as any)
    .from('user_settings')
    .select('global_mode')
    .eq('user_id', userId)
    .single();

  const isAssistedMode = settings?.global_mode === 'assisted';

  // 1. Activate pins with matching temporal_tags
  const { data: inactivePins } = await (supabase as any)
    .from('pins')
    .select('id, temporal_tags')
    .eq('user_id', userId)
    .eq('status', 'scheduled')
    .is('published_at', null);

  for (const pin of inactivePins || []) {
    if (!pin.temporal_tags?.length) continue;

    const hasMatchingTag = pin.temporal_tags.some((tag: string) =>
      activeTags.includes(tag.toLowerCase())
    );

    if (hasMatchingTag) {
      if (isAssistedMode) {
        // Create approval item instead of activating directly
        await (supabase as any)
          .from('approvals')
          .insert({
            user_id: userId,
            item_type: 'seasonal_activation',
            item_id: pin.id,
            title: 'Seasonal Pin Activation',
            description: `Pin matches current season tags: ${pin.temporal_tags.join(', ')}`,
            status: 'pending',
          });
        result.approvalsCreated++;
      } else {
        // Auto-mode: activate directly (mark for publishing)
        await (supabase as any)
          .from('pins')
          .update({ status: 'pending' })
          .eq('id', pin.id);
        result.pinsActivated++;
      }
    }
  }

  // 2. Deactivate pins outside their season
  const { data: activePins } = await (supabase as any)
    .from('pins')
    .select('id, temporal_tags')
    .eq('user_id', userId)
    .eq('status', 'published')
    .not('temporal_tags', 'is', null);

  for (const pin of activePins || []) {
    if (!pin.temporal_tags?.length) continue;

    // Check if ALL of the pin's temporal tags are inactive
    const hasActiveTag = pin.temporal_tags.some((tag: string) =>
      activeTags.includes(tag.toLowerCase())
    );

    if (!hasActiveTag) {
      if (isAssistedMode) {
        // Create approval item for deactivation
        await (supabase as any)
          .from('approvals')
          .insert({
            user_id: userId,
            item_type: 'seasonal_deactivation',
            item_id: pin.id,
            title: 'Seasonal Pin Deactivation',
            description: `Pin's seasonal tags are no longer active: ${pin.temporal_tags.join(', ')}`,
            status: 'pending',
          });
        result.approvalsCreated++;
      } else {
        // Mark as archived (out of season)
        await (supabase as any)
          .from('pins')
          .update({ status: 'archived' })
          .eq('id', pin.id);
        result.pinsDeactivated++;
      }
    }
  }

  // 3. Handle campaign date ranges
  const { data: campaigns } = await (supabase as any)
    .from('campaigns')
    .select('id, name, start_date, end_date, status')
    .eq('user_id', userId)
    .in('status', ['draft', 'active', 'paused']);

  const today = date.toISOString().split('T')[0];

  for (const campaign of campaigns || []) {
    const shouldBeActive = campaign.start_date <= today &&
                          (!campaign.end_date || campaign.end_date >= today);

    if (shouldBeActive && campaign.status === 'paused') {
      if (isAssistedMode) {
        await (supabase as any)
          .from('approvals')
          .insert({
            user_id: userId,
            item_type: 'campaign_activation',
            item_id: campaign.id,
            title: `Activate Campaign: ${campaign.name}`,
            description: `Campaign is within its scheduled date range (${campaign.start_date} - ${campaign.end_date || 'ongoing'})`,
            status: 'pending',
          });
        result.approvalsCreated++;
      } else {
        await (supabase as any)
          .from('campaigns')
          .update({ status: 'active' })
          .eq('id', campaign.id);
        result.campaignsActivated++;
      }
    } else if (!shouldBeActive && campaign.status === 'active') {
      // Pause campaign outside its date range
      if (isAssistedMode) {
        await (supabase as any)
          .from('approvals')
          .insert({
            user_id: userId,
            item_type: 'campaign_pause',
            item_id: campaign.id,
            title: `Pause Campaign: ${campaign.name}`,
            description: `Campaign is outside its scheduled date range`,
            status: 'pending',
          });
        result.approvalsCreated++;
      } else {
        await (supabase as any)
          .from('campaigns')
          .update({ status: 'paused' })
          .eq('id', campaign.id);
        result.campaignsPaused++;
      }
    }
  }

  return result;
}

// Process seasonal activation for all users
export async function processAllUsersSeasonalActivation(
  date: Date = new Date()
): Promise<{
  usersProcessed: number;
  totalPinsActivated: number;
  totalPinsDeactivated: number;
  totalCampaignsActivated: number;
  totalCampaignsPaused: number;
  totalApprovalsCreated: number;
  errors: string[];
}> {
  const supabase = getAdminClient();

  // Get all users with settings
  const { data: users, error } = await (supabase as any)
    .from('user_settings')
    .select('user_id');

  if (error) {
    throw new Error(`Failed to get users: ${error.message}`);
  }

  const results = {
    usersProcessed: 0,
    totalPinsActivated: 0,
    totalPinsDeactivated: 0,
    totalCampaignsActivated: 0,
    totalCampaignsPaused: 0,
    totalApprovalsCreated: 0,
    errors: [] as string[],
  };

  for (const user of users || []) {
    try {
      const userResult = await processSeasonalActivation(user.user_id, date);
      results.usersProcessed++;
      results.totalPinsActivated += userResult.pinsActivated;
      results.totalPinsDeactivated += userResult.pinsDeactivated;
      results.totalCampaignsActivated += userResult.campaignsActivated;
      results.totalCampaignsPaused += userResult.campaignsPaused;
      results.totalApprovalsCreated += userResult.approvalsCreated;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      results.errors.push(`User ${user.user_id}: ${error}`);
    }
  }

  return results;
}
