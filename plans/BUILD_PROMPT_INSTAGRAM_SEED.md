# Build Prompt: Instagram Templates & Hashtags Seed

## Context

Haven Hub's Instagram automation requires seed data for:
1. **Caption Templates** — 17+ templates organized by content pillar and collection
2. **Hashtag Groups** — Tiered hashtag system (brand/mega/large/niche)

Without this data:
- Calendar generator can't apply templates
- Hashtag generator returns nothing
- Post creation has no template options

## Task

Create a seed API route and UI button to populate Instagram templates and hashtag groups with Haven & Hold branded content.

## Files to Create/Modify

### 1. Create Seed API Route

**Create:** `/src/app/api/instagram/seed/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Haven & Hold Instagram Caption Templates
const CAPTION_TEMPLATES = [
  // PRODUCT SHOWCASE - Grounding
  {
    name: 'Grounding Quote Showcase',
    template_type: 'feed',
    content_pillar: 'product_showcase',
    collection: 'grounding',
    caption_formula: 'single_quote',
    caption_template: `"{{quote_text}}"

For the days when everything feels unsteady.

The Grounding Collection is for those moments when you need permission to stand still. To find solid ground. To simply be held exactly where you are.

{{product_link}}

#havenandhold #groundingcollection #quietanchors`,
    preferred_days: [1, 3, 5], // Mon, Wed, Fri
  },
  // PRODUCT SHOWCASE - Wholeness
  {
    name: 'Wholeness Quote Showcase',
    template_type: 'feed',
    content_pillar: 'product_showcase',
    collection: 'wholeness',
    caption_formula: 'single_quote',
    caption_template: `"{{quote_text}}"

All of you belongs here.

The Wholeness Collection speaks to the part of you that's learning to hold space for every version of yourself—the messy, the beautiful, the becoming.

{{product_link}}

#havenandhold #wholenesscollection #selfcompassion`,
    preferred_days: [1, 3, 5],
  },
  // PRODUCT SHOWCASE - Growth
  {
    name: 'Growth Quote Showcase',
    template_type: 'feed',
    content_pillar: 'product_showcase',
    collection: 'growth',
    caption_formula: 'single_quote',
    caption_template: `"{{quote_text}}"

Still becoming. And that's enough.

The Growth Collection honors where you've been while reaching toward who you're becoming. For the unfolding.

{{product_link}}

#havenandhold #growthcollection #stillbecoming`,
    preferred_days: [1, 3, 5],
  },
  // BRAND STORY
  {
    name: 'Origin Story',
    template_type: 'feed',
    content_pillar: 'brand_story',
    collection: 'general',
    caption_formula: 'behind_quote',
    caption_template: `A few years ago, I sat in my therapist's office staring at a quote on her wall.

Something about those words in that space—a space that had witnessed so many hard moments—changed how I thought about what we put on our walls.

When I went looking for something similar for my own home, everything was either too clinical, too cliché, or too aggressive.

Where were the words for when you just needed permission to be held?

So I created Haven & Hold.

Not motivation. Not inspiration. Just holding.

For the spaces that witness your becoming.

#havenandhold #brandstory #quietanchors`,
    preferred_days: [2, 4], // Tue, Thu
  },
  // BRAND STORY - Why This Quote
  {
    name: 'Why This Quote',
    template_type: 'feed',
    content_pillar: 'brand_story',
    collection: 'general',
    caption_formula: 'behind_quote',
    caption_template: `Why "{{quote_text}}"?

{{quote_story}}

Some words just know where to land.

This one found its way into the {{collection_name}} Collection because {{collection_reason}}.

Link in bio to bring it home.

#havenandhold #{{collection_tag}} #wordsforwalls`,
    preferred_days: [2, 4],
  },
  // EDUCATIONAL - How to Print
  {
    name: 'How to Print Guide',
    template_type: 'carousel',
    content_pillar: 'educational',
    collection: 'general',
    caption_formula: 'educational_value',
    caption_template: `How to print your digital downloads (the right way) 🖼️

Swipe for the complete guide →

The short version:
1. Download your files (16 sizes included)
2. Skip your home printer
3. Go to Staples, FedEx, or a local print shop
4. Ask for matte cardstock
5. Frame it (IKEA RIBBA frames work beautifully)

Total cost: Under $15 for gallery-quality results.

Save this for later 📌

#havenandhold #digitaldownloads #printathome #howtoprintwallart`,
    preferred_days: [3], // Wed
  },
  // EDUCATIONAL - Styling Tips
  {
    name: 'Styling Tips',
    template_type: 'carousel',
    content_pillar: 'educational',
    collection: 'general',
    caption_formula: 'educational_value',
    caption_template: `3 ways to style quote prints in your space ✨

Swipe for styling inspiration →

Whether you're creating a gallery wall, a bedside moment, or a therapy office corner—placement matters.

Which style speaks to you? Drop a 1, 2, or 3 below 👇

#havenandhold #homestyling #gallerywall #quoteart #interiorinspo`,
    preferred_days: [3],
  },
  // COMMUNITY - Customer Feature
  {
    name: 'Customer Feature',
    template_type: 'feed',
    content_pillar: 'community',
    collection: 'general',
    caption_formula: 'ugc_feature',
    caption_template: `In {{customer_first_name}}'s {{room_type}} 🏠

"{{customer_quote}}"

Thank you for sharing your sanctuary with us. These spaces—your spaces—are why we do this.

Want to be featured? Tag us or DM your photos 📸

#havenandhold #customerspotlight #realhomes #sanctuaryspaces`,
    preferred_days: [6, 0], // Sat, Sun
  },
  // COMMUNITY - Therapist Office
  {
    name: 'Therapist Office Feature',
    template_type: 'feed',
    content_pillar: 'community',
    collection: 'general',
    caption_formula: 'ugc_feature',
    caption_template: `Spotted in a therapist's office 💚

"{{therapist_quote}}"

We're honored when mental health professionals choose our words for their spaces. These rooms hold so much.

Are you a therapist? DM us about our office collection.

#havenandhold #therapistoffice #mentalhealthprofessionals #therapyroom`,
    preferred_days: [4], // Thu
  },
  // REEL - Quote Reveal
  {
    name: 'Quote Reveal Reel',
    template_type: 'reel',
    content_pillar: 'product_showcase',
    collection: 'general',
    caption_formula: 'single_quote',
    caption_template: `"{{quote_text}}"

{{hook_text}}

This one's from The {{collection_name}} Collection.

Link in bio to make it yours ✨

#havenandhold #quoteart #minimalistdecor #wallart #homedecor #{{collection_tag}}`,
    preferred_days: [1, 2, 3, 4, 5],
  },
  // REEL - Transformation
  {
    name: 'Room Transformation Reel',
    template_type: 'reel',
    content_pillar: 'product_showcase',
    collection: 'general',
    caption_formula: 'lifestyle',
    caption_template: `Before → After ✨

Sometimes one print changes everything.

This is "{{quote_text}}" from The {{collection_name}} Collection.

What wall in your home needs words?

#havenandhold #roomtransformation #beforeandafter #homedecor #wallart`,
    preferred_days: [2, 4],
  },
  // REEL - POV
  {
    name: 'POV Reel',
    template_type: 'reel',
    content_pillar: 'brand_story',
    collection: 'general',
    caption_formula: 'behind_quote',
    caption_template: `POV: {{pov_scenario}}

"{{quote_text}}"

Some walls need words. Not loud ones. Just quiet reminders.

#havenandhold #povtiktok #quietanchors #mentalhealthawareness`,
    preferred_days: [1, 3, 5],
  },
  // STORY - Daily Quote
  {
    name: 'Daily Quote Story',
    template_type: 'story',
    content_pillar: 'brand_story',
    collection: 'general',
    caption_formula: 'single_quote',
    caption_template: `"{{quote_text}}"

Tap to shop ↑`,
    preferred_days: [0, 1, 2, 3, 4, 5, 6],
  },
  // STORY - Poll
  {
    name: 'Collection Poll Story',
    template_type: 'story',
    content_pillar: 'community',
    collection: 'general',
    caption_formula: 'single_quote',
    caption_template: `Which collection speaks to you today?

🔺 Grounding
⭕ Wholeness  
🌱 Growth`,
    preferred_days: [1, 3, 5],
  },
  // STORY - Quiz CTA
  {
    name: 'Quiz CTA Story',
    template_type: 'story',
    content_pillar: 'community',
    collection: 'general',
    caption_formula: 'single_quote',
    caption_template: `Not sure which collection is right for you?

Take our 2-minute Sanctuary Quiz ↑

+ Get 15% off your result`,
    preferred_days: [2, 4, 6],
  },
  // CAROUSEL - Collection Overview
  {
    name: 'Collection Overview Carousel',
    template_type: 'carousel',
    content_pillar: 'educational',
    collection: 'general',
    caption_formula: 'educational_value',
    caption_template: `The three collections of Haven & Hold ✨

Swipe to find yours →

🔺 THE GROUNDING COLLECTION
For when you need stability, safety, an anchor.

⭕ THE WHOLENESS COLLECTION
For when you need self-compassion and acceptance.

🌱 THE GROWTH COLLECTION
For when you're ready to transform and become.

Which one called to you? Comment below 👇

Or take our quiz (link in bio) to find your perfect match.

#havenandhold #quotecollections #sanctuaryspaces #mentalhealthdecor`,
    preferred_days: [1],
  },
  // GENERAL - New Arrival
  {
    name: 'New Arrival',
    template_type: 'feed',
    content_pillar: 'product_showcase',
    collection: 'general',
    caption_formula: 'single_quote',
    caption_template: `New in the shop ✨

"{{quote_text}}"

This one's been in the works for a while. It finally felt ready.

Part of The {{collection_name}} Collection.

Link in bio to bring it home.

#havenandhold #newarrival #quoteart #{{collection_tag}}`,
    preferred_days: [1],
  },
];

// Haven & Hold Hashtag Groups
const HASHTAG_GROUPS = [
  // BRAND TIER
  {
    name: 'Brand Core',
    tier: 'brand',
    estimated_reach: 'brand',
    hashtags: ['havenandhold', 'quietanchors', 'sanctuaryspaces', 'wordsforwalls'],
    collection: 'general',
  },
  {
    name: 'Brand Grounding',
    tier: 'brand',
    estimated_reach: 'brand',
    hashtags: ['groundingcollection', 'heldhere', 'safeharbor'],
    collection: 'grounding',
  },
  {
    name: 'Brand Wholeness',
    tier: 'brand',
    estimated_reach: 'brand',
    hashtags: ['wholenesscollection', 'heldwholly', 'allyoubelongs'],
    collection: 'wholeness',
  },
  {
    name: 'Brand Growth',
    tier: 'brand',
    estimated_reach: 'brand',
    hashtags: ['growthcollection', 'stillbecoming', 'bravespace'],
    collection: 'growth',
  },
  // MEGA TIER (1B+ posts)
  {
    name: 'Mega Home',
    tier: 'mega',
    estimated_reach: '1B+',
    hashtags: ['homedecor', 'home', 'interiordesign', 'decor', 'homedesign'],
    collection: 'general',
  },
  {
    name: 'Mega Lifestyle',
    tier: 'mega',
    estimated_reach: '1B+',
    hashtags: ['lifestyle', 'inspiration', 'love', 'instagood', 'beautiful'],
    collection: 'general',
  },
  // LARGE TIER (10M-100M posts)
  {
    name: 'Large Wall Art',
    tier: 'large',
    estimated_reach: '10M-100M',
    hashtags: ['wallart', 'walldecor', 'homedecoration', 'homeinterior', 'interiorinspiration'],
    collection: 'general',
  },
  {
    name: 'Large Quotes',
    tier: 'large',
    estimated_reach: '10M-100M',
    hashtags: ['quotes', 'quotestoliveby', 'quotesdaily', 'wordsofwisdom', 'quoteoftheday'],
    collection: 'general',
  },
  {
    name: 'Large Minimalist',
    tier: 'large',
    estimated_reach: '10M-100M',
    hashtags: ['minimalist', 'minimalism', 'minimalistdesign', 'minimalstyle', 'simpleliving'],
    collection: 'general',
  },
  {
    name: 'Large Mental Health',
    tier: 'large',
    estimated_reach: '10M-100M',
    hashtags: ['mentalhealth', 'mentalhealthawareness', 'selfcare', 'selflove', 'healing'],
    collection: 'general',
  },
  // NICHE TIER (<10M posts)
  {
    name: 'Niche Quote Art',
    tier: 'niche',
    estimated_reach: '<10M',
    hashtags: ['quoteart', 'quoteprints', 'printableart', 'digitaldownload', 'instantdownload'],
    collection: 'general',
  },
  {
    name: 'Niche Therapy',
    tier: 'niche',
    estimated_reach: '<10M',
    hashtags: ['therapyoffice', 'therapistsofinstagram', 'mentalhealthprofessional', 'counselorlife', 'therapyroom'],
    collection: 'general',
  },
  {
    name: 'Niche Sanctuary',
    tier: 'niche',
    estimated_reach: '<10M',
    hashtags: ['sanctuaryathome', 'peacefulhome', 'calmspace', 'intentionalliving', 'slowliving'],
    collection: 'general',
  },
  {
    name: 'Niche Bedroom',
    tier: 'niche',
    estimated_reach: '<10M',
    hashtags: ['bedroomdecor', 'bedroominspo', 'cozybedroom', 'bedroommakeover', 'bedroomgoals'],
    collection: 'general',
  },
  {
    name: 'Niche Office',
    tier: 'niche',
    estimated_reach: '<10M',
    hashtags: ['homeoffice', 'officedecor', 'workfromhome', 'desksetup', 'officeinspo'],
    collection: 'general',
  },
];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = {
      templates: { created: 0, skipped: 0, errors: [] as string[] },
      hashtags: { created: 0, skipped: 0, errors: [] as string[] },
    };

    // Seed Caption Templates
    for (const template of CAPTION_TEMPLATES) {
      // Check if exists
      const { data: existing } = await supabase
        .from('instagram_templates')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', template.name)
        .single();

      if (existing) {
        results.templates.skipped++;
        continue;
      }

      const { error } = await supabase
        .from('instagram_templates')
        .insert({
          user_id: user.id,
          ...template,
          is_active: true,
        });

      if (error) {
        results.templates.errors.push(`${template.name}: ${error.message}`);
      } else {
        results.templates.created++;
      }
    }

    // Seed Hashtag Groups
    for (const group of HASHTAG_GROUPS) {
      // Check if exists
      const { data: existing } = await supabase
        .from('hashtag_groups')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', group.name)
        .single();

      if (existing) {
        results.hashtags.skipped++;
        continue;
      }

      const { error } = await supabase
        .from('hashtag_groups')
        .insert({
          user_id: user.id,
          ...group,
          is_active: true,
        });

      if (error) {
        results.hashtags.errors.push(`${group.name}: ${error.message}`);
      } else {
        results.hashtags.created++;
      }
    }

    return NextResponse.json({
      message: `Seeded ${results.templates.created} templates and ${results.hashtags.created} hashtag groups`,
      results,
    });
  } catch (error) {
    console.error('Error seeding Instagram data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - Check seed status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { count: templateCount } = await supabase
      .from('instagram_templates')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const { count: hashtagCount } = await supabase
      .from('hashtag_groups')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    return NextResponse.json({
      templates: {
        existing: templateCount || 0,
        expected: CAPTION_TEMPLATES.length,
      },
      hashtags: {
        existing: hashtagCount || 0,
        expected: HASHTAG_GROUPS.length,
      },
      is_complete: (templateCount || 0) >= CAPTION_TEMPLATES.length && 
                   (hashtagCount || 0) >= HASHTAG_GROUPS.length,
    });
  } catch (error) {
    console.error('Error checking Instagram seed status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 2. Add Seed Button to Instagram Settings

**Modify:** `/src/app/(dashboard)/dashboard/settings/instagram/page.tsx`

Add after existing content or create new section:

```tsx
// Add to imports
import { Zap, CheckCircle, RefreshCw, Hash, FileText } from 'lucide-react';

// Add query for seed status
const { data: seedStatus, isLoading: seedLoading, refetch: refetchSeed } = useQuery({
  queryKey: ['instagram-seed-status'],
  queryFn: () => api.get<{
    templates: { existing: number; expected: number };
    hashtags: { existing: number; expected: number };
    is_complete: boolean;
  }>('/api/instagram/seed'),
});

// Add mutation
const seedMutation = useMutation({
  mutationFn: () => api.post('/api/instagram/seed', {}),
  onSuccess: (data) => {
    toast({
      title: 'Content Seeded',
      description: data.message || 'Instagram templates and hashtags seeded successfully.',
      variant: 'success',
    });
    refetchSeed();
  },
  onError: (error: any) => {
    toast({
      title: 'Seed Failed',
      description: error.message || 'Failed to seed Instagram content.',
      variant: 'destructive',
    });
  },
});

// Add UI section
<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center',
          seedStatus?.is_complete 
            ? 'bg-green-100 text-green-600' 
            : 'bg-yellow-100 text-yellow-600'
        )}>
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold">Caption Templates & Hashtags</h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Pre-built Haven & Hold content for Instagram
          </p>
        </div>
      </div>
      {seedStatus?.is_complete && (
        <Badge className="bg-green-100 text-green-700">
          <CheckCircle className="h-3 w-3 mr-1" />
          Ready
        </Badge>
      )}
    </div>
  </CardHeader>
  <CardContent>
    {seedLoading ? (
      <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Checking status...
      </div>
    ) : (
      <>
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Caption Templates
            </span>
            <span className={cn(
              seedStatus?.templates?.existing >= seedStatus?.templates?.expected
                ? 'text-green-600'
                : 'text-yellow-600'
            )}>
              {seedStatus?.templates?.existing || 0} / {seedStatus?.templates?.expected || 0}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Hashtag Groups
            </span>
            <span className={cn(
              seedStatus?.hashtags?.existing >= seedStatus?.hashtags?.expected
                ? 'text-green-600'
                : 'text-yellow-600'
            )}>
              {seedStatus?.hashtags?.existing || 0} / {seedStatus?.hashtags?.expected || 0}
            </span>
          </div>
        </div>

        {!seedStatus?.is_complete && (
          <Button
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            className="w-full"
          >
            {seedMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Seeding Content...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Seed Templates & Hashtags
              </>
            )}
          </Button>
        )}

        {seedStatus?.is_complete && (
          <p className="text-sm text-green-600 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            All Instagram content templates are ready
          </p>
        )}

        <div className="mt-4 p-3 bg-[var(--color-bg-secondary)] rounded-lg">
          <p className="text-xs text-[var(--color-text-secondary)]">
            <strong>Includes:</strong> 17 caption templates (feed, reels, stories, carousels) 
            organized by content pillar, plus 15 hashtag groups with tiered reach 
            (brand → mega → large → niche).
          </p>
        </div>
      </>
    )}
  </CardContent>
</Card>
```

## Acceptance Criteria

- [ ] `POST /api/instagram/seed` creates all templates and hashtag groups
- [ ] `GET /api/instagram/seed` returns current vs expected counts
- [ ] Instagram Settings page shows seed status
- [ ] "Seed Templates & Hashtags" button appears when data is missing
- [ ] After seeding, templates appear in Instagram → Templates
- [ ] After seeding, hashtags appear in Instagram → Hashtags
- [ ] Duplicate seeds are skipped (idempotent)

## Testing

1. Go to Settings → Instagram
2. See "Caption Templates & Hashtags" section showing 0/17 templates, 0/15 hashtags
3. Click "Seed Templates & Hashtags"
4. Wait for completion
5. Verify counts show 17/17 and 15/15
6. Go to Instagram → Calendar → New Post
7. Verify template dropdown has options
8. Verify hashtag generator returns results
