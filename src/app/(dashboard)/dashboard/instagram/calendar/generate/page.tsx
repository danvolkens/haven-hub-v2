'use client';

import { useState, useEffect, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Calendar,
  Wand2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  Image,
  Film,
  Layers,
  BookOpen,
} from 'lucide-react';
import { api } from '@/lib/fetcher';

// Inlined types
type WeekType = 'foundation' | 'engagement' | 'community' | 'conversion';
type PostType = 'feed' | 'reel' | 'carousel' | 'story';

interface WeekTemplate {
  weekType: WeekType;
  theme: string;
  focus: string;
}

interface ScheduledSlot {
  day: number;
  dayName: string;
  date: string;
  postType: PostType;
  templateType: string;
  contentPillar: string;
  suggestedTime: string;
  isExisting?: boolean;
  existingPostId?: string;
}

interface StorySlot {
  day: number;
  dayName: string;
  date: string;
  count: number;
  suggestedTypes: string[];
}

interface WeeklyCalendar {
  weekType: WeekType;
  startDate: string;
  endDate: string;
  slots: ScheduledSlot[];
  stories: StorySlot[];
  summary: {
    feed: number;
    reels: number;
    carousels: number;
    stories: number;
    total: number;
  };
}

interface PreviewResult {
  calendar: WeeklyCalendar;
  conflicts: {
    slot: ScheduledSlot;
    existingCaption: string;
  }[];
}

const POST_TYPE_ICONS: Record<PostType, typeof Image> = {
  feed: Image,
  reel: Film,
  carousel: Layers,
  story: BookOpen,
};

const WEEK_TYPE_COLORS: Record<WeekType, string> = {
  foundation: 'bg-blue-100 text-blue-800 border-blue-200',
  engagement: 'bg-green-100 text-green-800 border-green-200',
  community: 'bg-purple-100 text-purple-800 border-purple-200',
  conversion: 'bg-orange-100 text-orange-800 border-orange-200',
};

// Wrapper component to handle Suspense for useSearchParams
export default function CalendarGeneratePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <CalendarGenerateContent />
    </Suspense>
  );
}

function CalendarGenerateContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const weekTypeFromUrl = searchParams.get('weekType') as WeekType | null;

  const [selectedWeekType, setSelectedWeekType] = useState<WeekType | null>(null);
  const [startDate, setStartDate] = useState(() => {
    // Default to next Monday
    const today = new Date();
    const daysUntilMonday = (8 - today.getDay()) % 7 || 7;
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    return nextMonday.toISOString().split('T')[0];
  });
  const [skipExisting, setSkipExisting] = useState(true);
  const [createAsDraft, setCreateAsDraft] = useState(false);

  // Auto-select week type from URL parameter
  useEffect(() => {
    if (weekTypeFromUrl && ['foundation', 'engagement', 'community', 'conversion'].includes(weekTypeFromUrl)) {
      setSelectedWeekType(weekTypeFromUrl);
    }
  }, [weekTypeFromUrl]);

  // Fetch templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery<WeekTemplate[]>({
    queryKey: ['calendar-templates'],
    queryFn: () => api.get<WeekTemplate[]>('/instagram/calendar/generate', { action: 'templates' }),
  });

  // Preview calendar
  const { data: preview, isLoading: previewLoading } = useQuery<PreviewResult>({
    queryKey: ['calendar-preview', selectedWeekType, startDate],
    queryFn: () =>
      api.get<PreviewResult>('/instagram/calendar/generate', {
        action: 'preview',
        weekType: selectedWeekType!,
        startDate,
      }),
    enabled: !!selectedWeekType && !!startDate,
  });

  // Apply template
  const applyMutation = useMutation({
    mutationFn: () =>
      api.post('/instagram/calendar/generate', {
        weekType: selectedWeekType,
        startDate,
        options: { skipExisting, createAsDraft },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-preview'] });
      queryClient.invalidateQueries({ queryKey: ['instagram-posts'] });
    },
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (templatesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Generate Weekly Calendar</h1>
        <p className="text-muted-foreground">
          Auto-generate a content calendar based on proven weekly structures
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Week Type Selection */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader title="1. Choose Week Type" />
            <CardContent className="space-y-3">
              {templates.map((template) => (
                <div
                  key={template.weekType}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedWeekType === template.weekType
                      ? 'ring-2 ring-primary ' + WEEK_TYPE_COLORS[template.weekType]
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedWeekType(template.weekType)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{template.theme}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {template.focus}
                      </p>
                    </div>
                    {selectedWeekType === template.weekType && (
                      <CheckCircle className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="2. Select Start Date" />
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Week Starting (Monday)</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Skip Existing Posts</Label>
                    <p className="text-xs text-muted-foreground">
                      Don&apos;t overwrite scheduled content
                    </p>
                  </div>
                  <Switch
                    checked={skipExisting}
                    onChange={(e) => setSkipExisting(e.target.checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Create as Drafts</Label>
                    <p className="text-xs text-muted-foreground">
                      Review before scheduling
                    </p>
                  </div>
                  <Switch
                    checked={createAsDraft}
                    onChange={(e) => setCreateAsDraft(e.target.checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <div className="lg:col-span-2">
          {!selectedWeekType ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Select a Week Type</h3>
                <p className="text-muted-foreground">
                  Choose a week template to see the preview
                </p>
              </CardContent>
            </Card>
          ) : previewLoading ? (
            <Card>
              <CardContent className="py-16 text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Generating preview...</p>
              </CardContent>
            </Card>
          ) : preview ? (
            <div className="space-y-4">
              {/* Summary */}
              <Card>
                <CardHeader title="Week Preview">
                  <span className="text-sm text-muted-foreground">
                    {formatDate(preview.calendar.startDate)} - {formatDate(preview.calendar.endDate)}
                  </span>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div className="p-3 border rounded-lg">
                      <Image className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                      <div className="text-2xl font-bold">{preview.calendar.summary.feed}</div>
                      <div className="text-xs text-muted-foreground">Feed Posts</div>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <Film className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                      <div className="text-2xl font-bold">{preview.calendar.summary.reels}</div>
                      <div className="text-xs text-muted-foreground">Reels</div>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <Layers className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                      <div className="text-2xl font-bold">{preview.calendar.summary.carousels}</div>
                      <div className="text-xs text-muted-foreground">Carousels</div>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <BookOpen className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                      <div className="text-2xl font-bold">{preview.calendar.summary.stories}</div>
                      <div className="text-xs text-muted-foreground">Stories</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Conflicts Warning */}
              {preview.conflicts.length > 0 && (
                <Card className="border-yellow-200 bg-yellow-50">
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-yellow-800">
                          {preview.conflicts.length} Existing Post{preview.conflicts.length > 1 ? 's' : ''}
                        </h4>
                        <p className="text-sm text-yellow-700">
                          {skipExisting
                            ? 'These slots will be skipped.'
                            : 'These posts will be overwritten.'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Daily Schedule */}
              <Card>
                <CardHeader title="Daily Schedule" />
                <CardContent>
                  <div className="space-y-4">
                    {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                      const daySlots = preview.calendar.slots.filter((s) => s.day === day);
                      const storySlot = preview.calendar.stories.find((s) => s.day === day);
                      const dayName = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][day];

                      return (
                        <div key={day} className="flex items-start gap-4 py-3 border-b last:border-0">
                          <div className="w-24 shrink-0">
                            <div className="font-medium">{dayName}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatDate(preview.calendar.slots[0]?.date || preview.calendar.startDate)}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex flex-wrap gap-2">
                              {daySlots.map((slot, idx) => {
                                const Icon = POST_TYPE_ICONS[slot.postType];
                                return (
                                  <div
                                    key={idx}
                                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                                      slot.isExisting
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-primary/10 text-primary'
                                    }`}
                                  >
                                    <Icon className="h-3.5 w-3.5" />
                                    <span className="capitalize">{slot.templateType.replace(/_/g, ' ')}</span>
                                    {slot.isExisting && <span className="text-xs">(exists)</span>}
                                  </div>
                                );
                              })}
                              {storySlot && (
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm bg-muted text-muted-foreground">
                                  <BookOpen className="h-3.5 w-3.5" />
                                  <span>{storySlot.count} stories</span>
                                </div>
                              )}
                              {daySlots.length === 0 && !storySlot && (
                                <span className="text-muted-foreground text-sm">No content scheduled</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Apply Button */}
              <div className="flex justify-end gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setSelectedWeekType(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => applyMutation.mutate()}
                  disabled={applyMutation.isPending}
                >
                  <Wand2 className="mr-2 h-4 w-4" />
                  {applyMutation.isPending ? 'Applying...' : 'Apply Template'}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>

              {/* Success Message */}
              {applyMutation.isSuccess && (
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <h4 className="font-medium text-green-800">Calendar Applied!</h4>
                        <p className="text-sm text-green-700">
                          {(applyMutation.data as { created: number })?.created || 0} posts created
                          {(applyMutation.data as { skipped: number })?.skipped
                            ? `, ${(applyMutation.data as { skipped: number }).skipped} skipped`
                            : ''}
                        </p>
                        {((applyMutation.data as { errors?: string[] })?.errors?.length ?? 0) > 0 && (
                          <p className="text-sm text-red-600 mt-1">
                            Errors: {(applyMutation.data as { errors?: string[] })?.errors?.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
