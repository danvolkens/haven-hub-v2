'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent, Button, Tabs, TabsList, TabsTrigger, TabsContent, Modal } from '@/components/ui';
import { Image, Download, ExternalLink, Loader2 } from 'lucide-react';

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
}

export default function AssetsPage() {
  const [activeTab, setActiveTab] = useState('mockups');
  const [previewItem, setPreviewItem] = useState<PreviewItem | null>(null);

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
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(mockup.file_url, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
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
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(imageUrl, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
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
                <Button
                  variant="outline"
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
    </PageContainer>
  );
}
