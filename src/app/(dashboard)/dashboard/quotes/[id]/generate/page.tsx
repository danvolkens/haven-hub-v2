'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Sparkles,
  Check,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  Checkbox,
  Badge,
} from '@/components/ui';
import { PageContainer } from '@/components/layout/page-container';
import { api } from '@/lib/fetcher';
import { cn } from '@/lib/utils';
import { SOCIAL_FORMATS, PRINT_FORMATS } from '@/lib/design-engine/format-specs';
import type { Quote } from '@/types/quotes';
import { useToast } from '@/components/providers/toast-provider';
import Link from 'next/link';

interface MockupTemplate {
  id: string;
  scene_key: string;
  name: string;
  description: string | null;
  preview_url: string | null;
  dm_template_id: string | null;
  recommended_collections: string[] | null;
}

type CollectionFilter = 'all' | 'grounding' | 'wholeness' | 'growth';

export default function GenerateAssetsPage() {
  const router = useRouter();
  const params = useParams();
  const quoteId = params.id as string;
  const { toast } = useToast();

  const [selectedFormats, setSelectedFormats] = useState<string[]>([
    'pinterest',
    'instagram_post',
    'print_8x10',
    'print_11x14',
  ]);
  const [generateMockups, setGenerateMockups] = useState(false);
  const [selectedScenes, setSelectedScenes] = useState<string[]>([]);
  const [collectionFilter, setCollectionFilter] = useState<CollectionFilter>('all');

  const { data: quote, isLoading: quoteLoading } = useQuery({
    queryKey: ['quote', quoteId],
    queryFn: () => api.get<Quote>(`/quotes/${quoteId}`),
  });

  // Fetch synced mockup templates
  const { data: templatesData } = useQuery({
    queryKey: ['mockup-templates'],
    queryFn: () => api.get<{ templates: MockupTemplate[] }>('/mockups/templates/sync'),
  });
  const mockupTemplates = templatesData?.templates || [];

  // Filter templates by collection
  const filteredTemplates = collectionFilter === 'all'
    ? mockupTemplates
    : mockupTemplates.filter((t) =>
        t.recommended_collections?.includes(collectionFilter) ||
        !t.recommended_collections?.length // Show templates with no collection assigned
      );

  const generateMutation = useMutation({
    mutationFn: () =>
      api.post(`/quotes/${quoteId}/generate`, {
        outputFormats: selectedFormats,
        generateMockups,
        mockupScenes: generateMockups ? selectedScenes : [],
      }),
    onSuccess: () => {
      toast('Asset generation started! Check the approval queue for results.', 'success');
      router.push('/dashboard/approvals');
    },
    onError: (error) => {
      toast(error instanceof Error ? error.message : 'Failed to start generation', 'error');
    },
  });

  const toggleFormat = (formatId: string) => {
    setSelectedFormats((prev) =>
      prev.includes(formatId)
        ? prev.filter((f) => f !== formatId)
        : [...prev, formatId]
    );
  };

  const toggleScene = (sceneId: string) => {
    setSelectedScenes((prev) =>
      prev.includes(sceneId)
        ? prev.filter((s) => s !== sceneId)
        : [...prev, sceneId]
    );
  };

  const selectAllSocial = () => {
    const socialIds = SOCIAL_FORMATS.map((f) => f.id);
    setSelectedFormats((prev) => [...new Set([...prev, ...socialIds])]);
  };

  const selectAllPrint = () => {
    const printIds = PRINT_FORMATS.map((f) => f.id);
    setSelectedFormats((prev) => [...new Set([...prev, ...printIds])]);
  };

  if (quoteLoading) {
    return (
      <PageContainer title="Generate Assets">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-sage" />
        </div>
      </PageContainer>
    );
  }

  if (!quote) {
    return (
      <PageContainer title="Quote Not Found">
        <Card className="p-8 text-center">
          <p className="text-body text-[var(--color-text-secondary)]">
            The quote you&apos;re looking for doesn&apos;t exist.
          </p>
          <Link href="/dashboard/quotes">
            <Button variant="secondary" className="mt-4">
              Back to Quotes
            </Button>
          </Link>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Generate Assets"
      description="Select output formats and options"
    >
      <div className="max-w-3xl space-y-6">
        {/* Back link */}
        <Link
          href={`/dashboard/quotes`}
          className="inline-flex items-center text-body-sm text-[var(--color-text-secondary)] hover:text-charcoal"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Quotes
        </Link>

        {/* Quote Preview */}
        <Card>
          <CardContent className="p-6">
            <p className="text-h3 font-serif italic">&quot;{quote.text}&quot;</p>
            {quote.attribution && (
              <p className="mt-2 text-body-sm text-[var(--color-text-secondary)]">
                — {quote.attribution}
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <Badge variant={quote.collection as 'grounding' | 'wholeness' | 'growth'}>
                {quote.collection}
              </Badge>
              <Badge variant="secondary">{quote.mood}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Social Formats */}
        <Card>
          <CardHeader
            title="Social Media Formats"
            description="Optimized for sharing on social platforms"
            action={
              <Button variant="ghost" size="sm" onClick={selectAllSocial}>
                Select All
              </Button>
            }
          />
          <CardContent className="p-6 pt-0">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {SOCIAL_FORMATS.map((format) => (
                <FormatCard
                  key={format.id}
                  format={format}
                  selected={selectedFormats.includes(format.id)}
                  onToggle={() => toggleFormat(format.id)}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Print Formats */}
        <Card>
          <CardHeader
            title="Print Sizes"
            description="High-resolution files for physical prints"
            action={
              <Button variant="ghost" size="sm" onClick={selectAllPrint}>
                Select All
              </Button>
            }
          />
          <CardContent className="p-6 pt-0">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {PRINT_FORMATS.map((format) => (
                <FormatCard
                  key={format.id}
                  format={format}
                  selected={selectedFormats.includes(format.id)}
                  onToggle={() => toggleFormat(format.id)}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Mockups */}
        <Card>
          <CardHeader
            title="Generate Mockups"
            description="Create lifestyle mockups using Dynamic Mockups"
          />
          <CardContent className="p-6 pt-0">
            {mockupTemplates.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-body text-[var(--color-text-secondary)] mb-3">
                  No mockup templates synced yet.
                </p>
                <Link href="/dashboard/settings">
                  <Button variant="secondary" size="sm">
                    Sync Templates in Settings
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <Checkbox
                    checked={generateMockups}
                    onChange={() => setGenerateMockups(!generateMockups)}
                    label="Generate mockups for approved assets"
                    description={`${mockupTemplates.length} templates available • Credits charged per mockup`}
                  />
                </div>

                {generateMockups && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-body-sm font-medium">Select Templates ({selectedScenes.length} selected)</p>
                      <div className="flex items-center gap-2">
                        <select
                          value={collectionFilter}
                          onChange={(e) => setCollectionFilter(e.target.value as CollectionFilter)}
                          className="text-body-sm border rounded-md px-2 py-1 bg-white"
                        >
                          <option value="all">All Collections</option>
                          <option value="grounding">Grounding</option>
                          <option value="wholeness">Wholeness</option>
                          <option value="growth">Growth</option>
                        </select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const allSceneKeys = filteredTemplates.map((t) => t.scene_key);
                            setSelectedScenes(
                              selectedScenes.length === filteredTemplates.length ? [] : allSceneKeys
                            );
                          }}
                        >
                          {selectedScenes.length === filteredTemplates.length ? 'Deselect All' : 'Select All'}
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-h-96 overflow-y-auto">
                      {filteredTemplates.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => toggleScene(template.scene_key)}
                          className={cn(
                            'flex flex-col rounded-md border overflow-hidden text-left transition-colors cursor-pointer',
                            selectedScenes.includes(template.scene_key)
                              ? 'border-sage ring-2 ring-sage/20 bg-sage-pale'
                              : 'hover:bg-elevated hover:border-[var(--color-border-hover)]'
                          )}
                        >
                          <div className="aspect-[4/3] bg-elevated relative">
                            {template.preview_url ? (
                              <img
                                src={template.preview_url}
                                alt={template.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[var(--color-text-tertiary)]">
                                <Sparkles className="h-8 w-8" />
                              </div>
                            )}
                            {selectedScenes.includes(template.scene_key) && (
                              <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-sage flex items-center justify-center">
                                <Check className="h-4 w-4 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="p-2">
                            <p className="text-body-sm font-medium truncate">{template.name}</p>
                            {template.description && (
                              <p className="text-caption text-[var(--color-text-tertiary)] truncate">
                                {template.description}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Summary & Generate */}
        <Card className="bg-sage-pale border-sage/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body font-medium">Ready to Generate</p>
                <p className="text-body-sm text-[var(--color-text-secondary)]">
                  {selectedFormats.length} format{selectedFormats.length !== 1 ? 's' : ''} selected
                  {generateMockups && ` • ${selectedScenes.length} mockup scene${selectedScenes.length !== 1 ? 's' : ''}`}
                </p>
              </div>
              <Button
                onClick={() => generateMutation.mutate()}
                isLoading={generateMutation.isPending}
                disabled={selectedFormats.length === 0}
                leftIcon={<Sparkles className="h-4 w-4" />}
              >
                Generate Assets
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

function FormatCard({
  format,
  selected,
  onToggle,
}: {
  format: { id: string; name: string; width: number; height: number; aspectRatio: string };
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'flex items-center gap-3 rounded-md border p-3 text-left transition-colors',
        selected ? 'border-sage bg-sage-pale' : 'hover:bg-elevated'
      )}
    >
      <div
        className={cn(
          'h-5 w-5 rounded border flex items-center justify-center shrink-0',
          selected ? 'bg-sage border-sage' : 'border-[var(--color-border)]'
        )}
      >
        {selected && <Check className="h-3 w-3 text-white" />}
      </div>
      <div className="min-w-0">
        <p className="text-body-sm font-medium">{format.name}</p>
        <p className="text-caption text-[var(--color-text-tertiary)]">
          {format.width}×{format.height}px • {format.aspectRatio}
        </p>
      </div>
    </button>
  );
}
