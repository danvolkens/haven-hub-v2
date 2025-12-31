import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGiftByCode, claimGift } from '@/lib/gifts/gift-service';
import { publicApiLimiter, rateLimit } from '@/lib/cache/rate-limiter';

// GET /api/gifts/claim/[code] - Get gift by code (public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  // Rate limit by IP to prevent enumeration attacks
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'anonymous';
  const rateLimitResponse = await rateLimit(publicApiLimiter, `gift:${ip}`);
  if (rateLimitResponse) return rateLimitResponse;

  const { code } = await params;

  try {
    const gift = await getGiftByCode(code);

    if (!gift) {
      return NextResponse.json({ error: 'Gift not found' }, { status: 404 });
    }

    if (gift.status === 'expired' || new Date(gift.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Gift has expired' }, { status: 410 });
    }

    // Return limited info for public view
    return NextResponse.json({
      gift: {
        sender_name: gift.sender_name,
        message: gift.message,
        status: gift.status,
        expires_at: gift.expires_at,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get gift' },
      { status: 500 }
    );
  }
}

// POST /api/gifts/claim/[code] - Claim gift
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  // Rate limit by IP to prevent abuse
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'anonymous';
  const rateLimitResponse = await rateLimit(publicApiLimiter, `gift-claim:${ip}`);
  if (rateLimitResponse) return rateLimitResponse;

  const { code } = await params;
  const body = await request.json();
  const { email } = body;

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  try {
    const gift = await getGiftByCode(code);

    if (!gift) {
      return NextResponse.json({ error: 'Gift not found' }, { status: 404 });
    }

    if (gift.status === 'claimed') {
      return NextResponse.json({ error: 'Gift already claimed' }, { status: 400 });
    }

    if (gift.status === 'expired' || new Date(gift.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Gift has expired' }, { status: 410 });
    }

    const supabase = await createClient();

    // Find or create customer
    let { data: customer } = await (supabase as any)
      .from('customers')
      .select('id')
      .eq('user_id', gift.user_id)
      .eq('email', email)
      .single();

    if (!customer) {
      const { data: newCustomer, error: createError } = await (supabase as any)
        .from('customers')
        .insert({
          user_id: gift.user_id,
          email: email,
          source: 'gift',
        })
        .select('id')
        .single();

      if (createError) {
        throw new Error('Failed to create customer record');
      }
      customer = newCustomer;
    }

    // Claim the gift
    const claimedGift = await claimGift(code, customer.id);

    return NextResponse.json({ gift: claimedGift });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to claim gift' },
      { status: 500 }
    );
  }
}
