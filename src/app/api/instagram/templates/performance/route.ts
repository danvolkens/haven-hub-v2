/**
 * API Route: Template Performance
 * Get template performance stats and winners
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getTopTemplates,
  getTemplatePerformance,
  getTemplatesByMetric,
  refreshTemplatePerformance,
  getTemplateWinners,
  identifyWinners,
  markWinnerRepeated,
  getWinnersToRepeat,
  getPerformanceSummary,
  type TemplateType,
} from '@/lib/instagram/template-performance';

// GET - Get template performance data
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const templateId = searchParams.get('templateId');
    const metric = searchParams.get('metric') as 'engagement' | 'saves' | 'shares' | 'reach' | 'score' | null;
    const templateType = searchParams.get('templateType') as TemplateType | null;
    const limit = parseInt(searchParams.get('limit') || '5');

    switch (action) {
      case 'top':
        const topTemplates = await getTopTemplates(undefined, limit);
        return NextResponse.json(topTemplates);

      case 'single':
        if (!templateId) {
          return NextResponse.json(
            { error: 'Template ID required' },
            { status: 400 }
          );
        }
        const templatePerf = await getTemplatePerformance(templateId);
        return NextResponse.json(templatePerf);

      case 'by-metric':
        if (!metric) {
          return NextResponse.json(
            { error: 'Metric required' },
            { status: 400 }
          );
        }
        const byMetric = await getTemplatesByMetric(
          metric,
          templateType || undefined,
          limit
        );
        return NextResponse.json(byMetric);

      case 'winners':
        const periodType = (searchParams.get('periodType') || 'weekly') as 'weekly' | 'monthly';
        const winners = await getTemplateWinners(periodType, limit);
        return NextResponse.json(winners);

      case 'winners-to-repeat':
        const winnersToRepeat = await getWinnersToRepeat();
        return NextResponse.json(winnersToRepeat);

      case 'summary':
        const summary = await getPerformanceSummary();
        return NextResponse.json(summary);

      default:
        // Return summary by default
        const defaultSummary = await getPerformanceSummary();
        return NextResponse.json(defaultSummary);
    }
  } catch (error) {
    console.error('Template performance GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch template performance' },
      { status: 500 }
    );
  }
}

// POST - Refresh performance or manage winners
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body as { action: string };

    switch (action) {
      case 'refresh':
        const refreshed = await refreshTemplatePerformance();
        return NextResponse.json({ success: refreshed });

      case 'identify-winners':
        const { periodType, periodStart } = body as {
          periodType?: 'weekly' | 'monthly';
          periodStart?: string;
        };
        const newWinners = await identifyWinners(
          periodType || 'weekly',
          periodStart ? new Date(periodStart) : undefined
        );
        return NextResponse.json(newWinners);

      case 'mark-repeated':
        const { winnerId } = body as { winnerId: string };
        if (!winnerId) {
          return NextResponse.json(
            { error: 'Winner ID required' },
            { status: 400 }
          );
        }
        const marked = await markWinnerRepeated(winnerId);
        return NextResponse.json({ success: marked });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Template performance POST error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
