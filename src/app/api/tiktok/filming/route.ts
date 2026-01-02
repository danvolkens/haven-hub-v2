import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  generateBatchFilmingList,
  createFilmingBatch,
  markBatchFilmed,
  getUpcomingBatches,
  exportFilmingListMarkdown,
} from '@/lib/tiktok/batch-filming';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'generate';
    const weekStart = searchParams.get('week_start');

    switch (action) {
      case 'generate': {
        const startDate = weekStart ? new Date(weekStart) : new Date();
        const list = await generateBatchFilmingList(startDate);
        return NextResponse.json(list);
      }

      case 'upcoming': {
        const batches = await getUpcomingBatches();
        return NextResponse.json(batches);
      }

      case 'export': {
        const startDate = weekStart ? new Date(weekStart) : new Date();
        const list = await generateBatchFilmingList(startDate);
        const markdown = exportFilmingListMarkdown(list);

        return new NextResponse(markdown, {
          headers: {
            'Content-Type': 'text/markdown',
            'Content-Disposition': `attachment; filename="filming-list-${list.week_of}.md"`,
          },
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in filming API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, batch_name, week_of, items, batch_id } = body;

    switch (action) {
      case 'create': {
        if (!batch_name || !week_of || !items) {
          return NextResponse.json(
            { error: 'batch_name, week_of, and items are required' },
            { status: 400 }
          );
        }

        const newBatchId = await createFilmingBatch(
          batch_name,
          new Date(week_of),
          items
        );

        if (!newBatchId) {
          return NextResponse.json(
            { error: 'Failed to create batch' },
            { status: 500 }
          );
        }

        return NextResponse.json({ batch_id: newBatchId });
      }

      case 'mark-filmed': {
        if (!batch_id) {
          return NextResponse.json(
            { error: 'batch_id is required' },
            { status: 400 }
          );
        }

        const success = await markBatchFilmed(batch_id);

        if (!success) {
          return NextResponse.json(
            { error: 'Failed to mark batch as filmed' },
            { status: 500 }
          );
        }

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in filming API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
