/**
 * Instagram Comment Response Suggestions
 * Prompt D.2: AI-assisted comment response suggestions
 *
 * From guide — Don't say generic comments like:
 * - "Love this! 😍"
 * - "Great post!"
 *
 * Instead, generate specific, genuine responses.
 */

// ============================================================================
// Types
// ============================================================================

export type CommentCategory =
  | 'compliment'
  | 'question'
  | 'where_to_buy'
  | 'relatability'
  | 'ugc_share'
  | 'printing_question'
  | 'size_question'
  | 'general';

export interface PostContext {
  postType: 'feed' | 'reel' | 'carousel' | 'story';
  contentPillar: 'product_showcase' | 'brand_story' | 'educational' | 'community';
  collection?: 'grounding' | 'wholeness' | 'growth' | 'general';
  hasQuoteText?: boolean;
  productMentioned?: string;
}

export interface CommentSuggestion {
  id: string;
  category: CommentCategory;
  responseType: 'thank_question' | 'agreement_followup' | 'answer_redirect' | 'validation_suggestion' | 'feature_offer';
  text: string;
  priority: number;
}

export interface CommentAnalysis {
  originalComment: string;
  detectedCategory: CommentCategory;
  sentiment: 'positive' | 'neutral' | 'question';
  suggestions: CommentSuggestion[];
}

// ============================================================================
// Category Detection Patterns
// ============================================================================

const CATEGORY_PATTERNS: Record<CommentCategory, RegExp[]> = {
  compliment: [
    /\b(love|beautiful|gorgeous|amazing|stunning|perfect|incredible|awesome|lovely)\b/i,
    /\b(so good|so pretty|obsessed|need this|want this)\b/i,
    /😍|🥰|❤️|💕|😻|🔥|✨|💗|💜|🤍/,
  ],
  question: [
    /\?$/,
    /\b(how|what|when|where|why|can|could|would|should|do you|is this|are these)\b/i,
  ],
  where_to_buy: [
    /\b(where|how).*(buy|get|purchase|order|find)\b/i,
    /\b(link|shop|store|website|price|cost|buy this)\b/i,
    /\b(need one|want one|how much|take my money)\b/i,
  ],
  relatability: [
    /\b(this is me|that's me|so me|felt this|needed this|i feel|hit different)\b/i,
    /\b(story of my life|my soul|speaking to me|calling me out)\b/i,
    /😭|🥹|💯|👏|🙏|😩/,
  ],
  ugc_share: [
    /\b(just got|received|arrived|hanging|hung up|my wall|in my room|love mine)\b/i,
    /\b(my space|my home|finally|so happy|thank you)\b/i,
    /@\w+.*tag|tag.*@\w+/i,
  ],
  printing_question: [
    /\b(print|printing|frame|framing|paper|quality|resolution|dpi)\b/i,
    /\b(how to print|best way|recommend|tips for printing)\b/i,
  ],
  size_question: [
    /\b(size|sizes|dimensions|how big|what size|8x10|11x14|16x20|24x36)\b/i,
    /\b(fit|fits|fitting|too big|too small)\b/i,
  ],
  general: [],
};

// ============================================================================
// Response Templates
// ============================================================================

const RESPONSE_TEMPLATES: Record<CommentCategory, CommentSuggestion[]> = {
  compliment: [
    {
      id: 'comp-1',
      category: 'compliment',
      responseType: 'thank_question',
      text: "Thank you so much! 🤍 What room are you thinking of putting it in?",
      priority: 1,
    },
    {
      id: 'comp-2',
      category: 'compliment',
      responseType: 'agreement_followup',
      text: "That means so much! 💫 Which collection speaks to you most — Grounding, Wholeness, or Growth?",
      priority: 2,
    },
    {
      id: 'comp-3',
      category: 'compliment',
      responseType: 'thank_question',
      text: "Thank you! 🤍 Have you seen the other quotes in this collection? There are some really special ones.",
      priority: 3,
    },
  ],
  question: [
    {
      id: 'quest-1',
      category: 'question',
      responseType: 'answer_redirect',
      text: "Great question! Check out our printing guide in the bio — it covers everything from file sizes to frame recommendations. 🤍",
      priority: 1,
    },
    {
      id: 'quest-2',
      category: 'question',
      responseType: 'answer_redirect',
      text: "Happy to help! Feel free to DM us and we can walk you through it. 💫",
      priority: 2,
    },
  ],
  where_to_buy: [
    {
      id: 'buy-1',
      category: 'where_to_buy',
      responseType: 'answer_redirect',
      text: "Link is in our bio! 🤍 We have sizes from 8x10 to 24x36 — the 11x14 and 16x20 are our best sellers for this design.",
      priority: 1,
    },
    {
      id: 'buy-2',
      category: 'where_to_buy',
      responseType: 'answer_redirect',
      text: "Shop link in bio! 💫 Not sure which size? Our 2-minute quiz can help you figure out the perfect fit for your space.",
      priority: 2,
    },
    {
      id: 'buy-3',
      category: 'where_to_buy',
      responseType: 'answer_redirect',
      text: "You can find this in our shop — link in bio! 🌿 DM us if you need help choosing the right size for your space.",
      priority: 3,
    },
  ],
  relatability: [
    {
      id: 'relate-1',
      category: 'relatability',
      responseType: 'validation_suggestion',
      text: "That quote hits different, right? 🤍 Some words just find you at the right time.",
      priority: 1,
    },
    {
      id: 'relate-2',
      category: 'relatability',
      responseType: 'validation_suggestion',
      text: "You're not alone in that feeling. 💫 This one is from our {{collection}} collection — all about {{theme}}.",
      priority: 2,
    },
    {
      id: 'relate-3',
      category: 'relatability',
      responseType: 'validation_suggestion',
      text: "We felt that too when we first read it. 🤍 Sometimes words just know exactly what you need to hear.",
      priority: 3,
    },
  ],
  ugc_share: [
    {
      id: 'ugc-1',
      category: 'ugc_share',
      responseType: 'feature_offer',
      text: "This made our day! 😭🤍 It looks AMAZING in your space. Would you be open to us featuring this on our feed? We'd love to share how you styled it!",
      priority: 1,
    },
    {
      id: 'ugc-2',
      category: 'ugc_share',
      responseType: 'feature_offer',
      text: "STOP. This is so beautiful! 🤍 Thank you for sharing — your space is giving major sanctuary vibes. Mind if we feature this?",
      priority: 2,
    },
    {
      id: 'ugc-3',
      category: 'ugc_share',
      responseType: 'thank_question',
      text: "We love seeing Haven & Hold in its new home! 💫 Thank you so much for sharing. Tag us in your stories too — we love to repost!",
      priority: 3,
    },
  ],
  printing_question: [
    {
      id: 'print-1',
      category: 'printing_question',
      responseType: 'answer_redirect',
      text: "Great question! Our files are high-res (300 DPI) so they print beautifully. Check the printing guide in our bio for all the tips! 🤍",
      priority: 1,
    },
    {
      id: 'print-2',
      category: 'printing_question',
      responseType: 'answer_redirect',
      text: "We recommend photo paper or matte cardstock for best results. Our bio has a full printing guide with recommendations for local print shops and online options! 💫",
      priority: 2,
    },
  ],
  size_question: [
    {
      id: 'size-1',
      category: 'size_question',
      responseType: 'answer_redirect',
      text: "We offer sizes from 8x10 up to 24x36! 🤍 For bedroom/office, 11x14 or 16x20 work great. For statement pieces, go 18x24 or bigger!",
      priority: 1,
    },
    {
      id: 'size-2',
      category: 'size_question',
      responseType: 'answer_redirect',
      text: "The 16x20 is our most popular for this design! 💫 If you're doing a gallery wall, mixing 8x10s with a larger 11x14 center piece looks amazing.",
      priority: 2,
    },
  ],
  general: [
    {
      id: 'gen-1',
      category: 'general',
      responseType: 'thank_question',
      text: "Thank you for being here! 🤍 Anything we can help you with?",
      priority: 1,
    },
    {
      id: 'gen-2',
      category: 'general',
      responseType: 'agreement_followup',
      text: "We love hearing from you! 💫 If you ever have questions about our prints, just ask.",
      priority: 2,
    },
  ],
};

// Collection themes for variable replacement
const COLLECTION_THEMES: Record<string, string> = {
  grounding: 'finding safety and stability',
  wholeness: 'accepting all parts of yourself',
  growth: 'moving forward and transformation',
  general: 'creating your sanctuary',
};

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Detect the category of a comment
 */
export function detectCommentCategory(comment: string): CommentCategory {
  const normalizedComment = comment.toLowerCase().trim();

  // Check each category's patterns
  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    if (category === 'general') continue; // Skip general, it's the fallback

    for (const pattern of patterns) {
      if (pattern.test(normalizedComment)) {
        return category as CommentCategory;
      }
    }
  }

  return 'general';
}

/**
 * Detect sentiment of a comment
 */
export function detectSentiment(comment: string): 'positive' | 'neutral' | 'question' {
  const normalizedComment = comment.toLowerCase().trim();

  // Check for question markers
  if (normalizedComment.includes('?') || /\b(how|what|when|where|why|can|could)\b/i.test(normalizedComment)) {
    return 'question';
  }

  // Check for positive indicators
  const positivePatterns = [
    /\b(love|amazing|beautiful|gorgeous|perfect|awesome|incredible|great|wonderful)\b/i,
    /😍|🥰|❤️|💕|😻|🔥|✨|💗|💜|🤍|👏|🙌|💯/,
  ];

  for (const pattern of positivePatterns) {
    if (pattern.test(normalizedComment)) {
      return 'positive';
    }
  }

  return 'neutral';
}

/**
 * Generate comment response suggestions
 */
export function suggestCommentResponse(
  comment: string,
  context?: PostContext
): CommentAnalysis {
  const category = detectCommentCategory(comment);
  const sentiment = detectSentiment(comment);

  // Get base templates for the category
  let suggestions = [...RESPONSE_TEMPLATES[category]];

  // If no category-specific templates, use general
  if (suggestions.length === 0) {
    suggestions = [...RESPONSE_TEMPLATES.general];
  }

  // Replace variables based on context
  if (context?.collection && context.collection !== 'general') {
    suggestions = suggestions.map((suggestion) => ({
      ...suggestion,
      text: suggestion.text
        .replace('{{collection}}', context.collection!)
        .replace('{{theme}}', COLLECTION_THEMES[context.collection!] || COLLECTION_THEMES.general),
    }));
  }

  // Sort by priority and limit to top 3
  suggestions = suggestions
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 3);

  // Generate unique IDs for this analysis
  suggestions = suggestions.map((s, i) => ({
    ...s,
    id: `${category}-${Date.now()}-${i}`,
  }));

  return {
    originalComment: comment,
    detectedCategory: category,
    sentiment,
    suggestions,
  };
}

/**
 * Get all available response templates
 */
export function getAllResponseTemplates(): Record<CommentCategory, CommentSuggestion[]> {
  return RESPONSE_TEMPLATES;
}

/**
 * Get a quick response for a specific category
 */
export function getQuickResponse(category: CommentCategory): string {
  const templates = RESPONSE_TEMPLATES[category];
  if (templates.length === 0) {
    return RESPONSE_TEMPLATES.general[0]?.text || "Thank you! 🤍";
  }
  return templates[0].text;
}

/**
 * Check if a response is generic (to avoid)
 */
export function isGenericResponse(response: string): boolean {
  const genericPatterns = [
    /^love this!?\s*$/i,
    /^great post!?\s*$/i,
    /^nice!?\s*$/i,
    /^beautiful!?\s*$/i,
    /^amazing!?\s*$/i,
    /^so good!?\s*$/i,
    /^🔥+$/,
    /^❤️+$/,
    /^😍+$/,
  ];

  for (const pattern of genericPatterns) {
    if (pattern.test(response.trim())) {
      return true;
    }
  }

  return false;
}

/**
 * Validate response before posting
 */
export function validateResponse(response: string): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  if (isGenericResponse(response)) {
    warnings.push('This response seems generic. Consider adding a question or personal touch.');
  }

  if (response.length < 10) {
    warnings.push('Response is quite short. Consider adding more detail.');
  }

  if (response.length > 2200) {
    warnings.push('Response exceeds Instagram character limit (2200). Please shorten.');
  }

  // Check for unreplaced variables
  if (/\{\{.*\}\}/.test(response)) {
    warnings.push('Response contains unreplaced variables. Please fill in the blanks.');
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}
