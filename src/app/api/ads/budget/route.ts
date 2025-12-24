import { NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth/session';
import { checkAdSpendBudget, syncAdSpend } from '@/lib/pinterest/ads-service';

export async function GET() {
  try {
    const userId = await getApiUserId();
    const budgetStatus = await checkAdSpendBudget(userId, 0);

    return NextResponse.json(budgetStatus);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const userId = await getApiUserId();
    const result = await syncAdSpend(userId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
