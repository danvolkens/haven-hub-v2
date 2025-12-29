/**
 * API Route: Generate Daily Engagement Tasks
 * Creates engagement tasks for a specified date
 */

import { NextResponse } from 'next/server';
import { generateDailyTasks } from '@/lib/instagram/engagement-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const date = body.date ? new Date(body.date) : new Date();

    const taskCount = await generateDailyTasks(date);

    return NextResponse.json({ success: true, tasksGenerated: taskCount });
  } catch (error) {
    console.error('Generate engagement tasks API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate engagement tasks' },
      { status: 500 }
    );
  }
}
