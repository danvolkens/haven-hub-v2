import { NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth/session';
import { getKlaviyoClient } from '@/lib/integrations/klaviyo/service';

export async function GET() {
  try {
    const userId = await getApiUserId();
    const client = await getKlaviyoClient(userId);

    if (!client) {
      return NextResponse.json({ error: 'Klaviyo not connected' }, { status: 400 });
    }

    // Get all flows from Klaviyo
    const flows = await client.getFlows();

    // Return real flow data - metrics require Klaviyo's premium analytics
    // so we don't show fake numbers
    const flowsWithMetrics = flows.map((flow) => ({
      ...flow,
      // Note: Per-flow metrics require Klaviyo's Flow Analytics API
      // which is only available on certain plans
      metrics: null,
    }));

    return NextResponse.json({
      flows: flowsWithMetrics,
      // We don't have real totals without flow metrics
      totalSent: null,
      totalRevenue: null,
    });
  } catch (error) {
    console.error('Error fetching Klaviyo flows:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch flows' },
      { status: 500 }
    );
  }
}
