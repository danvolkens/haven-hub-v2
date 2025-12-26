import { NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth/session';
import { getKlaviyoClient } from '@/lib/integrations/klaviyo/service';

// Required Klaviyo lists for Haven Hub
const REQUIRED_LISTS = [
  'Haven Hub - All Leads',
  'Haven Hub - Quiz Takers',
  'Haven Hub - Grounding',
  'Haven Hub - Wholeness',
  'Haven Hub - Growth',
  'Haven Hub - Customers',
  'Haven Hub - VIP',
];

// Events that should trigger flows
const REQUIRED_EVENTS = [
  'Quiz Completed',
  'Cart Abandoned',
  'Placed Order',
  'Win Back Started',
];

export async function GET() {
  try {
    const userId = await getApiUserId();
    const client = await getKlaviyoClient(userId);

    if (!client) {
      return NextResponse.json({
        connected: false,
        steps: {
          connection: { status: 'incomplete', message: 'Klaviyo API key not configured' },
          lists: { status: 'incomplete', message: 'Connect Klaviyo first' },
          events: { status: 'incomplete', message: 'Connect Klaviyo first' },
        },
        overallProgress: 0,
      });
    }

    // Check connection by getting account
    let accountName = 'Unknown';
    try {
      const account = await client.getAccount();
      accountName = account?.attributes?.contact_information?.organization_name || 'Connected';
    } catch (err) {
      return NextResponse.json({
        connected: false,
        steps: {
          connection: { status: 'error', message: 'Invalid API key' },
          lists: { status: 'incomplete', message: 'Fix connection first' },
          events: { status: 'incomplete', message: 'Fix connection first' },
        },
        overallProgress: 0,
      });
    }

    // Check lists
    const lists = await client.getLists();
    const listNames = lists.map(l => l.name);
    const missingLists = REQUIRED_LISTS.filter(name => !listNames.includes(name));
    const listProgress = ((REQUIRED_LISTS.length - missingLists.length) / REQUIRED_LISTS.length) * 100;

    // Check for event metrics (indicates flows are set up)
    const metrics = await client.getMetrics();
    const metricNames = metrics.map(m => m.name);
    const activeEvents = REQUIRED_EVENTS.filter(name => metricNames.includes(name));
    const eventProgress = (activeEvents.length / REQUIRED_EVENTS.length) * 100;

    // Calculate overall progress
    const connectionProgress = 100; // Connected
    const overallProgress = Math.round((connectionProgress + listProgress + eventProgress) / 3);

    return NextResponse.json({
      connected: true,
      accountName,
      steps: {
        connection: {
          status: 'complete',
          message: `Connected to ${accountName}`,
        },
        lists: {
          status: missingLists.length === 0 ? 'complete' : 'incomplete',
          message: missingLists.length === 0
            ? 'All required lists created'
            : `${missingLists.length} lists need to be created`,
          existingLists: listNames,
          missingLists,
          progress: listProgress,
        },
        events: {
          status: activeEvents.length === REQUIRED_EVENTS.length ? 'complete' : 'incomplete',
          message: activeEvents.length === 0
            ? 'No event metrics found - flows may not be set up'
            : `${activeEvents.length}/${REQUIRED_EVENTS.length} events detected`,
          activeEvents,
          missingEvents: REQUIRED_EVENTS.filter(name => !metricNames.includes(name)),
          progress: eventProgress,
          note: 'Events appear after flows are triggered at least once',
        },
      },
      overallProgress,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Klaviyo setup status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check setup status' },
      { status: 500 }
    );
  }
}
