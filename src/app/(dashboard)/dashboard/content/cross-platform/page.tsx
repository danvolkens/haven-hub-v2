'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/page-container';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CrossPlatformContent, Platform } from '@/types/cross-platform';
import { Plus, Trophy, ArrowRight, ExternalLink } from 'lucide-react';

const PLATFORM_OPTIONS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'other', label: 'Other' },
];

const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  twitter: 'Twitter/X',
  other: 'Other',
};

export default function CrossPlatformPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'all' | 'winners' | 'unadapted'>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newContent, setNewContent] = useState({
    platform: 'instagram' as Platform,
    original_url: '',
    content_type: 'post',
    title: '',
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['cross-platform', activeTab],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeTab === 'winners') params.set('winners', 'true');
      if (activeTab === 'unadapted') params.set('unadapted', 'true');

      const response = await fetch(`/api/cross-platform?${params}`);
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    },
  });

  const addMutation = useMutation({
    mutationFn: async (content: typeof newContent) => {
      const response = await fetch('/api/cross-platform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(content),
      });
      if (!response.ok) throw new Error('Failed to add');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cross-platform'] });
      setIsAddOpen(false);
      setNewContent({
        platform: 'instagram',
        original_url: '',
        content_type: 'post',
        title: '',
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
      });
    },
  });

  const content = data?.content || [];

  const winnerCount = content.filter((c: CrossPlatformContent) => c.is_winner).length;
  const unadaptedCount = content.filter(
    (c: CrossPlatformContent) => c.is_winner && !c.adapted_to_pinterest
  ).length;

  return (
    <PageContainer
      title="Cross-Platform Winners"
      description="Track winning content from other platforms and adapt for Pinterest"
      actions={
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Content
        </Button>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-sm text-[var(--color-text-secondary)]">Total Content</div>
          <div className="text-2xl font-bold">{content.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-[var(--color-text-secondary)]">Winners</div>
          <div className="text-2xl font-bold text-amber-600">{winnerCount}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-[var(--color-text-secondary)]">Ready to Adapt</div>
          <div className="text-2xl font-bold text-green-600">{unadaptedCount}</div>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'winners' | 'unadapted')}>
        <TabsList>
          <TabsTrigger value="all">All Content</TabsTrigger>
          <TabsTrigger value="winners">
            Winners
            {winnerCount > 0 && (
              <Badge variant="secondary" className="ml-2">{winnerCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="unadapted">
            Ready to Adapt
            {unadaptedCount > 0 && (
              <Badge variant="success" className="ml-2">{unadaptedCount}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="text-center py-12">Loading...</div>
          ) : content.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-[var(--color-text-secondary)] mb-4">
                {activeTab === 'all'
                  ? 'No cross-platform content tracked yet'
                  : activeTab === 'winners'
                  ? 'No winners detected yet'
                  : 'No unadapted winners'
                }
              </p>
              {activeTab === 'all' && (
                <Button onClick={() => setIsAddOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Content
                </Button>
              )}
            </Card>
          ) : (
            <div className="space-y-3">
              {content.map((item: CrossPlatformContent) => (
                <Card key={item.id} className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <ExternalLink className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {item.title || 'Untitled'}
                        </span>
                        <Badge variant="secondary" size="sm">
                          {PLATFORM_LABELS[item.platform]}
                        </Badge>
                        {item.is_winner && (
                          <Trophy className="h-4 w-4 text-amber-500" />
                        )}
                        {item.adapted_to_pinterest && (
                          <Badge variant="success">Adapted</Badge>
                        )}
                      </div>
                      <div className="text-sm text-[var(--color-text-secondary)]">
                        {item.views.toLocaleString()} views &bull;{' '}
                        {((item.engagement_rate || 0) * 100).toFixed(2)}% engagement
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-lg">
                        {item.performance_score || 0}
                      </div>
                      <div className="text-xs text-[var(--color-text-secondary)]">score</div>
                    </div>

                    {item.is_winner && !item.adapted_to_pinterest && (
                      <Button size="sm">
                        <ArrowRight className="h-4 w-4 mr-1" />
                        Adapt
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Content Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Cross-Platform Content"
      >
        <div className="space-y-4">
          <div>
            <Label>Platform</Label>
            <Select
              value={newContent.platform}
              onChange={(v) => setNewContent({ ...newContent, platform: v as Platform })}
              options={PLATFORM_OPTIONS}
            />
          </div>

          <div>
            <Label>Original URL</Label>
            <Input
              value={newContent.original_url}
              onChange={(e) => setNewContent({ ...newContent, original_url: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div>
            <Label>Title (optional)</Label>
            <Input
              value={newContent.title}
              onChange={(e) => setNewContent({ ...newContent, title: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Views</Label>
              <Input
                type="number"
                value={newContent.views}
                onChange={(e) => setNewContent({ ...newContent, views: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Likes</Label>
              <Input
                type="number"
                value={newContent.likes}
                onChange={(e) => setNewContent({ ...newContent, likes: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Comments</Label>
              <Input
                type="number"
                value={newContent.comments}
                onChange={(e) => setNewContent({ ...newContent, comments: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Shares</Label>
              <Input
                type="number"
                value={newContent.shares}
                onChange={(e) => setNewContent({ ...newContent, shares: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => addMutation.mutate(newContent)}
              disabled={!newContent.original_url || addMutation.isPending}
            >
              Add Content
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}
