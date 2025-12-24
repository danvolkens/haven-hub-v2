import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  if (!start || !end) {
    return NextResponse.json({ error: 'start and end required' }, { status: 400 });
  }

  const events: any[] = [];

  // Fetch scheduled pins
  const { data: pins } = await (supabase as any)
    .from('pins')
    .select('id, title, description, scheduled_at, status, boards(name)')
    .eq('user_id', user.id)
    .gte('scheduled_at', start)
    .lte('scheduled_at', end)
    .not('scheduled_at', 'is', null);

  if (pins) {
    events.push(...pins.map((pin: any) => ({
      id: pin.id,
      type: 'pin',
      title: pin.title,
      description: pin.description,
      scheduled_at: pin.scheduled_at,
      status: pin.status,
      metadata: { board: pin.boards?.name },
    })));
  }

  // Fetch campaign tasks
  const { data: tasks } = await (supabase as any)
    .from('campaign_tasks')
    .select(`
      id,
      title,
      description,
      scheduled_at,
      status,
      campaigns(name)
    `)
    .eq('user_id', user.id)
    .gte('scheduled_at', start)
    .lte('scheduled_at', end);

  if (tasks) {
    events.push(...tasks.map((task: any) => ({
      id: task.id,
      type: 'campaign_task',
      title: task.title,
      description: task.description,
      scheduled_at: task.scheduled_at,
      status: task.status,
      metadata: { campaign: task.campaigns?.name },
    })));
  }

  // Fetch campaign milestones (start/end dates)
  const { data: campaigns } = await (supabase as any)
    .from('campaigns')
    .select('id, name, starts_at, ends_at, status')
    .eq('user_id', user.id)
    .or(`starts_at.gte.${start},ends_at.lte.${end}`);

  if (campaigns) {
    campaigns.forEach((campaign: any) => {
      if (campaign.starts_at >= start && campaign.starts_at <= end) {
        events.push({
          id: `${campaign.id}-start`,
          type: 'campaign_milestone',
          title: `${campaign.name} - Launch`,
          scheduled_at: campaign.starts_at,
          status: campaign.status,
          metadata: { milestone: 'start', campaign_id: campaign.id },
        });
      }
      if (campaign.ends_at && campaign.ends_at >= start && campaign.ends_at <= end) {
        events.push({
          id: `${campaign.id}-end`,
          type: 'campaign_milestone',
          title: `${campaign.name} - End`,
          scheduled_at: campaign.ends_at,
          status: campaign.status,
          metadata: { milestone: 'end', campaign_id: campaign.id },
        });
      }
    });
  }

  // Sort by date
  events.sort((a, b) =>
    new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
  );

  return NextResponse.json({ events });
}
