'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent, Button, Input, Label } from '@/components/ui';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Pin,
  Mail,
  Tag,
  Calendar,
  Target,
  Palette,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type CampaignType = 'pinterest' | 'email' | 'coupon';

interface CampaignData {
  type: CampaignType | null;
  name: string;
  description: string;
  collection: 'grounding' | 'wholeness' | 'growth' | 'all';
  startDate: string;
  endDate: string;
  boards: string[];
  pinCount: number;
  schedule: 'daily' | 'weekly' | 'custom';
}

const campaignTypes = [
  {
    id: 'pinterest' as CampaignType,
    title: 'Pinterest Campaign',
    description: 'Schedule pins across your boards with automated publishing',
    icon: Pin,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
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

function CampaignWizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [campaign, setCampaign] = useState<CampaignData>({
    type: null,
    name: '',
    description: '',
    collection: 'all',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    boards: [],
    pinCount: 30,
    schedule: 'daily',
  });

  // Read type from URL params on mount
  useEffect(() => {
    const typeParam = searchParams.get('type') as CampaignType | null;
    if (typeParam && ['pinterest', 'email', 'coupon'].includes(typeParam)) {
      setCampaign((prev) => ({ ...prev, type: typeParam }));
      setStep(2); // Skip to step 2 if type is pre-selected
    }
  }, [searchParams]);

  const totalSteps = 4;

  const canProceed = () => {
    switch (step) {
      case 1:
        return campaign.type !== null;
      case 2:
        return campaign.name.trim().length > 0;
      case 3:
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
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // In a real app, this would save the campaign to the database
    // For now, redirect to the campaigns page
    router.push('/dashboard/campaigns');
  };

  const selectedType = campaignTypes.find((t) => t.id === campaign.type);

  return (
    <>
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {[1, 2, 3, 4].map((s) => (
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
              {s < 4 && (
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
          <span>Type</span>
          <span>Details</span>
          <span>Content</span>
          <span>Schedule</span>
        </div>
      </div>

      {/* Step 1: Campaign Type */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-h2 mb-6">Choose campaign type</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {campaignTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = campaign.type === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => setCampaign({ ...campaign, type: type.id })}
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

      {/* Step 2: Campaign Details */}
      {step === 2 && (
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
            <textarea
              id="description"
              className="w-full px-3 py-2 rounded-md border bg-surface text-body placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-sage/50"
              rows={3}
              placeholder="Describe the campaign's goals and target audience..."
              value={campaign.description}
              onChange={(e) => setCampaign({ ...campaign, description: e.target.value })}
            />
          </div>
        </div>
      )}

      {/* Step 3: Content Selection */}
      {step === 3 && (
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
                    <Palette className={cn(
                      'w-5 h-5',
                      campaign.collection === col.id ? 'text-sage' : 'text-[var(--color-text-tertiary)]'
                    )} />
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

      {/* Step 4: Schedule */}
      {step === 4 && (
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
                  <dd className="font-medium">{campaign.name || '—'}</dd>
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
    <PageContainer
      title="Create Campaign"
      description="Set up a new marketing campaign"
    >
      <Suspense fallback={<div className="animate-pulse h-96 bg-elevated rounded-lg" />}>
        <CampaignWizardContent />
      </Suspense>
    </PageContainer>
  );
}
