import { NextRequest, NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth/session';
import {
  completeTask,
  uncompleteTask,
  updateTask,
  deleteTask,
} from '@/lib/rhythm/rhythm-service';

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

// Complete/uncomplete a task
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getApiUserId();
    const { taskId } = await params;
    const body = await request.json();

    const { action, date, notes } = body;

    const taskDate = date ? new Date(date) : new Date();

    if (action === 'complete') {
      const result = await completeTask(userId, taskId, taskDate, notes);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
      return NextResponse.json({ success: true, id: result.id });
    } else if (action === 'uncomplete') {
      const result = await uncompleteTask(userId, taskId, taskDate);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'action must be "complete" or "uncomplete"' },
        { status: 400 }
      );
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

// Update a task
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getApiUserId();
    const { taskId } = await params;
    const body = await request.json();

    const { taskName, taskDescription, category, isActive } = body;

    const result = await updateTask(userId, taskId, {
      taskName,
      taskDescription,
      category,
      isActive,
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

// Delete a task
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getApiUserId();
    const { taskId } = await params;

    const result = await deleteTask(userId, taskId);

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
