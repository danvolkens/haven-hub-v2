'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/page-container';
import {
  Card,
  Button,
  buttonVariants,
  Badge,
  Input,
  Label,
} from '@/components/ui';
import {
  Play,
  Download,
  Copy,
  Check,
  Flame,
  Calendar,
  Clock,
  Video,
  Plus,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, isToday, isPast, isFuture } from 'date-fns';
import { useToast } from '@/components/providers/toast-provider';

// ============================================================================
// Types
// ============================================================================

interface TikTokQueueItem {
  id: string;
  quote_id: string;
  video_asset_id?: string;
  content_type: string;
  hook_id?: string;
  hook_text: string;
  caption: string;
  hashtags: string[];
  target_date: string;
  slot_type: 'morning' | 'evening';
  status: 'pending' | 'ready' | 'posted';
  posted_at?: string;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  quotes?: {
    text: string;
    author: string;
    collection: string;
  };
  video_url?: string;
  thumbnail_url?: string;
}

interface PostingStreak {
  current: number;
  longest: number;
  lastPostedAt?: string;
}

// ============================================================================
// Fetcher
// ============================================================================

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}

// ============================================================================
// Main Component
// ============================================================================

export default function TikTokQueuePage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedItem, setSelectedItem] = useState<TikTokQueueItem | null>(null);
  const [showMetricsModal, setShowMetricsModal] = useState(false);

  // Calculate week dates
  const weekStart = useMemo(() => {
    const today = new Date();
    const start = startOfWeek(today, { weekStartsOn: 1 }); // Monday
    return addDays(start, weekOffset * 7);
  }, [weekOffset]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  // Fetch queue items
  const { data: queueItems = [], isLoading } = useQuery({
    queryKey: ['tiktok-queue', format(weekStart, 'yyyy-MM-dd')],
    queryFn: () =>
      fetcher<TikTokQueueItem[]>(
        `/api/tiktok/queue?weekStart=${format(weekStart, 'yyyy-MM-dd')}`
      ),
  });

  // Fetch posting streak
  const { data: streak } = useQuery({
    queryKey: ['tiktok-streak'],
    queryFn: () => fetcher<PostingStreak>('/api/tiktok/streak'),
  });

  // Fetch pillar balance
  const { data: pillarBalance } = useQuery({
    queryKey: ['tiktok-pillar-balance'],
    queryFn: () => fetcher<{
      quote_reveals: { current: number; target: number; status: string };
      transformations: { current: number; target: number; status: string };
      educational: { current: number; target: number; status: string };
      bts: { current: number; target: number; status: string };
      trending: { current: number; target: number; status: string };
      suggestions: string[];
    }>('/api/tiktok/pillar-balance?action=balance'),
  });

  // Mark as posted mutation
  const markPostedMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tiktok/queue/${id}/posted`, {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error('Failed to mark as posted');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tiktok-queue'] });
      queryClient.invalidateQueries({ queryKey: ['tiktok-streak'] });
      toast('Marked as posted!', 'success');
    },
  });

  // Save metrics mutation
  const saveMetricsMutation = useMutation({
    mutationFn: async ({
      id,
      metrics,
    }: {
      id: string;
      metrics: { views?: number; likes?: number; comments?: number; shares?: number };
    }) => {
      const res = await fetch(`/api/tiktok/queue/${id}/metrics`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metrics),
      });
      if (!res.ok) throw new Error('Failed to save metrics');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tiktok-queue'] });
      setShowMetricsModal(false);
      setSelectedItem(null);
      toast('Metrics saved!', 'success');
    },
  });

  // Auto-fill week mutation
  const autoFillMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/tiktok/queue/auto-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStart: format(weekStart, 'yyyy-MM-dd') }),
      });
      if (!res.ok) throw new Error('Failed to auto-fill');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tiktok-queue'] });
      toast(`Created ${data.created} new queue entries`, 'success');
    },
  });

  // Copy to clipboard helper
  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast(`${label} copied!`, 'success');
  };

  // Get items for a specific day and slot
  const getSlotItem = (date: Date, slot: 'morning' | 'evening') => {
    return queueItems.find(
      (item) =>
        isSameDay(new Date(item.target_date), date) && item.slot_type === slot
    );
  };

  // Filter today's ready items
  const todayReadyItems = queueItems.filter(
    (item) =>
      isSameDay(new Date(item.target_date), new Date()) &&
      item.status === 'ready'
  );

  // Filter today's posted items
  const todayPostedItems = queueItems.filter(
    (item) =>
      isSameDay(new Date(item.target_date), new Date()) &&
      item.status === 'posted'
  );

  return (
    <PageContainer title="TikTok Queue">
      <div className="space-y-6">
        {/* Header with Streak */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">TikTok Queue</h1>
            <p className="text-muted-foreground">
              Prepare and track your TikTok posts
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Streak Counter */}
            {streak && streak.current > 0 && (
              <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-950 px-4 py-2 rounded-lg">
                <Flame className="h-5 w-5 text-orange-500" />
                <span className="font-bold text-orange-600 dark:text-orange-400">
                  {streak.current} day streak
                </span>
              </div>
            )}
            <Button
              onClick={() => autoFillMutation.mutate()}
              disabled={autoFillMutation.isPending}
            >
              {autoFillMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Auto-Fill Week
            </Button>
          </div>
        </div>

        {/* Pillar Balance Widget */}
        {pillarBalance && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Content Pillar Balance</h3>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {[
                { key: 'quote_reveals', label: 'Quote Reveals', target: 30 },
                { key: 'transformations', label: 'Transforms', target: 25 },
                { key: 'educational', label: 'Educational', target: 20 },
                { key: 'bts', label: 'BTS', target: 15 },
                { key: 'trending', label: 'Trending', target: 10 },
              ].map(({ key, label, target }) => {
                const pillar = pillarBalance[key as keyof typeof pillarBalance] as {
                  current: number;
                  target: number;
                  status: string;
                };
                if (!pillar || typeof pillar !== 'object') return null;
                const statusColor = pillar.status === 'ahead' ? 'bg-green-500' :
                  pillar.status === 'on_track' ? 'bg-blue-500' :
                  pillar.status === 'behind' ? 'bg-yellow-500' : 'bg-red-500';
                return (
                  <div key={key} className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">{label}</div>
                    <div className="text-lg font-bold">{pillar.current}/{pillar.target}</div>
                    <div className={`h-1 rounded-full mt-1 ${statusColor}`} />
                    <div className="text-[10px] text-muted-foreground mt-1">{target}%</div>
                  </div>
                );
              })}
            </div>
            {pillarBalance.suggestions && pillarBalance.suggestions.length > 0 && (
              <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
                <span className="font-medium">Tip:</span> {pillarBalance.suggestions[0]}
              </div>
            )}
          </Card>
        )}

        {/* Week Navigation */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setWeekOffset((o) => o - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="font-medium">
              {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setWeekOffset((o) => o + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Week View Grid */}
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const morningItem = getSlotItem(day, 'morning');
              const eveningItem = getSlotItem(day, 'evening');
              const dayIsPast = isPast(day) && !isToday(day);

              return (
                <div
                  key={day.toISOString()}
                  className={`border rounded-lg p-2 ${
                    isToday(day)
                      ? 'border-primary bg-primary/5'
                      : dayIsPast
                      ? 'opacity-50'
                      : ''
                  }`}
                >
                  <div className="text-center mb-2">
                    <div className="text-xs text-muted-foreground">
                      {format(day, 'EEE')}
                    </div>
                    <div
                      className={`text-sm font-medium ${
                        isToday(day) ? 'text-primary' : ''
                      }`}
                    >
                      {format(day, 'd')}
                    </div>
                  </div>

                  {/* Morning Slot */}
                  <SlotIndicator
                    label="AM"
                    item={morningItem}
                    disabled={dayIsPast}
                  />

                  {/* Evening Slot */}
                  <SlotIndicator
                    label="PM"
                    item={eveningItem}
                    disabled={dayIsPast}
                  />
                </div>
              );
            })}
          </div>
        </Card>

        {/* Today's Slots */}
        {todayReadyItems.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Ready to Post
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {todayReadyItems.map((item) => (
                <QueueCard
                  key={item.id}
                  item={item}
                  onCopyCaption={() => copyToClipboard(item.caption, 'Caption')}
                  onCopyHashtags={() =>
                    copyToClipboard(item.hashtags.join(' '), 'Hashtags')
                  }
                  onMarkPosted={() => markPostedMutation.mutate(item.id)}
                  isMarkingPosted={markPostedMutation.isPending}
                />
              ))}
            </div>
          </div>
        )}

        {/* Posted Today */}
        {todayPostedItems.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              Posted Today
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {todayPostedItems.map((item) => (
                <PostedCard
                  key={item.id}
                  item={item}
                  onEnterMetrics={() => {
                    setSelectedItem(item);
                    setShowMetricsModal(true);
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming This Week */}
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming This Week
          </h2>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : queueItems.filter((i) => i.status !== 'posted' && !isToday(new Date(i.target_date))).length === 0 ? (
            <Card className="p-8 text-center">
              <Video className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">
                No upcoming posts scheduled
              </p>
              <Button
                variant="secondary"
                className="mt-4"
                onClick={() => autoFillMutation.mutate()}
              >
                <Plus className="mr-2 h-4 w-4" />
                Auto-Fill Week
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {queueItems
                .filter(
                  (i) =>
                    i.status !== 'posted' &&
                    !isToday(new Date(i.target_date))
                )
                .sort((a, b) => new Date(a.target_date).getTime() - new Date(b.target_date).getTime())
                .map((item) => (
                  <UpcomingCard key={item.id} item={item} />
                ))}
            </div>
          )}
        </div>

        {/* Metrics Modal */}
        {showMetricsModal && selectedItem && (
          <MetricsModal
            item={selectedItem}
            onClose={() => {
              setShowMetricsModal(false);
              setSelectedItem(null);
            }}
            onSave={(metrics) =>
              saveMetricsMutation.mutate({ id: selectedItem.id, metrics })
            }
            isSaving={saveMetricsMutation.isPending}
          />
        )}
      </div>
    </PageContainer>
  );
}

// ============================================================================
// Slot Indicator Component
// ============================================================================

function SlotIndicator({
  label,
  item,
  disabled,
}: {
  label: string;
  item?: TikTokQueueItem;
  disabled?: boolean;
}) {
  let icon;
  let bgColor = 'bg-muted';

  if (item) {
    if (item.status === 'posted') {
      icon = <Check className="h-3 w-3 text-green-600" />;
      bgColor = 'bg-green-100 dark:bg-green-900';
    } else if (item.status === 'ready') {
      icon = <div className="h-2 w-2 rounded-full bg-primary" />;
      bgColor = 'bg-primary/10';
    } else {
      icon = <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />;
      bgColor = 'bg-yellow-50 dark:bg-yellow-900';
    }
  }

  return (
    <div
      className={`flex items-center justify-between px-2 py-1 rounded text-xs mb-1 ${bgColor} ${
        disabled ? 'opacity-50' : ''
      }`}
    >
      <span className="text-muted-foreground">{label}</span>
      {icon || <Plus className="h-3 w-3 text-muted-foreground" />}
    </div>
  );
}

// ============================================================================
// Queue Card Component (Ready to Post)
// ============================================================================

function QueueCard({
  item,
  onCopyCaption,
  onCopyHashtags,
  onMarkPosted,
  isMarkingPosted,
}: {
  item: TikTokQueueItem;
  onCopyCaption: () => void;
  onCopyHashtags: () => void;
  onMarkPosted: () => void;
  isMarkingPosted: boolean;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex">
        {/* Video Thumbnail */}
        <div className="relative w-32 h-44 bg-muted shrink-0">
          {item.thumbnail_url ? (
            <img
              src={item.thumbnail_url}
              alt="Video thumbnail"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Video className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Play className="h-8 w-8 text-white" />
          </div>
          <Badge className="absolute top-2 left-2" size="sm">
            {item.slot_type === 'morning' ? '7-9 AM' : '7-9 PM'}
          </Badge>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 flex flex-col">
          {/* Hook */}
          <div className="font-medium text-sm mb-2 line-clamp-2">
            {item.hook_text}
          </div>

          {/* Quote preview */}
          {item.quotes && (
            <p className="text-xs text-muted-foreground italic mb-2 line-clamp-2">
              &ldquo;{item.quotes.text}&rdquo;
            </p>
          )}

          {/* Collection badge */}
          {item.quotes && (
            <Badge variant="secondary" size="sm" className="w-fit mb-3">
              {item.quotes.collection}
            </Badge>
          )}

          {/* Action buttons */}
          <div className="mt-auto flex flex-wrap gap-2">
            {item.video_url && (
              <a
                href={item.video_url}
                download
                className={buttonVariants({ variant: 'secondary', size: 'sm' })}
              >
                <Download className="mr-1 h-3 w-3" />
                Download
              </a>
            )}
            <Button variant="secondary" size="sm" onClick={onCopyCaption}>
              <Copy className="mr-1 h-3 w-3" />
              Caption
            </Button>
            <Button variant="secondary" size="sm" onClick={onCopyHashtags}>
              <Copy className="mr-1 h-3 w-3" />
              Tags
            </Button>
            <Button
              size="sm"
              onClick={onMarkPosted}
              disabled={isMarkingPosted}
            >
              {isMarkingPosted ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Check className="mr-1 h-3 w-3" />
              )}
              Posted
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// Posted Card Component
// ============================================================================

function PostedCard({
  item,
  onEnterMetrics,
}: {
  item: TikTokQueueItem;
  onEnterMetrics: () => void;
}) {
  const hasMetrics = item.views !== undefined && item.views !== null;

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        {/* Thumbnail */}
        <div className="relative w-16 h-20 bg-muted rounded shrink-0">
          {item.thumbnail_url ? (
            <img
              src={item.thumbnail_url}
              alt="Video thumbnail"
              className="w-full h-full object-cover rounded"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Video className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <div className="absolute -top-1 -right-1">
            <Badge variant="success" size="sm">
              <Check className="h-3 w-3" />
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium line-clamp-2 mb-1">
            {item.hook_text}
          </p>
          <p className="text-xs text-muted-foreground mb-2">
            Posted {item.posted_at ? format(new Date(item.posted_at), 'h:mm a') : 'today'}
          </p>

          {hasMetrics ? (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {item.views?.toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <Heart className="h-3 w-3" />
                {item.likes?.toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                {item.comments?.toLocaleString()}
              </span>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={onEnterMetrics}>
              Enter Metrics
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// Upcoming Card Component
// ============================================================================

function UpcomingCard({ item }: { item: TikTokQueueItem }) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        {/* Thumbnail */}
        <div className="relative w-12 h-16 bg-muted rounded shrink-0">
          {item.thumbnail_url ? (
            <img
              src={item.thumbnail_url}
              alt="Video thumbnail"
              className="w-full h-full object-cover rounded"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Video className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">
              {format(new Date(item.target_date), 'EEE, MMM d')}
            </span>
            <Badge variant="secondary" size="sm">
              {item.slot_type === 'morning' ? 'AM' : 'PM'}
            </Badge>
            {item.status === 'pending' && (
              <Badge variant="warning" size="sm">
                Pending
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {item.hook_text}
          </p>
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// Metrics Modal Component
// ============================================================================

function MetricsModal({
  item,
  onClose,
  onSave,
  isSaving,
}: {
  item: TikTokQueueItem;
  onClose: () => void;
  onSave: (metrics: {
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
  }) => void;
  isSaving: boolean;
}) {
  const [views, setViews] = useState(item.views?.toString() || '');
  const [likes, setLikes] = useState(item.likes?.toString() || '');
  const [comments, setComments] = useState(item.comments?.toString() || '');
  const [shares, setShares] = useState(item.shares?.toString() || '');

  const handleSave = () => {
    onSave({
      views: views ? parseInt(views) : undefined,
      likes: likes ? parseInt(likes) : undefined,
      comments: comments ? parseInt(comments) : undefined,
      shares: shares ? parseInt(shares) : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">Enter Metrics</h2>

        <div className="space-y-4">
          <div>
            <Label htmlFor="views" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Views
            </Label>
            <Input
              id="views"
              type="number"
              value={views}
              onChange={(e) => setViews(e.target.value)}
              placeholder="0"
            />
          </div>

          <div>
            <Label htmlFor="likes" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Likes
            </Label>
            <Input
              id="likes"
              type="number"
              value={likes}
              onChange={(e) => setLikes(e.target.value)}
              placeholder="0"
            />
          </div>

          <div>
            <Label htmlFor="comments" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Comments
            </Label>
            <Input
              id="comments"
              type="number"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="0"
            />
          </div>

          <div>
            <Label htmlFor="shares" className="flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              Shares
            </Label>
            <Input
              id="shares"
              type="number"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Metrics'
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
