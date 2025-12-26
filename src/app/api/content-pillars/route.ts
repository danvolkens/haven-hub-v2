import { NextResponse } from 'next/server';
import { getContentPillars } from '@/lib/services/content-pillars';

/**
 * GET /api/content-pillars
 * Get all content pillar definitions
 */
export async function GET() {
  try {
    const pillars = await getContentPillars();

    return NextResponse.json({ pillars });
  } catch (error) {
    console.error('Error fetching content pillars:', error);
    return NextResponse.json(
      { error: 'Failed to fetch content pillars' },
      { status: 500 }
    );
  }
}
