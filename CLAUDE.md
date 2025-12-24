# Haven Hub v2

## Overview
Haven Hub v2 is a Pinterest-first marketing automation platform for Shopify stores selling quote-based products.

**Repository:** https://github.com/danvolkens/haven-hub-v2

## Build Status
This project is being built automatically using Claude Code.

**Current Phase:** Automated Build  
**Plans Location:** `./plans/haven-hub-plan-part*.md`

## Tech Stack
- **Framework:** Next.js 15 (App Router) with React Compiler
- **Database:** Supabase (PostgreSQL + Auth + Realtime)
- **Styling:** Tailwind CSS + Custom Design System
- **State:** TanStack Query (React Query)
- **Background Jobs:** Trigger.dev
- **Storage:** Cloudflare R2
- **Cache:** Upstash Redis
- **Email:** Resend + Klaviyo

## React Compiler
This project uses React Compiler (enabled in next.config.ts). This means:
- No need for manual `useMemo`, `useCallback`, or `React.memo`
- The compiler auto-optimizes re-renders
- If you see these in plans, they're harmless but redundant

## Project Structure
```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Auth pages (login, register)
│   ├── (dashboard)/        # Protected dashboard routes
│   ├── (public)/           # Public pages (quiz, landing pages)
│   └── api/                # API routes
├── components/             # React components
│   ├── ui/                 # Base UI components
│   └── [domain]/           # Domain-specific components
├── lib/                    # Utilities and services
│   ├── supabase/           # Supabase client
│   └── [service]/          # Service modules
├── hooks/                  # Custom React hooks
└── types/                  # TypeScript definitions

# Outside src/
├── trigger/                # Trigger.dev tasks
├── supabase/
│   └── migrations/         # Database migrations
└── plans/                  # Implementation plans
```

## Important: src/ Directory
All application code lives in `src/`. When the plans reference paths like:
- `app/` → means `src/app/`
- `components/` → means `src/components/`
- `lib/` → means `src/lib/`
- `hooks/` → means `src/hooks/`
- `types/` → means `src/types/`

Only `trigger/`, `supabase/`, and `plans/` remain at root level.

## Commands
```bash
# Development
npm run dev

# Build
npm run build

# Database
npx supabase db push      # Push migrations
npx supabase db reset     # Reset database

# Type generation
npx supabase gen types typescript --local > src/types/supabase.ts
```

## Patterns

### API Routes
```typescript
// src/app/api/example/route.ts
// Always check auth first
const { data: { user }, error } = await supabase.auth.getUser();
if (error || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Data Fetching (Client)
```typescript
// Use React Query hooks - no useCallback needed with React Compiler
const { data, isLoading } = useQuery({
  queryKey: ['resource', id],
  queryFn: () => fetch(`/api/resource/${id}`).then(r => r.json())
});
```

### Mutations
```typescript
const mutation = useMutation({
  mutationFn: (data) => fetch('/api/resource', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resource'] })
});
```

### Supabase Client
```typescript
// Server components/API routes
import { createClient } from '@/lib/supabase/server';
const supabase = await createClient();

// Client components
import { createClient } from '@/lib/supabase/client';
const supabase = createClient();
```

## Path Aliases
The `@/` alias points to `src/`:
- `@/components/ui/button` → `src/components/ui/button.tsx`
- `@/lib/supabase/client` → `src/lib/supabase/client.ts`
- `@/hooks/use-approvals` → `src/hooks/use-approvals.ts`

## Migrations
Migrations are numbered and must be run in order:
- `001_users.sql` - User settings and activity
- `002_integrations.sql` - OAuth and API credentials
- `003_approvals.sql` - Approval queue
- `004_retry_queue.sql` - Error retry system
- `005_export.sql` - Data exports (if separate)
- `006_quotes.sql` - Quotes)` - Quotes and assets
- `007_mockups.sql` - Dynamic mockups
- `008_products.sql` - Shopify products
- `009_pinterest.sql` - Pinterest boards and pins
- `010_leads.sql` - Lead capture
- `011_quiz.sql` - Quiz system
- `011a_popups.sql` - Popup system
- `012_abandonment.sql` - Cart abandonment
- `013_customers.sql` - Customer journey
- `014_winback.sql` - Win-back campaigns
- `015_loyalty.sql` - Loyalty program
- `016a_gifts.sql` - Gifting system
- `016b_coupons.sql` - Coupon manager
- `017_attribution.sql` - Attribution tracking
- `018_campaigns.sql` - Campaign management
- `018a_link_in_bio.sql` - Link in bio
- `018b_cross_platform.sql` - Cross-platform content
- `019_intelligence.sql` - AI insights
- `020_digest.sql` - Daily digest

## Environment Variables
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Integrations
SHOPIFY_CLIENT_ID=
SHOPIFY_CLIENT_SECRET=
PINTEREST_CLIENT_ID=
PINTEREST_CLIENT_SECRET=
KLAVIYO_API_KEY=
ANTHROPIC_API_KEY=
RESEND_API_KEY=
DYNAMIC_MOCKUPS_API_KEY=

# Storage
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=

# Cache
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Trigger.dev
TRIGGER_API_KEY=
TRIGGER_API_URL=
```

## Notes for Claude

### CRITICAL: src/ Directory Mapping
The plan files were written without the `src/` prefix. When implementing:
- `app/` in plans → create in `src/app/`
- `components/` in plans → create in `src/components/`
- `lib/` in plans → create in `src/lib/`
- `hooks/` in plans → create in `src/hooks/`
- `types/` in plans → create in `src/types/`

Only these stay at root (no src/ prefix):
- `trigger/` → `trigger/`
- `supabase/migrations/` → `supabase/migrations/`
- `plans/` → `plans/`

### Known Type Issues & Fixes

**Supabase table not in types:**
```typescript
// Error: Argument of type '...' is not assignable to parameter of type 'never'
// Fix: Cast supabase client
const { data } = await (supabase as any)
  .from('table_name')
  .select('*');
```

**Missing React Query types:**
```typescript
// Add explicit return type
const { data } = useQuery<MyType[]>({
  queryKey: ['key'],
  queryFn: async () => { ... }
});
```

**Import path errors:**
```typescript
// All imports use @/ which maps to src/
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
```

### Common Build Fixes

| Error | Fix |
|-------|-----|
| `Cannot find module '@/...'` | Check file exists in `src/` |
| `Type 'never'` on Supabase | Use `as any` cast |
| `Property does not exist` | Add to type definition or use `as any` |
| `Module not found: canvas` | OK to skip, use sharp only |

### Implementation Guidelines
- Create files exactly as shown in plans
- Run `npm run build` after each step
- Run `npx supabase db push` after migrations
- Fix errors before moving to next step
- Commit after each successful step

### React Compiler
This project uses React Compiler. No need for manual `useMemo`, `useCallback`, or `React.memo` - they're auto-optimized. If plans include them, implement as written (they become no-ops).
