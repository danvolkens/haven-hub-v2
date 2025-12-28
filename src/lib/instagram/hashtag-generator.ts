/**
 * Instagram Hashtag Auto-Generation
 * Prompt 2.4: Tiered hashtag selection with rotation tracking
 */

import { createClient } from '@/lib/supabase/server';
import type { ContentPillar, Collection } from '@/types/instagram';

// ============================================================================
// Types
// ============================================================================

export interface HashtagGeneratorOptions {
  collection: Collection;
  contentPillar: ContentPillar;
  excludeRecentPosts?: number; // Number of recent posts to exclude hashtags from
  userId?: string; // For user-specific banned hashtags
}

export interface HashtagResult {
  hashtags: string[];
  rotationSetId: string | null;
  rotationSetName: string | null;
  breakdown: {
    brand: string[];
    mega: string[];
    large: string[];
    niche: string[];
  };
}

// ============================================================================
// Configuration
// ============================================================================

const TARGET_HASHTAG_COUNT = { min: 17, max: 20 };
const DEFAULT_EXCLUDE_RECENT = 5;

// Mapping: content pillar → large tier group preference
const PILLAR_TO_LARGE_GROUP: Record<ContentPillar, string> = {
  educational: 'Large Mental Health',
  brand_story: 'Large Mental Health',
  product_showcase: 'Large Home & Art',
  community: 'Large Home & Art',
};

// Mapping: collection → niche tier group preference
const COLLECTION_TO_NICHE_GROUP: Record<Collection, string> = {
  grounding: 'Niche Therapeutic',
  wholeness: 'Niche Therapeutic',
  growth: 'Niche Decor',
  general: 'Niche Decor',
};

// ============================================================================
// Main Generator Function
// ============================================================================

/**
 * Generate hashtags based on content pillar and collection
 * Returns 17-20 hashtags with proper tier distribution
 */
export async function generateHashtags(
  options: HashtagGeneratorOptions
): Promise<HashtagResult> {
  const {
    collection,
    contentPillar,
    excludeRecentPosts = DEFAULT_EXCLUDE_RECENT,
    userId,
  } = options;

  const supabase = await createClient();

  // Get exclusions
  const [recentHashtags, bannedHashtags] = await Promise.all([
    getRecentPostHashtags(excludeRecentPosts, userId),
    getBannedHashtags(userId),
  ]);

  const exclusions = new Set([...recentHashtags, ...bannedHashtags]);

  // Get all hashtag groups
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: groups, error: groupsError } = await (supabase as any)
    .from('hashtag_groups')
    .select('*')
    .eq('is_active', true);

  if (groupsError || !groups) {
    throw new Error(`Failed to fetch hashtag groups: ${groupsError?.message}`);
  }

  // Type the groups array
  const typedGroups = groups as Array<{
    id: string;
    name: string;
    tier: string;
    hashtags: string[];
  }>;

  // Build hashtag selection by tier
  const breakdown: HashtagResult['breakdown'] = {
    brand: [],
    mega: [],
    large: [],
    niche: [],
  };

  // 1. Always include Brand tier (all tags)
  const brandGroup = typedGroups.find((g) => g.tier === 'brand');
  if (brandGroup) {
    breakdown.brand = filterExclusions(brandGroup.hashtags, exclusions);
  }

  // 2. Add Mega tier (4-5 random tags)
  const megaGroup = typedGroups.find((g) => g.tier === 'mega');
  if (megaGroup) {
    const available = filterExclusions(megaGroup.hashtags, exclusions);
    breakdown.mega = shuffleAndTake(available, randomBetween(4, 5));
  }

  // 3. Add Large tier based on content_pillar
  const preferredLargeGroup = PILLAR_TO_LARGE_GROUP[contentPillar];
  const largeGroup = typedGroups.find((g) => g.name === preferredLargeGroup);
  if (largeGroup) {
    const available = filterExclusions(largeGroup.hashtags, exclusions);
    breakdown.large = shuffleAndTake(available, randomBetween(4, 5));
  }

  // 4. Add Niche tier based on collection
  const preferredNicheGroup = COLLECTION_TO_NICHE_GROUP[collection];
  const nicheGroup = typedGroups.find((g) => g.name === preferredNicheGroup);
  if (nicheGroup) {
    const available = filterExclusions(nicheGroup.hashtags, exclusions);
    breakdown.niche = shuffleAndTake(available, randomBetween(5, 7));
  }

  // Combine all hashtags
  let allHashtags = [
    ...breakdown.brand,
    ...breakdown.mega,
    ...breakdown.large,
    ...breakdown.niche,
  ];

  // Ensure we have 17-20 hashtags
  if (allHashtags.length < TARGET_HASHTAG_COUNT.min) {
    // Try to add more from any available group
    const allAvailable = typedGroups
      .flatMap((g) => g.hashtags)
      .filter((h) => !exclusions.has(h) && !allHashtags.includes(h));

    const needed = TARGET_HASHTAG_COUNT.min - allHashtags.length;
    allHashtags = [...allHashtags, ...shuffleAndTake(allAvailable, needed)];
  } else if (allHashtags.length > TARGET_HASHTAG_COUNT.max) {
    // Trim from niche first, then large
    const excess = allHashtags.length - TARGET_HASHTAG_COUNT.max;
    breakdown.niche = breakdown.niche.slice(0, Math.max(0, breakdown.niche.length - excess));
    allHashtags = [
      ...breakdown.brand,
      ...breakdown.mega,
      ...breakdown.large,
      ...breakdown.niche,
    ];
  }

  // Find matching rotation set
  const rotationSet = await findMatchingRotationSet(contentPillar, collection);

  // Track rotation set usage if found
  if (rotationSet) {
    await incrementRotationSetUsage(rotationSet.id);
  }

  return {
    hashtags: allHashtags,
    rotationSetId: rotationSet?.id || null,
    rotationSetName: rotationSet?.name || null,
    breakdown,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get hashtags used in the last N posts
 */
export async function getRecentPostHashtags(
  count: number = DEFAULT_EXCLUDE_RECENT,
  userId?: string
): Promise<string[]> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('instagram_scheduled_posts')
    .select('hashtags')
    .not('hashtags', 'is', null)
    .order('created_at', { ascending: false })
    .limit(count);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error || !data) {
    console.error('Failed to fetch recent hashtags:', error);
    return [];
  }

  // Flatten all hashtags from recent posts
  const posts = data as Array<{ hashtags: string[] | null }>;
  return posts.flatMap((post) => post.hashtags || []);
}

/**
 * Get all banned hashtags (system + user-specific)
 */
export async function getBannedHashtags(userId?: string): Promise<string[]> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any).from('banned_hashtags').select('hashtag');

  if (userId) {
    query = query.or(`is_system.eq.true,user_id.eq.${userId}`);
  } else {
    query = query.eq('is_system', true);
  }

  const { data, error } = await query;

  if (error || !data) {
    console.error('Failed to fetch banned hashtags:', error);
    return [];
  }

  const banned = data as Array<{ hashtag: string }>;
  return banned.map((b) => b.hashtag);
}

/**
 * Find the recommended rotation set based on content pillar and collection
 */
async function findMatchingRotationSet(
  contentPillar: ContentPillar,
  collection: Collection
): Promise<{ id: string; name: string } | null> {
  const supabase = await createClient();

  // Use the database function
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('get_recommended_rotation_set', {
    p_content_pillar: contentPillar,
    p_collection: collection,
  });

  if (error || !data) {
    console.error('Failed to get recommended rotation set:', error);
    return null;
  }

  // Get the set details
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: setData, error: setError } = await (supabase as any)
    .from('hashtag_rotation_sets')
    .select('id, name')
    .eq('id', data)
    .single();

  if (setError || !setData) {
    return null;
  }

  return setData;
}

/**
 * Increment usage count for a rotation set
 */
export async function incrementRotationSetUsage(setId: string): Promise<void> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc('increment_rotation_set_usage', {
    p_set_id: setId,
  });

  if (error) {
    // Don't throw, just log - usage tracking is non-critical
    console.error('Failed to increment rotation set usage:', error);
  }
}

/**
 * Filter out excluded hashtags
 */
function filterExclusions(hashtags: string[], exclusions: Set<string>): string[] {
  return hashtags.filter((h) => !exclusions.has(h));
}

/**
 * Shuffle array and take first N elements
 */
function shuffleAndTake<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Random number between min and max (inclusive)
 */
function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ============================================================================
// Formatting Helpers
// ============================================================================

/**
 * Format hashtags as a single string for posting
 */
export function formatHashtagsForPost(hashtags: string[]): string {
  return hashtags.join(' ');
}

/**
 * Format hashtags for Instagram first comment
 * Adds line breaks for better readability
 */
export function formatHashtagsForComment(hashtags: string[]): string {
  // Add a dot on the first line to push hashtags below the fold
  return '.\n.\n.\n' + hashtags.join(' ');
}

/**
 * Validate a hashtag format
 */
export function isValidHashtag(hashtag: string): boolean {
  // Must start with # and contain only alphanumeric characters
  return /^#[a-zA-Z0-9_]+$/.test(hashtag);
}

/**
 * Normalize a hashtag (ensure it starts with #, lowercase)
 */
export function normalizeHashtag(hashtag: string): string {
  let normalized = hashtag.trim().toLowerCase();
  if (!normalized.startsWith('#')) {
    normalized = '#' + normalized;
  }
  return normalized;
}
