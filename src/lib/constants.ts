// Collections
export const COLLECTIONS = ['grounding', 'wholeness', 'growth'] as const;
export type Collection = (typeof COLLECTIONS)[number];

// Moods (per spec Feature 7)
export const MOODS = ['calm', 'warm', 'hopeful', 'reflective', 'empowering'] as const;
export type Mood = (typeof MOODS)[number];

// Intensity levels
export const INTENSITY_LEVELS = [1, 2, 3, 4, 5] as const;
export type Intensity = (typeof INTENSITY_LEVELS)[number];

// Operator modes
export const OPERATOR_MODES = ['supervised', 'assisted', 'autopilot'] as const;
export type OperatorMode = (typeof OPERATOR_MODES)[number];

// Approval item types
export const APPROVAL_ITEM_TYPES = ['asset', 'mockup', 'pin', 'ugc', 'product'] as const;
export type ApprovalItemType = (typeof APPROVAL_ITEM_TYPES)[number];

// Approval statuses
export const APPROVAL_STATUSES = ['pending', 'approved', 'rejected', 'skipped', 'processing'] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

// Pin statuses
export const PIN_STATUSES = ['draft', 'scheduled', 'publishing', 'published', 'failed'] as const;
export type PinStatus = (typeof PIN_STATUSES)[number];

// Print sizes per spec Feature 7
export const PRINT_SIZES = {
  // 4:5 ratio
  '8x10': { width: 8, height: 10, ratio: '4:5', pixels: { width: 2400, height: 3000 } },
  '11x14': { width: 11, height: 14, ratio: '4:5', pixels: { width: 3300, height: 4200 } },
  '16x20': { width: 16, height: 20, ratio: '4:5', pixels: { width: 4800, height: 6000 } },
  // 3:4 ratio
  '12x16': { width: 12, height: 16, ratio: '3:4', pixels: { width: 3600, height: 4800 } },
  '18x24': { width: 18, height: 24, ratio: '3:4', pixels: { width: 5400, height: 7200 } },
  // 2:3 ratio
  '12x18': { width: 12, height: 18, ratio: '2:3', pixels: { width: 3600, height: 5400 } },
  '16x24': { width: 16, height: 24, ratio: '2:3', pixels: { width: 4800, height: 7200 } },
  '24x36': { width: 24, height: 36, ratio: '2:3', pixels: { width: 7200, height: 10800 } },
  // ISO sizes
  'A4': { width: 8.27, height: 11.69, ratio: '1:1.41', pixels: { width: 2480, height: 3508 } },
  'A3': { width: 11.69, height: 16.54, ratio: '1:1.41', pixels: { width: 3508, height: 4961 } },
} as const;

export type PrintSize = keyof typeof PRINT_SIZES;

// Social formats per spec Feature 7
export const SOCIAL_FORMATS = {
  pinterest: { width: 1000, height: 1500, ratio: '2:3', name: 'Pinterest Portrait' },
  instagram_post: { width: 1080, height: 1350, ratio: '4:5', name: 'Instagram Post' },
  instagram_story: { width: 1080, height: 1920, ratio: '9:16', name: 'Instagram Story' },
} as const;

export type SocialFormat = keyof typeof SOCIAL_FORMATS;

// Mockup scenes per spec Feature 10
export const MOCKUP_SCENES = [
  'bedroom',
  'therapy_office',
  'living_room',
  'reading_nook',
  'home_office',
] as const;

export type MockupScene = (typeof MOCKUP_SCENES)[number];

// Temporal tags per spec Feature 41
export const TEMPORAL_TAGS = {
  time_of_day: ['morning', 'afternoon', 'evening'],
  day_of_week: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'weekday', 'weekend'],
  seasonal: ['spring', 'summer', 'fall', 'winter'],
  special: [
    'new_year',
    'valentines',
    'mothers_day',
    'fathers_day',
    'thanksgiving',
    'christmas',
    'mental_health_awareness_month', // May
    'suicide_prevention_month', // September
    'self_care_september',
  ],
} as const;

// Guardrail defaults per spec Feature 1
export const GUARDRAIL_DEFAULTS = {
  daily_pin_limit: 5,
  weekly_ad_spend_cap: 100,
  monthly_ad_spend_cap: null,
  annual_mockup_budget: 3500,
  monthly_mockup_soft_limit: 292, // ~3500/12
  auto_retire_days: 7,
  abandonment_window_hours: 1,
  duplicate_content_days: 30,
} as const;

// Alert thresholds per spec Feature 22
export const ALERT_THRESHOLDS = {
  viral_impressions: 1000,
  high_performer_engagement: 0.08, // 8%
  underperformer_ctr: 0.02, // 2%
  conversion_winner_purchases: 5,
  underperformer_impressions_min: 500,
  underperformer_days_min: 14,
} as const;

// Email performance thresholds per spec Feature 32
export const EMAIL_THRESHOLDS = {
  low_open_rate: 0.20, // 20%
  low_click_rate: 0.02, // 2%
} as const;

// Discount codes per spec Feature 30
export const SEGMENT_DISCOUNT_CODES = {
  grounding: 'GROUNDED15',
  wholeness: 'WHOLE15',
  growth: 'GROW15',
} as const;

// Referral rewards per spec Feature 34
export const REFERRAL_REWARDS = {
  referrer_credit: 5, // $5
  referee_discount_percent: 15, // 15%
} as const;

// Lead nurturing timing per spec Feature 30
export const NURTURE_SEQUENCE_DAYS = [0, 2, 4, 7] as const;

// Post-purchase timing per spec Feature 31
export const POST_PURCHASE_TIMING = {
  confirmation: 0, // Hour 0
  printing_tips: 2, // Day 2
  photo_request: 7, // Day 7
  review_request: 14, // Day 14
  cross_sell: 30, // Day 30
} as const;

// VIP threshold per spec Feature 31
export const VIP_ORDER_THRESHOLD = 2;

// Win-back tiers per spec Feature 35
export const WINBACK_TIERS = {
  tier1: 60, // days
  tier2: 90,
  tier3: 120,
} as const;

// Quiz question count per spec Feature 25
export const QUIZ_QUESTION_COUNT = 7;
