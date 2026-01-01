import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getApiUserId } from '@/lib/auth/session';

export async function GET() {
  try {
    const userId = await getApiUserId();
    const supabase = await createServerSupabaseClient();

    // Get templates with their pin stats
    const { data: templates, error: templateError } = await (supabase as any)
      .from('pin_copy_templates')
      .select('id, name, collection, is_active')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (templateError) {
      return NextResponse.json({ error: templateError.message }, { status: 500 });
    }

    // Get pins with copy templates to calculate stats
    const { data: pins, error: pinsError } = await (supabase as any)
      .from('pins')
      .select('copy_template_id, impressions, saves, clicks, engagement_rate')
      .eq('user_id', userId)
      .eq('status', 'published')
      .not('copy_template_id', 'is', null);

    if (pinsError) {
      return NextResponse.json({ error: pinsError.message }, { status: 500 });
    }

    // Aggregate stats per template
    const templateStats: Record<string, { count: number; totalEngagement: number; impressions: number }> = {};

    for (const pin of pins || []) {
      if (!pin.copy_template_id) continue;

      if (!templateStats[pin.copy_template_id]) {
        templateStats[pin.copy_template_id] = { count: 0, totalEngagement: 0, impressions: 0 };
      }

      templateStats[pin.copy_template_id].count++;
      templateStats[pin.copy_template_id].impressions += pin.impressions || 0;
      // Sum engagement (saves + clicks) for averaging
      templateStats[pin.copy_template_id].totalEngagement += (pin.saves || 0) + (pin.clicks || 0);
    }

    // Combine templates with their computed stats
    const templatesWithStats = (templates || []).map((template: any) => {
      const stats = templateStats[template.id] || { count: 0, totalEngagement: 0, impressions: 0 };
      const avgEngagement = stats.impressions > 0 ? stats.totalEngagement / stats.impressions : 0;

      return {
        ...template,
        times_used: stats.count,
        avg_engagement_rate: avgEngagement,
      };
    });

    // Sort by engagement rate (highest first)
    templatesWithStats.sort((a: any, b: any) => (b.avg_engagement_rate || 0) - (a.avg_engagement_rate || 0));

    return NextResponse.json({ templates: templatesWithStats });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
