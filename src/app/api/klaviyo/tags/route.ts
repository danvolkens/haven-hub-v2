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

    const tags = await client.getTags();

    return NextResponse.json({ tags });
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
        { error: 'Tag name is required' },
        { status: 400 }
      );
    }

    const tagId = await client.getOrCreateTag(name);

    return NextResponse.json({ id: tagId, name });
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
