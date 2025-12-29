/**
 * API Route: Weekly Calendar Generator
 * Generate and apply weekly content calendars
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  generateWeeklyCalendar,
  applyCalendarTemplate,
  previewCalendar,
  getWeekTemplates,
  getWeekTemplate,
  type WeekType,
} from '@/lib/instagram/calendar-generator';

// GET - Get calendar templates or preview
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const weekType = searchParams.get('weekType') as WeekType | null;
    const startDateStr = searchParams.get('startDate');

    switch (action) {
      case 'templates':
        const templates = getWeekTemplates();
        return NextResponse.json(templates);

      case 'template-details':
        if (!weekType) {
          return NextResponse.json(
            { error: 'Week type required' },
            { status: 400 }
          );
        }
        const template = getWeekTemplate(weekType);
        if (!template) {
          return NextResponse.json(
            { error: 'Template not found' },
            { status: 404 }
          );
        }
        return NextResponse.json(template);

      case 'preview':
        if (!weekType || !startDateStr) {
          return NextResponse.json(
            { error: 'Week type and start date required' },
            { status: 400 }
          );
        }
        const startDate = new Date(startDateStr);
        const preview = await previewCalendar(weekType, startDate);
        return NextResponse.json(preview);

      case 'generate':
        if (!weekType || !startDateStr) {
          return NextResponse.json(
            { error: 'Week type and start date required' },
            { status: 400 }
          );
        }
        const genDate = new Date(startDateStr);
        const calendar = await generateWeeklyCalendar(weekType, genDate);
        return NextResponse.json(calendar);

      default:
        // Return templates by default
        const defaultTemplates = getWeekTemplates();
        return NextResponse.json(defaultTemplates);
    }
  } catch (error) {
    console.error('Calendar generate GET error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

// POST - Apply calendar template
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { weekType, startDate, options } = body as {
      weekType: WeekType;
      startDate: string;
      options?: {
        skipExisting?: boolean;
        createAsDraft?: boolean;
      };
    };

    if (!weekType || !startDate) {
      return NextResponse.json(
        { error: 'Week type and start date required' },
        { status: 400 }
      );
    }

    // Generate the calendar
    const calendar = await generateWeeklyCalendar(weekType, new Date(startDate));

    // Apply the template
    const result = await applyCalendarTemplate(calendar, options);

    return NextResponse.json({
      success: true,
      ...result,
      calendar,
    });
  } catch (error) {
    console.error('Calendar generate POST error:', error);
    return NextResponse.json(
      { error: 'Failed to apply calendar template' },
      { status: 500 }
    );
  }
}
