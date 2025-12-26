'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/page-container';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Tag, RefreshCw } from 'lucide-react';

interface KlaviyoTag {
  id: string;
  name: string;
}

export default function KlaviyoTagsPage() {
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  // Fetch tags
  const {
    data: tagsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['klaviyo-tags'],
    queryFn: async () => {
      const res = await fetch('/api/klaviyo/tags');
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch tags');
      }
      return res.json();
    },
  });

  // Create tag mutation
  const createTag = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/klaviyo/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create tag');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['klaviyo-tags'] });
      setNewTagName('');
      setShowCreateForm(false);
    },
  });

  const tags: KlaviyoTag[] = tagsData?.tags || [];

  const isHavenHubTag = (name: string) => {
    return name.toLowerCase().includes('haven') || name.toLowerCase().includes('quiz');
  };

  // Group tags by category
  const groupedTags = {
    collection: tags.filter(
      (t) =>
        t.name.toLowerCase().includes('grounding') ||
        t.name.toLowerCase().includes('wholeness') ||
        t.name.toLowerCase().includes('growth')
    ),
    lifecycle: tags.filter(
      (t) =>
        t.name.toLowerCase().includes('customer') ||
        t.name.toLowerCase().includes('vip') ||
        t.name.toLowerCase().includes('lead') ||
        t.name.toLowerCase().includes('subscriber')
    ),
    behavior: tags.filter(
      (t) =>
        t.name.toLowerCase().includes('quiz') ||
        t.name.toLowerCase().includes('abandoned') ||
        t.name.toLowerCase().includes('engaged')
    ),
    other: tags.filter(
      (t) =>
        !t.name.toLowerCase().includes('grounding') &&
        !t.name.toLowerCase().includes('wholeness') &&
        !t.name.toLowerCase().includes('growth') &&
        !t.name.toLowerCase().includes('customer') &&
        !t.name.toLowerCase().includes('vip') &&
        !t.name.toLowerCase().includes('lead') &&
        !t.name.toLowerCase().includes('subscriber') &&
        !t.name.toLowerCase().includes('quiz') &&
        !t.name.toLowerCase().includes('abandoned') &&
        !t.name.toLowerCase().includes('engaged')
    ),
  };

  return (
    <PageContainer
      title="Klaviyo Tags"
      description="Manage tags to categorize and segment your profiles"
    >
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <span className="text-sm text-muted-foreground">{tags.length} tags</span>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Tag
        </Button>
      </div>

      {/* Create Tag Form */}
      {showCreateForm && (
        <Card className="p-4 mb-6">
          <h3 className="font-medium mb-4">Create New Tag</h3>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>Tag Name</Label>
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="e.g., quiz_completed"
                className="mt-1"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewTagName('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => createTag.mutate(newTagName)}
                disabled={!newTagName || createTag.isPending}
              >
                {createTag.isPending ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Tags Display */}
      {isLoading ? (
        <div className="text-muted-foreground">Loading tags...</div>
      ) : tags.length === 0 ? (
        <Card className="p-8 text-center">
          <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">No Tags Found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create tags to categorize and segment your profiles.
          </p>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Tag
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Collection Tags */}
          {groupedTags.collection.length > 0 && (
            <Card className="p-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Badge className="bg-purple-100 text-purple-800">Collection</Badge>
                Tags based on quiz results or preferences
              </h3>
              <div className="flex flex-wrap gap-2">
                {groupedTags.collection.map((tag) => (
                  <Badge key={tag.id} variant="secondary" className="text-sm py-1 px-3">
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Lifecycle Tags */}
          {groupedTags.lifecycle.length > 0 && (
            <Card className="p-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Badge className="bg-blue-100 text-blue-800">Lifecycle</Badge>
                Customer journey stages
              </h3>
              <div className="flex flex-wrap gap-2">
                {groupedTags.lifecycle.map((tag) => (
                  <Badge key={tag.id} variant="secondary" className="text-sm py-1 px-3">
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Behavior Tags */}
          {groupedTags.behavior.length > 0 && (
            <Card className="p-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Badge className="bg-green-100 text-green-800">Behavior</Badge>
                Actions taken by profiles
              </h3>
              <div className="flex flex-wrap gap-2">
                {groupedTags.behavior.map((tag) => (
                  <Badge key={tag.id} variant="secondary" className="text-sm py-1 px-3">
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Other Tags */}
          {groupedTags.other.length > 0 && (
            <Card className="p-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Badge className="bg-gray-100 text-gray-800">Other</Badge>
                Miscellaneous tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {groupedTags.other.map((tag) => (
                  <Badge key={tag.id} variant="secondary" className="text-sm py-1 px-3">
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Quick Create Buttons for Common Tags */}
      {!isLoading && (
        <Card className="p-4 mt-6">
          <h3 className="font-medium mb-3">Quick Create Common Tags</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create tags commonly used for Haven Hub automation:
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              'quiz_completed',
              'grounding_preference',
              'wholeness_preference',
              'growth_preference',
              'vip_customer',
              'repeat_customer',
              'engaged_subscriber',
              'cart_abandoner',
              'high_value_lead',
            ].map((tagName) => {
              const exists = tags.some(
                (t) => t.name.toLowerCase() === tagName.toLowerCase()
              );
              return (
                <Button
                  key={tagName}
                  variant={exists ? 'ghost' : 'secondary'}
                  size="sm"
                  disabled={exists || createTag.isPending}
                  onClick={() => createTag.mutate(tagName)}
                >
                  {exists ? '✓ ' : '+ '}
                  {tagName}
                </Button>
              );
            })}
          </div>
        </Card>
      )}
    </PageContainer>
  );
}
