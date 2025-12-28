'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Badge,
} from '@/components/ui';
import {
  X,
  Check,
  Lightbulb,
  Loader2,
  Clock,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface Thumbnail {
  id: string;
  url: string;
  timestamp_seconds: number;
}

interface ThumbnailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (thumbnailId: string) => void;
  postId: string;
  thumbnails: Thumbnail[];
  currentThumbnailId?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_TIMESTAMPS = [2, 4, 6]; // Seconds into video

// ============================================================================
// Main Component
// ============================================================================

export function ThumbnailModal({
  isOpen,
  onClose,
  onSave,
  postId,
  thumbnails,
  currentThumbnailId,
}: ThumbnailModalProps) {
  const queryClient = useQueryClient();

  // Default to middle frame (4s) or first available
  const defaultThumbnail = thumbnails.find((t) => t.timestamp_seconds === 4) || thumbnails[1] || thumbnails[0];
  const [selectedId, setSelectedId] = useState<string>(currentThumbnailId || defaultThumbnail?.id || '');

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (thumbnailId: string) => {
      const res = await fetch(`/api/instagram/posts/${postId}/thumbnail`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thumbnail_id: thumbnailId }),
      });
      if (!res.ok) throw new Error('Failed to save thumbnail');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-posts'] });
      onSave(selectedId);
      onClose();
    },
  });

  const handleSave = () => {
    if (selectedId) {
      saveMutation.mutate(selectedId);
    }
  };

  if (!isOpen) return null;

  // If no thumbnails provided, show message
  if (!thumbnails || thumbnails.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="relative w-full max-w-lg rounded-xl bg-surface shadow-elevation-3 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Select Thumbnail</h2>
            <Button variant="ghost" size="icon-sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-10 w-10 mx-auto mb-3" />
            <p>No thumbnails available yet.</p>
            <p className="text-sm mt-1">Thumbnails will be generated when the video is processed.</p>
          </div>
          <div className="flex justify-end mt-4">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-2xl rounded-xl bg-surface shadow-elevation-3">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">Select Thumbnail</h2>
            <p className="text-sm text-muted-foreground">
              Choose the best frame for your video cover
            </p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Tip */}
          <div className="flex items-start gap-3 bg-sage/10 rounded-lg p-4 mb-6">
            <Lightbulb className="h-5 w-5 text-sage shrink-0 mt-0.5" />
            <p className="text-sm">
              <span className="font-medium">Tip:</span> Choose a frame where the quote text is fully
              visible and the visual is compelling. This is what viewers will see first.
            </p>
          </div>

          {/* Thumbnail Options */}
          <div className="grid grid-cols-3 gap-4">
            {thumbnails.map((thumbnail) => {
              const isSelected = selectedId === thumbnail.id;
              const isDefault = thumbnail.timestamp_seconds === 4;

              return (
                <button
                  key={thumbnail.id}
                  type="button"
                  onClick={() => setSelectedId(thumbnail.id)}
                  className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
                    isSelected
                      ? 'border-sage ring-2 ring-sage/30'
                      : 'border-transparent hover:border-sage/50'
                  }`}
                >
                  {/* Thumbnail Image */}
                  <div className="aspect-[9/16] relative bg-muted">
                    {thumbnail.url ? (
                      <img
                        src={thumbnail.url}
                        alt={`Frame at ${thumbnail.timestamp_seconds}s`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Clock className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}

                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-sage/20 flex items-center justify-center">
                        <div className="h-10 w-10 rounded-full bg-sage flex items-center justify-center">
                          <Check className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    )}

                    {/* Hover Overlay */}
                    {!isSelected && (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="h-10 w-10 rounded-full bg-white/80 flex items-center justify-center">
                            <Check className="h-5 w-5 text-gray-700" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Timestamp Label */}
                  <div className="p-2 bg-muted/50">
                    <div className="flex items-center justify-center gap-2">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm font-medium">{thumbnail.timestamp_seconds}s</span>
                      {isDefault && (
                        <Badge size="sm" variant="secondary">
                          Default
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Radio buttons for accessibility */}
          <div className="sr-only">
            {thumbnails.map((thumbnail) => (
              <label key={thumbnail.id}>
                <input
                  type="radio"
                  name="thumbnail"
                  value={thumbnail.id}
                  checked={selectedId === thumbnail.id}
                  onChange={() => setSelectedId(thumbnail.id)}
                />
                Frame at {thumbnail.timestamp_seconds} seconds
              </label>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-6 py-4">
          <p className="text-sm text-muted-foreground">
            {selectedId
              ? `Selected: ${thumbnails.find((t) => t.id === selectedId)?.timestamp_seconds}s frame`
              : 'No frame selected'}
          </p>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!selectedId || saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Save Selection
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
