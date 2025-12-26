import { NextRequest, NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth/session';
import {
  createPinterestCampaign,
  getCampaigns,
  CAMPAIGN_TEMPLATES,
  type CampaignTemplateId,
} from '@/lib/services/pinterest-campaigns';

/**
 * GET /api/pinterest/campaigns
 * List all campaigns for the current user
 */
export async function GET() {
  try {
    const userId = await getApiUserId();
    const campaigns = await getCampaigns(userId);

    return NextResponse.json({
      campaigns,
      templates: Object.values(CAMPAIGN_TEMPLATES),
    });
  } catch (error) {
    console.error('Failed to fetch campaigns:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pinterest/campaigns
 * Create a new campaign from a template
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getApiUserId();
    const body = await request.json();

    const { templateId, dailyBudget, name, pinIds, adAccountId } = body;

    if (!templateId) {
      return NextResponse.json(
        { error: 'templateId is required' },
        { status: 400 }
      );
    }

    if (!CAMPAIGN_TEMPLATES[templateId as CampaignTemplateId]) {
      return NextResponse.json(
        { error: `Invalid template: ${templateId}` },
        { status: 400 }
      );
    }

    const result = await createPinterestCampaign(
      userId,
      templateId as CampaignTemplateId,
      {
        dailyBudget,
        name,
        pinIds,
        adAccountId,
      }
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Failed to create campaign:', error);

    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message.includes('Pinterest not connected')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
      if (error.message.includes('No Pinterest ad account')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
}
