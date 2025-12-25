import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getApiUserId } from '@/lib/auth/session';
import {
  createPin,
  getPins,
  publishPin,
  deletePin,
} from '@/lib/integrations/pinterest/service';

const querySchema = z.object({
  status: z.string().optional(),
  boardId: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export async function GET(request: NextRequest) {
  try {
    const userId = await getApiUserId();

    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const { status, boardId, limit, offset } = querySchema.parse(searchParams);

    const { pins, total } = await getPins(userId, {
      status,
      boardId,
      limit,
      offset,
    });

    return NextResponse.json({ pins, total, limit, offset });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

const createSchema = z.object({
  boardId: z.string(),
  imageUrl: z.string().url(),
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  link: z.string().url().optional(),
  altText: z.string().max(500).optional(),
  assetId: z.string().uuid().optional(),
  mockupId: z.string().uuid().optional(),
  quoteId: z.string().uuid().optional(),
  collection: z.enum(['grounding', 'wholeness', 'growth']).optional(),
  scheduledFor: z.string().datetime().optional(),
  publishNow: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const userId = await getApiUserId();

    const body = await request.json();
    const data = createSchema.parse(body);

    const { pinId, status } = await createPin(userId, {
      ...data,
      scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : undefined,
    });

    // If publishNow, immediately publish
    if (data.publishNow) {
      try {
        const { pinterestPinId } = await publishPin(pinId);
        return NextResponse.json({
          pinId,
          pinterestPinId,
          status: 'published',
        });
      } catch (error) {
        return NextResponse.json({
          pinId,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Publish failed',
        });
      }
    }

    return NextResponse.json({ pinId, status });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

const deleteSchema = z.object({
  pinId: z.string().uuid(),
});

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getApiUserId();

    const body = await request.json();
    const { pinId } = deleteSchema.parse(body);

    await deletePin(pinId, userId);

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
