'use client';

import { useState, useRef, useEffect } from 'react';
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
} from '@/components/ui';
import {
  Music,
  Plus,
  Play,
  Pause,
  Loader2,
  Check,
  X,
  AlertTriangle,
  Search,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/components/providers/toast-provider';

// ============================================================================
// Types
// ============================================================================

interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  url: string;
  duration: number;
  bpm: number | null;
  collection: string;
  mood_tags: string[];
  notes: string;
  license_source: string;
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
}

interface PoolHealth {
  count: number;
  unused: number;
  status: 'good' | 'low' | 'critical';
}

interface MusicResponse {
  tracks: MusicTrack[];
  poolHealth: Record<string, PoolHealth>;
}

// ============================================================================
// Fetcher
// ============================================================================

async function fetchMusic(params: Record<string, string>): Promise<MusicResponse> {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`/api/instagram/music?${query}`);
  if (!res.ok) throw new Error('Failed to fetch music');
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
        <p className="text-sm text-muted-foreground">Recommended: 15+ tracks per collection</p>
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

function TrackRow({
  track,
  isPlaying,
  onPlay,
  onPause,
  onClick,
}: {
  track: MusicTrack;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onClick: () => void;
}) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="flex items-center gap-4 p-4 border-b border-border hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      {/* Play button */}
      <button
        onClick={(e) => { e.stopPropagation(); isPlaying ? onPause() : onPlay(); }}
        className="p-2 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{track.title}</div>
        <div className="text-sm text-muted-foreground truncate">
          {track.artist || 'Unknown Artist'}
        </div>
      </div>

      {/* Duration & BPM */}
      <div className="text-sm text-muted-foreground text-right hidden sm:block">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatDuration(track.duration)}
        </div>
        {track.bpm && <div>{track.bpm} BPM</div>}
      </div>

      {/* Collection */}
      <Badge variant="secondary" className="capitalize hidden md:inline-flex">
        {track.collection}
      </Badge>

      {/* Mood tags */}
      <div className="hidden lg:flex gap-1 max-w-32">
        {track.mood_tags.slice(0, 2).map((tag) => (
          <Badge key={tag} variant="secondary" size="sm">
            {tag}
          </Badge>
        ))}
      </div>

      {/* Usage */}
      <div className="text-xs text-muted-foreground text-right w-20">
        <div>Used {track.usage_count}x</div>
        {track.last_used_at && (
          <div>{formatDistanceToNow(new Date(track.last_used_at), { addSuffix: false })}</div>
        )}
      </div>
    </div>
  );
}

function AddTrackModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [url, setUrl] = useState('');
  const [duration, setDuration] = useState('');
  const [bpm, setBpm] = useState('');
  const [collection, setCollection] = useState('general');
  const [moodTags, setMoodTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [notes, setNotes] = useState('');
  const [licenseSource, setLicenseSource] = useState('');

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/instagram/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          artist,
          url,
          duration: parseInt(duration) || 0,
          bpm: bpm ? parseInt(bpm) : null,
          collection,
          mood_tags: moodTags,
          notes,
          license_source: licenseSource,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to add');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-music'] });
      toast('Track added to library', 'success');
      onClose();
      resetForm();
    },
    onError: (error: Error) => {
      toast(error.message, 'error');
    },
  });

  const resetForm = () => {
    setTitle('');
    setArtist('');
    setUrl('');
    setDuration('');
    setBpm('');
    setCollection('general');
    setMoodTags([]);
    setNotes('');
    setLicenseSource('');
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
          <h2 className="text-lg font-semibold">Add Music Track</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Title */}
          <div>
            <Label>Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Track title"
            />
          </div>

          {/* Artist */}
          <div>
            <Label>Artist</Label>
            <Input
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="Artist name"
            />
          </div>

          {/* URL */}
          <div>
            <Label>Audio URL *</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          {/* Duration & BPM */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Duration (seconds)</Label>
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g., 180"
              />
            </div>
            <div>
              <Label>BPM</Label>
              <Input
                type="number"
                value={bpm}
                onChange={(e) => setBpm(e.target.value)}
                placeholder="e.g., 120"
              />
            </div>
          </div>

          {/* Collection */}
          <div>
            <Label>Collection *</Label>
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
                placeholder="e.g., uplifting, calm"
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

          {/* License source */}
          <div>
            <Label>License Source</Label>
            <Input
              value={licenseSource}
              onChange={(e) => setLicenseSource(e.target.value)}
              placeholder="e.g., Epidemic Sound"
            />
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
            disabled={!title || !url || addMutation.isPending}
            className="w-full"
          >
            {addMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Add Track
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function TrackDetailModal({
  track,
  open,
  onClose,
}: {
  track: MusicTrack | null;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [collection, setCollection] = useState('');
  const [moodTags, setMoodTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [notes, setNotes] = useState('');
  const [bpm, setBpm] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Reset form when track changes
  useEffect(() => {
    if (track) {
      setTitle(track.title);
      setArtist(track.artist || '');
      setCollection(track.collection);
      setMoodTags(track.mood_tags || []);
      setNotes(track.notes || '');
      setBpm(track.bpm);
      setIsEditing(false);
      setIsPlaying(false);
    }
    // Cleanup audio on close
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [track]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/instagram/music/${track?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, artist, collection, mood_tags: moodTags, notes, bpm }),
      });
      if (!res.ok) throw new Error('Failed to update');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-music'] });
      toast('Track updated', 'success');
      setIsEditing(false);
    },
    onError: () => toast('Failed to update track', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/instagram/music/${track?.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-music'] });
      toast('Track deleted', 'success');
      onClose();
    },
    onError: () => toast('Failed to delete track', 'error'),
  });

  const addTag = () => {
    if (tagInput.trim() && !moodTags.includes(tagInput.trim())) {
      setMoodTags([...moodTags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const togglePlay = () => {
    if (!track) return;
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio(track.url);
        audioRef.current.onended = () => setIsPlaying(false);
      }
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!open || !track) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <h2 className="text-lg font-semibold">Track Details</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Audio player */}
          <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
            <button
              onClick={togglePlay}
              className="p-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
            </button>
            <div className="flex-1">
              <div className="font-medium">{track.title}</div>
              <div className="text-sm text-muted-foreground">{track.artist || 'Unknown Artist'}</div>
            </div>
            <div className="text-sm text-muted-foreground">
              {formatDuration(track.duration)}
            </div>
          </div>

          {/* Metadata */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration</span>
                <span>{formatDuration(track.duration)}</span>
              </div>
              {track.bpm && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">BPM</span>
                  <span>{track.bpm}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">License</span>
                <span>{track.license_source || 'Not specified'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Times Used</span>
                <span>{track.usage_count}</span>
              </div>
              {track.last_used_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Used</span>
                  <span>{formatDistanceToNow(new Date(track.last_used_at), { addSuffix: true })}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Added</span>
                <span>{formatDistanceToNow(new Date(track.created_at), { addSuffix: true })}</span>
              </div>
            </div>

            {/* Editable fields */}
            <div className="space-y-4">
              {isEditing ? (
                <>
                  {/* Title */}
                  <div>
                    <Label>Title</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                  </div>

                  {/* Artist */}
                  <div>
                    <Label>Artist</Label>
                    <Input value={artist} onChange={(e) => setArtist(e.target.value)} />
                  </div>

                  {/* BPM */}
                  <div>
                    <Label>BPM</Label>
                    <Input
                      type="number"
                      value={bpm || ''}
                      onChange={(e) => setBpm(e.target.value ? parseInt(e.target.value) : null)}
                    />
                  </div>

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
                    <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." />
                  </div>
                </>
              ) : (
                <>
                  {/* Display mode */}
                  <div>
                    <Label className="text-muted-foreground">Collection</Label>
                    <Badge className="capitalize mt-1">{track.collection}</Badge>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Mood Tags</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {track.mood_tags?.length ? track.mood_tags.map((tag) => (
                        <Badge key={tag} variant="secondary">{tag}</Badge>
                      )) : <span className="text-sm text-muted-foreground">No tags</span>}
                    </div>
                  </div>
                  {track.notes && (
                    <div>
                      <Label className="text-muted-foreground">Notes</Label>
                      <p className="text-sm mt-1">{track.notes}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

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
                  setTitle(track.title);
                  setArtist(track.artist || '');
                  setCollection(track.collection);
                  setMoodTags(track.mood_tags || []);
                  setNotes(track.notes || '');
                  setBpm(track.bpm);
                  setIsEditing(true);
                }}>
                  Edit
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => window.open(track.url, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (confirm('Delete this track?')) deleteMutation.mutate();
                  }}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function MusicLibraryPage() {
  const [collection, setCollection] = useState('all');
  const [mood, setMood] = useState('');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['instagram-music', collection, mood, search],
    queryFn: () => fetchMusic({
      collection,
      mood,
      search,
    }),
  });

  const handlePlay = (track: MusicTrack) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    audioRef.current = new Audio(track.url);
    audioRef.current.play();
    setPlayingTrackId(track.id);

    audioRef.current.onended = () => {
      setPlayingTrackId(null);
    };
  };

  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setPlayingTrackId(null);
  };

  return (
    <PageContainer title="Music Library">
      <div className="space-y-6">
        {/* Pool Health */}
        {data?.poolHealth && <PoolHealthPanel health={data.poolHealth} />}

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Collection filter */}
            <Select
              value={collection}
              onChange={(value) => setCollection(value as string)}
              options={[
                { value: 'all', label: 'All Collections' },
                { value: 'grounding', label: 'Grounding' },
                { value: 'wholeness', label: 'Wholeness' },
                { value: 'growth', label: 'Growth' },
                { value: 'general', label: 'General' },
              ]}
              className="w-40"
            />

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tracks..."
                className="pl-9 w-48"
              />
            </div>
          </div>

          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Track
          </Button>
        </div>

        {/* Track list */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !data?.tracks?.length ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No music tracks found. Add some to get started.
              </p>
              <Button onClick={() => setShowAddModal(true)} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Add Track
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <div className="divide-y divide-border">
              {data.tracks.map((track) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  isPlaying={playingTrackId === track.id}
                  onPlay={() => handlePlay(track)}
                  onPause={handlePause}
                  onClick={() => setSelectedTrack(track)}
                />
              ))}
            </div>
          </Card>
        )}

        {/* License info */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Music className="h-4 w-4" />
              <span>Music licensing managed externally. Ensure all tracks are properly licensed for commercial use.</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Modal */}
      <AddTrackModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
      />

      {/* Detail Modal */}
      <TrackDetailModal
        track={selectedTrack}
        open={!!selectedTrack}
        onClose={() => setSelectedTrack(null)}
      />
    </PageContainer>
  );
}
