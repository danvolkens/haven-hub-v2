export const colors = {
  // Primary
  sage: {
    DEFAULT: '#8FA889',
    light: '#B8CCAE',
    pale: '#E8F0E5',
  },
  charcoal: '#2D3E4A',

  // Secondary
  teal: {
    DEFAULT: '#5F9EA0',
    focus: '#4A9B9B',
  },

  // Accents
  sand: '#D4C4B0',
  clay: '#C4A69D',

  // Functional
  success: '#5B8A72',
  warning: '#D4A574',
  error: '#C4706C',
  info: '#6A9CAE',

  // Backgrounds
  canvas: '#FAFAF8',
  surface: '#FFFFFF',
  elevated: '#F5F6F3',

  // Collection Tints
  grounding: '#F0F4EE',
  wholeness: '#F8F5F0',
  growth: '#F5F2EF',

  // Borders
  border: '#E8E9E6',
  borderStrong: '#D1D3CF',

  // Text
  text: {
    primary: '#2D3E4A',
    secondary: '#5A6B7A',
    tertiary: '#8A9BAA',
    inverse: '#FFFFFF',
  },
} as const;

export const typography = {
  fontFamily: {
    primary: "'Inter', system-ui, -apple-system, sans-serif",
    mono: "'JetBrains Mono', 'SF Mono', monospace",
  },
  fontSize: {
    'display-lg': { size: '36px', lineHeight: '44px', weight: 600 },
    'display': { size: '30px', lineHeight: '38px', weight: 600 },
    'h1': { size: '24px', lineHeight: '32px', weight: 600 },
    'h2': { size: '20px', lineHeight: '28px', weight: 600 },
    'h3': { size: '16px', lineHeight: '24px', weight: 600 },
    'h4': { size: '14px', lineHeight: '20px', weight: 600 },
    'body-lg': { size: '16px', lineHeight: '24px', weight: 400 },
    'body': { size: '14px', lineHeight: '20px', weight: 400 },
    'body-sm': { size: '13px', lineHeight: '18px', weight: 400 },
    'caption': { size: '12px', lineHeight: '16px', weight: 400 },
    'overline': { size: '11px', lineHeight: '16px', weight: 500, letterSpacing: '0.05em' },
    'metric': { size: '28px', lineHeight: '32px', weight: 600 },
  },
} as const;

export const spacing = {
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
} as const;

export const shadows = {
  'elevation-1': '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
  'elevation-2': '0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)',
  'elevation-3': '0 10px 15px rgba(0,0,0,0.07), 0 4px 6px rgba(0,0,0,0.05)',
} as const;

export const radii = {
  sm: '4px',
  DEFAULT: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
} as const;

// Collection color mappings
export const collectionColors = {
  grounding: {
    bg: colors.grounding,
    accent: colors.sage.DEFAULT,
    text: colors.charcoal,
  },
  wholeness: {
    bg: colors.wholeness,
    accent: colors.sand,
    text: colors.charcoal,
  },
  growth: {
    bg: colors.growth,
    accent: colors.clay,
    text: colors.charcoal,
  },
} as const;

export type Collection = keyof typeof collectionColors;
