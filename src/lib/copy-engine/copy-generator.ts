import { createServerSupabaseClient } from '@/lib/supabase/server';

interface CopyContext {
  quote?: string;
  collection?: string;
  mood?: string;
  roomType?: string;
  productLink?: string;
  shopName?: string;
}

interface GeneratedCopy {
  title: string;
  description: string;
  hooks: {
    opening?: string;
    closing?: string;
    cta?: string;
  };
  moodDescriptors: string[];
  roomContext?: string;
}

interface CollectionHook {
  id: string;
  collection: string;
  hook_type: 'opening' | 'closing' | 'cta';
  hook_text: string;
  times_used: number;
  avg_engagement_rate: number | null;
}

interface MoodDescriptor {
  mood: string;
  descriptors: string[];
}

interface RoomContext {
  room_type: string;
  context_phrases: string[];
}

/**
 * Get a random element from an array, optionally weighted by engagement
 */
function getWeightedRandom<T extends CollectionHook>(
  items: T[],
  useWeights: boolean = true
): T | undefined {
  if (!items || items.length === 0) return undefined;

  if (!useWeights) {
    return items[Math.floor(Math.random() * items.length)];
  }

  // Weight by engagement rate if available
  const totalWeight = items.reduce((sum, item) => {
    return sum + (item.avg_engagement_rate || 0.1); // Default weight for items without data
  }, 0);

  let random = Math.random() * totalWeight;
  for (const item of items) {
    random -= item.avg_engagement_rate || 0.1;
    if (random <= 0) return item;
  }

  return items[items.length - 1];
}

function getRandomElement<T>(arr: T[]): T | undefined {
  if (!arr || arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate enhanced pin copy using hooks, moods, and room contexts
 */
export async function generateEnhancedCopy(
  userId: string,
  context: CopyContext
): Promise<GeneratedCopy> {
  const supabase = await createServerSupabaseClient();
  const collection = context.collection || 'default';

  // Fetch hooks for this collection (with fallback to default)
  const { data: hooks } = await (supabase as any)
    .from('copy_collection_hooks')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .in('collection', [collection, 'default'])
    .order('avg_engagement_rate', { ascending: false, nullsFirst: false });

  // Fetch mood descriptors if mood is provided
  let moodDescriptors: string[] = [];
  if (context.mood) {
    const { data: moods } = await (supabase as any)
      .from('copy_mood_descriptors')
      .select('*')
      .eq('user_id', userId)
      .eq('mood', context.mood)
      .eq('is_active', true)
      .single();

    if (moods?.descriptors) {
      moodDescriptors = moods.descriptors;
    }
  }

  // Fetch room context if room type is provided
  let roomContext: string | undefined;
  if (context.roomType) {
    const { data: room } = await (supabase as any)
      .from('copy_room_contexts')
      .select('*')
      .eq('user_id', userId)
      .eq('room_type', context.roomType)
      .eq('is_active', true)
      .single();

    if (room?.context_phrases) {
      roomContext = getRandomElement(room.context_phrases);
    }
  }

  // Get hooks by type, preferring collection-specific over default
  const collectionHooks = (hooks || []).filter(
    (h: CollectionHook) => h.collection === collection
  );
  const defaultHooks = (hooks || []).filter(
    (h: CollectionHook) => h.collection === 'default'
  );

  const getHookByType = (type: 'opening' | 'closing' | 'cta'): string | undefined => {
    const collectionSpecific = collectionHooks.filter(
      (h: CollectionHook) => h.hook_type === type
    );
    if (collectionSpecific.length > 0) {
      return getWeightedRandom(collectionSpecific)?.hook_text;
    }
    const defaults = defaultHooks.filter((h: CollectionHook) => h.hook_type === type);
    return getWeightedRandom(defaults)?.hook_text;
  };

  const openingHook = getHookByType('opening');
  const closingHook = getHookByType('closing');
  const ctaHook = getHookByType('cta');

  // Generate title with opening hook
  let title = '';
  if (openingHook && context.quote) {
    // Use opening hook + mood descriptor if available
    const moodDescriptor = moodDescriptors.length > 0
      ? getRandomElement(moodDescriptors)
      : '';

    if (moodDescriptor) {
      title = `${openingHook} this ${moodDescriptor} reminder`;
    } else {
      title = `${openingHook} "${context.quote.substring(0, 60)}${context.quote.length > 60 ? '...' : ''}"`;
    }
  } else if (context.quote) {
    title = context.quote.substring(0, 100);
  } else {
    title = `Inspiring Wall Art | ${context.shopName || 'Haven & Hold'}`;
  }

  // Generate description with room context and closing hook
  const descriptionParts: string[] = [];

  if (context.quote) {
    descriptionParts.push(`"${context.quote}"`);
  }

  if (roomContext) {
    descriptionParts.push(roomContext + '.');
  }

  if (closingHook) {
    descriptionParts.push(closingHook + '.');
  }

  if (ctaHook) {
    descriptionParts.push(ctaHook + '!');
  }

  // Add shop name if provided
  if (context.shopName) {
    descriptionParts.push(`Shop ${context.shopName}`);
  }

  const description = descriptionParts.join(' ');

  return {
    title,
    description,
    hooks: {
      opening: openingHook,
      closing: closingHook,
      cta: ctaHook,
    },
    moodDescriptors,
    roomContext,
  };
}

/**
 * Get all hooks for a user, optionally filtered by collection
 */
export async function getCollectionHooks(
  userId: string,
  collection?: string
): Promise<CollectionHook[]> {
  const supabase = await createServerSupabaseClient();

  let query = (supabase as any)
    .from('copy_collection_hooks')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('collection')
    .order('hook_type');

  if (collection) {
    query = query.eq('collection', collection);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching hooks:', error);
    return [];
  }

  return data || [];
}

/**
 * Create or update a collection hook
 */
export async function upsertCollectionHook(
  userId: string,
  hook: {
    id?: string;
    collection: string;
    hookType: 'opening' | 'closing' | 'cta';
    hookText: string;
  }
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createServerSupabaseClient();

  if (hook.id) {
    // Update existing
    const { error } = await (supabase as any)
      .from('copy_collection_hooks')
      .update({
        collection: hook.collection,
        hook_type: hook.hookType,
        hook_text: hook.hookText,
      })
      .eq('id', hook.id)
      .eq('user_id', userId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, id: hook.id };
  } else {
    // Insert new
    const { data, error } = await (supabase as any)
      .from('copy_collection_hooks')
      .insert({
        user_id: userId,
        collection: hook.collection,
        hook_type: hook.hookType,
        hook_text: hook.hookText,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, id: data.id };
  }
}

/**
 * Delete a collection hook
 */
export async function deleteCollectionHook(
  userId: string,
  hookId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const { error } = await (supabase as any)
    .from('copy_collection_hooks')
    .delete()
    .eq('id', hookId)
    .eq('user_id', userId);

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

/**
 * Get mood descriptors for a user
 */
export async function getMoodDescriptors(userId: string): Promise<MoodDescriptor[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await (supabase as any)
    .from('copy_mood_descriptors')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('mood');

  if (error) {
    console.error('Error fetching mood descriptors:', error);
    return [];
  }

  return data || [];
}

/**
 * Get room contexts for a user
 */
export async function getRoomContexts(userId: string): Promise<RoomContext[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await (supabase as any)
    .from('copy_room_contexts')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('room_type');

  if (error) {
    console.error('Error fetching room contexts:', error);
    return [];
  }

  return data || [];
}

/**
 * Update hook usage stats after a pin is published
 */
export async function updateHookUsage(
  userId: string,
  hookId: string,
  saves: number = 0,
  engagementRate: number = 0
): Promise<void> {
  const supabase = await createServerSupabaseClient();

  // Get current stats
  const { data: hook } = await (supabase as any)
    .from('copy_collection_hooks')
    .select('times_used, total_saves, avg_engagement_rate')
    .eq('id', hookId)
    .single();

  if (!hook) return;

  const newTimesUsed = (hook.times_used || 0) + 1;
  const newTotalSaves = (hook.total_saves || 0) + saves;

  // Calculate running average engagement rate
  const oldAvg = hook.avg_engagement_rate || 0;
  const newAvg = oldAvg === 0
    ? engagementRate
    : (oldAvg * hook.times_used + engagementRate) / newTimesUsed;

  await (supabase as any)
    .from('copy_collection_hooks')
    .update({
      times_used: newTimesUsed,
      total_saves: newTotalSaves,
      avg_engagement_rate: newAvg,
    })
    .eq('id', hookId);
}

/**
 * Generate multiple copy variations for A/B testing
 */
export async function generateCopyVariations(
  userId: string,
  context: CopyContext,
  count: number = 3
): Promise<GeneratedCopy[]> {
  const variations: GeneratedCopy[] = [];

  for (let i = 0; i < count; i++) {
    const copy = await generateEnhancedCopy(userId, context);
    variations.push(copy);
  }

  return variations;
}
