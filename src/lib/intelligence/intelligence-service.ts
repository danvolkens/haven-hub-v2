import { createServerSupabaseClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';
import type { Insight, Recommendation, InsightCategory } from '@/types/intelligence';

const anthropic = new Anthropic();

interface AnalysisContext {
  userId: string;
  quotes: any[];
  assets: any[];
  pins: any[];
  products: any[];
  customers: any[];
  recentOrders: any[];
  contentPerformance: any[];
}

export async function runDailyAnalysis(userId: string): Promise<{
  insights: number;
  recommendations: number;
  error?: string;
}> {
  const supabase = await createServerSupabaseClient();

  try {
    // Create job record
    const { data: job } = await (supabase as any)
      .from('ai_analysis_jobs')
      .insert({
        user_id: userId,
        type: 'daily_analysis',
        status: 'processing',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    // Gather context
    const context = await gatherAnalysisContext(userId);

    // Generate insights
    const insights = await generateInsights(context);

    // Generate recommendations
    const recommendations = await generateRecommendations(context);

    // Save insights
    if (insights.length > 0) {
      await (supabase as any).from('insights').insert(insights);
    }

    // Save recommendations
    if (recommendations.length > 0) {
      await (supabase as any).from('recommendations').insert(recommendations);
    }

    // Update job
    await (supabase as any)
      .from('ai_analysis_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        insights_generated: insights.length,
        recommendations_generated: recommendations.length,
      })
      .eq('id', job?.id);

    return {
      insights: insights.length,
      recommendations: recommendations.length,
    };
  } catch (error) {
    console.error('Daily analysis error:', error);
    return {
      insights: 0,
      recommendations: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function gatherAnalysisContext(userId: string): Promise<AnalysisContext> {
  const supabase = await createServerSupabaseClient();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    { data: quotes },
    { data: assets },
    { data: pins },
    { data: products },
    { data: customers },
    { data: recentOrders },
    { data: contentPerformance },
  ] = await Promise.all([
    (supabase as any).from('quotes').select('*').eq('user_id', userId).limit(100),
    (supabase as any).from('assets').select('*').eq('user_id', userId).eq('status', 'approved').limit(100),
    (supabase as any).from('pins').select('*').eq('user_id', userId).eq('status', 'published').limit(100),
    (supabase as any).from('products').select('*').eq('user_id', userId).eq('status', 'active').limit(50),
    (supabase as any).from('customers').select('*').eq('user_id', userId).limit(100),
    (supabase as any).from('customer_orders').select('*').eq('user_id', userId).gte('ordered_at', thirtyDaysAgo.toISOString()).limit(100),
    (supabase as any).from('content_performance').select('*').eq('user_id', userId).eq('period_type', 'day').gte('period_start', thirtyDaysAgo.toISOString().split('T')[0]),
  ]);

  return {
    userId,
    quotes: quotes || [],
    assets: assets || [],
    pins: pins || [],
    products: products || [],
    customers: customers || [],
    recentOrders: recentOrders || [],
    contentPerformance: contentPerformance || [],
  };
}

async function generateInsights(context: AnalysisContext): Promise<Partial<Insight>[]> {
  const insights: Partial<Insight>[] = [];

  // Performance insights
  const topPerformingPins = context.pins
    .filter((p: any) => p.engagement_rate !== null)
    .sort((a: any, b: any) => b.engagement_rate - a.engagement_rate)
    .slice(0, 5);

  if (topPerformingPins.length > 0) {
    insights.push({
      user_id: context.userId,
      type: 'performance',
      category: 'pinterest',
      title: 'Top Performing Pins This Week',
      summary: `Your top ${topPerformingPins.length} pins are averaging ${(topPerformingPins.reduce((sum: number, p: any) => sum + p.engagement_rate, 0) / topPerformingPins.length * 100).toFixed(2)}% engagement rate.`,
      details: {
        pins: topPerformingPins.map((p: any) => ({
          id: p.id,
          title: p.title,
          engagement_rate: p.engagement_rate,
          impressions: p.impressions,
        })),
      },
      priority: 'medium',
      related_pins: topPerformingPins.map((p: any) => p.id),
      suggested_actions: [
        {
          action: 'create_similar',
          description: 'Create more content similar to your top performers',
          impact: 'Potentially increase overall engagement by 20%',
        },
      ],
    });
  }

  // Customer insights
  const atRiskCustomers = context.customers.filter((c: any) => c.journey_stage === 'at_risk');
  if (atRiskCustomers.length > 0) {
    insights.push({
      user_id: context.userId,
      type: 'warning',
      category: 'customers',
      title: 'At-Risk Customers Detected',
      summary: `${atRiskCustomers.length} customers haven't made a purchase in over 60 days.`,
      details: {
        count: atRiskCustomers.length,
        total_lifetime_value: atRiskCustomers.reduce((sum: number, c: any) => sum + c.total_spent, 0),
      },
      priority: 'high',
      suggested_actions: [
        {
          action: 'launch_winback',
          description: 'Launch a win-back campaign targeting these customers',
          impact: 'Recover potentially $' + atRiskCustomers.reduce((sum: number, c: any) => sum + c.total_spent * 0.1, 0).toFixed(0) + ' in revenue',
        },
      ],
    });
  }

  // Collection performance
  const collectionPerformance = new Map<string, { impressions: number; saves: number; clicks: number }>();
  for (const pin of context.pins) {
    if (pin.collection) {
      const existing = collectionPerformance.get(pin.collection) || { impressions: 0, saves: 0, clicks: 0 };
      existing.impressions += pin.impressions;
      existing.saves += pin.saves;
      existing.clicks += pin.clicks;
      collectionPerformance.set(pin.collection, existing);
    }
  }

  const bestCollection = Array.from(collectionPerformance.entries())
    .sort((a, b) => (b[1].saves + b[1].clicks) - (a[1].saves + a[1].clicks))[0];

  if (bestCollection) {
    insights.push({
      user_id: context.userId,
      type: 'opportunity',
      category: 'content',
      title: `${bestCollection[0].charAt(0).toUpperCase() + bestCollection[0].slice(1)} Collection Performing Best`,
      summary: `Your ${bestCollection[0]} collection is getting the most engagement. Consider creating more content in this theme.`,
      details: {
        collection: bestCollection[0],
        metrics: bestCollection[1],
      },
      priority: 'medium',
      suggested_actions: [
        {
          action: 'focus_collection',
          description: `Prioritize creating ${bestCollection[0]} content this week`,
          impact: 'Capitalize on current audience interest',
        },
      ],
    });
  }

  return insights;
}

async function generateRecommendations(context: AnalysisContext): Promise<Partial<Recommendation>[]> {
  const recommendations: Partial<Recommendation>[] = [];

  // Posting time recommendation based on engagement patterns
  const engagementByHour = new Map<number, number>();
  for (const pin of context.pins) {
    if (pin.published_at && pin.engagement_rate) {
      const hour = new Date(pin.published_at).getHours();
      const current = engagementByHour.get(hour) || 0;
      engagementByHour.set(hour, current + pin.engagement_rate);
    }
  }

  const bestHour = Array.from(engagementByHour.entries())
    .sort((a, b) => b[1] - a[1])[0];

  if (bestHour) {
    recommendations.push({
      user_id: context.userId,
      type: 'posting_time',
      title: 'Optimal Posting Time Detected',
      description: `Based on your pin performance, ${bestHour[0]}:00 appears to be your best posting time.`,
      rationale: 'Analysis of your historical pin engagement shows higher rates at this hour.',
      data: {
        optimal_hour: bestHour[0],
        engagement_by_hour: Object.fromEntries(engagementByHour),
      },
      expected_impact: '10-15% improvement in engagement',
      impact_score: 0.7,
      confidence_score: 0.8,
    });
  }

  // Quote suggestions based on top performers
  const topQuoteCollections = context.quotes
    .filter((q: any) => q.assets_generated > 0)
    .reduce((acc: Record<string, number>, q: any) => {
      acc[q.collection] = (acc[q.collection] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const underrepresentedCollection = ['grounding', 'wholeness', 'growth']
    .find((c) => (topQuoteCollections[c] || 0) < 10);

  if (underrepresentedCollection) {
    recommendations.push({
      user_id: context.userId,
      type: 'quote_suggestion',
      title: `Add More ${underrepresentedCollection.charAt(0).toUpperCase() + underrepresentedCollection.slice(1)} Quotes`,
      description: `Your ${underrepresentedCollection} collection has fewer quotes than others. Adding more will help balance your content mix.`,
      rationale: 'A balanced content mix across all collections helps reach different audience segments.',
      data: {
        collection: underrepresentedCollection,
        current_count: topQuoteCollections[underrepresentedCollection] || 0,
        suggested_themes: getCollectionThemes(underrepresentedCollection),
      },
      expected_impact: 'Reach new audience segments',
      impact_score: 0.6,
    });
  }

  return recommendations;
}

function getCollectionThemes(collection: string): string[] {
  const themes: Record<string, string[]> = {
    grounding: ['stability', 'presence', 'nature', 'calm', 'roots'],
    wholeness: ['self-acceptance', 'healing', 'integration', 'compassion', 'balance'],
    growth: ['potential', 'change', 'courage', 'possibility', 'becoming'],
  };
  return themes[collection] || [];
}

export async function getActiveInsights(
  userId: string,
  options?: { limit?: number; category?: InsightCategory }
): Promise<Insight[]> {
  const supabase = await createServerSupabaseClient();

  let query = (supabase as any)
    .from('insights')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['new', 'viewed'])
    .lte('valid_from', new Date().toISOString())
    .or(`valid_until.is.null,valid_until.gte.${new Date().toISOString()}`)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });

  if (options?.category) {
    query = query.eq('category', options.category);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data } = await query;
  return (data || []) as Insight[];
}

export async function getPendingRecommendations(
  userId: string,
  options?: { limit?: number; type?: string }
): Promise<Recommendation[]> {
  const supabase = await createServerSupabaseClient();

  let query = (supabase as any)
    .from('recommendations')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`)
    .order('impact_score', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (options?.type) {
    query = query.eq('type', options.type);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data } = await query;
  return (data || []) as Recommendation[];
}
