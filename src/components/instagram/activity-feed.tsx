'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardContent, Badge } from '@/components/ui';
import { Loader2, Activity, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface ActivityEntry {
  id: string;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

const EVENT_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  post_scheduled: { icon: '📅', label: 'Scheduled', color: 'blue' },
  post_published: { icon: '✅', label: 'Published', color: 'green' },
  post_failed: { icon: '❌', label: 'Failed', color: 'red' },
  post_approved: { icon: '👍', label: 'Approved', color: 'green' },
  post_rejected: { icon: '👎', label: 'Rejected', color: 'yellow' },
  video_generated: { icon: '🎬', label: 'Video', color: 'purple' },
  story_scheduled: { icon: '📖', label: 'Story', color: 'blue' },
  story_published: { icon: '📖', label: 'Story', color: 'green' },
  tiktok_queued: { icon: '🎵', label: 'TikTok', color: 'pink' },
  metrics_synced: { icon: '📊', label: 'Metrics', color: 'blue' },
};

async function fetchActivity(limit: number): Promise<{ activity: ActivityEntry[] }> {
  const res = await fetch(`/api/instagram/activity?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}

export function ActivityFeed({ limit = 10 }: { limit?: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ['instagram-activity', limit],
    queryFn: () => fetchActivity(limit),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="font-semibold">Recent Activity</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data?.activity?.length) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="font-semibold">Recent Activity</span>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-4">
            No recent activity
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          <span className="font-semibold">Recent Activity</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.activity.map((entry) => {
            const config = EVENT_CONFIG[entry.event_type] || {
              icon: '📌',
              label: entry.event_type.replace(/_/g, ' '),
              color: 'gray',
            };

            const getLink = () => {
              if (entry.event_type.includes('post')) return '/dashboard/instagram/review';
              if (entry.event_type.includes('story')) return '/dashboard/instagram/stories';
              if (entry.event_type.includes('tiktok')) return '/dashboard/tiktok';
              if (entry.event_type.includes('video')) return '/dashboard/instagram';
              return null;
            };

            const link = getLink();

            return (
              <div
                key={entry.id}
                className="flex items-start gap-3 text-sm"
              >
                <span className="text-lg">{config.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" size="sm">
                      {config.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {entry.metadata.error && (
                    <p className="text-xs text-red-500 mt-1 truncate">
                      {entry.metadata.error}
                    </p>
                  )}
                </div>
                {link && (
                  <Link
                    href={link}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
