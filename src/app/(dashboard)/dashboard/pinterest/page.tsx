'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Modal,
  Select,
  Input,
  Label,
} from '@/components/ui';
import {
  Pin,
  RefreshCw,
  ExternalLink,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Send,
  Trash2,
  BarChart3,
  Link as LinkIcon,
  Calendar,
  Check,
} from 'lucide-react';
import { BulkPinCreator } from '@/components/pinterest/bulk-pin-creator';

interface Board {
  id: string;
  pinterest_board_id: string;
  name: string;
  description: string;
  privacy: string;
  pin_count: number;
  follower_count: number;
  collection: string | null;
  is_primary: boolean;
  synced_at: string;
}

interface PinRecord {
  id: string;
  pinterest_pin_id: string | null;
  pinterest_board_id: string;
  title: string;
  description: string;
  image_url: string;
  link: string;
  alt_text: string | null;
  status: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed' | 'retired';
  scheduled_for: string | null;
  published_at: string | null;
  impressions: number;
  saves: number;
  clicks: number;
  last_error: string | null;
  created_at: string;
  pinterest_boards?: { name: string };
}

export default function PinterestPage() {
  const [activeTab, setActiveTab] = useState('boards');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPin, setSelectedPin] = useState<PinRecord | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showBulkSchedule, setShowBulkSchedule] = useState(false);
  const [selectedPinIds, setSelectedPinIds] = useState<string[]>([]);
  const [bulkScheduleStrategy, setBulkScheduleStrategy] = useState<'immediate' | 'optimal' | 'spread'>('optimal');
  const [spreadDays, setSpreadDays] = useState(7);
  const queryClient = useQueryClient();

  // Fetch Pinterest status
  const { data: status } = useQuery({
    queryKey: ['pinterest', 'status'],
    queryFn: async () => {
      const res = await fetch('/api/pinterest/status');
      if (!res.ok) throw new Error('Failed to fetch status');
      return res.json();
    },
  });

  // Fetch boards
  const { data: boardsData, isLoading: loadingBoards } = useQuery({
    queryKey: ['pinterest', 'boards'],
    queryFn: async () => {
      const res = await fetch('/api/pinterest/boards');
      if (!res.ok) throw new Error('Failed to fetch boards');
      return res.json();
    },
  });

  // Fetch pins
  const { data: pinsData, isLoading: loadingPins } = useQuery({
    queryKey: ['pinterest', 'pins', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '100' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/pinterest/pins?${params}`);
      if (!res.ok) throw new Error('Failed to fetch pins');
      return res.json();
    },
  });

  // Sync boards mutation
  const syncBoardsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/pinterest/boards', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to sync boards');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pinterest', 'boards'] });
    },
  });

  // Update board collection mutation
  const updateBoardMutation = useMutation({
    mutationFn: async ({ boardId, collection }: { boardId: string; collection: string | null }) => {
      const res = await fetch('/api/pinterest/boards', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardId, collection }),
      });
      if (!res.ok) throw new Error('Failed to update board');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pinterest', 'boards'] });
    },
  });

  // Publish pin mutation
  const publishPinMutation = useMutation({
    mutationFn: async (pinId: string) => {
      const res = await fetch('/api/pinterest/pins/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinId }),
      });
      if (!res.ok) throw new Error('Failed to publish pin');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pinterest', 'pins'] });
    },
  });

  // Delete pin mutation
  const deletePinMutation = useMutation({
    mutationFn: async (pinId: string) => {
      const res = await fetch('/api/pinterest/pins', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinId }),
      });
      if (!res.ok) throw new Error('Failed to delete pin');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pinterest', 'pins'] });
      setShowDeleteConfirm(null);
    },
  });

  // Bulk schedule mutation
  const bulkScheduleMutation = useMutation({
    mutationFn: async (data: { pinIds: string[]; strategy: string; spreadDays?: number }) => {
      const res = await fetch('/api/pins/bulk-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to schedule pins');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pinterest', 'pins'] });
      setShowBulkSchedule(false);
      setSelectedPinIds([]);
    },
  });

  const handleBulkSchedule = () => {
    bulkScheduleMutation.mutate({
      pinIds: selectedPinIds,
      strategy: bulkScheduleStrategy,
      spreadDays: bulkScheduleStrategy === 'spread' ? spreadDays : undefined,
    });
  };

  const togglePinSelection = (pinId: string) => {
    setSelectedPinIds((prev) =>
      prev.includes(pinId) ? prev.filter((id) => id !== pinId) : [...prev, pinId]
    );
  };

  const selectAllDraftPins = () => {
    const draftPinIds = pins.filter((p) => p.status === 'draft').map((p) => p.id);
    setSelectedPinIds(draftPinIds);
  };

  const boards: Board[] = boardsData?.boards || [];
  const pins: PinRecord[] = pinsData?.pins || [];

  const getStatusBadge = (status: PinRecord['status']) => {
    const config: Record<PinRecord['status'], { variant: 'default' | 'success' | 'error' | 'secondary'; icon: React.ReactNode }> = {
      draft: { variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
      scheduled: { variant: 'default', icon: <Clock className="h-3 w-3" /> },
      publishing: { variant: 'default', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
      published: { variant: 'success', icon: <CheckCircle className="h-3 w-3" /> },
      failed: { variant: 'error', icon: <XCircle className="h-3 w-3" /> },
      retired: { variant: 'secondary', icon: <AlertCircle className="h-3 w-3" /> },
    };
    const { variant, icon } = config[status];
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        {icon}
        {status}
      </Badge>
    );
  };

  if (!status?.connected) {
    return (
      <PageContainer
        title="Pinterest Manager"
        description="Connect your Pinterest account to manage pins and boards"
      >
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-red-100 p-4 mb-4">
              <Pin className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-h3 mb-2">Pinterest Not Connected</h3>
            <p className="text-body text-[var(--color-text-secondary)] max-w-md mb-6">
              Connect your Pinterest Business account to start managing your pins, boards, and publishing schedule.
            </p>
            <a href="/api/auth/pinterest/connect">
              <Button>
                <Pin className="h-4 w-4 mr-2" />
                Connect Pinterest
              </Button>
            </a>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Pinterest Manager"
      description={`Connected as @${status.username || 'user'}`}
      actions={
        <div className="flex items-center gap-2">
          <Link href="/dashboard/pinterest/analytics">
            <Button variant="secondary">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
          </Link>
          <BulkPinCreator boards={boards} />
          <Link href="/dashboard/assets">
            <Button variant="secondary">
              <Plus className="h-4 w-4 mr-2" />
              Create Pin
            </Button>
          </Link>
        </div>
      }
    >
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="boards">Boards ({boards.length})</TabsTrigger>
          <TabsTrigger value="pins">Pins ({pins.length})</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
        </TabsList>

        <TabsContent value="boards">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Pinterest Boards</h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Assign boards to collections for organized publishing
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => syncBoardsMutation.mutate()}
                disabled={syncBoardsMutation.isPending}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncBoardsMutation.isPending ? 'animate-spin' : ''}`} />
                Sync Boards
              </Button>
            </CardHeader>
            <CardContent>
              {loadingBoards ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-[var(--color-text-tertiary)]" />
                </div>
              ) : boards.length === 0 ? (
                <div className="text-center py-8 text-[var(--color-text-secondary)]">
                  No boards found. Click "Sync Boards" to fetch your Pinterest boards.
                </div>
              ) : (
                <div className="space-y-3">
                  {boards.map((board) => (
                    <div
                      key={board.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{board.name}</h4>
                          {board.is_primary && (
                            <Badge variant="success">Primary</Badge>
                          )}
                        </div>
                        <p className="text-sm text-[var(--color-text-secondary)]">
                          {board.pin_count} pins • {board.follower_count} followers
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Select
                          value={board.collection || ''}
                          onChange={(value) =>
                            updateBoardMutation.mutate({
                              boardId: board.id,
                              collection: (typeof value === 'string' ? value : null) || null,
                            })
                          }
                          options={[
                            { value: '', label: 'No Collection' },
                            { value: 'grounding', label: 'Grounding' },
                            { value: 'wholeness', label: 'Wholeness' },
                            { value: 'growth', label: 'Growth' },
                          ]}
                        />
                        <a
                          href={`https://pinterest.com/pin/${board.pinterest_board_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pins">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Your Pins</h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Manage all your pins across boards
                </p>
              </div>
              <div className="flex items-center gap-2">
                {selectedPinIds.length > 0 && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowBulkSchedule(true)}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule {selectedPinIds.length} pins
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={selectAllDraftPins}
                  disabled={pins.filter((p) => p.status === 'draft').length === 0}
                >
                  Select All Drafts
                </Button>
                <Select
                  value={statusFilter}
                  onChange={(value) => setStatusFilter(typeof value === 'string' ? value : 'all')}
                  options={[
                    { value: 'all', label: 'All Status' },
                    { value: 'draft', label: 'Draft' },
                    { value: 'scheduled', label: 'Scheduled' },
                    { value: 'published', label: 'Published' },
                    { value: 'failed', label: 'Failed' },
                  ]}
                />
              </div>
            </CardHeader>
            <CardContent>
              {loadingPins ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-[var(--color-text-tertiary)]" />
                </div>
              ) : pins.length === 0 ? (
                <div className="text-center py-8 text-[var(--color-text-secondary)]">
                  No pins found. Create pins from the Assets library.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {pins.map((pin) => (
                    <Card key={pin.id} className={`overflow-hidden ${selectedPinIds.includes(pin.id) ? 'ring-2 ring-sage' : ''}`}>
                      <div
                        className="aspect-square relative bg-[var(--color-bg-secondary)] cursor-pointer"
                        onClick={() => setSelectedPin(pin)}
                      >
                        <img
                          src={pin.image_url}
                          alt={pin.title}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        {/* Selection checkbox */}
                        {(pin.status === 'draft' || pin.status === 'failed') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePinSelection(pin.id);
                            }}
                            className={`absolute top-2 left-2 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                              selectedPinIds.includes(pin.id)
                                ? 'bg-sage border-sage text-white'
                                : 'bg-white/80 border-gray-300 hover:border-sage'
                            }`}
                          >
                            {selectedPinIds.includes(pin.id) && <Check className="h-4 w-4" />}
                          </button>
                        )}
                      </div>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-medium text-sm truncate flex-1">
                            {pin.title}
                          </h4>
                          {getStatusBadge(pin.status)}
                        </div>
                        <p className="text-xs text-[var(--color-text-tertiary)] mb-2">
                          {pin.pinterest_boards?.name || 'Unknown board'}
                        </p>
                        {pin.status === 'published' && (
                          <div className="flex gap-3 text-xs text-[var(--color-text-secondary)]">
                            <span>{pin.impressions} views</span>
                            <span>{pin.saves} saves</span>
                            <span>{pin.clicks} clicks</span>
                          </div>
                        )}
                        {pin.status === 'failed' && pin.last_error && (
                          <p className="text-xs text-red-600 truncate">{pin.last_error}</p>
                        )}
                        <div className="flex gap-2 mt-3">
                          {(pin.status === 'draft' || pin.status === 'failed') && (
                            <Button
                              size="sm"
                              onClick={() => publishPinMutation.mutate(pin.id)}
                              disabled={publishPinMutation.isPending}
                            >
                              <Send className="h-3 w-3 mr-1" />
                              Publish
                            </Button>
                          )}
                          {pin.pinterest_pin_id && (
                            <a
                              href={`https://pinterest.com/pin/${pin.pinterest_pin_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button size="sm" variant="secondary">
                                <ExternalLink className="h-3 w-3 mr-1" />
                                View
                              </Button>
                            </a>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowDeleteConfirm(pin.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Scheduled Pins</h3>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Pins waiting to be published
              </p>
            </CardHeader>
            <CardContent>
              {(() => {
                const scheduledPins = pins.filter((p) => p.status === 'scheduled');
                if (scheduledPins.length === 0) {
                  return (
                    <div className="text-center py-8 text-[var(--color-text-secondary)]">
                      No scheduled pins. Schedule pins from the Assets library.
                    </div>
                  );
                }
                return (
                  <div className="space-y-3">
                    {scheduledPins.map((pin) => (
                      <div
                        key={pin.id}
                        className="flex items-center gap-4 p-4 border rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors cursor-pointer"
                        onClick={() => setSelectedPin(pin)}
                      >
                        <img
                          src={pin.image_url}
                          alt={pin.title}
                          className="w-16 h-16 rounded object-cover"
                        />
                        <div className="flex-1">
                          <h4 className="font-medium">{pin.title}</h4>
                          <p className="text-sm text-[var(--color-text-secondary)]">
                            {pin.pinterest_boards?.name}
                          </p>
                          {pin.scheduled_for && (
                            <p className="text-xs text-[var(--color-text-tertiary)]">
                              Scheduled for {new Date(pin.scheduled_for).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            onClick={() => publishPinMutation.mutate(pin.id)}
                            disabled={publishPinMutation.isPending}
                          >
                            Publish Now
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowDeleteConfirm(pin.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Pin Detail Modal */}
      <Modal
        isOpen={!!selectedPin}
        onClose={() => setSelectedPin(null)}
        title="Pin Preview"
        size="lg"
      >
        {selectedPin && (
          <div className="space-y-4">
            {/* Image */}
            <img
              src={selectedPin.image_url}
              alt={selectedPin.title}
              className="w-full max-h-80 object-contain rounded-lg bg-[var(--color-bg-secondary)]"
            />

            {/* Status and Board */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusBadge(selectedPin.status)}
                {selectedPin.scheduled_for && selectedPin.status === 'scheduled' && (
                  <span className="flex items-center gap-1 text-xs text-[var(--color-text-tertiary)]">
                    <Calendar className="h-3 w-3" />
                    {new Date(selectedPin.scheduled_for).toLocaleString()}
                  </span>
                )}
              </div>
              <div className="text-sm text-[var(--color-text-secondary)]">
                {selectedPin.pinterest_boards?.name}
              </div>
            </div>

            {/* Title */}
            <div>
              <h4 className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wide mb-1">Title</h4>
              <p className="font-medium">{selectedPin.title}</p>
            </div>

            {/* Description */}
            {selectedPin.description && (
              <div>
                <h4 className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wide mb-1">Description</h4>
                <p className="text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap">
                  {selectedPin.description}
                </p>
              </div>
            )}

            {/* Link */}
            {selectedPin.link && (
              <div>
                <h4 className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wide mb-1">Destination Link</h4>
                <div className="flex items-center gap-2 text-sm">
                  <LinkIcon className="h-4 w-4 text-[var(--color-text-tertiary)]" />
                  <a
                    href={selectedPin.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-600 hover:underline truncate"
                  >
                    {selectedPin.link}
                  </a>
                </div>
              </div>
            )}

            {/* Alt Text */}
            {selectedPin.alt_text && (
              <div>
                <h4 className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wide mb-1">Alt Text</h4>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {selectedPin.alt_text}
                </p>
              </div>
            )}

            {/* Stats for published pins */}
            {selectedPin.status === 'published' && (
              <div className="grid grid-cols-3 gap-4 p-4 bg-[var(--color-bg-secondary)] rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold">{selectedPin.impressions}</div>
                  <div className="text-sm text-[var(--color-text-secondary)]">Impressions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{selectedPin.saves}</div>
                  <div className="text-sm text-[var(--color-text-secondary)]">Saves</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{selectedPin.clicks}</div>
                  <div className="text-sm text-[var(--color-text-secondary)]">Clicks</div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t">
              {(selectedPin.status === 'draft' || selectedPin.status === 'scheduled' || selectedPin.status === 'failed') && (
                <Button
                  onClick={() => {
                    publishPinMutation.mutate(selectedPin.id);
                    setSelectedPin(null);
                  }}
                  disabled={publishPinMutation.isPending}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Publish Now
                </Button>
              )}
              {selectedPin.pinterest_pin_id && (
                <a
                  href={`https://pinterest.com/pin/${selectedPin.pinterest_pin_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="secondary">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View on Pinterest
                  </Button>
                </a>
              )}
              <Button
                variant="ghost"
                onClick={() => {
                  setShowDeleteConfirm(selectedPin.id);
                  setSelectedPin(null);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        title="Delete Pin"
        size="sm"
      >
        <p className="text-[var(--color-text-secondary)] mb-4">
          Are you sure you want to delete this pin? This will also remove it from Pinterest if published.
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setShowDeleteConfirm(null)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => showDeleteConfirm && deletePinMutation.mutate(showDeleteConfirm)}
            disabled={deletePinMutation.isPending}
          >
            {deletePinMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </Modal>

      {/* Bulk Schedule Modal */}
      <Modal
        isOpen={showBulkSchedule}
        onClose={() => setShowBulkSchedule(false)}
        title={`Schedule ${selectedPinIds.length} Pins`}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Choose how you want to schedule the selected pins.
          </p>

          <div>
            <Label>Scheduling Strategy</Label>
            <Select
              value={bulkScheduleStrategy}
              onChange={(value) => setBulkScheduleStrategy(value as 'immediate' | 'optimal' | 'spread')}
              options={[
                { value: 'immediate', label: 'Immediate', description: 'Publish all pins now' },
                { value: 'optimal', label: 'Optimal Times', description: 'Schedule at peak engagement times' },
                { value: 'spread', label: 'Spread Over Days', description: 'Distribute across multiple days' },
              ]}
            />
          </div>

          {bulkScheduleStrategy === 'spread' && (
            <div>
              <Label>Spread Over (days)</Label>
              <Input
                type="number"
                value={spreadDays}
                onChange={(e) => setSpreadDays(parseInt(e.target.value) || 7)}
                min={1}
                max={30}
                className="mt-1"
              />
              <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                Pins will be evenly distributed across {spreadDays} days
              </p>
            </div>
          )}

          {bulkScheduleStrategy === 'optimal' && (
            <div className="p-3 bg-[var(--color-bg-secondary)] rounded-lg text-sm">
              <p className="font-medium mb-1">Optimal posting times:</p>
              <ul className="text-[var(--color-text-secondary)] space-y-1">
                <li>• Weekdays: 8-11 PM</li>
                <li>• Weekends: 2-4 PM, 8-11 PM</li>
                <li>• Fridays: 3 PM</li>
              </ul>
            </div>
          )}

          {bulkScheduleMutation.error && (
            <p className="text-sm text-red-500">{bulkScheduleMutation.error.message}</p>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="ghost" onClick={() => setShowBulkSchedule(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkSchedule}
              disabled={bulkScheduleMutation.isPending}
            >
              {bulkScheduleMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Pins
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}
