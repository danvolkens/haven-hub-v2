/**
 * API Route: Update Engagement Task
 * Update task status (complete, skip, etc.)
 */

import { NextResponse } from 'next/server';
import { updateTaskStatus } from '@/lib/instagram/engagement-service';
import type { TaskStatus } from '@/lib/instagram/engagement-service';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { status, notes, skipped_reason, response_used } = body as {
      status: TaskStatus;
      notes?: string;
      skipped_reason?: string;
      response_used?: string;
    };

    const updatedTask = await updateTaskStatus(id, status, {
      notes,
      skippedReason: skipped_reason,
      responseUsed: response_used,
    });

    if (!updatedTask) {
      return NextResponse.json(
        { error: 'Failed to update task' },
        { status: 400 }
      );
    }

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error('Update engagement task API error:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}
