'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  MoreHorizontal,
  Trash2,
  Edit,
  Sparkles,
  Archive,
  Image as ImageIcon,
} from 'lucide-react';
import { useQuotes, useDeleteQuote, useUpdateQuote } from '@/hooks/use-quotes';
import {
  Button,
  Input,
  Card,
  Badge,
  Select,
  ConfirmModal,
} from '@/components/ui';
import { PageContainer } from '@/components/layout/page-container';
import { formatNumber, capitalize } from '@/lib/utils';
import { COLLECTIONS, MOODS, type Collection, type Mood } from '@/lib/constants';
import type { Quote } from '@/types/quotes';

export function QuotesList() {
  const [filters, setFilters] = useState<{
    collection?: Collection;
    mood?: Mood;
    search?: string;
  }>({});
  const [page, setPage] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<Quote | null>(null);

  const { data, isLoading } = useQuotes({
    ...filters,
    limit: 20,
    offset: page * 20,
  });

  const deleteMutation = useDeleteQuote();
  const updateMutation = useUpdateQuote();

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await deleteMutation.mutateAsync(deleteConfirm.id);
    setDeleteConfirm(null);
  };

  const handleArchive = async (quote: Quote) => {
    await updateMutation.mutateAsync({ id: quote.id, status: 'archived' });
  };

  const collectionOptions = [
    { value: '', label: 'All Collections' },
    ...COLLECTIONS.map((c) => ({ value: c, label: capitalize(c) })),
  ];

  const moodOptions = [
    { value: '', label: 'All Moods' },
    ...MOODS.map((m) => ({ value: m, label: capitalize(m) })),
  ];

  return (
    <PageContainer
      title="Quotes"
      description="Manage your quote library"
      actions={
        <div className="flex gap-2">
          <Link href="/dashboard/quotes/import">
            <Button variant="secondary">Import CSV</Button>
          </Link>
          <Link href="/dashboard/quotes/new">
            <Button leftIcon={<Plus className="h-4 w-4" />}>Add Quote</Button>
          </Link>
        </div>
      }
    >
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex-1 min-w-64">
          <Input
            placeholder="Search quotes..."
            value={filters.search || ''}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
        <Select
          options={collectionOptions}
          value={filters.collection || ''}
          onChange={(v) => setFilters((prev) => ({ ...prev, collection: (v as Collection) || undefined }))}
          placeholder="Collection"
          className="w-40"
        />
        <Select
          options={moodOptions}
          value={filters.mood || ''}
          onChange={(v) => setFilters((prev) => ({ ...prev, mood: (v as Mood) || undefined }))}
          placeholder="Mood"
          className="w-36"
        />
      </div>

      {/* Quotes Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-20 bg-elevated rounded" />
              <div className="mt-4 h-4 w-24 bg-elevated rounded" />
            </Card>
          ))}
        </div>
      ) : data?.quotes.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-sage-pale flex items-center justify-center mb-4">
            <Sparkles className="h-6 w-6 text-sage" />
          </div>
          <h3 className="text-h3 mb-2">No quotes yet</h3>
          <p className="text-body text-[var(--color-text-secondary)] mb-4">
            Add your first quote to start generating beautiful assets.
          </p>
          <Link href="/dashboard/quotes/new">
            <Button leftIcon={<Plus className="h-4 w-4" />}>Add Quote</Button>
          </Link>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data?.quotes.map((quote) => (
              <QuoteCard
                key={quote.id}
                quote={quote}
                onDelete={() => setDeleteConfirm(quote)}
                onArchive={() => handleArchive(quote)}
              />
            ))}
          </div>

          {/* Pagination */}
          {data && data.total > 20 && (
            <div className="mt-6 flex justify-center gap-2">
              <Button
                variant="ghost"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Previous
              </Button>
              <span className="py-2 px-4 text-body-sm">
                Page {page + 1} of {Math.ceil(data.total / 20)}
              </span>
              <Button
                variant="ghost"
                onClick={() => setPage((p) => p + 1)}
                disabled={(page + 1) * 20 >= data.total}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Quote?"
        message="This will also delete all generated assets for this quote. This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </PageContainer>
  );
}

function QuoteCard({
  quote,
  onDelete,
  onArchive,
}: {
  quote: Quote;
  onDelete: () => void;
  onArchive: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <Card className="group relative">
      <div className="p-6">
        {/* Quote text */}
        <p className="text-body font-serif italic line-clamp-3">
          &ldquo;{quote.text}&rdquo;
        </p>
        {quote.attribution && (
          <p className="mt-2 text-body-sm text-[var(--color-text-secondary)]">
            — {quote.attribution}
          </p>
        )}

        {/* Badges */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant={quote.collection} size="sm">
            {capitalize(quote.collection)}
          </Badge>
          <Badge variant="secondary" size="sm">{capitalize(quote.mood)}</Badge>
        </div>

        {/* Stats */}
        <div className="mt-4 flex items-center gap-4 text-caption text-[var(--color-text-tertiary)]">
          <span className="flex items-center gap-1">
            <ImageIcon className="h-3 w-3" />
            {quote.assets_generated} assets
          </span>
          {quote.total_impressions > 0 && (
            <span>{formatNumber(quote.total_impressions)} impressions</span>
          )}
        </div>

        {/* Actions menu */}
        <div className="absolute top-4 right-4">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowMenu(!showMenu)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 z-20 w-40 rounded-md border bg-surface shadow-elevation-2 py-1">
                  <Link href={`/dashboard/quotes/${quote.id}/generate`}>
                    <button className="w-full px-3 py-2 text-left text-body-sm hover:bg-elevated flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Generate Assets
                    </button>
                  </Link>
                  <Link href={`/dashboard/quotes/${quote.id}/edit`}>
                    <button className="w-full px-3 py-2 text-left text-body-sm hover:bg-elevated flex items-center gap-2">
                      <Edit className="h-4 w-4" />
                      Edit
                    </button>
                  </Link>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onArchive();
                    }}
                    className="w-full px-3 py-2 text-left text-body-sm hover:bg-elevated flex items-center gap-2"
                  >
                    <Archive className="h-4 w-4" />
                    Archive
                  </button>
                  <hr className="my-1" />
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDelete();
                    }}
                    className="w-full px-3 py-2 text-left text-body-sm hover:bg-elevated flex items-center gap-2 text-error"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
