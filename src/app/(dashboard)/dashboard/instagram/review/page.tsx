'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/page-container';
import {
  Card,
  Button,
  buttonVariants,
  Badge,
  Select,
  Checkbox,
} from '@/components/ui';
import {
  Check,
  X,
  Eye,
  Edit2,
  Calendar,
  Clock,
  Image as ImageIcon,
  Video,
  Filter,
  CheckCircle,
  XCircle,
  Loader2,
  Inbox,
  ChevronDown,
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { useToast } from '@/components/providers/toast-provider';

// ============================================================================
// Types
// ============================================================================

interface ReviewItem {
  id: string;
  quote_id?: string;
  post_type: 'feed' | 'reel' | 'story' | 'carousel';
  content_pillar: string;
  status: 'draft' | 'scheduled' | 'rejected';
  scheduled_at?: string;
  caption?: string;
  hashtags?: string[];
  asset_url?: string;
  thumbnail_url?: string;
  requires_review: boolean;
  created_at: string;
  quotes?: {
    text: string;
    author: string;
    collection: string;
  };
  instagram_templates?: {
    name: string;
  };
}

// ============================================================================
// Fetcher
// ============================================================================

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}

// ============================================================================
// Main Component
// ============================================================================

export default function InstagramReviewPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    postType: 'all',
    collection: 'all',
  });
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectItemId, setRejectItemId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Fetch draft posts requiring review
  const { data: reviewItems = [], isLoading } = useQuery({
    queryKey: ['instagram-review-queue'],
    queryFn: () => fetcher<ReviewItem[]>('/api/instagram/posts?status=draft&requires_review=true'),
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch('/api/instagram/posts/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error('Failed to approve');
      return res.json();
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['instagram-review-queue'] });
      setSelectedIds(new Set());
      toast(`Approved ${ids.length} post${ids.length > 1 ? 's' : ''}`, 'success');
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ ids, reason }: { ids: string[]; reason?: string }) => {
      const res = await fetch('/api/instagram/posts/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, reason }),
      });
      if (!res.ok) throw new Error('Failed to reject');
      return res.json();
    },
    onSuccess: (_, { ids }) => {
      queryClient.invalidateQueries({ queryKey: ['instagram-review-queue'] });
      setSelectedIds(new Set());
      setShowRejectModal(false);
      setRejectItemId(null);
      setRejectReason('');
      toast(`Rejected ${ids.length} post${ids.length > 1 ? 's' : ''}`, 'success');
    },
  });

  // Filter items
  const filteredItems = useMemo(() => {
    return reviewItems.filter((item) => {
      if (filters.postType !== 'all' && item.post_type !== filters.postType) {
        return false;
      }
      if (
        filters.collection !== 'all' &&
        item.quotes?.collection !== filters.collection
      ) {
        return false;
      }
      return true;
    });
  }, [reviewItems, filters]);

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((item) => item.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Action handlers
  const handleApprove = (id: string) => {
    approveMutation.mutate([id]);
  };

  const handleBulkApprove = () => {
    if (selectedIds.size > 0) {
      approveMutation.mutate(Array.from(selectedIds));
    }
  };

  const handleReject = (id: string) => {
    setRejectItemId(id);
    setShowRejectModal(true);
  };

  const handleBulkReject = () => {
    if (selectedIds.size > 0) {
      setRejectItemId(null);
      setShowRejectModal(true);
    }
  };

  const confirmReject = () => {
    const ids = rejectItemId ? [rejectItemId] : Array.from(selectedIds);
    rejectMutation.mutate({ ids, reason: rejectReason || undefined });
  };

  return (
    <PageContainer title="Review Queue">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Review Queue</h1>
            <p className="text-muted-foreground">
              {reviewItems.length} post{reviewItems.length !== 1 ? 's' : ''} awaiting review
            </p>
          </div>
          <Badge variant="warning" className="text-base px-4 py-2">
            <Clock className="mr-2 h-4 w-4" />
            Supervised Mode
          </Badge>
        </div>

        {/* Filters and Bulk Actions */}
        <Card className="p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Filters */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={filters.postType}
                  onChange={(value) =>
                    setFilters((f) => ({ ...f, postType: value as string }))
                  }
                  className="w-[140px]"
                  options={[
                    { value: 'all', label: 'All Types' },
                    { value: 'feed', label: 'Feed' },
                    { value: 'reel', label: 'Reel' },
                    { value: 'story', label: 'Story' },
                    { value: 'carousel', label: 'Carousel' },
                  ]}
                />
              </div>

              <Select
                value={filters.collection}
                onChange={(value) =>
                  setFilters((f) => ({ ...f, collection: value as string }))
                }
                className="w-[160px]"
                options={[
                  { value: 'all', label: 'All Collections' },
                  { value: 'grounding', label: 'Grounding' },
                  { value: 'wholeness', label: 'Wholeness' },
                  { value: 'growth', label: 'Growth' },
                ]}
              />
            </div>

            {/* Bulk Actions */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size} selected
                </span>
                <Button
                  size="sm"
                  onClick={handleBulkApprove}
                  disabled={approveMutation.isPending}
                >
                  {approveMutation.isPending ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-1 h-4 w-4" />
                  )}
                  Approve All
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkReject}
                  disabled={rejectMutation.isPending}
                >
                  <XCircle className="mr-1 h-4 w-4" />
                  Reject All
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Select All */}
        {filteredItems.length > 0 && (
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedIds.size === filteredItems.length && filteredItems.length > 0}
              onChange={toggleSelectAll}
            />
            <span className="text-sm text-muted-foreground">
              Select all ({filteredItems.length})
            </span>
          </div>
        )}

        {/* Queue Items */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredItems.length === 0 ? (
          <Card className="p-12 text-center">
            <Inbox className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold mb-2">No Posts to Review</h2>
            <p className="text-muted-foreground mb-4">
              {reviewItems.length > 0
                ? 'Try adjusting your filters'
                : 'All scheduled posts have been reviewed'}
            </p>
            <Link
              href="/dashboard/instagram/calendar"
              className={buttonVariants({ variant: 'secondary' })}
            >
              <Calendar className="mr-2 h-4 w-4" />
              View Calendar
            </Link>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => (
              <ReviewCard
                key={item.id}
                item={item}
                isSelected={selectedIds.has(item.id)}
                onToggleSelect={() => toggleSelect(item.id)}
                onApprove={() => handleApprove(item.id)}
                onReject={() => handleReject(item.id)}
                isApproving={approveMutation.isPending}
              />
            ))}
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && (
          <RejectModal
            itemCount={rejectItemId ? 1 : selectedIds.size}
            reason={rejectReason}
            onReasonChange={setRejectReason}
            onClose={() => {
              setShowRejectModal(false);
              setRejectItemId(null);
              setRejectReason('');
            }}
            onConfirm={confirmReject}
            isRejecting={rejectMutation.isPending}
          />
        )}
      </div>
    </PageContainer>
  );
}

// ============================================================================
// Review Card Component
// ============================================================================

function ReviewCard({
  item,
  isSelected,
  onToggleSelect,
  onApprove,
  onReject,
  isApproving,
}: {
  item: ReviewItem;
  isSelected: boolean;
  onToggleSelect: () => void;
  onApprove: () => void;
  onReject: () => void;
  isApproving: boolean;
}) {
  const postTypeIcon = item.post_type === 'reel' || item.post_type === 'story' ? Video : ImageIcon;
  const PostTypeIcon = postTypeIcon;

  const collectionColors: Record<string, string> = {
    grounding: 'bg-grounding/10 text-grounding',
    wholeness: 'bg-wholeness/10 text-wholeness',
    growth: 'bg-growth/10 text-growth',
  };

  return (
    <Card className={`overflow-hidden ${isSelected ? 'ring-2 ring-primary' : ''}`}>
      {/* Thumbnail */}
      <div className="relative aspect-square bg-muted">
        {item.thumbnail_url || item.asset_url ? (
          <img
            src={item.thumbnail_url || item.asset_url}
            alt="Post preview"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <PostTypeIcon className="h-12 w-12 text-muted-foreground" />
          </div>
        )}

        {/* Selection checkbox */}
        <div className="absolute top-2 left-2">
          <div
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect();
            }}
            className="cursor-pointer"
          >
            <Checkbox checked={isSelected} />
          </div>
        </div>

        {/* Post type badge */}
        <Badge className="absolute top-2 right-2" variant="secondary">
          <PostTypeIcon className="mr-1 h-3 w-3" />
          {item.post_type}
        </Badge>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Quote text */}
        {item.quotes && (
          <p className="text-sm font-medium line-clamp-2">
            &ldquo;{item.quotes.text}&rdquo;
          </p>
        )}

        {/* Collection and template */}
        <div className="flex items-center gap-2 flex-wrap">
          {item.quotes?.collection && (
            <Badge
              variant="secondary"
              size="sm"
              className={collectionColors[item.quotes.collection] || ''}
            >
              {item.quotes.collection}
            </Badge>
          )}
          {item.instagram_templates?.name && (
            <Badge variant="secondary" size="sm">
              {item.instagram_templates.name}
            </Badge>
          )}
        </div>

        {/* Scheduled time */}
        {item.scheduled_at && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>
              {format(new Date(item.scheduled_at), 'EEE, MMM d')} at{' '}
              {format(new Date(item.scheduled_at), 'h:mm a')}
            </span>
          </div>
        )}

        {/* Caption preview */}
        {item.caption && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {item.caption}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <Link
            href={`/dashboard/instagram/posts/${item.id}/preview`}
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          >
            <Eye className="mr-1 h-3 w-3" />
            Preview
          </Link>
          <Link
            href={`/dashboard/instagram/posts/${item.id}/edit`}
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          >
            <Edit2 className="mr-1 h-3 w-3" />
            Edit
          </Link>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={onReject}
          >
            <X className="h-4 w-4 text-red-500" />
          </Button>
          <Button
            size="sm"
            onClick={onApprove}
            disabled={isApproving}
          >
            {isApproving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// Reject Modal Component
// ============================================================================

function RejectModal({
  itemCount,
  reason,
  onReasonChange,
  onClose,
  onConfirm,
  isRejecting,
}: {
  itemCount: number;
  reason: string;
  onReasonChange: (reason: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  isRejecting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">
          Reject {itemCount} Post{itemCount > 1 ? 's' : ''}?
        </h2>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2" htmlFor="reject-reason">
            Reason (optional)
          </label>
          <textarea
            id="reject-reason"
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="Enter reason for rejection..."
            className="w-full h-24 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isRejecting}
          >
            {isRejecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Rejecting...
              </>
            ) : (
              <>
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
