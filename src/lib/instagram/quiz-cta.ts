/**
 * Instagram Quiz CTA Distribution System
 * Prompt E.1: Automated quiz CTA distribution across content
 *
 * From guide — Quiz mention frequency:
 * - Feed posts: 2-3x per week (subtle mention)
 * - Stories: 1x daily (dedicated quiz CTA story)
 * - Bio: Primary link
 */

import { createClient } from '@/lib/supabase/server';

// ============================================================================
// Types
// ============================================================================

export type CTAType = 'subtle' | 'direct' | 'story';

export interface QuizCTA {
  id: string;
  type: CTAType;
  text: string;
  variant: number;
  lastUsed?: Date;
}

export interface QuizCTAUsage {
  weeklyFeedMentions: number;
  dailyStoryPosted: boolean;
  lastStoryVariant: number;
  lastFeedMention: Date | null;
}

// ============================================================================
// CTA Templates (from Instagram Guide)
// ============================================================================

export const SUBTLE_CTAS: QuizCTA[] = [
  {
    id: 'subtle-1',
    type: 'subtle',
    text: "Not sure which collection is yours? Take the 2-minute quiz in our bio — it'll tell you if you're Grounding, Wholeness, or Growth 🌿💫🌱",
    variant: 1,
  },
  {
    id: 'subtle-2',
    type: 'subtle',
    text: "Curious which prints match your sanctuary style? Our quick quiz in bio can help you find your collection. 🤍",
    variant: 2,
  },
  {
    id: 'subtle-3',
    type: 'subtle',
    text: "Which collection speaks to the season you're in? Take the quiz in our bio to find out. 💫",
    variant: 3,
  },
];

export const DIRECT_CTAS: QuizCTA[] = [
  {
    id: 'direct-1',
    type: 'direct',
    text: "→ Find your sanctuary style: Quiz in bio",
    variant: 1,
  },
  {
    id: 'direct-2',
    type: 'direct',
    text: "→ Take the quiz + get 15% off your first order (link in bio)",
    variant: 2,
  },
  {
    id: 'direct-3',
    type: 'direct',
    text: "→ Discover your collection: 2-min quiz in bio 🌿💫🌱",
    variant: 3,
  },
];

export const STORY_CTAS: QuizCTA[] = [
  {
    id: 'story-1',
    type: 'story',
    text: "What's your sanctuary style?\n\n2-minute quiz → find out\n\nLink in bio 🤍",
    variant: 1,
  },
  {
    id: 'story-2',
    type: 'story',
    text: "Not sure which prints are for you?\n\nTake the quiz + get 15% off your first order\n\nLink in bio 💫",
    variant: 2,
  },
  {
    id: 'story-3',
    type: 'story',
    text: "Grounding 🌿\nWholeness 💫\nGrowth 🌱\n\nWhich one are you?\n\nQuiz in bio to find out",
    variant: 3,
  },
  {
    id: 'story-4',
    type: 'story',
    text: "The prints you need depend on the season you're in\n\nLet's find yours ✨\n\nQuiz link in bio",
    variant: 4,
  },
];

// Weekly targets
export const WEEKLY_TARGETS = {
  feedMentions: { min: 2, max: 3 },
  dailyStories: 1,
};

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Get a quiz CTA of the specified type
 * Rotates through variants and tracks usage
 */
export async function getQuizCTA(type: CTAType): Promise<QuizCTA> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Return default if not authenticated
    return getDefaultCTA(type);
  }

  // Get current usage tracking
  const usage = await getQuizCTAUsage();

  // Select CTA based on type and rotation
  let ctas: QuizCTA[];
  let lastVariant: number;

  switch (type) {
    case 'subtle':
      ctas = SUBTLE_CTAS;
      lastVariant = 0; // Subtle CTAs don't track rotation
      break;
    case 'direct':
      ctas = DIRECT_CTAS;
      lastVariant = 0;
      break;
    case 'story':
      ctas = STORY_CTAS;
      lastVariant = usage.lastStoryVariant;
      break;
  }

  // Rotate to next variant (avoid same as yesterday for stories)
  let nextVariant = (lastVariant % ctas.length) + 1;
  const selectedCTA = ctas.find((c) => c.variant === nextVariant) || ctas[0];

  // Track usage if it's a story CTA
  if (type === 'story') {
    await trackStoryUsage(nextVariant);
  }

  return selectedCTA;
}

/**
 * Get default CTA without tracking
 */
function getDefaultCTA(type: CTAType): QuizCTA {
  switch (type) {
    case 'subtle':
      return SUBTLE_CTAS[0];
    case 'direct':
      return DIRECT_CTAS[0];
    case 'story':
      return STORY_CTAS[0];
  }
}

/**
 * Get current quiz CTA usage for tracking
 */
export async function getQuizCTAUsage(): Promise<QuizCTAUsage> {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];
  const weekStart = getWeekStart(new Date()).toISOString().split('T')[0];

  // Get this week's feed mentions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: feedData } = await (supabase as any)
    .from('instagram_scheduled_posts')
    .select('id, caption')
    .gte('scheduled_at', weekStart)
    .or('caption.ilike.%quiz in bio%,caption.ilike.%quiz in our bio%,caption.ilike.%take the quiz%');

  // Get today's quiz story
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: storyData } = await (supabase as any)
    .from('instagram_scheduled_posts')
    .select('id')
    .eq('post_type', 'story')
    .gte('scheduled_at', today)
    .lt('scheduled_at', new Date(Date.now() + 86400000).toISOString().split('T')[0])
    .ilike('caption', '%quiz%');

  // Get last story variant from user settings
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: settings } = await (supabase as any)
    .from('user_settings')
    .select('guardrails')
    .single();

  const lastStoryVariant = settings?.guardrails?.last_quiz_story_variant || 0;

  return {
    weeklyFeedMentions: feedData?.length || 0,
    dailyStoryPosted: (storyData?.length || 0) > 0,
    lastStoryVariant,
    lastFeedMention: null, // Would need additional tracking
  };
}

/**
 * Track story CTA usage
 */
async function trackStoryUsage(variant: number): Promise<void> {
  const supabase = await createClient();

  // Update user settings with last variant
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase as any)
    .from('user_settings')
    .select('guardrails')
    .single();

  const currentGuardrails = existing?.guardrails || {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('user_settings')
    .update({
      guardrails: {
        ...currentGuardrails,
        last_quiz_story_variant: variant,
        last_quiz_story_date: new Date().toISOString().split('T')[0],
      },
    })
    .not('id', 'is', null); // Update any existing row
}

/**
 * Check if caption should have quiz CTA appended
 */
export async function shouldAppendQuizCTA(caption: string): Promise<boolean> {
  // Don't append if already has quiz mention
  if (hasQuizMention(caption)) {
    return false;
  }

  // Check weekly quota
  const usage = await getQuizCTAUsage();

  // If under minimum, suggest appending
  if (usage.weeklyFeedMentions < WEEKLY_TARGETS.feedMentions.min) {
    return true;
  }

  // If at max, don't append
  if (usage.weeklyFeedMentions >= WEEKLY_TARGETS.feedMentions.max) {
    return false;
  }

  // Between min and max, append 50% of the time
  return Math.random() > 0.5;
}

/**
 * Check if caption already mentions quiz
 */
export function hasQuizMention(caption: string): boolean {
  const quizPatterns = [
    /quiz in bio/i,
    /quiz in our bio/i,
    /take the quiz/i,
    /take our quiz/i,
    /2-minute quiz/i,
    /sanctuary style quiz/i,
    /find your collection/i,
  ];

  return quizPatterns.some((pattern) => pattern.test(caption));
}

/**
 * Append subtle quiz CTA to caption
 */
export async function appendQuizCTA(caption: string): Promise<string> {
  if (hasQuizMention(caption)) {
    return caption;
  }

  const cta = await getQuizCTA('subtle');

  // Add CTA with proper spacing
  const separator = caption.endsWith('\n') ? '\n' : '\n\n';
  return `${caption}${separator}${cta.text}`;
}

/**
 * Get the quiz story to schedule for today
 */
export async function getEveningQuizStory(): Promise<{
  cta: QuizCTA;
  scheduledTime: Date;
  alreadyScheduled: boolean;
}> {
  const usage = await getQuizCTAUsage();

  if (usage.dailyStoryPosted) {
    return {
      cta: STORY_CTAS[0],
      scheduledTime: getEveningTime(),
      alreadyScheduled: true,
    };
  }

  const cta = await getQuizCTA('story');

  return {
    cta,
    scheduledTime: getEveningTime(),
    alreadyScheduled: false,
  };
}

/**
 * Get all CTA templates
 */
export function getAllCTATemplates(): {
  subtle: QuizCTA[];
  direct: QuizCTA[];
  story: QuizCTA[];
} {
  return {
    subtle: SUBTLE_CTAS,
    direct: DIRECT_CTAS,
    story: STORY_CTAS,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function getEveningTime(): Date {
  const now = new Date();
  const evening = new Date(now);
  evening.setHours(21, 0, 0, 0); // 9 PM

  // If already past 9 PM, schedule for tomorrow
  if (now > evening) {
    evening.setDate(evening.getDate() + 1);
  }

  return evening;
}
