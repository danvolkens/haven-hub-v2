import { NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth/session';
import { getPinterestStatus } from '@/lib/integrations/pinterest/service';

export async function GET() {
  try {
    const userId = await getApiUserId();
    const status = await getPinterestStatus(userId);

    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
