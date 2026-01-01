import { NextRequest, NextResponse } from 'next/server';
import {
  trackViewCategory,
  trackPageVisit,
  trackSearch,
  trackAddToCart,
  trackLead,
} from '@/lib/integrations/pinterest/conversion-api';
import { getEpikFromRequest } from '@/lib/pinterest/click-id';

interface TrackingPayload {
  userId: string;
  eventType: 'page_visit' | 'view_category' | 'search' | 'add_to_cart' | 'lead';
  clickId?: string;
  categoryName?: string;
  searchQuery?: string;
  productIds?: string[];
  productNames?: string[];
  value?: number;
  currency?: string;
  email?: string;
  pageName?: string;
  source?: string;
  externalId?: string;
}

/**
 * POST /api/pinterest/track
 *
 * Tracks Pinterest conversion events from the client-side.
 * Accepts various event types with associated data.
 */
export async function POST(request: NextRequest) {
  try {
    const body: TrackingPayload = await request.json();
    const { userId, eventType, ...data } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    if (!eventType) {
      return NextResponse.json({ error: 'eventType is required' }, { status: 400 });
    }

    // Try to get Click ID from cookie header if not provided in body
    let clickId = data.clickId;
    if (!clickId) {
      const cookieHeader = request.headers.get('cookie');
      clickId = getEpikFromRequest(cookieHeader) || undefined;
    }

    let result: { success: boolean; error?: string };

    switch (eventType) {
      case 'view_category':
        if (!data.categoryName) {
          return NextResponse.json({ error: 'categoryName is required for view_category' }, { status: 400 });
        }
        result = await trackViewCategory(userId, {
          clickId,
          categoryName: data.categoryName,
          productIds: data.productIds,
          numItems: data.productIds?.length,
          email: data.email,
          externalId: data.externalId,
        });
        break;

      case 'page_visit':
        result = await trackPageVisit(userId, {
          clickId,
          pageName: data.pageName,
          email: data.email,
          externalId: data.externalId,
        });
        break;

      case 'search':
        if (!data.searchQuery) {
          return NextResponse.json({ error: 'searchQuery is required for search' }, { status: 400 });
        }
        result = await trackSearch(userId, {
          clickId,
          searchQuery: data.searchQuery,
          numResults: data.productIds?.length,
          email: data.email,
          externalId: data.externalId,
        });
        break;

      case 'add_to_cart':
        if (!data.productIds?.length) {
          return NextResponse.json({ error: 'productIds is required for add_to_cart' }, { status: 400 });
        }
        result = await trackAddToCart(userId, {
          clickId,
          productIds: data.productIds,
          productNames: data.productNames,
          value: data.value,
          currency: data.currency,
          email: data.email,
        });
        break;

      case 'lead':
        result = await trackLead(userId, data.email || '', {
          clickId,
          externalId: data.externalId,
          source: data.source,
        });
        break;

      default:
        return NextResponse.json({ error: `Unknown event type: ${eventType}` }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking Pinterest event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
