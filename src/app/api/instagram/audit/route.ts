/**
 * API Route: Content Performance Audit
 * Generate, view, and manage content audits
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  generateWeeklyAudit,
  getRecentAudits,
  getAudit,
  getAuditActionItems,
  updateActionItemStatus,
  markAuditReviewed,
  getPerformanceTargets,
  updatePerformanceTargets,
  type ActionItemStatus,
  type PerformanceTargets,
} from '@/lib/instagram/audit-service';

// GET - Get audits, action items, or targets
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
    const auditId = searchParams.get('auditId');

    switch (action) {
      case 'list':
        const limit = parseInt(searchParams.get('limit') || '10');
        const audits = await getRecentAudits(limit);
        return NextResponse.json(audits);

      case 'get':
        if (!auditId) {
          return NextResponse.json(
            { error: 'Audit ID required' },
            { status: 400 }
          );
        }
        const audit = await getAudit(auditId);
        return NextResponse.json(audit);

      case 'actions':
        if (!auditId) {
          return NextResponse.json(
            { error: 'Audit ID required' },
            { status: 400 }
          );
        }
        const actionItems = await getAuditActionItems(auditId);
        return NextResponse.json(actionItems);

      case 'targets':
        const targets = await getPerformanceTargets();
        return NextResponse.json(targets);

      default:
        // Return recent audits by default
        const recentAudits = await getRecentAudits(5);
        return NextResponse.json(recentAudits);
    }
  } catch (error) {
    console.error('Audit GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit data' },
      { status: 500 }
    );
  }
}

// POST - Generate audit or update action items
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
    const { action } = body as { action: string };

    switch (action) {
      case 'generate':
        const { weekStart } = body as { weekStart?: string };
        const startDate = weekStart ? new Date(weekStart) : undefined;
        const audit = await generateWeeklyAudit(startDate);
        if (!audit) {
          return NextResponse.json(
            { error: 'Failed to generate audit' },
            { status: 500 }
          );
        }
        return NextResponse.json(audit);

      case 'review':
        const { auditId } = body as { auditId: string };
        if (!auditId) {
          return NextResponse.json(
            { error: 'Audit ID required' },
            { status: 400 }
          );
        }
        const reviewed = await markAuditReviewed(auditId);
        return NextResponse.json({ success: reviewed });

      case 'update-item':
        const { itemId, status, notes } = body as {
          itemId: string;
          status: ActionItemStatus;
          notes?: string;
        };
        if (!itemId || !status) {
          return NextResponse.json(
            { error: 'Item ID and status required' },
            { status: 400 }
          );
        }
        const updated = await updateActionItemStatus(itemId, status, notes);
        return NextResponse.json({ success: updated });

      case 'update-targets':
        const { targets } = body as { targets: Partial<PerformanceTargets> };
        if (!targets) {
          return NextResponse.json(
            { error: 'Targets required' },
            { status: 400 }
          );
        }
        const targetsUpdated = await updatePerformanceTargets(targets);
        return NextResponse.json({ success: targetsUpdated });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Audit POST error:', error);
    return NextResponse.json(
      { error: 'Failed to process audit request' },
      { status: 500 }
    );
  }
}
