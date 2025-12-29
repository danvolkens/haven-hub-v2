/**
 * TikTok Hashtag Generator
 * Prompt J.2: 5-5-5 hashtag method for TikTok
 *
 * Strategy:
 * - 5 Broad/Trending (1M+ views) - discoverability
 * - 5 Medium/Niche (100K-1M views) - targeted reach
 * - 5 Specific/Micro (<100K views) - community building
 *
 * Brand hashtags always included:
 * #havenandhold #quietanchors
 */

import { createClient } from '@/lib/supabase/server';

// ============================================================================
// Types
// ============================================================================

export type ContentType = 'quote_reveal' | 'transformation' | 'educational' | 'bts' | 'trending';
export type Collection = 'grounding' | 'wholeness' | 'growth' | 'any';
export type HashtagTier = 'broad' | 'medium' | 'micro';

export interface HashtagGroup {
  id: string;
  tier: HashtagTier;
  category: string;
  hashtags: string[];
  collection_affinity: (Collection | 'any')[];
  content_type_affinity: (ContentType | 'any')[];
}

export interface GeneratedHashtags {
  hashtags: string[];
  formatted: string;
  groups_used: string[];
}

// ============================================================================
// Constants
// ============================================================================

const BRAND_HASHTAGS = ['havenandhold', 'quietanchors'];
const HASHTAGS_PER_TIER = 5;
const EXCLUDE_LAST_N_POSTS = 3;

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Generate TikTok hashtags using the 5-5-5 method
 * - 5 Broad (trending)
 * - 5 Medium (niche)
 * - 5 Micro (specific)
 * + 1-2 Brand hashtags
 */
export async function generateTikTokHashtags(
  collection: Collection = 'any',
  contentType: ContentType = 'quote_reveal'
): Promise<GeneratedHashtags> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get recent hashtag usage to exclude
  const recentHashtags = await getRecentHashtags(EXCLUDE_LAST_N_POSTS);

  // Get hashtag groups for each tier
  const [broadGroups, mediumGroups, microGroups] = await Promise.all([
    getHashtagGroups('broad', collection, contentType),
    getHashtagGroups('medium', collection, contentType),
    getHashtagGroups('micro', collection, contentType),
  ]);

  // Select hashtags from each tier
  const selectedBroad = selectHashtagsFromTier(broadGroups, HASHTAGS_PER_TIER, recentHashtags);
  const selectedMedium = selectHashtagsFromTier(mediumGroups, HASHTAGS_PER_TIER, recentHashtags);
  const selectedMicro = selectHashtagsFromTier(microGroups, HASHTAGS_PER_TIER, recentHashtags);

  // Combine all hashtags
  const allHashtags = [
    ...selectedBroad.hashtags,
    ...selectedMedium.hashtags,
    ...selectedMicro.hashtags,
  ];

  // Add 1-2 brand hashtags (always include primary)
  const brandToAdd = Math.random() > 0.5 ? BRAND_HASHTAGS : [BRAND_HASHTAGS[0]];
  allHashtags.push(...brandToAdd);

  // Log usage if user is authenticated
  if (user) {
    await logHashtagUsage(
      allHashtags,
      [...selectedBroad.groupIds, ...selectedMedium.groupIds, ...selectedMicro.groupIds]
    );
  }

  return {
    hashtags: allHashtags,
    formatted: formatHashtags(allHashtags),
    groups_used: [
      ...selectedBroad.groupIds,
      ...selectedMedium.groupIds,
      ...selectedMicro.groupIds,
    ],
  };
}

/**
 * Get hashtag groups matching criteria
 */
async function getHashtagGroups(
  tier: HashtagTier,
  collection: Collection,
  contentType: ContentType
): Promise<HashtagGroup[]> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('tiktok_hashtag_groups')
    .select('*')
    .eq('tier', tier)
    .eq('is_active', true);

  const { data: groups } = await query;

  if (!groups || groups.length === 0) {
    return [];
  }

  // Filter by affinity - include groups that match OR have 'any' affinity
  const matchingGroups = groups.filter((group: HashtagGroup) => {
    const collectionMatch =
      group.collection_affinity?.includes('any') ||
      group.collection_affinity?.includes(collection) ||
      collection === 'any';

    const contentTypeMatch =
      group.content_type_affinity?.includes('any') ||
      group.content_type_affinity?.includes(contentType);

    return collectionMatch && contentTypeMatch;
  });

  // If no matching groups, fall back to all groups in tier
  return matchingGroups.length > 0 ? matchingGroups : groups;
}

/**
 * Select hashtags from a tier's groups
 */
function selectHashtagsFromTier(
  groups: HashtagGroup[],
  count: number,
  excludeHashtags: string[]
): { hashtags: string[]; groupIds: string[] } {
  if (groups.length === 0) {
    return { hashtags: [], groupIds: [] };
  }

  // Collect all available hashtags from groups
  const allHashtags: { hashtag: string; groupId: string }[] = [];

  for (const group of groups) {
    for (const hashtag of group.hashtags) {
      if (!excludeHashtags.includes(hashtag.toLowerCase())) {
        allHashtags.push({ hashtag, groupId: group.id });
      }
    }
  }

  // Shuffle and select
  const shuffled = shuffleArray(allHashtags);
  const selected = shuffled.slice(0, count);

  return {
    hashtags: selected.map((s) => s.hashtag),
    groupIds: [...new Set(selected.map((s) => s.groupId))],
  };
}

/**
 * Get recently used hashtags to exclude
 */
async function getRecentHashtags(postCount: number): Promise<string[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: recentUsage } = await (supabase as any)
    .from('tiktok_hashtag_usage')
    .select('hashtags')
    .eq('user_id', user.id)
    .order('used_at', { ascending: false })
    .limit(postCount);

  if (!recentUsage) return [];

  // Flatten and dedupe
  const allRecent: string[] = recentUsage.flatMap(
    (usage: { hashtags: string[] }) => usage.hashtags || []
  );
  const uniqueLowercase = [...new Set(allRecent.map((h) => h.toLowerCase()))];
  return uniqueLowercase;
}

/**
 * Log hashtag usage for rotation tracking
 */
async function logHashtagUsage(hashtags: string[], groupIds: string[]): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('tiktok_hashtag_usage').insert({
    user_id: user.id,
    hashtags,
    group_ids: groupIds,
  });
}

/**
 * Format hashtags as a string with # prefix
 */
function formatHashtags(hashtags: string[]): string {
  return hashtags
    .map((h) => (h.startsWith('#') ? h : `#${h}`))
    .join(' ');
}

/**
 * Fisher-Yates shuffle
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ============================================================================
// Additional Functions
// ============================================================================

/**
 * Get all hashtag groups (for UI display)
 */
export async function getAllHashtagGroups(): Promise<HashtagGroup[]> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('tiktok_hashtag_groups')
    .select('*')
    .eq('is_active', true)
    .order('tier')
    .order('category');

  return (data || []) as HashtagGroup[];
}

/**
 * Get hashtags by tier
 */
export async function getHashtagsByTier(tier: HashtagTier): Promise<HashtagGroup[]> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('tiktok_hashtag_groups')
    .select('*')
    .eq('tier', tier)
    .eq('is_active', true)
    .order('category');

  return (data || []) as HashtagGroup[];
}

/**
 * Get caption templates for TikTok
 */
export async function getTikTokCaptionTemplates(
  contentPillar?: ContentType
): Promise<
  {
    id: string;
    name: string;
    template_text: string;
    content_pillar: ContentType;
    tone: string;
    variables: string[];
  }[]
> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('tiktok_caption_templates')
    .select('*')
    .eq('is_active', true)
    .eq('platform', 'tiktok');

  if (contentPillar) {
    query = query.eq('content_pillar', contentPillar);
  }

  const { data } = await query.order('content_pillar');

  return data || [];
}

/**
 * Apply variables to a caption template
 */
export function applyCaptionTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;

  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }

  return result;
}

/**
 * Get suggested hashtags for a specific collection
 */
export async function getSuggestedHashtagsForCollection(
  collection: Collection
): Promise<string[]> {
  const groups = await Promise.all([
    getHashtagGroups('medium', collection, 'quote_reveal'),
    getHashtagGroups('micro', collection, 'quote_reveal'),
  ]);

  const allHashtags: string[] = [];
  for (const tierGroups of groups) {
    for (const group of tierGroups) {
      allHashtags.push(...group.hashtags);
    }
  }

  return [...new Set(allHashtags)];
}
