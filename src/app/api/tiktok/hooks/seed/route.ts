import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Haven & Hold Video Hooks Library (user-specific)
// Matches existing schema: content_types[], collections[], platforms[], hook_type
const VIDEO_HOOKS = [
  // ============================================
  // QUOTE REVEAL HOOKS (40 hooks)
  // ============================================

  // Pattern Interrupt - Quote Reveal
  { content_types: ['quote_reveal'], hook_type: 'pattern_interrupt', collections: ['any'], platforms: ['both'], hook_text: 'Stop scrolling if you needed to hear this today' },
  { content_types: ['quote_reveal'], hook_type: 'pattern_interrupt', collections: ['any'], platforms: ['both'], hook_text: 'Wait. This one\'s for you.' },
  { content_types: ['quote_reveal'], hook_type: 'pattern_interrupt', collections: ['any'], platforms: ['tiktok'], hook_text: 'Okay but why did this quote just call me out' },
  { content_types: ['quote_reveal'], hook_type: 'pattern_interrupt', collections: ['any'], platforms: ['both'], hook_text: 'The quote I didn\'t know I needed today' },
  { content_types: ['quote_reveal'], hook_type: 'pattern_interrupt', collections: ['any'], platforms: ['both'], hook_text: 'This stopped me in my tracks' },
  { content_types: ['quote_reveal'], hook_type: 'pattern_interrupt', collections: ['grounding', 'any'], platforms: ['both'], hook_text: 'For everyone who feels like they\'re barely holding on' },
  { content_types: ['quote_reveal'], hook_type: 'pattern_interrupt', collections: ['wholeness', 'any'], platforms: ['both'], hook_text: 'If you\'ve been too hard on yourself lately' },
  { content_types: ['quote_reveal'], hook_type: 'pattern_interrupt', collections: ['growth', 'any'], platforms: ['both'], hook_text: 'For everyone in their becoming era' },

  // Question - Quote Reveal
  { content_types: ['quote_reveal'], hook_type: 'question', collections: ['any'], platforms: ['both'], hook_text: 'What if the walls in your home could hold you?' },
  { content_types: ['quote_reveal'], hook_type: 'question', collections: ['any'], platforms: ['both'], hook_text: 'Ever read something that felt like it was written just for you?' },
  { content_types: ['quote_reveal'], hook_type: 'question', collections: ['any'], platforms: ['both'], hook_text: 'What words do you need to see every day?' },
  { content_types: ['quote_reveal'], hook_type: 'question', collections: ['grounding', 'any'], platforms: ['both'], hook_text: 'What if you gave yourself permission to just... stop?' },
  { content_types: ['quote_reveal'], hook_type: 'question', collections: ['wholeness', 'any'], platforms: ['both'], hook_text: 'When\'s the last time you told yourself it\'s okay to be messy?' },
  { content_types: ['quote_reveal'], hook_type: 'question', collections: ['growth', 'any'], platforms: ['both'], hook_text: 'What would you become if you stopped fighting it?' },

  // Statement - Quote Reveal
  { content_types: ['quote_reveal'], hook_type: 'statement', collections: ['any'], platforms: ['both'], hook_text: 'Some walls need words' },
  { content_types: ['quote_reveal'], hook_type: 'statement', collections: ['any'], platforms: ['both'], hook_text: 'Not motivation. Not inspiration. Just holding.' },
  { content_types: ['quote_reveal'], hook_type: 'statement', collections: ['any'], platforms: ['both'], hook_text: 'The quote that lives above my bed now' },
  { content_types: ['quote_reveal'], hook_type: 'statement', collections: ['any'], platforms: ['both'], hook_text: 'Words that do the work when you can\'t' },
  { content_types: ['quote_reveal'], hook_type: 'statement', collections: ['any'], platforms: ['both'], hook_text: 'My therapist has this on her wall' },
  { content_types: ['quote_reveal'], hook_type: 'statement', collections: ['grounding', 'any'], platforms: ['both'], hook_text: 'For the days when everything feels unsteady' },
  { content_types: ['quote_reveal'], hook_type: 'statement', collections: ['wholeness', 'any'], platforms: ['both'], hook_text: 'All of you belongs here. Yes, even that part.' },
  { content_types: ['quote_reveal'], hook_type: 'statement', collections: ['growth', 'any'], platforms: ['both'], hook_text: 'Still becoming. And that\'s enough.' },

  // Direct Address (emotional) - Quote Reveal
  { content_types: ['quote_reveal'], hook_type: 'direct_address', collections: ['any'], platforms: ['both'], hook_text: 'I cried the first time I read this' },
  { content_types: ['quote_reveal'], hook_type: 'direct_address', collections: ['any'], platforms: ['both'], hook_text: 'The words I wish someone had said to me sooner' },
  { content_types: ['quote_reveal'], hook_type: 'direct_address', collections: ['any'], platforms: ['both'], hook_text: 'Read this when you feel like giving up' },
  { content_types: ['quote_reveal'], hook_type: 'direct_address', collections: ['any'], platforms: ['both'], hook_text: 'For everyone who\'s exhausted from being strong' },
  { content_types: ['quote_reveal'], hook_type: 'direct_address', collections: ['grounding', 'any'], platforms: ['both'], hook_text: 'When the anxiety won\'t quiet down' },
  { content_types: ['quote_reveal'], hook_type: 'direct_address', collections: ['wholeness', 'any'], platforms: ['both'], hook_text: 'For my fellow perfectionists in recovery' },
  { content_types: ['quote_reveal'], hook_type: 'direct_address', collections: ['growth', 'any'], platforms: ['both'], hook_text: 'For everyone scared of what they\'re becoming' },

  // POV - Quote Reveal
  { content_types: ['quote_reveal'], hook_type: 'pov', collections: ['any'], platforms: ['tiktok'], hook_text: 'POV: You finally decorated your first apartment' },
  { content_types: ['quote_reveal'], hook_type: 'pov', collections: ['any'], platforms: ['tiktok'], hook_text: 'POV: Your therapist asks about your safe space' },
  { content_types: ['quote_reveal'], hook_type: 'pov', collections: ['any'], platforms: ['tiktok'], hook_text: 'POV: You\'re creating a sanctuary, not just a room' },
  { content_types: ['quote_reveal'], hook_type: 'pov', collections: ['grounding', 'any'], platforms: ['tiktok'], hook_text: 'POV: You need an anchor and your walls provide it' },
  { content_types: ['quote_reveal'], hook_type: 'pov', collections: ['wholeness', 'any'], platforms: ['tiktok'], hook_text: 'POV: You\'re learning to take up space' },
  { content_types: ['quote_reveal'], hook_type: 'pov', collections: ['growth', 'any'], platforms: ['tiktok'], hook_text: 'POV: You\'re not who you were a year ago' },

  // Controversy (contrarian) - Quote Reveal
  { content_types: ['quote_reveal'], hook_type: 'controversy', collections: ['any'], platforms: ['both'], hook_text: 'I\'m so tired of "good vibes only" culture' },
  { content_types: ['quote_reveal'], hook_type: 'controversy', collections: ['any'], platforms: ['both'], hook_text: 'Not another "rise and grind" quote' },
  { content_types: ['quote_reveal'], hook_type: 'controversy', collections: ['any'], platforms: ['tiktok'], hook_text: 'Live Laugh Love walked so this could run' },
  { content_types: ['quote_reveal'], hook_type: 'controversy', collections: ['any'], platforms: ['both'], hook_text: 'Motivation culture is exhausting. Here\'s permission instead.' },

  // ============================================
  // TRANSFORMATION HOOKS (20 hooks)
  // ============================================

  { content_types: ['transformation'], hook_type: 'statement', collections: ['any'], platforms: ['both'], hook_text: 'Before → After (one print changed everything)' },
  { content_types: ['transformation'], hook_type: 'statement', collections: ['any'], platforms: ['both'], hook_text: 'How I transformed my blank wall for under $20' },
  { content_types: ['transformation'], hook_type: 'statement', collections: ['any'], platforms: ['both'], hook_text: 'The $12 print that made my room feel like home' },
  { content_types: ['transformation'], hook_type: 'statement', collections: ['any'], platforms: ['both'], hook_text: 'What my wall looked like vs what it looks like now' },
  { content_types: ['transformation'], hook_type: 'pov', collections: ['any'], platforms: ['tiktok'], hook_text: 'POV: You finally found the right words for that wall' },
  { content_types: ['transformation'], hook_type: 'question', collections: ['any'], platforms: ['both'], hook_text: 'Want to see how one quote print changed this space?' },
  { content_types: ['transformation'], hook_type: 'question', collections: ['any'], platforms: ['both'], hook_text: 'What if I told you this transformation cost $15?' },
  { content_types: ['transformation'], hook_type: 'pattern_interrupt', collections: ['any'], platforms: ['both'], hook_text: 'Wait for it...' },
  { content_types: ['transformation'], hook_type: 'pattern_interrupt', collections: ['any'], platforms: ['both'], hook_text: 'The before doesn\'t even look like the same room' },
  { content_types: ['transformation'], hook_type: 'story', collections: ['any'], platforms: ['both'], hook_text: 'This space used to make me anxious. Now it holds me.' },
  { content_types: ['transformation'], hook_type: 'story', collections: ['grounding', 'any'], platforms: ['both'], hook_text: 'From chaos to sanctuary in one afternoon' },
  { content_types: ['transformation'], hook_type: 'story', collections: ['wholeness', 'any'], platforms: ['both'], hook_text: 'Finally made my space feel like me' },
  { content_types: ['transformation'], hook_type: 'story', collections: ['growth', 'any'], platforms: ['both'], hook_text: 'My space is evolving with me' },
  { content_types: ['transformation'], hook_type: 'pov', collections: ['any'], platforms: ['tiktok'], hook_text: 'POV: You\'re watching me hang art in real time' },
  { content_types: ['transformation'], hook_type: 'pov', collections: ['any'], platforms: ['tiktok'], hook_text: 'POV: Your roommate asks why you\'re staring at the wall' },
  { content_types: ['transformation'], hook_type: 'controversy', collections: ['any'], platforms: ['both'], hook_text: 'You don\'t need expensive art. You need the right words.' },
  { content_types: ['transformation'], hook_type: 'controversy', collections: ['any'], platforms: ['both'], hook_text: 'Forget gallery walls. One quote is enough.' },
  { content_types: ['transformation'], hook_type: 'controversy', collections: ['any'], platforms: ['tiktok'], hook_text: 'Interior designers hate this $12 trick' },
  { content_types: ['transformation'], hook_type: 'statement', collections: ['any'], platforms: ['both'], hook_text: 'Proof that words on walls actually work' },
  { content_types: ['transformation'], hook_type: 'statement', collections: ['any'], platforms: ['both'], hook_text: 'My bedroom glow-up (it was the quote print)' },

  // ============================================
  // EDUCATIONAL HOOKS (20 hooks)
  // ============================================

  { content_types: ['educational'], hook_type: 'question', collections: ['any'], platforms: ['both'], hook_text: 'Do you know the right way to print digital downloads?' },
  { content_types: ['educational'], hook_type: 'question', collections: ['any'], platforms: ['both'], hook_text: 'Want to know how to get gallery-quality prints for $5?' },
  { content_types: ['educational'], hook_type: 'question', collections: ['any'], platforms: ['both'], hook_text: 'What\'s the difference between matte and glossy prints?' },
  { content_types: ['educational'], hook_type: 'curiosity', collections: ['any'], platforms: ['both'], hook_text: 'Stop wasting money on bad prints. Here\'s how.' },
  { content_types: ['educational'], hook_type: 'curiosity', collections: ['any'], platforms: ['both'], hook_text: '3 things I wish I knew before printing at home' },
  { content_types: ['educational'], hook_type: 'statement', collections: ['any'], platforms: ['both'], hook_text: 'The IKEA frame that makes everything look expensive' },
  { content_types: ['educational'], hook_type: 'statement', collections: ['any'], platforms: ['both'], hook_text: 'How to hang art without ruining your walls' },
  { content_types: ['educational'], hook_type: 'statement', collections: ['any'], platforms: ['both'], hook_text: 'Digital downloads 101: what you actually get' },
  { content_types: ['educational'], hook_type: 'pattern_interrupt', collections: ['any'], platforms: ['both'], hook_text: 'Wait—don\'t print it like that' },
  { content_types: ['educational'], hook_type: 'pattern_interrupt', collections: ['any'], platforms: ['both'], hook_text: 'Before you print your download, watch this' },
  { content_types: ['educational'], hook_type: 'controversy', collections: ['any'], platforms: ['both'], hook_text: 'Your home printer is ruining your art' },
  { content_types: ['educational'], hook_type: 'controversy', collections: ['any'], platforms: ['both'], hook_text: 'Expensive frames are a scam (here\'s what I use)' },
  { content_types: ['educational'], hook_type: 'controversy', collections: ['any'], platforms: ['tiktok'], hook_text: 'The $3 Staples print that looks like a $50 frame job' },
  { content_types: ['educational'], hook_type: 'pov', collections: ['any'], platforms: ['tiktok'], hook_text: 'POV: You\'re learning how to actually use digital downloads' },
  { content_types: ['educational'], hook_type: 'pov', collections: ['any'], platforms: ['tiktok'], hook_text: 'POV: You just saved $40 by watching this' },
  { content_types: ['educational'], hook_type: 'story', collections: ['any'], platforms: ['both'], hook_text: 'I ruined 3 prints before I learned this' },
  { content_types: ['educational'], hook_type: 'statement', collections: ['any'], platforms: ['both'], hook_text: 'Staples vs FedEx vs Walgreens: which prints best?' },
  { content_types: ['educational'], hook_type: 'curiosity', collections: ['any'], platforms: ['both'], hook_text: 'How to pick the right quote for your space' },
  { content_types: ['educational'], hook_type: 'curiosity', collections: ['any'], platforms: ['both'], hook_text: 'The psychology of what words you put on your walls' },
  { content_types: ['educational'], hook_type: 'question', collections: ['any'], platforms: ['both'], hook_text: 'Should you match your art to your room or your mood?' },

  // ============================================
  // BEHIND THE SCENES HOOKS (15 hooks)
  // ============================================

  { content_types: ['bts'], hook_type: 'story', collections: ['any'], platforms: ['both'], hook_text: 'A day in the life of a quote print shop owner' },
  { content_types: ['bts'], hook_type: 'curiosity', collections: ['any'], platforms: ['both'], hook_text: 'How I pick the quotes for Haven & Hold' },
  { content_types: ['bts'], hook_type: 'story', collections: ['any'], platforms: ['both'], hook_text: 'The quote that almost didn\'t make the collection' },
  { content_types: ['bts'], hook_type: 'direct_address', collections: ['any'], platforms: ['both'], hook_text: 'Packing orders in my tiny apartment' },
  { content_types: ['bts'], hook_type: 'story', collections: ['any'], platforms: ['both'], hook_text: 'Why I started a quote print shop (the real reason)' },
  { content_types: ['bts'], hook_type: 'question', collections: ['any'], platforms: ['both'], hook_text: 'Want to see how a quote goes from idea to print?' },
  { content_types: ['bts'], hook_type: 'question', collections: ['any'], platforms: ['both'], hook_text: 'Ever wonder what running an Etsy alternative looks like?' },
  { content_types: ['bts'], hook_type: 'pov', collections: ['any'], platforms: ['tiktok'], hook_text: 'POV: You\'re watching me design today\'s quote' },
  { content_types: ['bts'], hook_type: 'pov', collections: ['any'], platforms: ['tiktok'], hook_text: 'POV: You\'re in my studio while I work' },
  { content_types: ['bts'], hook_type: 'direct_address', collections: ['any'], platforms: ['both'], hook_text: 'The DM that made me cry (in a good way)' },
  { content_types: ['bts'], hook_type: 'direct_address', collections: ['any'], platforms: ['both'], hook_text: 'Why I do this (hint: it\'s not the money)' },
  { content_types: ['bts'], hook_type: 'direct_address', collections: ['any'], platforms: ['both'], hook_text: 'A therapist just ordered 12 prints. I\'m emotional.' },
  { content_types: ['bts'], hook_type: 'pattern_interrupt', collections: ['any'], platforms: ['both'], hook_text: 'Wait til you see what I\'m working on' },
  { content_types: ['bts'], hook_type: 'pattern_interrupt', collections: ['any'], platforms: ['both'], hook_text: 'Sneak peek at the new collection' },
  { content_types: ['bts'], hook_type: 'controversy', collections: ['any'], platforms: ['both'], hook_text: 'The unglamorous reality of running a small shop' },

  // ============================================
  // TRENDING/SOUND-BASED HOOKS (10 hooks)
  // ============================================

  { content_types: ['trending'], hook_type: 'direct_address', collections: ['any'], platforms: ['tiktok'], hook_text: 'Using this sound to show you my wall art' },
  { content_types: ['trending'], hook_type: 'direct_address', collections: ['any'], platforms: ['tiktok'], hook_text: 'Things in my apartment that just make sense' },
  { content_types: ['trending'], hook_type: 'statement', collections: ['any'], platforms: ['tiktok'], hook_text: 'My roman empire is finding the perfect quote for that wall' },
  { content_types: ['trending'], hook_type: 'statement', collections: ['any'], platforms: ['tiktok'], hook_text: 'The feminine urge to buy another quote print' },
  { content_types: ['trending'], hook_type: 'story', collections: ['any'], platforms: ['tiktok'], hook_text: 'Things I bought that actually changed my life' },
  { content_types: ['trending'], hook_type: 'statement', collections: ['any'], platforms: ['tiktok'], hook_text: 'My toxic trait is thinking one more print will fix everything' },
  { content_types: ['trending'], hook_type: 'pov', collections: ['any'], platforms: ['tiktok'], hook_text: 'POV: You\'re a quote print and I just brought you home' },
  { content_types: ['trending'], hook_type: 'pov', collections: ['any'], platforms: ['tiktok'], hook_text: 'POV: You\'re my wall and I\'m about to make you beautiful' },
  { content_types: ['trending'], hook_type: 'direct_address', collections: ['any'], platforms: ['tiktok'], hook_text: 'The little things that make my apartment feel like home' },
  { content_types: ['trending'], hook_type: 'direct_address', collections: ['any'], platforms: ['tiktok'], hook_text: 'Soft life essentials for your space' },
];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = {
      created: 0,
      skipped: 0,
      errors: [] as string[],
    };

    console.log(`[Hooks Seed] Starting to seed ${VIDEO_HOOKS.length} hooks for user ${user.id}`);

    // First, check existing user hooks to get a count
    const { count: existingCount } = await (supabase as any)
      .from('video_hooks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    console.log(`[Hooks Seed] User has ${existingCount || 0} existing hooks`);

    // Batch check existing hook texts
    const hookTexts = VIDEO_HOOKS.map(h => h.hook_text);
    const { data: existingHooks } = await (supabase as any)
      .from('video_hooks')
      .select('hook_text')
      .eq('user_id', user.id)
      .in('hook_text', hookTexts);

    const existingTexts = new Set((existingHooks || []).map((h: { hook_text: string }) => h.hook_text));
    console.log(`[Hooks Seed] Found ${existingTexts.size} matching hooks to skip`);

    // Filter to only new hooks
    const newHooks = VIDEO_HOOKS.filter(h => !existingTexts.has(h.hook_text));
    results.skipped = VIDEO_HOOKS.length - newHooks.length;

    console.log(`[Hooks Seed] Will insert ${newHooks.length} new hooks`);

    if (newHooks.length === 0) {
      return NextResponse.json({
        message: `All ${VIDEO_HOOKS.length} hooks already exist`,
        results: { ...results, created: 0 },
      });
    }

    // Batch insert all new hooks at once
    // Note: avg_completion_rate is DECIMAL(5,4) so use 0.5 not 50 for 50%
    const hooksToInsert = newHooks.map(hook => ({
      user_id: user.id,
      hook_text: hook.hook_text,
      hook_type: hook.hook_type,
      content_types: hook.content_types,
      collections: hook.collections,
      platforms: hook.platforms,
      usage_count: 0,
      avg_completion_rate: 0.5,
      last_used_at: null,
      is_active: true,
      is_system: false,
    }));

    const { data: insertedData, error: insertError } = await (supabase as any)
      .from('video_hooks')
      .insert(hooksToInsert)
      .select('id');

    if (insertError) {
      console.error('[Hooks Seed] Batch insert error:', insertError);
      results.errors.push(`Batch insert failed: ${insertError.message} (code: ${insertError.code})`);

      // Try inserting one by one to identify specific failures
      if (insertError.code === '23505') { // Unique violation
        results.errors.push('Unique constraint violation - trying individual inserts');
        for (const hook of newHooks.slice(0, 5)) { // Try first 5 to diagnose
          const { error: singleError } = await (supabase as any)
            .from('video_hooks')
            .insert({
              user_id: user.id,
              hook_text: hook.hook_text,
              hook_type: hook.hook_type,
              content_types: hook.content_types,
              collections: hook.collections,
              platforms: hook.platforms,
              usage_count: 0,
              avg_completion_rate: 0.5,
              is_active: true,
              is_system: false,
            });
          if (singleError) {
            results.errors.push(`"${hook.hook_text.substring(0, 25)}...": ${singleError.message}`);
          } else {
            results.created++;
          }
        }
      }
    } else {
      results.created = insertedData?.length || newHooks.length;
      console.log(`[Hooks Seed] Successfully inserted ${results.created} hooks`);
    }

    return NextResponse.json({
      message: `Seeded ${results.created} video hooks, skipped ${results.skipped} existing`,
      results,
    });
  } catch (error) {
    console.error('Error seeding video hooks:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
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

    // Get user hooks count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: userCount } = await (supabase as any)
      .from('video_hooks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Get system hooks count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: systemCount } = await (supabase as any)
      .from('video_hooks')
      .select('*', { count: 'exact', head: true })
      .eq('is_system', true);

    // Get breakdown by content type for user hooks
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: userBreakdown } = await (supabase as any)
      .from('video_hooks')
      .select('content_types')
      .eq('user_id', user.id);

    const byType: Record<string, number> = {};
    (userBreakdown || []).forEach((h: { content_types: string[] }) => {
      (h.content_types || []).forEach(ct => {
        byType[ct] = (byType[ct] || 0) + 1;
      });
    });

    // Get breakdown by content type for system hooks
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: systemBreakdown } = await (supabase as any)
      .from('video_hooks')
      .select('content_types')
      .eq('is_system', true);

    const systemByType: Record<string, number> = {};
    (systemBreakdown || []).forEach((h: { content_types: string[] }) => {
      (h.content_types || []).forEach(ct => {
        systemByType[ct] = (systemByType[ct] || 0) + 1;
      });
    });

    const totalAvailable = (userCount || 0) + (systemCount || 0);

    return NextResponse.json({
      hooks: {
        user: userCount || 0,
        system: systemCount || 0,
        total: totalAvailable,
        expected: VIDEO_HOOKS.length,
        by_type: byType,
        system_by_type: systemByType,
      },
      is_complete: totalAvailable >= 100, // At least 100 hooks available
      has_user_hooks: (userCount || 0) > 0,
      has_system_hooks: (systemCount || 0) > 0,
    });
  } catch (error) {
    console.error('Error checking video hooks seed status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
