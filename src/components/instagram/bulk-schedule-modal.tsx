'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Badge,
  Select,
  Input,
} from '@/components/ui';
import {
  X,
  CheckCircle,
  Clock,
  Calendar,
  AlertTriangle,
  Check,
  Square,
  CheckSquare,
  Sparkles,
  Hash,
  ImageIcon,
  Facebook,
  ShoppingBag,
  Tag,
  ChevronRight,
  Loader2,
  Info,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

type ContentPillar = 'inspiration' | 'education' | 'engagement' | 'promotion';
type ScheduleMode = 'auto' | 'custom';

interface QuoteOption {
  id: string;
  text: string;
  author: string;
  collection: string;
  content_pillar?: ContentPillar;
  video_status: 'ready' | 'pending' | 'none';
  video_url?: string;
}

interface CaptionTemplate {
  id: string;
  name: string;
  content_pillar: ContentPillar;
}

interface Campaign {
  id: string;
  name: string;
}

interface OptimalSlot {
  datetime: string;
  engagement_rate: number;
  day_theme: string;
}

interface ScheduledItem {
  quote_id: string;
  quote_text: string;
  scheduled_at: string;
  content_pillar: ContentPillar;
  post_type: 'feed' | 'reel';
}

interface PillarMix {
  pillar: ContentPillar;
  count: number;
  percentage: number;
  target: number;
  status: 'ok' | 'warning';
}

interface BulkScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedQuoteIds?: string[];
}

// ============================================================================
// Constants
// ============================================================================

const PILLAR_TARGETS: Record<ContentPillar, number> = {
  inspiration: 40,
  education: 20,
  engagement: 20,
  promotion: 20,
};

const PILLAR_COLORS: Record<ContentPillar, string> = {
  inspiration: 'bg-grounding text-charcoal',
  education: 'bg-wholeness text-charcoal',
  engagement: 'bg-growth text-charcoal',
  promotion: 'bg-sage text-white',
};

// ============================================================================
// Mock Data
// ============================================================================

const mockQuotes: QuoteOption[] = [
  { id: '1', text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs', collection: 'grounding', content_pillar: 'inspiration', video_status: 'ready' },
  { id: '2', text: 'In the middle of difficulty lies opportunity.', author: 'Einstein', collection: 'wholeness', content_pillar: 'education', video_status: 'ready' },
  { id: '3', text: 'You are braver than you believe.', author: 'A.A. Milne', collection: 'growth', content_pillar: 'engagement', video_status: 'pending' },
  { id: '4', text: 'Every moment is a fresh beginning.', author: 'T.S. Eliot', collection: 'grounding', content_pillar: 'inspiration', video_status: 'ready' },
  { id: '5', text: 'Believe you can and you\'re halfway there.', author: 'Roosevelt', collection: 'growth', content_pillar: 'engagement', video_status: 'none' },
  { id: '6', text: 'The best time to plant a tree was 20 years ago.', author: 'Proverb', collection: 'wholeness', content_pillar: 'education', video_status: 'ready' },
];

const mockTemplates: CaptionTemplate[] = [
  { id: 'auto', name: 'Auto-select by collection', content_pillar: 'inspiration' },
  { id: '1', name: 'Monday Motivation', content_pillar: 'inspiration' },
  { id: '2', name: 'Quote of the Day', content_pillar: 'education' },
  { id: '3', name: 'Engagement Ask', content_pillar: 'engagement' },
];

const mockCampaigns: Campaign[] = [
  { id: '', name: 'No campaign' },
  { id: '1', name: 'Winter Collection' },
  { id: '2', name: 'Valentine\'s Day' },
];

const mockOptimalSlots: OptimalSlot[] = [
  { datetime: new Date(Date.now() + 1000 * 60 * 60 * 3).toISOString(), engagement_rate: 4.2, day_theme: 'Motivation Monday' },
  { datetime: new Date(Date.now() + 1000 * 60 * 60 * 27).toISOString(), engagement_rate: 3.8, day_theme: 'Educational' },
  { datetime: new Date(Date.now() + 1000 * 60 * 60 * 51).toISOString(), engagement_rate: 4.5, day_theme: 'Wisdom Wednesday' },
  { datetime: new Date(Date.now() + 1000 * 60 * 60 * 75).toISOString(), engagement_rate: 3.9, day_theme: 'Throwback Thursday' },
  { datetime: new Date(Date.now() + 1000 * 60 * 60 * 99).toISOString(), engagement_rate: 5.1, day_theme: 'Feel-Good Friday' },
];

// ============================================================================
// Helper Functions
// ============================================================================

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function calculateMix(items: ScheduledItem[]): PillarMix[] {
  const counts: Record<ContentPillar, number> = {
    inspiration: 0,
    education: 0,
    engagement: 0,
    promotion: 0,
  };

  items.forEach((item) => {
    if (item.content_pillar) {
      counts[item.content_pillar]++;
    }
  });

  const total = items.length || 1;

  return (Object.keys(counts) as ContentPillar[]).map((pillar) => {
    const percentage = Math.round((counts[pillar] / total) * 100);
    const target = PILLAR_TARGETS[pillar];
    return {
      pillar,
      count: counts[pillar],
      percentage,
      target,
      status: percentage >= target * 0.5 ? 'ok' : 'warning',
    };
  });
}

function generateSchedule(
  quotes: QuoteOption[],
  slots: OptimalSlot[],
  mode: ScheduleMode,
  customSettings: { startDate: string; postsPerDay: number; times: string[] }
): ScheduledItem[] {
  if (mode === 'auto') {
    return quotes.map((quote, idx) => ({
      quote_id: quote.id,
      quote_text: quote.text,
      scheduled_at: slots[idx % slots.length]?.datetime || new Date().toISOString(),
      content_pillar: quote.content_pillar || 'inspiration',
      post_type: quote.video_status === 'ready' ? 'reel' : 'feed',
    }));
  }

  // Custom schedule
  const scheduled: ScheduledItem[] = [];
  const startDate = new Date(customSettings.startDate);
  let currentDay = 0;
  let timeIndex = 0;

  quotes.forEach((quote) => {
    const postDate = new Date(startDate);
    postDate.setDate(postDate.getDate() + currentDay);

    const timeParts = customSettings.times[timeIndex % customSettings.times.length].split(':');
    postDate.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]));

    scheduled.push({
      quote_id: quote.id,
      quote_text: quote.text,
      scheduled_at: postDate.toISOString(),
      content_pillar: quote.content_pillar || 'inspiration',
      post_type: quote.video_status === 'ready' ? 'reel' : 'feed',
    });

    timeIndex++;
    if (timeIndex >= customSettings.postsPerDay) {
      timeIndex = 0;
      currentDay++;
    }
  });

  return scheduled;
}

// ============================================================================
// Main Component
// ============================================================================

export function BulkScheduleModal({
  isOpen,
  onClose,
  preselectedQuoteIds = [],
}: BulkScheduleModalProps) {
  const queryClient = useQueryClient();

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(preselectedQuoteIds));

  // Schedule settings
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('auto');
  const [customSettings, setCustomSettings] = useState({
    startDate: new Date().toISOString().split('T')[0],
    postsPerDay: 2,
    times: ['09:00', '18:00'],
  });

  // Content settings
  const [templateId, setTemplateId] = useState('auto');
  const [autoHashtags, setAutoHashtags] = useState(true);
  const [autoAltText, setAutoAltText] = useState(true);
  const [crossPostFacebook, setCrossPostFacebook] = useState(false);
  const [shoppingTags, setShoppingTags] = useState(false);
  const [campaignId, setCampaignId] = useState('');

  // Fetch quotes
  const { data: quotes = mockQuotes, isLoading: loadingQuotes } = useQuery({
    queryKey: ['schedulable-quotes'],
    queryFn: async () => {
      const res = await fetch('/api/quotes?status=approved&has_asset=true');
      if (!res.ok) throw new Error('Failed to fetch quotes');
      return res.json();
    },
  });

  // Fetch optimal slots
  const { data: optimalSlots = mockOptimalSlots } = useQuery({
    queryKey: ['optimal-slots', 'bulk'],
    queryFn: async () => {
      const res = await fetch('/api/instagram/optimal-slots?count=20');
      if (!res.ok) throw new Error('Failed to fetch slots');
      return res.json();
    },
  });

  // Fetch templates
  const { data: templates = mockTemplates } = useQuery({
    queryKey: ['caption-templates'],
    queryFn: async () => {
      const res = await fetch('/api/instagram/templates');
      if (!res.ok) throw new Error('Failed to fetch templates');
      return res.json();
    },
  });

  // Fetch campaigns
  const { data: campaigns = mockCampaigns } = useQuery({
    queryKey: ['campaigns-list'],
    queryFn: async () => {
      const res = await fetch('/api/campaigns?status=active');
      if (!res.ok) throw new Error('Failed to fetch campaigns');
      return res.json();
    },
  });

  // Calculate schedule preview
  const selectedQuotes = useMemo(() => {
    return quotes.filter((q: QuoteOption) => selectedIds.has(q.id));
  }, [quotes, selectedIds]);

  const scheduledItems = useMemo(() => {
    return generateSchedule(selectedQuotes, optimalSlots, scheduleMode, customSettings);
  }, [selectedQuotes, optimalSlots, scheduleMode, customSettings]);

  const pillarMix = useMemo(() => {
    return calculateMix(scheduledItems);
  }, [scheduledItems]);

  const hasWarnings = pillarMix.some((p) => p.status === 'warning');

  // Bulk schedule mutation
  const scheduleMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/instagram/posts/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          posts: scheduledItems.map((item) => ({
            quote_id: item.quote_id,
            scheduled_at: item.scheduled_at,
            post_type: item.post_type,
            template_id: templateId === 'auto' ? null : templateId,
            auto_hashtags: autoHashtags,
            auto_alt_text: autoAltText,
            cross_post_facebook: crossPostFacebook,
            add_shopping_tags: shoppingTags,
            campaign_id: campaignId || null,
          })),
        }),
      });
      if (!res.ok) throw new Error('Failed to schedule posts');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-posts'] });
      queryClient.invalidateQueries({ queryKey: ['instagram-calendar-posts'] });
      onClose();
    },
  });

  // Selection handlers
  const handleToggleQuote = (quoteId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(quoteId)) {
        next.delete(quoteId);
      } else {
        next.add(quoteId);
      }
      return next;
    });
  };

  const handleSelectAllReady = () => {
    const readyIds = quotes
      .filter((q: QuoteOption) => q.video_status === 'ready' || q.video_status === 'none')
      .map((q: QuoteOption) => q.id);
    setSelectedIds(new Set(readyIds));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-xl bg-surface shadow-elevation-3">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-surface px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold">Bulk Schedule Posts</h2>
            <p className="text-sm text-muted-foreground">
              Select quotes and schedule multiple posts at once
            </p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 p-6">
          {/* Left Column - Quote Selection */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h3 className="font-semibold">Select Quotes</h3>
                <Badge size="sm" variant="secondary">
                  {selectedIds.size} selected
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleSelectAllReady}>
                  Select All Ready
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDeselectAll}>
                  Deselect All
                </Button>
              </div>
            </div>

            <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
              {loadingQuotes ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : quotes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No quotes available for scheduling
                </div>
              ) : (
                quotes.map((quote: QuoteOption) => {
                  const isSelected = selectedIds.has(quote.id);
                  const isReady = quote.video_status === 'ready';
                  const isPending = quote.video_status === 'pending';

                  return (
                    <button
                      key={quote.id}
                      type="button"
                      onClick={() => handleToggleQuote(quote.id)}
                      className={`w-full flex items-start gap-3 p-3 text-left hover:bg-muted/50 transition-colors ${
                        isSelected ? 'bg-sage/5' : ''
                      }`}
                    >
                      {isSelected ? (
                        <CheckSquare className="h-5 w-5 text-sage shrink-0 mt-0.5" />
                      ) : (
                        <Square className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm line-clamp-2">{quote.text}</p>
                        <p className="text-xs text-muted-foreground mt-1">— {quote.author}</p>
                      </div>
                      <div className="shrink-0">
                        {isReady && (
                          <Badge size="sm" variant="success">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Ready
                          </Badge>
                        )}
                        {isPending && (
                          <Badge size="sm" variant="warning">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                        {quote.video_status === 'none' && (
                          <Badge size="sm" variant="secondary">
                            <ImageIcon className="h-3 w-3 mr-1" />
                            Image
                          </Badge>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Scheduling Options */}
            <div className="space-y-4">
              <h3 className="font-semibold">Scheduling Options</h3>

              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={scheduleMode === 'auto'}
                    onChange={() => setScheduleMode('auto')}
                    className="text-sage"
                  />
                  <Sparkles className="h-4 w-4 text-sage" />
                  <span className="text-sm">Auto-assign optimal times</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={scheduleMode === 'custom'}
                    onChange={() => setScheduleMode('custom')}
                    className="text-sage"
                  />
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">Custom schedule</span>
                </label>
              </div>

              {scheduleMode === 'custom' && (
                <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <label className="text-xs font-medium mb-1 block">Start Date</label>
                    <Input
                      type="date"
                      value={customSettings.startDate}
                      onChange={(e) =>
                        setCustomSettings((prev) => ({ ...prev, startDate: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Posts Per Day</label>
                    <Select
                      value={customSettings.postsPerDay.toString()}
                      onChange={(value) =>
                        setCustomSettings((prev) => ({
                          ...prev,
                          postsPerDay: parseInt(value as string),
                        }))
                      }
                      options={[
                        { value: '1', label: '1 post' },
                        { value: '2', label: '2 posts' },
                        { value: '3', label: '3 posts' },
                      ]}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Posting Times</label>
                    <div className="flex gap-2">
                      <Input
                        type="time"
                        value={customSettings.times[0]}
                        onChange={(e) =>
                          setCustomSettings((prev) => ({
                            ...prev,
                            times: [e.target.value, prev.times[1] || '18:00'],
                          }))
                        }
                        className="w-full"
                      />
                      {customSettings.postsPerDay >= 2 && (
                        <Input
                          type="time"
                          value={customSettings.times[1] || '18:00'}
                          onChange={(e) =>
                            setCustomSettings((prev) => ({
                              ...prev,
                              times: [prev.times[0], e.target.value],
                            }))
                          }
                          className="w-full"
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Content Settings */}
            <div className="space-y-4">
              <h3 className="font-semibold">Content Settings (apply to all)</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium mb-1 block">Caption Template</label>
                  <Select
                    value={templateId}
                    onChange={(value) => setTemplateId(value as string)}
                    options={templates.map((t: CaptionTemplate) => ({ value: t.id, label: t.name }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Campaign</label>
                  <Select
                    value={campaignId}
                    onChange={(value) => setCampaignId(value as string)}
                    options={campaigns.map((c: Campaign) => ({ value: c.id, label: c.name }))}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={autoHashtags}
                    onChange={(e) => setAutoHashtags(e.target.checked)}
                    className="rounded"
                  />
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Auto hashtags</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={autoAltText}
                    onChange={(e) => setAutoAltText(e.target.checked)}
                    className="rounded"
                  />
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Auto alt text</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={crossPostFacebook}
                    onChange={(e) => setCrossPostFacebook(e.target.checked)}
                    className="rounded"
                  />
                  <Facebook className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">Cross-post to Facebook</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={shoppingTags}
                    onChange={(e) => setShoppingTags(e.target.checked)}
                    className="rounded"
                  />
                  <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Add shopping tags</span>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column - Preview */}
          <div className="space-y-4">
            <h3 className="font-semibold">Schedule Preview</h3>

            {/* Content Mix Summary */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Content Mix</span>
                {hasWarnings && (
                  <Badge size="sm" variant="warning">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Unbalanced
                  </Badge>
                )}
              </div>
              <div className="space-y-2">
                {pillarMix.map((mix) => (
                  <div key={mix.pillar} className="flex items-center gap-2">
                    <Badge size="sm" variant={mix.pillar as 'grounding' | 'wholeness' | 'growth' | 'primary'}>
                      {mix.pillar}
                    </Badge>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${PILLAR_COLORS[mix.pillar].split(' ')[0]}`}
                        style={{ width: `${mix.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-16 text-right">
                      {mix.percentage}% / {mix.target}%
                    </span>
                  </div>
                ))}
              </div>
              {hasWarnings && (
                <div className="flex items-start gap-2 text-xs text-warning mt-2">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>Your content mix is unbalanced. Consider adding more variety for better engagement.</span>
                </div>
              )}
            </div>

            {/* Scheduled Posts List */}
            <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
              {scheduledItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Select quotes to see preview
                </div>
              ) : (
                scheduledItems.map((item, idx) => (
                  <div key={idx} className="p-3 text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{formatDateTime(item.scheduled_at)}</span>
                      <Badge size="sm" variant="secondary">
                        {item.post_type}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground line-clamp-1">{item.quote_text}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-between border-t bg-surface px-6 py-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => scheduleMutation.mutate()}
            disabled={selectedIds.size === 0 || scheduleMutation.isPending}
          >
            {scheduleMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scheduling...
              </>
            ) : (
              <>
                <ChevronRight className="mr-2 h-4 w-4" />
                Schedule {selectedIds.size} Posts
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
