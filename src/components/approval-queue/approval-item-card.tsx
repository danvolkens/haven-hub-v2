'use client';

import { Check, X, SkipForward } from 'lucide-react';
import { Button, Card, Checkbox, Badge } from '@/components/ui';
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

  return (
    <Card
      className={cn(
        'p-4 transition-all',
        isFocused && 'ring-2 ring-sage ring-offset-2',
        isSelected && 'bg-sage/5'
      )}
    >
      <div className="flex items-start gap-4">
        <Checkbox
          checked={isSelected}
          onChange={onToggleSelect}
          aria-label={`Select ${item.type} item`}
        />

        {thumbnailUrl && (
          <div className="shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-elevated">
            <img
              src={thumbnailUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{item.type}</Badge>
            {item.collection && (
              <Badge variant="outline">{item.collection}</Badge>
            )}
            {item.flags.length > 0 && (
              <Badge variant="warning">{item.flags.length} flags</Badge>
            )}
          </div>

          <div className="mt-2 text-body-sm text-[var(--color-text-secondary)]">
            {getItemDescription(item)}
          </div>

          {item.confidence_score !== null && (
            <div className="mt-1 text-caption text-[var(--color-text-tertiary)]">
              Confidence: {Math.round(item.confidence_score * 100)}%
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
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
    </Card>
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
