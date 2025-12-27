'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Zap,
  Mail,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Play,
  Pause,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Settings,
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
import Link from 'next/link';

interface FlowBlueprint {
  id: string;
  flow_type: string;
  name: string;
  description: string;
  trigger_type: 'list' | 'metric';
  trigger_config: any;
  default_delays: number[];
  conditions: any;
  is_deployed: boolean;
  deployment_status: 'not_created' | 'draft' | 'live' | 'paused' | 'error';
  deployment: {
    klaviyo_flow_id: string;
    status: string;
    deployed_at: string;
    last_error?: string;
  } | null;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  preview_text: string;
  flow_type: string;
  position: number;
  delay_hours: number;
  klaviyo_template_id: string | null;
  is_active: boolean;
}

const FLOW_ICONS: Record<string, React.ElementType> = {
  welcome: Mail,
  quiz_result: FileText,
  cart_abandonment: RefreshCw,
  post_purchase: CheckCircle2,
  win_back: Play,
};

const FLOW_COLORS: Record<string, string> = {
  welcome: 'bg-blue-100 text-blue-700',
  quiz_result: 'bg-purple-100 text-purple-700',
  cart_abandonment: 'bg-orange-100 text-orange-700',
  post_purchase: 'bg-green-100 text-green-700',
  win_back: 'bg-pink-100 text-pink-700',
};

const STATUS_BADGES: Record<string, { color: string; label: string }> = {
  not_created: { color: 'bg-gray-100 text-gray-700', label: 'Not Created' },
  draft: { color: 'bg-yellow-100 text-yellow-700', label: 'Draft' },
  live: { color: 'bg-green-100 text-green-700', label: 'Live' },
  paused: { color: 'bg-gray-100 text-gray-600', label: 'Paused' },
  error: { color: 'bg-red-100 text-red-700', label: 'Error' },
};

function FlowCard({
  blueprint,
  templates,
  onDeploy,
  isDeploying,
}: {
  blueprint: FlowBlueprint;
  templates: EmailTemplate[];
  onDeploy: (flowType: string) => void;
  isDeploying: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const Icon = FLOW_ICONS[blueprint.flow_type] || Zap;
  const colorClass = FLOW_COLORS[blueprint.flow_type] || 'bg-sage/10 text-sage';
  const statusInfo = STATUS_BADGES[blueprint.deployment_status] || STATUS_BADGES.not_created;

  const flowTemplates = templates.filter(t => t.flow_type === blueprint.flow_type);
  const syncedCount = flowTemplates.filter(t => t.klaviyo_template_id).length;
  const expectedCount = blueprint.default_delays.length;
  const isReady = flowTemplates.length >= expectedCount && syncedCount >= expectedCount;

  const getTriggerLabel = () => {
    if (blueprint.trigger_type === 'list') {
      return `Added to "${blueprint.trigger_config.list_name || 'All Leads'}" list`;
    }
    return `"${blueprint.trigger_config.metric_name}" event`;
  };

  return (
    <Card className="overflow-hidden">
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full ${colorClass} flex items-center justify-center`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-medium">{blueprint.name}</h3>
              <p className="text-body-sm text-[var(--color-text-secondary)]">
                Trigger: {getTriggerLabel()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-[var(--color-text-secondary)]" />
            ) : (
              <ChevronDown className="h-5 w-5 text-[var(--color-text-secondary)]" />
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t px-4 py-4 space-y-4">
          <p className="text-body-sm text-[var(--color-text-secondary)]">
            {blueprint.description}
          </p>

          {/* Email sequence preview */}
          <div className="space-y-2">
            <p className="text-body-sm font-medium">Email Sequence:</p>
            <div className="space-y-2">
              {blueprint.default_delays.map((delay, index) => {
                const template = flowTemplates.find(t => t.position === index + 1);
                const delayLabel = delay === 0
                  ? 'Immediate'
                  : delay < 24
                    ? `${delay} hours`
                    : `Day ${Math.round(delay / 24)}`;

                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-2 bg-gray-50 rounded-md"
                  >
                    <div className="flex items-center gap-2 text-body-sm text-[var(--color-text-secondary)] w-24">
                      <Clock className="h-4 w-4" />
                      {delayLabel}
                    </div>
                    <div className="flex-1">
                      {template ? (
                        <div className="flex items-center gap-2">
                          <span className="text-body-sm">{template.subject}</span>
                          {template.klaviyo_template_id ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                          )}
                        </div>
                      ) : (
                        <span className="text-body-sm text-[var(--color-text-secondary)] italic">
                          Email {index + 1} - Not configured
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Readiness status */}
          <div className="flex items-center gap-4 text-body-sm">
            <span className={flowTemplates.length >= expectedCount ? 'text-green-600' : 'text-yellow-600'}>
              {flowTemplates.length}/{expectedCount} templates created
            </span>
            <span className={syncedCount >= expectedCount ? 'text-green-600' : 'text-yellow-600'}>
              {syncedCount}/{expectedCount} synced to Klaviyo
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            {blueprint.deployment_status === 'not_created' ? (
              <Button
                onClick={() => onDeploy(blueprint.flow_type)}
                disabled={!isReady || isDeploying}
                className="cursor-pointer"
              >
                {isDeploying ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Deploying...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    {isReady ? 'Deploy to Klaviyo' : 'Configure Templates First'}
                  </>
                )}
              </Button>
            ) : (
              <>
                {blueprint.deployment?.klaviyo_flow_id && (
                  <a
                    href={`https://www.klaviyo.com/flows/${blueprint.deployment.klaviyo_flow_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium cursor-pointer transition-all border border-sage text-sage bg-transparent hover:bg-sage/10 h-10 px-4 gap-2"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View in Klaviyo
                  </a>
                )}
                <Button
                  variant="secondary"
                  onClick={() => onDeploy(blueprint.flow_type)}
                  disabled={isDeploying}
                  className="cursor-pointer"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Re-deploy
                </Button>
              </>
            )}
            <Link href={`/dashboard/email/workflows/${blueprint.flow_type}`}>
              <Button variant="secondary" className="cursor-pointer">
                <Settings className="h-4 w-4 mr-2" />
                Edit Templates
              </Button>
            </Link>
          </div>

          {/* Error display */}
          {blueprint.deployment?.last_error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-body-sm text-red-700">
                <strong>Error:</strong> {blueprint.deployment.last_error}
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default function EmailWorkflowsPage() {
  const queryClient = useQueryClient();
  const [deployingFlow, setDeployingFlow] = useState<string | null>(null);
  const [deployConfig, setDeployConfig] = useState({
    from_email: 'hello@havenandhold.com',
    from_label: 'Haven & Hold',
  });

  // Fetch blueprints
  const { data: blueprintsData, isLoading: loadingBlueprints } = useQuery<{ blueprints: FlowBlueprint[] }>({
    queryKey: ['email-workflows', 'blueprints'],
    queryFn: () => api.get('/api/email-workflows/blueprints'),
  });

  // Fetch templates
  const { data: templatesData, isLoading: loadingTemplates } = useQuery<{ templates: EmailTemplate[] }>({
    queryKey: ['email-workflows', 'templates'],
    queryFn: () => api.get('/api/email-workflows/templates'),
  });

  // Deploy mutation
  const deployMutation = useMutation({
    mutationFn: (flowType: string) =>
      api.post('/api/email-workflows/deploy', {
        flow_type: flowType,
        from_email: deployConfig.from_email,
        from_label: deployConfig.from_label,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-workflows'] });
      setDeployingFlow(null);
    },
    onError: () => {
      setDeployingFlow(null);
    },
  });

  const handleDeploy = (flowType: string) => {
    setDeployingFlow(flowType);
    deployMutation.mutate(flowType);
  };

  const blueprints: FlowBlueprint[] = blueprintsData?.blueprints || [];
  const templates: EmailTemplate[] = templatesData?.templates || [];

  const isLoading = loadingBlueprints || loadingTemplates;

  // Stats
  const liveFlows = blueprints.filter(b => b.deployment_status === 'live').length;
  const draftFlows = blueprints.filter(b => b.deployment_status === 'draft').length;
  const totalTemplates = templates.length;
  const syncedTemplates = templates.filter(t => t.klaviyo_template_id).length;

  return (
    <PageContainer
      title="Email Workflows"
      description="Automate your customer journey with Klaviyo flows"
    >
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <Play className="h-5 w-5 text-green-700" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{liveFlows}</p>
                <p className="text-body-sm text-[var(--color-text-secondary)]">Live Flows</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <Pause className="h-5 w-5 text-yellow-700" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{draftFlows}</p>
                <p className="text-body-sm text-[var(--color-text-secondary)]">Draft Flows</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Mail className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{totalTemplates}</p>
                <p className="text-body-sm text-[var(--color-text-secondary)]">Email Templates</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-purple-700" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{syncedTemplates}</p>
                <p className="text-body-sm text-[var(--color-text-secondary)]">Synced to Klaviyo</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Email sender config */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-heading-3">Sender Configuration</h2>
          <p className="text-body-sm text-[var(--color-text-secondary)]">
            These settings will be used when deploying flows to Klaviyo
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-body-sm font-medium mb-1">From Email</label>
              <Input
                value={deployConfig.from_email}
                onChange={(e) => setDeployConfig({ ...deployConfig, from_email: e.target.value })}
                placeholder="hello@example.com"
              />
            </div>
            <div>
              <label className="block text-body-sm font-medium mb-1">From Name</label>
              <Input
                value={deployConfig.from_label}
                onChange={(e) => setDeployConfig({ ...deployConfig, from_label: e.target.value })}
                placeholder="Your Brand Name"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Flow blueprints */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-heading-3">Email Flows</h2>
          <Link href="/dashboard/email/workflows/content">
            <Button variant="secondary" className="cursor-pointer">
              <FileText className="h-4 w-4 mr-2" />
              Content Library
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-gray-200 rounded w-1/3" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {blueprints.map((blueprint) => (
              <FlowCard
                key={blueprint.id}
                blueprint={blueprint}
                templates={templates}
                onDeploy={handleDeploy}
                isDeploying={deployingFlow === blueprint.flow_type}
              />
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
