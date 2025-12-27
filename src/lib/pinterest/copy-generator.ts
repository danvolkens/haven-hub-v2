/**
 * Auto-generate Pinterest pin titles and descriptions
 * Based on quote metadata, collection, mood, and temporal context
 */

export interface QuoteMetadata {
  quote_text: string;
  mantra_text?: string;
  collection: 'grounding' | 'wholeness' | 'growth';
  mood?: string;
  product_version?: 'minimal' | 'full_mantra';
}

export interface GeneratedCopy {
  title: string;
  description: string;
  alt_text: string;
  hashtags: string[];
}

// Collection-specific messaging hooks
const COLLECTION_HOOKS: Record<string, string[]> = {
  grounding: [
    'Find your anchor',
    'Steady yourself',
    'Come back to center',
    'Your foundation matters',
    'Roots before branches',
    'Present moment living',
    'Stay rooted',
  ],
  wholeness: [
    'You are already complete',
    'Embrace all of you',
    'Nothing to fix, only to accept',
    'Your wholeness awaits',
    'Permission to be',
    'Radical self-acceptance',
    'All parts welcome',
  ],
  growth: [
    'Becoming takes time',
    "You're still unfolding",
    "Growth isn't linear",
    'Trust the process',
    'One step, then another',
    'Bloom at your own pace',
    'Progress over perfection',
  ],
};

const MOOD_DESCRIPTORS: Record<string, string[]> = {
  calm: ['peaceful', 'serene', 'tranquil', 'soothing', 'gentle'],
  warm: ['comforting', 'nurturing', 'gentle', 'soft', 'cozy'],
  hopeful: ['uplifting', 'inspiring', 'encouraging', 'bright', 'optimistic'],
  reflective: ['contemplative', 'thoughtful', 'introspective', 'mindful', 'meditative'],
  empowering: ['strong', 'bold', 'confident', 'affirming', 'powerful'],
  neutral: ['minimalist', 'clean', 'simple', 'elegant', 'timeless'],
};

const ROOM_CONTEXTS = [
  'bedroom sanctuary',
  'therapy office',
  'reading nook',
  'home office',
  'meditation corner',
  'living room',
  'nursery',
  'yoga space',
];

// Collection-specific hashtags
const COLLECTION_HASHTAGS: Record<string, string[]> = {
  grounding: [
    'grounding',
    'presentmoment',
    'mindfulness',
    'innerpeace',
    'staygrounded',
    'mindfulart',
  ],
  wholeness: [
    'selfacceptance',
    'wholeness',
    'selflove',
    'innerwork',
    'healingjourney',
    'selfcompassion',
  ],
  growth: [
    'personalgrowth',
    'growthjourney',
    'selfimprovement',
    'becomingmyself',
    'progressnotperfection',
    'mindsetshift',
  ],
};

// Universal hashtags for all pins
const UNIVERSAL_HASHTAGS = [
  'wallart',
  'homedecor',
  'minimalistdecor',
  'quoteart',
  'printableart',
  'therapyoffice',
  'mentalhealthawareness',
];

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function generateTitle(quote: QuoteMetadata, hook: string): string {
  const templates = [
    `${hook} | Minimalist Quote Print`,
    `"${truncate(quote.quote_text, 50)}" | Wall Art`,
    `${capitalize(quote.collection)} Collection | ${hook}`,
    `Therapeutic Wall Art | ${hook}`,
    `${hook} | Quote Print for Home`,
    `Mindful Wall Decor | ${hook}`,
  ];

  const title = getRandomItem(templates);
  return truncate(title, 100);
}

function generateDescription(quote: QuoteMetadata, mood: string, room: string): string {
  const quotePreview = truncate(quote.quote_text, 80);

  const templates = [
    `"${quotePreview}"

This ${mood} minimalist print brings intention to your ${room}. Part of our ${capitalize(quote.collection)} Collection - designed for those seeking quiet anchors in turbulent times.

Available in multiple sizes (8x10 to 24x36)
Print-ready 300 DPI
Instant digital download

Perfect for therapy offices, bedrooms, and spaces that hold you.`,

    `"${quotePreview}"

A ${mood} reminder for your ${room}. This mindful wall art from our ${capitalize(quote.collection)} Collection creates a sanctuary of intention wherever you place it.

Includes multiple sizes
Professional 300 DPI quality
Instant download after purchase

Designed for meaningful spaces.`,

    `"${quotePreview}"

Transform your ${room} with this ${mood} piece from the ${capitalize(quote.collection)} Collection. Simple words. Powerful impact.

Multiple sizes included
High-quality 300 DPI
Digital download - print at home or local print shop

For the moments when you need a gentle reminder.`,
  ];

  const description = getRandomItem(templates);
  return truncate(description, 500);
}

function generateHashtags(quote: QuoteMetadata): string[] {
  const collectionTags = COLLECTION_HASHTAGS[quote.collection] || COLLECTION_HASHTAGS.grounding;

  // Select 3-4 collection-specific tags
  const selectedCollectionTags = collectionTags.slice(0, 3 + Math.floor(Math.random() * 2));

  // Select 4-5 universal tags
  const selectedUniversalTags = UNIVERSAL_HASHTAGS.slice(0, 4 + Math.floor(Math.random() * 2));

  // Add mood-specific tag if available
  const moodTags: string[] = [];
  if (quote.mood && MOOD_DESCRIPTORS[quote.mood]) {
    moodTags.push(quote.mood.toLowerCase().replace(/\s+/g, ''));
  }

  return [...selectedCollectionTags, ...selectedUniversalTags, ...moodTags];
}

export function generatePinCopy(quote: QuoteMetadata): GeneratedCopy {
  const hooks = COLLECTION_HOOKS[quote.collection] || COLLECTION_HOOKS.grounding;
  const moodKey = quote.mood?.toLowerCase() || 'neutral';
  const moods = MOOD_DESCRIPTORS[moodKey] || MOOD_DESCRIPTORS.neutral;

  // Select random elements for variety
  const hook = getRandomItem(hooks);
  const mood = getRandomItem(moods);
  const room = getRandomItem(ROOM_CONTEXTS);

  // Generate title (max 100 chars for Pinterest)
  const title = generateTitle(quote, hook);

  // Generate description (max 500 chars)
  const description = generateDescription(quote, mood, room);

  // Generate alt text for accessibility
  const alt_text = `Minimalist quote print: "${truncate(quote.quote_text, 100)}" - ${mood} wall art for ${room}`;

  // Generate hashtags
  const hashtags = generateHashtags(quote);

  return { title, description, alt_text, hashtags };
}

// Apply a copy template to quote metadata
export function applyTemplate(
  template: {
    title_template: string;
    description_template: string;
  },
  variables: {
    quote?: string;
    collection?: string;
    mood?: string;
    product_link?: string;
    shop_name?: string;
  }
): { title: string; description: string } {
  const replaceVariables = (text: string): string => {
    return text
      .replace(/\{quote\}/g, variables.quote || '')
      .replace(/\{collection\}/g, variables.collection || '')
      .replace(/\{mood\}/g, variables.mood || '')
      .replace(/\{product_link\}/g, variables.product_link || '')
      .replace(/\{shop_name\}/g, variables.shop_name || 'Haven & Hold');
  };

  return {
    title: truncate(replaceVariables(template.title_template), 100),
    description: truncate(replaceVariables(template.description_template), 500),
  };
}
