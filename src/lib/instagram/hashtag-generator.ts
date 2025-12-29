/**
 * Instagram Hashtag Auto-Generation
 * Prompt 2.4: Tiered hashtag selection with rotation tracking
 */

import { createClient } from '@/lib/supabase/server';
import type { ContentPillar, Collection } from '@/types/instagram';

// ============================================================================
// Types
// ============================================================================

export type ContentType = 'product' | 'educational' | 'inspirational' | 'community' | 'general';

export interface HashtagGeneratorOptions {
  collection: Collection;
  contentPillar: ContentPillar;
  contentType?: ContentType; // B.1: Content-type for specific hashtag selection
  excludeRecentPosts?: number; // Number of recent posts to exclude hashtags from
  userId?: string; // For user-specific banned hashtags
}

export interface HashtagResult {
  hashtags: string[];
  rotationSetId: string | null;
  rotationSetName: string | null;
  breakdown: {
    brand: string[];
    contentType: string[]; // B.1: Content-type specific hashtags
    collection: string[]; // B.1: Collection-specific hashtags
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
 * Generate hashtags based on content pillar, collection, and content type
 * Returns 17-20 hashtags with proper tier distribution
 *
 * B.1 Enhancement: Layer composition
 * - Brand (2 hashtags)
 * - Content-Type specific (8-10 hashtags)
 * - Collection-specific (5-7 hashtags)
 */
export async function generateHashtags(
  options: HashtagGeneratorOptions
): Promise<HashtagResult> {
  const {
    collection,
    contentPillar,
    contentType,
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

  // Type the groups array with new fields
  const typedGroups = groups as Array<{
    id: string;
    name: string;
    tier: string;
    hashtags: string[];
    content_type: ContentType | null;
    collection_affinity: 'grounding' | 'wholeness' | 'growth' | 'any' | null;
  }>;

  // Build hashtag selection by category
  const breakdown: HashtagResult['breakdown'] = {
    brand: [],
    contentType: [],
    collection: [],
    mega: [],
    large: [],
    niche: [],
  };

  // 1. Brand tier (2 hashtags - always include)
  const brandGroup = typedGroups.find((g) => g.tier === 'brand');
  if (brandGroup) {
    breakdown.brand = filterExclusions(brandGroup.hashtags, exclusions).slice(0, 2);
  }

  // 2. Content-Type specific (8-10 hashtags) - B.1 Enhancement
  if (contentType) {
    const contentTypeGroup = typedGroups.find(
      (g) => g.content_type === contentType && g.collection_affinity === 'any'
    );
    if (contentTypeGroup) {
      const available = filterExclusions(contentTypeGroup.hashtags, exclusions);
      breakdown.contentType = shuffleAndTake(available, randomBetween(8, 10));
    }
  }

  // 3. Collection-specific (5-7 hashtags) - B.1 Enhancement
  if (collection && collection !== 'general') {
    const collectionGroup = typedGroups.find(
      (g) => g.collection_affinity === collection
    );
    if (collectionGroup) {
      const available = filterExclusions(collectionGroup.hashtags, exclusions);
      breakdown.collection = shuffleAndTake(available, randomBetween(5, 7));
    }
  }

  // Fallback: If no content-type hashtags, use legacy tier-based approach
  if (breakdown.contentType.length === 0) {
    // Add Mega tier (4-5 random tags)
    const megaGroup = typedGroups.find((g) => g.tier === 'mega');
    if (megaGroup) {
      const available = filterExclusions(megaGroup.hashtags, exclusions);
      breakdown.mega = shuffleAndTake(available, randomBetween(4, 5));
    }

    // Add Large tier based on content_pillar
    const preferredLargeGroup = PILLAR_TO_LARGE_GROUP[contentPillar];
    const largeGroup = typedGroups.find((g) => g.name === preferredLargeGroup);
    if (largeGroup) {
      const available = filterExclusions(largeGroup.hashtags, exclusions);
      breakdown.large = shuffleAndTake(available, randomBetween(4, 5));
    }
  }

  // Fallback: If no collection hashtags, use legacy niche approach
  if (breakdown.collection.length === 0) {
    const preferredNicheGroup = COLLECTION_TO_NICHE_GROUP[collection];
    const nicheGroup = typedGroups.find((g) => g.name === preferredNicheGroup);
    if (nicheGroup) {
      const available = filterExclusions(nicheGroup.hashtags, exclusions);
      breakdown.niche = shuffleAndTake(available, randomBetween(5, 7));
    }
  }

  // Combine all hashtags
  let allHashtags = [
    ...breakdown.brand,
    ...breakdown.contentType,
    ...breakdown.collection,
    ...breakdown.mega,
    ...breakdown.large,
    ...breakdown.niche,
  ];

  // Remove duplicates
  allHashtags = [...new Set(allHashtags)];

  // Ensure we have 17-20 hashtags
  if (allHashtags.length < TARGET_HASHTAG_COUNT.min) {
    // Try to add more from any available group
    const allAvailable = typedGroups
      .flatMap((g) => g.hashtags)
      .filter((h) => !exclusions.has(h) && !allHashtags.includes(h));

    const needed = TARGET_HASHTAG_COUNT.min - allHashtags.length;
    allHashtags = [...allHashtags, ...shuffleAndTake(allAvailable, needed)];
  } else if (allHashtags.length > TARGET_HASHTAG_COUNT.max) {
    // Trim to max, keeping brand and content-type priority
    allHashtags = allHashtags.slice(0, TARGET_HASHTAG_COUNT.max);
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
