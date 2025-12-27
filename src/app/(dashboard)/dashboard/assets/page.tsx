'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent, Button, Tabs, TabsList, TabsTrigger, TabsContent, Modal, Input, Label } from '@/components/ui';
import { Image, Download, ExternalLink, Loader2, Pin, Calendar, Send, Sparkles, Hash, X } from 'lucide-react';

interface Mockup {
  id: string;
  scene: string;
  file_url: string;
  status: string;
  created_at: string;
  assets?: {
    id: string;
    file_url: string;
    quotes?: {
      text: string;
      collection: string;
    };
  };
}

interface ApprovalItem {
  id: string;
  type: 'asset' | 'mockup';
  status: string;
  reference_id: string;
  collection?: string;
  payload: {
    assetUrl?: string;
    file_url?: string;
    thumbnailUrl?: string;
    scene?: string;
    quoteText?: string;
    collection?: string;
    format?: string;
    size?: string;
  };
  created_at: string;
}

interface PreviewItem {
  id: string;
  type: 'asset' | 'mockup';
  imageUrl: string;
  title: string;
  subtitle?: string;
  collection?: string;
  date: string;
  referenceId?: string;
}

interface PinterestBoard {
  id: string;
  pinterest_board_id: string;
  name: string;
  collection: string | null;
  is_primary: boolean;
}

interface CopyTemplate {
  id: string;
  name: string;
  variant: string;
  title_template: string;
  description_template: string;
  collection: string | null;
  mood: string | null;
  times_used: number;
  avg_engagement_rate: number | null;
}

interface CreatePinData {
  boardId: string;
  title: string;
  description: string;
  link: string;
  altText: string;
  hashtags: string[];
  copyTemplateId?: string;
  publishNow: boolean;
  scheduledFor?: string;
}

export default function AssetsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('mockups');
  const [previewItem, setPreviewItem] = useState<PreviewItem | null>(null);
  const [showCreatePin, setShowCreatePin] = useState(false);
  const [pinItem, setPinItem] = useState<PreviewItem | null>(null);
  const [hashtagInput, setHashtagInput] = useState('');
  const [pinForm, setPinForm] = useState<CreatePinData>({
    boardId: '',
    title: '',
    description: '',
    link: '',
    altText: '',
    hashtags: [],
    publishNow: false,
  });

  // Fetch approved items from approval_items
  const { data: approvedData, isLoading: loadingApproved } = useQuery({
    queryKey: ['approved-items'],
    queryFn: async () => {
      const res = await fetch('/api/approvals?status=approved&limit=100');
      if (!res.ok) throw new Error('Failed to fetch approved items');
      return res.json();
    },
  });

  // Fetch all mockups
  const { data: mockupsData, isLoading: loadingMockups } = useQuery({
    queryKey: ['mockups'],
    queryFn: async () => {
      const res = await fetch('/api/mockups?limit=100');
      if (!res.ok) throw new Error('Failed to fetch mockups');
      return res.json();
    },
  });

  // Fetch Pinterest status and boards
  const { data: pinterestData } = useQuery({
    queryKey: ['pinterest-boards'],
    queryFn: async () => {
      const res = await fetch('/api/pinterest/boards');
      if (!res.ok) return { boards: [], connected: false };
      return res.json();
    },
  });

  const pinterestConnected = pinterestData?.connected || false;
  const boards: PinterestBoard[] = pinterestData?.boards || [];

  // Fetch copy templates
  const { data: templatesData } = useQuery({
    queryKey: ['copy-templates'],
    queryFn: async () => {
      const res = await fetch('/api/copy-templates');
      if (!res.ok) return { templates: [] };
      return res.json();
    },
  });

  const copyTemplates: CopyTemplate[] = templatesData?.templates || [];

  // Auto-generate copy mutation
  const generateCopyMutation = useMutation({
    mutationFn: async (params: {
      quote_text?: string;
      collection?: string;
      mood?: string;
      mockupId?: string;
      assetId?: string;
      templateId?: string;
    }) => {
      const res = await fetch('/api/copy-templates/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to generate copy');
      }
      return res.json();
    },
    onSuccess: (data) => {
      setPinForm((prev) => ({
        ...prev,
        title: data.title,
        description: data.description,
        altText: data.alt_text || prev.altText,
        hashtags: data.hashtags || prev.hashtags,
      }));
    },
  });

  // Create pin mutation
  const createPinMutation = useMutation({
    mutationFn: async (data: {
      boardId: string;
      imageUrl: string;
      title: string;
      description?: string;
      link?: string;
      altText?: string;
      mockupId?: string;
      assetId?: string;
      collection?: string;
      publishNow?: boolean;
      scheduledFor?: string;
      copyTemplateId?: string;
      hashtags?: string[];
    }) => {
      const res = await fetch('/api/pinterest/pins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create pin');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pinterest-pins'] });
      setShowCreatePin(false);
      setPinItem(null);
      setHashtagInput('');
      setPinForm({
        boardId: '',
        title: '',
        description: '',
        link: '',
        altText: '',
        hashtags: [],
        publishNow: false,
      });
    },
  });

  const approvedItems: ApprovalItem[] = approvedData?.items || [];
  const approvedMockups = approvedItems.filter(item => item.type === 'mockup');
  const approvedAssets = approvedItems.filter(item => item.type === 'asset');

  // Get mockup details for approved mockups
  const mockups: Mockup[] = mockupsData?.mockups || [];
  const approvedMockupIds = new Set(approvedMockups.map(m => m.reference_id));
  const displayMockups = mockups.filter(m => approvedMockupIds.has(m.id));

  const isLoading = loadingApproved || loadingMockups;

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const openMockupPreview = (mockup: Mockup) => {
    setPreviewItem({
      id: mockup.id,
      type: 'mockup',
      imageUrl: mockup.file_url,
      title: mockup.assets?.quotes?.text || 'Mockup',
      subtitle: mockup.scene.replace('dm_', '').slice(0, 20),
      collection: mockup.assets?.quotes?.collection,
      date: mockup.created_at,
      referenceId: mockup.id,
    });
  };

  const openAssetPreview = (asset: ApprovalItem) => {
    const imageUrl = asset.payload.assetUrl || asset.payload.thumbnailUrl || asset.payload.file_url;
    setPreviewItem({
      id: asset.id,
      type: 'asset',
      imageUrl: imageUrl || '',
      title: asset.payload.quoteText || 'Asset',
      subtitle: asset.payload.format || asset.payload.size,
      collection: asset.payload.collection || asset.collection,
      date: asset.created_at,
      referenceId: asset.reference_id,
    });
  };

  const openCreatePinModal = (item: PreviewItem) => {
    setPinItem(item);
    setHashtagInput('');
    // Auto-select board based on collection if available
    const matchingBoard = item.collection
      ? boards.find(b => b.collection === item.collection && b.is_primary)
      : null;
    setPinForm({
      boardId: matchingBoard?.pinterest_board_id || '',
      title: item.title.slice(0, 100),
      description: '',
      link: '',
      altText: '',
      hashtags: [],
      publishNow: false,
    });
    setShowCreatePin(true);
  };

  const handleAutoGenerate = () => {
    if (!pinItem) return;
    generateCopyMutation.mutate({
      quote_text: pinItem.title,
      collection: pinItem.collection as 'grounding' | 'wholeness' | 'growth' | undefined,
      mockupId: pinItem.type === 'mockup' ? pinItem.referenceId : undefined,
      assetId: pinItem.type === 'asset' ? pinItem.referenceId : undefined,
    });
  };

  const handleTemplateSelect = (templateId: string) => {
    if (!templateId || !pinItem) {
      setPinForm((prev) => ({ ...prev, copyTemplateId: undefined }));
      return;
    }
    setPinForm((prev) => ({ ...prev, copyTemplateId: templateId }));
    // Generate copy using the selected template
    generateCopyMutation.mutate({
      quote_text: pinItem.title,
      collection: pinItem.collection as 'grounding' | 'wholeness' | 'growth' | undefined,
      templateId,
    });
  };

  const addHashtag = () => {
    const tag = hashtagInput.trim().replace(/^#/, '').toLowerCase();
    if (tag && !pinForm.hashtags.includes(tag)) {
      setPinForm((prev) => ({ ...prev, hashtags: [...prev.hashtags, tag] }));
    }
    setHashtagInput('');
  };

  const removeHashtag = (tag: string) => {
    setPinForm((prev) => ({ ...prev, hashtags: prev.hashtags.filter((t) => t !== tag) }));
  };

  const handleCreatePin = () => {
    if (!pinItem || !pinForm.boardId) return;

    createPinMutation.mutate({
      boardId: pinForm.boardId,
      imageUrl: pinItem.imageUrl,
      title: pinForm.title,
      description: pinForm.description || undefined,
      link: pinForm.link || undefined,
      altText: pinForm.altText || undefined,
      mockupId: pinItem.type === 'mockup' ? pinItem.referenceId : undefined,
      assetId: pinItem.type === 'asset' ? pinItem.referenceId : undefined,
      collection: pinItem.collection as 'grounding' | 'wholeness' | 'growth' | undefined,
      publishNow: pinForm.publishNow,
      scheduledFor: pinForm.scheduledFor,
      copyTemplateId: pinForm.copyTemplateId,
      hashtags: pinForm.hashtags.length > 0 ? pinForm.hashtags : undefined,
    });
  };

  return (
    <PageContainer
      title="Design Assets"
      description="Browse and manage your approved design assets and mockups"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="mockups">
            Mockups ({displayMockups.length})
          </TabsTrigger>
          <TabsTrigger value="assets">
            Assets ({approvedAssets.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mockups">
          {isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--color-text-tertiary)]" />
              </CardContent>
            </Card>
          ) : displayMockups.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Image className="h-12 w-12 text-[var(--color-text-tertiary)] mb-4" />
                <h3 className="text-h3 mb-2">No Approved Mockups Yet</h3>
                <p className="text-body text-[var(--color-text-secondary)] max-w-md">
                  Generate mockups from your quotes and approve them to see them here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayMockups.map((mockup) => (
                <Card
                  key={mockup.id}
                  className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-[var(--color-border-focus)] transition-all"
                  onClick={() => openMockupPreview(mockup)}
                >
                  <div className="aspect-[4/3] relative bg-[var(--color-bg-secondary)]">
                    <img
                      src={mockup.file_url}
                      alt={`Mockup ${mockup.scene}`}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium truncate">
                          {mockup.scene.replace('dm_', '').slice(0, 12)}...
                        </p>
                        <p className="text-xs text-[var(--color-text-tertiary)]">
                          {new Date(mockup.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => window.open(mockup.file_url, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleDownload(mockup.file_url, `mockup-${mockup.id}.png`)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="assets">
          {isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--color-text-tertiary)]" />
              </CardContent>
            </Card>
          ) : approvedAssets.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Image className="h-12 w-12 text-[var(--color-text-tertiary)] mb-4" />
                <h3 className="text-h3 mb-2">No Approved Assets Yet</h3>
                <p className="text-body text-[var(--color-text-secondary)] max-w-md">
                  Generate designs from your quotes and approve them to see them here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {approvedAssets.map((asset) => {
                const imageUrl = asset.payload.assetUrl || asset.payload.thumbnailUrl || asset.payload.file_url;
                return (
                  <Card
                    key={asset.id}
                    className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-[var(--color-border-focus)] transition-all"
                    onClick={() => openAssetPreview(asset)}
                  >
                    <div className="aspect-[2/3] relative bg-[var(--color-bg-secondary)]">
                      {imageUrl && (
                        <img
                          src={imageUrl}
                          alt="Asset"
                          className="absolute inset-0 w-full h-full object-contain"
                        />
                      )}
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium truncate max-w-[150px]">
                            {asset.payload.quoteText?.slice(0, 20) || 'Asset'}...
                          </p>
                          <p className="text-xs text-[var(--color-text-tertiary)]">
                            {asset.payload.collection || asset.collection || 'Unknown'}
                          </p>
                        </div>
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          {imageUrl && (
                            <>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => window.open(imageUrl, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleDownload(imageUrl, `asset-${asset.id}.png`)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Preview Modal */}
      <Modal
        isOpen={!!previewItem}
        onClose={() => setPreviewItem(null)}
        title={previewItem?.title || 'Preview'}
        size="xl"
        showCloseButton={true}
      >
        {previewItem && (
          <div className="space-y-4">
            <div className="relative bg-[var(--color-bg-secondary)] rounded-lg overflow-hidden">
              <img
                src={previewItem.imageUrl}
                alt={previewItem.title}
                className="w-full max-h-[60vh] object-contain"
              />
            </div>

            <div className="flex items-start justify-between gap-4">
              <div>
                {previewItem.subtitle && (
                  <p className="text-sm text-[var(--color-text-secondary)]">{previewItem.subtitle}</p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-[var(--color-text-tertiary)]">
                  {previewItem.collection && (
                    <span className="px-2 py-1 rounded-full bg-[var(--color-bg-secondary)]">
                      {previewItem.collection}
                    </span>
                  )}
                  <span>{new Date(previewItem.date).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex gap-2">
                {pinterestConnected && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setPreviewItem(null);
                      openCreatePinModal(previewItem);
                    }}
                  >
                    <Pin className="h-4 w-4 mr-2" />
                    Create Pin
                  </Button>
                )}
                <Button
                  variant="secondary"
                  onClick={() => window.open(previewItem.imageUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open
                </Button>
                <Button
                  onClick={() => handleDownload(
                    previewItem.imageUrl,
                    `${previewItem.type}-${previewItem.id}.png`
                  )}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Pin Modal */}
      <Modal
        isOpen={showCreatePin}
        onClose={() => {
          setShowCreatePin(false);
          setPinItem(null);
          setHashtagInput('');
        }}
        title="Create Pinterest Pin"
        size="lg"
        showCloseButton={true}
      >
        {pinItem && (
          <div className="space-y-5">
            {/* Preview */}
            <div className="flex gap-4">
              <div className="w-28 h-28 bg-[var(--color-bg-secondary)] rounded-lg overflow-hidden flex-shrink-0">
                <img
                  src={pinItem.imageUrl}
                  alt={pinItem.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1">
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {pinItem.type === 'mockup' ? 'Mockup' : 'Asset'}
                </p>
                <p className="font-medium truncate">{pinItem.title}</p>
                {pinItem.collection && (
                  <span className="inline-block mt-2 px-2 py-1 text-xs rounded-full bg-[var(--color-bg-secondary)]">
                    {pinItem.collection}
                  </span>
                )}
              </div>
            </div>

            {/* Auto-Generate Section */}
            <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Auto-Generate Copy</p>
                  <p className="text-xs text-[var(--color-text-tertiary)]">
                    Let AI create optimized title, description & hashtags
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleAutoGenerate}
                  disabled={generateCopyMutation.isPending}
                >
                  {generateCopyMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-1" />
                      Generate
                    </>
                  )}
                </Button>
              </div>

              {/* Copy Template Selector */}
              {copyTemplates.length > 0 && (
                <div>
                  <Label className="text-xs">Or use a template:</Label>
                  <select
                    className="w-full mt-1 px-3 py-2 text-sm bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] rounded-lg"
                    value={pinForm.copyTemplateId || ''}
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                  >
                    <option value="">Select a template...</option>
                    {copyTemplates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                        {template.collection && ` (${template.collection})`}
                        {template.avg_engagement_rate && ` - ${(template.avg_engagement_rate * 100).toFixed(1)}% eng`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Board Selection */}
            <div>
              <Label>Board *</Label>
              <select
                className="w-full mt-1 px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] rounded-lg"
                value={pinForm.boardId}
                onChange={(e) => setPinForm({ ...pinForm, boardId: e.target.value })}
              >
                <option value="">Select a board...</option>
                {boards.map((board) => (
                  <option key={board.id} value={board.pinterest_board_id}>
                    {board.name}
                    {board.collection && ` (${board.collection})`}
                    {board.is_primary && ' *'}
                  </option>
                ))}
              </select>
              {boards.length === 0 && (
                <p className="text-sm text-[var(--color-text-tertiary)] mt-2">
                  No boards found. Go to Pinterest Manager to sync your boards.
                </p>
              )}
            </div>

            {/* Title */}
            <div>
              <div className="flex items-center justify-between">
                <Label>Title *</Label>
                <span className="text-xs text-[var(--color-text-tertiary)]">
                  {pinForm.title.length}/100
                </span>
              </div>
              <Input
                value={pinForm.title}
                onChange={(e) => setPinForm({ ...pinForm, title: e.target.value })}
                placeholder="Pin title"
                maxLength={100}
                className="mt-1"
              />
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center justify-between">
                <Label>Description</Label>
                <span className="text-xs text-[var(--color-text-tertiary)]">
                  {pinForm.description.length}/500
                </span>
              </div>
              <textarea
                className="w-full mt-1 px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] rounded-lg resize-none"
                rows={4}
                value={pinForm.description}
                onChange={(e) => setPinForm({ ...pinForm, description: e.target.value })}
                placeholder="Add a description (optional)"
                maxLength={500}
              />
            </div>

            {/* Hashtags */}
            <div>
              <Label>Hashtags</Label>
              <div className="flex gap-2 mt-1">
                <div className="flex-1 relative">
                  <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--color-text-tertiary)]" />
                  <Input
                    value={hashtagInput}
                    onChange={(e) => setHashtagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        addHashtag();
                      }
                    }}
                    placeholder="Type and press Enter"
                    className="pl-9"
                  />
                </div>
                <Button
                  variant="secondary"
                  onClick={addHashtag}
                  disabled={!hashtagInput.trim()}
                >
                  Add
                </Button>
              </div>
              {pinForm.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {pinForm.hashtags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-[var(--color-bg-secondary)] rounded-full"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => removeHashtag(tag)}
                        className="hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Alt Text */}
            <div>
              <Label>Alt Text (Accessibility)</Label>
              <Input
                value={pinForm.altText}
                onChange={(e) => setPinForm({ ...pinForm, altText: e.target.value })}
                placeholder="Describe the image for screen readers"
                maxLength={500}
                className="mt-1"
              />
            </div>

            {/* Destination Link */}
            <div>
              <Label>Destination Link</Label>
              <Input
                value={pinForm.link}
                onChange={(e) => setPinForm({ ...pinForm, link: e.target.value })}
                placeholder="https://..."
                type="url"
                className="mt-1"
              />
            </div>

            {/* Publish Options */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pinForm.publishNow}
                  onChange={(e) => setPinForm({ ...pinForm, publishNow: e.target.checked, scheduledFor: undefined })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Publish immediately</span>
              </label>
            </div>

            {!pinForm.publishNow && (
              <div>
                <Label>Schedule for later</Label>
                <Input
                  type="datetime-local"
                  value={pinForm.scheduledFor || ''}
                  onChange={(e) => setPinForm({ ...pinForm, scheduledFor: e.target.value })}
                  className="mt-1"
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
            )}

            {/* Errors */}
            {(createPinMutation.error || generateCopyMutation.error) && (
              <p className="text-sm text-red-500">
                {createPinMutation.error?.message || generateCopyMutation.error?.message}
              </p>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border-primary)]">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowCreatePin(false);
                  setPinItem(null);
                  setHashtagInput('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreatePin}
                disabled={!pinForm.boardId || !pinForm.title || createPinMutation.isPending}
              >
                {createPinMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : pinForm.publishNow ? (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Publish Now
                  </>
                ) : pinForm.scheduledFor ? (
                  <>
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Pin
                  </>
                ) : (
                  <>
                    <Pin className="h-4 w-4 mr-2" />
                    Save as Draft
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </PageContainer>
  );
}
