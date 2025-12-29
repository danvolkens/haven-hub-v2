/**
 * TikTok Batch Filming Preparation
 * Prompt K.2: Weekly batch filming system
 *
 * Weekly batches (90 min total):
 * - Batch 1: Quote Reveals (5-7 videos)
 * - Batch 2: Transformations (2-3 videos)
 * - Batch 3: Educational/Talking Head (3-4 videos)
 */

import { createClient } from '@/lib/supabase/server';
import { selectHook, Collection } from './hook-selector';

// ============================================================================
// Types
// ============================================================================

export interface FilmingItem {
  id?: string;
  quote_id?: string;
  quote_text?: string;
  collection?: string;
  suggested_hook?: string;
  hook_id?: string;
  audio_mood?: string;
  notes?: string;
  shot_list?: string[];
  script_outline?: string[];
  duration_target?: string;
  topic?: string;
  products_to_feature?: string[];
  type?: string;
}

export interface FilmingBatch {
  batch_name: string;
  batch_id?: string;
  count: number;
  setup: string;
  lighting_tips?: string;
  equipment_needed?: string[];
  items: FilmingItem[];
  filming_tips?: string[];
}

export interface BatchFilmingList {
  week_of: string;
  total_videos_needed: number;
  batches: FilmingBatch[];
  filming_tips: string[];
  estimated_time: string;
}

// ============================================================================
// Constants
// ============================================================================

const BATCH_CONFIGS = {
  quote_reveal: {
    name: 'Quote Reveals',
    count: 7,
    setup: 'Ring light, print on wall or held, phone on tripod',
    lighting_tips: 'Natural light or ring light, soft and warm',
    equipment_needed: ['Ring light', 'Phone tripod', 'Printed quotes'],
    filming_tips: [
      'Film all in one session with same lighting',
      'Have 10+ quotes ready to reduce switching',
      'Slow zoom works well (8-12 seconds each)',
      'Record multiple takes quickly',
    ],
  },
  transformation: {
    name: 'Transformations',
    count: 3,
    setup: 'Natural light, before/after of same wall',
    lighting_tips: 'Consistent lighting between before and after',
    equipment_needed: ['Phone tripod (stable position)', 'Props for styling'],
    filming_tips: [
      'Mark tripod position for consistent framing',
      'Film before, then style, then after',
      'Add styled elements progressively',
      'Best in morning or afternoon natural light',
    ],
  },
  educational: {
    name: 'Educational',
    count: 4,
    setup: 'Talking head OR screen recording',
    lighting_tips: 'Face the light source, avoid harsh shadows',
    equipment_needed: ['Phone tripod', 'External mic (optional)', 'Script notes'],
    filming_tips: [
      'Can be filmed anytime — less setup dependent',
      'Keep each video 30-45 seconds',
      'Use bullet points, not full scripts',
      'Make eye contact with camera',
    ],
  },
};

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Generate batch filming list for a week
 */
export async function generateBatchFilmingList(
  weekStart: Date = new Date()
): Promise<BatchFilmingList> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Normalize to start of week
  const weekOf = new Date(weekStart);
  weekOf.setDate(weekOf.getDate() - weekOf.getDay());
  weekOf.setHours(0, 0, 0, 0);

  const batches: FilmingBatch[] = [];

  // Generate Quote Reveals batch
  const quoteRevealsBatch = await generateQuoteRevealsBatch(7);
  batches.push(quoteRevealsBatch);

  // Generate Transformations batch
  const transformationsBatch = await generateTransformationsBatch(3);
  batches.push(transformationsBatch);

  // Generate Educational batch
  const educationalBatch = generateEducationalBatch(4);
  batches.push(educationalBatch);

  const totalVideos = batches.reduce((sum, b) => sum + b.count, 0);

  return {
    week_of: weekOf.toISOString().split('T')[0],
    total_videos_needed: totalVideos,
    batches,
    filming_tips: [
      'Film all quote reveals in one session (same lighting)',
      'Batch transformations need before + after of same space',
      'Educational can be filmed anytime — less setup dependent',
      'Total estimated time: 60-90 minutes if well-prepared',
    ],
    estimated_time: '60-90 minutes',
  };
}

/**
 * Generate quote reveals batch with actual quotes
 */
async function generateQuoteRevealsBatch(count: number): Promise<FilmingBatch> {
  const supabase = await createClient();
  const config = BATCH_CONFIGS.quote_reveal;

  // Get random approved quotes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: quotes } = await (supabase as any)
    .from('quotes')
    .select('id, text, author, collection')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(count * 2);

  const items: FilmingItem[] = [];
  const selectedQuotes = shuffleArray(quotes || []).slice(0, count) as {
    id: string;
    text: string;
    author: string;
    collection: string;
  }[];

  for (const quote of selectedQuotes) {
    // Get a hook for this quote
    const hook = await selectHook({
      content_type: 'quote_reveal',
      collection: (quote.collection as Collection) || 'any',
      platform: 'tiktok',
    });

    items.push({
      quote_id: quote.id,
      quote_text: quote.text,
      collection: quote.collection,
      suggested_hook: hook?.hook_text || 'Read this if you need a sign today',
      hook_id: hook?.id,
      audio_mood: getAudioMood(quote.collection),
      notes: 'Slow zoom, 8-12 seconds. Let quote breathe.',
    });
  }

  // Pad with placeholder items if not enough quotes
  while (items.length < count) {
    items.push({
      quote_text: '[Select a quote]',
      suggested_hook: 'This quote changed everything',
      audio_mood: 'soft_emotional',
      notes: 'Slow zoom, 8-12 seconds',
    });
  }

  return {
    batch_name: config.name,
    count: items.length,
    setup: config.setup,
    lighting_tips: config.lighting_tips,
    equipment_needed: config.equipment_needed,
    items,
    filming_tips: config.filming_tips,
  };
}

/**
 * Generate transformations batch
 */
async function generateTransformationsBatch(count: number): Promise<FilmingBatch> {
  const config = BATCH_CONFIGS.transformation;

  const transformationIdeas = [
    {
      type: 'wall_transformation',
      suggested_hook: '$27 wall glow-up',
      shot_list: ['Blank wall (before)', 'Measuring/planning', 'Hanging prints', 'Styled reveal (after)'],
      notes: 'Keep tripod in same position for before/after',
    },
    {
      type: 'desk_transformation',
      suggested_hook: 'My workspace went from chaos to calm',
      shot_list: ['Messy desk', 'Clearing items', 'Adding quote print', 'Organized reveal'],
      notes: 'Great for work-from-home angle',
    },
    {
      type: 'reading_nook',
      suggested_hook: 'Creating my peace corner',
      shot_list: ['Empty corner', 'Adding chair/cushion', 'Hanging print', 'Cozy final look'],
      notes: 'Emphasize the "sanctuary" feeling',
    },
    {
      type: 'bedroom_corner',
      suggested_hook: 'This corner was wasted space until...',
      shot_list: ['Unused corner', 'Adding small table', 'Placing print', 'Styled with plant/candle'],
      notes: 'Relatable home improvement content',
    },
  ];

  const items = transformationIdeas.slice(0, count);

  return {
    batch_name: config.name,
    count: items.length,
    setup: config.setup,
    lighting_tips: config.lighting_tips,
    equipment_needed: config.equipment_needed,
    items,
    filming_tips: config.filming_tips,
  };
}

/**
 * Generate educational content batch
 */
function generateEducationalBatch(count: number): FilmingBatch {
  const config = BATCH_CONFIGS.educational;

  const educationalTopics = [
    {
      topic: 'How to print digital downloads',
      suggested_hook: 'Stop wasting money on bad prints',
      script_outline: ['Choose right file size', 'Find local print shop', 'Request matte finish', 'Standard frame sizes'],
      duration_target: '30-45 seconds',
    },
    {
      topic: 'Best frame sizes for quotes',
      suggested_hook: '3 sizes that work every time',
      script_outline: ['8x10 for desks', '11x14 for walls', '16x20 for statements'],
      duration_target: '20-30 seconds',
    },
    {
      topic: 'Where to hang quote art',
      suggested_hook: 'Places you see every day',
      script_outline: ['By your bed (morning)', 'At your desk (motivation)', 'Bathroom mirror (grounding)'],
      duration_target: '30-45 seconds',
    },
    {
      topic: 'Creating a grounding corner',
      suggested_hook: 'Your nervous system will thank you',
      script_outline: ['Pick a quiet spot', 'Add calming elements', 'Include meaningful quote', 'Use daily'],
      duration_target: '45-60 seconds',
    },
    {
      topic: 'Why words on walls matter',
      suggested_hook: 'The science behind quote art',
      script_outline: ['Visual reminders work', 'Subconscious reinforcement', 'Pattern interrupt in space'],
      duration_target: '30-45 seconds',
    },
    {
      topic: 'Choosing quotes for your space',
      suggested_hook: "Not every quote is 'you'",
      script_outline: ['What do you need to hear?', 'Match the room energy', 'Rotate seasonally'],
      duration_target: '30-45 seconds',
    },
  ];

  const items = educationalTopics.slice(0, count);

  return {
    batch_name: config.name,
    count: items.length,
    setup: config.setup,
    lighting_tips: config.lighting_tips,
    equipment_needed: config.equipment_needed,
    items,
    filming_tips: config.filming_tips,
  };
}

/**
 * Create a filming batch in the database
 */
export async function createFilmingBatch(
  batchName: string,
  weekOf: Date,
  items: FilmingItem[]
): Promise<string | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const config = Object.values(BATCH_CONFIGS).find((c) => c.name === batchName);

  // Create the batch
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: batch, error: batchError } = await (supabase as any)
    .from('tiktok_filming_batches')
    .insert({
      user_id: user.id,
      batch_name: batchName,
      week_of: weekOf.toISOString().split('T')[0],
      target_count: items.length,
      setup_notes: config?.setup,
      lighting_tips: config?.lighting_tips,
      equipment_needed: config?.equipment_needed,
    })
    .select()
    .single();

  if (batchError || !batch) {
    console.error('Failed to create batch:', batchError);
    return null;
  }

  // Create queue items for each filming item
  for (const item of items) {
    const pillar = batchName === 'Quote Reveals'
      ? 'quote_reveal'
      : batchName === 'Transformations'
        ? 'transformation'
        : 'educational';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('tiktok_queue').insert({
      user_id: user.id,
      title: item.topic || item.quote_text?.slice(0, 50),
      hook_id: item.hook_id,
      quote_id: item.quote_id,
      content_pillar: pillar,
      collection: item.collection,
      status: 'filming_needed',
      batch_id: batch.id,
      filming_notes: item.notes,
    });
  }

  return batch.id;
}

/**
 * Mark a batch as filmed
 */
export async function markBatchFilmed(batchId: string): Promise<boolean> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  // Update batch status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('tiktok_filming_batches')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', batchId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Failed to mark batch filmed:', error);
    return false;
  }

  // Update queue items
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('tiktok_queue')
    .update({ status: 'filmed' })
    .eq('batch_id', batchId)
    .eq('user_id', user.id);

  return true;
}

/**
 * Get upcoming filming batches
 */
export async function getUpcomingBatches(): Promise<
  {
    id: string;
    batch_name: string;
    week_of: string;
    target_count: number;
    videos_filmed: number;
    status: string;
  }[]
> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('tiktok_filming_batches')
    .select('*')
    .eq('user_id', user.id)
    .in('status', ['planned', 'filming'])
    .order('week_of', { ascending: true })
    .limit(10);

  return data || [];
}

// ============================================================================
// Helpers
// ============================================================================

function getAudioMood(collection?: string): string {
  const moods: Record<string, string> = {
    grounding: 'soft_calming',
    wholeness: 'emotional_uplifting',
    growth: 'inspiring_motivational',
  };
  return moods[collection || ''] || 'soft_emotional';
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Export filming list as printable markdown
 */
export function exportFilmingListMarkdown(list: BatchFilmingList): string {
  let md = `# TikTok Filming List\n`;
  md += `**Week of:** ${list.week_of}\n`;
  md += `**Videos Needed:** ${list.total_videos_needed}\n`;
  md += `**Estimated Time:** ${list.estimated_time}\n\n`;

  md += `---\n\n`;

  for (const batch of list.batches) {
    md += `## ${batch.batch_name} (${batch.count} videos)\n\n`;
    md += `**Setup:** ${batch.setup}\n`;
    if (batch.lighting_tips) {
      md += `**Lighting:** ${batch.lighting_tips}\n`;
    }
    if (batch.equipment_needed) {
      md += `**Equipment:** ${batch.equipment_needed.join(', ')}\n`;
    }
    md += `\n`;

    md += `### Videos to Film\n\n`;
    for (let i = 0; i < batch.items.length; i++) {
      const item = batch.items[i];
      md += `#### ${i + 1}. ${item.topic || item.quote_text || 'Video'}\n`;
      if (item.suggested_hook) {
        md += `- **Hook:** "${item.suggested_hook}"\n`;
      }
      if (item.collection) {
        md += `- **Collection:** ${item.collection}\n`;
      }
      if (item.shot_list) {
        md += `- **Shots:** ${item.shot_list.join(' → ')}\n`;
      }
      if (item.script_outline) {
        md += `- **Outline:** ${item.script_outline.join(' | ')}\n`;
      }
      if (item.duration_target) {
        md += `- **Duration:** ${item.duration_target}\n`;
      }
      if (item.notes) {
        md += `- **Notes:** ${item.notes}\n`;
      }
      md += `- [ ] Filmed\n\n`;
    }

    if (batch.filming_tips) {
      md += `### Tips\n`;
      for (const tip of batch.filming_tips) {
        md += `- ${tip}\n`;
      }
      md += `\n`;
    }

    md += `---\n\n`;
  }

  md += `## General Tips\n`;
  for (const tip of list.filming_tips) {
    md += `- ${tip}\n`;
  }

  return md;
}
