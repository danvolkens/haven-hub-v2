## Step 2.6: Configure Vercel Cron Jobs Infrastructure

- **Task**: Set up Vercel cron job configuration and create API routes for all scheduled tasks.

- **Files**:

### `vercel.json`
```json
{
  "framework": "nextjs",
  "regions": ["iad1"],
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 60
    },
    "app/api/cron/**/*.ts": {
      "maxDuration": 300
    }
  },
  "crons": [
    {
      "path": "/api/cron/pinterest-publish",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/pinterest-insights",
      "schedule": "0 7 * * *"
    },
    {
      "path": "/api/cron/daily-digest",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/retry-queue",
      "schedule": "*/2 * * * *"
    },
    {
      "path": "/api/cron/abandonment-check",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/lapsed-customers",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/cron/underperformer-check",
      "schedule": "0 5 * * 0"
    },
    {
      "path": "/api/cron/campaign-check",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/seasonal-activation",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/winner-refresh",
      "schedule": "0 6 * * 1"
    },
    {
      "path": "/api/cron/scheduled-exports",
      "schedule": "0 1 * * *"
    }
  ]
}
```

### `lib/cron/verify-cron.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';

/**
 * Verify that a cron request is from Vercel
 */
export function verifyCronRequest(request: NextRequest): boolean {
  // Check for Vercel cron secret
  const authHeader = request.headers.get('authorization');
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
  
  if (authHeader !== expectedAuth) {
    return false;
  }
  
  return true;
}

/**
 * Create a standardized cron response
 */
export function createCronResponse(
  success: boolean,
  data?: Record<string, unknown>
): NextResponse {
  const body = {
    success,
    timestamp: new Date().toISOString(),
    ...data,
  };
  
  return NextResponse.json(body, {
    status: success ? 200 : 500,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

/**
 * Wrapper for cron handlers with authentication
 */
export function cronHandler(
  handler: (request: NextRequest) => Promise<{ success: boolean; data?: Record<string, unknown> }>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Verify authorization
    if (!verifyCronRequest(request)) {
      return NextResponse.json(
        { error: 'Unauthorized', timestamp: new Date().toISOString() },
        { status: 401 }
      );
    }
    
    try {
      const result = await handler(request);
      return createCronResponse(result.success, result.data);
    } catch (error) {
      console.error('Cron handler error:', error);
      return createCronResponse(false, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}
```

### `app/api/cron/pinterest-publish/route.ts`
```typescript
import { NextRequest } from 'next/server';
import { cronHandler } from '@/lib/cron/verify-cron';
import { getAdminClient } from '@/lib/supabase/admin';

export const GET = cronHandler(async (request: NextRequest) => {
  const supabase = getAdminClient();
  
  // Get all scheduled pins ready to publish
  const now = new Date().toISOString();
  
  const { data: pins, error } = await supabase
    .from('pins')
    .select('*')
    .eq('status', 'scheduled')
    .lte('scheduled_time', now)
    .order('scheduled_time', { ascending: true })
    .limit(50);
  
  if (error) {
    throw new Error(`Failed to fetch scheduled pins: ${error.message}`);
  }
  
  if (!pins || pins.length === 0) {
    return { success: true, data: { published: 0, message: 'No pins to publish' } };
  }
  
  // Process pins (implementation will be completed in Phase 12)
  let published = 0;
  let failed = 0;
  
  for (const pin of pins) {
    try {
      // Mark as publishing
      await supabase
        .from('pins')
        .update({ status: 'publishing' })
        .eq('id', pin.id);
      
      // Publish to Pinterest (implementation in Phase 12)
      // For now, just mark as published for testing
      
      await supabase
        .from('pins')
        .update({ 
          status: 'published',
          published_at: new Date().toISOString(),
        })
        .eq('id', pin.id);
      
      published++;
    } catch (err) {
      console.error(`Failed to publish pin ${pin.id}:`, err);
      
      await supabase
        .from('pins')
        .update({ 
          status: 'failed',
          error_message: err instanceof Error ? err.message : 'Unknown error',
        })
        .eq('id', pin.id);
      
      failed++;
    }
  }
  
  return {
    success: true,
    data: {
      processed: pins.length,
      published,
      failed,
    },
  };
});
```

### `app/api/cron/daily-digest/route.ts`
```typescript
import { NextRequest } from 'next/server';
import { cronHandler } from '@/lib/cron/verify-cron';
import { getAdminClient } from '@/lib/supabase/admin';
import { triggerDigestEmail } from '@/lib/trigger/client';

export const GET = cronHandler(async (request: NextRequest) => {
  const supabase = getAdminClient();
  const currentHour = new Date().getUTCHours();
  
  // Find users whose digest should be sent this hour
  // User's send_hour is in their timezone, so we need to check
  const { data: users, error } = await supabase
    .from('user_settings')
    .select('user_id, timezone, digest_preferences')
    .eq('digest_preferences->enabled', true);
  
  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }
  
  if (!users || users.length === 0) {
    return { success: true, data: { sent: 0, message: 'No users with digest enabled' } };
  }
  
  let queued = 0;
  const today = new Date().toISOString().split('T')[0];
  
  for (const user of users) {
    const prefs = user.digest_preferences as { enabled: boolean; send_hour: number; frequency: string };
    
    // Calculate user's local hour
    const userDate = new Date().toLocaleString('en-US', { timeZone: user.timezone || 'America/New_York' });
    const userHour = new Date(userDate).getHours();
    
    // Check if this is the right hour for this user
    if (userHour !== prefs.send_hour) {
      continue;
    }
    
    // Check frequency
    const dayOfWeek = new Date().getDay();
    if (prefs.frequency === 'weekdays' && (dayOfWeek === 0 || dayOfWeek === 6)) {
      continue;
    }
    if (prefs.frequency === 'weekly' && dayOfWeek !== 1) { // Monday only
      continue;
    }
    
    // Queue digest email
    await triggerDigestEmail({
      userId: user.user_id,
      date: today,
    });
    
    queued++;
  }
  
  return {
    success: true,
    data: {
      checked: users.length,
      queued,
    },
  };
});
```

### `app/api/cron/retry-queue/route.ts`
```typescript
import { NextRequest } from 'next/server';
import { cronHandler } from '@/lib/cron/verify-cron';
import { getAdminClient } from '@/lib/supabase/admin';

export const GET = cronHandler(async (request: NextRequest) => {
  const supabase = getAdminClient();
  const workerId = `cron-${Date.now()}`;
  
  // Claim items for processing using database function
  const { data: items, error } = await supabase.rpc('claim_retry_items', {
    p_worker_id: workerId,
    p_limit: 10,
  });
  
  if (error) {
    throw new Error(`Failed to claim retry items: ${error.message}`);
  }
  
  if (!items || items.length === 0) {
    return { success: true, data: { processed: 0, message: 'No items to retry' } };
  }
  
  let succeeded = 0;
  let failed = 0;
  
  for (const item of items) {
    try {
      // Process based on operation type (implementation in Phase 6)
      // For now, just mark as resolved for testing
      
      await supabase
        .from('retry_queue')
        .update({
          status: 'resolved',
          worker_id: null,
        })
        .eq('id', item.id);
      
      succeeded++;
    } catch (err) {
      console.error(`Retry failed for item ${item.id}:`, err);
      
      // Calculate next retry time with exponential backoff
      const nextAttempt = item.attempts + 1;
      const baseDelay = 1000; // 1 second
      const maxDelay = 30000; // 30 seconds
      const delay = Math.min(baseDelay * Math.pow(2, nextAttempt), maxDelay);
      const nextRetryAt = new Date(Date.now() + delay).toISOString();
      
      if (nextAttempt >= item.max_attempts) {
        // Mark as permanently failed
        await supabase
          .from('retry_queue')
          .update({
            status: 'failed',
            last_error: err instanceof Error ? err.message : 'Unknown error',
            worker_id: null,
          })
          .eq('id', item.id);
        
        // Send failure notification if 3+ attempts (per spec)
        if (nextAttempt >= 3) {
          // TODO: Send email notification
        }
      } else {
        // Schedule next retry
        await supabase
          .from('retry_queue')
          .update({
            status: 'pending',
            last_error: err instanceof Error ? err.message : 'Unknown error',
            next_retry_at: nextRetryAt,
            worker_id: null,
          })
          .eq('id', item.id);
      }
      
      failed++;
    }
  }
  
  return {
    success: true,
    data: {
      processed: items.length,
      succeeded,
      failed,
    },
  };
});
```

### `app/api/cron/abandonment-check/route.ts`
```typescript
import { NextRequest } from 'next/server';
import { cronHandler } from '@/lib/cron/verify-cron';
import { getAdminClient } from '@/lib/supabase/admin';

export const GET = cronHandler(async (request: NextRequest) => {
  const supabase = getAdminClient();
  
  // Find abandoned checkouts older than the configured window (default: 1 hour)
  // that haven't been processed yet
  const windowHours = 1; // Will be configurable per user
  const cutoffTime = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();
  
  const { data: checkouts, error } = await supabase
    .from('abandoned_checkouts')
    .select('*, user_settings!inner(user_id, guardrails)')
    .eq('status', 'pending')
    .lt('created_at', cutoffTime)
    .is('order_id', null)
    .limit(100);
  
  if (error) {
    throw new Error(`Failed to fetch abandoned checkouts: ${error.message}`);
  }
  
  if (!checkouts || checkouts.length === 0) {
    return { success: true, data: { processed: 0, message: 'No abandoned checkouts' } };
  }
  
  let triggered = 0;
  
  for (const checkout of checkouts) {
    try {
      // Mark as processing
      await supabase
        .from('abandoned_checkouts')
        .update({ status: 'sequence_triggered' })
        .eq('id', checkout.id);
      
      // Trigger Klaviyo sequence (implementation in Phase 16)
      // For now, just log
      console.log(`Would trigger abandonment sequence for checkout ${checkout.id}`);
      
      triggered++;
    } catch (err) {
      console.error(`Failed to process checkout ${checkout.id}:`, err);
    }
  }
  
  return {
    success: true,
    data: {
      checked: checkouts.length,
      triggered,
    },
  };
});
```

### `app/api/cron/lapsed-customers/route.ts`
```typescript
import { NextRequest } from 'next/server';
import { cronHandler } from '@/lib/cron/verify-cron';
import { getAdminClient } from '@/lib/supabase/admin';
import { WINBACK_TIERS } from '@/lib/constants';

export const GET = cronHandler(async (request: NextRequest) => {
  const supabase = getAdminClient();
  
  const now = new Date();
  const results = {
    tier1: 0,
    tier2: 0,
    tier3: 0,
  };
  
  // Check each tier
  for (const [tier, days] of Object.entries(WINBACK_TIERS)) {
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
    
    // Find customers whose last order was exactly {days} ago (within 24h window)
    const windowStart = new Date(now.getTime() - (days + 1) * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: customers, error } = await supabase
      .from('customers')
      .select('id, email, last_order_at')
      .lt('last_order_at', cutoffDate)
      .gte('last_order_at', windowStart)
      .is(`winback_${tier}_sent_at`, null)
      .limit(100);
    
    if (error) {
      console.error(`Failed to fetch ${tier} customers:`, error);
      continue;
    }
    
    for (const customer of customers || []) {
      try {
        // Mark win-back as sent
        await supabase
          .from('customers')
          .update({ [`winback_${tier}_sent_at`]: now.toISOString() })
          .eq('id', customer.id);
        
        // Trigger Klaviyo win-back sequence (implementation in Phase 18)
        console.log(`Would trigger ${tier} win-back for customer ${customer.id}`);
        
        results[tier as keyof typeof results]++;
      } catch (err) {
        console.error(`Failed to process customer ${customer.id}:`, err);
      }
    }
  }
  
  return {
    success: true,
    data: {
      triggered: results,
      total: results.tier1 + results.tier2 + results.tier3,
    },
  };
});
```

### Additional cron routes (placeholders with proper structure)

### `app/api/cron/pinterest-insights/route.ts`
```typescript
import { NextRequest } from 'next/server';
import { cronHandler } from '@/lib/cron/verify-cron';
import { getAdminClient } from '@/lib/supabase/admin';

export const GET = cronHandler(async (request: NextRequest) => {
  const supabase = getAdminClient();
  
  // Fetch analytics for all published pins from the last 30 days
  // Implementation will be completed in Phase 12
  
  return {
    success: true,
    data: {
      pinsUpdated: 0,
      message: 'Pinterest insights sync complete',
    },
  };
});
```

### `app/api/cron/underperformer-check/route.ts`
```typescript
import { NextRequest } from 'next/server';
import { cronHandler } from '@/lib/cron/verify-cron';
import { getAdminClient } from '@/lib/supabase/admin';
import { ALERT_THRESHOLDS } from '@/lib/constants';

export const GET = cronHandler(async (request: NextRequest) => {
  const supabase = getAdminClient();
  
  // Find pins with low engagement after minimum impressions and days
  // Implementation will be completed in Phase 10
  
  return {
    success: true,
    data: {
      checked: 0,
      retired: 0,
      message: 'Underperformer check complete',
    },
  };
});
```

### `app/api/cron/campaign-check/route.ts`
```typescript
import { NextRequest } from 'next/server';
import { cronHandler } from '@/lib/cron/verify-cron';
import { getAdminClient } from '@/lib/supabase/admin';

export const GET = cronHandler(async (request: NextRequest) => {
  const supabase = getAdminClient();
  
  const now = new Date().toISOString();
  
  // Auto-end campaigns that have passed their end date
  const { data: expiredCampaigns, error } = await supabase
    .from('campaigns')
    .update({ status: 'completed', ended_at: now })
    .eq('status', 'active')
    .lt('end_date', now)
    .select('id');
  
  if (error) {
    throw new Error(`Failed to update campaigns: ${error.message}`);
  }
  
  return {
    success: true,
    data: {
      ended: expiredCampaigns?.length || 0,
    },
  };
});
```

### `app/api/cron/seasonal-activation/route.ts`
```typescript
import { NextRequest } from 'next/server';
import { cronHandler } from '@/lib/cron/verify-cron';
import { getAdminClient } from '@/lib/supabase/admin';

export const GET = cronHandler(async (request: NextRequest) => {
  const supabase = getAdminClient();
  
  // Check for seasonal/temporal content activations
  // Implementation will be completed in Phase 21
  
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  
  // Seasonal checks per spec Feature 41
  const activeSeasons: string[] = [];
  
  // Mental health awareness month (May)
  if (month === 5) {
    activeSeasons.push('mental_health_awareness_month');
  }
  
  // Suicide prevention month (September)
  if (month === 9) {
    activeSeasons.push('suicide_prevention_month');
    activeSeasons.push('self_care_september');
  }
  
  // Holiday checks
  if (month === 12 && day >= 20) {
    activeSeasons.push('christmas');
  }
  
  if (month === 2 && day >= 10 && day <= 14) {
    activeSeasons.push('valentines');
  }
  
  return {
    success: true,
    data: {
      activeSeasons,
      date: today.toISOString().split('T')[0],
    },
  };
});
```

### `app/api/cron/winner-refresh/route.ts`
```typescript
import { NextRequest } from 'next/server';
import { cronHandler } from '@/lib/cron/verify-cron';
import { getAdminClient } from '@/lib/supabase/admin';
import { triggerWinnerRefresh } from '@/lib/trigger/client';

export const GET = cronHandler(async (request: NextRequest) => {
  const supabase = getAdminClient();
  
  // Get all users with autopilot mode for winner refresh
  const { data: users, error } = await supabase
    .from('user_settings')
    .select('user_id, global_mode')
    .in('global_mode', ['assisted', 'autopilot']);
  
  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }
  
  let queued = 0;
  
  for (const user of users || []) {
    await triggerWinnerRefresh({ userId: user.user_id });
    queued++;
  }
  
  return {
    success: true,
    data: {
      usersQueued: queued,
    },
  };
});
```

### `app/api/cron/scheduled-exports/route.ts`
```typescript
import { NextRequest } from 'next/server';
import { cronHandler } from '@/lib/cron/verify-cron';
import { getAdminClient } from '@/lib/supabase/admin';
import { triggerExportGenerator } from '@/lib/trigger/client';

export const GET = cronHandler(async (request: NextRequest) => {
  const supabase = getAdminClient();
  const now = new Date().toISOString();
  
  // Find scheduled exports due to run
  const { data: exports, error } = await supabase
    .from('scheduled_exports')
    .select('*')
    .eq('enabled', true)
    .lte('next_run_at', now);
  
  if (error) {
    throw new Error(`Failed to fetch scheduled exports: ${error.message}`);
  }
  
  let triggered = 0;
  
  for (const exp of exports || []) {
    try {
      // Calculate date range based on type
      let dateRange: { start: string; end: string } | undefined;
      
      if (exp.date_range_type === 'last_week') {
        const end = new Date();
        const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateRange = {
          start: start.toISOString(),
          end: end.toISOString(),
        };
      } else if (exp.date_range_type === 'last_month') {
        const end = new Date();
        const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateRange = {
          start: start.toISOString(),
          end: end.toISOString(),
        };
      }
      
      // Trigger export
      await triggerExportGenerator({
        userId: exp.user_id,
        exportType: exp.export_type,
        format: exp.format,
        dateRange,
        fields: exp.field_selection,
      });
      
      // Calculate next run time
      let nextRun: Date;
      if (exp.frequency === 'weekly') {
        nextRun = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      } else {
        nextRun = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }
      
      // Update scheduled export
      await supabase
        .from('scheduled_exports')
        .update({
          last_run_at: now,
          next_run_at: nextRun.toISOString(),
        })
        .eq('id', exp.id);
      
      triggered++;
    } catch (err) {
      console.error(`Failed to trigger export ${exp.id}:`, err);
    }
  }
  
  return {
    success: true,
    data: {
      checked: exports?.length || 0,
      triggered,
    },
  };
});
```

- **Step Dependencies**: Step 1.1
- **User Instructions**: 
  1. Generate a secure CRON_SECRET: `openssl rand -hex 32`
  2. Add to `.env.local`
  3. Crons will auto-deploy with Vercel deployment

---

# Phase 3: Operator Mode System

