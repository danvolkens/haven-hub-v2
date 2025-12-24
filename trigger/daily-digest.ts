import { schedules, logger } from '@trigger.dev/sdk/v3';
import { createClient } from '@supabase/supabase-js';

// Note: We can't use @/lib imports in trigger tasks that use schedules
// because they run in a different context. Use direct Supabase client instead.

interface DigestContent {
  insights_count: number;
  pending_approvals: number;
  pins_published: number;
  pins_scheduled: number;
  orders_received: number;
  revenue: number;
  new_leads: number;
  recommendations_count: number;
  highlights: string[];
  at_risk_customers: number;
  upcoming_campaigns: number;
}

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function generateDailyDigestForUser(
  supabase: ReturnType<typeof getSupabaseClient>,
  userId: string
): Promise<DigestContent> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString();

  // Get insights count
  const { count: insightsCount } = await supabase
    .from('insights' as any)
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('status', ['new', 'viewed']);

  // Get pending recommendations count
  const { count: recommendationsCount } = await supabase
    .from('recommendations' as any)
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'pending');

  // Get pending approvals
  const { count: pendingApprovals } = await supabase
    .from('approval_items' as any)
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'pending');

  // Get pins published yesterday
  const { count: pinsPublished } = await supabase
    .from('pins' as any)
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'published')
    .gte('published_at', yesterdayStr);

  // Get pins scheduled
  const { count: pinsScheduled } = await supabase
    .from('pins' as any)
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'scheduled');

  // Get orders from yesterday
  const { data: orders } = await supabase
    .from('customer_orders' as any)
    .select('total')
    .eq('user_id', userId)
    .gte('ordered_at', yesterdayStr);

  const ordersReceived = orders?.length || 0;
  const revenue = orders?.reduce((sum: number, o: any) => sum + (o.total || 0), 0) || 0;

  // Get new leads
  const { count: newLeads } = await supabase
    .from('leads' as any)
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', yesterdayStr);

  // Get at-risk customers
  const { count: atRiskCustomers } = await supabase
    .from('customers' as any)
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('journey_stage', ['at_risk', 'churned']);

  // Get upcoming campaigns
  const { count: upcomingCampaigns } = await supabase
    .from('campaigns' as any)
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'scheduled')
    .gte('start_date', new Date().toISOString().split('T')[0]);

  // Generate highlights
  const highlights: string[] = [];

  if (ordersReceived > 0) {
    highlights.push(`💰 ${ordersReceived} new order${ordersReceived > 1 ? 's' : ''} ($${revenue.toFixed(2)} revenue)`);
  }

  if (pinsPublished && pinsPublished > 0) {
    highlights.push(`📌 ${pinsPublished} pin${pinsPublished > 1 ? 's' : ''} published yesterday`);
  }

  if (newLeads && newLeads > 0) {
    highlights.push(`✨ ${newLeads} new lead${newLeads > 1 ? 's' : ''} captured`);
  }

  if (atRiskCustomers && atRiskCustomers > 5) {
    highlights.push(`⚠️ ${atRiskCustomers} customers at risk of churning`);
  }

  return {
    insights_count: insightsCount || 0,
    pending_approvals: pendingApprovals || 0,
    pins_published: pinsPublished || 0,
    pins_scheduled: pinsScheduled || 0,
    orders_received: ordersReceived,
    revenue,
    new_leads: newLeads || 0,
    recommendations_count: recommendationsCount || 0,
    highlights,
    at_risk_customers: atRiskCustomers || 0,
    upcoming_campaigns: upcomingCampaigns || 0,
  };
}

async function sendDigestForUser(
  supabase: ReturnType<typeof getSupabaseClient>,
  userId: string,
  prefs: any
): Promise<boolean> {
  try {
    // Generate content
    const content = await generateDailyDigestForUser(supabase, userId);

    // Get user email
    const { data: { user } } = await supabase.auth.admin.getUserById(userId);
    if (!user?.email) {
      logger.warn('User email not found', { userId });
      return false;
    }

    // Send via configured method (placeholder for now)
    if (prefs.delivery_method === 'email' || prefs.delivery_method === 'both') {
      logger.info(`Sending digest email to ${user.email}`, { content });
      // TODO: Integrate with Resend/Klaviyo
    }

    // Record in history
    await supabase.from('digest_history' as any).insert({
      user_id: userId,
      delivery_method: prefs.delivery_method,
      content,
    });

    return true;
  } catch (error) {
    logger.error('Failed to send digest', { userId, error });
    return false;
  }
}

export const dailyDigestTask = schedules.task({
  id: 'daily-digest',
  cron: '0 * * * *', // Run every hour to catch different timezones

  run: async () => {
    const supabase = getSupabaseClient();
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const dayOfWeek = now.getDay();
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

    logger.info('Starting daily digest processing', {
      currentHour,
      currentMinute,
      dayOfWeek,
      isWeekday,
    });

    // Get all users who should receive digest now
    const { data: preferences, error } = await supabase
      .from('digest_preferences' as any)
      .select('user_id, frequency, weekly_day, delivery_time, delivery_method')
      .eq('is_enabled', true);

    if (error) {
      logger.error('Failed to fetch digest preferences', { error });
      return { sent: 0, errors: 0 };
    }

    if (!preferences || preferences.length === 0) {
      logger.info('No users with digest enabled');
      return { sent: 0, errors: 0 };
    }

    let sent = 0;
    let errors = 0;

    for (const pref of preferences) {
      // Check if it's time to send
      const [prefHour, prefMinute] = (pref.delivery_time as string).split(':').map(Number);

      // Allow 5-minute window
      if (Math.abs(currentHour * 60 + currentMinute - prefHour * 60 - prefMinute) > 5) {
        continue;
      }

      // Check frequency
      if (pref.frequency === 'weekdays' && !isWeekday) {
        continue;
      }
      if (pref.frequency === 'weekly' && dayOfWeek !== pref.weekly_day) {
        continue;
      }

      const success = await sendDigestForUser(supabase, pref.user_id as string, pref);
      if (success) {
        sent++;
      } else {
        errors++;
      }
    }

    logger.info('Daily digest processing complete', { sent, errors });

    return { sent, errors };
  },
});

export const dailyAnalysisTask = schedules.task({
  id: 'daily-analysis',
  cron: '0 4 * * *', // Run at 4 AM UTC

  run: async () => {
    const supabase = getSupabaseClient();

    logger.info('Starting daily analysis');

    // Get all users
    const { data: users, error } = await supabase
      .from('user_settings' as any)
      .select('user_id');

    if (error) {
      logger.error('Failed to fetch users', { error });
      return { processed: 0 };
    }

    if (!users || users.length === 0) {
      logger.info('No users found');
      return { processed: 0 };
    }

    let processed = 0;

    for (const user of users) {
      try {
        // Run analysis for each user
        // This creates insights and recommendations in the database
        await runAnalysisForUser(supabase, user.user_id as string);
        processed++;
      } catch (error) {
        logger.error(`Analysis failed for user ${user.user_id}`, { error });
      }
    }

    logger.info('Daily analysis complete', { processed });

    return { processed };
  },
});

async function runAnalysisForUser(
  supabase: ReturnType<typeof getSupabaseClient>,
  userId: string
): Promise<void> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Create job record
  const { data: job } = await supabase
    .from('ai_analysis_jobs' as any)
    .insert({
      user_id: userId,
      type: 'daily_analysis',
      status: 'processing',
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  try {
    // Gather data
    const [
      { data: pins },
      { data: customers },
      { data: orders },
    ] = await Promise.all([
      supabase.from('pins' as any).select('*').eq('user_id', userId).eq('status', 'published').limit(100),
      supabase.from('customers' as any).select('*').eq('user_id', userId).limit(100),
      supabase.from('customer_orders' as any).select('*').eq('user_id', userId).gte('ordered_at', thirtyDaysAgo.toISOString()).limit(100),
    ]);

    const insights: any[] = [];

    // At-risk customers insight
    const atRiskCustomers = (customers || []).filter((c: any) => c.journey_stage === 'at_risk');
    if (atRiskCustomers.length > 0) {
      insights.push({
        user_id: userId,
        type: 'warning',
        category: 'customers',
        title: 'At-Risk Customers Detected',
        summary: `${atRiskCustomers.length} customers haven't made a purchase in over 60 days.`,
        details: {
          count: atRiskCustomers.length,
          total_lifetime_value: atRiskCustomers.reduce((sum: number, c: any) => sum + (c.total_spent || 0), 0),
        },
        priority: 'high',
        suggested_actions: [
          {
            action: 'launch_winback',
            description: 'Launch a win-back campaign targeting these customers',
            impact: 'Recover potentially lost revenue',
          },
        ],
      });
    }

    // Top performing pins insight
    const topPins = (pins || [])
      .filter((p: any) => p.engagement_rate !== null)
      .sort((a: any, b: any) => (b.engagement_rate || 0) - (a.engagement_rate || 0))
      .slice(0, 5);

    if (topPins.length > 0) {
      const avgEngagement = topPins.reduce((sum: number, p: any) => sum + (p.engagement_rate || 0), 0) / topPins.length;
      insights.push({
        user_id: userId,
        type: 'performance',
        category: 'pinterest',
        title: 'Top Performing Pins This Week',
        summary: `Your top ${topPins.length} pins are averaging ${(avgEngagement * 100).toFixed(2)}% engagement rate.`,
        details: {
          pins: topPins.map((p: any) => ({
            id: p.id,
            title: p.title,
            engagement_rate: p.engagement_rate,
          })),
        },
        priority: 'medium',
        suggested_actions: [
          {
            action: 'create_similar',
            description: 'Create more content similar to your top performers',
            impact: 'Potentially increase overall engagement',
          },
        ],
      });
    }

    // Save insights
    if (insights.length > 0) {
      await supabase.from('insights' as any).insert(insights);
    }

    // Update job
    await supabase
      .from('ai_analysis_jobs' as any)
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        insights_generated: insights.length,
      })
      .eq('id', job?.id);

  } catch (error) {
    // Update job with error
    await supabase
      .from('ai_analysis_jobs' as any)
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', job?.id);

    throw error;
  }
}
