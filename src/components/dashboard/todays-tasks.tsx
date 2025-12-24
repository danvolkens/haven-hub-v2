import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, ListTodo } from 'lucide-react';

interface TodaysTasksProps {
  userId: string;
}

export async function TodaysTasks({ userId }: TodaysTasksProps) {
  const supabase = await createClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Fetch scheduled pins for today
  const { data: scheduledPins } = await (supabase as any)
    .from('pins')
    .select('id, title, scheduled_at, status')
    .eq('user_id', userId)
    .gte('scheduled_at', today.toISOString())
    .lt('scheduled_at', tomorrow.toISOString())
    .order('scheduled_at', { ascending: true });

  // Fetch pending approvals count
  const { count: pendingCount } = await (supabase as any)
    .from('approvals')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'pending');

  const tasks = [
    ...(scheduledPins || []).map((pin: any) => ({
      id: `pin-${pin.id}`,
      title: `Publish: ${pin.title || 'Untitled Pin'}`,
      time: new Date(pin.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      completed: pin.status === 'published',
      type: 'pin',
    })),
    ...(pendingCount && pendingCount > 0
      ? [{
          id: 'approvals',
          title: `Review ${pendingCount} pending approval${pendingCount > 1 ? 's' : ''}`,
          time: null,
          completed: false,
          type: 'approval',
        }]
      : []),
  ];

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <ListTodo className="h-4 w-4" />
        Today&apos;s Tasks
      </h3>
      <div className="space-y-3">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <div key={task.id} className="flex items-start gap-3">
              {task.completed ? (
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                  {task.title}
                </p>
                {task.time && (
                  <p className="text-xs text-muted-foreground">{task.time}</p>
                )}
              </div>
              <Badge variant="outline" className="text-xs">
                {task.type}
              </Badge>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No tasks for today</p>
        )}
      </div>
    </Card>
  );
}
