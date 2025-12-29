'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/page-container';
import { Card, Button, Badge } from '@/components/ui';
import {
  Video,
  Download,
  Check,
  Loader2,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Camera,
} from 'lucide-react';
import { format, startOfWeek, addDays } from 'date-fns';
import { useToast } from '@/components/providers/toast-provider';

// ============================================================================
// Types
// ============================================================================

interface FilmingItem {
  id?: string;
  quote_id?: string;
  quote_text?: string;
  collection?: string;
  suggested_hook?: string;
  hook_id?: string;
  audio_mood?: string;
  notes?: string;
  shot_list?: string[];
  script_outline?: string[];
  duration_target?: string;
  topic?: string;
  type?: string;
}

interface FilmingBatch {
  batch_name: string;
  batch_id?: string;
  count: number;
  setup: string;
  lighting_tips?: string;
  equipment_needed?: string[];
  items: FilmingItem[];
  filming_tips?: string[];
}

interface BatchFilmingList {
  week_of: string;
  total_videos_needed: number;
  batches: FilmingBatch[];
  filming_tips: string[];
  estimated_time: string;
}

// ============================================================================
// Main Component
// ============================================================================

export default function TikTokFilmingPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());

  // Get current week start
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  // Fetch filming list
  const { data: filmingList, isLoading } = useQuery({
    queryKey: ['tiktok-filming', format(weekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      const res = await fetch(
        `/api/tiktok/filming?action=generate&week_start=${format(weekStart, 'yyyy-MM-dd')}`
      );
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json() as Promise<BatchFilmingList>;
    },
  });

  // Create batch mutation
  const createBatchMutation = useMutation({
    mutationFn: async (batch: FilmingBatch) => {
      const res = await fetch('/api/tiktok/filming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          batch_name: batch.batch_name,
          week_of: filmingList?.week_of,
          items: batch.items,
        }),
      });
      if (!res.ok) throw new Error('Failed to create batch');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tiktok-filming'] });
      toast('Batch added to queue!', 'success');
    },
  });

  // Download markdown
  const handleDownload = async () => {
    const res = await fetch(
      `/api/tiktok/filming?action=export&week_start=${format(weekStart, 'yyyy-MM-dd')}`
    );
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `filming-list-${filmingList?.week_of || 'week'}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Downloaded filming checklist!', 'success');
  };

  const toggleBatch = (name: string) => {
    const newExpanded = new Set(expandedBatches);
    if (newExpanded.has(name)) {
      newExpanded.delete(name);
    } else {
      newExpanded.add(name);
    }
    setExpandedBatches(newExpanded);
  };

  if (isLoading) {
    return (
      <PageContainer title="Batch Filming Prep">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Batch Filming Prep">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Batch Filming Prep</h1>
            <p className="text-muted-foreground">
              Week of {filmingList?.week_of ? format(new Date(filmingList.week_of), 'MMMM d, yyyy') : 'loading...'}
            </p>
          </div>
          <Button onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download Checklist
          </Button>
        </div>

        {/* Summary Card */}
        {filmingList && (
          <Card className="p-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <div className="text-3xl font-bold text-primary">
                  {filmingList.total_videos_needed}
                </div>
                <div className="text-sm text-muted-foreground">Videos Needed</div>
              </div>
              <div>
                <div className="text-3xl font-bold">
                  {filmingList.batches.length}
                </div>
                <div className="text-sm text-muted-foreground">Filming Sessions</div>
              </div>
              <div>
                <div className="text-3xl font-bold">
                  {filmingList.estimated_time}
                </div>
                <div className="text-sm text-muted-foreground">Estimated Time</div>
              </div>
            </div>
          </Card>
        )}

        {/* Batches */}
        {filmingList?.batches.map((batch) => (
          <Card key={batch.batch_name} className="overflow-hidden">
            {/* Batch Header */}
            <button
              className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => toggleBatch(batch.batch_name)}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Video className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="font-semibold">{batch.batch_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {batch.count} videos • {batch.setup}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    createBatchMutation.mutate(batch);
                  }}
                  disabled={createBatchMutation.isPending}
                >
                  {createBatchMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="mr-1 h-3 w-3" />
                      Add to Queue
                    </>
                  )}
                </Button>
                {expandedBatches.has(batch.batch_name) ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </button>

            {/* Expanded Content */}
            {expandedBatches.has(batch.batch_name) && (
              <div className="border-t p-4 space-y-4">
                {/* Setup Tips */}
                <div className="flex flex-wrap gap-4 text-sm">
                  {batch.lighting_tips && (
                    <div className="flex items-start gap-2">
                      <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5" />
                      <div>
                        <div className="font-medium">Lighting</div>
                        <div className="text-muted-foreground">{batch.lighting_tips}</div>
                      </div>
                    </div>
                  )}
                  {batch.equipment_needed && (
                    <div className="flex items-start gap-2">
                      <Camera className="h-4 w-4 text-blue-500 mt-0.5" />
                      <div>
                        <div className="font-medium">Equipment</div>
                        <div className="text-muted-foreground">
                          {batch.equipment_needed.join(', ')}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Items */}
                <div className="space-y-3">
                  {batch.items.map((item, index) => (
                    <div
                      key={index}
                      className="p-3 border rounded-lg bg-muted/20"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {index + 1}. {item.topic || item.quote_text?.slice(0, 50) || 'Video'}
                            {item.quote_text && item.quote_text.length > 50 && '...'}
                          </div>
                          {item.suggested_hook && (
                            <div className="text-sm text-muted-foreground mt-1">
                              <span className="font-medium">Hook:</span> &ldquo;{item.suggested_hook}&rdquo;
                            </div>
                          )}
                          {item.collection && (
                            <Badge variant="secondary" size="sm" className="mt-2">
                              {item.collection}
                            </Badge>
                          )}
                          {item.shot_list && (
                            <div className="text-xs text-muted-foreground mt-2">
                              <span className="font-medium">Shots:</span>{' '}
                              {item.shot_list.join(' → ')}
                            </div>
                          )}
                          {item.script_outline && (
                            <div className="text-xs text-muted-foreground mt-1">
                              <span className="font-medium">Outline:</span>{' '}
                              {item.script_outline.join(' | ')}
                            </div>
                          )}
                          {item.notes && (
                            <div className="text-xs text-muted-foreground mt-1 italic">
                              {item.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Filming Tips */}
                {batch.filming_tips && batch.filming_tips.length > 0 && (
                  <div className="pt-3 border-t">
                    <div className="font-medium text-sm mb-2">Tips</div>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {batch.filming_tips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </Card>
        ))}

        {/* General Tips */}
        {filmingList?.filming_tips && filmingList.filming_tips.length > 0 && (
          <Card className="p-4">
            <div className="font-medium mb-2">General Filming Tips</div>
            <ul className="text-sm text-muted-foreground space-y-1">
              {filmingList.filming_tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
