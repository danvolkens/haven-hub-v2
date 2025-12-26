import { NextRequest, NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth/session';
import {
  getCollectionHooks,
  upsertCollectionHook,
  deleteCollectionHook,
} from '@/lib/copy-engine/copy-generator';

export async function GET(request: NextRequest) {
  try {
    const userId = await getApiUserId();
    const { searchParams } = new URL(request.url);
    const collection = searchParams.get('collection') || undefined;

    const hooks = await getCollectionHooks(userId, collection);

    // Group hooks by collection for easier frontend consumption
    const grouped = hooks.reduce(
      (acc, hook) => {
        if (!acc[hook.collection]) {
          acc[hook.collection] = { opening: [], closing: [], cta: [] };
        }
        acc[hook.collection][hook.hook_type].push(hook);
        return acc;
      },
      {} as Record<string, { opening: any[]; closing: any[]; cta: any[] }>
    );

    return NextResponse.json({
      hooks,
      grouped,
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

export async function POST(request: NextRequest) {
  try {
    const userId = await getApiUserId();
    const body = await request.json();

    const { collection, hookType, hookText } = body;

    if (!collection || !hookType || !hookText) {
      return NextResponse.json(
        { error: 'Missing required fields: collection, hookType, hookText' },
        { status: 400 }
      );
    }

    if (!['opening', 'closing', 'cta'].includes(hookType)) {
      return NextResponse.json(
        { error: 'Invalid hookType. Must be opening, closing, or cta' },
        { status: 400 }
      );
    }

    const result = await upsertCollectionHook(userId, {
      collection,
      hookType,
      hookText,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ id: result.id });
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

export async function PUT(request: NextRequest) {
  try {
    const userId = await getApiUserId();
    const body = await request.json();

    const { id, collection, hookType, hookText } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing hook id' }, { status: 400 });
    }

    const result = await upsertCollectionHook(userId, {
      id,
      collection,
      hookType,
      hookText,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
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

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getApiUserId();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing hook id' }, { status: 400 });
    }

    const result = await deleteCollectionHook(userId, id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
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
