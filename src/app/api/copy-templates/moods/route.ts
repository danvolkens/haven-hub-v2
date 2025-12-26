import { NextRequest, NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth/session';
import { getMoodDescriptors } from '@/lib/copy-engine/copy-generator';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const userId = await getApiUserId();
    const moods = await getMoodDescriptors(userId);

    return NextResponse.json({ moods });
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
    const supabase = await createServerSupabaseClient();
    const body = await request.json();

    const { mood, descriptors } = body;

    if (!mood || !descriptors || !Array.isArray(descriptors)) {
      return NextResponse.json(
        { error: 'Missing required fields: mood, descriptors (array)' },
        { status: 400 }
      );
    }

    const { data, error } = await (supabase as any)
      .from('copy_mood_descriptors')
      .insert({
        user_id: userId,
        mood,
        descriptors,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: data.id });
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
    const supabase = await createServerSupabaseClient();
    const body = await request.json();

    const { id, mood, descriptors } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing mood id' }, { status: 400 });
    }

    const { error } = await (supabase as any)
      .from('copy_mood_descriptors')
      .update({ mood, descriptors })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
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
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing mood id' }, { status: 400 });
    }

    const { error } = await (supabase as any)
      .from('copy_mood_descriptors')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
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
