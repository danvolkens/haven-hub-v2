# Build Prompt: Email Template Seed Button

## Context

Haven Hub has a complete email content library (19 emails across 5 flows) hardcoded in `/api/email-workflows/seed/route.ts`. The seed API exists and works:

- `POST /api/email-workflows/seed` — Seeds all Haven & Hold branded email templates to the database
- `GET /api/email-workflows/seed` — Returns seed status (what's seeded vs missing)

**Problem:** There's no UI button to trigger the seed. Users have to call the API manually.

## Task

Add a "Seed Email Templates" section to the Email Setup page that:

1. Shows current seed status (seeded vs missing per flow)
2. Provides a button to seed all templates
3. Shows progress/success feedback

## Files to Modify

**Primary file:**
`/src/app/(dashboard)/dashboard/email/setup/page.tsx`

## Implementation

### 1. Add seed status query

```typescript
// Add to existing queries
const { data: seedStatus, isLoading: seedLoading, refetch: refetchSeed } = useQuery({
  queryKey: ['email-seed-status'],
  queryFn: () => api.get<{
    status: Record<string, { total: number; existing: number; expected: number }>;
    summary: { total_expected: number; total_existing: number; is_complete: boolean };
  }>('/api/email-workflows/seed'),
});
```

### 2. Add seed mutation

```typescript
const seedMutation = useMutation({
  mutationFn: () => api.post('/api/email-workflows/seed', {}),
  onSuccess: (data) => {
    toast({
      title: 'Templates Seeded',
      description: data.message || 'Email templates have been seeded successfully.',
      variant: 'success',
    });
    refetchSeed();
    queryClient.invalidateQueries({ queryKey: ['email-templates'] });
  },
  onError: (error: any) => {
    toast({
      title: 'Seed Failed',
      description: error.message || 'Failed to seed email templates.',
      variant: 'destructive',
    });
  },
});
```

### 3. Add UI section (after the Lists section, before Flows)

```tsx
{/* Email Templates Seed Section */}
<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center',
          seedStatus?.summary?.is_complete 
            ? 'bg-green-100 text-green-600' 
            : 'bg-yellow-100 text-yellow-600'
        )}>
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold">Email Content Templates</h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Pre-written Haven & Hold email content
          </p>
        </div>
      </div>
      {seedStatus?.summary?.is_complete ? (
        <Badge className="bg-green-100 text-green-700">
          <CheckCircle className="h-3 w-3 mr-1" />
          Seeded
        </Badge>
      ) : (
        <Badge className="bg-yellow-100 text-yellow-700">
          {seedStatus?.summary?.total_existing || 0} / {seedStatus?.summary?.total_expected || 0}
        </Badge>
      )}
    </div>
  </CardHeader>
  <CardContent>
    {seedLoading ? (
      <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Checking template status...
      </div>
    ) : (
      <>
        {/* Status per flow */}
        <div className="space-y-2 mb-4">
          {seedStatus?.status && Object.entries(seedStatus.status).map(([flow, status]) => (
            <div key={flow} className="flex items-center justify-between text-sm">
              <span className="capitalize">{flow.replace('_', ' ')} Flow</span>
              <span className={cn(
                status.existing >= status.expected 
                  ? 'text-green-600' 
                  : 'text-yellow-600'
              )}>
                {status.existing} / {status.expected} emails
              </span>
            </div>
          ))}
        </div>

        {/* Seed button */}
        {!seedStatus?.summary?.is_complete && (
          <Button
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            className="w-full"
          >
            {seedMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Seeding Templates...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Seed All Email Templates
              </>
            )}
          </Button>
        )}

        {seedStatus?.summary?.is_complete && (
          <p className="text-sm text-green-600 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            All {seedStatus.summary.total_expected} email templates are ready
          </p>
        )}

        {/* What's included info */}
        <div className="mt-4 p-3 bg-[var(--color-bg-secondary)] rounded-lg">
          <p className="text-xs text-[var(--color-text-secondary)]">
            <strong>Includes:</strong> Welcome flow (4 emails), Quiz result flow (4 emails), 
            Cart abandonment (3 emails), Post-purchase (4 emails), Win-back (3 emails). 
            All pre-written with Haven & Hold brand voice, proper Klaviyo variables, and styled HTML.
          </p>
        </div>
      </>
    )}
  </CardContent>
</Card>
```

### 4. Add FileText import

```typescript
import {
  CheckCircle,
  Circle,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Mail,
  List,
  Zap,
  Send,
  ChevronDown,
  ChevronUp,
  FileText,  // Add this
} from 'lucide-react';
```

## Acceptance Criteria

- [ ] Email Setup page shows "Email Content Templates" card
- [ ] Card shows seed status per flow (X / Y emails)
- [ ] "Seed All Email Templates" button appears when templates are missing
- [ ] Clicking seed button calls POST /api/email-workflows/seed
- [ ] Success toast appears after seeding
- [ ] Status updates to show all templates seeded
- [ ] Button disappears / changes to "All ready" when complete

## Testing

1. Go to Email → Setup
2. See "Email Content Templates" section showing 0/19 or current status
3. Click "Seed All Email Templates"
4. Wait for completion
5. Verify status shows 19/19
6. Go to Email → Workflows → Content
7. Verify all templates appear with Haven & Hold content
