'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/page-container';
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Badge,
  Select,
} from '@/components/ui';
import {
  ArrowLeft,
  Calendar,
  Layers,
  Sparkles,
  Check,
  AlertTriangle,
  Loader2,
  Plus,
  X,
} from 'lucide-react';
import Link from 'next/link';

// ============================================================================
// Types
// ============================================================================

type PostType = 'feed' | 'reel' | 'carousel';
type ContentPillar = 'product_showcase' | 'brand_story' | 'educational' | 'community';

interface Quote {
  id: string;
  text: string;
  attribution: string | null;
  collection: string | null;
}

interface ScheduleSlot {
  quoteId: string;
  quoteText: string;
  postType: PostType;
  contentPillar: ContentPillar;
  scheduledAt: string;
}

interface OptimalTime {
  time: string;
  day: string;
  engagement_rate: number;
}

// ============================================================================
// Constants
// ============================================================================

const POST_TYPES: { value: PostType; label: string }[] = [
  { value: 'feed', label: 'Feed Post' },
  { value: 'reel', label: 'Reel' },
  { value: 'carousel', label: 'Carousel' },
];

const CONTENT_PILLARS: { value: ContentPillar; label: string }[] = [
  { value: 'product_showcase', label: 'Product Showcase' },
  { value: 'brand_story', label: 'Brand Story' },
  { value: 'educational', label: 'Educational' },
  { value: 'community', label: 'Community' },
];

// ============================================================================
// Main Component
// ============================================================================

export default function BulkSchedulePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [selectedQuotes, setSelectedQuotes] = useState<string[]>([]);
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>([]);
  const [defaultPostType, setDefaultPostType] = useState<PostType>('feed');
  const [defaultPillar, setDefaultPillar] = useState<ContentPillar>('product_showcase');

  // Fetch quotes
  const { data: quotes = [], isLoading: loadingQuotes } = useQuery<Quote[]>({
    queryKey: ['quotes', 'active'],
    queryFn: async () => {
      const res = await fetch('/api/quotes?status=active&limit=100');
      if (!res.ok) return [];
      const data = await res.json();
      return data.quotes || data || [];
    },
  });

  // Fetch optimal times
  const { data: optimalTimes = [] } = useQuery<OptimalTime[]>({
    queryKey: ['instagram-optimal-times'],
    queryFn: async () => {
      const res = await fetch('/api/instagram/optimal-times');
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch pillar balance
  const { data: pillarData } = useQuery<{ balance: any[]; isHealthy: boolean }>({
    queryKey: ['instagram', 'pillar-balance'],
    queryFn: async () => {
      const res = await fetch('/api/instagram/pillar-balance');
      if (!res.ok) return { balance: [], isHealthy: true };
      return res.json();
    },
  });

  // Create posts mutation - use bulk API for efficiency
  const createMutation = useMutation({
    mutationFn: async () => {
      const posts = scheduleSlots.map((slot) => {
        const quote = quotes.find(q => q.id === slot.quoteId);
        let caption = `"${quote?.text || ''}"`;
        if (quote?.attribution) {
          caption += `\n\n— ${quote.attribution}`;
        }

        return {
          quote_id: slot.quoteId,
          post_type: slot.postType,
          content_pillar: slot.contentPillar,
          caption,
          hashtags: [],
          scheduled_at: slot.scheduledAt,
          // Let the API determine based on operator mode
          // Don't force requires_review: true
        };
      });

      const res = await fetch('/api/instagram/posts/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posts }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create posts');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram'] });
      router.push('/dashboard/instagram/calendar');
    },
  });

  // Toggle quote selection
  const toggleQuote = (quoteId: string) => {
    setSelectedQuotes(prev =>
      prev.includes(quoteId)
        ? prev.filter(id => id !== quoteId)
        : [...prev, quoteId]
    );
  };

  // Auto-assign optimal times
  const autoAssignTimes = () => {
    if (selectedQuotes.length === 0) return;

    const now = new Date();
    const slots: ScheduleSlot[] = [];

    // Sort optimal times by engagement rate
    const sortedTimes = [...optimalTimes].sort((a, b) => b.engagement_rate - a.engagement_rate);

    selectedQuotes.forEach((quoteId, index) => {
      const quote = quotes.find(q => q.id === quoteId);
      if (!quote) return;

      // Get the next available optimal time
      const optimalTime = sortedTimes[index % sortedTimes.length];

      // Calculate the next occurrence of this day/time
      const dayIndex = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        .indexOf(optimalTime?.day || 'Monday');

      const scheduledDate = new Date(now);
      const daysUntil = (dayIndex - now.getDay() + 7) % 7 || 7;
      scheduledDate.setDate(now.getDate() + daysUntil + Math.floor(index / sortedTimes.length) * 7);

      // Parse time
      if (optimalTime?.time) {
        const [time, period] = optimalTime.time.split(' ');
        let [hours] = time.split(':').map(Number);
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        scheduledDate.setHours(hours, 0, 0, 0);
      } else {
        scheduledDate.setHours(10, 0, 0, 0);
      }

      slots.push({
        quoteId,
        quoteText: quote.text,
        postType: defaultPostType,
        contentPillar: defaultPillar,
        scheduledAt: scheduledDate.toISOString(),
      });
    });

    setScheduleSlots(slots);
  };

  // Remove slot
  const removeSlot = (index: number) => {
    setScheduleSlots(prev => prev.filter((_, i) => i !== index));
    setSelectedQuotes(prev => prev.filter((_, i) => i !== index));
  };

  // Update slot
  const updateSlot = (index: number, updates: Partial<ScheduleSlot>) => {
    setScheduleSlots(prev =>
      prev.map((slot, i) => (i === index ? { ...slot, ...updates } : slot))
    );
  };

  // Calculate pillar distribution of scheduled posts
  const pillarCounts = scheduleSlots.reduce((acc, slot) => {
    acc[slot.contentPillar] = (acc[slot.contentPillar] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const hasWarning = pillarData?.balance?.some(p => p.status === 'warning');

  return (
    <PageContainer title="Bulk Schedule">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard/instagram/calendar">
            <Button variant="ghost" size="icon-sm">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold">Bulk Schedule</h2>
            <p className="text-sm text-muted-foreground">
              Select quotes and auto-assign optimal posting times
            </p>
          </div>
        </div>

        {/* Pillar Balance Warning */}
        {hasWarning && (
          <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800">Content Mix Warning</p>
              <p className="text-sm text-yellow-700">
                Your content pillar balance needs attention. Consider scheduling more diverse content types.
              </p>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Quote Selection */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Select Quotes</h3>
                <Badge variant="secondary">{selectedQuotes.length} selected</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Default settings */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium mb-1 block">Default Post Type</label>
                    <Select
                      value={defaultPostType}
                      onChange={(v) => setDefaultPostType(v as PostType)}
                      options={POST_TYPES}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Default Pillar</label>
                    <Select
                      value={defaultPillar}
                      onChange={(v) => setDefaultPillar(v as ContentPillar)}
                      options={CONTENT_PILLARS}
                    />
                  </div>
                </div>

                {/* Quote list */}
                <div className="max-h-[400px] overflow-y-auto space-y-2">
                  {loadingQuotes ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : quotes.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">No quotes available</p>
                  ) : (
                    quotes.map((quote) => (
                      <button
                        key={quote.id}
                        type="button"
                        onClick={() => toggleQuote(quote.id)}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                          selectedQuotes.includes(quote.id)
                            ? 'border-sage bg-sage/10'
                            : 'border-transparent bg-muted hover:border-sage/50'
                        }`}
                      >
                        <p className="text-sm line-clamp-2">{quote.text}</p>
                        {quote.attribution && (
                          <p className="text-xs text-muted-foreground mt-1">— {quote.attribution}</p>
                        )}
                        {quote.collection && (
                          <Badge size="sm" variant="secondary" className="mt-1">
                            {quote.collection}
                          </Badge>
                        )}
                      </button>
                    ))
                  )}
                </div>

                {/* Auto-assign button */}
                <Button
                  onClick={autoAssignTimes}
                  disabled={selectedQuotes.length === 0}
                  className="w-full"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Auto-Assign Optimal Times ({selectedQuotes.length})
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Schedule Preview */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Schedule Preview</h3>
                {scheduleSlots.length > 0 && (
                  <Badge variant="success">{scheduleSlots.length} posts</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {scheduleSlots.length === 0 ? (
                <div className="text-center py-12">
                  <Layers className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground mb-2">No posts scheduled yet</p>
                  <p className="text-xs text-muted-foreground">
                    Select quotes and click "Auto-Assign" to create a schedule
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Pillar distribution */}
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(pillarCounts).map(([pillar, count]) => (
                      <Badge key={pillar} variant="secondary">
                        {pillar.replace('_', ' ')}: {count}
                      </Badge>
                    ))}
                  </div>

                  {/* Slots */}
                  <div className="max-h-[350px] overflow-y-auto space-y-3">
                    {scheduleSlots.map((slot, index) => (
                      <div
                        key={index}
                        className="p-3 rounded-lg border bg-muted/50"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-sm line-clamp-2 flex-1">{slot.quoteText}</p>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => removeSlot(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <Select
                            value={slot.postType}
                            onChange={(v) => updateSlot(index, { postType: v as PostType })}
                            options={POST_TYPES}
                          />
                          <Select
                            value={slot.contentPillar}
                            onChange={(v) => updateSlot(index, { contentPillar: v as ContentPillar })}
                            options={CONTENT_PILLARS}
                          />
                          <input
                            type="datetime-local"
                            value={slot.scheduledAt.slice(0, 16)}
                            onChange={(e) => updateSlot(index, { scheduledAt: new Date(e.target.value).toISOString() })}
                            className="rounded-md border bg-surface px-2 py-1 text-xs"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link href="/dashboard/instagram/calendar">
            <Button variant="ghost">Cancel</Button>
          </Link>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || scheduleSlots.length === 0}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Create {scheduleSlots.length} Posts
              </>
            )}
          </Button>
        </div>

        {createMutation.isError && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
            Failed to create posts. Please try again.
          </div>
        )}
      </div>
    </PageContainer>
  );
}
