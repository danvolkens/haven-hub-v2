import { getAdminClient } from '@/lib/supabase/admin';

export type AlertType =
  | 'pin_milestone'
  | 'pin_underperformer'
  | 'campaign_cpa'
  | 'campaign_roas'
  | 'daily_spend'
  | 'winner_detected';

export type Operator = 'gt' | 'lt' | 'eq' | 'gte' | 'lte';

export interface AlertRule {
  id: string;
  user_id: string;
  name: string;
  alert_type: AlertType;
  metric: string;
  operator: Operator;
  threshold: number;
  send_email: boolean;
  send_push: boolean;
  create_task: boolean;
  is_active: boolean;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PerformanceAlert {
  id: string;
  user_id: string;
  rule_id: string | null;
  alert_type: AlertType;
  title: string;
  message: string;
  reference_id: string | null;
  reference_table: string | null;
  status: 'pending' | 'sent' | 'read' | 'dismissed';
  sent_at: string | null;
  read_at: string | null;
  created_at: string;
}

export interface CreateAlertRuleInput {
  name: string;
  alert_type: AlertType;
  metric: string;
  operator: Operator;
  threshold: number;
  send_email?: boolean;
  send_push?: boolean;
  create_task?: boolean;
}

export interface CreateAlertInput {
  alert_type: AlertType;
  title: string;
  message: string;
  rule_id?: string;
  reference_id?: string;
  reference_table?: string;
}

// Check if a value matches a rule condition
function evaluateCondition(value: number, operator: Operator, threshold: number): boolean {
  switch (operator) {
    case 'gt': return value > threshold;
    case 'lt': return value < threshold;
    case 'eq': return value === threshold;
    case 'gte': return value >= threshold;
    case 'lte': return value <= threshold;
    default: return false;
  }
}

// Get operator display text
export function getOperatorText(operator: Operator): string {
  switch (operator) {
    case 'gt': return 'greater than';
    case 'lt': return 'less than';
    case 'eq': return 'equal to';
    case 'gte': return 'at least';
    case 'lte': return 'at most';
    default: return operator;
  }
}

// Get alert type display text
export function getAlertTypeText(alertType: AlertType): string {
  switch (alertType) {
    case 'pin_milestone': return 'Pin Milestone';
    case 'pin_underperformer': return 'Underperforming Pin';
    case 'campaign_cpa': return 'Campaign CPA';
    case 'campaign_roas': return 'Campaign ROAS';
    case 'daily_spend': return 'Daily Spend';
    case 'winner_detected': return 'Winner Detected';
    default: return alertType;
  }
}

// CRUD operations for alert rules

export async function getAlertRules(userId: string): Promise<AlertRule[]> {
  const supabase = getAdminClient();

  const { data, error } = await (supabase as any)
    .from('performance_alert_rules')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to get alert rules: ${error.message}`);
  return data || [];
}

export async function createAlertRule(
  userId: string,
  input: CreateAlertRuleInput
): Promise<AlertRule> {
  const supabase = getAdminClient();

  const { data, error } = await (supabase as any)
    .from('performance_alert_rules')
    .insert({
      user_id: userId,
      name: input.name,
      alert_type: input.alert_type,
      metric: input.metric,
      operator: input.operator,
      threshold: input.threshold,
      send_email: input.send_email ?? true,
      send_push: input.send_push ?? false,
      create_task: input.create_task ?? false,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create alert rule: ${error.message}`);
  return data;
}

export async function updateAlertRule(
  userId: string,
  ruleId: string,
  updates: Partial<CreateAlertRuleInput & { is_active: boolean }>
): Promise<AlertRule> {
  const supabase = getAdminClient();

  const { data, error } = await (supabase as any)
    .from('performance_alert_rules')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ruleId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update alert rule: ${error.message}`);
  return data;
}

export async function deleteAlertRule(userId: string, ruleId: string): Promise<void> {
  const supabase = getAdminClient();

  const { error } = await (supabase as any)
    .from('performance_alert_rules')
    .delete()
    .eq('id', ruleId)
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to delete alert rule: ${error.message}`);
}

// CRUD operations for alerts

export async function getAlerts(
  userId: string,
  options?: {
    status?: string[];
    limit?: number;
    offset?: number;
  }
): Promise<PerformanceAlert[]> {
  const supabase = getAdminClient();

  let query = (supabase as any)
    .from('performance_alerts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (options?.status?.length) {
    query = query.in('status', options.status);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to get alerts: ${error.message}`);
  return data || [];
}

export async function getUnreadAlertCount(userId: string): Promise<number> {
  const supabase = getAdminClient();

  const { count, error } = await (supabase as any)
    .from('performance_alerts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('status', ['pending', 'sent']);

  if (error) throw new Error(`Failed to get unread alert count: ${error.message}`);
  return count || 0;
}

export async function createAlert(
  userId: string,
  input: CreateAlertInput
): Promise<PerformanceAlert> {
  const supabase = getAdminClient();

  const { data, error } = await (supabase as any)
    .from('performance_alerts')
    .insert({
      user_id: userId,
      alert_type: input.alert_type,
      title: input.title,
      message: input.message,
      rule_id: input.rule_id || null,
      reference_id: input.reference_id || null,
      reference_table: input.reference_table || null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create alert: ${error.message}`);
  return data;
}

export async function markAlertAsRead(userId: string, alertId: string): Promise<void> {
  const supabase = getAdminClient();

  const { error } = await (supabase as any)
    .from('performance_alerts')
    .update({
      status: 'read',
      read_at: new Date().toISOString(),
    })
    .eq('id', alertId)
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to mark alert as read: ${error.message}`);
}

export async function markAllAlertsAsRead(userId: string): Promise<void> {
  const supabase = getAdminClient();

  const { error } = await (supabase as any)
    .from('performance_alerts')
    .update({
      status: 'read',
      read_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .in('status', ['pending', 'sent']);

  if (error) throw new Error(`Failed to mark alerts as read: ${error.message}`);
}

export async function dismissAlert(userId: string, alertId: string): Promise<void> {
  const supabase = getAdminClient();

  const { error } = await (supabase as any)
    .from('performance_alerts')
    .update({ status: 'dismissed' })
    .eq('id', alertId)
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to dismiss alert: ${error.message}`);
}

// Evaluation and triggering

export interface MetricData {
  pin_impressions?: number;
  pin_saves?: number;
  pin_clicks?: number;
  pin_ctr?: number;
  campaign_spend?: number;
  campaign_revenue?: number;
  campaign_roas?: number;
  campaign_cpa?: number;
}

export async function evaluateRulesForUser(
  userId: string,
  metricData: MetricData,
  context?: {
    pinId?: string;
    campaignId?: string;
  }
): Promise<PerformanceAlert[]> {
  const supabase = getAdminClient();

  // Get active rules for this user
  const { data: rules, error: rulesError } = await (supabase as any)
    .from('performance_alert_rules')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (rulesError) throw new Error(`Failed to get rules: ${rulesError.message}`);
  if (!rules?.length) return [];

  const triggeredAlerts: PerformanceAlert[] = [];

  for (const rule of rules as AlertRule[]) {
    const metricValue = (metricData as Record<string, number | undefined>)[rule.metric];
    if (metricValue === undefined) continue;

    if (evaluateCondition(metricValue, rule.operator, rule.threshold)) {
      // Generate alert message
      const message = generateAlertMessage(rule, metricValue, context);

      // Create the alert
      const alert = await createAlert(userId, {
        alert_type: rule.alert_type,
        title: rule.name,
        message,
        rule_id: rule.id,
        reference_id: context?.pinId || context?.campaignId,
        reference_table: context?.pinId ? 'pins' : context?.campaignId ? 'campaigns' : undefined,
      });

      // Update rule's last_triggered_at
      await (supabase as any)
        .from('performance_alert_rules')
        .update({ last_triggered_at: new Date().toISOString() })
        .eq('id', rule.id);

      triggeredAlerts.push(alert);
    }
  }

  return triggeredAlerts;
}

function generateAlertMessage(
  rule: AlertRule,
  actualValue: number,
  context?: { pinId?: string; campaignId?: string }
): string {
  const operatorText = getOperatorText(rule.operator);
  let entityText = '';

  if (context?.pinId) {
    entityText = `Pin ${context.pinId}`;
  } else if (context?.campaignId) {
    entityText = `Campaign ${context.campaignId}`;
  }

  const formattedValue = formatMetricValue(rule.metric, actualValue);
  const formattedThreshold = formatMetricValue(rule.metric, rule.threshold);

  if (entityText) {
    return `${entityText}: ${rule.metric} is ${formattedValue} (threshold: ${operatorText} ${formattedThreshold})`;
  }

  return `${rule.metric} is ${formattedValue} (threshold: ${operatorText} ${formattedThreshold})`;
}

function formatMetricValue(metric: string, value: number): string {
  if (metric.includes('ctr') || metric.includes('rate')) {
    return `${(value * 100).toFixed(2)}%`;
  }
  if (metric.includes('spend') || metric.includes('revenue') || metric.includes('cpa')) {
    return `$${value.toFixed(2)}`;
  }
  if (metric.includes('roas')) {
    return `${value.toFixed(2)}x`;
  }
  return value.toLocaleString();
}

// Default rules to create for new users
export const DEFAULT_ALERT_RULES: CreateAlertRuleInput[] = [
  {
    name: 'Pin reaches 1000 impressions',
    alert_type: 'pin_milestone',
    metric: 'pin_impressions',
    operator: 'gte',
    threshold: 1000,
    send_email: true,
  },
  {
    name: 'Pin CTR drops below 0.5%',
    alert_type: 'pin_underperformer',
    metric: 'pin_ctr',
    operator: 'lt',
    threshold: 0.005,
    send_email: true,
  },
  {
    name: 'Campaign CPA exceeds $10',
    alert_type: 'campaign_cpa',
    metric: 'campaign_cpa',
    operator: 'gt',
    threshold: 10,
    send_email: true,
  },
  {
    name: 'Campaign ROAS drops below 1.5x',
    alert_type: 'campaign_roas',
    metric: 'campaign_roas',
    operator: 'lt',
    threshold: 1.5,
    send_email: true,
  },
];

export async function createDefaultRulesForUser(userId: string): Promise<void> {
  for (const rule of DEFAULT_ALERT_RULES) {
    await createAlertRule(userId, rule);
  }
}
