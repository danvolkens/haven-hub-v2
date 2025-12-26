import { NextRequest, NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth/session';
import {
  generateEnhancedCopy,
  generateCopyVariations,
} from '@/lib/copy-engine/copy-generator';

export async function POST(request: NextRequest) {
  try {
    const userId = await getApiUserId();
    const body = await request.json();

    const {
      quote,
      collection,
      mood,
      roomType,
      productLink,
      shopName,
      variations = 1,
    } = body;

    const context = {
      quote,
      collection,
      mood,
      roomType,
      productLink,
      shopName,
    };

    if (variations > 1) {
      const copies = await generateCopyVariations(userId, context, variations);
      return NextResponse.json({ copies });
    }

    const copy = await generateEnhancedCopy(userId, context);
    return NextResponse.json({ copy });
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
