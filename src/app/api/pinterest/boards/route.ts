import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getApiUserId } from '@/lib/auth/session';
import {
  getBoards,
  syncPinterestBoards,
  updateBoardCollection,
  getPinterestStatus,
} from '@/lib/integrations/pinterest/service';

export async function GET() {
  try {
    const userId = await getApiUserId();

    const boards = await getBoards(userId);
    const status = await getPinterestStatus(userId);

    return NextResponse.json({
      boards,
      connected: status.connected,
      username: status.username,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

// Sync boards from Pinterest
export async function POST() {
  try {
    const userId = await getApiUserId();
    const boards = await syncPinterestBoards(userId);

    return NextResponse.json({
      boards,
      synced: boards.length,
    });
  } catch (error) {
    console.error('Pinterest boards sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

const updateSchema = z.object({
  boardId: z.string().uuid(),
  collection: z.enum(['grounding', 'wholeness', 'growth']).nullable(),
  isPrimary: z.boolean().optional(),
});

// Update board collection mapping
export async function PATCH(request: NextRequest) {
  try {
    await getApiUserId();

    const body = await request.json();
    const { boardId, collection, isPrimary } = updateSchema.parse(body);

    await updateBoardCollection(boardId, collection, isPrimary);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
