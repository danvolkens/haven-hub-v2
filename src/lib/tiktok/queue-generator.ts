/**
 * TikTok Queue Generator
 * Creates queue entries on video completion with optimized captions and hashtags
 */

import { createClient } from '@/lib/supabase/server';
import { format, addDays, startOfDay, isBefore } from 'date-fns';

// ============================================================================
// Types
// ============================================================================

interface Quote {
  id: string;
  text: string;
  author: string;
  collection: string;
}

interface VideoHook {
  id: string;
  hook_text: string;
  hook_type: string;
}

interface TikTokQueueEntry {
  id: string;
  user_id: string;
  quote_id: string;
  video_asset_id?: string;
  content_type: string;
  hook_id?: string;
  hook_text: string;
  caption: string;
  hashtags: string[];
  target_date: string;
  slot_type: 'morning' | 'evening';
  status: 'pending' | 'ready';
}

// ============================================================================
// Collection Taglines
// ============================================================================

const COLLECTION_TAGLINES: Record<string, string> = {
  grounding: 'For the days when everything feels unsteady.',
  wholeness: 'All of you belongs here.',
  growth: 'Still becoming. And that\'s enough.',
  general: 'Words that stay with you.',
};

// ============================================================================
// Hashtag Tiers (5-5-5 Method)
// ============================================================================

// Mega hashtags (1M+ posts) - 5 tags
const MEGA_HASHTAGS = [
  'fyp', 'viral', 'foryou', 'tiktok', 'trending',
  'foryoupage', 'viralvideo', 'explore', 'fy', 'trend',
];

// Large hashtags (100K-1M posts) by collection - 5 tags each
const LARGE_HASHTAGS: Record<string, string[]> = {
  grounding: [
    'mentalhealth', 'anxietyrelief', 'healing', 'selfcare', 'mindfulness',
    'grounding', 'calmdown', 'stressrelief', 'innerpeace', 'wellness',
  ],
  wholeness: [
    'selflove', 'selfworth', 'selfcompassion', 'acceptance', 'innerpeace',
    'loveyourself', 'selfacceptance', 'bodypositive', 'healing', 'wholeness',
  ],
  growth: [
    'personalgrowth', 'motivation', 'mindset', 'transformation', 'growth',
    'selfimprovement', 'growthmindset', 'levelup', 'goals', 'success',
  ],
  general: [
    'quotes', 'quotestoliveby', 'inspiration', 'wisdom', 'words',
    'dailyquote', 'quoteoftheday', 'motivational', 'inspirational', 'deep',
  ],
};

// Niche hashtags (10K-100K posts) by collection - 5 tags each
const NICHE_HASHTAGS: Record<string, string[]> = {
  grounding: [
    'groundingtechniques', 'calmvibes', 'peacefulmind', 'anxietysupport', 'nervoussystem',
    'groundingexercise', 'regulating', 'coregulation', 'breathwork', 'somatichealing',
  ],
  wholeness: [
    'innerchild', 'healingjourney', 'emotionalhealing', 'traumahealing', 'therapytiktok',
    'innerwork', 'shadowwork', 'selfhealers', 'healingtrauma', 'emotionalintelligence',
  ],
  growth: [
    'becomingher', 'levelup', 'growthmindset', 'evolving', 'selfimprovement',
    'personaldevelopment', 'mindsetshift', 'glowup', 'futureyou', 'selfmastery',
  ],
  general: [
    'quoteoftheday', 'dailyquote', 'quoteart', 'wordsofwisdom', 'thoughtful',
    'deepquotes', 'meaningfulquotes', 'quotesaboutlife', 'quotesgram', 'quotestagram',
  ],
};

// ============================================================================
// Hashtag Generation (5-5-5 Method)
// ============================================================================

/**
 * Generate 15 TikTok hashtags using the 5-5-5 method:
 * - 5 Mega hashtags (high reach)
 * - 5 Large hashtags (medium reach, niche-relevant)
 * - 5 Niche hashtags (targeted, high engagement)
 */
export function generateTikTokHashtags(collection: string): string[] {
  const normalizedCollection = collection.toLowerCase();

  // Shuffle and pick 5 from each tier
  const shuffleAndPick = (arr: string[], count: number): string[] => {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  };

  const mega = shuffleAndPick(MEGA_HASHTAGS, 5);
  const large = shuffleAndPick(
    LARGE_HASHTAGS[normalizedCollection] || LARGE_HASHTAGS.general,
    5
  );
  const niche = shuffleAndPick(
    NICHE_HASHTAGS[normalizedCollection] || NICHE_HASHTAGS.general,
    5
  );

  return [...mega, ...large, ...niche].map((tag) => `#${tag}`);
}

// ============================================================================
// Caption Generation
// ============================================================================

/**
 * Generate TikTok-optimized caption with hook, quote, tagline, and CTA
 */
export function generateTikTokCaption(
  hookText: string,
  quoteText: string,
  collection: string
): string {
  const tagline = COLLECTION_TAGLINES[collection.toLowerCase()] || COLLECTION_TAGLINES.general;

  return `${hookText}

"${quoteText}"

${tagline}

Link in bio 🤍`;
}

// ============================================================================
// Slot Finding
// ============================================================================

/**
 * Find the next available slot (morning or evening)
 * Alternates between AM and PM slots across days
 */
export async function findNextAvailableSlot(
  supabase: any,
  userId: string
): Promise<{ date: string; slot: 'morning' | 'evening' }> {
  const today = startOfDay(new Date());

  // Check the next 14 days for available slots
  for (let daysAhead = 0; daysAhead < 14; daysAhead++) {
    const checkDate = addDays(today, daysAhead);
    const dateStr = format(checkDate, 'yyyy-MM-dd');

    // Get existing slots for this date
    const { data: existingSlots } = await supabase
      .from('tiktok_queue')
      .select('slot_type')
      .eq('user_id', userId)
      .eq('target_date', dateStr);

    const takenSlots = new Set((existingSlots || []).map((s: any) => s.slot_type));

    // Check morning slot first
    if (!takenSlots.has('morning')) {
      return { date: dateStr, slot: 'morning' };
    }

    // Then check evening slot
    if (!takenSlots.has('evening')) {
      return { date: dateStr, slot: 'evening' };
    }
  }

  // Fallback to 14 days out with morning slot
  const fallbackDate = addDays(today, 14);
  return { date: format(fallbackDate, 'yyyy-MM-dd'), slot: 'morning' };
}

// ============================================================================
// Hook Selection
// ============================================================================

/**
 * Select a hook for quote reveal content type
 * Prioritizes unused hooks, then falls back to random
 */
export async function selectHookForQuoteReveal(
  supabase: any
): Promise<VideoHook | null> {
  // Get hooks for quote_reveal content type, ordered by usage
  const { data: hooks, error } = await supabase
    .from('video_hooks')
    .select('id, hook_text, hook_type')
    .contains('content_types', ['quote_reveal'])
    .eq('is_active', true)
    .order('usage_count', { ascending: true })
    .limit(5);

  if (error || !hooks || hooks.length === 0) {
    // Fallback hook
    return {
      id: 'default',
      hook_text: 'Wait for it... 💫',
      hook_type: 'pattern_interrupt',
    };
  }

  // Randomly pick from the least-used hooks
  return hooks[Math.floor(Math.random() * hooks.length)];
}

// ============================================================================
// Main Queue Entry Creation
// ============================================================================

/**
 * Create a TikTok queue entry when video generation completes
 * Called from Creatomate webhook or video completion handler
 */
export async function createTikTokQueueEntry(
  userId: string,
  quoteId: string,
  videoAssetId?: string,
  videoUrl?: string,
  thumbnailUrl?: string
): Promise<TikTokQueueEntry | null> {
  const supabase = await createClient();

  // 1. Get quote details
  const { data: quote, error: quoteError } = await (supabase as any)
    .from('quotes')
    .select('id, text, author, collection')
    .eq('id', quoteId)
    .single();

  if (quoteError || !quote) {
    console.error('Failed to fetch quote for TikTok queue:', quoteError);
    return null;
  }

  // 2. Select hook for quote_reveal content type
  const hook = await selectHookForQuoteReveal(supabase);

  // 3. Generate TikTok-optimized caption
  const caption = generateTikTokCaption(
    hook?.hook_text || 'Wait for it... 💫',
    quote.text,
    quote.collection
  );

  // 4. Generate TikTok hashtags (5-5-5 method)
  const hashtags = generateTikTokHashtags(quote.collection);

  // 5. Find next available slot
  const { date, slot } = await findNextAvailableSlot(supabase, userId);

  // 6. Insert queue entry
  const { data: entry, error: insertError } = await (supabase as any)
    .from('tiktok_queue')
    .insert({
      user_id: userId,
      quote_id: quoteId,
      video_asset_id: videoAssetId,
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl,
      content_type: 'quote_reveal',
      hook_id: hook?.id !== 'default' ? hook?.id : null,
      hook_text: hook?.hook_text || 'Wait for it... 💫',
      caption,
      hashtags,
      target_date: date,
      slot_type: slot,
      status: videoAssetId ? 'ready' : 'pending',
    })
    .select()
    .single();

  if (insertError) {
    console.error('Failed to create TikTok queue entry:', insertError);
    return null;
  }

  // 7. Update hook usage count if we used a real hook
  if (hook && hook.id !== 'default') {
    await (supabase as any)
      .from('video_hooks')
      .update({ usage_count: (supabase as any).sql`usage_count + 1` })
      .eq('id', hook.id);
  }

  console.log('Created TikTok queue entry:', {
    entryId: entry.id,
    quoteId,
    targetDate: date,
    slot,
  });

  return entry;
}

// ============================================================================
// Batch Queue Creation
// ============================================================================

/**
 * Create multiple TikTok queue entries for a list of quotes
 * Useful for bulk scheduling from approved quotes
 */
export async function createBatchTikTokQueueEntries(
  userId: string,
  quoteIds: string[]
): Promise<{ created: number; failed: number }> {
  let created = 0;
  let failed = 0;

  for (const quoteId of quoteIds) {
    const entry = await createTikTokQueueEntry(userId, quoteId);
    if (entry) {
      created++;
    } else {
      failed++;
    }
  }

  return { created, failed };
}
