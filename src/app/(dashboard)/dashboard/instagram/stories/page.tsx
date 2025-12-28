'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Film,
  Clock,
  Plus,
  Check,
  Circle,
  Copy,
  Lightbulb,
  Sparkles,
  MessageSquare,
  BarChart3,
  ShoppingBag,
  Camera,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

type StoryType = 'quote' | 'poll' | 'quiz_cta' | 'bts' | 'product' | 'custom';
type StoryStatus = 'scheduled' | 'posted' | 'draft' | 'empty';
type StorySource = 'auto' | 'manual';

interface Story {
  id: string;
  type: StoryType;
  status: StoryStatus;
  source: StorySource;
  scheduled_at: string;
  posted_at?: string;
  thumbnail_url?: string;
  caption?: string;
  quote_text?: string;
  product_name?: string;
}

interface TimelineSlot {
  hour: number;
  label: string;
  story?: Story;
}

// ============================================================================
// Constants
// ============================================================================

const STORY_TYPES: { value: StoryType; label: string; icon: React.ElementType }[] = [
  { value: 'quote', label: 'Quote', icon: MessageSquare },
  { value: 'poll', label: 'Poll', icon: BarChart3 },
  { value: 'quiz_cta', label: 'Quiz CTA', icon: Sparkles },
  { value: 'product', label: 'Product', icon: ShoppingBag },
  { value: 'bts', label: 'Behind the Scenes', icon: Camera },
  { value: 'custom', label: 'Custom', icon: Film },
];

const STORY_TYPE_COLORS: Record<StoryType, string> = {
  quote: 'bg-purple-100 text-purple-700',
  poll: 'bg-blue-100 text-blue-700',
  quiz_cta: 'bg-pink-100 text-pink-700',
  product: 'bg-green-100 text-green-700',
  bts: 'bg-orange-100 text-orange-700',
  custom: 'bg-gray-100 text-gray-700',
};

const DEFAULT_SLOTS: TimelineSlot[] = [
  { hour: 9, label: '9 AM' },
  { hour: 11, label: '11 AM' },
  { hour: 14, label: '2 PM' },
  { hour: 16, label: '4 PM' },
  { hour: 18, label: '6 PM' },
  { hour: 20, label: '8 PM' },
  { hour: 21, label: '9 PM' },
];

// ============================================================================
// Mock Data
// ============================================================================

const mockStories: Story[] = [
  {
    id: '1',
    type: 'quote',
    status: 'posted',
    source: 'auto',
    scheduled_at: new Date(new Date().setHours(9, 0, 0, 0)).toISOString(),
    posted_at: new Date(new Date().setHours(9, 2, 0, 0)).toISOString(),
    quote_text: 'The only way to do great work is to love what you do.',
    thumbnail_url: '/mock-story-1.jpg',
  },
  {
    id: '2',
    type: 'product',
    status: 'scheduled',
    source: 'auto',
    scheduled_at: new Date(new Date().setHours(14, 0, 0, 0)).toISOString(),
    product_name: 'Quote Canvas - 16x20',
    thumbnail_url: '/mock-story-2.jpg',
  },
  {
    id: '3',
    type: 'poll',
    status: 'draft',
    source: 'manual',
    scheduled_at: new Date(new Date().setHours(16, 0, 0, 0)).toISOString(),
    caption: 'Which quote resonates with you today?',
    thumbnail_url: '/mock-story-3.jpg',
  },
];

// ============================================================================
// Components
// ============================================================================

interface TimelineSlotItemProps {
  slot: TimelineSlot;
  onAddClick: (hour: number) => void;
  onStoryClick: (story: Story) => void;
}

function TimelineSlotItem({ slot, onAddClick, onStoryClick }: TimelineSlotItemProps) {
  const now = new Date();
  const slotDate = new Date();
  slotDate.setHours(slot.hour, 0, 0, 0);
  const isPast = slotDate < now;

  if (!slot.story) {
    return (
      <div className="flex-shrink-0 w-28">
        <button
          onClick={() => onAddClick(slot.hour)}
          className={`w-full aspect-[9/16] rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-colors ${
            isPast
              ? 'border-gray-200 bg-gray-50 text-gray-400'
              : 'border-sage/50 bg-sage/5 text-sage hover:border-sage hover:bg-sage/10'
          }`}
        >
          <Plus className="h-6 w-6 mb-1" />
          <span className="text-xs">{slot.label}</span>
        </button>
      </div>
    );
  }

  const story = slot.story;
  const Icon = STORY_TYPES.find((t) => t.value === story.type)?.icon || Film;

  return (
    <button
      onClick={() => onStoryClick(story)}
      className="flex-shrink-0 w-28 group"
    >
      <div className="relative aspect-[9/16] rounded-xl overflow-hidden border-2 border-sage/20 bg-muted group-hover:border-sage transition-colors">
        {story.thumbnail_url ? (
          <img src={story.thumbnail_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${STORY_TYPE_COLORS[story.type]}`}>
            <Icon className="h-8 w-8" />
          </div>
        )}

        {/* Status Indicator */}
        <div className="absolute top-2 right-2">
          {story.status === 'posted' ? (
            <div className="h-5 w-5 rounded-full bg-success flex items-center justify-center">
              <Check className="h-3 w-3 text-white" />
            </div>
          ) : story.status === 'scheduled' ? (
            <div className="h-5 w-5 rounded-full bg-white border-2 border-sage flex items-center justify-center">
              <Circle className="h-2 w-2 fill-sage text-sage" />
            </div>
          ) : (
            <div className="h-5 w-5 rounded-full bg-warning flex items-center justify-center">
              <Clock className="h-3 w-3 text-white" />
            </div>
          )}
        </div>

        {/* Source Badge */}
        {story.source === 'auto' && (
          <div className="absolute bottom-2 left-2">
            <Badge size="sm" variant="secondary" className="text-xs">
              AUTO
            </Badge>
          </div>
        )}
      </div>
      <p className="text-xs text-center mt-1 text-muted-foreground">{slot.label}</p>
    </button>
  );
}

interface ManualStoryCardProps {
  story: Story;
  onCopy: (story: Story) => void;
  onMarkPosted: (story: Story) => void;
}

function ManualStoryCard({ story, onCopy, onMarkPosted }: ManualStoryCardProps) {
  const Icon = STORY_TYPES.find((t) => t.value === story.type)?.icon || Film;
  const typeLabel = STORY_TYPES.find((t) => t.value === story.type)?.label || 'Story';

  const suggestedTime = new Date(story.scheduled_at).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
      {/* Thumbnail */}
      <div className="w-16 aspect-[9/16] rounded-lg overflow-hidden bg-muted flex-shrink-0">
        {story.thumbnail_url ? (
          <img src={story.thumbnail_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${STORY_TYPE_COLORS[story.type]}`}>
            <Icon className="h-6 w-6" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge size="sm" variant="secondary">
            {typeLabel}
          </Badge>
          <span className="text-xs text-muted-foreground">Suggested: {suggestedTime}</span>
        </div>
        <p className="text-sm line-clamp-2 mb-2">
          {story.caption || story.quote_text || story.product_name || 'No caption'}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => onCopy(story)}>
            <Copy className="mr-1 h-3 w-3" />
            Copy to App
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onMarkPosted(story)}>
            <Check className="mr-1 h-3 w-3" />
            Mark Posted
          </Button>
        </div>
      </div>
    </div>
  );
}

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultHour?: number;
}

function CreateStoryModal({ isOpen, onClose, defaultHour }: CreateStoryModalProps) {
  const queryClient = useQueryClient();
  const [storyType, setStoryType] = useState<StoryType>('quote');
  const [caption, setCaption] = useState('');
  const [scheduledTime, setScheduledTime] = useState(
    defaultHour
      ? `${defaultHour.toString().padStart(2, '0')}:00`
      : '12:00'
  );

  const createMutation = useMutation({
    mutationFn: async () => {
      const date = new Date();
      const [hours, minutes] = scheduledTime.split(':').map(Number);
      date.setHours(hours, minutes, 0, 0);

      const res = await fetch('/api/instagram/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: storyType,
          caption,
          scheduled_at: date.toISOString(),
          source: 'manual',
        }),
      });
      if (!res.ok) throw new Error('Failed to create story');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-stories'] });
      onClose();
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-md rounded-xl bg-surface shadow-elevation-3">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Add Story</h2>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Story Type</label>
            <div className="grid grid-cols-3 gap-2">
              {STORY_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setStoryType(type.value)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-colors ${
                      storyType === type.value
                        ? 'border-sage bg-sage/10'
                        : 'border-transparent bg-muted hover:border-sage/50'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Caption</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption or note..."
              className="w-full rounded-md border bg-surface px-3 py-2 text-sm resize-none"
              rows={3}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Scheduled Time</label>
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="w-full rounded-md border bg-surface px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Add to Queue
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function InstagramStoriesPage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createModalHour, setCreateModalHour] = useState<number | undefined>();

  // Fetch stories
  const { data: stories = mockStories, isLoading } = useQuery({
    queryKey: ['instagram-stories', 'today'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`/api/instagram/stories?date=${today}`);
      if (!res.ok) throw new Error('Failed to fetch stories');
      return res.json();
    },
  });

  // Build timeline with stories
  const timeline: TimelineSlot[] = DEFAULT_SLOTS.map((slot) => {
    const story = stories.find((s: Story) => {
      const storyHour = new Date(s.scheduled_at).getHours();
      return storyHour === slot.hour;
    });
    return { ...slot, story };
  });

  // Count stats
  const postedCount = stories.filter((s: Story) => s.status === 'posted').length;
  const scheduledCount = stories.filter((s: Story) => s.status === 'scheduled').length;
  const totalTarget = 7;

  // Manual queue (stories not yet posted)
  const manualQueue = stories.filter(
    (s: Story) => s.source === 'manual' && s.status !== 'posted'
  );

  // Auto stories (for preview)
  const autoStories = stories.filter((s: Story) => s.source === 'auto');

  // Mark story as posted
  const markPostedMutation = useMutation({
    mutationFn: async (storyId: string) => {
      const res = await fetch(`/api/instagram/stories/${storyId}/posted`, {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error('Failed to mark as posted');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-stories'] });
    },
  });

  const handleAddClick = (hour: number) => {
    setCreateModalHour(hour);
    setShowCreateModal(true);
  };

  const handleCopyToApp = (story: Story) => {
    // Copy caption to clipboard
    const text = story.caption || story.quote_text || '';
    navigator.clipboard.writeText(text);
    // Could show a toast here
  };

  const handleMarkPosted = (story: Story) => {
    markPostedMutation.mutate(story.id);
  };

  return (
    <PageContainer title="Stories">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500">
              <Film className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Stories</h2>
              <p className="text-sm text-muted-foreground">
                {postedCount + scheduledCount}/{totalTarget} stories today
              </p>
            </div>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Story
          </Button>
        </div>

        {/* Tip */}
        <div className="flex items-start gap-3 bg-sage/10 rounded-lg p-4">
          <Lightbulb className="h-5 w-5 text-sage shrink-0 mt-0.5" />
          <p className="text-sm">
            <span className="font-medium">Tip:</span> 3-7 stories per day keeps you visible in the
            Stories tray. Mix auto-scheduled quote stories with manual engagement content like polls
            and behind-the-scenes.
          </p>
        </div>

        {/* Today's Timeline */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Today&apos;s Timeline</h3>
              <div className="flex items-center gap-3">
                <Badge size="sm" variant="success">
                  <Check className="h-3 w-3 mr-1" />
                  {postedCount} posted
                </Badge>
                <Badge size="sm" variant="secondary">
                  <Clock className="h-3 w-3 mr-1" />
                  {scheduledCount} scheduled
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
                {timeline.map((slot, idx) => (
                  <TimelineSlotItem
                    key={idx}
                    slot={slot}
                    onAddClick={handleAddClick}
                    onStoryClick={(story) => {/* Open edit modal */}}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Auto-Scheduled Stories */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-sage" />
                <h3 className="font-semibold">Auto-Scheduled</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {autoStories.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No auto-scheduled stories for today
                </p>
              ) : (
                autoStories.map((story: Story) => {
                  const Icon = STORY_TYPES.find((t) => t.value === story.type)?.icon || Film;
                  const time = new Date(story.scheduled_at).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  });
                  return (
                    <div key={story.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="w-12 aspect-[9/16] rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        {story.thumbnail_url ? (
                          <img src={story.thumbnail_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center ${STORY_TYPE_COLORS[story.type]}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{time}</span>
                          <Badge size="sm" variant={story.status === 'posted' ? 'success' : 'secondary'}>
                            {story.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {story.quote_text || story.product_name || 'Morning Quote'}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Manual Queue */}
          <Card>
            <CardHeader className="pb-2">
              <h3 className="font-semibold">Manual Queue</h3>
            </CardHeader>
            <CardContent className="space-y-3">
              {manualQueue.length === 0 ? (
                <div className="text-center py-6">
                  <Film className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-3">No stories in queue</p>
                  <Button variant="secondary" size="sm" onClick={() => setShowCreateModal(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Story
                  </Button>
                </div>
              ) : (
                manualQueue.map((story: Story) => (
                  <ManualStoryCard
                    key={story.id}
                    story={story}
                    onCopy={handleCopyToApp}
                    onMarkPosted={handleMarkPosted}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Story Modal */}
      <CreateStoryModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setCreateModalHour(undefined);
        }}
        defaultHour={createModalHour}
      />
    </PageContainer>
  );
}
