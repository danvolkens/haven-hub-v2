import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { addDays, parseISO, format, isBefore, startOfDay } from 'date-fns';

// POST /api/tiktok/queue/auto-fill - Fill empty slots for the week
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { weekStart } = body;

    if (!weekStart) {
      return NextResponse.json({ error: 'weekStart required' }, { status: 400 });
    }

    const startDate = parseISO(weekStart);
    const today = startOfDay(new Date());

    // Get existing queue items for the week
    const { data: existingItems } = await (supabase as any)
      .from('tiktok_queue')
      .select('target_date, slot_type')
      .eq('user_id', user.id)
      .gte('target_date', format(startDate, 'yyyy-MM-dd'))
      .lt('target_date', format(addDays(startDate, 7), 'yyyy-MM-dd'));

    const existingSlots = new Set(
      (existingItems || []).map((item: any) => `${item.target_date}-${item.slot_type}`)
    );

    // Get approved quotes with video assets ready
    const { data: quotes } = await (supabase as any)
      .from('quotes')
      .select('id, text, author, collection')
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .limit(20);

    if (!quotes || quotes.length === 0) {
      return NextResponse.json({ error: 'No approved quotes available' }, { status: 400 });
    }

    // Get hook for quote reveal
    const { data: hooks } = await (supabase as any)
      .from('video_hooks')
      .select('id, hook_text')
      .contains('content_types', ['quote_reveal'])
      .eq('is_active', true)
      .limit(10);

    // Collection taglines
    const collectionTaglines: Record<string, string> = {
      grounding: 'For the days when everything feels unsteady.',
      wholeness: 'All of you belongs here.',
      growth: 'Still becoming. And that\'s enough.',
      general: 'Words that stay with you.',
    };

    // Find empty slots and fill them
    const newEntries: any[] = [];
    let quoteIndex = 0;
    let alternateSlot: 'morning' | 'evening' = 'morning';

    for (let i = 0; i < 7; i++) {
      const date = addDays(startDate, i);
      const dateStr = format(date, 'yyyy-MM-dd');

      // Skip past days
      if (isBefore(date, today)) continue;

      for (const slot of ['morning', 'evening'] as const) {
        const slotKey = `${dateStr}-${slot}`;

        if (!existingSlots.has(slotKey) && quoteIndex < quotes.length) {
          const quote = quotes[quoteIndex];
          const hook = hooks?.[Math.floor(Math.random() * (hooks?.length || 1))] || {
            id: null,
            hook_text: 'Wait for it... 💫',
          };

          // Generate caption
          const tagline = collectionTaglines[quote.collection] || collectionTaglines.general;
          const caption = `${hook.hook_text}\n\n"${quote.text}"\n\n${tagline}\n\nLink in bio 🤍`;

          // Generate hashtags (5-5-5 method simplified)
          const hashtags = generateTikTokHashtags(quote.collection);

          newEntries.push({
            user_id: user.id,
            quote_id: quote.id,
            content_type: 'quote_reveal',
            hook_id: hook.id,
            hook_text: hook.hook_text,
            caption,
            hashtags,
            target_date: dateStr,
            slot_type: slot,
            status: 'pending',
          });

          quoteIndex++;
        }
      }
    }

    if (newEntries.length === 0) {
      return NextResponse.json({ created: 0, message: 'All slots already filled' });
    }

    // Insert new entries
    const { error: insertError } = await (supabase as any)
      .from('tiktok_queue')
      .insert(newEntries);

    if (insertError) {
      console.error('Error inserting queue entries:', insertError);
      return NextResponse.json({ error: 'Failed to create queue entries' }, { status: 500 });
    }

    return NextResponse.json({ created: newEntries.length });
  } catch (error) {
    console.error('Error in auto-fill API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Generate TikTok hashtags using 5-5-5 method
function generateTikTokHashtags(collection: string): string[] {
  // Mega (high volume)
  const mega = ['fyp', 'viral', 'foryou', 'tiktok', 'trending'];

  // Large (medium volume by niche)
  const largeByCollection: Record<string, string[]> = {
    grounding: ['mentalhealth', 'anxietyrelief', 'healing', 'selfcare', 'mindfulness'],
    wholeness: ['selflove', 'selfworth', 'selfcompassion', 'acceptance', 'innerpeace'],
    growth: ['personalgrowth', 'motivation', 'mindset', 'transformation', 'growth'],
    general: ['quotes', 'quotestoliveby', 'inspiration', 'wisdom', 'words'],
  };

  // Niche (targeted)
  const nicheByCollection: Record<string, string[]> = {
    grounding: ['groundingtechniques', 'calmvibes', 'peacefulmind', 'anxietysupport', 'nervousystem'],
    wholeness: ['innerchild', 'healingjourney', 'emotionalhealing', 'traumahealing', 'therapytiktok'],
    growth: ['becomingher', 'levelup', 'growthmindset', 'evolving', 'selfimprovement'],
    general: ['quoteoftheday', 'dailyquote', 'quoteart', 'wordsofwisdom', 'thoughtful'],
  };

  const large = largeByCollection[collection] || largeByCollection.general;
  const niche = nicheByCollection[collection] || nicheByCollection.general;

  // Shuffle and pick
  const shuffled = [
    ...mega.sort(() => Math.random() - 0.5).slice(0, 5),
    ...large.sort(() => Math.random() - 0.5).slice(0, 5),
    ...niche.sort(() => Math.random() - 0.5).slice(0, 5),
  ];

  return shuffled.map((tag) => `#${tag}`);
}
