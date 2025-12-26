'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent, Button, Input, Label, Textarea } from '@/components/ui';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Pin,
  Mail,
  Tag,
  Palette,
  Lock,
  Unlock,
  TrendingUp,
  Target,
  Users,
  Search,
  RefreshCw,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type CampaignType = 'pinterest' | 'pinterest-ads' | 'email' | 'coupon';

interface CampaignData {
  type: CampaignType | null;
  templateId: string | null;
  name: string;
  description: string;
  collection: 'grounding' | 'wholeness' | 'growth' | 'all';
  startDate: string;
  endDate: string;
  boards: string[];
  pinCount: number;
  schedule: 'daily' | 'weekly' | 'custom';
  dailyBudget: number;
}

interface TemplateWithLockStatus {
  id: string;
  name: string;
  description: string | null;
  objective: string;
  default_daily_budget: number;
  targeting_type: 'interest' | 'keyword' | 'retargeting' | 'lookalike';
  phase: number;
  is_recommended: boolean;
  is_locked: boolean;
  lock_reason: string | null;
  unlock_requirements: {
    sales_needed?: number;
    purchasers_needed?: number;
    requires_pixel?: boolean;
    requires_audience?: string;
  } | null;
}

interface TemplateData {
  phase1: TemplateWithLockStatus[];
  phase2: TemplateWithLockStatus[];
  phase3: TemplateWithLockStatus[];
  milestones: {
    total_sales: number;
    total_purchasers: number;
  };
  progress: {
    phase2Progress: number;
    phase3Progress: number;
    nextMilestone: string;
  };
}

const campaignTypes = [
  {
    id: 'pinterest' as CampaignType,
    title: 'Pinterest Organic',
    description: 'Schedule pins across your boards with automated publishing',
    icon: Pin,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
  {
    id: 'pinterest-ads' as CampaignType,
    title: 'Pinterest Ads',
    description: 'Create paid campaigns with targeting templates',
    icon: Target,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  {
    id: 'email' as CampaignType,
    title: 'Email Campaign',
    description: 'Send targeted emails to your audience via Klaviyo',
    icon: Mail,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  {
    id: 'coupon' as CampaignType,
    title: 'Coupon Campaign',
    description: 'Create discount codes and track redemptions',
    icon: Tag,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
];

const collections = [
  { id: 'all', label: 'All Collections', description: 'Mix content from all collections' },
  { id: 'grounding', label: 'Grounding', description: 'Calm, peaceful, centered quotes' },
  { id: 'wholeness', label: 'Wholeness', description: 'Self-love, acceptance, healing quotes' },
  { id: 'growth', label: 'Growth', description: 'Motivation, progress, change quotes' },
];

const scheduleOptions = [
  { id: 'daily', label: 'Daily', description: '1 pin per day' },
  { id: 'weekly', label: 'Weekly', description: '3 pins per week' },
  { id: 'custom', label: 'Custom', description: 'Set your own schedule' },
];

const targetingTypeIcons: Record<string, typeof Target> = {
  interest: Users,
  keyword: Search,
  retargeting: RefreshCw,
  lookalike: Users,
};

function TemplateCard({
  template,
  isSelected,
  onSelect,
}: {
  template: TemplateWithLockStatus;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const Icon = targetingTypeIcons[template.targeting_type] || Target;

  return (
    <button
      onClick={template.is_locked ? undefined : onSelect}
      disabled={template.is_locked}
      className={cn(
        'p-4 rounded-lg border-2 text-left transition-all w-full',
        template.is_locked
          ? 'border-transparent bg-elevated opacity-60 cursor-not-allowed'
          : isSelected
          ? 'border-purple-300 bg-purple-50'
          : 'border-transparent bg-elevated hover:border-purple-200 cursor-pointer'
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center',
              template.is_locked ? 'bg-gray-100' : 'bg-purple-100'
            )}
          >
            {template.is_locked ? (
              <Lock className="w-4 h-4 text-gray-400" />
            ) : (
              <Icon className="w-4 h-4 text-purple-600" />
            )}
          </div>
          <div>
            <h4 className="font-medium text-body-sm">{template.name}</h4>
            <p className="text-caption text-[var(--color-text-tertiary)] capitalize">
              {template.targeting_type.replace('_', ' ')}
            </p>
          </div>
        </div>
        {template.is_recommended && !template.is_locked && (
          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
        )}
        {isSelected && !template.is_locked && (
          <Check className="w-5 h-5 text-purple-600" />
        )}
      </div>
      <p className="text-caption text-[var(--color-text-secondary)] mb-2">
        {template.description}
      </p>
      <div className="flex items-center justify-between">
        <span className="text-caption font-medium">
          ${template.default_daily_budget.toFixed(2)}/day
        </span>
        {template.is_locked && template.lock_reason && (
          <span className="text-caption text-amber-600">{template.lock_reason}</span>
        )}
      </div>
    </button>
  );
}

function PhaseSection({
  phase,
  title,
  templates,
  selectedTemplateId,
  onSelectTemplate,
  isUnlocked,
  progress,
}: {
  phase: number;
  title: string;
  templates: TemplateWithLockStatus[];
  selectedTemplateId: string | null;
  onSelectTemplate: (id: string) => void;
  isUnlocked: boolean;
  progress?: number;
}) {
  if (templates.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isUnlocked ? (
            <Unlock className="w-4 h-4 text-green-600" />
          ) : (
            <Lock className="w-4 h-4 text-gray-400" />
          )}
          <h3 className="text-h4 font-medium">{title}</h3>
        </div>
        {!isUnlocked && progress !== undefined && (
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-caption text-[var(--color-text-tertiary)]">
              {Math.round(progress)}%
            </span>
          </div>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            isSelected={selectedTemplateId === template.id}
            onSelect={() => onSelectTemplate(template.id)}
          />
        ))}
      </div>
    </div>
  );
}

function CampaignWizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [templateData, setTemplateData] = useState<TemplateData | null>(null);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [campaign, setCampaign] = useState<CampaignData>({
    type: null,
    templateId: null,
    name: '',
    description: '',
    collection: 'all',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    boards: [],
    pinCount: 30,
    schedule: 'daily',
    dailyBudget: 5,
  });

  // Read type from URL params on mount
  useEffect(() => {
    const typeParam = searchParams.get('type') as CampaignType | null;
    if (typeParam && ['pinterest', 'pinterest-ads', 'email', 'coupon'].includes(typeParam)) {
      setCampaign((prev) => ({ ...prev, type: typeParam }));
      setStep(2); // Skip to step 2 if type is pre-selected
    }
  }, [searchParams]);

  // Fetch templates when pinterest-ads is selected
  useEffect(() => {
    if (campaign.type === 'pinterest-ads' && !templateData) {
      setIsLoadingTemplates(true);
      fetch('/api/campaign-templates')
        .then((res) => res.json())
        .then((data) => {
          setTemplateData(data);
          setIsLoadingTemplates(false);
        })
        .catch((err) => {
          console.error('Failed to fetch templates:', err);
          setIsLoadingTemplates(false);
        });
    }
  }, [campaign.type, templateData]);

  // Update budget when template is selected
  useEffect(() => {
    if (campaign.templateId && templateData) {
      const allTemplates = [
        ...templateData.phase1,
        ...templateData.phase2,
        ...templateData.phase3,
      ];
      const selectedTemplate = allTemplates.find((t) => t.id === campaign.templateId);
      if (selectedTemplate) {
        setCampaign((prev) => ({
          ...prev,
          dailyBudget: selectedTemplate.default_daily_budget,
        }));
      }
    }
  }, [campaign.templateId, templateData]);

  const isPinterestAds = campaign.type === 'pinterest-ads';
  const totalSteps = isPinterestAds ? 3 : 4;

  const canProceed = () => {
    switch (step) {
      case 1:
        return campaign.type !== null;
      case 2:
        if (isPinterestAds) {
          return campaign.templateId !== null;
        }
        return campaign.name.trim().length > 0;
      case 3:
        if (isPinterestAds) {
          return campaign.name.trim().length > 0;
        }
        return campaign.collection !== null;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < totalSteps && canProceed()) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      if (isPinterestAds && campaign.templateId) {
        // Create Pinterest Ads campaign via API
        const response = await fetch('/api/pinterest/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateId: campaign.templateId,
            name: campaign.name,
            dailyBudget: campaign.dailyBudget,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create campaign');
        }
      } else {
        // Simulate API call for other campaign types
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      router.push('/dashboard/campaigns');
    } catch (error) {
      console.error('Failed to create campaign:', error);
      setIsSubmitting(false);
    }
  };

  const selectedType = campaignTypes.find((t) => t.id === campaign.type);

  const getSelectedTemplate = () => {
    if (!templateData || !campaign.templateId) return null;
    const allTemplates = [
      ...templateData.phase1,
      ...templateData.phase2,
      ...templateData.phase3,
    ];
    return allTemplates.find((t) => t.id === campaign.templateId);
  };

  const getStepLabels = () => {
    if (isPinterestAds) {
      return ['Type', 'Template', 'Details'];
    }
    return ['Type', 'Details', 'Content', 'Schedule'];
  };

  const stepLabels = getStepLabels();

  return (
    <>
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center text-body-sm font-medium transition-colors',
                  s < step
                    ? 'bg-sage text-white'
                    : s === step
                    ? 'bg-sage text-white'
                    : 'bg-elevated text-[var(--color-text-tertiary)]'
                )}
              >
                {s < step ? <Check className="w-5 h-5" /> : s}
              </div>
              {s < totalSteps && (
                <div
                  className={cn(
                    'w-full h-1 mx-2 rounded transition-colors',
                    s < step ? 'bg-sage' : 'bg-elevated'
                  )}
                  style={{ width: '80px' }}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-caption text-[var(--color-text-secondary)]">
          {stepLabels.map((label, i) => (
            <span key={i}>{label}</span>
          ))}
        </div>
      </div>

      {/* Step 1: Campaign Type */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-h2 mb-6">Choose campaign type</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {campaignTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = campaign.type === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => setCampaign({ ...campaign, type: type.id, templateId: null })}
                  className={cn(
                    'p-6 rounded-xl border-2 text-left transition-all cursor-pointer',
                    isSelected
                      ? `${type.borderColor} ${type.bgColor}`
                      : 'border-transparent bg-elevated hover:border-sage/30'
                  )}
                >
                  <div
                    className={cn(
                      'w-12 h-12 rounded-lg flex items-center justify-center mb-4',
                      isSelected ? type.bgColor : 'bg-surface'
                    )}
                  >
                    <Icon className={cn('w-6 h-6', type.color)} />
                  </div>
                  <h3 className="text-h3 mb-2">{type.title}</h3>
                  <p className="text-body-sm text-[var(--color-text-secondary)]">
                    {type.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2 for Pinterest Ads: Template Selection */}
      {step === 2 && isPinterestAds && (
        <div className="space-y-6">
          <div>
            <h2 className="text-h2 mb-2">Choose a campaign template</h2>
            <p className="text-body-sm text-[var(--color-text-secondary)]">
              Templates unlock as you reach sales milestones
            </p>
          </div>

          {isLoadingTemplates ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse h-32 bg-elevated rounded-lg" />
              ))}
            </div>
          ) : templateData ? (
            <>
              {/* Milestone Progress */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-sage" />
                      <span className="font-medium">Your Progress</span>
                    </div>
                    <span className="text-body-sm text-[var(--color-text-secondary)]">
                      {templateData.milestones.total_sales} sales |{' '}
                      {templateData.milestones.total_purchasers} purchasers
                    </span>
                  </div>
                  <p className="text-caption text-[var(--color-text-tertiary)] mt-2">
                    {templateData.progress.nextMilestone}
                  </p>
                </CardContent>
              </Card>

              {/* Phase 1: Foundation */}
              <PhaseSection
                phase={1}
                title="Phase 1: Foundation"
                templates={templateData.phase1}
                selectedTemplateId={campaign.templateId}
                onSelectTemplate={(id) => setCampaign({ ...campaign, templateId: id })}
                isUnlocked={true}
              />

              {/* Phase 2: Growth (unlocks at 50 sales) */}
              <PhaseSection
                phase={2}
                title="Phase 2: Growth (50+ sales)"
                templates={templateData.phase2}
                selectedTemplateId={campaign.templateId}
                onSelectTemplate={(id) => setCampaign({ ...campaign, templateId: id })}
                isUnlocked={templateData.milestones.total_sales >= 50}
                progress={templateData.progress.phase2Progress}
              />

              {/* Phase 3: Scale (unlocks at 100 sales) */}
              <PhaseSection
                phase={3}
                title="Phase 3: Scale (100+ sales)"
                templates={templateData.phase3}
                selectedTemplateId={campaign.templateId}
                onSelectTemplate={(id) => setCampaign({ ...campaign, templateId: id })}
                isUnlocked={templateData.milestones.total_sales >= 100}
                progress={templateData.progress.phase3Progress}
              />
            </>
          ) : (
            <div className="p-8 text-center text-[var(--color-text-secondary)]">
              Failed to load templates. Please try again.
            </div>
          )}
        </div>
      )}

      {/* Step 2 for other types: Campaign Details */}
      {step === 2 && !isPinterestAds && (
        <div className="max-w-xl space-y-6">
          <h2 className="text-h2 mb-6">Campaign details</h2>

          {selectedType && (
            <div className={cn('p-4 rounded-lg flex items-center gap-3', selectedType.bgColor)}>
              <selectedType.icon className={cn('w-5 h-5', selectedType.color)} />
              <span className="font-medium">{selectedType.title}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Campaign Name</Label>
            <Input
              id="name"
              placeholder="e.g., Summer Wellness Series"
              value={campaign.name}
              onChange={(e) => setCampaign({ ...campaign, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              rows={3}
              placeholder="Describe the campaign's goals and target audience..."
              value={campaign.description}
              onChange={(e) => setCampaign({ ...campaign, description: e.target.value })}
            />
          </div>
        </div>
      )}

      {/* Step 3 for Pinterest Ads: Details & Budget */}
      {step === 3 && isPinterestAds && (
        <div className="max-w-xl space-y-6">
          <h2 className="text-h2 mb-6">Campaign details</h2>

          {getSelectedTemplate() && (
            <div className="p-4 rounded-lg bg-purple-50 flex items-center gap-3">
              <Target className="w-5 h-5 text-purple-600" />
              <div>
                <span className="font-medium">{getSelectedTemplate()?.name}</span>
                <p className="text-caption text-[var(--color-text-secondary)]">
                  {getSelectedTemplate()?.description}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Campaign Name</Label>
            <Input
              id="name"
              placeholder="e.g., Dec-MH-Core-Traffic"
              value={campaign.name}
              onChange={(e) => setCampaign({ ...campaign, name: e.target.value })}
            />
            <p className="text-caption text-[var(--color-text-tertiary)]">
              Recommended format: Month-TemplateName
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget">Daily Budget ($)</Label>
            <Input
              id="budget"
              type="number"
              min={1}
              step={0.5}
              value={campaign.dailyBudget}
              onChange={(e) =>
                setCampaign({ ...campaign, dailyBudget: parseFloat(e.target.value) || 1 })
              }
            />
            <p className="text-caption text-[var(--color-text-tertiary)]">
              Default: ${getSelectedTemplate()?.default_daily_budget.toFixed(2)}/day
            </p>
          </div>

          {/* Summary */}
          <Card className="mt-8">
            <CardContent className="p-6">
              <h3 className="text-h3 mb-4">Campaign Summary</h3>
              <dl className="space-y-3 text-body-sm">
                <div className="flex justify-between">
                  <dt className="text-[var(--color-text-secondary)]">Template</dt>
                  <dd className="font-medium">{getSelectedTemplate()?.name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--color-text-secondary)]">Targeting</dt>
                  <dd className="font-medium capitalize">
                    {getSelectedTemplate()?.targeting_type.replace('_', ' ')}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--color-text-secondary)]">Objective</dt>
                  <dd className="font-medium capitalize">
                    {getSelectedTemplate()?.objective.toLowerCase()}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--color-text-secondary)]">Daily Budget</dt>
                  <dd className="font-medium">${campaign.dailyBudget.toFixed(2)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--color-text-secondary)]">Est. Monthly</dt>
                  <dd className="font-medium">${(campaign.dailyBudget * 30).toFixed(2)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3 for other types: Content Selection */}
      {step === 3 && !isPinterestAds && (
        <div className="space-y-6">
          <h2 className="text-h2 mb-6">Select content</h2>

          <div className="space-y-2">
            <Label>Collection Focus</Label>
            <p className="text-body-sm text-[var(--color-text-secondary)] mb-4">
              Choose which quote collection to feature in this campaign
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {collections.map((col) => (
                <button
                  key={col.id}
                  onClick={() =>
                    setCampaign({ ...campaign, collection: col.id as CampaignData['collection'] })
                  }
                  className={cn(
                    'p-4 rounded-lg border-2 text-left transition-all cursor-pointer',
                    campaign.collection === col.id
                      ? 'border-sage bg-sage-pale'
                      : 'border-transparent bg-elevated hover:border-sage/30'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Palette
                      className={cn(
                        'w-5 h-5',
                        campaign.collection === col.id
                          ? 'text-sage'
                          : 'text-[var(--color-text-tertiary)]'
                      )}
                    />
                    <div>
                      <h4 className="font-medium">{col.label}</h4>
                      <p className="text-caption text-[var(--color-text-secondary)]">
                        {col.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {campaign.type === 'pinterest' && (
            <div className="space-y-2">
              <Label>Number of Pins</Label>
              <div className="flex items-center gap-4">
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={campaign.pinCount}
                  onChange={(e) =>
                    setCampaign({ ...campaign, pinCount: parseInt(e.target.value) || 1 })
                  }
                  className="w-24"
                />
                <span className="text-body-sm text-[var(--color-text-secondary)]">
                  pins to schedule
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Schedule (only for non-Pinterest Ads) */}
      {step === 4 && !isPinterestAds && (
        <div className="space-y-6">
          <h2 className="text-h2 mb-6">Set schedule</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={campaign.startDate}
                onChange={(e) => setCampaign({ ...campaign, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={campaign.endDate}
                onChange={(e) => setCampaign({ ...campaign, endDate: e.target.value })}
              />
            </div>
          </div>

          {campaign.type === 'pinterest' && (
            <div className="space-y-2">
              <Label>Publishing Frequency</Label>
              <div className="grid gap-3 md:grid-cols-3">
                {scheduleOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() =>
                      setCampaign({ ...campaign, schedule: opt.id as CampaignData['schedule'] })
                    }
                    className={cn(
                      'p-4 rounded-lg border-2 text-left transition-all cursor-pointer',
                      campaign.schedule === opt.id
                        ? 'border-sage bg-sage-pale'
                        : 'border-transparent bg-elevated hover:border-sage/30'
                    )}
                  >
                    <h4 className="font-medium">{opt.label}</h4>
                    <p className="text-caption text-[var(--color-text-secondary)]">
                      {opt.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          <Card className="mt-8">
            <CardContent className="p-6">
              <h3 className="text-h3 mb-4">Campaign Summary</h3>
              <dl className="space-y-3 text-body-sm">
                <div className="flex justify-between">
                  <dt className="text-[var(--color-text-secondary)]">Type</dt>
                  <dd className="font-medium">{selectedType?.title}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--color-text-secondary)]">Name</dt>
                  <dd className="font-medium">{campaign.name || '--'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--color-text-secondary)]">Collection</dt>
                  <dd className="font-medium capitalize">{campaign.collection}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--color-text-secondary)]">Duration</dt>
                  <dd className="font-medium">
                    {campaign.startDate} to {campaign.endDate}
                  </dd>
                </div>
                {campaign.type === 'pinterest' && (
                  <>
                    <div className="flex justify-between">
                      <dt className="text-[var(--color-text-secondary)]">Pins</dt>
                      <dd className="font-medium">{campaign.pinCount}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-[var(--color-text-secondary)]">Frequency</dt>
                      <dd className="font-medium capitalize">{campaign.schedule}</dd>
                    </div>
                  </>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t">
        <div>
          {step === 1 ? (
            <Link href="/dashboard/campaigns">
              <Button variant="ghost">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </Link>
          ) : (
            <Button variant="ghost" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          )}
        </div>
        <div>
          {step < totalSteps ? (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Campaign'}
              {!isSubmitting && <Check className="ml-2 h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

export default function NewCampaignPage() {
  return (
    <PageContainer title="Create Campaign" description="Set up a new marketing campaign">
      <Suspense fallback={<div className="animate-pulse h-96 bg-elevated rounded-lg" />}>
        <CampaignWizardContent />
      </Suspense>
    </PageContainer>
  );
}
