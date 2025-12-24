import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth/session';
import { getCustomerJourney } from '@/lib/customers/journey-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    const { id } = await params;
    const journey = await getCustomerJourney(userId, id);

    if (!journey.customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json(journey);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
