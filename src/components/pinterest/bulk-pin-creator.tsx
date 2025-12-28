'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Modal,
  Button,
  Badge,
  Select,
  Input,
  Label,
  Card,
  CardContent,
} from '@/components/ui';
import {
  Plus,
  Loader2,
  CheckCircle,
  Image,
  Calendar,
  Zap,
  Clock,
  Check,
  Link as LinkIcon,
  ExternalLink,
  FileText,
  HelpCircle,
  ShoppingBag,
  Sparkles,
  FileEdit,
  Shuffle,
} from 'lucide-react';

interface Quote {
  id: string;
  text: string;
  collection: 'grounding' | 'wholeness' | 'growth';
  mood?: string;
  assetCount: number;
  mockupCount: number;
  previewUrl?: string;
}

interface Board {
  id: string;
  name: string;
  collection: string | null;
  pin_count: number;
}

interface CopyTemplate {
  id: string;
  name: string;
  variant: string;
  collection: string | null;
  times_used: number;
  avg_engagement_rate: number | null;
}

interface BulkPinCreatorProps {
  boards: Board[];
}

type LinkType = 'product' | 'custom' | 'landing_page' | 'quiz';

export function BulkPinCreator({ boards }: BulkPinCreatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedQuotes, setSelectedQuotes] = useState<string[]>([]);
  const [boardId, setBoardId] = useState('');
  const [strategy, setStrategy] = useState<'immediate' | 'optimal' | 'spread'>('optimal');
  const [spreadDays, setSpreadDays] = useState(7);
  const [includeMockups, setIncludeMockups] = useState(true);
  const [linkType, setLinkType] = useState<LinkType>('product');
  const [customUrl, setCustomUrl] = useState('');
  const [selectedLandingPage, setSelectedLandingPage] = useState('');
  const [selectedQuiz, setSelectedQuiz] = useState('');
  const [copyMode, setCopyMode] = useState<'auto' | 'random'>('auto');
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const queryClient = useQueryClient();

  // Fetch quotes with approved assets
  const { data: quotesData, isLoading: loadingQuotes } = useQuery({
    queryKey: ['bulk-create-quotes'],
    queryFn: async () => {
      const res = await fetch('/api/pinterest/bulk-create');
      if (!res.ok) throw new Error('Failed to fetch quotes');
      return res.json();
    },
    enabled: isOpen,
  });

  // Fetch landing pages
  const { data: landingPagesData } = useQuery({
    queryKey: ['landing-pages-list'],
    queryFn: async () => {
      const res = await fetch('/api/landing-pages');
      if (!res.ok) return { pages: [] };
      return res.json();
    },
    enabled: isOpen && linkType === 'landing_page',
  });

  // Fetch quizzes
  const { data: quizzesData } = useQuery({
    queryKey: ['quizzes-list'],
    queryFn: async () => {
      const res = await fetch('/api/quiz');
      if (!res.ok) return { quizzes: [] };
      return res.json();
    },
    enabled: isOpen && linkType === 'quiz',
  });

  // Fetch copy templates
  const { data: templatesData } = useQuery({
    queryKey: ['copy-templates'],
    queryFn: async () => {
      const res = await fetch('/api/copy-templates');
      if (!res.ok) return { templates: [] };
      return res.json();
    },
    enabled: isOpen,
  });

  const copyTemplates: CopyTemplate[] = templatesData?.templates || [];

  // Bulk create mutation
  const bulkCreateMutation = useMutation({
    mutationFn: async (data: {
      quote_ids: string[];
      board_id: string;
      schedule_strategy: string;
      spread_days?: number;
      include_mockups: boolean;
      link_type: LinkType;
      custom_url?: string;
      landing_page_slug?: string;
      quiz_slug?: string;
      copy_template_ids?: string[]; // Array of template IDs for random selection
    }) => {
      const res = await fetch('/api/pinterest/bulk-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create pins');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pinterest', 'pins'] });
      if (data.success) {
        // Show success state briefly, then close
        setTimeout(() => {
          setIsOpen(false);
          resetForm();
        }, 2000);
      }
    },
  });

  const quotes: Quote[] = quotesData?.quotes || [];

  const resetForm = () => {
    setSelectedQuotes([]);
    setBoardId('');
    setStrategy('optimal');
    setSpreadDays(7);
    setIncludeMockups(true);
    setLinkType('product');
    setCustomUrl('');
    setSelectedLandingPage('');
    setSelectedQuiz('');
    setCopyMode('auto');
    setSelectedTemplateIds([]);
  };

  const toggleQuote = (quoteId: string) => {
    setSelectedQuotes((prev) =>
      prev.includes(quoteId)
        ? prev.filter((id) => id !== quoteId)
        : [...prev, quoteId]
    );
  };

  const selectAllQuotes = () => {
    setSelectedQuotes(quotes.map((q) => q.id));
  };

  const deselectAllQuotes = () => {
    setSelectedQuotes([]);
  };

  const handleCreate = () => {
    if (!boardId || selectedQuotes.length === 0) return;

    // Validate link options
    if (linkType === 'custom' && !customUrl) return;
    if (linkType === 'landing_page' && !selectedLandingPage) return;
    if (linkType === 'quiz' && !selectedQuiz) return;

    // Validate template selection if in random mode
    if (copyMode === 'random' && selectedTemplateIds.length === 0) return;

    bulkCreateMutation.mutate({
      quote_ids: selectedQuotes,
      board_id: boardId,
      schedule_strategy: strategy,
      spread_days: strategy === 'spread' ? spreadDays : undefined,
      include_mockups: includeMockups,
      link_type: linkType,
      custom_url: linkType === 'custom' ? customUrl : undefined,
      landing_page_slug: linkType === 'landing_page' ? selectedLandingPage : undefined,
      quiz_slug: linkType === 'quiz' ? selectedQuiz : undefined,
      copy_template_ids: copyMode === 'random' && selectedTemplateIds.length > 0 ? selectedTemplateIds : undefined,
    });
  };

  const toggleTemplate = (templateId: string) => {
    setSelectedTemplateIds((prev) =>
      prev.includes(templateId)
        ? prev.filter((id) => id !== templateId)
        : [...prev, templateId]
    );
  };

  const selectAllTemplates = () => {
    setSelectedTemplateIds(copyTemplates.map((t) => t.id));
  };

  const landingPages = landingPagesData?.pages || [];
  const quizzes = quizzesData?.quizzes || [];

  const totalImages = selectedQuotes.reduce((acc, quoteId) => {
    const quote = quotes.find((q) => q.id === quoteId);
    if (!quote) return acc;
    return acc + quote.assetCount + (includeMockups ? quote.mockupCount : 0);
  }, 0);

  const getCollectionColor = (collection: string) => {
    switch (collection) {
      case 'grounding':
        return 'bg-green-100 text-green-800';
      case 'wholeness':
        return 'bg-blue-100 text-blue-800';
      case 'growth':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Bulk Create Pins
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          resetForm();
        }}
        title="Bulk Create Pinterest Pins"
        size="lg"
      >
        {bulkCreateMutation.isSuccess && bulkCreateMutation.data?.success ? (
          <div className="py-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-medium mb-2">Pins Created!</h3>
            <p className="text-[var(--color-text-secondary)]">
              {bulkCreateMutation.data.created} pins have been created
              {bulkCreateMutation.data.failed > 0 && ` (${bulkCreateMutation.data.failed} failed)`}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Quote Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Select Quotes with Approved Assets</Label>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAllQuotes}
                    disabled={quotes.length === 0}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={deselectAllQuotes}
                    disabled={selectedQuotes.length === 0}
                  >
                    Clear
                  </Button>
                </div>
              </div>

              {loadingQuotes ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-[var(--color-text-tertiary)]" />
                </div>
              ) : quotes.length === 0 ? (
                <div className="text-center py-8 text-[var(--color-text-secondary)] border rounded-lg">
                  <Image className="h-8 w-8 mx-auto mb-2 text-[var(--color-text-tertiary)]" />
                  <p>No quotes with approved Pinterest assets found.</p>
                  <p className="text-sm mt-1">Approve some assets in the Assets library first.</p>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto border rounded-lg divide-y">
                  {quotes.map((quote) => (
                    <div
                      key={quote.id}
                      className={`flex items-center gap-3 p-3 cursor-pointer transition-colors hover:bg-[var(--color-bg-secondary)] ${
                        selectedQuotes.includes(quote.id) ? 'bg-sage/10' : ''
                      }`}
                      onClick={() => toggleQuote(quote.id)}
                    >
                      <button
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          selectedQuotes.includes(quote.id)
                            ? 'bg-sage border-sage text-white'
                            : 'border-gray-300'
                        }`}
                      >
                        {selectedQuotes.includes(quote.id) && (
                          <Check className="h-3 w-3" />
                        )}
                      </button>
                      {quote.previewUrl && (
                        <img
                          src={quote.previewUrl}
                          alt=""
                          className="w-10 h-10 rounded object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{quote.text}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="default"
                            className={`text-xs ${getCollectionColor(quote.collection)}`}
                          >
                            {quote.collection}
                          </Badge>
                          <span className="text-xs text-[var(--color-text-tertiary)]">
                            {quote.assetCount} assets
                            {quote.mockupCount > 0 && `, ${quote.mockupCount} mockups`}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Board Selection */}
            <div>
              <Label>Target Board</Label>
              <Select
                value={boardId}
                onChange={(value) => setBoardId(typeof value === 'string' ? value : '')}
                options={[
                  { value: '', label: 'Select a board...' },
                  ...boards.map((board) => ({
                    value: board.id,
                    label: `${board.name} (${board.pin_count} pins)`,
                  })),
                ]}
              />
            </div>

            {/* Link Destination */}
            <div>
              <Label>Link Destination</Label>
              <p className="text-xs text-[var(--color-text-tertiary)] mb-2">
                Where should pins link to when clicked?
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                {[
                  { value: 'product', label: 'Product', icon: ShoppingBag, description: 'Quote product link' },
                  { value: 'custom', label: 'Custom URL', icon: ExternalLink, description: 'Any URL' },
                  { value: 'landing_page', label: 'Landing Page', icon: FileText, description: 'Your pages' },
                  { value: 'quiz', label: 'Quiz', icon: HelpCircle, description: 'Lead capture' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                      linkType === option.value
                        ? 'border-sage bg-sage/10 ring-1 ring-sage'
                        : 'border-[var(--color-border-primary)] hover:border-sage/50'
                    }`}
                    onClick={() => setLinkType(option.value as LinkType)}
                  >
                    <option.icon className="h-4 w-4 mb-1" />
                    <p className="text-xs font-medium">{option.label}</p>
                    <p className="text-xs text-[var(--color-text-tertiary)]">{option.description}</p>
                  </button>
                ))}
              </div>

              {/* Custom URL Input */}
              {linkType === 'custom' && (
                <Input
                  type="url"
                  placeholder="https://your-shop.com/collection/..."
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                />
              )}

              {/* Landing Page Select */}
              {linkType === 'landing_page' && (
                <Select
                  value={selectedLandingPage}
                  onChange={(value) => setSelectedLandingPage(typeof value === 'string' ? value : '')}
                  options={[
                    { value: '', label: 'Select a landing page...' },
                    ...landingPages.map((page: { slug: string; title: string }) => ({
                      value: page.slug,
                      label: page.title,
                    })),
                  ]}
                />
              )}

              {/* Quiz Select */}
              {linkType === 'quiz' && (
                <Select
                  value={selectedQuiz}
                  onChange={(value) => setSelectedQuiz(typeof value === 'string' ? value : '')}
                  options={[
                    { value: '', label: 'Select a quiz...' },
                    ...quizzes.map((quiz: { slug: string; title: string }) => ({
                      value: quiz.slug,
                      label: quiz.title,
                    })),
                  ]}
                />
              )}
            </div>

            {/* Scheduling Strategy */}
            <div>
              <Label>Scheduling Strategy</Label>
              <div className="grid grid-cols-3 gap-3 mt-2">
                {[
                  {
                    value: 'immediate',
                    label: 'Immediate',
                    icon: Zap,
                    description: 'Create as drafts',
                  },
                  {
                    value: 'optimal',
                    label: 'Optimal Times',
                    icon: Clock,
                    description: '8-11 PM daily',
                  },
                  {
                    value: 'spread',
                    label: 'Spread',
                    icon: Calendar,
                    description: 'Distribute evenly',
                  },
                ].map((option) => (
                  <Card
                    key={option.value}
                    hoverable
                    className={`cursor-pointer transition-all ${
                      strategy === option.value
                        ? 'ring-2 ring-sage border-sage'
                        : ''
                    }`}
                    onClick={() => setStrategy(option.value as typeof strategy)}
                  >
                    <CardContent className="p-3 text-center">
                      <option.icon className="h-5 w-5 mx-auto mb-1" />
                      <p className="text-sm font-medium">{option.label}</p>
                      <p className="text-xs text-[var(--color-text-tertiary)]">
                        {option.description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Spread Days Input */}
            {strategy === 'spread' && (
              <div>
                <Label>Spread Over (days)</Label>
                <Input
                  type="number"
                  value={spreadDays}
                  onChange={(e) => setSpreadDays(parseInt(e.target.value) || 7)}
                  min={1}
                  max={30}
                  className="mt-1"
                />
                <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                  {totalImages > 0 && (
                    <>
                      ~{Math.ceil(totalImages / spreadDays)} pins per day over {spreadDays} days
                    </>
                  )}
                </p>
              </div>
            )}

            {/* Include Mockups Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <Label>Include Mockups</Label>
                <p className="text-xs text-[var(--color-text-tertiary)]">
                  Also create pins from approved room mockups
                </p>
              </div>
              <button
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  includeMockups ? 'bg-sage' : 'bg-gray-300'
                }`}
                onClick={() => setIncludeMockups(!includeMockups)}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    includeMockups ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </div>

            {/* Copy Template Selection */}
            <div>
              <Label>Pin Copy Style</Label>
              <p className="text-xs text-[var(--color-text-tertiary)] mb-2">
                How should titles and descriptions be generated?
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                    copyMode === 'auto'
                      ? 'border-sage bg-sage/10 ring-1 ring-sage'
                      : 'border-[var(--color-border-primary)] hover:border-sage/50'
                  }`}
                  onClick={() => {
                    setCopyMode('auto');
                    setSelectedTemplateIds([]);
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-sm font-medium">Auto-Generate</span>
                  </div>
                  <p className="text-xs text-[var(--color-text-tertiary)]">
                    AI creates unique copy for each pin
                  </p>
                </button>
                <button
                  type="button"
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                    copyMode === 'random'
                      ? 'border-sage bg-sage/10 ring-1 ring-sage'
                      : 'border-[var(--color-border-primary)] hover:border-sage/50'
                  }`}
                  onClick={() => {
                    if (copyTemplates.length > 0) {
                      setCopyMode('random');
                      // Auto-select all templates when switching to random mode
                      setSelectedTemplateIds(copyTemplates.map((t) => t.id));
                    }
                  }}
                  disabled={copyTemplates.length === 0}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Shuffle className="h-4 w-4" />
                    <span className="text-sm font-medium">Random Templates</span>
                  </div>
                  <p className="text-xs text-[var(--color-text-tertiary)]">
                    {copyTemplates.length > 0 ? 'Randomly pick from selected' : 'No templates saved yet'}
                  </p>
                </button>
              </div>

              {/* Template Multi-Select */}
              {copyMode === 'random' && copyTemplates.length > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-[var(--color-text-secondary)]">
                      Select templates to randomize ({selectedTemplateIds.length} selected)
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={selectAllTemplates}
                      disabled={selectedTemplateIds.length === copyTemplates.length}
                    >
                      Select All
                    </Button>
                  </div>
                  <div className="max-h-32 overflow-y-auto border rounded-lg divide-y">
                    {copyTemplates.map((template) => (
                      <div
                        key={template.id}
                        className={`flex items-center gap-2 p-2 cursor-pointer transition-colors hover:bg-[var(--color-bg-secondary)] ${
                          selectedTemplateIds.includes(template.id) ? 'bg-sage/10' : ''
                        }`}
                        onClick={() => toggleTemplate(template.id)}
                      >
                        <button
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                            selectedTemplateIds.includes(template.id)
                              ? 'bg-sage border-sage text-white'
                              : 'border-gray-300'
                          }`}
                        >
                          {selectedTemplateIds.includes(template.id) && (
                            <Check className="h-3 w-3" />
                          )}
                        </button>
                        <span className="text-sm flex-1 truncate">
                          {template.name}
                          {template.collection && (
                            <Badge
                              variant="default"
                              className={`ml-2 text-xs ${getCollectionColor(template.collection)}`}
                            >
                              {template.collection}
                            </Badge>
                          )}
                        </span>
                        {template.avg_engagement_rate && (
                          <span className="text-xs text-[var(--color-text-tertiary)]">
                            {(template.avg_engagement_rate * 100).toFixed(1)}% eng
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Summary */}
            {selectedQuotes.length > 0 && (
              <div className="p-3 bg-[var(--color-bg-secondary)] rounded-lg">
                <p className="text-sm font-medium">Summary</p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {selectedQuotes.length} quotes selected = {totalImages} pins to create
                </p>
              </div>
            )}

            {/* Error Display */}
            {bulkCreateMutation.error && (
              <p className="text-sm text-red-500">
                {bulkCreateMutation.error instanceof Error
                  ? bulkCreateMutation.error.message
                  : 'Failed to create pins'}
              </p>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={
                  selectedQuotes.length === 0 ||
                  !boardId ||
                  bulkCreateMutation.isPending
                }
              >
                {bulkCreateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating {totalImages} pins...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create {totalImages} Pins
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
