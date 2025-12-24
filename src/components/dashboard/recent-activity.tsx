import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Activity } from 'lucide-react';

interface RecentActivityProps {
  userId: string;
}

export async function RecentActivity({ userId }: RecentActivityProps) {
  const supabase = await createClient();

  // Fetch recent user activity
  const { data: activities } = await (supabase as any)
    .from('user_activity')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <Activity className="h-4 w-4" />
        Recent Activity
      </h3>
      <div className="space-y-3">
        {activities && activities.length > 0 ? (
          activities.map((activity: any) => (
            <div key={activity.id} className="flex items-start gap-3 text-sm">
              <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5" />
              <div>
                <p className="text-foreground">{activity.action}</p>
                <p className="text-muted-foreground text-xs">
                  {new Date(activity.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No recent activity</p>
        )}
      </div>
    </Card>
  );
}
