import { NextRequest, NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth/session';
import {
  generateAdExport,
  generateAdExportFromPins,
  generateAdExportFromApprovals,
  type AdExportConfig,
} from '@/lib/pinterest/ad-export';

export async function POST(request: NextRequest) {
  try {
    const userId = await getApiUserId();
    const body = await request.json();

    const {
      source, // 'assets', 'pins', or 'approvals'
      ids, // Array of asset/pin IDs (not needed for approvals)
      utmCampaign,
      utmSource = 'pinterest',
      utmMedium = 'paid_social',
      utmContent,
      utmTerm,
      format = 'json', // 'json' or 'csv'
    } = body;

    if (!utmCampaign) {
      return NextResponse.json(
        { error: 'utmCampaign is required' },
        { status: 400 }
      );
    }

    const config: AdExportConfig = {
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm,
    };

    let result;

    switch (source) {
      case 'assets':
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
          return NextResponse.json(
            { error: 'Asset IDs are required for asset export' },
            { status: 400 }
          );
        }
        result = await generateAdExport(userId, ids, config);
        break;

      case 'pins':
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
          return NextResponse.json(
            { error: 'Pin IDs are required for pin export' },
            { status: 400 }
          );
        }
        result = await generateAdExportFromPins(userId, ids, config);
        break;

      case 'approvals':
        result = await generateAdExportFromApprovals(userId, config);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid source. Must be assets, pins, or approvals' },
          { status: 400 }
        );
    }

    // Return CSV as downloadable file if requested
    if (format === 'csv') {
      const filename = `pinterest-ads-export-${utmCampaign}-${Date.now()}.csv`;
      return new NextResponse(result.csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // Return JSON by default
    return NextResponse.json(result);
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
