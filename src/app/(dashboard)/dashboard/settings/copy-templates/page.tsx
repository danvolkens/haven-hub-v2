'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/page-container';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Sparkles,
  Tag,
  Home,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Hook {
  id: string;
  collection: string;
  hook_type: 'opening' | 'closing' | 'cta';
  hook_text: string;
  times_used: number;
  avg_engagement_rate: number | null;
}

interface MoodDescriptor {
  id: string;
  mood: string;
  descriptors: string[];
}

interface RoomContext {
  id: string;
  room_type: string;
  context_phrases: string[];
}

const COLLECTIONS = ['grounding', 'wholeness', 'growth', 'default'];
const HOOK_TYPES = ['opening', 'closing', 'cta'] as const;
type HookType = (typeof HOOK_TYPES)[number];

export default function CopyTemplatesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'hooks' | 'moods' | 'rooms'>('hooks');
  const [editingHook, setEditingHook] = useState<Hook | null>(null);
  const [newHook, setNewHook] = useState<{
    collection: string;
    hookType: HookType;
    hookText: string;
  }>({
    collection: 'default',
    hookType: 'opening',
    hookText: '',
  });
  const [showNewHookForm, setShowNewHookForm] = useState(false);

  // Fetch hooks
  const { data: hooksData, isLoading: hooksLoading } = useQuery({
    queryKey: ['copy-hooks'],
    queryFn: async () => {
      const res = await fetch('/api/copy-templates/hooks');
      if (!res.ok) throw new Error('Failed to fetch hooks');
      return res.json();
    },
  });

  // Fetch moods
  const { data: moodsData, isLoading: moodsLoading } = useQuery({
    queryKey: ['copy-moods'],
    queryFn: async () => {
      const res = await fetch('/api/copy-templates/moods');
      if (!res.ok) throw new Error('Failed to fetch moods');
      return res.json();
    },
  });

  // Fetch rooms
  const { data: roomsData, isLoading: roomsLoading } = useQuery({
    queryKey: ['copy-rooms'],
    queryFn: async () => {
      const res = await fetch('/api/copy-templates/rooms');
      if (!res.ok) throw new Error('Failed to fetch rooms');
      return res.json();
    },
  });

  // Create hook mutation
  const createHook = useMutation({
    mutationFn: async (hook: typeof newHook) => {
      const res = await fetch('/api/copy-templates/hooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hook),
      });
      if (!res.ok) throw new Error('Failed to create hook');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['copy-hooks'] });
      setNewHook({ collection: 'default', hookType: 'opening', hookText: '' });
      setShowNewHookForm(false);
    },
  });

  // Update hook mutation
  const updateHook = useMutation({
    mutationFn: async (hook: Hook) => {
      const res = await fetch('/api/copy-templates/hooks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: hook.id,
          collection: hook.collection,
          hookType: hook.hook_type,
          hookText: hook.hook_text,
        }),
      });
      if (!res.ok) throw new Error('Failed to update hook');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['copy-hooks'] });
      setEditingHook(null);
    },
  });

  // Delete hook mutation
  const deleteHook = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/copy-templates/hooks?id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete hook');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['copy-hooks'] });
    },
  });

  const hooks: Hook[] = hooksData?.hooks || [];
  const moods: MoodDescriptor[] = moodsData?.moods || [];
  const rooms: RoomContext[] = roomsData?.rooms || [];

  const hookTypeColors = {
    opening: 'bg-blue-100 text-blue-800',
    closing: 'bg-green-100 text-green-800',
    cta: 'bg-purple-100 text-purple-800',
  };

  const collectionColors = {
    grounding: 'bg-amber-100 text-amber-800',
    wholeness: 'bg-rose-100 text-rose-800',
    growth: 'bg-emerald-100 text-emerald-800',
    default: 'bg-gray-100 text-gray-800',
  };

  return (
    <PageContainer
      title="Copy Templates"
      description="Manage hooks, moods, and room contexts for generating pin copy"
    >
      {/* Tabs */}
      <div className="flex space-x-1 rounded-lg bg-muted p-1 mb-6">
        <button
          onClick={() => setActiveTab('hooks')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
            activeTab === 'hooks'
              ? 'bg-background shadow text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <MessageSquare className="h-4 w-4" />
          Collection Hooks
        </button>
        <button
          onClick={() => setActiveTab('moods')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
            activeTab === 'moods'
              ? 'bg-background shadow text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Sparkles className="h-4 w-4" />
          Mood Descriptors
        </button>
        <button
          onClick={() => setActiveTab('rooms')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
            activeTab === 'rooms'
              ? 'bg-background shadow text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Home className="h-4 w-4" />
          Room Contexts
        </button>
      </div>

      {/* Collection Hooks Tab */}
      {activeTab === 'hooks' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Collection Hooks</h2>
            <Button
              onClick={() => setShowNewHookForm(true)}
              disabled={showNewHookForm}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Hook
            </Button>
          </div>

          {/* New Hook Form */}
          {showNewHookForm && (
            <Card className="p-4">
              <h3 className="font-medium mb-4">New Hook</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <Label>Collection</Label>
                  <select
                    value={newHook.collection}
                    onChange={(e) =>
                      setNewHook({ ...newHook, collection: e.target.value })
                    }
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2"
                  >
                    {COLLECTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Hook Type</Label>
                  <select
                    value={newHook.hookType}
                    onChange={(e) =>
                      setNewHook({
                        ...newHook,
                        hookType: e.target.value as HookType,
                      })
                    }
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2"
                  >
                    {HOOK_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Hook Text</Label>
                  <Input
                    value={newHook.hookText}
                    onChange={(e) =>
                      setNewHook({ ...newHook, hookText: e.target.value })
                    }
                    placeholder="e.g., Find your center with"
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setShowNewHookForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => createHook.mutate(newHook)}
                  disabled={!newHook.hookText || createHook.isPending}
                >
                  {createHook.isPending ? 'Creating...' : 'Create Hook'}
                </Button>
              </div>
            </Card>
          )}

          {/* Hooks by Collection */}
          {hooksLoading ? (
            <div className="text-muted-foreground">Loading hooks...</div>
          ) : (
            COLLECTIONS.map((collection) => {
              const collectionHooks = hooks.filter(
                (h) => h.collection === collection
              );
              if (collectionHooks.length === 0) return null;

              return (
                <Card key={collection} className="p-4">
                  <h3 className="font-medium mb-4 flex items-center gap-2">
                    <Badge
                      className={
                        collectionColors[
                          collection as keyof typeof collectionColors
                        ]
                      }
                    >
                      {collection.charAt(0).toUpperCase() + collection.slice(1)}
                    </Badge>
                    <span className="text-muted-foreground text-sm">
                      {collectionHooks.length} hooks
                    </span>
                  </h3>

                  <div className="space-y-2">
                    {collectionHooks.map((hook) => (
                      <div
                        key={hook.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        {editingHook?.id === hook.id ? (
                          <div className="flex-1 flex items-center gap-2">
                            <Input
                              value={editingHook.hook_text}
                              onChange={(e) =>
                                setEditingHook({
                                  ...editingHook,
                                  hook_text: e.target.value,
                                })
                              }
                              className="flex-1"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => updateHook.mutate(editingHook)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingHook(null)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-3">
                              <Badge
                                className={hookTypeColors[hook.hook_type]}
                                variant="outline"
                              >
                                {hook.hook_type}
                              </Badge>
                              <span className="font-medium">
                                {hook.hook_text}
                              </span>
                              {hook.times_used > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  Used {hook.times_used}x
                                  {hook.avg_engagement_rate !== null &&
                                    ` • ${(hook.avg_engagement_rate * 100).toFixed(1)}% engagement`}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingHook(hook)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteHook.mutate(hook.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Mood Descriptors Tab */}
      {activeTab === 'moods' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Mood Descriptors</h2>
            <Button disabled>
              <Plus className="h-4 w-4 mr-2" />
              Add Mood
            </Button>
          </div>

          {moodsLoading ? (
            <div className="text-muted-foreground">Loading moods...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {moods.map((mood) => (
                <Card key={mood.id} className="p-4">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    {mood.mood.charAt(0).toUpperCase() + mood.mood.slice(1)}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {mood.descriptors.map((desc, i) => (
                      <Badge key={i} variant="secondary">
                        {desc}
                      </Badge>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Room Contexts Tab */}
      {activeTab === 'rooms' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Room Contexts</h2>
            <Button disabled>
              <Plus className="h-4 w-4 mr-2" />
              Add Room
            </Button>
          </div>

          {roomsLoading ? (
            <div className="text-muted-foreground">Loading rooms...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rooms.map((room) => (
                <Card key={room.id} className="p-4">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    {room.room_type
                      .split('_')
                      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                      .join(' ')}
                  </h3>
                  <div className="space-y-2">
                    {room.context_phrases.map((phrase, i) => (
                      <div
                        key={i}
                        className="text-sm text-muted-foreground italic"
                      >
                        "{phrase}"
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Copy Generator Preview */}
      <Card className="p-6 mt-8">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Test Copy Generator
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Try generating copy using your hooks, moods, and room contexts.
        </p>
        <CopyGeneratorPreview />
      </Card>
    </PageContainer>
  );
}

function CopyGeneratorPreview() {
  const [context, setContext] = useState({
    quote: 'Breathe deeply and let go',
    collection: 'grounding',
    mood: 'calm',
    roomType: 'office',
  });
  const [generatedCopy, setGeneratedCopy] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/copy-templates/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...context,
          shopName: 'Haven & Hold',
          variations: 1,
        }),
      });
      const data = await res.json();
      setGeneratedCopy(data.copy);
    } catch (error) {
      console.error('Failed to generate copy:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <Label>Quote</Label>
          <Input
            value={context.quote}
            onChange={(e) => setContext({ ...context, quote: e.target.value })}
            className="mt-1"
          />
        </div>
        <div>
          <Label>Collection</Label>
          <select
            value={context.collection}
            onChange={(e) =>
              setContext({ ...context, collection: e.target.value })
            }
            className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2"
          >
            {COLLECTIONS.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Mood</Label>
          <select
            value={context.mood}
            onChange={(e) => setContext({ ...context, mood: e.target.value })}
            className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2"
          >
            <option value="calm">Calm</option>
            <option value="inspiring">Inspiring</option>
            <option value="grounding">Grounding</option>
            <option value="warm">Warm</option>
            <option value="minimalist">Minimalist</option>
          </select>
        </div>
        <div>
          <Label>Room</Label>
          <select
            value={context.roomType}
            onChange={(e) =>
              setContext({ ...context, roomType: e.target.value })
            }
            className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2"
          >
            <option value="office">Office</option>
            <option value="bedroom">Bedroom</option>
            <option value="living_room">Living Room</option>
            <option value="nursery">Nursery</option>
            <option value="meditation">Meditation</option>
          </select>
        </div>
      </div>

      <Button onClick={handleGenerate} disabled={isGenerating}>
        {isGenerating ? 'Generating...' : 'Generate Copy'}
      </Button>

      {generatedCopy && (
        <div className="mt-4 p-4 bg-muted rounded-lg space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">TITLE</Label>
            <p className="font-medium">{generatedCopy.title}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">DESCRIPTION</Label>
            <p className="text-sm">{generatedCopy.description}</p>
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            {generatedCopy.hooks.opening && (
              <span>Opening: {generatedCopy.hooks.opening}</span>
            )}
            {generatedCopy.hooks.cta && (
              <span>CTA: {generatedCopy.hooks.cta}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
