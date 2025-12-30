'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent, Button, Tabs, TabsList, TabsTrigger, TabsContent, Modal, Input, Label } from '@/components/ui';
import { Image, Download, ExternalLink, Loader2, Pin, Calendar, Send, Sparkles, Hash, X, Trash2, ShoppingBag, FileText, HelpCircle, Zap, Clock, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

interface Mockup {
  id: string;
  scene: string;
  file_url: string;
  status: string;
  created_at: string;
  asset_id?: string;
  assets?: {
    id: string;
    file_url: string;
    format?: string;
    quote_id?: string;
    quotes?: {
      id: string;
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
    quoteId?: string;
    quote_id?: string;
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
  format?: string;
  date: string;
  referenceId?: string;
  quoteId?: string;
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

interface Quote {
  id: string;
  text: string;
  collection: string;
}

type LinkType = 'product' | 'custom' | 'landing_page' | 'quiz';
type ScheduleStrategy = 'draft' | 'now' | 'optimal' | 'custom';
type AssetFormat = '' | 'pinterest' | 'instagram_post' | 'instagram_story';
type Collection = '' | 'grounding' | 'wholeness' | 'growth';

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
  linkType: LinkType;
  selectedLandingPage: string;
  selectedQuiz: string;
  scheduleStrategy: ScheduleStrategy;
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
    linkType: 'product',
    selectedLandingPage: '',
    selectedQuiz: '',
    scheduleStrategy: 'draft',
  });
  const [deleteItem, setDeleteItem] = useState<PreviewItem | null>(null);
  const [productLink, setProductLink] = useState<string | null>(null);

  // Filter state
  const [filterCollection, setFilterCollection] = useState<Collection>('');
  const [filterQuoteId, setFilterQuoteId] = useState('');
  const [filterFormat, setFilterFormat] = useState<AssetFormat>('');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination state for assets
  const ITEMS_PER_PAGE = 24;
  const [assetsPage, setAssetsPage] = useState(1);

  // Fetch quotes for filter dropdown
  const { data: quotesData } = useQuery({
    queryKey: ['quotes-list-for-filter'],
    queryFn: async () => {
      const res = await fetch('/api/quotes?limit=100');
      if (!res.ok) throw new Error('Failed to fetch quotes');
      return res.json();
    },
  });

  const quotes: Quote[] = quotesData?.quotes || [];

  // Build query string for approved assets
  const buildAssetsQuery = () => {
    const params = new URLSearchParams({
      status: 'approved',
      type: 'asset',
      limit: ITEMS_PER_PAGE.toString(),
      offset: ((assetsPage - 1) * ITEMS_PER_PAGE).toString(),
    });
    if (filterCollection) params.append('collection', filterCollection);
    if (filterQuoteId) params.append('quoteId', filterQuoteId);
    if (filterFormat) params.append('format', filterFormat);
    return params.toString();
  };

  // Fetch approved assets with filters and pagination
  const { data: approvedAssetsData, isLoading: loadingAssets } = useQuery({
    queryKey: ['approved-assets', assetsPage, filterCollection, filterQuoteId, filterFormat],
    queryFn: async () => {
      const res = await fetch(`/api/approvals?${buildAssetsQuery()}`);
      if (!res.ok) throw new Error('Failed to fetch approved assets');
      return res.json();
    },
  });

  // Fetch approved mockups (separate, without format filter)
  const { data: approvedMockupsData, isLoading: loadingApprovedMockups } = useQuery({
    queryKey: ['approved-mockups', filterCollection, filterQuoteId],
    queryFn: async () => {
      const params = new URLSearchParams({
        status: 'approved',
        type: 'mockup',
        limit: '500',
      });
      if (filterCollection) params.append('collection', filterCollection);
      if (filterQuoteId) params.append('quoteId', filterQuoteId);
      const res = await fetch(`/api/approvals?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch approved mockups');
      return res.json();
    },
  });

  // Pagination state for mockups (client-side pagination after filtering)
  const MOCKUPS_PER_PAGE = 24;
  const [mockupsPage, setMockupsPage] = useState(1);

  // Build query string for mockups with filters (fetch all, paginate client-side after filtering)
  const buildMockupsQuery = () => {
    const params = new URLSearchParams({
      limit: '500', // Fetch all mockups, filter and paginate client-side
    });
    if (filterCollection) params.append('collection', filterCollection);
    if (filterQuoteId) params.append('quoteId', filterQuoteId);
    if (filterFormat) params.append('format', filterFormat);
    return params.toString();
  };

  // Fetch mockups with filters
  const { data: mockupsData, isLoading: loadingMockups } = useQuery({
    queryKey: ['mockups', filterCollection, filterQuoteId, filterFormat],
    queryFn: async () => {
      const res = await fetch(`/api/mockups?${buildMockupsQuery()}`);
      if (!res.ok) throw new Error('Failed to fetch mockups');
      return res.json();
    },
  });

  const allMockups: Mockup[] = mockupsData?.mockups || [];

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

  // Fetch landing pages
  const { data: landingPagesData } = useQuery({
    queryKey: ['landing-pages-list'],
    queryFn: async () => {
      const res = await fetch('/api/landing-pages');
      if (!res.ok) return { pages: [] };
      return res.json();
    },
    enabled: showCreatePin && pinForm.linkType === 'landing_page',
  });

  // Fetch quizzes
  const { data: quizzesData } = useQuery({
    queryKey: ['quizzes-list'],
    queryFn: async () => {
      const res = await fetch('/api/quiz');
      if (!res.ok) return { quizzes: [] };
      return res.json();
    },
    enabled: showCreatePin && pinForm.linkType === 'quiz',
  });

  const landingPages = landingPagesData?.pages || [];
  const quizzes = quizzesData?.quizzes || [];

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
        linkType: 'custom',
        selectedLandingPage: '',
        selectedQuiz: '',
        scheduleStrategy: 'now',
      });
    },
  });

  // Delete asset/mockup mutation
  const deleteMutation = useMutation({
    mutationFn: async (item: PreviewItem) => {
      const res = await fetch(`/api/assets/${item.id}?type=${item.type}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete');
      }
      return res.json();
    },
    onSuccess: () => {
      // Invalidate all related queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['approved-assets'] });
      queryClient.invalidateQueries({ queryKey: ['approved-mockups'] });
      queryClient.invalidateQueries({ queryKey: ['mockups'] });
      setDeleteItem(null);
      setPreviewItem(null);
    },
  });

  const handleDelete = (item: PreviewItem) => {
    setDeleteItem(item);
  };

  const confirmDelete = () => {
    if (deleteItem) {
      deleteMutation.mutate(deleteItem);
    }
  };

  // Get data from queries
  const approvedAssets: ApprovalItem[] = approvedAssetsData?.items || [];
  const totalAssets = approvedAssetsData?.total || 0;
  const totalAssetsPages = Math.ceil(totalAssets / ITEMS_PER_PAGE);

  const approvedMockups: ApprovalItem[] = approvedMockupsData?.items || [];

  // Filter mockups to only show approved ones
  const mockups: Mockup[] = allMockups;
  const approvedMockupIds = new Set(approvedMockups.map(m => m.reference_id));
  const allApprovedMockups = mockups.filter(m => approvedMockupIds.has(m.id));

  // Client-side pagination for mockups (after filtering to approved only)
  const totalMockups = allApprovedMockups.length;
  const totalMockupsPages = Math.ceil(totalMockups / MOCKUPS_PER_PAGE);
  const displayMockups = allApprovedMockups.slice(
    (mockupsPage - 1) * MOCKUPS_PER_PAGE,
    mockupsPage * MOCKUPS_PER_PAGE
  );

  const isLoading = loadingAssets || loadingMockups || loadingApprovedMockups;

  // Reset page when filters change
  const resetFilters = () => {
    setFilterCollection('');
    setFilterQuoteId('');
    setFilterFormat('');
    setAssetsPage(1);
    setMockupsPage(1);
  };

  const hasActiveFilters = filterCollection || filterQuoteId || filterFormat;

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
      format: mockup.assets?.format,
      date: mockup.created_at,
      referenceId: mockup.id,
      quoteId: mockup.assets?.quotes?.id || mockup.assets?.quote_id,
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
      format: asset.payload.format,
      date: asset.created_at,
      referenceId: asset.reference_id,
      quoteId: asset.payload.quoteId || asset.payload.quote_id,
    });
  };

  const openCreatePinModal = async (item: PreviewItem) => {
    setPinItem(item);
    setHashtagInput('');
    setProductLink(null);

    // Auto-select board based on collection if available
    const matchingBoard = item.collection
      ? boards.find(b => b.collection === item.collection && b.is_primary)
      : null;

    // Fetch product link for this quote if quoteId exists
    let fetchedProductLink: string | null = null;
    if (item.quoteId) {
      try {
        const res = await fetch(`/api/quotes/${item.quoteId}/product-link`);
        if (res.ok) {
          const data = await res.json();
          fetchedProductLink = data.productLink || null;
        }
      } catch (err) {
        console.error('Failed to fetch product link:', err);
      }
    }

    setProductLink(fetchedProductLink);
    setPinForm({
      boardId: matchingBoard?.pinterest_board_id || '',
      title: item.title.slice(0, 100),
      description: '',
      link: '',
      altText: '',
      hashtags: [],
      publishNow: false,
      linkType: fetchedProductLink ? 'product' : 'custom',
      selectedLandingPage: '',
      selectedQuiz: '',
      scheduleStrategy: 'draft',
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

  const getComputedLink = (): string | undefined => {
    switch (pinForm.linkType) {
      case 'product':
        return productLink || undefined;
      case 'custom':
        return pinForm.link || undefined;
      case 'landing_page':
        if (pinForm.selectedLandingPage) {
          return `${window.location.origin}/landing/${pinForm.selectedLandingPage}`;
        }
        return undefined;
      case 'quiz':
        if (pinForm.selectedQuiz) {
          return `${window.location.origin}/quiz/${pinForm.selectedQuiz}`;
        }
        return undefined;
      default:
        return undefined;
    }
  };

  const getScheduleData = (): { publishNow: boolean; scheduledFor?: string } => {
    switch (pinForm.scheduleStrategy) {
      case 'now':
        return { publishNow: true };
      case 'optimal':
        // Schedule for next 8 PM slot
        const now = new Date();
        const optimal = new Date();
        optimal.setHours(20, 0, 0, 0); // 8 PM
        if (optimal <= now) {
          optimal.setDate(optimal.getDate() + 1); // Tomorrow if past 8 PM
        }
        return { publishNow: false, scheduledFor: optimal.toISOString() };
      case 'custom':
        return { publishNow: false, scheduledFor: pinForm.scheduledFor };
      case 'draft':
      default:
        return { publishNow: false };
    }
  };

  const handleCreatePin = () => {
    if (!pinItem || !pinForm.boardId) return;

    const scheduleData = getScheduleData();

    createPinMutation.mutate({
      boardId: pinForm.boardId,
      imageUrl: pinItem.imageUrl,
      title: pinForm.title,
      description: pinForm.description || undefined,
      link: getComputedLink(),
      altText: pinForm.altText || undefined,
      mockupId: pinItem.type === 'mockup' ? pinItem.referenceId : undefined,
      assetId: pinItem.type === 'asset' ? pinItem.referenceId : undefined,
      collection: pinItem.collection as 'grounding' | 'wholeness' | 'growth' | undefined,
      publishNow: scheduleData.publishNow,
      scheduledFor: scheduleData.scheduledFor,
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <TabsList>
            <TabsTrigger value="mockups">
              Mockups ({totalMockups})
            </TabsTrigger>
            <TabsTrigger value="assets">
              Assets ({totalAssets})
            </TabsTrigger>
          </TabsList>

          {/* Filter Toggle Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={hasActiveFilters ? 'border-sage ring-1 ring-sage' : ''}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {hasActiveFilters && (
              <span className="ml-2 px-1.5 py-0.5 text-xs bg-sage text-white rounded-full">
                {[filterCollection, filterQuoteId, filterFormat].filter(Boolean).length}
              </span>
            )}
          </Button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Collection Filter */}
                <div>
                  <Label className="text-sm mb-1.5 block">Collection</Label>
                  <select
                    className="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] rounded-lg text-sm"
                    value={filterCollection}
                    onChange={(e) => {
                      setFilterCollection(e.target.value as Collection);
                      setAssetsPage(1);
                    }}
                  >
                    <option value="">All Collections</option>
                    <option value="grounding">Grounding</option>
                    <option value="wholeness">Wholeness</option>
                    <option value="growth">Growth</option>
                  </select>
                </div>

                {/* Quote Filter */}
                <div>
                  <Label className="text-sm mb-1.5 block">Quote</Label>
                  <select
                    className="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] rounded-lg text-sm"
                    value={filterQuoteId}
                    onChange={(e) => {
                      setFilterQuoteId(e.target.value);
                      setAssetsPage(1);
                    }}
                  >
                    <option value="">All Quotes</option>
                    {quotes.map((quote) => (
                      <option key={quote.id} value={quote.id}>
                        {quote.text.slice(0, 50)}{quote.text.length > 50 ? '...' : ''} ({quote.collection})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Size/Format Filter */}
                <div>
                  <Label className="text-sm mb-1.5 block">Size</Label>
                  <select
                    className="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] rounded-lg text-sm"
                    value={filterFormat}
                    onChange={(e) => {
                      setFilterFormat(e.target.value as AssetFormat);
                      setAssetsPage(1);
                      setMockupsPage(1);
                    }}
                  >
                    <option value="">All Sizes</option>
                    <option value="pinterest">Pinterest (1000×1500)</option>
                    <option value="instagram_post">Instagram Post (1080×1350)</option>
                    <option value="instagram_story">Instagram Story (1080×1920)</option>
                  </select>
                </div>
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <div className="mt-4 pt-4 border-t border-[var(--color-border-primary)]">
                  <Button variant="secondary" size="sm" onClick={resetFilters}>
                    <X className="h-4 w-4 mr-1" />
                    Clear All Filters
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <TabsContent value="mockups">
          {loadingMockups ? (
            <Card>
              <CardContent className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--color-text-tertiary)]" />
              </CardContent>
            </Card>
          ) : displayMockups.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Image className="h-12 w-12 text-[var(--color-text-tertiary)] mb-4" />
                <h3 className="text-h3 mb-2">
                  {hasActiveFilters ? 'No Mockups Match Your Filters' : 'No Approved Mockups Yet'}
                </h3>
                <p className="text-body text-[var(--color-text-secondary)] max-w-md">
                  {hasActiveFilters
                    ? 'Try adjusting your filters to see more results.'
                    : 'Generate mockups from your quotes and approve them to see them here.'}
                </p>
                {hasActiveFilters && (
                  <Button variant="secondary" size="sm" className="mt-4" onClick={resetFilters}>
                    Clear Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
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
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {mockup.scene.replace('dm_', '').slice(0, 12)}...
                          </p>
                          <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
                            {mockup.assets?.quotes?.collection && (
                              <span className="capitalize">{mockup.assets.quotes.collection}</span>
                            )}
                            <span>•</span>
                            <span>{new Date(mockup.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
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
                          <Button
                            variant="secondary"
                            size="sm"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => {
                              const approvalItem = approvedMockups.find(m => m.reference_id === mockup.id);
                              if (approvalItem) {
                                handleDelete({
                                  id: approvalItem.id,
                                  type: 'mockup',
                                  imageUrl: mockup.file_url,
                                  title: mockup.assets?.quotes?.text || 'Mockup',
                                  date: mockup.created_at,
                                  referenceId: mockup.id,
                                });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination Controls for Mockups */}
              {totalMockupsPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setMockupsPage((p) => Math.max(1, p - 1))}
                    disabled={mockupsPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  {/* Page Numbers */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(7, totalMockupsPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalMockupsPages <= 7) {
                        pageNum = i + 1;
                      } else if (mockupsPage <= 4) {
                        pageNum = i + 1;
                      } else if (mockupsPage >= totalMockupsPages - 3) {
                        pageNum = totalMockupsPages - 6 + i;
                      } else {
                        pageNum = mockupsPage - 3 + i;
                      }

                      if (pageNum < 1 || pageNum > totalMockupsPages) return null;

                      return (
                        <Button
                          key={pageNum}
                          variant={mockupsPage === pageNum ? 'primary' : 'secondary'}
                          size="sm"
                          onClick={() => setMockupsPage(pageNum)}
                          className="min-w-[36px]"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setMockupsPage((p) => Math.min(totalMockupsPages, p + 1))}
                    disabled={mockupsPage === totalMockupsPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>

                  <span className="text-sm text-[var(--color-text-tertiary)] ml-4">
                    Page {mockupsPage} of {totalMockupsPages} ({totalMockups} total)
                  </span>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="assets">
          {loadingAssets ? (
            <Card>
              <CardContent className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--color-text-tertiary)]" />
              </CardContent>
            </Card>
          ) : approvedAssets.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Image className="h-12 w-12 text-[var(--color-text-tertiary)] mb-4" />
                <h3 className="text-h3 mb-2">
                  {hasActiveFilters ? 'No Assets Match Your Filters' : 'No Approved Assets Yet'}
                </h3>
                <p className="text-body text-[var(--color-text-secondary)] max-w-md">
                  {hasActiveFilters
                    ? 'Try adjusting your filters to see more results.'
                    : 'Generate designs from your quotes and approve them to see them here.'}
                </p>
                {hasActiveFilters && (
                  <Button variant="secondary" size="sm" className="mt-4" onClick={resetFilters}>
                    Clear Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
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
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">
                              {asset.payload.quoteText?.slice(0, 20) || 'Asset'}...
                            </p>
                            <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
                              <span>{asset.payload.collection || asset.collection || 'Unknown'}</span>
                              {asset.payload.format && (
                                <>
                                  <span>•</span>
                                  <span className="capitalize">{asset.payload.format.replace('_', ' ')}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
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
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                  onClick={() => handleDelete({
                                    id: asset.id,
                                    type: 'asset',
                                    imageUrl: imageUrl,
                                    title: asset.payload.quoteText || 'Asset',
                                    date: asset.created_at,
                                    referenceId: asset.reference_id,
                                  })}
                                >
                                  <Trash2 className="h-4 w-4" />
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

              {/* Pagination Controls */}
              {totalAssetsPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setAssetsPage((p) => Math.max(1, p - 1))}
                    disabled={assetsPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  {/* Page Numbers */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(7, totalAssetsPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalAssetsPages <= 7) {
                        pageNum = i + 1;
                      } else if (assetsPage <= 4) {
                        pageNum = i + 1;
                      } else if (assetsPage >= totalAssetsPages - 3) {
                        pageNum = totalAssetsPages - 6 + i;
                      } else {
                        pageNum = assetsPage - 3 + i;
                      }

                      if (pageNum < 1 || pageNum > totalAssetsPages) return null;

                      return (
                        <Button
                          key={pageNum}
                          variant={assetsPage === pageNum ? 'primary' : 'secondary'}
                          size="sm"
                          onClick={() => setAssetsPage(pageNum)}
                          className="min-w-[36px]"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setAssetsPage((p) => Math.min(totalAssetsPages, p + 1))}
                    disabled={assetsPage === totalAssetsPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>

                  <span className="text-sm text-[var(--color-text-tertiary)] ml-4">
                    Page {assetsPage} of {totalAssetsPages} ({totalAssets} total)
                  </span>
                </div>
              )}
            </>
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
                <Button
                  variant="secondary"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => handleDelete(previewItem)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
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

            {/* Link Destination */}
            <div>
              <Label>Link Destination</Label>
              <p className="text-xs text-[var(--color-text-tertiary)] mb-2">
                Where should the pin link to when clicked?
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                {[
                  { value: 'product', label: 'Product', icon: ShoppingBag, description: productLink ? 'Quote product' : 'No product linked' },
                  { value: 'custom', label: 'Custom URL', icon: ExternalLink, description: 'Any URL' },
                  { value: 'landing_page', label: 'Landing Page', icon: FileText, description: 'Your pages' },
                  { value: 'quiz', label: 'Quiz', icon: HelpCircle, description: 'Lead capture' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                      pinForm.linkType === option.value
                        ? 'border-sage bg-sage/10 ring-1 ring-sage'
                        : 'border-[var(--color-border-primary)] hover:border-sage/50'
                    } ${option.value === 'product' && !productLink ? 'opacity-50' : ''}`}
                    onClick={() => setPinForm({ ...pinForm, linkType: option.value as LinkType })}
                    disabled={option.value === 'product' && !productLink}
                  >
                    <option.icon className="h-4 w-4 mb-1" />
                    <p className="text-xs font-medium">{option.label}</p>
                    <p className="text-xs text-[var(--color-text-tertiary)] truncate">{option.description}</p>
                  </button>
                ))}
              </div>

              {/* Custom URL Input */}
              {pinForm.linkType === 'custom' && (
                <Input
                  type="url"
                  placeholder="https://your-shop.com/..."
                  value={pinForm.link}
                  onChange={(e) => setPinForm({ ...pinForm, link: e.target.value })}
                />
              )}

              {/* Landing Page Select */}
              {pinForm.linkType === 'landing_page' && (
                <select
                  className="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] rounded-lg"
                  value={pinForm.selectedLandingPage}
                  onChange={(e) => setPinForm({ ...pinForm, selectedLandingPage: e.target.value })}
                >
                  <option value="">Select a landing page...</option>
                  {landingPages.map((page: { slug: string; title: string }) => (
                    <option key={page.slug} value={page.slug}>
                      {page.title}
                    </option>
                  ))}
                </select>
              )}

              {/* Quiz Select */}
              {pinForm.linkType === 'quiz' && (
                <select
                  className="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] rounded-lg"
                  value={pinForm.selectedQuiz}
                  onChange={(e) => setPinForm({ ...pinForm, selectedQuiz: e.target.value })}
                >
                  <option value="">Select a quiz...</option>
                  {quizzes.map((quiz: { slug: string; title: string }) => (
                    <option key={quiz.slug} value={quiz.slug}>
                      {quiz.title}
                    </option>
                  ))}
                </select>
              )}

              {/* Show computed link preview */}
              {getComputedLink() && (
                <p className="text-xs text-[var(--color-text-tertiary)] mt-2 truncate">
                  → {getComputedLink()}
                </p>
              )}
            </div>

            {/* Scheduling Strategy */}
            <div>
              <Label>When to Publish</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                {[
                  { value: 'draft', label: 'Save Draft', icon: Pin, description: 'Review later' },
                  { value: 'now', label: 'Publish Now', icon: Send, description: 'Immediately' },
                  { value: 'optimal', label: 'Optimal Time', icon: Clock, description: 'Next 8 PM' },
                  { value: 'custom', label: 'Custom Time', icon: Calendar, description: 'Pick a time' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                      pinForm.scheduleStrategy === option.value
                        ? 'border-sage bg-sage/10 ring-1 ring-sage'
                        : 'border-[var(--color-border-primary)] hover:border-sage/50'
                    }`}
                    onClick={() => setPinForm({ ...pinForm, scheduleStrategy: option.value as ScheduleStrategy, publishNow: option.value === 'now' })}
                  >
                    <option.icon className="h-4 w-4 mb-1" />
                    <p className="text-xs font-medium">{option.label}</p>
                    <p className="text-xs text-[var(--color-text-tertiary)]">{option.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Schedule Time */}
            {pinForm.scheduleStrategy === 'custom' && (
              <div>
                <Label>Schedule for</Label>
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
                ) : pinForm.scheduleStrategy === 'now' ? (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Publish Now
                  </>
                ) : pinForm.scheduleStrategy === 'optimal' ? (
                  <>
                    <Clock className="h-4 w-4 mr-2" />
                    Schedule for 8 PM
                  </>
                ) : pinForm.scheduleStrategy === 'custom' && pinForm.scheduledFor ? (
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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        title="Delete Asset"
        size="sm"
        showCloseButton={true}
      >
        {deleteItem && (
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-20 h-20 bg-[var(--color-bg-secondary)] rounded-lg overflow-hidden flex-shrink-0">
                <img
                  src={deleteItem.imageUrl}
                  alt={deleteItem.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1">
                <p className="font-medium truncate">{deleteItem.title.slice(0, 50)}{deleteItem.title.length > 50 ? '...' : ''}</p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {deleteItem.type === 'mockup' ? 'Mockup' : 'Asset'}
                </p>
              </div>
            </div>

            <p className="text-sm text-[var(--color-text-secondary)]">
              Are you sure you want to delete this {deleteItem.type}? This action cannot be undone and will remove the file from storage.
            </p>

            {deleteMutation.error && (
              <p className="text-sm text-red-500">{deleteMutation.error.message}</p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => setDeleteItem(null)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="bg-red-500 hover:bg-red-600 text-white"
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
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
