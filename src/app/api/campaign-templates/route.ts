import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAvailableTemplates, getMilestoneProgress } from '@/lib/services/campaign-templates';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templates = await getAvailableTemplates(user.id);
    const progress = getMilestoneProgress(templates.milestones);

    return NextResponse.json({
      ...templates,
      progress,
    });
  } catch (error) {
    console.error('Failed to fetch campaign templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaign templates' },
      { status: 500 }
    );
  }
}
