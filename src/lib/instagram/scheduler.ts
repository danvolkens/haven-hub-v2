/**
 * Instagram Smart Scheduler
 * Prompt 3.1: Day-specific scheduling with optimal slot finding
 */

import { createClient } from '@/lib/supabase/server';
import type { ContentPillar, TemplateType } from '@/types/instagram';

// ============================================================================
// Types
// ============================================================================

export interface ScheduleSlot {
  scheduled_at: Date;
  day_theme: string;
  is_optimal: boolean;
  day_of_week: number;
  time_slot: string;
}

export interface DayConfig {
  primary: {
    type: TemplateType;
    pillar: ContentPillar;
    time: string; // HH:MM format
  };
  secondary?: {
    type: TemplateType;
    pillar: ContentPillar;
    time: string;
  };
  theme: string;
}

export interface FindSlotOptions {
  postType: TemplateType;
  contentPillar: ContentPillar;
  preferredDate?: Date;
  userId?: string;
  lookAheadDays?: number;
}

// ============================================================================
// Day Content Mapping
// ============================================================================

export const DAY_CONTENT_MAP: Record<number, DayConfig> = {
  0: {
    // Sunday
    primary: { type: 'carousel', pillar: 'brand_story', time: '10:00' },
    theme: 'reflection',
  },
  1: {
    // Monday
    primary: { type: 'carousel', pillar: 'educational', time: '11:00' },
    theme: 'fresh_start',
  },
  2: {
    // Tuesday
    primary: { type: 'reel', pillar: 'product_showcase', time: '09:00' },
    theme: 'transformation',
  },
  3: {
    // Wednesday
    primary: { type: 'feed', pillar: 'product_showcase', time: '13:00' },
    theme: 'bestseller',
  },
  4: {
    // Thursday
    primary: { type: 'reel', pillar: 'brand_story', time: '12:00' },
    secondary: { type: 'carousel', pillar: 'educational', time: '19:00' },
    theme: 'therapy_thursday',
  },
  5: {
    // Friday
    primary: { type: 'feed', pillar: 'community', time: '11:00' },
    theme: 'feature_friday',
  },
  6: {
    // Saturday
    primary: { type: 'reel', pillar: 'product_showcase', time: '09:00' },
    secondary: { type: 'feed', pillar: 'product_showcase', time: '13:00' },
    theme: 'showcase',
  },
};

// Day names for display
export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

// ============================================================================
// Main Scheduling Function
// ============================================================================

/**
 * Find the optimal scheduling slot for a post
 *
 * Logic:
 * 1. Look ahead 14 days from preferredDate (or now)
 * 2. Find days where postType + contentPillar match the day config
 * 3. Check slot isn't already taken
 * 4. Return first available optimal slot
 * 5. Fallback to any available slot if no optimal found
 */
export async function findOptimalSlot(options: FindSlotOptions): Promise<ScheduleSlot> {
  const {
    postType,
    contentPillar,
    preferredDate = new Date(),
    userId,
    lookAheadDays = 14,
  } = options;

  const supabase = await createClient();

  // Get all scheduled posts in the look-ahead window
  const startDate = new Date(preferredDate);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + lookAheadDays);

  // Fetch existing scheduled posts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('instagram_scheduled_posts')
    .select('scheduled_at')
    .gte('scheduled_at', startDate.toISOString())
    .lte('scheduled_at', endDate.toISOString())
    .in('status', ['scheduled', 'pending']);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data: existingPosts } = await query;
  const takenSlots = new Set(
    (existingPosts || []).map((p: { scheduled_at: string }) =>
      new Date(p.scheduled_at).toISOString()
    )
  );

  // First pass: Find optimal slots (matching day config)
  const optimalSlots: ScheduleSlot[] = [];

  for (let dayOffset = 0; dayOffset < lookAheadDays; dayOffset++) {
    const checkDate = new Date(startDate);
    checkDate.setDate(checkDate.getDate() + dayOffset);
    const dayOfWeek = checkDate.getDay();
    const dayConfig = DAY_CONTENT_MAP[dayOfWeek];

    // Check primary slot
    if (dayConfig.primary.type === postType && dayConfig.primary.pillar === contentPillar) {
      const slotTime = createSlotDateTime(checkDate, dayConfig.primary.time);
      if (!takenSlots.has(slotTime.toISOString()) && slotTime > new Date()) {
        optimalSlots.push({
          scheduled_at: slotTime,
          day_theme: dayConfig.theme,
          is_optimal: true,
          day_of_week: dayOfWeek,
          time_slot: dayConfig.primary.time,
        });
      }
    }

    // Check secondary slot if exists
    if (
      dayConfig.secondary &&
      dayConfig.secondary.type === postType &&
      dayConfig.secondary.pillar === contentPillar
    ) {
      const slotTime = createSlotDateTime(checkDate, dayConfig.secondary.time);
      if (!takenSlots.has(slotTime.toISOString()) && slotTime > new Date()) {
        optimalSlots.push({
          scheduled_at: slotTime,
          day_theme: dayConfig.theme,
          is_optimal: true,
          day_of_week: dayOfWeek,
          time_slot: dayConfig.secondary.time,
        });
      }
    }
  }

  // If we found optimal slots, return the first one
  if (optimalSlots.length > 0) {
    return optimalSlots[0];
  }

  // Second pass: Find any available slot (fallback)
  for (let dayOffset = 0; dayOffset < lookAheadDays; dayOffset++) {
    const checkDate = new Date(startDate);
    checkDate.setDate(checkDate.getDate() + dayOffset);
    const dayOfWeek = checkDate.getDay();
    const dayConfig = DAY_CONTENT_MAP[dayOfWeek];

    // Try primary slot
    const primaryTime = createSlotDateTime(checkDate, dayConfig.primary.time);
    if (!takenSlots.has(primaryTime.toISOString()) && primaryTime > new Date()) {
      return {
        scheduled_at: primaryTime,
        day_theme: dayConfig.theme,
        is_optimal: false,
        day_of_week: dayOfWeek,
        time_slot: dayConfig.primary.time,
      };
    }

    // Try secondary slot
    if (dayConfig.secondary) {
      const secondaryTime = createSlotDateTime(checkDate, dayConfig.secondary.time);
      if (!takenSlots.has(secondaryTime.toISOString()) && secondaryTime > new Date()) {
        return {
          scheduled_at: secondaryTime,
          day_theme: dayConfig.theme,
          is_optimal: false,
          day_of_week: dayOfWeek,
          time_slot: dayConfig.secondary.time,
        };
      }
    }
  }

  // Last resort: Return next day at a default time
  const fallbackDate = new Date(startDate);
  fallbackDate.setDate(fallbackDate.getDate() + 1);
  fallbackDate.setHours(12, 0, 0, 0);

  return {
    scheduled_at: fallbackDate,
    day_theme: 'general',
    is_optimal: false,
    day_of_week: fallbackDate.getDay(),
    time_slot: '12:00',
  };
}

// ============================================================================
// Slot Availability Checking
// ============================================================================

/**
 * Check if a specific time slot is available
 */
export async function isSlotAvailable(
  scheduledAt: Date,
  userId?: string
): Promise<boolean> {
  const supabase = await createClient();

  // Check within a 30-minute window
  const windowStart = new Date(scheduledAt);
  windowStart.setMinutes(windowStart.getMinutes() - 15);

  const windowEnd = new Date(scheduledAt);
  windowEnd.setMinutes(windowEnd.getMinutes() + 15);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('instagram_scheduled_posts')
    .select('id')
    .gte('scheduled_at', windowStart.toISOString())
    .lte('scheduled_at', windowEnd.toISOString())
    .in('status', ['scheduled', 'pending'])
    .limit(1);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data } = await query;
  return !data || data.length === 0;
}

/**
 * Get all available slots for a specific day
 */
export function getAvailableSlotsForDay(dayOfWeek: number): Array<{
  time: string;
  type: TemplateType;
  pillar: ContentPillar;
  isPrimary: boolean;
}> {
  const dayConfig = DAY_CONTENT_MAP[dayOfWeek];
  const slots = [];

  slots.push({
    time: dayConfig.primary.time,
    type: dayConfig.primary.type,
    pillar: dayConfig.primary.pillar,
    isPrimary: true,
  });

  if (dayConfig.secondary) {
    slots.push({
      time: dayConfig.secondary.time,
      type: dayConfig.secondary.type,
      pillar: dayConfig.secondary.pillar,
      isPrimary: false,
    });
  }

  return slots;
}

/**
 * Get the theme for a specific day
 */
export function getDayTheme(dayOfWeek: number): string {
  return DAY_CONTENT_MAP[dayOfWeek]?.theme || 'general';
}

/**
 * Check if a post type + pillar combo matches a day's config
 */
export function isOptimalDayFor(
  dayOfWeek: number,
  postType: TemplateType,
  contentPillar: ContentPillar
): boolean {
  const dayConfig = DAY_CONTENT_MAP[dayOfWeek];

  if (dayConfig.primary.type === postType && dayConfig.primary.pillar === contentPillar) {
    return true;
  }

  if (
    dayConfig.secondary &&
    dayConfig.secondary.type === postType &&
    dayConfig.secondary.pillar === contentPillar
  ) {
    return true;
  }

  return false;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a Date object from a date and time string
 */
function createSlotDateTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const slotDate = new Date(date);
  slotDate.setHours(hours, minutes, 0, 0);
  return slotDate;
}

/**
 * Format a schedule slot for display
 */
export function formatSlotForDisplay(slot: ScheduleSlot): string {
  const dayName = DAY_NAMES[slot.day_of_week];
  const date = slot.scheduled_at.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  const time = slot.scheduled_at.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return `${dayName}, ${date} at ${time}`;
}

/**
 * Get upcoming slots for the next N days
 */
export async function getUpcomingSlots(
  days: number = 7,
  userId?: string
): Promise<
  Array<{
    date: Date;
    dayOfWeek: number;
    theme: string;
    slots: Array<{
      time: string;
      type: TemplateType;
      pillar: ContentPillar;
      isBooked: boolean;
    }>;
  }>
> {
  const supabase = await createClient();
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + days);

  // Get existing scheduled posts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('instagram_scheduled_posts')
    .select('scheduled_at')
    .gte('scheduled_at', startDate.toISOString())
    .lte('scheduled_at', endDate.toISOString())
    .in('status', ['scheduled', 'pending']);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data: existingPosts } = await query;
  const bookedTimes = new Set(
    (existingPosts || []).map((p: { scheduled_at: string }) => {
      const date = new Date(p.scheduled_at);
      return `${date.toDateString()}-${date.getHours()}:${date.getMinutes()}`;
    })
  );

  const result = [];

  for (let dayOffset = 0; dayOffset < days; dayOffset++) {
    const checkDate = new Date(startDate);
    checkDate.setDate(checkDate.getDate() + dayOffset);
    const dayOfWeek = checkDate.getDay();
    const dayConfig = DAY_CONTENT_MAP[dayOfWeek];

    const slots = [];

    // Add primary slot
    const primaryKey = `${checkDate.toDateString()}-${dayConfig.primary.time.replace(':', ':')}`;
    slots.push({
      time: dayConfig.primary.time,
      type: dayConfig.primary.type,
      pillar: dayConfig.primary.pillar,
      isBooked: bookedTimes.has(primaryKey),
    });

    // Add secondary slot if exists
    if (dayConfig.secondary) {
      const secondaryKey = `${checkDate.toDateString()}-${dayConfig.secondary.time.replace(':', ':')}`;
      slots.push({
        time: dayConfig.secondary.time,
        type: dayConfig.secondary.type,
        pillar: dayConfig.secondary.pillar,
        isBooked: bookedTimes.has(secondaryKey),
      });
    }

    result.push({
      date: new Date(checkDate),
      dayOfWeek,
      theme: dayConfig.theme,
      slots,
    });
  }

  return result;
}
