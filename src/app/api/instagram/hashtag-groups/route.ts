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

    // Build group lookup by ID and by name
    const groupMapById = new Map<string, string[]>();
    const groupMapByName = new Map<string, string[]>();
    (groups || []).forEach((g: HashtagGroup) => {
      groupMapById.set(g.id, g.hashtags || []);
      groupMapByName.set(g.name, g.hashtags || []);
    });

    // Define which groups belong to each rotation set BY NAME
    // This is more reliable than stored group_ids which can become stale
    const rotationSetGroups: Record<string, string[]> = {
      'Therapeutic Focus': [
        'Brand Core',
        'Mega Lifestyle',
        'Large Mental Health',
        'Niche Therapy',
        'Niche Sanctuary',
      ],
      'Home Decor Focus': [
        'Brand Core',
        'Mega Home',
        'Large Wall Art',
        'Large Minimalist',
        'Niche Bedroom',
        'Niche Office',
      ],
      'Balanced Mix': [
        'Brand Core',
        'Mega Home',
        'Large Quotes',
        'Niche Quote Art',
        'Community Posts - Core',
      ],
    };

    // Expand rotation sets to include all hashtags
    const expandedSets = (sets || []).map((set: RotationSet) => {
      let allHashtags: string[] = [];

      // Use explicit group names for system sets
      const groupNames = rotationSetGroups[set.name];
      if (groupNames) {
        groupNames.forEach(name => {
          const hashtags = groupMapByName.get(name);
          if (hashtags) {
            allHashtags.push(...hashtags);
          }
        });
      }

      // Fall back to stored group_ids for custom sets
      if (allHashtags.length === 0) {
        (set.group_ids || []).forEach((groupId: string) => {
          const hashtags = groupMapById.get(groupId);
          if (hashtags) {
            allHashtags.push(...hashtags);
          }
        });
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
