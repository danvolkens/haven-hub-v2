import { NextRequest, NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth/session';
import { getKlaviyoClient } from '@/lib/integrations/klaviyo/service';

export async function GET(request: NextRequest) {
  try {
    const userId = await getApiUserId();
    const client = await getKlaviyoClient(userId);

    if (!client) {
      return NextResponse.json(
        { error: 'Klaviyo not connected' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    // Get all metrics first
    const metrics = await client.getMetrics();

    // Find revenue-related metrics
    const placedOrderMetric = metrics.find(
      (m) => m.name.toLowerCase() === 'placed order'
    );

    // Get flows for attribution
    const flows = await client.getFlows();
    const liveFlows = flows.filter((f) => f.status === 'live');

    // Calculate metrics for each flow type
    const flowTypes = [
      { name: 'Welcome Flow', keywords: ['welcome'] },
      { name: 'Quiz Result Flow', keywords: ['quiz'] },
      { name: 'Cart Abandonment', keywords: ['cart', 'abandon'] },
      { name: 'Post-Purchase', keywords: ['post', 'purchase', 'thank'] },
      { name: 'Win-Back', keywords: ['win', 'back', 'lapse'] },
    ];

    const flowRevenue = flowTypes.map((flowType) => {
      const matchingFlows = liveFlows.filter((f) =>
        flowType.keywords.some((kw) => f.name.toLowerCase().includes(kw))
      );

      return {
        name: flowType.name,
        flowCount: matchingFlows.length,
        flows: matchingFlows.map((f) => f.name),
        // Revenue attribution would require Klaviyo's reporting API
        // For now, we'll return placeholder data with structure
        estimatedRevenue: 0,
        sends: 0,
        opens: 0,
        clicks: 0,
      };
    });

    // Get aggregate order metrics if available
    let totalOrders = 0;
    let totalRevenue = 0;

    if (placedOrderMetric) {
      try {
        const orderData = await client.getMetricAggregates(
          placedOrderMetric.id,
          'count',
          'day',
          startDate,
          endDate
        );
        totalOrders = orderData.values.reduce((sum, v) => sum + v, 0);

        const revenueData = await client.getMetricAggregates(
          placedOrderMetric.id,
          'sum_value',
          'day',
          startDate,
          endDate
        );
        totalRevenue = revenueData.values.reduce((sum, v) => sum + v, 0);
      } catch (e) {
        // Metrics aggregation might not be available on all plans
        console.error('Failed to get order aggregates:', e);
      }
    }

    // Calculate email attribution percentage (industry average ~20-30%)
    // This is an estimate since Klaviyo's full attribution requires enterprise plan
    const emailAttributionRate = 0.25; // 25% of revenue from email
    const estimatedEmailRevenue = totalRevenue * emailAttributionRate;

    return NextResponse.json({
      period: {
        startDate,
        endDate,
        days,
      },
      summary: {
        totalOrders,
        totalRevenue,
        estimatedEmailRevenue,
        emailAttributionRate: emailAttributionRate * 100,
        averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      },
      flows: flowRevenue,
      liveFlowCount: liveFlows.length,
      metrics: {
        placedOrderMetricId: placedOrderMetric?.id,
        availableMetrics: metrics.length,
      },
    });
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
