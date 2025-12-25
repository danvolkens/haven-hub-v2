'use client';

import { useState } from 'react';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '@/components/ui/modal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  FlaskConical,
  Play,
  Pause,
  Trophy,
  X,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

// Types
type TestStatus = 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';
type TestType =
  | 'pin_creative'
  | 'headline'
  | 'description'
  | 'hook'
  | 'cta'
  | 'audience'
  | 'schedule';
type PrimaryMetric =
  | 'ctr'
  | 'save_rate'
  | 'conversion_rate'
  | 'engagement_rate'
  | 'cpa'
  | 'roas';

interface ABTest {
  id: string;
  name: string;
  description: string | null;
  hypothesis: string | null;
  test_type: TestType;
  primary_metric: PrimaryMetric;
  status: TestStatus;
  confidence_threshold: number;
  minimum_sample_size: number;
  control_variant_id: string;
  test_variant_ids: string[];
  started_at: string | null;
  ended_at: string | null;
  winner_variant_id: string | null;
  winner_confidence: number | null;
  created_at: string;
}

interface ABTestVariant {
  id: string;
  name: string;
  is_control: boolean;
  traffic_percentage: number;
}

interface SignificanceResult {
  is_significant: boolean;
  confidence: number;
  p_value: number;
  z_score: number;
  lift: number;
  winner: 'control' | 'test' | 'none';
  sample_size_met: boolean;
}

// Status badge configuration
const STATUS_BADGES: Record<
  TestStatus,
  { variant: 'default' | 'success' | 'warning' | 'secondary'; label: string }
> = {
  draft: { variant: 'default', label: 'Draft' },
  running: { variant: 'success', label: 'Running' },
  paused: { variant: 'warning', label: 'Paused' },
  completed: { variant: 'secondary', label: 'Completed' },
  cancelled: { variant: 'secondary', label: 'Cancelled' },
};

const TEST_TYPE_LABELS: Record<TestType, string> = {
  pin_creative: 'Pin Creative',
  headline: 'Headline',
  description: 'Description',
  hook: 'Hook',
  cta: 'Call to Action',
  audience: 'Audience',
  schedule: 'Schedule',
};

const METRIC_LABELS: Record<PrimaryMetric, string> = {
  ctr: 'Click-Through Rate',
  save_rate: 'Save Rate',
  conversion_rate: 'Conversion Rate',
  engagement_rate: 'Engagement Rate',
  cpa: 'Cost Per Acquisition',
  roas: 'Return on Ad Spend',
};

// Create test wizard state
interface CreateTestForm {
  name: string;
  description: string;
  hypothesis: string;
  test_type: TestType;
  primary_metric: PrimaryMetric;
  confidence_threshold: number;
  minimum_sample_size: number;
  control_name: string;
  control_content_type: string;
  control_content_id: string;
  variant_name: string;
  variant_content_type: string;
  variant_content_id: string;
}

const initialFormState: CreateTestForm = {
  name: '',
  description: '',
  hypothesis: '',
  test_type: 'headline',
  primary_metric: 'ctr',
  confidence_threshold: 0.95,
  minimum_sample_size: 1000,
  control_name: 'Control',
  control_content_type: 'pin',
  control_content_id: '',
  variant_name: 'Variant A',
  variant_content_type: 'pin',
  variant_content_id: '',
};

export default function ABTestsPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<ABTest | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'draft' | 'completed'>(
    'active'
  );
  const [formData, setFormData] = useState<CreateTestForm>(initialFormState);
  const [createError, setCreateError] = useState<string | null>(null);

  // Fetch tests
  const { data, isLoading } = useQuery({
    queryKey: ['ab-tests'],
    queryFn: async () => {
      const response = await fetch('/api/ab-tests');
      if (!response.ok) throw new Error('Failed to fetch tests');
      return response.json();
    },
  });

  // Fetch test details with significance
  const { data: testDetails } = useQuery({
    queryKey: ['ab-test', selectedTest?.id],
    queryFn: async () => {
      if (!selectedTest) return null;
      const response = await fetch(
        `/api/ab-tests/${selectedTest.id}?results=true&significance=true`
      );
      if (!response.ok) throw new Error('Failed to fetch test details');
      return response.json();
    },
    enabled: !!selectedTest,
  });

  // Create test mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreateTestForm) => {
      const response = await fetch('/api/ab-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          description: data.description || undefined,
          hypothesis: data.hypothesis || undefined,
          test_type: data.test_type,
          primary_metric: data.primary_metric,
          confidence_threshold: data.confidence_threshold,
          minimum_sample_size: data.minimum_sample_size,
          control: {
            name: data.control_name,
            content_type: data.control_content_type,
            content_id: data.control_content_id || crypto.randomUUID(),
          },
          variants: [
            {
              name: data.variant_name,
              content_type: data.variant_content_type,
              content_id: data.variant_content_id || crypto.randomUUID(),
            },
          ],
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create test');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ab-tests'] });
      setIsCreateOpen(false);
      setFormData(initialFormState);
      setCreateError(null);
    },
    onError: (error: Error) => {
      console.error('Create test error:', error);
      setCreateError(error.message);
    },
  });

  // Action mutation (start, pause, resume, cancel, declare winner)
  const actionMutation = useMutation({
    mutationFn: async ({
      testId,
      action,
      winner_variant_id,
      confidence,
    }: {
      testId: string;
      action: string;
      winner_variant_id?: string;
      confidence?: number;
    }) => {
      const response = await fetch(`/api/ab-tests/${testId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, winner_variant_id, confidence }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || `Failed to ${action} test`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ab-tests'] });
      queryClient.invalidateQueries({ queryKey: ['ab-test', selectedTest?.id] });
    },
  });

  // Filter tests by status
  const tests: ABTest[] = data?.tests || [];
  const activeTests = tests.filter(
    (t) => t.status === 'running' || t.status === 'paused'
  );
  const draftTests = tests.filter((t) => t.status === 'draft');
  const completedTests = tests.filter(
    (t) => t.status === 'completed' || t.status === 'cancelled'
  );

  const getFilteredTests = () => {
    switch (activeTab) {
      case 'active':
        return activeTests;
      case 'draft':
        return draftTests;
      case 'completed':
        return completedTests;
      default:
        return tests;
    }
  };

  const formatConfidence = (value: number | null) => {
    if (value === null) return 'N/A';
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatLift = (lift: number) => {
    const sign = lift >= 0 ? '+' : '';
    return `${sign}${lift.toFixed(1)}%`;
  };

  return (
    <PageContainer
      title="A/B Tests"
      description="Test different creative variants to optimize engagement"
      actions={
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Test
        </Button>
      }
    >
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sage-pale rounded-lg">
              <FlaskConical className="h-5 w-5 text-sage" />
            </div>
            <div>
              <div className="text-sm text-[var(--color-text-secondary)]">
                Total Tests
              </div>
              <div className="text-2xl font-bold">{tests.length}</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Play className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-[var(--color-text-secondary)]">
                Running
              </div>
              <div className="text-2xl font-bold">
                {tests.filter((t) => t.status === 'running').length}
              </div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Trophy className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-[var(--color-text-secondary)]">
                Completed
              </div>
              <div className="text-2xl font-bold">
                {tests.filter((t) => t.status === 'completed').length}
              </div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Target className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-[var(--color-text-secondary)]">
                Winners Found
              </div>
              <div className="text-2xl font-bold">
                {tests.filter((t) => t.winner_variant_id).length}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="mb-4">
          <TabsTrigger value="active">
            Active ({activeTests.length})
          </TabsTrigger>
          <TabsTrigger value="draft">Drafts ({draftTests.length})</TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedTests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          {isLoading ? (
            <div className="text-center py-12 text-[var(--color-text-secondary)]">
              Loading...
            </div>
          ) : getFilteredTests().length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <FlaskConical className="h-12 w-12 text-[var(--color-text-tertiary)] mb-4" />
                <h3 className="text-h3 mb-2">
                  {activeTab === 'active'
                    ? 'No Active Tests'
                    : activeTab === 'draft'
                      ? 'No Draft Tests'
                      : 'No Completed Tests'}
                </h3>
                <p className="text-body text-[var(--color-text-secondary)] max-w-md mb-6">
                  {activeTab === 'active'
                    ? 'Start a new A/B test to compare different pin variants and discover what resonates best with your audience.'
                    : activeTab === 'draft'
                      ? 'Create a test draft to configure before launching.'
                      : 'Completed tests will appear here with their results.'}
                </p>
                {activeTab !== 'completed' && (
                  <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Create Test
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {getFilteredTests().map((test) => (
                <Card
                  key={test.id}
                  className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedTest(test)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-sage-pale rounded-lg">
                        <FlaskConical className="h-5 w-5 text-sage" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{test.name}</span>
                          <Badge variant={STATUS_BADGES[test.status].variant}>
                            {STATUS_BADGES[test.status].label}
                          </Badge>
                          {test.winner_variant_id && (
                            <Badge variant="success">
                              <Trophy className="h-3 w-3 mr-1" />
                              Winner Found
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-[var(--color-text-secondary)] mt-1">
                          {TEST_TYPE_LABELS[test.test_type]} -{' '}
                          {METRIC_LABELS[test.primary_metric]}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-sm text-[var(--color-text-secondary)]">
                          Confidence
                        </div>
                        <div className="font-semibold">
                          {formatConfidence(test.winner_confidence)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-[var(--color-text-secondary)]">
                          Created
                        </div>
                        <div className="font-semibold">
                          {new Date(test.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        {test.status === 'draft' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              actionMutation.mutate({
                                testId: test.id,
                                action: 'start',
                              })
                            }
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        {test.status === 'running' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              actionMutation.mutate({
                                testId: test.id,
                                action: 'pause',
                              })
                            }
                          >
                            <Pause className="h-4 w-4" />
                          </Button>
                        )}
                        {test.status === 'paused' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              actionMutation.mutate({
                                testId: test.id,
                                action: 'resume',
                              })
                            }
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        {(test.status === 'running' || test.status === 'paused') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              actionMutation.mutate({
                                testId: test.id,
                                action: 'cancel',
                              })
                            }
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Test Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create A/B Test"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <Label>Test Name</Label>
            <Input
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., Holiday Headline Test"
            />
          </div>

          <div>
            <Label>Description (optional)</Label>
            <Textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="What are you testing and why?"
              rows={2}
            />
          </div>

          <div>
            <Label>Hypothesis (optional)</Label>
            <Textarea
              value={formData.hypothesis}
              onChange={(e) =>
                setFormData({ ...formData, hypothesis: e.target.value })
              }
              placeholder="e.g., Using emotional headlines will increase CTR by 15%"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Test Type</Label>
              <Select
                value={formData.test_type}
                onChange={(value) =>
                  setFormData({ ...formData, test_type: (Array.isArray(value) ? value[0] : value) as TestType })
                }
                options={Object.entries(TEST_TYPE_LABELS).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
            </div>
            <div>
              <Label>Primary Metric</Label>
              <Select
                value={formData.primary_metric}
                onChange={(value) =>
                  setFormData({
                    ...formData,
                    primary_metric: (Array.isArray(value) ? value[0] : value) as PrimaryMetric,
                  })
                }
                options={Object.entries(METRIC_LABELS).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Confidence Threshold</Label>
              <Select
                value={String(formData.confidence_threshold)}
                onChange={(value) => {
                  const v = Array.isArray(value) ? value[0] : value;
                  setFormData({
                    ...formData,
                    confidence_threshold: parseFloat(v),
                  });
                }}
                options={[
                  { value: '0.90', label: '90%' },
                  { value: '0.95', label: '95% (Recommended)' },
                  { value: '0.99', label: '99%' },
                ]}
              />
            </div>
            <div>
              <Label>Minimum Sample Size</Label>
              <Input
                type="number"
                value={formData.minimum_sample_size}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    minimum_sample_size: parseInt(e.target.value) || 1000,
                  })
                }
                min={100}
              />
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h4 className="font-semibold mb-3">Control Variant</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={formData.control_name}
                  onChange={(e) =>
                    setFormData({ ...formData, control_name: e.target.value })
                  }
                  placeholder="Control"
                />
              </div>
              <div>
                <Label>Content Type</Label>
                <Select
                  value={formData.control_content_type}
                  onChange={(value) =>
                    setFormData({ ...formData, control_content_type: Array.isArray(value) ? value[0] : value })
                  }
                  options={[
                    { value: 'pin', label: 'Pin' },
                    { value: 'ad', label: 'Ad' },
                    { value: 'copy', label: 'Copy Template' },
                  ]}
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-semibold mb-3">Test Variant</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={formData.variant_name}
                  onChange={(e) =>
                    setFormData({ ...formData, variant_name: e.target.value })
                  }
                  placeholder="Variant A"
                />
              </div>
              <div>
                <Label>Content Type</Label>
                <Select
                  value={formData.variant_content_type}
                  onChange={(value) =>
                    setFormData({ ...formData, variant_content_type: Array.isArray(value) ? value[0] : value })
                  }
                  options={[
                    { value: 'pin', label: 'Pin' },
                    { value: 'ad', label: 'Ad' },
                    { value: 'copy', label: 'Copy Template' },
                  ]}
                />
              </div>
            </div>
          </div>

          {createError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {createError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="secondary" onClick={() => { setIsCreateOpen(false); setCreateError(null); }}>
              Cancel
            </Button>
            <Button
              onClick={() => { setCreateError(null); createMutation.mutate(formData); }}
              disabled={!formData.name || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Test'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Test Details Modal */}
      <Modal
        isOpen={!!selectedTest}
        onClose={() => setSelectedTest(null)}
        title={selectedTest?.name || 'Test Details'}
      >
        {selectedTest && testDetails && (
          <div className="space-y-6">
            {/* Status and Info */}
            <div className="flex items-center gap-2">
              <Badge variant={STATUS_BADGES[selectedTest.status].variant}>
                {STATUS_BADGES[selectedTest.status].label}
              </Badge>
              <span className="text-sm text-[var(--color-text-secondary)]">
                {TEST_TYPE_LABELS[selectedTest.test_type]} -{' '}
                {METRIC_LABELS[selectedTest.primary_metric]}
              </span>
            </div>

            {selectedTest.hypothesis && (
              <div className="p-3 bg-sage-pale rounded-lg">
                <div className="text-xs uppercase tracking-wider text-[var(--color-text-secondary)] mb-1">
                  Hypothesis
                </div>
                <div className="text-sm">{selectedTest.hypothesis}</div>
              </div>
            )}

            {/* Significance Result */}
            {testDetails.significance && (
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Statistical Significance
                  </h4>
                  {testDetails.significance.is_significant ? (
                    <Badge variant="success">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Significant
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Not Yet Significant
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-[var(--color-text-secondary)]">
                      Confidence
                    </div>
                    <div className="text-lg font-bold">
                      {formatConfidence(testDetails.significance.confidence)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[var(--color-text-secondary)]">
                      Lift
                    </div>
                    <div
                      className={`text-lg font-bold flex items-center gap-1 ${testDetails.significance.lift >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {testDetails.significance.lift >= 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      {formatLift(testDetails.significance.lift)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[var(--color-text-secondary)]">
                      Winner
                    </div>
                    <div className="text-lg font-bold capitalize">
                      {testDetails.significance.winner === 'none'
                        ? 'TBD'
                        : testDetails.significance.winner}
                    </div>
                  </div>
                </div>

                {!testDetails.significance.sample_size_met && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-amber-600">
                    <Clock className="h-4 w-4" />
                    Minimum sample size not yet reached
                  </div>
                )}
              </div>
            )}

            {/* Variants */}
            <div>
              <h4 className="font-semibold mb-3">Variants</h4>
              <div className="space-y-2">
                {testDetails.variants?.map((variant: ABTestVariant) => (
                  <div
                    key={variant.id}
                    className={`p-3 border rounded-lg flex items-center justify-between ${variant.is_control ? 'border-sage bg-sage-pale/30' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{variant.name}</span>
                      {variant.is_control && (
                        <Badge variant="secondary">Control</Badge>
                      )}
                      {selectedTest.winner_variant_id === variant.id && (
                        <Badge variant="success">
                          <Trophy className="h-3 w-3 mr-1" />
                          Winner
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm text-[var(--color-text-secondary)]">
                      {variant.traffic_percentage}% traffic
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            {(selectedTest.status === 'running' ||
              selectedTest.status === 'paused') &&
              testDetails.significance?.is_significant && (
                <div className="border-t pt-4">
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => {
                      const winnerVariantId =
                        testDetails.significance.winner === 'control'
                          ? selectedTest.control_variant_id
                          : testDetails.variants?.find(
                              (v: ABTestVariant) => !v.is_control
                            )?.id;
                      if (winnerVariantId) {
                        actionMutation.mutate({
                          testId: selectedTest.id,
                          action: 'declare_winner',
                          winner_variant_id: winnerVariantId,
                          confidence: testDetails.significance.confidence,
                        });
                        setSelectedTest(null);
                      }
                    }}
                    disabled={actionMutation.isPending}
                  >
                    <Trophy className="h-4 w-4 mr-2" />
                    Declare Winner
                  </Button>
                </div>
              )}
          </div>
        )}
      </Modal>
    </PageContainer>
  );
}
