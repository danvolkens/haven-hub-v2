/**
 * Story Highlights Service
 * Prompt G.1: Manage story highlights with auto-add rules
 *
 * Default highlights from Instagram Guide:
 * - Quiz: Quiz CTA stories
 * - Shop: Product features
 * - How To: Styling tips
 * - Reviews: Customer testimonials
 * - About: Brand story
 * - New: Latest arrivals
 */

import { createClient } from '@/lib/supabase/server';

// ============================================================================
// Types
// ============================================================================

export type RuleType = 'hashtag' | 'text_contains' | 'product_tag' | 'template' | 'ugc';

export interface AutoAddRule {
  type: RuleType;
  value: string | boolean;
}

export interface StoryHighlight {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_asset_id: string | null;
  cover_url: string | null;
  display_order: number;
  auto_add_enabled: boolean;
  auto_add_rules: AutoAddRule[];
  max_stories: number;
  expiration_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Computed
  story_count?: number;
}

export interface HighlightStory {
  id: string;
  highlight_id: string;
  story_post_id: string;
  display_order: number;
  added_reason: string | null;
  added_rule_match: AutoAddRule | null;
  expires_at: string | null;
  added_at: string;
  // Joined data
  caption?: string;
  thumbnail_url?: string;
}

export interface HighlightTemplate {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  default_rules: AutoAddRule[];
  suggested_cover: string | null;
  display_order: number;
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Get all highlights for the current user
 */
export async function getHighlights(): Promise<StoryHighlight[]> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('story_highlights')
    .select(`
      *,
      highlight_stories (id)
    `)
    .order('display_order');

  if (error) {
    console.error('Failed to get highlights:', error);
    return [];
  }

  // Add story count
  return (data || []).map((h: StoryHighlight & { highlight_stories: { id: string }[] }) => ({
    ...h,
    story_count: h.highlight_stories?.length || 0,
    highlight_stories: undefined, // Remove nested data
  }));
}

/**
 * Get a single highlight with its stories
 */
export async function getHighlightWithStories(
  highlightId: string
): Promise<{ highlight: StoryHighlight; stories: HighlightStory[] } | null> {
  const supabase = await createClient();

  // Get highlight
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: highlight, error: hError } = await (supabase as any)
    .from('story_highlights')
    .select('*')
    .eq('id', highlightId)
    .single();

  if (hError || !highlight) {
    console.error('Failed to get highlight:', hError);
    return null;
  }

  // Get stories with post details
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: stories, error: sError } = await (supabase as any)
    .from('highlight_stories')
    .select(`
      *,
      instagram_scheduled_posts (
        caption,
        thumbnail_asset_id
      )
    `)
    .eq('highlight_id', highlightId)
    .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
    .order('display_order');

  if (sError) {
    console.error('Failed to get highlight stories:', sError);
    return { highlight, stories: [] };
  }

  // Flatten joined data
  const formattedStories = (stories || []).map((s: {
    instagram_scheduled_posts?: { caption: string; thumbnail_asset_id: string };
    [key: string]: unknown;
  }) => ({
    ...s,
    caption: s.instagram_scheduled_posts?.caption,
    thumbnail_url: null, // Would need to fetch from assets
  }));

  return {
    highlight: highlight as StoryHighlight,
    stories: formattedStories as HighlightStory[],
  };
}

/**
 * Initialize highlights for a user from templates
 */
export async function initializeUserHighlights(): Promise<boolean> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc('initialize_user_highlights', {
    p_user_id: user.id,
  });

  if (error) {
    console.error('Failed to initialize highlights:', error);
    return false;
  }

  return true;
}

/**
 * Create a new highlight
 */
export async function createHighlight(
  name: string,
  slug: string,
  options?: {
    description?: string;
    auto_add_rules?: AutoAddRule[];
    max_stories?: number;
    expiration_days?: number;
  }
): Promise<StoryHighlight | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('story_highlights')
    .insert({
      user_id: user.id,
      name,
      slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      description: options?.description,
      auto_add_rules: options?.auto_add_rules || [],
      max_stories: options?.max_stories || 20,
      expiration_days: options?.expiration_days || 90,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create highlight:', error);
    return null;
  }

  return data as StoryHighlight;
}

/**
 * Update a highlight
 */
export async function updateHighlight(
  highlightId: string,
  updates: Partial<
    Pick<
      StoryHighlight,
      | 'name'
      | 'description'
      | 'cover_url'
      | 'auto_add_enabled'
      | 'auto_add_rules'
      | 'max_stories'
      | 'expiration_days'
      | 'is_active'
      | 'display_order'
    >
  >
): Promise<boolean> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('story_highlights')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', highlightId);

  return !error;
}

/**
 * Delete a highlight
 */
export async function deleteHighlight(highlightId: string): Promise<boolean> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('story_highlights')
    .delete()
    .eq('id', highlightId);

  return !error;
}

/**
 * Add a story to a highlight manually
 */
export async function addStoryToHighlight(
  highlightId: string,
  storyPostId: string
): Promise<boolean> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  // Get highlight for expiration calculation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: highlight } = await (supabase as any)
    .from('story_highlights')
    .select('expiration_days')
    .eq('id', highlightId)
    .single();

  const expiresAt =
    highlight?.expiration_days > 0
      ? new Date(Date.now() + highlight.expiration_days * 24 * 60 * 60 * 1000).toISOString()
      : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('highlight_stories')
    .insert({
      user_id: user.id,
      highlight_id: highlightId,
      story_post_id: storyPostId,
      added_reason: 'manual',
      expires_at: expiresAt,
    });

  return !error;
}

/**
 * Remove a story from a highlight
 */
export async function removeStoryFromHighlight(
  highlightId: string,
  storyPostId: string
): Promise<boolean> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('highlight_stories')
    .delete()
    .eq('highlight_id', highlightId)
    .eq('story_post_id', storyPostId);

  return !error;
}

/**
 * Reorder stories within a highlight
 */
export async function reorderHighlightStories(
  highlightId: string,
  orderedIds: string[]
): Promise<boolean> {
  const supabase = await createClient();

  // Update each story's display_order
  for (let i = 0; i < orderedIds.length; i++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('highlight_stories')
      .update({ display_order: i })
      .eq('id', orderedIds[i])
      .eq('highlight_id', highlightId);
  }

  return true;
}

/**
 * Clean up expired stories from all highlights
 */
export async function cleanExpiredStories(): Promise<number> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any).rpc('clean_expired_highlight_stories');

  return data || 0;
}

/**
 * Get highlight templates (defaults)
 */
export async function getHighlightTemplates(): Promise<HighlightTemplate[]> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('highlight_templates')
    .select('*')
    .eq('is_active', true)
    .order('display_order');

  if (error) {
    console.error('Failed to get highlight templates:', error);
    return [];
  }

  return data as HighlightTemplate[];
}

/**
 * Get stories eligible for a highlight (not yet added)
 */
export async function getEligibleStories(
  highlightId: string,
  limit: number = 20
): Promise<
  {
    id: string;
    caption: string;
    scheduled_at: string;
    thumbnail_url: string | null;
  }[]
> {
  const supabase = await createClient();

  // Get stories not yet in this highlight
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('instagram_scheduled_posts')
    .select('id, caption, scheduled_at')
    .eq('post_type', 'story')
    .eq('status', 'published')
    .not(
      'id',
      'in',
      // Subquery for already-added stories
      `(SELECT story_post_id FROM highlight_stories WHERE highlight_id = '${highlightId}')`
    )
    .order('scheduled_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to get eligible stories:', error);
    return [];
  }

  return (data || []).map((s: { id: string; caption: string; scheduled_at: string }) => ({
    ...s,
    thumbnail_url: null, // Would need to fetch from assets
  }));
}
