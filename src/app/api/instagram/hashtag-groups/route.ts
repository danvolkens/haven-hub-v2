import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface HashtagGroup {
  id: string;
  name: string;
  tier: string;
  hashtags: string[];
  estimated_reach: string | null;
  usage_count: number;
}

interface RotationSet {
  id: string;
  name: string;
  description: string | null;
  group_ids: string[];
  is_system: boolean;
  hashtags?: string[]; // Computed from groups
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const contentPillar = searchParams.get('content_pillar');
    const collection = searchParams.get('collection');

    // Get all hashtag groups (system + user's)
    const { data: groups, error: groupsError } = await (supabase as any)
      .from('hashtag_groups')
      .select('*')
      .eq('is_active', true)
      .or(`user_id.is.null,user_id.eq.${user.id}`)
      .order('tier', { ascending: true })
      .order('name', { ascending: true });

    if (groupsError) {
      console.error('Error fetching hashtag groups:', groupsError);
      return NextResponse.json({ error: 'Failed to fetch hashtag groups' }, { status: 500 });
    }

    // Get all rotation sets (system + user's)
    const { data: sets, error: setsError } = await (supabase as any)
      .from('hashtag_rotation_sets')
      .select('*')
      .eq('is_active', true)
      .or(`user_id.is.null,is_system.eq.true,user_id.eq.${user.id}`)
      .order('is_system', { ascending: false })
      .order('name', { ascending: true });

    if (setsError) {
      console.error('Error fetching rotation sets:', setsError);
      return NextResponse.json({ error: 'Failed to fetch rotation sets' }, { status: 500 });
    }

    // Build group lookup by ID
    const groupMap = new Map<string, string[]>();
    (groups || []).forEach((g: HashtagGroup) => {
      groupMap.set(g.id, g.hashtags || []);
    });

    // Group by tier for fallback composition
    const groupsByTier = new Map<string, HashtagGroup[]>();
    (groups || []).forEach((g: HashtagGroup) => {
      const tier = g.tier || 'niche';
      if (!groupsByTier.has(tier)) {
        groupsByTier.set(tier, []);
      }
      groupsByTier.get(tier)!.push(g);
    });

    // Define rotation set compositions by tier (fallback if group_ids don't resolve)
    // Each set uses: 1 brand + 1 mega + 1-2 large + 1-2 niche (select randomly from available)
    const rotationSetTierConfig: Record<string, { brand: number; mega: number; large: number; niche: number }> = {
      'therapeutic focus': { brand: 1, mega: 1, large: 1, niche: 2 },
      'home decor focus': { brand: 1, mega: 1, large: 2, niche: 1 },
      'balanced mix': { brand: 1, mega: 1, large: 1, niche: 1 },
    };

    // Expand rotation sets to include all hashtags
    const expandedSets = (sets || []).map((set: RotationSet) => {
      let allHashtags: string[] = [];

      // First try to resolve by stored group_ids
      (set.group_ids || []).forEach((groupId: string) => {
        const hashtags = groupMap.get(groupId);
        if (hashtags) {
          allHashtags.push(...hashtags);
        }
      });

      // If no hashtags found via group_ids, compose from available groups by tier
      if (allHashtags.length === 0) {
        const config = rotationSetTierConfig[set.name.toLowerCase()];
        if (config) {
          // Get groups from each tier (sorted by name for consistency)
          const getHashtagsFromTier = (tier: string, count: number): string[] => {
            const tierGroups = groupsByTier.get(tier) || [];
            const result: string[] = [];
            tierGroups.slice(0, count).forEach(g => {
              if (g.hashtags) {
                result.push(...g.hashtags);
              }
            });
            return result;
          };

          allHashtags.push(...getHashtagsFromTier('brand', config.brand));
          allHashtags.push(...getHashtagsFromTier('mega', config.mega));
          allHashtags.push(...getHashtagsFromTier('large', config.large));
          allHashtags.push(...getHashtagsFromTier('niche', config.niche));
        }
      }

      return {
        ...set,
        hashtags: allHashtags,
      };
    });

    // Get recommended set if content pillar provided
    let recommendedSetId: string | null = null;
    if (contentPillar) {
      // Use the logic from the DB function
      if (contentPillar === 'educational' || contentPillar === 'brand_story') {
        const therapeutic = expandedSets.find((s: RotationSet) => s.name === 'Therapeutic Focus');
        if (therapeutic) recommendedSetId = therapeutic.id;
      } else if (contentPillar === 'product_showcase' && (collection === 'grounding' || collection === 'wholeness')) {
        const balanced = expandedSets.find((s: RotationSet) => s.name === 'Balanced Mix');
        if (balanced) recommendedSetId = balanced.id;
      } else {
        const homeDecor = expandedSets.find((s: RotationSet) => s.name === 'Home Decor Focus');
        if (homeDecor) recommendedSetId = homeDecor.id;
      }
    }

    return NextResponse.json({
      groups: groups || [],
      rotation_sets: expandedSets,
      recommended_set_id: recommendedSetId,
    });
  } catch (error) {
    console.error('Error fetching hashtag groups:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
