'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, Image as ImageIcon, AlertCircle, ExternalLink, Palette } from 'lucide-react';
import Link from 'next/link';

// ============================================================================
// Types
// ============================================================================

interface Mockup {
  id: string;
  file_url: string;
  scene: string;
  status: string;
  created_at: string;
  assets?: {
    id: string;
    file_url: string;
    quotes?: {
      id: string;
      text: string;
      collection: string;
    };
  };
}

interface MockupSelectorProps {
  quoteId?: string;
  selectedMockupIds: string[];
  onSelect: (mockupIds: string[], mockups: Mockup[]) => void;
  maxMockups?: number;
  className?: string;
}

// ============================================================================
// Main Component
// ============================================================================

export function MockupSelector({
  quoteId,
  selectedMockupIds,
  onSelect,
  maxMockups = 1,
  className = '',
}: MockupSelectorProps) {
  const [localSelected, setLocalSelected] = useState<string[]>(selectedMockupIds);

  // Sync local state with parent prop
  useEffect(() => {
    setLocalSelected(selectedMockupIds);
  }, [selectedMockupIds]);

  // Fetch approved mockups filtered by quoteId on server
  const { data, isLoading, error } = useQuery<{ mockups: Mockup[] }>({
    queryKey: ['mockups', 'approved', quoteId],
    queryFn: async () => {
      const params = new URLSearchParams({
        status: 'approved',
        limit: '100',
      });
      if (quoteId) {
        params.set('quoteId', quoteId);
      }
      const res = await fetch(`/api/mockups?${params}`);
      if (!res.ok) {
        return { mockups: [] };
      }
      return res.json();
    },
    enabled: !!quoteId, // Only fetch when quoteId is available
  });

  const mockups = data?.mockups || [];

  // Handle mockup selection
  const handleSelect = (mockup: Mockup) => {
    let newSelected: string[];

    if (maxMockups === 1) {
      // Single selection mode
      newSelected = localSelected.includes(mockup.id) ? [] : [mockup.id];
    } else {
      // Multiple selection mode
      if (localSelected.includes(mockup.id)) {
        newSelected = localSelected.filter(id => id !== mockup.id);
      } else if (localSelected.length < maxMockups) {
        newSelected = [...localSelected, mockup.id];
      } else {
        // Max reached, replace the oldest selection
        newSelected = [...localSelected.slice(1), mockup.id];
      }
    }

    setLocalSelected(newSelected);

    // Get the full mockup objects for the selected IDs
    const selectedMockups = mockups.filter(m => newSelected.includes(m.id));
    onSelect(newSelected, selectedMockups);
  };

  // No quote selected
  if (!quoteId) {
    return (
      <div className={`rounded-lg border-2 border-dashed border-muted-foreground/30 p-6 text-center ${className}`}>
        <Palette className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          Select a quote to see its mockups
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
          <span className="text-sm text-muted-foreground">Loading mockups...</span>
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
          <span className="text-sm">Failed to load mockups</span>
        </div>
      </div>
    );
  }

  // No mockups available
  if (mockups.length === 0) {
    return (
      <div className={`rounded-lg border-2 border-dashed border-muted-foreground/30 p-6 text-center ${className}`}>
        <Palette className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground mb-3">
          No approved mockups found for this quote
        </p>
        <Link
          href={`/dashboard/quotes/${quoteId}/generate`}
          className="inline-flex items-center gap-1 text-sm text-sage hover:underline"
        >
          Generate mockups
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">
          {mockups.length} mockup{mockups.length !== 1 ? 's' : ''} available
        </span>
        {maxMockups > 1 && (
          <span className="text-xs text-muted-foreground">
            {localSelected.length}/{maxMockups} selected
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {mockups.map((mockup) => {
          const isSelected = localSelected.includes(mockup.id);

          return (
            <button
              key={mockup.id}
              type="button"
              onClick={() => handleSelect(mockup)}
              className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                isSelected
                  ? 'border-sage ring-2 ring-sage/20'
                  : 'border-transparent hover:border-sage/50'
              }`}
            >
              {/* Thumbnail */}
              <img
                src={mockup.file_url}
                alt={`Mockup - ${mockup.scene}`}
                className="w-full h-full object-cover"
              />

              {/* Scene indicator */}
              <div className="absolute bottom-1 left-1 bg-black/60 rounded px-1.5 py-0.5">
                <span className="text-[10px] text-white truncate">{mockup.scene}</span>
              </div>

              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute inset-0 bg-sage/20 flex items-center justify-center">
                  <div className="bg-sage rounded-full p-1">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                </div>
              )}

              {/* Selection number for multiple select */}
              {maxMockups > 1 && isSelected && (
                <div className="absolute top-1 right-1 bg-sage text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {localSelected.indexOf(mockup.id) + 1}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
