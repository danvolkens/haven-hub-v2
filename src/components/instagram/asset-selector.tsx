'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, Image, Video, AlertCircle, ExternalLink } from 'lucide-react';
import Link from 'next/link';

// ============================================================================
// Types
// ============================================================================

interface Asset {
  id: string;
  url: string;
  thumbnail_url?: string;
  type: 'image' | 'video';
  format?: string;
  status: string;
  created_at: string;
}

interface AssetSelectorProps {
  quoteId?: string;
  postType: 'feed' | 'reel' | 'story' | 'carousel';
  selectedAssetIds: string[];
  onSelect: (assetIds: string[], assets: Asset[]) => void;
  maxAssets?: number; // For carousel, allow multiple
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getFormatFilter(postType: string): string | null {
  switch (postType) {
    case 'feed':
      return 'instagram_post';
    case 'reel':
      return 'instagram_reel';
    case 'story':
      return 'instagram_story';
    case 'carousel':
      return 'instagram_post';
    default:
      return null;
  }
}

// ============================================================================
// Main Component
// ============================================================================

export function AssetSelector({
  quoteId,
  postType,
  selectedAssetIds,
  onSelect,
  maxAssets = 1,
  className = '',
}: AssetSelectorProps) {
  const [localSelected, setLocalSelected] = useState<string[]>(selectedAssetIds);

  // Fetch assets for the quote
  const { data: assets = [], isLoading, error } = useQuery<Asset[]>({
    queryKey: ['quote-assets', quoteId, postType],
    queryFn: async () => {
      if (!quoteId) return [];

      const format = getFormatFilter(postType);
      let url = `/api/assets?quote_id=${quoteId}&status=approved`;
      if (format) {
        url += `&format=${format}`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        // Return empty array if endpoint doesn't exist or errors
        return [];
      }
      const data = await res.json();
      return data.assets || data || [];
    },
    enabled: !!quoteId,
  });

  // Handle asset selection
  const handleSelect = (asset: Asset) => {
    let newSelected: string[];

    if (maxAssets === 1) {
      // Single selection mode
      newSelected = localSelected.includes(asset.id) ? [] : [asset.id];
    } else {
      // Multiple selection mode (carousel)
      if (localSelected.includes(asset.id)) {
        newSelected = localSelected.filter(id => id !== asset.id);
      } else if (localSelected.length < maxAssets) {
        newSelected = [...localSelected, asset.id];
      } else {
        // Max reached, replace the oldest selection
        newSelected = [...localSelected.slice(1), asset.id];
      }
    }

    setLocalSelected(newSelected);

    // Get the full asset objects for the selected IDs
    const selectedAssets = assets.filter(a => newSelected.includes(a.id));
    onSelect(newSelected, selectedAssets);
  };

  // No quote selected
  if (!quoteId) {
    return (
      <div className={`rounded-lg border-2 border-dashed border-muted-foreground/30 p-6 text-center ${className}`}>
        <Image className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          Select a quote to see its assets
        </p>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={`rounded-lg border p-6 ${className}`}>
        <div className="flex items-center justify-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-sage border-t-transparent" />
          <span className="text-sm text-muted-foreground">Loading assets...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`rounded-lg border border-error/50 bg-error/10 p-4 ${className}`}>
        <div className="flex items-center gap-2 text-error">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">Failed to load assets</span>
        </div>
      </div>
    );
  }

  // No assets available
  if (assets.length === 0) {
    return (
      <div className={`rounded-lg border-2 border-dashed border-muted-foreground/30 p-6 text-center ${className}`}>
        <Image className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground mb-3">
          No approved assets found for this quote
        </p>
        <Link
          href={`/dashboard/assets?quote_id=${quoteId}`}
          className="inline-flex items-center gap-1 text-sm text-sage hover:underline"
        >
          Generate assets
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">
          {assets.length} asset{assets.length !== 1 ? 's' : ''} available
        </span>
        {maxAssets > 1 && (
          <span className="text-xs text-muted-foreground">
            {localSelected.length}/{maxAssets} selected
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {assets.map((asset) => {
          const isSelected = localSelected.includes(asset.id);
          const isVideo = asset.type === 'video' || asset.format?.includes('video') || asset.format?.includes('reel');

          return (
            <button
              key={asset.id}
              type="button"
              onClick={() => handleSelect(asset)}
              className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                isSelected
                  ? 'border-sage ring-2 ring-sage/20'
                  : 'border-transparent hover:border-sage/50'
              }`}
            >
              {/* Thumbnail */}
              <img
                src={asset.thumbnail_url || asset.url}
                alt="Asset thumbnail"
                className="w-full h-full object-cover"
              />

              {/* Video indicator */}
              {isVideo && (
                <div className="absolute top-1 left-1 bg-black/60 rounded px-1.5 py-0.5">
                  <Video className="h-3 w-3 text-white" />
                </div>
              )}

              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute inset-0 bg-sage/20 flex items-center justify-center">
                  <div className="bg-sage rounded-full p-1">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                </div>
              )}

              {/* Selection number for carousel */}
              {maxAssets > 1 && isSelected && (
                <div className="absolute top-1 right-1 bg-sage text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {localSelected.indexOf(asset.id) + 1}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
