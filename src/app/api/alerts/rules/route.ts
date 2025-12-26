import { NextRequest, NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth/session';
import {
  getAlertRules,
  createAlertRule,
  updateAlertRule,
  deleteAlertRule,
  CreateAlertRuleInput,
} from '@/lib/alerts/alert-service';

export async function GET() {
  try {
    const userId = await getApiUserId();
    const rules = await getAlertRules(userId);
    return NextResponse.json({ rules });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching alert rules:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch alert rules' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getApiUserId();
    const body: CreateAlertRuleInput = await request.json();

    // Validate required fields
    if (!body.name || !body.alert_type || !body.metric || !body.operator || body.threshold === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: name, alert_type, metric, operator, threshold' },
        { status: 400 }
      );
    }

    const rule = await createAlertRule(userId, body);
    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error creating alert rule:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create alert rule' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await getApiUserId();
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: 'Missing rule id' }, { status: 400 });
    }

    const { id, ...updates } = body;
    const rule = await updateAlertRule(userId, id, updates);
    return NextResponse.json({ rule });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error updating alert rule:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update alert rule' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getApiUserId();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing rule id' }, { status: 400 });
    }

    await deleteAlertRule(userId, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error deleting alert rule:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete alert rule' },
      { status: 500 }
    );
  }
}
