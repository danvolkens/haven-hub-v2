'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/page-container';
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Badge,
  Input,
  Label,
  Select,
  Switch,
} from '@/components/ui';
import {
  Film,
  Plus,
  Play,
  Loader2,
  Check,
  X,
  AlertTriangle,
  Search,
  Clock,
  Tag,
  ExternalLink,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/components/providers/toast-provider';

// ============================================================================
// Types
// ============================================================================

interface StockFootage {
  id: string;
  source: string;
  source_id: string;
  url: string;
  thumbnail_url: string;
  duration: number;
  width: number;
  height: number;
  orientation: string;
  collection: string;
  mood_tags: string[];
  notes: string;
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
}

interface PoolHealth {
  count: number;
  unused: number;
  status: 'good' | 'low' | 'critical';
}

interface FootageResponse {
  footage: StockFootage[];
  poolHealth: Record<string, PoolHealth>;
}

// ============================================================================
// Fetcher
// ============================================================================

async function fetchFootage(params: Record<string, string>): Promise<FootageResponse> {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`/api/instagram/footage?${query}`);
  if (!res.ok) throw new Error('Failed to fetch footage');
  return res.json();
}

// ============================================================================
// Components
// ============================================================================

function PoolHealthPanel({ health }: { health: Record<string, PoolHealth> }) {
  const collections = ['grounding', 'wholeness', 'growth', 'general'];

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold">Pool Health</h3>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {collections.map((col) => {
            const data = health[col] || { count: 0, unused: 0, status: 'critical' };
            const StatusIcon = data.status === 'good' ? Check
              : data.status === 'low' ? AlertTriangle : X;
            const statusColor = data.status === 'good' ? 'text-green-500'
              : data.status === 'low' ? 'text-yellow-500' : 'text-red-500';

            return (
              <div key={col} className="text-center">
                <div className={`inline-flex items-center gap-1 ${statusColor}`}>
                  <StatusIcon className="h-4 w-4" />
                  <span className="text-sm font-medium capitalize">{col}</span>
                </div>
                <div className="text-2xl font-bold mt-1">{data.count}</div>
                <div className="text-xs text-muted-foreground">
                  {data.unused} unused
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function FootageCard({ footage, onClick }: { footage: StockFootage; onClick: () => void }) {
  const [playing, setPlaying] = useState(false);

  return (
    <Card className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all" onClick={onClick}>
      <div className="relative aspect-[9/16] bg-muted">
        {playing ? (
          <video
            src={footage.url}
            autoPlay
            loop
            muted
            className="absolute inset-0 w-full h-full object-cover"
            onEnded={() => setPlaying(false)}
            onClick={(e) => { e.stopPropagation(); setPlaying(false); }}
          />
        ) : (
          <>
            <img
              src={footage.thumbnail_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            <button
              onClick={(e) => { e.stopPropagation(); setPlaying(true); }}
              className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
            >
              <Play className="h-12 w-12 text-white" />
            </button>
          </>
        )}

        {/* Duration badge */}
        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          <Clock className="inline h-3 w-3 mr-1" />
          {Math.round(footage.duration || 0)}s
        </div>

        {/* Collection badge */}
        <div className="absolute bottom-2 left-2">
          <Badge variant="secondary" size="sm" className="capitalize">
            {footage.collection}
          </Badge>
        </div>
      </div>

      <CardContent className="p-3">
        {/* Mood tags */}
        <div className="flex flex-wrap gap-1 mb-2">
          {footage.mood_tags?.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" size="sm">
              {tag}
            </Badge>
          ))}
          {(footage.mood_tags?.length || 0) > 3 && (
            <Badge variant="secondary" size="sm">
              +{footage.mood_tags.length - 3}
            </Badge>
          )}
        </div>

        {/* Usage stats */}
        <div className="text-xs text-muted-foreground">
          Used: {footage.usage_count}x
          {footage.last_used_at && (
            <> | Last: {formatDistanceToNow(new Date(footage.last_used_at), { addSuffix: false })}</>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function FootageDetailModal({
  footage,
  open,
  onClose,
}: {
  footage: StockFootage | null;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [collection, setCollection] = useState('');
  const [moodTags, setMoodTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [notes, setNotes] = useState('');

  // Reset form when footage changes
  useEffect(() => {
    if (footage) {
      setCollection(footage.collection);
      setMoodTags(footage.mood_tags || []);
      setNotes(footage.notes || '');
      setIsEditing(false);
    }
  }, [footage]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/instagram/footage/${footage?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collection, mood_tags: moodTags, notes }),
      });
      if (!res.ok) throw new Error('Failed to update');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-footage'] });
      toast('Footage updated', 'success');
      setIsEditing(false);
    },
    onError: () => toast('Failed to update footage', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/instagram/footage/${footage?.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-footage'] });
      toast('Footage deleted', 'success');
      onClose();
    },
    onError: () => toast('Failed to delete footage', 'error'),
  });

  const addTag = () => {
    if (tagInput.trim() && !moodTags.includes(tagInput.trim())) {
      setMoodTags([...moodTags, tagInput.trim()]);
      setTagInput('');
    }
  };

  if (!open || !footage) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <h2 className="text-lg font-semibold">Footage Details</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Video preview */}
            <div className="aspect-[9/16] bg-black rounded-lg overflow-hidden">
              <video
                src={footage.url}
                controls
                className="w-full h-full object-contain"
                poster={footage.thumbnail_url}
              />
            </div>

            {/* Details */}
            <div className="space-y-4">
              {/* Metadata */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span>{Math.round(footage.duration || 0)}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Resolution</span>
                  <span>{footage.width}x{footage.height}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Orientation</span>
                  <span className="capitalize">{footage.orientation}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Source</span>
                  <span className="capitalize">{footage.source}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Times Used</span>
                  <span>{footage.usage_count}</span>
                </div>
                {footage.last_used_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Used</span>
                    <span>{formatDistanceToNow(new Date(footage.last_used_at), { addSuffix: true })}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Added</span>
                  <span>{formatDistanceToNow(new Date(footage.created_at), { addSuffix: true })}</span>
                </div>
              </div>

              {/* Editable fields */}
              {isEditing ? (
                <>
                  {/* Collection */}
                  <div>
                    <Label>Collection</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {['grounding', 'wholeness', 'growth', 'general'].map((col) => (
                        <label key={col} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="collection"
                            value={col}
                            checked={collection === col}
                            onChange={() => setCollection(col)}
                          />
                          <span className="capitalize text-sm">{col}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Mood tags */}
                  <div>
                    <Label>Mood Tags</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                        placeholder="Add tag..."
                        className="flex-1"
                      />
                      <Button variant="secondary" size="sm" onClick={addTag}>Add</Button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {moodTags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                          <button onClick={() => setMoodTags(moodTags.filter((t) => t !== tag))} className="ml-1">×</button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <Label>Notes</Label>
                    <Input
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Optional notes..."
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* Display mode */}
                  <div>
                    <Label className="text-muted-foreground">Collection</Label>
                    <Badge className="capitalize mt-1">{footage.collection}</Badge>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Mood Tags</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {footage.mood_tags?.length ? footage.mood_tags.map((tag) => (
                        <Badge key={tag} variant="secondary">{tag}</Badge>
                      )) : <span className="text-sm text-muted-foreground">No tags</span>}
                    </div>
                  </div>
                  {footage.notes && (
                    <div>
                      <Label className="text-muted-foreground">Notes</Label>
                      <p className="text-sm mt-1">{footage.notes}</p>
                    </div>
                  )}
                </>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                {isEditing ? (
                  <>
                    <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                    </Button>
                    <Button variant="secondary" onClick={() => setIsEditing(false)}>Cancel</Button>
                  </>
                ) : (
                  <>
                    <Button variant="secondary" onClick={() => {
                      setCollection(footage.collection);
                      setMoodTags(footage.mood_tags || []);
                      setNotes(footage.notes || '');
                      setIsEditing(true);
                    }}>
                      Edit
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => window.open(footage.url, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        if (confirm('Delete this footage?')) deleteMutation.mutate();
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AddFootageModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const [collection, setCollection] = useState('general');
  const [moodTags, setMoodTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [notes, setNotes] = useState('');

  const fetchPreviewMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/instagram/footage/pexels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch');
      }
      return res.json();
    },
    onSuccess: (data) => {
      setPreview(data);
      if (data.orientation === 'landscape') {
        toast('This video is landscape. Only portrait videos are supported.', 'warning');
      }
    },
    onError: (error: Error) => {
      toast(error.message, 'error');
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/instagram/footage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...preview,
          collection,
          mood_tags: moodTags,
          notes,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to add');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-footage'] });
      toast('Footage added to library', 'success');
      onClose();
      resetForm();
    },
    onError: (error: Error) => {
      toast(error.message, 'error');
    },
  });

  const resetForm = () => {
    setUrl('');
    setPreview(null);
    setCollection('general');
    setMoodTags([]);
    setNotes('');
  };

  const addTag = () => {
    if (tagInput.trim() && !moodTags.includes(tagInput.trim())) {
      setMoodTags([...moodTags, tagInput.trim()]);
      setTagInput('');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <h2 className="text-lg font-semibold">Add Stock Footage</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* URL input */}
          <div>
            <Label>Pexels Video URL</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.pexels.com/video/..."
              />
              <Button
                onClick={() => fetchPreviewMutation.mutate()}
                disabled={!url || fetchPreviewMutation.isPending}
              >
                {fetchPreviewMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Fetch'
                )}
              </Button>
            </div>
          </div>

          {/* Preview */}
          {preview && (
            <div className="space-y-4">
              <div className="flex gap-4">
                <img
                  src={preview.thumbnail_url}
                  alt="Preview"
                  className="w-24 h-36 object-cover rounded"
                />
                <div className="space-y-1 text-sm">
                  <p>Duration: {preview.duration}s</p>
                  <p>Resolution: {preview.width}x{preview.height}</p>
                  <p>
                    Orientation:{' '}
                    <span className={preview.orientation === 'landscape' ? 'text-red-500' : 'text-green-500'}>
                      {preview.orientation}
                    </span>
                  </p>
                  {preview.photographer && <p>By: {preview.photographer}</p>}
                </div>
              </div>

              {preview.orientation === 'landscape' && (
                <div className="flex items-center gap-2 text-yellow-600 text-sm bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded">
                  <AlertTriangle className="h-4 w-4" />
                  Landscape videos are not supported
                </div>
              )}

              {/* Collection */}
              <div>
                <Label>Collection</Label>
                <div className="flex gap-2 mt-1">
                  {['grounding', 'wholeness', 'growth', 'general'].map((col) => (
                    <label key={col} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="collection"
                        value={col}
                        checked={collection === col}
                        onChange={() => setCollection(col)}
                      />
                      <span className="capitalize">{col}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Mood tags */}
              <div>
                <Label>Mood Tags</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="e.g., calming, nature"
                  />
                  <Button variant="secondary" onClick={addTag}>
                    Add
                  </Button>
                </div>
                {moodTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {moodTags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                        <button
                          onClick={() => setMoodTags(moodTags.filter((t) => t !== tag))}
                          className="ml-1"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <Label>Notes</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes..."
                />
              </div>

              {/* Add button */}
              <Button
                onClick={() => addMutation.mutate()}
                disabled={preview.orientation === 'landscape' || addMutation.isPending}
                className="w-full"
              >
                {addMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Add to Pool
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function StockFootagePage() {
  const [activeTab, setActiveTab] = useState('all');
  const [portraitOnly, setPortraitOnly] = useState(true);
  const [sortBy, setSortBy] = useState('created_at');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedFootage, setSelectedFootage] = useState<StockFootage | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['instagram-footage', activeTab, portraitOnly, sortBy],
    queryFn: () => fetchFootage({
      collection: activeTab,
      portrait: String(portraitOnly),
      sort: sortBy,
    }),
  });

  const tabs = [
    { id: 'all', label: 'All', count: data?.footage?.length || 0 },
    { id: 'grounding', label: 'Grounding', count: data?.poolHealth?.grounding?.count || 0 },
    { id: 'wholeness', label: 'Wholeness', count: data?.poolHealth?.wholeness?.count || 0 },
    { id: 'growth', label: 'Growth', count: data?.poolHealth?.growth?.count || 0 },
    { id: 'general', label: 'General', count: data?.poolHealth?.general?.count || 0 },
  ];

  const filteredFootage = search
    ? data?.footage?.filter((f) =>
        f.mood_tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()))
      )
    : data?.footage;

  return (
    <PageContainer title="Stock Footage Library">
      <div className="space-y-6">
        {/* Pool Health */}
        {data?.poolHealth && <PoolHealthPanel health={data.poolHealth} />}

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex gap-1 bg-muted p-1 rounded-lg">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-background shadow font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
                <span className="ml-1 text-xs opacity-70">({tab.count})</span>
              </button>
            ))}
          </div>

          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Footage
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Label>Portrait Only</Label>
            <Switch
              checked={portraitOnly}
              onChange={(e) => setPortraitOnly(e.target.checked)}
            />
          </div>

          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by mood..."
              className="pl-9"
            />
          </div>

          <Select
            value={sortBy}
            onChange={(value) => setSortBy(value as string)}
            options={[
              { value: 'created_at', label: 'Recently Added' },
              { value: 'least_used', label: 'Least Used' },
              { value: 'most_used', label: 'Most Used' },
            ]}
            className="w-40"
          />
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !filteredFootage?.length ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Film className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No footage found. Add some from Pexels to get started.
              </p>
              <Button onClick={() => setShowAddModal(true)} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Add Footage
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredFootage.map((footage) => (
              <FootageCard
                key={footage.id}
                footage={footage}
                onClick={() => setSelectedFootage(footage)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Modal */}
      <AddFootageModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
      />

      {/* Detail Modal */}
      <FootageDetailModal
        footage={selectedFootage}
        open={!!selectedFootage}
        onClose={() => setSelectedFootage(null)}
      />
    </PageContainer>
  );
}
