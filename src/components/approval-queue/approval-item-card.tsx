'use client';

import { useState } from 'react';
import { Check, X, SkipForward, ImageOff, ZoomIn } from 'lucide-react';
import { Button, Card, Checkbox, Badge, Modal } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { ApprovalItem } from '@/types/approval';

interface ApprovalItemCardProps {
  item: ApprovalItem;
  isSelected: boolean;
  isFocused: boolean;
  onToggleSelect: () => void;
  onApprove: () => void;
  onReject: (reason?: string) => void;
  onSkip: () => void;
  isActioning: boolean;
}

export function ApprovalItemCard({
  item,
  isSelected,
  isFocused,
  onToggleSelect,
  onApprove,
  onReject,
  onSkip,
  isActioning,
}: ApprovalItemCardProps) {
  const thumbnailUrl = getThumbnailUrl(item);
  const [imageError, setImageError] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);

  return (
    <>
      <Card
        className={cn(
          'overflow-hidden transition-all',
          isFocused && 'ring-2 ring-sage ring-offset-2',
          isSelected && 'bg-sage/5'
        )}
      >
        {/* Large Preview Image */}
        <div
          className="relative aspect-[4/3] bg-elevated cursor-pointer group"
          onClick={() => thumbnailUrl && !imageError && setShowFullPreview(true)}
        >
          {thumbnailUrl && !imageError ? (
            <>
              <img
                src={thumbnailUrl}
                alt=""
                className="w-full h-full object-contain"
                onError={() => setImageError(true)}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageOff className="h-12 w-12 text-[var(--color-text-tertiary)]" />
            </div>
          )}

          {/* Badges overlay */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            <Badge variant="secondary">{item.type}</Badge>
            {item.collection && (
              <Badge variant={item.collection as 'grounding' | 'wholeness' | 'growth'}>{item.collection}</Badge>
            )}
          </div>

          {/* Checkbox overlay */}
          <div className="absolute top-3 right-3">
            <div className="bg-white rounded-md shadow-sm p-1">
              <Checkbox
                checked={isSelected}
                onChange={onToggleSelect}
                aria-label={`Select ${item.type} item`}
              />
            </div>
          </div>

          {/* Flags overlay */}
          {item.flags.length > 0 && (
            <div className="absolute bottom-3 left-3">
              <Badge variant="warning">{item.flags.length} flags</Badge>
            </div>
          )}
        </div>

        {/* Content & Actions */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-body font-medium truncate">
                {getItemDescription(item)}
              </p>
              {item.confidence_score !== null && (
                <p className="text-caption text-[var(--color-text-tertiary)] mt-0.5">
                  Confidence: {Math.round(item.confidence_score * 100)}%
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={onSkip}
                disabled={isActioning}
                leftIcon={<SkipForward className="h-4 w-4" />}
              >
                Skip
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onReject()}
                disabled={isActioning}
                leftIcon={<X className="h-4 w-4" />}
              >
                Reject
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={onApprove}
                disabled={isActioning}
                leftIcon={<Check className="h-4 w-4" />}
              >
                Approve
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Full Preview Modal */}
      {showFullPreview && thumbnailUrl && (
        <Modal
          isOpen={true}
          onClose={() => setShowFullPreview(false)}
          title="Preview"
          size="xl"
        >
          <div className="space-y-4">
            <img
              src={thumbnailUrl}
              alt=""
              className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{item.type}</Badge>
                {item.collection && (
                  <Badge variant={item.collection as 'grounding' | 'wholeness' | 'growth'}>{item.collection}</Badge>
                )}
                {item.confidence_score !== null && (
                  <span className="text-caption text-[var(--color-text-tertiary)]">
                    Confidence: {Math.round(item.confidence_score * 100)}%
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { onSkip(); setShowFullPreview(false); }}
                  disabled={isActioning}
                >
                  Skip
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => { onReject(); setShowFullPreview(false); }}
                  disabled={isActioning}
                >
                  Reject
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => { onApprove(); setShowFullPreview(false); }}
                  disabled={isActioning}
                >
                  Approve
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function getThumbnailUrl(item: ApprovalItem): string | null {
  const payload = item.payload;
  if ('thumbnailUrl' in payload) {
    return payload.thumbnailUrl;
  }
  if ('images' in payload && payload.images.length > 0) {
    return payload.images[0];
  }
  return null;
}

function getItemDescription(item: ApprovalItem): string {
  const payload = item.payload;
  switch (payload.type) {
    case 'asset':
      return payload.quoteText;
    case 'mockup':
      return `Scene: ${payload.scene}`;
    case 'pin':
      return payload.title;
    case 'ugc':
      return `From ${payload.customerName} - ${payload.productName}`;
    case 'product':
      return payload.title;
    default:
      return '';
  }
}
