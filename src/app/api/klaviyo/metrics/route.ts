import { NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth/session';
import { getKlaviyoClient, getKlaviyoStatus } from '@/lib/integrations/klaviyo/service';

export async function GET() {
  try {
    const userId = await getApiUserId();
    const status = await getKlaviyoStatus(userId);

    if (!status.connected) {
      return NextResponse.json({ error: 'Klaviyo not connected' }, { status: 400 });
    }

    const client = await getKlaviyoClient(userId);
    if (!client) {
      return NextResponse.json({ error: 'Failed to create Klaviyo client' }, { status: 500 });
    }

    // Fetch all real metrics from Klaviyo in parallel
    const [emailMetrics, revenueData, subscriberData, flows, campaigns] = await Promise.all([
      client.getEmailMetrics(30),
      client.getEmailRevenue(30),
      client.getTotalSubscribers(),
      client.getFlows(),
      client.getCampaigns(5),
    ]);

    const liveFlows = flows.filter((f) => f.status === 'live');

    // Format flows for display
    // Note: Flow-specific sent/revenue stats require additional Klaviyo API access
    // that's not available in the standard API. We show the flow status but
    // detailed per-flow metrics would require Klaviyo's premium analytics.
    const topFlows = liveFlows.slice(0, 5).map((flow) => ({
      id: flow.id,
      name: flow.name,
      status: flow.status,
      // Flow-specific metrics not available via standard API
      // These would need Klaviyo's reporting API or flow analytics endpoint
      sent: 0,
      revenue: 0,
    }));

    // Format campaigns with real data
    const recentCampaigns = campaigns
      .filter(c => c.status === 'Sent' || c.sentAt)
      .slice(0, 5)
      .map(campaign => ({
        id: campaign.id,
        name: campaign.name,
        sentAt: campaign.sentAt || campaign.sendTime,
        // Note: Campaign-specific open/click stats require additional API calls
        // per campaign. For now we show the campaign list.
        sent: 0,
        opened: 0,
        clicked: 0,
      }));

    // Ensure all numeric values are actually numbers (defensive)
    const safeNumber = (val: unknown): number => {
      if (typeof val === 'number' && !isNaN(val)) return val;
      if (typeof val === 'string') return parseFloat(val) || 0;
      return 0;
    };

    return NextResponse.json({
      // Real email metrics from Klaviyo's metric-aggregates API
      totalSent: safeNumber(emailMetrics.totalSent),
      openRate: safeNumber(emailMetrics.openRate),
      clickRate: safeNumber(emailMetrics.clickRate),

      // Real revenue data
      revenue: safeNumber(revenueData.totalRevenue),
      revenueChange: safeNumber(revenueData.percentChange),

      // Real subscriber count
      subscribers: safeNumber(subscriberData.total),
      subscribersChange: safeNumber(subscriberData.percentChange),

      // Flow and campaign data
      activeFlows: liveFlows.length,
      topFlows,
      recentCampaigns,
    });
  } catch (error) {
    console.error('Error fetching Klaviyo metrics:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
