'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/page-container';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, Calendar, RefreshCw } from 'lucide-react';

interface KlaviyoList {
  id: string;
  name: string;
  opt_in_process: string;
  created: string;
  updated: string;
  subscriberCount: number;
}

export default function KlaviyoListsPage() {
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newListName, setNewListName] = useState('');

  // Fetch lists
  const {
    data: listsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['klaviyo-lists'],
    queryFn: async () => {
      const res = await fetch('/api/klaviyo/lists');
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch lists');
      }
      return res.json();
    },
  });

  // Create list mutation
  const createList = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/klaviyo/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create list');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['klaviyo-lists'] });
      setNewListName('');
      setShowCreateForm(false);
    },
  });

  const lists: KlaviyoList[] = listsData?.lists || [];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isHavenHubList = (name: string) => {
    return name.toLowerCase().includes('haven hub');
  };

  return (
    <PageContainer
      title="Klaviyo Lists"
      description="Manage your email subscriber lists"
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
          <span className="text-sm text-muted-foreground">
            {lists.length} lists
          </span>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create List
        </Button>
      </div>

      {/* Create List Form */}
      {showCreateForm && (
        <Card className="p-4 mb-6">
          <h3 className="font-medium mb-4">Create New List</h3>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>List Name</Label>
              <Input
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="e.g., Haven Hub - VIP Customers"
                className="mt-1"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewListName('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => createList.mutate(newListName)}
                disabled={!newListName || createList.isPending}
              >
                {createList.isPending ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Lists Grid */}
      {isLoading ? (
        <div className="text-muted-foreground">Loading lists...</div>
      ) : lists.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">No Lists Found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first list to start collecting subscribers.
          </p>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create List
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lists.map((list) => (
            <Card key={list.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{list.name}</h3>
                  {isHavenHubList(list.name) && (
                    <Badge variant="secondary" className="mt-1 text-xs">
                      Haven Hub
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>
                    {list.subscriberCount.toLocaleString()} subscriber
                    {list.subscriberCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Created {formatDate(list.created)}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t">
                <div className="text-xs text-muted-foreground">
                  Opt-in: {list.opt_in_process || 'Single'}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Create Buttons for Required Lists */}
      {!isLoading && (
        <Card className="p-4 mt-6">
          <h3 className="font-medium mb-3">Quick Create Required Lists</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create the standard Haven Hub lists for your email automation:
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              'Haven Hub - All Leads',
              'Haven Hub - Quiz Takers',
              'Haven Hub - Grounding',
              'Haven Hub - Wholeness',
              'Haven Hub - Growth',
              'Haven Hub - Customers',
              'Haven Hub - VIP',
            ].map((listName) => {
              const exists = lists.some(
                (l) => l.name.toLowerCase() === listName.toLowerCase()
              );
              return (
                <Button
                  key={listName}
                  variant={exists ? 'ghost' : 'secondary'}
                  size="sm"
                  disabled={exists || createList.isPending}
                  onClick={() => createList.mutate(listName)}
                >
                  {exists ? '✓ ' : '+ '}
                  {listName.replace('Haven Hub - ', '')}
                </Button>
              );
            })}
          </div>
        </Card>
      )}
    </PageContainer>
  );
}
