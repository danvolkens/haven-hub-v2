import { NextRequest, NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth/session';
import {
  getTasksForDay,
  getWeeklyProgress,
  getAllTasks,
  createTask,
} from '@/lib/rhythm/rhythm-service';

export async function GET(request: NextRequest) {
  try {
    const userId = await getApiUserId();
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'today';
    const dateParam = searchParams.get('date');

    const date = dateParam ? new Date(dateParam) : new Date();

    switch (view) {
      case 'today':
        const todayTasks = await getTasksForDay(userId, date);
        return NextResponse.json({ tasks: todayTasks });

      case 'week':
        const weekProgress = await getWeeklyProgress(userId, date);
        return NextResponse.json(weekProgress);

      case 'all':
        const allTasks = await getAllTasks(userId);
        return NextResponse.json({ tasks: allTasks });

      default:
        return NextResponse.json({ error: 'Invalid view' }, { status: 400 });
    }
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

    const { dayOfWeek, taskName, taskDescription, category } = body;

    if (dayOfWeek === undefined || !taskName || !category) {
      return NextResponse.json(
        { error: 'dayOfWeek, taskName, and category are required' },
        { status: 400 }
      );
    }

    if (dayOfWeek < 0 || dayOfWeek > 6) {
      return NextResponse.json(
        { error: 'dayOfWeek must be 0-6 (Sunday-Saturday)' },
        { status: 400 }
      );
    }

    const validCategories = [
      'content',
      'engagement',
      'analytics',
      'ads',
      'maintenance',
    ];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: `category must be one of: ${validCategories.join(', ')}` },
        { status: 400 }
      );
    }

    const result = await createTask(userId, {
      dayOfWeek,
      taskName,
      taskDescription,
      category,
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
