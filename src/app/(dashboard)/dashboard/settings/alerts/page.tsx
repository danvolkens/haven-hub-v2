'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Plus,
  Trash2,
  Edit2,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Trophy,
  Target,
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  Badge,
  Modal,
  Input,
  Select,
} from '@/components/ui';
import { PageContainer } from '@/components/layout/page-container';
import { api } from '@/lib/fetcher';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/providers/toast-provider';

interface AlertRule {
  id: string;
  name: string;
  alert_type: string;
  metric: string;
  operator: string;
  threshold: number;
  send_email: boolean;
  send_push: boolean;
  create_task: boolean;
  is_active: boolean;
  last_triggered_at: string | null;
  created_at: string;
}

const ALERT_TYPES = [
  { value: 'pin_milestone', label: 'Pin Milestone', icon: Trophy, description: 'When a pin reaches a performance milestone' },
  { value: 'pin_underperformer', label: 'Underperforming Pin', icon: TrendingDown, description: 'When a pin underperforms thresholds' },
  { value: 'campaign_cpa', label: 'Campaign CPA', icon: DollarSign, description: 'When campaign cost-per-acquisition exceeds limit' },
  { value: 'campaign_roas', label: 'Campaign ROAS', icon: TrendingUp, description: 'When campaign return on ad spend drops' },
  { value: 'daily_spend', label: 'Daily Spend', icon: AlertTriangle, description: 'When daily spend exceeds budget' },
  { value: 'winner_detected', label: 'Winner Detected', icon: Target, description: 'When a potential winner pin is detected' },
];

const METRICS = [
  { value: 'pin_impressions', label: 'Pin Impressions', category: 'pin' },
  { value: 'pin_saves', label: 'Pin Saves', category: 'pin' },
  { value: 'pin_clicks', label: 'Pin Clicks', category: 'pin' },
  { value: 'pin_ctr', label: 'Pin CTR (%)', category: 'pin' },
  { value: 'campaign_spend', label: 'Campaign Spend ($)', category: 'campaign' },
  { value: 'campaign_revenue', label: 'Campaign Revenue ($)', category: 'campaign' },
  { value: 'campaign_roas', label: 'Campaign ROAS (x)', category: 'campaign' },
  { value: 'campaign_cpa', label: 'Campaign CPA ($)', category: 'campaign' },
];

const OPERATORS = [
  { value: 'gt', label: 'Greater than', symbol: '>' },
  { value: 'gte', label: 'At least', symbol: '>=' },
  { value: 'lt', label: 'Less than', symbol: '<' },
  { value: 'lte', label: 'At most', symbol: '<=' },
  { value: 'eq', label: 'Equal to', symbol: '=' },
];

export default function AlertSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);

  const { data: rulesData, isLoading } = useQuery({
    queryKey: ['alert-rules'],
    queryFn: () => api.get<{ rules: AlertRule[] }>('/alerts/rules'),
  });
  const rules = rulesData?.rules || [];

  const createMutation = useMutation({
    mutationFn: (data: Partial<AlertRule>) => api.post('/alerts/rules', data),
    onSuccess: () => {
      toast('Alert rule created', 'success');
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
      setIsModalOpen(false);
    },
    onError: (error) => {
      toast(error instanceof Error ? error.message : 'Failed to create rule', 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<AlertRule> & { id: string }) => api.patch('/alerts/rules', data),
    onSuccess: () => {
      toast('Alert rule updated', 'success');
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
      setEditingRule(null);
    },
    onError: (error) => {
      toast(error instanceof Error ? error.message : 'Failed to update rule', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/alerts/rules?id=${id}`),
    onSuccess: () => {
      toast('Alert rule deleted', 'success');
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
    },
    onError: (error) => {
      toast(error instanceof Error ? error.message : 'Failed to delete rule', 'error');
    },
  });

  const toggleRule = (rule: AlertRule) => {
    updateMutation.mutate({ id: rule.id, is_active: !rule.is_active });
  };

  const getAlertTypeInfo = (type: string) => {
    return ALERT_TYPES.find(t => t.value === type) || ALERT_TYPES[0];
  };

  const getOperatorSymbol = (operator: string) => {
    return OPERATORS.find(o => o.value === operator)?.symbol || operator;
  };

  const formatThreshold = (metric: string, threshold: number) => {
    if (metric.includes('ctr') || metric.includes('rate')) {
      return `${(threshold * 100).toFixed(2)}%`;
    }
    if (metric.includes('spend') || metric.includes('revenue') || metric.includes('cpa')) {
      return `$${threshold.toFixed(2)}`;
    }
    if (metric.includes('roas')) {
      return `${threshold.toFixed(2)}x`;
    }
    return threshold.toLocaleString();
  };

  return (
    <PageContainer
      title="Performance Alerts"
      description="Set up alerts to get notified when metrics cross thresholds"
      actions={
        <Button
          onClick={() => setIsModalOpen(true)}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Add Alert Rule
        </Button>
      }
    >
      <div className="space-y-6">
        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-elevated rounded w-1/3 mx-auto" />
                <div className="h-4 bg-elevated rounded w-1/2 mx-auto" />
              </div>
            </CardContent>
          </Card>
        ) : rules.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Bell className="h-12 w-12 mx-auto text-[var(--color-text-tertiary)] mb-4" />
              <p className="text-body font-medium mb-2">No alert rules configured</p>
              <p className="text-body-sm text-[var(--color-text-secondary)] mb-4">
                Create alert rules to get notified when your pins or campaigns hit important thresholds.
              </p>
              <Button
                onClick={() => setIsModalOpen(true)}
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Add Your First Rule
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {rules.map((rule) => {
              const typeInfo = getAlertTypeInfo(rule.alert_type);
              const Icon = typeInfo.icon;

              return (
                <Card key={rule.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        'p-2 rounded-lg',
                        rule.is_active ? 'bg-sage/10' : 'bg-elevated'
                      )}>
                        <Icon className={cn(
                          'h-5 w-5',
                          rule.is_active ? 'text-sage' : 'text-[var(--color-text-tertiary)]'
                        )} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-body font-medium truncate">{rule.name}</h3>
                          {!rule.is_active && (
                            <Badge variant="secondary">Paused</Badge>
                          )}
                        </div>
                        <p className="text-body-sm text-[var(--color-text-secondary)]">
                          {METRICS.find(m => m.value === rule.metric)?.label || rule.metric}{' '}
                          {getOperatorSymbol(rule.operator)}{' '}
                          {formatThreshold(rule.metric, rule.threshold)}
                        </p>
                        {rule.last_triggered_at && (
                          <p className="text-caption text-[var(--color-text-tertiary)] mt-1">
                            Last triggered: {new Date(rule.last_triggered_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {rule.send_email && (
                          <Badge variant="outline" className="text-xs">Email</Badge>
                        )}
                        {rule.send_push && (
                          <Badge variant="outline" className="text-xs">Push</Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => toggleRule(rule)}
                          title={rule.is_active ? 'Pause rule' : 'Activate rule'}
                        >
                          {rule.is_active ? (
                            <ToggleRight className="h-5 w-5 text-sage" />
                          ) : (
                            <ToggleLeft className="h-5 w-5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setEditingRule(rule)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            if (confirm('Delete this alert rule?')) {
                              deleteMutation.mutate(rule.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-error" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Suggested Rules */}
        {rules.length > 0 && rules.length < 4 && (
          <Card className="bg-elevated">
            <CardContent className="p-4">
              <p className="text-body-sm text-[var(--color-text-secondary)]">
                <strong>Tip:</strong> Consider adding alerts for:
                {!rules.some(r => r.alert_type === 'pin_milestone') && ' pin milestones,'}
                {!rules.some(r => r.alert_type === 'campaign_roas') && ' ROAS drops,'}
                {!rules.some(r => r.alert_type === 'campaign_cpa') && ' high CPA,'}
                {!rules.some(r => r.alert_type === 'winner_detected') && ' winner detection'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(isModalOpen || editingRule) && (
        <AlertRuleModal
          rule={editingRule}
          onClose={() => {
            setIsModalOpen(false);
            setEditingRule(null);
          }}
          onSave={(data) => {
            if (editingRule) {
              updateMutation.mutate({ ...data, id: editingRule.id });
            } else {
              createMutation.mutate(data);
            }
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </PageContainer>
  );
}

function AlertRuleModal({
  rule,
  onClose,
  onSave,
  isLoading,
}: {
  rule: AlertRule | null;
  onClose: () => void;
  onSave: (data: Partial<AlertRule>) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    name: rule?.name || '',
    alert_type: rule?.alert_type || 'pin_milestone',
    metric: rule?.metric || 'pin_impressions',
    operator: rule?.operator || 'gte',
    threshold: rule?.threshold?.toString() || '',
    send_email: rule?.send_email ?? true,
    send_push: rule?.send_push ?? false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      threshold: parseFloat(formData.threshold),
    });
  };

  const selectedType = ALERT_TYPES.find(t => t.value === formData.alert_type);

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={rule ? 'Edit Alert Rule' : 'Create Alert Rule'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-body-sm font-medium mb-2">Rule Name</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Pin reaches 1000 impressions"
            required
          />
        </div>

        <div>
          <label className="block text-body-sm font-medium mb-2">Alert Type</label>
          <Select
            value={formData.alert_type}
            onChange={(value) => setFormData({ ...formData, alert_type: value as string })}
            options={ALERT_TYPES.map((type) => ({
              value: type.value,
              label: type.label,
              description: type.description,
            }))}
          />
          {selectedType && (
            <p className="text-caption text-[var(--color-text-tertiary)] mt-1">
              {selectedType.description}
            </p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-body-sm font-medium mb-2">Metric</label>
            <Select
              value={formData.metric}
              onChange={(value) => setFormData({ ...formData, metric: value as string })}
              options={METRICS.map((metric) => ({
                value: metric.value,
                label: metric.label,
              }))}
            />
          </div>

          <div>
            <label className="block text-body-sm font-medium mb-2">Condition</label>
            <Select
              value={formData.operator}
              onChange={(value) => setFormData({ ...formData, operator: value as string })}
              options={OPERATORS.map((op) => ({
                value: op.value,
                label: `${op.label} (${op.symbol})`,
              }))}
            />
          </div>

          <div>
            <label className="block text-body-sm font-medium mb-2">Threshold</label>
            <Input
              type="number"
              step="any"
              value={formData.threshold}
              onChange={(e) => setFormData({ ...formData, threshold: e.target.value })}
              placeholder="e.g., 1000"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-body-sm font-medium mb-2">Notifications</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.send_email}
                onChange={(e) => setFormData({ ...formData, send_email: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-body-sm">Email</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.send_push}
                onChange={(e) => setFormData({ ...formData, send_push: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-body-sm">Push Notification</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {rule ? 'Update Rule' : 'Create Rule'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
