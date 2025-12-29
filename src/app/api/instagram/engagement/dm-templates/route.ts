/**
 * API Route: DM Templates
 * Get and manage DM templates
 */

import { NextResponse } from 'next/server';
import { getDMTemplates } from '@/lib/instagram/engagement-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const templateType = searchParams.get('type') || undefined;

    const templates = await getDMTemplates(templateType);

    return NextResponse.json(templates);
  } catch (error) {
    console.error('DM templates API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch DM templates' },
      { status: 500 }
    );
  }
}
