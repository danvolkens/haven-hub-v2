import { NextRequest, NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth/session';
import { getKlaviyoClient } from '@/lib/integrations/klaviyo/service';

// Required Klaviyo lists for Haven Hub
const REQUIRED_LISTS = [
  { name: 'Haven Hub - All Leads', description: 'Master list for all captured leads' },
  { name: 'Haven Hub - Quiz Takers', description: 'People who completed the quiz' },
  { name: 'Haven Hub - Grounding', description: 'Quiz result: Grounding collection' },
  { name: 'Haven Hub - Wholeness', description: 'Quiz result: Wholeness collection' },
  { name: 'Haven Hub - Growth', description: 'Quiz result: Growth collection' },
  { name: 'Haven Hub - Customers', description: 'People who made a purchase' },
  { name: 'Haven Hub - VIP', description: 'High LTV customers ($100+)' },
];

export async function POST(request: NextRequest) {
  try {
    const userId = await getApiUserId();
    const client = await getKlaviyoClient(userId);

    if (!client) {
      return NextResponse.json(
        { error: 'Klaviyo not connected' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const action = body.action;

    if (action === 'create_lists') {
      // Get existing lists
      const existingLists = await client.getLists();
      const existingNames = existingLists.map(l => l.name);

      const created: string[] = [];
      const skipped: string[] = [];
      const errors: string[] = [];

      for (const list of REQUIRED_LISTS) {
        if (existingNames.includes(list.name)) {
          skipped.push(list.name);
          continue;
        }

        try {
          await client.createList(list.name);
          created.push(list.name);
        } catch (err) {
          errors.push(`${list.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      return NextResponse.json({
        success: true,
        created,
        skipped,
        errors,
        message: created.length > 0
          ? `Created ${created.length} new lists`
          : 'All required lists already exist',
      });
    }

    if (action === 'test_event') {
      const { eventType, testEmail } = body;

      if (!testEmail) {
        return NextResponse.json(
          { error: 'Test email is required' },
          { status: 400 }
        );
      }

      // Send test event based on type
      switch (eventType) {
        case 'quiz_completed':
          await client.trackQuizComplete(testEmail, {
            grounding: 0.6,
            wholeness: 0.3,
            growth: 0.1,
          }, 'grounding');
          break;

        case 'cart_abandoned':
          await client.trackCartAbandonment(testEmail, `test_cart_${Date.now()}`, [
            { name: 'Test Product', quantity: 1, price: 25 }
          ], 25);
          break;

        case 'placed_order':
          await client.trackPurchase(testEmail, `test_order_${Date.now()}`, 50, [
            { name: 'Test Product', quantity: 2, price: 25 }
          ]);
          break;

        case 'win_back':
          await client.createEvent({
            metric: { name: 'Win Back Started' },
            profile: { email: testEmail },
            properties: {
              days_since_purchase: 90,
              last_order_value: 75,
              test_event: true,
            },
          });
          break;

        default:
          return NextResponse.json(
            { error: 'Invalid event type' },
            { status: 400 }
          );
      }

      return NextResponse.json({
        success: true,
        eventType,
        testEmail,
        message: `Test ${eventType} event sent to ${testEmail}`,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Klaviyo setup error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to perform setup action' },
      { status: 500 }
    );
  }
}
