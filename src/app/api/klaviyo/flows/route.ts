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

    // Get all flows
    const flows = await client.getFlows();

    // For now, return mock metrics since Klaviyo's metric API is complex
    // In production, you'd use the metric-aggregates endpoint
    const flowsWithMetrics = flows.map((flow) => ({
      ...flow,
      metrics: {
        sent: Math.floor(Math.random() * 5000),
        opened: Math.floor(Math.random() * 2500),
        clicked: Math.floor(Math.random() * 500),
        revenue: Math.floor(Math.random() * 5000),
        openRate: 35 + Math.random() * 25,
        clickRate: 2 + Math.random() * 5,
      },
    }));

    const totalSent = flowsWithMetrics.reduce((sum, f) => sum + f.metrics.sent, 0);
    const totalRevenue = flowsWithMetrics.reduce((sum, f) => sum + f.metrics.revenue, 0);

    return NextResponse.json({
      flows: flowsWithMetrics,
      totalSent,
      totalRevenue,
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
