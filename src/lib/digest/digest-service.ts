import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getActiveInsights, getPendingRecommendations } from '@/lib/intelligence/intelligence-service';
import { sendDigestEmail } from '@/lib/email/resend-client';

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
  top_insight?: {
    title: string;
    summary: string;
    priority: string;
  };
  at_risk_customers: number;
  upcoming_campaigns: number;
}

export async function generateDailyDigest(userId: string): Promise<DigestContent> {
  const supabase = await createServerSupabaseClient();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString();

  // Get insights
  const insights = await getActiveInsights(userId, { limit: 10 });
  const recommendations = await getPendingRecommendations(userId, { limit: 5 });

  // Get pending approvals
  const { count: pendingApprovals } = await (supabase as any)
    .from('approval_items')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'pending');

  // Get pins published yesterday
  const { count: pinsPublished } = await (supabase as any)
    .from('pins')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'published')
    .gte('published_at', yesterdayStr);

  // Get pins scheduled
  const { count: pinsScheduled } = await (supabase as any)
    .from('pins')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'scheduled');

  // Get orders from yesterday
  const { data: orders } = await (supabase as any)
    .from('customer_orders')
    .select('total')
    .eq('user_id', userId)
    .gte('ordered_at', yesterdayStr);

  const ordersReceived = orders?.length || 0;
  const revenue = orders?.reduce((sum: number, o: any) => sum + o.total, 0) || 0;

  // Get new leads
  const { count: newLeads } = await (supabase as any)
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', yesterdayStr);

  // Get at-risk customers
  const { count: atRiskCustomers } = await (supabase as any)
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('journey_stage', ['at_risk', 'churned']);

  // Get upcoming campaigns
  const { count: upcomingCampaigns } = await (supabase as any)
    .from('campaigns')
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

  // Get top insight
  const topInsight = insights.find((i) => i.priority === 'critical' || i.priority === 'high');

  return {
    insights_count: insights.length,
    pending_approvals: pendingApprovals || 0,
    pins_published: pinsPublished || 0,
    pins_scheduled: pinsScheduled || 0,
    orders_received: ordersReceived,
    revenue,
    new_leads: newLeads || 0,
    recommendations_count: recommendations.length,
    highlights,
    top_insight: topInsight ? {
      title: topInsight.title,
      summary: topInsight.summary,
      priority: topInsight.priority,
    } : undefined,
    at_risk_customers: atRiskCustomers || 0,
    upcoming_campaigns: upcomingCampaigns || 0,
  };
}

export async function sendDigest(userId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  const adminClient = getAdminClient();

  try {
    // Get user preferences
    const { data: prefs } = await (supabase as any)
      .from('digest_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!prefs?.is_enabled) {
      return { success: false, error: 'Digest disabled' };
    }

    // Generate content
    const content = await generateDailyDigest(userId);

    // Get user email
    const { data: { user } } = await adminClient.auth.admin.getUserById(userId);
    if (!user?.email) {
      return { success: false, error: 'User email not found' };
    }

    // Send via configured method
    if (prefs.delivery_method === 'email' || prefs.delivery_method === 'both') {
      await sendDigestEmailToUser(user.email, content);
    }

    // Record in history
    await (supabase as any).from('digest_history').insert({
      user_id: userId,
      delivery_method: prefs.delivery_method,
      content,
    });

    return { success: true };
  } catch (error) {
    console.error('Send digest error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function sendDigestEmailToUser(email: string, content: DigestContent): Promise<void> {
  const result = await sendDigestEmail(email, content);
  if (!result.success) {
    throw new Error(result.error || 'Failed to send digest email');
  }
}

export async function processScheduledDigests(): Promise<{ sent: number; errors: number }> {
  const supabase = await createServerSupabaseClient();
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const dayOfWeek = now.getDay();
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

  // Get all users who should receive digest now
  const { data: preferences } = await (supabase as any)
    .from('digest_preferences')
    .select('user_id, frequency, weekly_day, delivery_time')
    .eq('is_enabled', true);

  if (!preferences) {
    return { sent: 0, errors: 0 };
  }

  let sent = 0;
  let errors = 0;

  for (const pref of preferences) {
    // Check if it's time to send
    const [prefHour, prefMinute] = pref.delivery_time.split(':').map(Number);

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

    const result = await sendDigest(pref.user_id);
    if (result.success) {
      sent++;
    } else {
      errors++;
    }
  }

  return { sent, errors };
}
