# Haven Hub: Complete Implementation Task Plan
## Part 1: Phases 1-4 (Foundation through Approval Queue)

---

# Phase 1: Project Foundation

## Step 1.1: Initialize Next.js Project with Core Dependencies

- **Task**: Create the Next.js 14+ project with App Router, install all core dependencies, and configure TypeScript, Tailwind CSS, and ESLint. Set up the complete project structure.

- **Files**:

### `package.json`
```json
{
  "name": "haven-hub",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "db:push": "npx supabase db push",
    "db:gen-types": "npx supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > types/supabase.ts",
    "trigger:dev": "npx trigger.dev@latest dev"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@supabase/supabase-js": "^2.43.0",
    "@supabase/ssr": "^0.3.0",
    "@tanstack/react-query": "^5.45.0",
    "@tanstack/react-query-devtools": "^5.45.0",
    "zod": "^3.23.0",
    "date-fns": "^3.6.0",
    "date-fns-tz": "^3.1.0",
    
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/sortable": "^8.0.0",
    "@dnd-kit/utilities": "^3.2.0",
    "react-hotkeys-hook": "^4.5.0",
    
    "recharts": "^2.12.0",
    "@fullcalendar/core": "^6.1.0",
    "@fullcalendar/react": "^6.1.0",
    "@fullcalendar/daygrid": "^6.1.0",
    "@fullcalendar/interaction": "^6.1.0",
    
    "lucide-react": "^0.378.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.3.0",
    "class-variance-authority": "^0.7.0",
    
    "@upstash/redis": "^1.31.0",
    "@upstash/ratelimit": "^1.2.0",
    
    "@aws-sdk/client-s3": "^3.577.0",
    "@aws-sdk/s3-request-presigner": "^3.577.0",
    
    "@trigger.dev/sdk": "^3.0.0",
    "@trigger.dev/nextjs": "^3.0.0",
    
    "@anthropic-ai/sdk": "^0.24.0",
    
    "sharp": "^0.33.0",
    "canvas": "^2.11.0",
    "archiver": "^7.0.0",
    
    "resend": "^3.2.0",
    "@react-email/components": "^0.0.19",
    
    "crypto-js": "^4.2.0",
    "nanoid": "^5.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.12.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@types/archiver": "^6.0.0",
    "typescript": "^5.4.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^8.57.0",
    "eslint-config-next": "^14.2.0",
    "@typescript-eslint/eslint-plugin": "^7.8.0",
    "@typescript-eslint/parser": "^7.8.0",
    "prettier": "^3.2.0",
    "prettier-plugin-tailwindcss": "^0.5.0",
    "vitest": "^1.6.0",
    "@testing-library/react": "^15.0.0"
  }
}
```

### `tsconfig.json`
```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"],
      "@/components/*": ["./components/*"],
      "@/lib/*": ["./lib/*"],
      "@/hooks/*": ["./hooks/*"],
      "@/contexts/*": ["./contexts/*"],
      "@/types/*": ["./types/*"],
      "@/trigger/*": ["./trigger/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### `tailwind.config.ts`
```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary
        sage: {
          DEFAULT: 'var(--color-sage)',
          light: 'var(--color-sage-light)',
          pale: 'var(--color-sage-pale)',
        },
        charcoal: 'var(--color-charcoal)',
        
        // Secondary
        teal: {
          DEFAULT: 'var(--color-teal)',
          focus: 'var(--color-focus-teal)',
        },
        
        // Accents
        sand: 'var(--color-warm-sand)',
        clay: 'var(--color-soft-clay)',
        
        // Functional
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',
        info: 'var(--color-info)',
        
        // Backgrounds
        canvas: 'var(--color-canvas)',
        surface: 'var(--color-surface)',
        elevated: 'var(--color-elevated)',
        
        // Collection tints
        grounding: 'var(--color-grounding-tint)',
        wholeness: 'var(--color-wholeness-tint)',
        growth: 'var(--color-growth-tint)',
      },
      fontFamily: {
        primary: ['var(--font-primary)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      fontSize: {
        'display-lg': ['36px', { lineHeight: '44px', fontWeight: '600' }],
        'display': ['30px', { lineHeight: '38px', fontWeight: '600' }],
        'h1': ['24px', { lineHeight: '32px', fontWeight: '600' }],
        'h2': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'h3': ['16px', { lineHeight: '24px', fontWeight: '600' }],
        'h4': ['14px', { lineHeight: '20px', fontWeight: '600' }],
        'body-lg': ['16px', { lineHeight: '24px' }],
        'body': ['14px', { lineHeight: '20px' }],
        'body-sm': ['13px', { lineHeight: '18px' }],
        'caption': ['12px', { lineHeight: '16px' }],
        'overline': ['11px', { lineHeight: '16px', fontWeight: '500', letterSpacing: '0.05em' }],
        'metric': ['28px', { lineHeight: '32px', fontWeight: '600' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      boxShadow: {
        'elevation-1': '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
        'elevation-2': '0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)',
        'elevation-3': '0 10px 15px rgba(0,0,0,0.07), 0 4px 6px rgba(0,0,0,0.05)',
      },
      borderRadius: {
        'sm': '4px',
        'DEFAULT': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'slide-down': 'slideDown 0.2s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

### `next.config.js`
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.r2.cloudflarestorage.com',
      },
      {
        protocol: 'https',
        hostname: '*.cloudflare.com',
      },
      {
        protocol: 'https',
        hostname: 'dynamicmockups.com',
      },
      {
        protocol: 'https',
        hostname: '*.dynamicmockups.com',
      },
      {
        protocol: 'https',
        hostname: 'i.pinimg.com',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  webpack: (config) => {
    // Required for canvas package
    config.externals = [...(config.externals || []), { canvas: 'canvas' }];
    return config;
  },
};

module.exports = nextConfig;
```

### `postcss.config.js`
```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### `.eslintrc.json`
```json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "rules": {
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/no-explicit-any": "warn",
    "prefer-const": "error",
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  }
}
```

### `.prettierrc`
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

### `.gitignore`
```
# Dependencies
node_modules
.pnp
.pnp.js

# Testing
coverage

# Next.js
.next/
out/

# Production
build

# Misc
.DS_Store
*.pem

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local env files
.env
.env*.local

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
next-env.d.ts

# Supabase
supabase/.temp

# Trigger.dev
.trigger
```

### `app/layout.tsx`
```typescript
import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-primary',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Haven Hub - Marketing Operations Platform',
  description: 'Comprehensive marketing operations platform for Haven & Hold',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-canvas text-charcoal font-primary antialiased">
        {children}
      </body>
    </html>
  );
}
```

### `app/page.tsx`
```typescript
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
```

### `app/globals.css`
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  /* Primary Colors */
  --color-sage: #8FA889;
  --color-charcoal: #2D3E4A;
  
  /* Secondary Colors */
  --color-teal: #5F9EA0;
  --color-sage-light: #B8CCAE;
  --color-sage-pale: #E8F0E5;
  
  /* Accent Colors */
  --color-warm-sand: #D4C4B0;
  --color-soft-clay: #C4A69D;
  --color-focus-teal: #4A9B9B;
  
  /* Functional Colors */
  --color-success: #5B8A72;
  --color-warning: #D4A574;
  --color-error: #C4706C;
  --color-info: #6A9CAE;
  
  /* Background Colors */
  --color-canvas: #FAFAF8;
  --color-surface: #FFFFFF;
  --color-elevated: #F5F6F3;
  
  /* Collection Tints */
  --color-grounding-tint: #F0F4EE;
  --color-wholeness-tint: #F8F5F0;
  --color-growth-tint: #F5F2EF;
  
  /* Border Colors */
  --color-border: #E8E9E6;
  --color-border-strong: #D1D3CF;
  
  /* Text Colors */
  --color-text-primary: #2D3E4A;
  --color-text-secondary: #5A6B7A;
  --color-text-tertiary: #8A9BAA;
  --color-text-inverse: #FFFFFF;
}

@layer base {
  * {
    @apply border-[var(--color-border)];
  }
  
  body {
    @apply text-body;
  }
  
  h1 {
    @apply text-h1;
  }
  
  h2 {
    @apply text-h2;
  }
  
  h3 {
    @apply text-h3;
  }
  
  h4 {
    @apply text-h4;
  }
}

@layer components {
  .btn {
    @apply inline-flex items-center justify-center rounded-md font-medium transition-colors
           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-focus focus-visible:ring-offset-2
           disabled:pointer-events-none disabled:opacity-50;
  }
  
  .btn-primary {
    @apply btn bg-sage text-white hover:bg-sage/90;
  }
  
  .btn-secondary {
    @apply btn border border-sage text-sage hover:bg-sage/10;
  }
  
  .btn-ghost {
    @apply btn text-charcoal hover:bg-elevated;
  }
  
  .btn-destructive {
    @apply btn bg-error text-white hover:bg-error/90;
  }
  
  .input {
    @apply flex h-10 w-full rounded-md border bg-surface px-3 py-2 text-body
           placeholder:text-[var(--color-text-tertiary)]
           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-focus
           disabled:cursor-not-allowed disabled:opacity-50;
  }
  
  .card {
    @apply rounded-lg border bg-surface shadow-elevation-1;
  }
  
  .card-elevated {
    @apply card shadow-elevation-2;
  }
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
  
  .scrollbar-thin {
    scrollbar-width: thin;
    scrollbar-color: var(--color-border-strong) transparent;
  }
  
  .scrollbar-thin::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  
  .scrollbar-thin::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .scrollbar-thin::-webkit-scrollbar-thumb {
    background-color: var(--color-border-strong);
    border-radius: 3px;
  }
}
```

### `.env.local.example`
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Shopify
SHOPIFY_CLIENT_ID=
SHOPIFY_CLIENT_SECRET=
SHOPIFY_WEBHOOK_SECRET=

# Pinterest
PINTEREST_CLIENT_ID=
PINTEREST_CLIENT_SECRET=

# Klaviyo
KLAVIYO_API_KEY=

# Dynamic Mockups
DYNAMIC_MOCKUPS_API_KEY=

# Resend
RESEND_API_KEY=

# Sky Pilot
SKY_PILOT_API_KEY=

# Claude/Anthropic
ANTHROPIC_API_KEY=

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=haven-hub-assets
R2_PUBLIC_URL=https://your-bucket.r2.cloudflarestorage.com

# Upstash Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Trigger.dev
TRIGGER_SECRET_KEY=

# Cron Secret (generate with: openssl rand -hex 32)
CRON_SECRET=
```

- **Step Dependencies**: None
- **User Instructions**: 
  1. Run `npm install`
  2. Copy `.env.local.example` to `.env.local`
  3. Create GitHub repository and push initial commit
  4. Connect to Vercel for deployments

---

## Step 1.2: Configure Design Tokens and Utility Functions

- **Task**: Create TypeScript design tokens for programmatic access and utility functions for styling.

- **Files**:

### `lib/design-tokens.ts`
```typescript
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
```

### `lib/utils.ts`
```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options,
  }).format(d);
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

export function formatDateTime(date: Date | string): string {
  return `${formatDate(date)} at ${formatTime(date)}`;
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(d);
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function generateId(prefix = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`;
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function groupBy<T, K extends string | number>(
  array: T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  return array.reduce(
    (acc, item) => {
      const key = keyFn(item);
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    },
    {} as Record<K, T[]>
  );
}

export function sortBy<T>(
  array: T[],
  keyFn: (item: T) => string | number,
  order: 'asc' | 'desc' = 'asc'
): T[] {
  return [...array].sort((a, b) => {
    const aVal = keyFn(a);
    const bVal = keyFn(b);
    const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return order === 'asc' ? comparison : -comparison;
  });
}

export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  return keys.reduce(
    (acc, key) => {
      if (key in obj) acc[key] = obj[key];
      return acc;
    },
    {} as Pick<T, K>
  );
}

export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj };
  keys.forEach((key) => delete result[key]);
  return result;
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
```

### `lib/constants.ts`
```typescript
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
```

- **Step Dependencies**: Step 1.1
- **User Instructions**: None

---

## Step 1.3: Create Base UI Component Library - Button

- **Task**: Implement the Button component with all variants, sizes, and states.

- **Files**:

### `components/ui/button.tsx`
```typescript
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  `inline-flex items-center justify-center whitespace-nowrap rounded-md text-body font-medium
   transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-focus
   focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50`,
  {
    variants: {
      variant: {
        primary: 'bg-sage text-white hover:bg-sage/90 active:bg-sage/80',
        secondary: 'border border-sage text-sage bg-transparent hover:bg-sage/10 active:bg-sage/20',
        ghost: 'text-charcoal hover:bg-elevated active:bg-elevated/80',
        destructive: 'bg-error text-white hover:bg-error/90 active:bg-error/80',
        link: 'text-sage underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        sm: 'h-8 px-3 text-body-sm gap-1.5',
        md: 'h-10 px-4 gap-2',
        lg: 'h-12 px-6 text-body-lg gap-2.5',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
        'icon-lg': 'h-12 w-12',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isIconOnly = size?.startsWith('icon');
    
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {!isIconOnly && <span className="ml-2">{children}</span>}
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
```

### `components/ui/index.ts`
```typescript
export { Button, buttonVariants, type ButtonProps } from './button';
```

- **Step Dependencies**: Step 1.2
- **User Instructions**: None

---

## Step 1.4: Create Base UI Component Library - Input Components

- **Task**: Implement Input, Textarea, Label, Checkbox, and Switch components.

- **Files**:

### `components/ui/input.tsx`
```typescript
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconClick?: () => void;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, helperText, leftIcon, rightIcon, onRightIconClick, ...props }, ref) => {
    const hasError = !!error;
    
    return (
      <div className="w-full">
        <div className="relative">
          {leftIcon && (
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]">
              {leftIcon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              `flex h-10 w-full rounded-md border bg-surface px-3 py-2 text-body
               placeholder:text-[var(--color-text-tertiary)]
               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-focus
               disabled:cursor-not-allowed disabled:opacity-50`,
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              hasError && 'border-error focus-visible:ring-error',
              className
            )}
            ref={ref}
            aria-invalid={hasError}
            aria-describedby={error ? `${props.id}-error` : helperText ? `${props.id}-helper` : undefined}
            {...props}
          />
          {rightIcon && (
            <div
              className={cn(
                'absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]',
                onRightIconClick && 'cursor-pointer hover:text-charcoal'
              )}
              onClick={onRightIconClick}
            >
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p id={`${props.id}-error`} className="mt-1.5 text-caption text-error">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={`${props.id}-helper`} className="mt-1.5 text-caption text-[var(--color-text-secondary)]">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
```

### `components/ui/textarea.tsx`
```typescript
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  helperText?: string;
  showCharCount?: boolean;
  maxLength?: number;
  autoResize?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, helperText, showCharCount, maxLength, autoResize, onChange, ...props }, ref) => {
    const [charCount, setCharCount] = React.useState(
      typeof props.value === 'string' ? props.value.length : 0
    );
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
    const hasError = !!error;

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCharCount(e.target.value.length);
      
      if (autoResize && textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
      
      onChange?.(e);
    };

    const setRefs = React.useCallback(
      (element: HTMLTextAreaElement | null) => {
        textareaRef.current = element;
        if (typeof ref === 'function') {
          ref(element);
        } else if (ref) {
          ref.current = element;
        }
      },
      [ref]
    );

    return (
      <div className="w-full">
        <textarea
          className={cn(
            `flex min-h-[80px] w-full rounded-md border bg-surface px-3 py-2 text-body
             placeholder:text-[var(--color-text-tertiary)]
             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-focus
             disabled:cursor-not-allowed disabled:opacity-50 resize-y`,
            autoResize && 'resize-none overflow-hidden',
            hasError && 'border-error focus-visible:ring-error',
            className
          )}
          ref={setRefs}
          onChange={handleChange}
          maxLength={maxLength}
          aria-invalid={hasError}
          {...props}
        />
        <div className="mt-1.5 flex justify-between">
          <div>
            {error && <p className="text-caption text-error">{error}</p>}
            {!error && helperText && (
              <p className="text-caption text-[var(--color-text-secondary)]">{helperText}</p>
            )}
          </div>
          {showCharCount && maxLength && (
            <p
              className={cn(
                'text-caption text-[var(--color-text-tertiary)]',
                charCount > maxLength * 0.9 && 'text-warning',
                charCount >= maxLength && 'text-error'
              )}
            >
              {charCount}/{maxLength}
            </p>
          )}
        </div>
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
```

### `components/ui/label.tsx`
```typescript
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  optional?: boolean;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, optional, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          'text-body-sm font-medium text-charcoal peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
          className
        )}
        {...props}
      >
        {children}
        {required && <span className="ml-1 text-error">*</span>}
        {optional && (
          <span className="ml-1 text-caption text-[var(--color-text-tertiary)]">(optional)</span>
        )}
      </label>
    );
  }
);
Label.displayName = 'Label';

export { Label };
```

### `components/ui/checkbox.tsx`
```typescript
import * as React from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
  indeterminate?: boolean;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, indeterminate, id, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    const generatedId = React.useId();
    const checkboxId = id || generatedId;

    React.useEffect(() => {
      if (inputRef.current) {
        inputRef.current.indeterminate = indeterminate || false;
      }
    }, [indeterminate]);

    const setRefs = React.useCallback(
      (element: HTMLInputElement | null) => {
        inputRef.current = element;
        if (typeof ref === 'function') {
          ref(element);
        } else if (ref) {
          ref.current = element;
        }
      },
      [ref]
    );

    return (
      <div className="flex items-start gap-3">
        <div className="relative flex h-5 w-5 shrink-0 items-center justify-center">
          <input
            type="checkbox"
            ref={setRefs}
            id={checkboxId}
            className={cn(
              `peer h-5 w-5 shrink-0 cursor-pointer appearance-none rounded border
               bg-surface transition-colors
               checked:border-sage checked:bg-sage
               indeterminate:border-sage indeterminate:bg-sage
               hover:border-sage/70
               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-focus focus-visible:ring-offset-2
               disabled:cursor-not-allowed disabled:opacity-50`,
              className
            )}
            {...props}
          />
          <Check
            className="pointer-events-none absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100"
            strokeWidth={3}
          />
          <Minus
            className="pointer-events-none absolute h-3.5 w-3.5 text-white opacity-0 peer-indeterminate:opacity-100"
            strokeWidth={3}
          />
        </div>
        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <label
                htmlFor={checkboxId}
                className="cursor-pointer text-body font-medium text-charcoal peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {label}
              </label>
            )}
            {description && (
              <span className="text-body-sm text-[var(--color-text-secondary)]">{description}</span>
            )}
          </div>
        )}
      </div>
    );
  }
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };
```

### `components/ui/switch.tsx`
```typescript
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
  labelPosition?: 'left' | 'right';
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, label, description, labelPosition = 'right', id, ...props }, ref) => {
    const generatedId = React.useId();
    const switchId = id || generatedId;

    const switchElement = (
      <div className="relative inline-flex h-6 w-11 shrink-0">
        <input
          type="checkbox"
          ref={ref}
          id={switchId}
          role="switch"
          className={cn(
            `peer h-6 w-11 cursor-pointer appearance-none rounded-full border-2 border-transparent
             bg-[var(--color-border-strong)] transition-colors
             checked:bg-sage
             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-focus focus-visible:ring-offset-2
             disabled:cursor-not-allowed disabled:opacity-50`,
            className
          )}
          {...props}
        />
        <span
          className={cn(
            `pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm
             transition-transform duration-200 ease-in-out
             peer-checked:translate-x-5`
          )}
        />
      </div>
    );

    const labelElement = (label || description) && (
      <div className="flex flex-col">
        {label && (
          <label
            htmlFor={switchId}
            className="cursor-pointer text-body font-medium text-charcoal"
          >
            {label}
          </label>
        )}
        {description && (
          <span className="text-body-sm text-[var(--color-text-secondary)]">{description}</span>
        )}
      </div>
    );

    return (
      <div className="flex items-center gap-3">
        {labelPosition === 'left' && labelElement}
        {switchElement}
        {labelPosition === 'right' && labelElement}
      </div>
    );
  }
);
Switch.displayName = 'Switch';

export { Switch };
```

### Update `components/ui/index.ts`
```typescript
export { Button, buttonVariants, type ButtonProps } from './button';
export { Input, type InputProps } from './input';
export { Textarea, type TextareaProps } from './textarea';
export { Label, type LabelProps } from './label';
export { Checkbox, type CheckboxProps } from './checkbox';
export { Switch, type SwitchProps } from './switch';
```

- **Step Dependencies**: Step 1.3
- **User Instructions**: None

---

## Step 1.5: Create Base UI Component Library - Select Component

- **Task**: Implement a fully-featured Select component with search, multi-select, and custom rendering.

- **Files**:

### `components/ui/select.tsx`
```typescript
import * as React from 'react';
import { Check, ChevronDown, X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
  placeholder?: string;
  searchable?: boolean;
  multiple?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  renderOption?: (option: SelectOption) => React.ReactNode;
}

export function Select({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  searchable = false,
  multiple = false,
  disabled = false,
  error,
  className,
  renderOption,
}: SelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const selectedValues = React.useMemo(() => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }, [value]);

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return options;
    const query = searchQuery.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) ||
        opt.description?.toLowerCase().includes(query)
    );
  }, [options, searchQuery]);

  const selectedLabels = React.useMemo(() => {
    return selectedValues
      .map((v) => options.find((opt) => opt.value === v)?.label)
      .filter(Boolean)
      .join(', ');
  }, [selectedValues, options]);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  React.useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) setSearchQuery('');
    }
  };

  const handleSelect = (optionValue: string) => {
    if (multiple) {
      const newValues = selectedValues.includes(optionValue)
        ? selectedValues.filter((v) => v !== optionValue)
        : [...selectedValues, optionValue];
      onChange?.(newValues);
    } else {
      onChange?.(optionValue);
      setIsOpen(false);
      setSearchQuery('');
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.(multiple ? [] : '');
  };

  const handleRemoveValue = (valueToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (multiple) {
      onChange?.(selectedValues.filter((v) => v !== valueToRemove));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchQuery('');
    } else if (e.key === 'Enter' && !isOpen) {
      setIsOpen(true);
    }
  };

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <div
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        className={cn(
          `flex min-h-10 w-full cursor-pointer items-center justify-between rounded-md border
           bg-surface px-3 py-2 text-body transition-colors
           hover:border-sage/50
           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-focus`,
          disabled && 'cursor-not-allowed opacity-50',
          error && 'border-error focus-visible:ring-error',
          isOpen && 'ring-2 ring-teal-focus'
        )}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
      >
        <div className="flex flex-1 flex-wrap gap-1">
          {multiple && selectedValues.length > 0 ? (
            selectedValues.map((v) => {
              const option = options.find((opt) => opt.value === v);
              return (
                <span
                  key={v}
                  className="inline-flex items-center gap-1 rounded bg-sage-pale px-2 py-0.5 text-body-sm"
                >
                  {option?.label}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-error"
                    onClick={(e) => handleRemoveValue(v, e)}
                  />
                </span>
              );
            })
          ) : selectedLabels ? (
            <span className="truncate">{selectedLabels}</span>
          ) : (
            <span className="text-[var(--color-text-tertiary)]">{placeholder}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {selectedValues.length > 0 && !disabled && (
            <X
              className="h-4 w-4 text-[var(--color-text-tertiary)] hover:text-charcoal"
              onClick={handleClear}
            />
          )}
          <ChevronDown
            className={cn(
              'h-4 w-4 text-[var(--color-text-tertiary)] transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </div>
      </div>

      {isOpen && (
        <div
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-surface
                     shadow-elevation-2 animate-fade-in"
        >
          {searchable && (
            <div className="sticky top-0 border-b bg-surface p-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full rounded border-none bg-elevated py-1.5 pl-8 pr-3 text-body-sm
                           focus:outline-none focus:ring-1 focus:ring-teal-focus"
                />
              </div>
            </div>
          )}
          <ul role="listbox" className="py-1">
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-2 text-body-sm text-[var(--color-text-tertiary)]">
                No options found
              </li>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = selectedValues.includes(option.value);
                return (
                  <li
                    key={option.value}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={option.disabled}
                    className={cn(
                      `flex cursor-pointer items-center gap-2 px-3 py-2 text-body
                       hover:bg-elevated`,
                      isSelected && 'bg-sage-pale',
                      option.disabled && 'cursor-not-allowed opacity-50'
                    )}
                    onClick={() => !option.disabled && handleSelect(option.value)}
                  >
                    {multiple && (
                      <div
                        className={cn(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                          isSelected && 'border-sage bg-sage'
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                    )}
                    {renderOption ? (
                      renderOption(option)
                    ) : (
                      <div className="flex flex-1 items-center gap-2">
                        {option.icon}
                        <div>
                          <div>{option.label}</div>
                          {option.description && (
                            <div className="text-body-sm text-[var(--color-text-secondary)]">
                              {option.description}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {!multiple && isSelected && (
                      <Check className="h-4 w-4 shrink-0 text-sage" />
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}

      {error && <p className="mt-1.5 text-caption text-error">{error}</p>}
    </div>
  );
}
```

### Update `components/ui/index.ts`
```typescript
export { Button, buttonVariants, type ButtonProps } from './button';
export { Input, type InputProps } from './input';
export { Textarea, type TextareaProps } from './textarea';
export { Label, type LabelProps } from './label';
export { Checkbox, type CheckboxProps } from './checkbox';
export { Switch, type SwitchProps } from './switch';
export { Select, type SelectProps, type SelectOption } from './select';
```

- **Step Dependencies**: Step 1.4
- **User Instructions**: None

---

## Step 1.6: Create Base UI Component Library - Badge and Card

- **Task**: Implement Badge component with all variants and Card component with sections.

- **Files**:

### `components/ui/badge.tsx`
```typescript
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-elevated text-charcoal',
        primary: 'bg-sage text-white',
        secondary: 'bg-sage-pale text-sage',
        success: 'bg-success/10 text-success',
        warning: 'bg-warning/10 text-warning',
        error: 'bg-error/10 text-error',
        info: 'bg-info/10 text-info',
        // Collection variants
        grounding: 'bg-grounding text-charcoal',
        wholeness: 'bg-wholeness text-charcoal',
        growth: 'bg-growth text-charcoal',
        // Outline variants
        outline: 'border bg-transparent text-charcoal',
        'outline-success': 'border border-success bg-transparent text-success',
        'outline-warning': 'border border-warning bg-transparent text-warning',
        'outline-error': 'border border-error bg-transparent text-error',
      },
      size: {
        sm: 'px-2 py-0.5 text-caption',
        md: 'px-2.5 py-0.5 text-body-sm',
        lg: 'px-3 py-1 text-body',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
  dotColor?: string;
  icon?: React.ReactNode;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, dot, dotColor, icon, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, size }), className)}
        {...props}
      >
        {dot && (
          <span
            className="mr-1.5 h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: dotColor || 'currentColor' }}
          />
        )}
        {icon && <span className="mr-1">{icon}</span>}
        {children}
      </span>
    );
  }
);
Badge.displayName = 'Badge';

export { Badge, badgeVariants };
```

### `components/ui/card.tsx`
```typescript
import * as React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'bordered';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', padding = 'md', hoverable = false, ...props }, ref) => {
    const paddingClasses = {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    };

    const variantClasses = {
      default: 'border bg-surface shadow-elevation-1',
      elevated: 'bg-surface shadow-elevation-2',
      bordered: 'border bg-surface',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg',
          variantClasses[variant],
          paddingClasses[padding],
          hoverable && 'transition-shadow hover:shadow-elevation-2',
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = 'Card';

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, title, description, action, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-start justify-between gap-4', className)}
        {...props}
      >
        {children || (
          <>
            <div className="space-y-1">
              {title && <h3 className="text-h3">{title}</h3>}
              {description && (
                <p className="text-body-sm text-[var(--color-text-secondary)]">{description}</p>
              )}
            </div>
            {action}
          </>
        )}
      </div>
    );
  }
);
CardHeader.displayName = 'CardHeader';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn('', className)} {...props} />;
  }
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-center justify-end gap-2 border-t pt-4', className)}
        {...props}
      />
    );
  }
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardContent, CardFooter };
```

### Update `components/ui/index.ts`
```typescript
export { Button, buttonVariants, type ButtonProps } from './button';
export { Input, type InputProps } from './input';
export { Textarea, type TextareaProps } from './textarea';
export { Label, type LabelProps } from './label';
export { Checkbox, type CheckboxProps } from './checkbox';
export { Switch, type SwitchProps } from './switch';
export { Select, type SelectProps, type SelectOption } from './select';
export { Badge, badgeVariants, type BadgeProps } from './badge';
export { Card, CardHeader, CardContent, CardFooter } from './card';
```

- **Step Dependencies**: Step 1.5
- **User Instructions**: None

---

## Step 1.7: Create Base UI Component Library - Modal and Sheet

- **Task**: Implement Modal (Dialog) and Sheet (Slide-out panel) components with focus trap and animations.

- **Files**:

### `components/ui/modal.tsx`
```typescript
import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEsc = true,
  children,
  footer,
}: ModalProps) {
  const modalRef = React.useRef<HTMLDivElement>(null);
  const previousActiveElement = React.useRef<HTMLElement | null>(null);

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]',
  };

  // Handle ESC key
  React.useEffect(() => {
    if (!closeOnEsc || !isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEsc, onClose]);

  // Focus trap
  React.useEffect(() => {
    if (!isOpen) return;

    previousActiveElement.current = document.activeElement as HTMLElement;

    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements?.[0] as HTMLElement;
    const lastElement = focusableElements?.[focusableElements.length - 1] as HTMLElement;

    firstElement?.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTab);

    return () => {
      document.removeEventListener('keydown', handleTab);
      previousActiveElement.current?.focus();
    };
  }, [isOpen]);

  // Prevent body scroll when modal is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-charcoal/50 backdrop-blur-sm animate-fade-in"
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby={description ? 'modal-description' : undefined}
        className={cn(
          `relative z-50 w-full rounded-lg bg-surface shadow-elevation-3 animate-scale-in`,
          sizeClasses[size],
          size !== 'full' && 'mx-4'
        )}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between border-b p-4">
            <div>
              {title && (
                <h2 id="modal-title" className="text-h2">
                  {title}
                </h2>
              )}
              {description && (
                <p id="modal-description" className="mt-1 text-body-sm text-[var(--color-text-secondary)]">
                  {description}
                </p>
              )}
            </div>
            {showCloseButton && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onClose}
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {/* Content */}
        <div className={cn('p-4', size === 'full' && 'overflow-auto max-h-[calc(100vh-12rem)]')}>
          {children}
        </div>

        {/* Footer */}
        {footer && <div className="border-t p-4">{footer}</div>}
      </div>
    </div>
  );
}

// Confirm Modal helper
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  isLoading = false,
}: ConfirmModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'primary'}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      }
    >
      <p className="text-body text-[var(--color-text-secondary)]">{message}</p>
    </Modal>
  );
}
```

### `components/ui/sheet.tsx`
```typescript
import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  side?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Sheet({
  isOpen,
  onClose,
  title,
  description,
  side = 'right',
  size = 'md',
  showCloseButton = true,
  children,
  footer,
}: SheetProps) {
  const sheetRef = React.useRef<HTMLDivElement>(null);

  const sizeClasses = {
    sm: 'w-80',
    md: 'w-96',
    lg: 'w-[480px]',
    xl: 'w-[640px]',
  };

  const slideClasses = {
    left: {
      base: 'left-0',
      enter: 'animate-slide-in-left',
      exit: '-translate-x-full',
    },
    right: {
      base: 'right-0',
      enter: 'animate-slide-in-right',
      exit: 'translate-x-full',
    },
  };

  // Handle ESC key
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-charcoal/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'sheet-title' : undefined}
        className={cn(
          'fixed top-0 h-full bg-surface shadow-elevation-3 flex flex-col',
          sizeClasses[size],
          slideClasses[side].base,
          isOpen ? slideClasses[side].enter : slideClasses[side].exit
        )}
        style={{
          animation: isOpen
            ? `${side === 'right' ? 'slideInRight' : 'slideInLeft'} 0.2s ease-out`
            : undefined,
        }}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between border-b p-4 shrink-0">
            <div>
              {title && (
                <h2 id="sheet-title" className="text-h2">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1 text-body-sm text-[var(--color-text-secondary)]">
                  {description}
                </p>
              )}
            </div>
            {showCloseButton && (
              <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">{children}</div>

        {/* Footer */}
        {footer && <div className="border-t p-4 shrink-0">{footer}</div>}
      </div>

      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        @keyframes slideInLeft {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
```

### Update `components/ui/index.ts`
```typescript
export { Button, buttonVariants, type ButtonProps } from './button';
export { Input, type InputProps } from './input';
export { Textarea, type TextareaProps } from './textarea';
export { Label, type LabelProps } from './label';
export { Checkbox, type CheckboxProps } from './checkbox';
export { Switch, type SwitchProps } from './switch';
export { Select, type SelectProps, type SelectOption } from './select';
export { Badge, badgeVariants, type BadgeProps } from './badge';
export { Card, CardHeader, CardContent, CardFooter } from './card';
export { Modal, ConfirmModal } from './modal';
export { Sheet } from './sheet';
```

- **Step Dependencies**: Step 1.6
- **User Instructions**: None

---

*[Document continues - Part 1 ends here due to length. The remaining steps for Phase 1 (1.8-1.10) and full Phases 2-4 will continue in Part 2]*

---

## Summary of Part 1

**Steps Completed**: 1.1 - 1.7 (7 of 10 Phase 1 steps)

**Files Created**:
- Project configuration (package.json, tsconfig.json, tailwind.config.ts, etc.)
- Design system (globals.css, design-tokens.ts, constants.ts)
- Utility functions (utils.ts)
- UI Components: Button, Input, Textarea, Label, Checkbox, Switch, Select, Badge, Card, Modal, Sheet

**Next in Part 2**:
- Steps 1.8-1.10: Supabase setup, Authentication, Dashboard shell
- Phase 2: Core infrastructure (database schemas, Redis, R2, Trigger.dev, Cron)
- Phase 3: Operator Mode System
- Phase 4: Approval Queue
