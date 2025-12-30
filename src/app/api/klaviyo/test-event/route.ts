import { NextRequest, NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth/session';
import { getKlaviyoClient } from '@/lib/integrations/klaviyo/service';

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

    const { eventType, testEmail } = await request.json();

    if (!testEmail || !eventType) {
      return NextResponse.json(
        { error: 'testEmail and eventType are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const timestamp = new Date().toISOString();

    switch (eventType) {
      case 'quiz_completed':
        // Use createEvent directly to include URL property
        await client.createEvent({
          metric: { name: 'Quiz Completed' },
          profile: { email: testEmail },
          properties: {
            quiz_results: {
              grounding: 0.6,
              wholeness: 0.25,
              growth: 0.15,
            },
            quiz_result: 'grounding',
            recommended_collection: 'grounding',
            quiz_completed_at: timestamp,
            url: 'https://havenandhold.com/collections/grounding',
          },
        });
        break;

      case 'cart_abandoned':
        await client.createEvent({
          metric: { name: 'Cart Abandoned' },
          profile: { email: testEmail },
          properties: {
            cart_id: `test_cart_${Date.now()}`,
            items: [
              { name: 'Test Quote Print - Grounding', quantity: 1, price: 29.99 },
              { name: 'Test Frame - Natural Oak', quantity: 1, price: 15.00 },
            ],
            cart_value: 44.99,
            abandoned_at: timestamp,
            checkout_url: 'https://havenandhold.com/cart',
          },
          unique_id: `cart_${Date.now()}`,
        });
        break;

      case 'placed_order':
        await client.createEvent({
          metric: { name: 'Placed Order' },
          profile: { email: testEmail },
          properties: {
            order_id: `test_order_${Date.now()}`,
            items: [
              { name: 'Quote Print - Find Your Center', quantity: 1, price: 34.99 },
              { name: 'Premium Frame - Walnut', quantity: 1, price: 25.00 },
            ],
            item_count: 2,
            download_url: 'https://havenandhold.com/account',
          },
          value: 59.99,
          unique_id: `order_${Date.now()}`,
        });
        break;

      case 'pin_save':
        await client.trackPinEngagement(testEmail, `test_pin_${Date.now()}`, 'save', {
          pin_title: 'Test Pin - Stay Grounded',
          collection: 'grounding',
          board: 'Mindfulness Quotes',
        });
        break;

      case 'pin_click':
        await client.trackPinEngagement(testEmail, `test_pin_${Date.now()}`, 'click', {
          pin_title: 'Test Pin - Embrace Wholeness',
          collection: 'wholeness',
          destination_url: 'https://havenandhold.com/products/test',
        });
        break;

      case 'lead_captured':
        await client.createEvent({
          metric: { name: 'Lead Captured' },
          profile: { email: testEmail },
          properties: {
            source: 'test_event',
            lead_magnet: 'Free Wallpaper Pack',
            captured_at: timestamp,
          },
        });
        break;

      case 'win_back_started':
        await client.createEvent({
          metric: { name: 'Win Back Started' },
          profile: { email: testEmail },
          properties: {
            last_purchase_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
            days_since_purchase: 90,
            total_orders: 2,
            total_revenue: 125.50,
          },
        });
        break;

      default:
        return NextResponse.json(
          { error: `Unknown event type: ${eventType}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      eventType,
      testEmail,
      timestamp,
      message: `Event "${eventType}" sent successfully to ${testEmail}`,
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
