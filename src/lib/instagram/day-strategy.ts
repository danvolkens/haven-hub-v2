/**
 * Instagram Day Strategy Engine
 * Prompt C.1: Day-specific content strategy from Instagram Guide
 */

import type { ContentPillar, PostType, StoryType } from '@/types/instagram';

// ============================================================================
// Types
// ============================================================================

export interface RecommendedContent {
  type: PostType;
  pillar: ContentPillar;
  priority: number;
  description?: string;
}

export interface StoryScheduleItem {
  time: string; // 12-hour format for display
  time24: string; // 24-hour format for scheduling
  type: StoryType;
  description: string;
}

export interface DayStrategy {
  dayNumber: number; // 0 = Sunday, 1 = Monday, etc.
  dayName: string;
  theme: string;
  themeEmoji: string;
  themeDescription: string;
  recommendedContent: RecommendedContent[];
  postTimes: string[]; // Optimal posting times
  storySchedule: StoryScheduleItem[];
  storyCount: number;
}

// ============================================================================
// Day Strategy Definitions
// ============================================================================

const DAY_STRATEGIES: Record<number, DayStrategy> = {
  0: {
    // Sunday
    dayNumber: 0,
    dayName: 'Sunday',
    theme: 'Soul',
    themeEmoji: '🌅',
    themeDescription: 'Brand story and reflection. Connect with your audience on a deeper level.',
    recommendedContent: [
      { type: 'carousel', pillar: 'brand_story', priority: 1, description: 'Reflective brand story carousel' },
      { type: 'feed', pillar: 'brand_story', priority: 2, description: 'Behind-the-scenes or founder story' },
    ],
    postTimes: ['10:00 AM', '7:00 PM'],
    storySchedule: [
      { time: '9:00 AM', time24: '09:00', type: 'quote_daily', description: 'Reflective morning quote' },
      { time: '12:00 PM', time24: '12:00', type: 'question_box', description: 'Weekly reflection question' },
      { time: '4:00 PM', time24: '16:00', type: 'bts', description: 'Week ahead planning' },
      { time: '8:00 PM', time24: '20:00', type: 'quiz_cta', description: 'Evening quiz CTA' },
    ],
    storyCount: 4,
  },
  1: {
    // Monday
    dayNumber: 1,
    dayName: 'Monday',
    theme: 'Fresh Start',
    themeEmoji: '🌱',
    themeDescription: 'Educational content and engagement focus. New week energy.',
    recommendedContent: [
      { type: 'carousel', pillar: 'educational', priority: 1, description: 'Educational how-to carousel' },
      { type: 'feed', pillar: 'educational', priority: 2, description: 'Tip or trick post' },
    ],
    postTimes: ['11:00 AM', '7:00 PM'],
    storySchedule: [
      { time: '8:00 AM', time24: '08:00', type: 'quote_daily', description: 'Monday motivation quote' },
      { time: '12:00 PM', time24: '12:00', type: 'poll', description: 'Engagement poll' },
      { time: '3:00 PM', time24: '15:00', type: 'product_highlight', description: 'Product feature' },
      { time: '6:00 PM', time24: '18:00', type: 'bts', description: 'Behind the scenes' },
      { time: '9:00 PM', time24: '21:00', type: 'quiz_cta', description: 'Quiz CTA' },
    ],
    storyCount: 5,
  },
  2: {
    // Tuesday
    dayNumber: 2,
    dayName: 'Tuesday',
    theme: 'Transformation',
    themeEmoji: '✨',
    themeDescription: 'Room transformation and Q&A content. Show the impact.',
    recommendedContent: [
      { type: 'reel', pillar: 'product_showcase', priority: 1, description: 'Room transformation Reel' },
      { type: 'feed', pillar: 'product_showcase', priority: 2, description: 'Before/after styled shot' },
    ],
    postTimes: ['9:00 AM', '6:00 PM'],
    storySchedule: [
      { time: '8:00 AM', time24: '08:00', type: 'quote_daily', description: 'Transformation quote' },
      { time: '11:00 AM', time24: '11:00', type: 'question_box', description: 'Q&A - Ask me anything' },
      { time: '2:00 PM', time24: '14:00', type: 'product_highlight', description: 'Product in action' },
      { time: '5:00 PM', time24: '17:00', type: 'poll', description: 'Which room poll' },
      { time: '8:00 PM', time24: '20:00', type: 'quiz_cta', description: 'Quiz CTA' },
    ],
    storyCount: 5,
  },
  3: {
    // Wednesday
    dayNumber: 3,
    dayName: 'Wednesday',
    theme: 'Wisdom',
    themeEmoji: '📚',
    themeDescription: 'Best-seller showcase and product wisdom. Midweek highlight.',
    recommendedContent: [
      { type: 'feed', pillar: 'product_showcase', priority: 1, description: 'Best-seller product showcase' },
      { type: 'reel', pillar: 'educational', priority: 2, description: 'Educational tip Reel' },
    ],
    postTimes: ['1:00 PM', '7:00 PM'],
    storySchedule: [
      { time: '8:00 AM', time24: '08:00', type: 'quote_daily', description: 'Wisdom quote' },
      { time: '12:00 PM', time24: '12:00', type: 'product_highlight', description: 'Best-seller feature' },
      { time: '3:00 PM', time24: '15:00', type: 'poll', description: 'Preference poll' },
      { time: '6:00 PM', time24: '18:00', type: 'bts', description: 'Creation process' },
      { time: '9:00 PM', time24: '21:00', type: 'quiz_cta', description: 'Quiz CTA' },
    ],
    storyCount: 5,
  },
  4: {
    // Thursday
    dayNumber: 4,
    dayName: 'Thursday',
    theme: 'Throwback/Therapy',
    themeEmoji: '💜',
    themeDescription: 'Brand story and emotional content. Connect through vulnerability.',
    recommendedContent: [
      { type: 'reel', pillar: 'brand_story', priority: 1, description: 'Brand story Reel' },
      { type: 'carousel', pillar: 'educational', priority: 2, description: 'Educational carousel' },
    ],
    postTimes: ['12:00 PM', '7:00 PM'],
    storySchedule: [
      { time: '8:00 AM', time24: '08:00', type: 'quote_daily', description: 'Therapy/healing quote' },
      { time: '11:00 AM', time24: '11:00', type: 'question_box', description: 'Therapy Thursday question' },
      { time: '2:00 PM', time24: '14:00', type: 'product_highlight', description: 'Wholeness collection feature' },
      { time: '5:00 PM', time24: '17:00', type: 'bts', description: 'Personal moment' },
      { time: '8:00 PM', time24: '20:00', type: 'quiz_cta', description: 'Quiz CTA' },
    ],
    storyCount: 5,
  },
  5: {
    // Friday
    dayNumber: 5,
    dayName: 'Friday',
    theme: 'Feature',
    themeEmoji: '🌟',
    themeDescription: 'UGC and customer features. Celebrate your community.',
    recommendedContent: [
      { type: 'feed', pillar: 'community', priority: 1, description: 'Customer/UGC feature' },
      { type: 'reel', pillar: 'community', priority: 2, description: 'Customer room tour Reel' },
    ],
    postTimes: ['11:00 AM', '5:00 PM'],
    storySchedule: [
      { time: '8:00 AM', time24: '08:00', type: 'quote_daily', description: 'Friday feeling quote' },
      { time: '11:00 AM', time24: '11:00', type: 'customer_feature', description: 'Customer spotlight' },
      { time: '2:00 PM', time24: '14:00', type: 'poll', description: 'Weekend plans poll' },
      { time: '5:00 PM', time24: '17:00', type: 'product_highlight', description: 'Weekend shopping CTA' },
      { time: '8:00 PM', time24: '20:00', type: 'quiz_cta', description: 'Quiz CTA' },
    ],
    storyCount: 5,
  },
  6: {
    // Saturday
    dayNumber: 6,
    dayName: 'Saturday',
    theme: 'Showcase',
    themeEmoji: '🎨',
    themeDescription: 'Quote reveals and styled products. Visual feast day.',
    recommendedContent: [
      { type: 'reel', pillar: 'product_showcase', priority: 1, description: 'Quote reveal Reel' },
      { type: 'feed', pillar: 'product_showcase', priority: 2, description: 'Styled product shot' },
    ],
    postTimes: ['9:00 AM', '1:00 PM'],
    storySchedule: [
      { time: '9:00 AM', time24: '09:00', type: 'quote_daily', description: 'Weekend inspiration quote' },
      { time: '12:00 PM', time24: '12:00', type: 'product_highlight', description: 'New arrival showcase' },
      { time: '3:00 PM', time24: '15:00', type: 'poll', description: 'Design preference poll' },
      { time: '6:00 PM', time24: '18:00', type: 'bts', description: 'Weekend vibes' },
      { time: '9:00 PM', time24: '21:00', type: 'quiz_cta', description: 'Quiz CTA' },
    ],
    storyCount: 5,
  },
};

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Get the content strategy for a specific date
 */
export function getDayStrategy(date: Date): DayStrategy {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
  return DAY_STRATEGIES[dayOfWeek];
}

/**
 * Get the content strategy for today
 */
export function getTodayStrategy(): DayStrategy {
  return getDayStrategy(new Date());
}

/**
 * Get strategies for the entire week starting from a date
 */
export function getWeekStrategies(startDate: Date): DayStrategy[] {
  const strategies: DayStrategy[] = [];
  const current = new Date(startDate);

  for (let i = 0; i < 7; i++) {
    strategies.push(getDayStrategy(current));
    current.setDate(current.getDate() + 1);
  }

  return strategies;
}

/**
 * Get the recommended post times for a specific day
 */
export function getOptimalPostTimes(date: Date): string[] {
  const strategy = getDayStrategy(date);
  return strategy.postTimes;
}

/**
 * Get the story schedule for a specific day
 */
export function getStorySchedule(date: Date): StoryScheduleItem[] {
  const strategy = getDayStrategy(date);
  return strategy.storySchedule;
}

/**
 * Get a summary of the day's theme for display
 */
export function getDayThemeSummary(date: Date): {
  dayName: string;
  theme: string;
  emoji: string;
  description: string;
} {
  const strategy = getDayStrategy(date);
  return {
    dayName: strategy.dayName,
    theme: strategy.theme,
    emoji: strategy.themeEmoji,
    description: strategy.themeDescription,
  };
}

/**
 * Get the primary recommended content for a day
 */
export function getPrimaryRecommendation(date: Date): RecommendedContent | null {
  const strategy = getDayStrategy(date);
  return strategy.recommendedContent.find((c) => c.priority === 1) || null;
}

/**
 * Check if a content type matches the day's theme
 */
export function isContentMatchingDayTheme(
  date: Date,
  postType: PostType,
  pillar: ContentPillar
): boolean {
  const strategy = getDayStrategy(date);
  return strategy.recommendedContent.some(
    (c) => c.type === postType && c.pillar === pillar
  );
}

/**
 * Get content suggestions based on what's missing for the day
 */
export function getDayContentSuggestions(
  date: Date,
  existingContent: Array<{ type: PostType; pillar: ContentPillar }>
): RecommendedContent[] {
  const strategy = getDayStrategy(date);

  // Filter out content types that are already scheduled
  return strategy.recommendedContent.filter((recommended) => {
    return !existingContent.some(
      (existing) =>
        existing.type === recommended.type && existing.pillar === recommended.pillar
    );
  });
}

// ============================================================================
// Exports
// ============================================================================

export { DAY_STRATEGIES };
