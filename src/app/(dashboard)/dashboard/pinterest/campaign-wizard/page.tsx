'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  Button,
  Badge,
  Input,
  Checkbox,
} from '@/components/ui';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Target,
  DollarSign,
  Image,
  FileCheck,
  Zap,
  AlertCircle,
  Users,
  Home,
  RefreshCw,
  Briefcase,
} from 'lucide-react';

interface CampaignTemplate {
  id: string;
  name: string;
  description: string;
  dailyBudget: number;
  objective: string;
  targeting: {
    interests?: string[];
    keywords?: string[];
    demographics?: { genders?: string[]; ages?: string[] };
    audienceType?: string;
    excludePurchasers?: boolean;
  };
}

interface Pin {
  id: string;
  pinterest_pin_id: string;
  title: string;
  image_url: string;
  status: string;
}

interface CreatedCampaign {
  campaign: { id: string; name: string; status: string };
  adGroup: { id: string; name: string };
  dbRecord: {
    id: string;
    name: string;
    template_id: string;
    daily_budget: number;
    status: string;
    pin_count: number;
  };
}

const STEPS = [
  { id: 'template', title: 'Select Template', icon: Target },
  { id: 'budget', title: 'Configure Budget', icon: DollarSign },
  { id: 'pins', title: 'Select Pins', icon: Image },
  { id: 'review', title: 'Review & Create', icon: FileCheck },
  { id: 'success', title: 'Success', icon: Check },
];

const TEMPLATE_ICONS: Record<string, typeof Target> = {
  'mh-core-traffic': Users,
  'hd-core-traffic': Home,
  'rt-site-visitors': RefreshCw,
  'b2b-therapists': Briefcase,
};

export default function CampaignWizardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Wizard state
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<CampaignTemplate | null>(null);
  const [customBudget, setCustomBudget] = useState<number | null>(null);
  const [customName, setCustomName] = useState('');
  const [selectedPins, setSelectedPins] = useState<string[]>([]);
  const [createdCampaign, setCreatedCampaign] = useState<CreatedCampaign | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch templates and campaigns
  const { data: campaignsData, isLoading: loadingTemplates } = useQuery({
    queryKey: ['pinterest', 'campaigns'],
    queryFn: async () => {
      const res = await fetch('/api/pinterest/campaigns');
      if (!res.ok) throw new Error('Failed to fetch campaigns');
      return res.json();
    },
  });

  // Fetch available pins
  const { data: pinsData, isLoading: loadingPins } = useQuery({
    queryKey: ['pinterest', 'available-pins'],
    queryFn: async () => {
      const res = await fetch('/api/pinterest/campaigns/placeholder/pins');
      if (!res.ok) throw new Error('Failed to fetch pins');
      return res.json();
    },
    enabled: currentStep === 2, // Only fetch when on pins step
  });

  // Create campaign mutation
  const createCampaignMutation = useMutation({
    mutationFn: async (data: {
      templateId: string;
      dailyBudget?: number;
      name?: string;
      pinIds?: string[];
    }) => {
      const res = await fetch('/api/pinterest/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create campaign');
      }
      return res.json();
    },
    onSuccess: (data) => {
      setCreatedCampaign(data);
      setCurrentStep(4); // Move to success step
      queryClient.invalidateQueries({ queryKey: ['pinterest', 'campaigns'] });
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  // Activate campaign mutation
  const activateCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const res = await fetch(`/api/pinterest/campaigns/${campaignId}/activate`, {
        method: 'POST',
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to activate campaign');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pinterest', 'campaigns'] });
      router.push('/dashboard/pinterest/ads');
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const templates: CampaignTemplate[] = campaignsData?.templates || [];
  const pins: Pin[] = pinsData?.pins || [];

  const handleNext = () => {
    setError(null);
    if (currentStep === 3) {
      // Create campaign
      if (!selectedTemplate) return;
      createCampaignMutation.mutate({
        templateId: selectedTemplate.id,
        dailyBudget: customBudget || undefined,
        name: customName || undefined,
        pinIds: selectedPins.length > 0 ? selectedPins : undefined,
      });
    } else {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return !!selectedTemplate;
      case 1:
        return true; // Budget is optional
      case 2:
        return true; // Pins are optional during creation
      case 3:
        return !!selectedTemplate;
      default:
        return false;
    }
  };

  const togglePin = (pinId: string) => {
    setSelectedPins((prev) =>
      prev.includes(pinId) ? prev.filter((id) => id !== pinId) : [...prev, pinId]
    );
  };

  const finalBudget = customBudget || selectedTemplate?.dailyBudget || 5;

  return (
    <PageContainer
      title="Campaign Wizard"
      description="Create a new Pinterest ad campaign"
      actions={
        <Link href="/dashboard/pinterest/ads">
          <Button variant="secondary">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Ads
          </Button>
        </Link>
      }
    >
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = index === currentStep;
            const isComplete = index < currentStep;

            return (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                    isComplete
                      ? 'bg-teal-600 border-teal-600 text-white'
                      : isActive
                      ? 'border-teal-600 text-teal-600'
                      : 'border-gray-300 text-gray-400'
                  }`}
                >
                  {isComplete ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <StepIcon className="h-5 w-5" />
                  )}
                </div>
                <span
                  className={`ml-2 text-sm font-medium hidden sm:inline ${
                    isActive ? 'text-charcoal' : 'text-gray-500'
                  }`}
                >
                  {step.title}
                </span>
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-12 sm:w-24 h-0.5 mx-2 sm:mx-4 ${
                      isComplete ? 'bg-teal-600' : 'bg-gray-300'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Error</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          {/* Step 1: Select Template */}
          {currentStep === 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Select a Campaign Template</h2>
              <p className="text-[var(--color-text-secondary)] mb-6">
                Choose a pre-configured campaign template based on your target audience.
              </p>

              {loadingTemplates ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {templates.map((template) => {
                    const TemplateIcon = TEMPLATE_ICONS[template.id] || Target;
                    const isSelected = selectedTemplate?.id === template.id;

                    return (
                      <div
                        key={template.id}
                        onClick={() => setSelectedTemplate(template)}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          isSelected
                            ? 'border-teal-600 bg-teal-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`p-2 rounded-lg ${
                              isSelected ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            <TemplateIcon className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold">{template.name}</h3>
                            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                              {template.description}
                            </p>
                            <div className="flex items-center gap-4 mt-3 text-sm">
                              <Badge variant={template.objective === 'CONVERSIONS' ? 'success' : 'default'}>
                                {template.objective}
                              </Badge>
                              <span className="text-[var(--color-text-secondary)]">
                                ${template.dailyBudget}/day
                              </span>
                            </div>
                            {template.targeting.interests && (
                              <div className="mt-3 flex flex-wrap gap-1">
                                {template.targeting.interests.slice(0, 3).map((interest) => (
                                  <span
                                    key={interest}
                                    className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600"
                                  >
                                    {interest}
                                  </span>
                                ))}
                                {template.targeting.interests.length > 3 && (
                                  <span className="px-2 py-0.5 text-xs text-gray-500">
                                    +{template.targeting.interests.length - 3} more
                                  </span>
                                )}
                              </div>
                            )}
                            {template.targeting.audienceType && (
                              <div className="mt-3">
                                <span className="px-2 py-0.5 bg-purple-100 rounded text-xs text-purple-700">
                                  Retargeting: {template.targeting.audienceType.replace('_', ' ')}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Configure Budget */}
          {currentStep === 1 && selectedTemplate && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Configure Your Budget</h2>
              <p className="text-[var(--color-text-secondary)] mb-6">
                Customize the daily budget and campaign name, or use the template defaults.
              </p>

              <div className="max-w-md space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Campaign Name</label>
                  <Input
                    placeholder={`${new Date().toLocaleDateString('en-US', { month: 'short' })}-${selectedTemplate.name}`}
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                  />
                  <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                    Leave blank to use auto-generated name
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Daily Budget</label>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">$</span>
                    <Input
                      type="number"
                      min={1}
                      max={1000}
                      step={1}
                      placeholder={String(selectedTemplate.dailyBudget)}
                      value={customBudget || ''}
                      onChange={(e) => setCustomBudget(e.target.value ? Number(e.target.value) : null)}
                      className="w-32"
                    />
                    <span className="text-[var(--color-text-secondary)]">per day</span>
                  </div>
                  <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                    Template default: ${selectedTemplate.dailyBudget}/day
                  </p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Estimated Monthly Spend</h4>
                  <p className="text-2xl font-bold text-teal-600">
                    ${(finalBudget * 30).toFixed(0)}
                  </p>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    Based on ${finalBudget}/day for 30 days
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Select Pins */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Select Pins to Promote</h2>
              <p className="text-[var(--color-text-secondary)] mb-6">
                Choose which published pins to include in your campaign. You can add more pins later.
              </p>

              {loadingPins ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                </div>
              ) : pins.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Image className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="font-medium mb-2">No Published Pins Available</h3>
                  <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                    You need at least one published pin to create promoted ads.
                  </p>
                  <Link href="/dashboard/assets">
                    <Button variant="secondary">Go to Assets</Button>
                  </Link>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-[var(--color-text-secondary)]">
                      {selectedPins.length} pin{selectedPins.length !== 1 ? 's' : ''} selected
                    </span>
                    {selectedPins.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={() => setSelectedPins([])}>
                        Clear Selection
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {pins.map((pin) => {
                      const isSelected = selectedPins.includes(pin.id);

                      return (
                        <div
                          key={pin.id}
                          onClick={() => togglePin(pin.id)}
                          className={`relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-teal-600 ring-2 ring-teal-200'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="aspect-square bg-gray-100">
                            <img
                              src={pin.image_url}
                              alt={pin.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="absolute top-2 right-2">
                            <Checkbox
                              checked={isSelected}
                              onChange={() => togglePin(pin.id)}
                              aria-label={`Select ${pin.title}`}
                            />
                          </div>
                          <div className="p-2">
                            <p className="text-sm font-medium truncate">{pin.title}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 4: Review & Create */}
          {currentStep === 3 && selectedTemplate && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Review Your Campaign</h2>
              <p className="text-[var(--color-text-secondary)] mb-6">
                Review your campaign settings before creating it on Pinterest.
              </p>

              <div className="space-y-6 max-w-lg">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-3">Campaign Details</h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-[var(--color-text-secondary)]">Template</dt>
                      <dd className="font-medium">{selectedTemplate.name}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-[var(--color-text-secondary)]">Name</dt>
                      <dd className="font-medium">
                        {customName || `${new Date().toLocaleDateString('en-US', { month: 'short' })}-${selectedTemplate.name}`}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-[var(--color-text-secondary)]">Objective</dt>
                      <dd>
                        <Badge variant={selectedTemplate.objective === 'CONVERSIONS' ? 'success' : 'default'}>
                          {selectedTemplate.objective}
                        </Badge>
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-[var(--color-text-secondary)]">Daily Budget</dt>
                      <dd className="font-medium">${finalBudget}/day</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-[var(--color-text-secondary)]">Selected Pins</dt>
                      <dd className="font-medium">{selectedPins.length}</dd>
                    </div>
                  </dl>
                </div>

                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-3">Targeting</h3>
                  {selectedTemplate.targeting.audienceType ? (
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      Retargeting: {selectedTemplate.targeting.audienceType.replace('_', ' ')}
                      {selectedTemplate.targeting.excludePurchasers && ' (excluding purchasers)'}
                    </p>
                  ) : (
                    <div className="space-y-2 text-sm">
                      {selectedTemplate.targeting.interests && (
                        <div>
                          <span className="text-[var(--color-text-secondary)]">Interests: </span>
                          {selectedTemplate.targeting.interests.join(', ')}
                        </div>
                      )}
                      {selectedTemplate.targeting.keywords && (
                        <div>
                          <span className="text-[var(--color-text-secondary)]">Keywords: </span>
                          {selectedTemplate.targeting.keywords.join(', ')}
                        </div>
                      )}
                      {selectedTemplate.targeting.demographics && (
                        <div>
                          <span className="text-[var(--color-text-secondary)]">Demographics: </span>
                          {selectedTemplate.targeting.demographics.genders?.join(', ')},{' '}
                          {selectedTemplate.targeting.demographics.ages?.join(', ')}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">Campaign will be created as Paused</p>
                      <p className="text-sm text-amber-700 mt-1">
                        After creation, you can review the campaign in Pinterest Ads and activate it when ready.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Success */}
          {currentStep === 4 && createdCampaign && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Campaign Created!</h2>
              <p className="text-[var(--color-text-secondary)] mb-6">
                Your campaign "{createdCampaign.dbRecord.name}" has been created on Pinterest.
              </p>

              <div className="max-w-md mx-auto p-4 bg-gray-50 rounded-lg mb-6">
                <dl className="space-y-2 text-left">
                  <div className="flex justify-between">
                    <dt className="text-[var(--color-text-secondary)]">Status</dt>
                    <dd>
                      <Badge variant="secondary">Paused</Badge>
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[var(--color-text-secondary)]">Daily Budget</dt>
                    <dd className="font-medium">${createdCampaign.dbRecord.daily_budget}/day</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[var(--color-text-secondary)]">Pins Added</dt>
                    <dd className="font-medium">{createdCampaign.dbRecord.pin_count}</dd>
                  </div>
                </dl>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={() => activateCampaignMutation.mutate(createdCampaign.dbRecord.id)}
                  disabled={activateCampaignMutation.isPending || createdCampaign.dbRecord.pin_count === 0}
                >
                  {activateCampaignMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Activating...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Activate Campaign
                    </>
                  )}
                </Button>
                <Link href="/dashboard/pinterest/ads">
                  <Button variant="secondary">View All Campaigns</Button>
                </Link>
              </div>

              {createdCampaign.dbRecord.pin_count === 0 && (
                <p className="text-sm text-amber-600 mt-4">
                  Add at least one pin before activating the campaign.
                </p>
              )}
            </div>
          )}
        </CardContent>

        {/* Navigation Footer */}
        {currentStep < 4 && (
          <CardFooter className="flex justify-between border-t p-4">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <Button
              onClick={handleNext}
              disabled={!canProceed() || createCampaignMutation.isPending}
            >
              {createCampaignMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : currentStep === 3 ? (
                <>
                  Create Campaign
                  <Check className="h-4 w-4 ml-2" />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </CardFooter>
        )}
      </Card>
    </PageContainer>
  );
}
