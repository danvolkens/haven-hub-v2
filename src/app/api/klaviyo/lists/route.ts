import { NextRequest, NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth/session';
import { getKlaviyoClient } from '@/lib/integrations/klaviyo/service';

export async function GET() {
  try {
    const userId = await getApiUserId();
    const client = await getKlaviyoClient(userId);

    if (!client) {
      return NextResponse.json(
        { error: 'Klaviyo not connected' },
        { status: 400 }
      );
    }

    const lists = await client.getLists();

    // Get subscriber counts for each list (in parallel)
    const listsWithCounts = await Promise.all(
      lists.map(async (list) => {
        const count = await client.getListProfileCount(list.id);
        return {
          ...list,
          subscriberCount: count,
        };
      })
    );

    return NextResponse.json({ lists: listsWithCounts });
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

    const { name } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'List name is required' },
        { status: 400 }
      );
    }

    const list = await client.createList(name);

    return NextResponse.json({ list });
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
