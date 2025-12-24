'use client';

import { useState, useEffect } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import {
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { useApprovalQueue } from '@/hooks/use-approval-queue';
import { useApprovalRealtime } from '@/hooks/use-approval-realtime';
import { useAuthContext } from '@/contexts/auth-context';
import { Button, Badge, Card, Select, Checkbox } from '@/components/ui';
import { ApprovalItemCard } from './approval-item-card';
import { ApprovalEmptyState } from './approval-empty-state';
import type { ApprovalFilters } from '@/types/approval';

const PAGE_SIZE = 20;

const typeOptions = [
  { value: '', label: 'All Types' },
  { value: 'asset', label: 'Assets' },
  { value: 'mockup', label: 'Mockups' },
  { value: 'pin', label: 'Pins' },
  { value: 'ugc', label: 'UGC' },
  { value: 'product', label: 'Products' },
];

const collectionOptions = [
  { value: '', label: 'All Collections' },
  { value: 'grounding', label: 'Grounding' },
  { value: 'wholeness', label: 'Wholeness' },
  { value: 'growth', label: 'Growth' },
];

export function ApprovalQueueList() {
  const { user } = useAuthContext();
  const [filters, setFilters] = useState<ApprovalFilters>({});
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState(0);

  // Enable real-time updates
  useApprovalRealtime(user?.id);

  const {
    items,
    total,
    counts,
    isLoading,
    approve,
    reject,
    skip,
    bulkApprove,
    bulkReject,
    isActioning,
    isBulkActioning,
  } = useApprovalQueue(filters, PAGE_SIZE, page * PAGE_SIZE);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const allSelected = items.length > 0 && selectedIds.size === items.length;
  const someSelected = selectedIds.size > 0;
  const focusedItem = items[focusedIndex];

  // Reset selection when filters/page change
  useEffect(() => {
    setSelectedIds(new Set());
    setFocusedIndex(0);
  }, [filters, page]);

  // Keyboard navigation
  useHotkeys('j, down', () => {
    setFocusedIndex((prev) => Math.min(prev + 1, items.length - 1));
  }, { enableOnFormTags: false });

  useHotkeys('k, up', () => {
    setFocusedIndex((prev) => Math.max(prev - 1, 0));
  }, { enableOnFormTags: false });

  useHotkeys('a', () => {
    if (focusedItem && !isActioning) {
      approve(focusedItem.id);
    }
  }, { enableOnFormTags: false });

  useHotkeys('r', () => {
    if (focusedItem && !isActioning) {
      reject(focusedItem.id);
    }
  }, { enableOnFormTags: false });

  useHotkeys('s', () => {
    if (focusedItem && !isActioning) {
      skip(focusedItem.id);
    }
  }, { enableOnFormTags: false });

  useHotkeys('space', (e) => {
    e.preventDefault();
    if (focusedItem) {
      toggleSelection(focusedItem.id);
    }
  }, { enableOnFormTags: false });

  useHotkeys('mod+a', (e) => {
    e.preventDefault();
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((item) => item.id)));
    }
  }, { enableOnFormTags: false });

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((item) => item.id)));
    }
  };

  const handleBulkApprove = async () => {
    await bulkApprove(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleBulkReject = async () => {
    await bulkReject(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-sage" />
      </div>
    );
  }

  if (items.length === 0 && !Object.values(filters).some(Boolean)) {
    return <ApprovalEmptyState />;
  }

  return (
    <div className="space-y-4">
      {/* Header with counts and filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-h2">{counts.total} pending</h2>
          <div className="flex gap-1">
            {counts.asset > 0 && <Badge variant="secondary">{counts.asset} assets</Badge>}
            {counts.mockup > 0 && <Badge variant="secondary">{counts.mockup} mockups</Badge>}
            {counts.pin > 0 && <Badge variant="secondary">{counts.pin} pins</Badge>}
            {counts.ugc > 0 && <Badge variant="secondary">{counts.ugc} UGC</Badge>}
            {counts.product > 0 && <Badge variant="secondary">{counts.product} products</Badge>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select
            options={typeOptions}
            value={filters.type || ''}
            onChange={(v) => setFilters((prev) => ({ ...prev, type: v as ApprovalFilters['type'] || undefined }))}
            placeholder="Type"
            className="w-32"
          />
          <Select
            options={collectionOptions}
            value={filters.collection || ''}
            onChange={(v) => setFilters((prev) => ({ ...prev, collection: v as ApprovalFilters['collection'] || undefined }))}
            placeholder="Collection"
            className="w-36"
          />
          <Button
            variant={filters.flagged ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setFilters((prev) => ({ ...prev, flagged: !prev.flagged }))}
            leftIcon={<AlertTriangle className="h-4 w-4" />}
          >
            Flagged
          </Button>
        </div>
      </div>

      {/* Bulk actions bar */}
      {someSelected && (
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected && !allSelected}
                onChange={toggleSelectAll}
              />
              <span className="text-body-sm">
                {selectedIds.size} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleBulkApprove}
                isLoading={isBulkActioning}
                leftIcon={<Check className="h-4 w-4" />}
              >
                Approve All
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkReject}
                isLoading={isBulkActioning}
                leftIcon={<X className="h-4 w-4" />}
              >
                Reject All
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Items list */}
      <div className="space-y-3">
        {items.map((item, index) => (
          <ApprovalItemCard
            key={item.id}
            item={item}
            isSelected={selectedIds.has(item.id)}
            isFocused={index === focusedIndex}
            onToggleSelect={() => toggleSelection(item.id)}
            onApprove={() => approve(item.id)}
            onReject={(reason) => reject(item.id, reason)}
            onSkip={() => skip(item.id)}
            isActioning={isActioning}
          />
        ))}
      </div>

      {/* Empty state with filters */}
      {items.length === 0 && Object.values(filters).some(Boolean) && (
        <Card className="p-8 text-center">
          <p className="text-body text-[var(--color-text-secondary)]">
            No items match your filters
          </p>
          <Button
            variant="ghost"
            className="mt-2"
            onClick={() => setFilters({})}
          >
            Clear filters
          </Button>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-body-sm text-[var(--color-text-secondary)]">
            Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 0}
              leftIcon={<ChevronLeft className="h-4 w-4" />}
            >
              Previous
            </Button>
            <span className="text-body-sm">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages - 1}
              rightIcon={<ChevronRight className="h-4 w-4" />}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Keyboard shortcuts hint */}
      <div className="text-center text-caption text-[var(--color-text-tertiary)]">
        Keyboard: <kbd className="px-1.5 py-0.5 rounded border bg-elevated mx-1">J/K</kbd> navigate
        <kbd className="px-1.5 py-0.5 rounded border bg-elevated mx-1">A</kbd> approve
        <kbd className="px-1.5 py-0.5 rounded border bg-elevated mx-1">R</kbd> reject
        <kbd className="px-1.5 py-0.5 rounded border bg-elevated mx-1">S</kbd> skip
        <kbd className="px-1.5 py-0.5 rounded border bg-elevated mx-1">Space</kbd> select
      </div>
    </div>
  );
}
