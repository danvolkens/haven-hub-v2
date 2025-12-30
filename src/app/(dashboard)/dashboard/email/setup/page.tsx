'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle,
  Circle,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Mail,
  List,
  Zap,
  Send,
  ChevronDown,
  ChevronUp,
  FileText,
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  Badge,
  Input,
} from '@/components/ui';
import { PageContainer } from '@/components/layout/page-container';
import { api } from '@/lib/fetcher';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/providers/toast-provider';

interface SetupStatus {
  connected: boolean;
  accountName?: string;
  steps: {
    connection: StepStatus;
    lists: ListStepStatus;
    events: EventStepStatus;
  };
  overallProgress: number;
}

interface StepStatus {
  status: 'complete' | 'incomplete' | 'error';
  message: string;
}

interface ListStepStatus extends StepStatus {
  existingLists?: string[];
  missingLists?: string[];
  progress?: number;
}

interface EventStepStatus extends StepStatus {
  activeEvents?: string[];
  missingEvents?: string[];
  progress?: number;
  note?: string;
}

const FLOW_TEMPLATES = [
  {
    id: 'welcome',
    name: 'Welcome Flow',
    trigger: 'Added to "All Leads" list',
    emails: [
      { day: 0, subject: 'Welcome + Lead Magnet Delivery' },
      { day: 2, subject: 'Brand Story' },
      { day: 4, subject: 'Best Sellers by Collection' },
      { day: 7, subject: 'Social Proof + First Purchase Offer' },
    ],
  },
  {
    id: 'quiz',
    name: 'Quiz Result Flow',
    trigger: '"Quiz Completed" event',
    emails: [
      { day: 0, subject: 'Your Quiz Results + Collection Recommendations' },
      { day: 1, subject: 'Deep Dive into Your Collection' },
      { day: 3, subject: 'Styled Room Inspiration' },
      { day: 5, subject: 'Limited Time Offer for Your Collection' },
    ],
  },
  {
    id: 'abandonment',
    name: 'Cart Abandonment Flow',
    trigger: '"Cart Abandoned" event',
    emails: [
      { day: 0, subject: 'You left something behind (1 hour delay)' },
      { day: 1, subject: 'Still thinking about it?' },
      { day: 3, subject: 'Last chance + small discount' },
    ],
  },
  {
    id: 'purchase',
    name: 'Post-Purchase Flow',
    trigger: '"Placed Order" event',
    emails: [
      { day: 0, subject: 'Order Confirmation + What to Expect' },
      { day: 3, subject: 'Care Instructions' },
      { day: 7, subject: 'Request Review' },
      { day: 14, subject: 'Complementary Products' },
    ],
  },
  {
    id: 'winback',
    name: 'Win-Back Flow',
    trigger: '"Win Back Started" event',
    emails: [
      { day: 0, subject: 'We miss you + Special offer' },
      { day: 3, subject: "What's new since you left" },
      { day: 7, subject: 'Final reminder' },
    ],
  },
];

export default function KlaviyoSetupPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [testEmail, setTestEmail] = useState('');
  const [expandedFlow, setExpandedFlow] = useState<string | null>(null);

  const { data: setupStatus, isLoading, refetch } = useQuery<SetupStatus>({
    queryKey: ['klaviyo-setup-status'],
    queryFn: () => api.get('/klaviyo/setup-status'),
  });

  const createListsMutation = useMutation({
    mutationFn: () => api.post('/klaviyo/setup', { action: 'create_lists' }),
    onSuccess: (data: any) => {
      toast(data.message || 'Lists created', 'success');
      queryClient.invalidateQueries({ queryKey: ['klaviyo-setup-status'] });
    },
    onError: (error) => {
      toast(error instanceof Error ? error.message : 'Failed to create lists', 'error');
    },
  });

  const testEventMutation = useMutation({
    mutationFn: ({ eventType }: { eventType: string }) =>
      api.post('/klaviyo/setup', { action: 'test_event', eventType, testEmail }),
    onSuccess: (data: any) => {
      toast(data.message || 'Test event sent', 'success');
    },
    onError: (error) => {
      toast(error instanceof Error ? error.message : 'Failed to send test event', 'error');
    },
  });

  // Email template seed status and mutation
  const { data: seedStatus, isLoading: seedLoading, refetch: refetchSeed } = useQuery({
    queryKey: ['email-seed-status'],
    queryFn: () => api.get<{
      status: Record<string, { total: number; existing: number; expected: number }>;
      summary: { total_expected: number; total_existing: number; is_complete: boolean };
    }>('/email-workflows/seed'),
  });

  const seedMutation = useMutation({
    mutationFn: () => api.post('/email-workflows/seed', {}),
    onSuccess: (data: any) => {
      toast(data.message || 'Email templates have been seeded successfully.', 'success');
      refetchSeed();
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
    },
    onError: (error: any) => {
      toast(error.message || 'Failed to seed email templates.', 'error');
    },
  });

  const updateContentMutation = useMutation({
    mutationFn: () => api.post('/email-workflows/seed', { update_content: true }),
    onSuccess: (data: any) => {
      toast(data.message || 'Email template content has been updated.', 'success');
      refetchSeed();
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
    },
    onError: (error: any) => {
      toast(error.message || 'Failed to update template content.', 'error');
    },
  });

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="h-5 w-5 text-success" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-error" />;
      default:
        return <Circle className="h-5 w-5 text-[var(--color-text-tertiary)]" />;
    }
  };

  if (isLoading) {
    return (
      <PageContainer title="Email Setup" description="Configure Klaviyo integration">
        <Card>
          <CardContent className="p-8 text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-sage mx-auto mb-4" />
            <p className="text-body-sm text-[var(--color-text-secondary)]">
              Checking Klaviyo connection...
            </p>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Klaviyo Setup"
      description="Configure your email automation with Klaviyo"
      actions={
        <Button
          variant="secondary"
          onClick={() => refetch()}
          leftIcon={<RefreshCw className="h-4 w-4" />}
        >
          Refresh Status
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Progress Overview */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-body font-medium">Setup Progress</h3>
                <p className="text-body-sm text-[var(--color-text-secondary)]">
                  {setupStatus?.overallProgress || 0}% complete
                </p>
              </div>
              <div className="text-2xl font-semibold text-sage">
                {setupStatus?.overallProgress || 0}%
              </div>
            </div>
            <div className="w-full bg-elevated rounded-full h-2">
              <div
                className="bg-sage h-2 rounded-full transition-all duration-300"
                style={{ width: `${setupStatus?.overallProgress || 0}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Step 1: Connection */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              {getStepIcon(setupStatus?.steps.connection.status || 'incomplete')}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-body font-medium">1. Connect Klaviyo</h3>
                  {setupStatus?.steps.connection.status === 'complete' && (
                    <Badge variant="success">Connected</Badge>
                  )}
                </div>
                <p className="text-body-sm text-[var(--color-text-secondary)]">
                  {setupStatus?.steps.connection.message}
                </p>
                {setupStatus?.steps.connection.status !== 'complete' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-3"
                    onClick={() => window.location.href = '/dashboard/settings'}
                    rightIcon={<ExternalLink className="h-3 w-3" />}
                  >
                    Go to Settings
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Lists */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              {getStepIcon(setupStatus?.steps.lists.status || 'incomplete')}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-body font-medium">2. Create Required Lists</h3>
                  {setupStatus?.steps.lists.status === 'complete' && (
                    <Badge variant="success">All Created</Badge>
                  )}
                </div>
                <p className="text-body-sm text-[var(--color-text-secondary)]">
                  {setupStatus?.steps.lists.message}
                </p>

                {setupStatus?.steps.lists.missingLists && setupStatus.steps.lists.missingLists.length > 0 && (
                  <div className="mt-3">
                    <p className="text-caption text-[var(--color-text-tertiary)] mb-2">Missing lists:</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {setupStatus.steps.lists.missingLists.map((name) => (
                        <Badge key={name} variant="outline" className="text-xs">
                          <List className="h-3 w-3 mr-1" />
                          {name}
                        </Badge>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => createListsMutation.mutate()}
                      isLoading={createListsMutation.isPending}
                      disabled={!setupStatus?.connected}
                    >
                      Create Missing Lists
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Email Content Templates */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <FileText className={cn(
                'h-5 w-5 mt-0.5',
                seedStatus?.summary?.is_complete ? 'text-success' : 'text-[var(--color-text-tertiary)]'
              )} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-body font-medium">Email Content Templates</h3>
                  {seedLoading ? (
                    <Badge variant="outline" className="text-xs">
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      Loading...
                    </Badge>
                  ) : seedStatus?.summary?.is_complete ? (
                    <Badge variant="success">Seeded</Badge>
                  ) : (
                    <Badge variant="warning">
                      {seedStatus?.summary?.total_existing || 0} / {seedStatus?.summary?.total_expected || 0} templates
                    </Badge>
                  )}
                </div>
                <p className="text-body-sm text-[var(--color-text-secondary)]">
                  Haven & Hold branded email templates for all automation flows.
                </p>

                {/* Per-flow status breakdown */}
                {seedStatus?.status && Object.keys(seedStatus.status).length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-caption text-[var(--color-text-tertiary)]">Template status by flow:</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {Object.entries(seedStatus.status).map(([flowName, flowStatus]) => (
                        <div
                          key={flowName}
                          className="flex items-center justify-between p-2 rounded border bg-elevated/30"
                        >
                          <span className="text-body-sm capitalize">
                            {flowName.replace(/_/g, ' ')}
                          </span>
                          <Badge
                            variant={flowStatus.existing === flowStatus.expected ? 'success' : 'outline'}
                            className="text-xs"
                          >
                            {flowStatus.existing} / {flowStatus.expected}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Seed button or complete message */}
                {seedStatus?.summary?.is_complete ? (
                  <div className="mt-3 flex items-center gap-4">
                    <div className="flex items-center gap-2 text-success">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-body-sm">All templates ready</span>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => updateContentMutation.mutate()}
                      isLoading={updateContentMutation.isPending}
                      leftIcon={<RefreshCw className="h-4 w-4" />}
                    >
                      Refresh Content
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    className="mt-3"
                    onClick={() => seedMutation.mutate()}
                    isLoading={seedMutation.isPending}
                    leftIcon={<FileText className="h-4 w-4" />}
                  >
                    Seed All Email Templates
                  </Button>
                )}

                {/* Info box */}
                <div className="mt-4 p-3 rounded bg-elevated border">
                  <p className="text-caption text-[var(--color-text-tertiary)]">
                    <strong>What&apos;s included:</strong> Pre-designed email templates for Welcome, Quiz Results,
                    Cart Abandonment, Post-Purchase, and Win-Back flows. Templates use Haven & Hold branding
                    and are ready to use with Klaviyo.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Flows */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              {getStepIcon(setupStatus?.steps.events.status || 'incomplete')}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-body font-medium">3. Create Flows in Klaviyo</h3>
                  {setupStatus?.steps.events.status === 'complete' && (
                    <Badge variant="success">All Active</Badge>
                  )}
                </div>
                <p className="text-body-sm text-[var(--color-text-secondary)]">
                  {setupStatus?.steps.events.message}
                </p>
                {setupStatus?.steps.events.note && (
                  <p className="text-caption text-[var(--color-text-tertiary)] mt-1">
                    Note: {setupStatus.steps.events.note}
                  </p>
                )}

                <div className="mt-4 space-y-3">
                  {FLOW_TEMPLATES.map((flow) => {
                    const isActive = setupStatus?.steps.events.activeEvents?.some(
                      e => e.toLowerCase().includes(flow.name.split(' ')[0].toLowerCase())
                    );
                    const isExpanded = expandedFlow === flow.id;

                    return (
                      <div
                        key={flow.id}
                        className="border rounded-lg overflow-hidden"
                      >
                        <button
                          onClick={() => setExpandedFlow(isExpanded ? null : flow.id)}
                          className="w-full flex items-center justify-between p-3 text-left hover:bg-elevated/50 cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <Zap className={cn(
                              'h-4 w-4',
                              isActive ? 'text-success' : 'text-[var(--color-text-tertiary)]'
                            )} />
                            <div>
                              <p className="text-body-sm font-medium">{flow.name}</p>
                              <p className="text-caption text-[var(--color-text-tertiary)]">
                                Trigger: {flow.trigger}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isActive && <Badge variant="success" className="text-xs">Active</Badge>}
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t bg-elevated/30 p-3">
                            <p className="text-caption text-[var(--color-text-tertiary)] mb-2">
                              Recommended email sequence:
                            </p>
                            <div className="space-y-1">
                              {flow.emails.map((email, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-body-sm">
                                  <Mail className="h-3 w-3 text-[var(--color-text-tertiary)]" />
                                  <span className="text-[var(--color-text-tertiary)] w-16">
                                    {email.day === 0 ? 'Immediate' : `Day ${email.day}`}
                                  </span>
                                  <span>{email.subject}</span>
                                </div>
                              ))}
                            </div>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="mt-3"
                              onClick={() => window.open('https://www.klaviyo.com/flows', '_blank')}
                              rightIcon={<ExternalLink className="h-3 w-3" />}
                            >
                              Create in Klaviyo
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Events */}
        {setupStatus?.connected && (
          <Card>
            <CardHeader
              title="Test Event Triggers"
              description="Send test events to verify your flows are working"
            />
            <CardContent className="p-6 pt-0">
              <div className="flex items-end gap-4 mb-4">
                <div className="flex-1">
                  <label className="block text-body-sm font-medium mb-2">
                    Test Email Address
                  </label>
                  <Input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="Enter email to receive test events"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { type: 'quiz_completed', label: 'Quiz Complete' },
                  { type: 'cart_abandoned', label: 'Cart Abandoned' },
                  { type: 'placed_order', label: 'Placed Order' },
                  { type: 'win_back', label: 'Win Back' },
                ].map((event) => (
                  <Button
                    key={event.type}
                    variant="secondary"
                    size="sm"
                    disabled={!testEmail || testEventMutation.isPending}
                    onClick={() => testEventMutation.mutate({ eventType: event.type })}
                    leftIcon={<Send className="h-3 w-3" />}
                  >
                    {event.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Help */}
        <Card className="bg-elevated">
          <CardContent className="p-4">
            <p className="text-body-sm text-[var(--color-text-secondary)]">
              <strong>Need help?</strong> Check out the{' '}
              <a
                href="https://help.klaviyo.com/hc/en-us/articles/115005082927"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sage hover:underline inline-flex items-center gap-1"
              >
                Klaviyo Flow documentation
                <ExternalLink className="h-3 w-3" />
              </a>
              {' '}for step-by-step guides on creating flows.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
