/**
 * Weekly Calendar Generator Service
 * Prompt H.1: Auto-generate weekly content calendars
 *
 * Week Types:
 * - foundation: Launch week, brand intro
 * - engagement: Educational focus, authority building
 * - community: UGC, customer features
 * - conversion: Product focus, quiz CTAs
 */

import { createClient } from '@/lib/supabase/server';

// ============================================================================
// Types
// ============================================================================

export type WeekType = 'foundation' | 'engagement' | 'community' | 'conversion';
export type PostType = 'feed' | 'reel' | 'carousel' | 'story';
export type ContentPillar = 'product_showcase' | 'brand_story' | 'educational' | 'community';

export interface ScheduledSlot {
  day: number; // 0 = Monday, 6 = Sunday
  dayName: string;
  date: Date;
  postType: PostType;
  templateType: string;
  contentPillar: ContentPillar;
  suggestedTime: string; // HH:MM format
  isExisting?: boolean; // true if slot already has content
  existingPostId?: string;
}

export interface WeeklyCalendar {
  weekType: WeekType;
  startDate: Date;
  endDate: Date;
  slots: ScheduledSlot[];
  stories: {
    day: number;
    dayName: string;
    date: Date;
    count: number;
    suggestedTypes: string[];
  }[];
  summary: {
    feed: number;
    reels: number;
    carousels: number;
    stories: number;
    total: number;
  };
}

interface WeekTemplate {
  weekType: WeekType;
  theme: string;
  focus: string;
  schedule: {
    day: number;
    feed?: string; // Template type
    reel?: string;
    carousel?: string;
    storyCount: number;
    storyTypes: string[];
  }[];
}

// ============================================================================
// Week Templates
// ============================================================================

const WEEK_TEMPLATES: WeekTemplate[] = [
  {
    weekType: 'foundation',
    theme: 'Launch / Foundation',
    focus: 'Brand introduction, signature products, quiz intro',
    schedule: [
      { day: 0, feed: 'signature_quote', storyCount: 5, storyTypes: ['quote', 'poll', 'behind_scenes'] },
      { day: 1, reel: 'transformation', storyCount: 4, storyTypes: ['product', 'question'] },
      { day: 2, feed: 'collection_quote', storyCount: 5, storyTypes: ['quote', 'quiz_cta', 'tip'] },
      { day: 3, reel: 'quote_reveal', carousel: 'educational', storyCount: 4, storyTypes: ['educational', 'poll'] },
      { day: 4, feed: 'lifestyle_styled', storyCount: 6, storyTypes: ['product', 'behind_scenes', 'quiz_cta'] },
      { day: 5, feed: 'collection_quote', reel: 'quote_reveal', storyCount: 4, storyTypes: ['customer', 'quote'] },
      { day: 6, carousel: 'brand_story', storyCount: 3, storyTypes: ['quote', 'countdown'] },
    ],
  },
  {
    weekType: 'engagement',
    theme: 'Engagement Building',
    focus: 'Educational content, authority building, value-first',
    schedule: [
      { day: 0, feed: 'educational_tip', storyCount: 5, storyTypes: ['tip', 'poll', 'question'] },
      { day: 1, reel: 'how_to', storyCount: 4, storyTypes: ['educational', 'poll'] },
      { day: 2, feed: 'collection_quote', carousel: 'tips_tricks', storyCount: 5, storyTypes: ['tip', 'behind_scenes'] },
      { day: 3, reel: 'educational', storyCount: 4, storyTypes: ['question', 'quiz_cta'] },
      { day: 4, feed: 'styled_room', storyCount: 6, storyTypes: ['before_after', 'product', 'tip'] },
      { day: 5, feed: 'customer_feature', storyCount: 4, storyTypes: ['ugc', 'testimonial'] },
      { day: 6, carousel: 'how_to', storyCount: 3, storyTypes: ['quote', 'poll'] },
    ],
  },
  {
    weekType: 'community',
    theme: 'Community Growth',
    focus: 'UGC features, customer spotlights, social proof',
    schedule: [
      { day: 0, feed: 'customer_feature', storyCount: 5, storyTypes: ['ugc', 'testimonial', 'poll'] },
      { day: 1, reel: 'behind_scenes', storyCount: 4, storyTypes: ['behind_scenes', 'question'] },
      { day: 2, feed: 'ugc_reshare', storyCount: 5, storyTypes: ['ugc', 'community', 'shoutout'] },
      { day: 3, reel: 'customer_story', carousel: 'testimonials', storyCount: 4, storyTypes: ['testimonial', 'poll'] },
      { day: 4, feed: 'community_highlight', storyCount: 6, storyTypes: ['ugc', 'question', 'quiz_cta'] },
      { day: 5, feed: 'customer_feature', reel: 'ugc_compilation', storyCount: 4, storyTypes: ['community', 'countdown'] },
      { day: 6, carousel: 'customer_reviews', storyCount: 3, storyTypes: ['testimonial', 'quiz_cta'] },
    ],
  },
  {
    weekType: 'conversion',
    theme: 'Conversion Push',
    focus: 'Product features, quiz CTAs, urgency, best-sellers',
    schedule: [
      { day: 0, feed: 'best_seller', storyCount: 5, storyTypes: ['product', 'quiz_cta', 'countdown'] },
      { day: 1, reel: 'quiz_teaser', storyCount: 4, storyTypes: ['quiz_cta', 'product'] },
      { day: 2, feed: 'product_benefit', carousel: 'collection_showcase', storyCount: 5, storyTypes: ['product', 'urgency'] },
      { day: 3, reel: 'transformation', storyCount: 4, storyTypes: ['product', 'quiz_cta', 'testimonial'] },
      { day: 4, feed: 'limited_edition', storyCount: 6, storyTypes: ['urgency', 'countdown', 'product'] },
      { day: 5, feed: 'product_styled', reel: 'quote_reveal', storyCount: 4, storyTypes: ['product', 'quiz_cta'] },
      { day: 6, carousel: 'gift_guide', storyCount: 3, storyTypes: ['product', 'countdown'] },
    ],
  },
];

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const OPTIMAL_TIMES: Record<PostType, string> = {
  feed: '11:00',
  reel: '12:00',
  carousel: '14:00',
  story: '09:00',
};

const TEMPLATE_TO_PILLAR: Record<string, ContentPillar> = {
  signature_quote: 'product_showcase',
  collection_quote: 'product_showcase',
  product_benefit: 'product_showcase',
  best_seller: 'product_showcase',
  limited_edition: 'product_showcase',
  product_styled: 'product_showcase',
  lifestyle_styled: 'product_showcase',
  styled_room: 'product_showcase',
  transformation: 'brand_story',
  behind_scenes: 'brand_story',
  brand_story: 'brand_story',
  customer_story: 'brand_story',
  educational_tip: 'educational',
  how_to: 'educational',
  tips_tricks: 'educational',
  educational: 'educational',
  gift_guide: 'educational',
  customer_feature: 'community',
  ugc_reshare: 'community',
  community_highlight: 'community',
  ugc_compilation: 'community',
  testimonials: 'community',
  customer_reviews: 'community',
  quiz_teaser: 'product_showcase',
  quote_reveal: 'brand_story',
  collection_showcase: 'product_showcase',
};

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Generate a weekly content calendar
 */
export async function generateWeeklyCalendar(
  weekType: WeekType,
  startDate: Date
): Promise<WeeklyCalendar> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Get template for week type
  const template = WEEK_TEMPLATES.find((t) => t.weekType === weekType);
  if (!template) {
    throw new Error(`Unknown week type: ${weekType}`);
  }

  // Calculate date range
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);

  // Get existing scheduled posts for this week
  const existingPosts = await getExistingPosts(startDate, endDate);

  // Generate slots
  const slots: ScheduledSlot[] = [];
  const stories: WeeklyCalendar['stories'] = [];

  for (const daySchedule of template.schedule) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + daySchedule.day);
    const dayName = DAY_NAMES[daySchedule.day];

    // Check each post type for this day
    if (daySchedule.feed) {
      const existing = findExistingPost(existingPosts, date, 'feed');
      slots.push({
        day: daySchedule.day,
        dayName,
        date: new Date(date),
        postType: 'feed',
        templateType: daySchedule.feed,
        contentPillar: TEMPLATE_TO_PILLAR[daySchedule.feed] || 'product_showcase',
        suggestedTime: OPTIMAL_TIMES.feed,
        isExisting: !!existing,
        existingPostId: existing?.id,
      });
    }

    if (daySchedule.reel) {
      const existing = findExistingPost(existingPosts, date, 'reel');
      slots.push({
        day: daySchedule.day,
        dayName,
        date: new Date(date),
        postType: 'reel',
        templateType: daySchedule.reel,
        contentPillar: TEMPLATE_TO_PILLAR[daySchedule.reel] || 'brand_story',
        suggestedTime: OPTIMAL_TIMES.reel,
        isExisting: !!existing,
        existingPostId: existing?.id,
      });
    }

    if (daySchedule.carousel) {
      const existing = findExistingPost(existingPosts, date, 'carousel');
      slots.push({
        day: daySchedule.day,
        dayName,
        date: new Date(date),
        postType: 'carousel',
        templateType: daySchedule.carousel,
        contentPillar: TEMPLATE_TO_PILLAR[daySchedule.carousel] || 'educational',
        suggestedTime: OPTIMAL_TIMES.carousel,
        isExisting: !!existing,
        existingPostId: existing?.id,
      });
    }

    // Story schedule
    stories.push({
      day: daySchedule.day,
      dayName,
      date: new Date(date),
      count: daySchedule.storyCount,
      suggestedTypes: daySchedule.storyTypes,
    });
  }

  // Calculate summary
  const summary = {
    feed: slots.filter((s) => s.postType === 'feed').length,
    reels: slots.filter((s) => s.postType === 'reel').length,
    carousels: slots.filter((s) => s.postType === 'carousel').length,
    stories: stories.reduce((sum, s) => sum + s.count, 0),
    total: slots.length + stories.reduce((sum, s) => sum + s.count, 0),
  };

  return {
    weekType,
    startDate,
    endDate,
    slots,
    stories,
    summary,
  };
}

/**
 * Apply a calendar template - create posts
 */
export async function applyCalendarTemplate(
  calendar: WeeklyCalendar,
  options: {
    skipExisting?: boolean;
    createAsDraft?: boolean;
  } = {}
): Promise<{
  created: number;
  skipped: number;
  errors: string[];
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { skipExisting = true, createAsDraft = false } = options;

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const slot of calendar.slots) {
    // Skip existing posts if option is set
    if (skipExisting && slot.isExisting) {
      skipped++;
      continue;
    }

    // Create scheduled post
    const scheduledAt = new Date(slot.date);
    const [hours, minutes] = slot.suggestedTime.split(':').map(Number);
    scheduledAt.setHours(hours, minutes, 0, 0);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('instagram_scheduled_posts')
      .insert({
        user_id: user.id,
        post_type: slot.postType,
        status: createAsDraft ? 'draft' : 'scheduled',
        requires_review: createAsDraft,
        scheduled_at: scheduledAt.toISOString(),
        caption: `[${slot.templateType}] Auto-generated placeholder - update with content`,
        hashtags: [],
        content_pillar: slot.contentPillar,
        campaign_tag: `calendar_${calendar.weekType}`,
      });

    if (error) {
      errors.push(`Failed to create ${slot.postType} for ${slot.dayName}: ${error.message}`);
    } else {
      created++;
    }
  }

  return { created, skipped, errors };
}

/**
 * Get existing scheduled posts for a date range
 */
async function getExistingPosts(
  startDate: Date,
  endDate: Date
): Promise<{ id: string; post_type: string; scheduled_at: string }[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('instagram_scheduled_posts')
    .select('id, post_type, scheduled_at')
    .eq('user_id', user.id)
    .gte('scheduled_at', startDate.toISOString())
    .lte('scheduled_at', endDate.toISOString())
    .neq('status', 'cancelled');

  return data || [];
}

/**
 * Find an existing post for a specific day and type
 */
function findExistingPost(
  posts: { id: string; post_type: string; scheduled_at: string }[],
  date: Date,
  postType: PostType
): { id: string } | undefined {
  const dateStr = date.toISOString().split('T')[0];
  return posts.find(
    (p) =>
      p.post_type === postType &&
      p.scheduled_at.startsWith(dateStr)
  );
}

/**
 * Get all week templates
 */
export function getWeekTemplates(): {
  weekType: WeekType;
  theme: string;
  focus: string;
}[] {
  return WEEK_TEMPLATES.map((t) => ({
    weekType: t.weekType,
    theme: t.theme,
    focus: t.focus,
  }));
}

/**
 * Get week template details
 */
export function getWeekTemplate(weekType: WeekType): WeekTemplate | undefined {
  return WEEK_TEMPLATES.find((t) => t.weekType === weekType);
}

/**
 * Preview calendar generation without creating posts
 */
export async function previewCalendar(
  weekType: WeekType,
  startDate: Date
): Promise<{
  calendar: WeeklyCalendar;
  conflicts: {
    slot: ScheduledSlot;
    existingCaption: string;
  }[];
}> {
  const calendar = await generateWeeklyCalendar(weekType, startDate);

  const supabase = await createClient();

  // Get existing posts with captions for conflict display
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingPosts } = await (supabase as any)
    .from('instagram_scheduled_posts')
    .select('id, caption')
    .in(
      'id',
      calendar.slots.filter((s) => s.existingPostId).map((s) => s.existingPostId)
    );

  const conflicts = calendar.slots
    .filter((s) => s.isExisting)
    .map((slot) => ({
      slot,
      existingCaption:
        existingPosts?.find((p: { id: string }) => p.id === slot.existingPostId)?.caption || 'Unknown',
    }));

  return { calendar, conflicts };
}
