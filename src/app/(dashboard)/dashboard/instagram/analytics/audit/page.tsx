'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  Settings,
  FileText,
} from 'lucide-react';

// ============================================================================
// Types (inlined to avoid server-side import)
// ============================================================================

type PeriodType = 'weekly' | 'monthly';
type AuditStatus = 'generated' | 'reviewed' | 'actioned';
type ActionPriority = 'high' | 'medium' | 'low';
type ActionItemStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

interface MetricValue {
  value: number;
  target?: number;
  trend?: number;
  status?: 'above' | 'below' | 'at';
}

interface AuditMetrics {
  reach: MetricValue;
  engagement_rate: MetricValue;
  saves_rate: MetricValue;
  shares_rate: MetricValue;
  profile_visits: MetricValue;
  link_clicks_rate: MetricValue;
  follower_growth: MetricValue;
  quiz_clicks: MetricValue;
  ig_sales_percent: MetricValue;
}

interface AuditAction {
  action: string;
  priority: ActionPriority;
  category: string;
}

interface ContentAudit {
  id: string;
  user_id: string;
  period_type: PeriodType;
  period_start: string;
  period_end: string;
  metrics: AuditMetrics;
  top_posts: string[];
  top_saved: string[];
  top_reels: string[];
  top_shared: string[];
  insights: string[];
  actions: AuditAction[];
  status: AuditStatus;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

interface AuditActionItem {
  id: string;
  user_id: string;
  audit_id: string;
  action: string;
  category: string;
  priority: ActionPriority;
  status: ActionItemStatus;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
}

interface PerformanceTargets {
  engagement_rate_target: number;
  engagement_rate_good: number;
  saves_rate_target: number;
  shares_rate_target: number;
  link_clicks_rate_target: number;
  monthly_follower_growth_min: number;
  monthly_follower_growth_good: number;
  monthly_quiz_clicks_target: number;
  ig_sales_percent_target: number;
}

// ============================================================================
// Config
// ============================================================================

const PRIORITY_CONFIG: Record<ActionPriority, { label: string; color: string }> = {
  high: { label: 'High', color: 'bg-red-100 text-red-800' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  low: { label: 'Low', color: 'bg-green-100 text-green-800' },
};

const STATUS_CONFIG: Record<ActionItemStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-800', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-800', icon: RefreshCw },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  skipped: { label: 'Skipped', color: 'bg-gray-100 text-gray-500', icon: AlertCircle },
};

// ============================================================================
// Component
// ============================================================================

export default function ContentAuditPage() {
  const [audits, setAudits] = useState<ContentAudit[]>([]);
  const [selectedAudit, setSelectedAudit] = useState<ContentAudit | null>(null);
  const [actionItems, setActionItems] = useState<AuditActionItem[]>([]);
  const [targets, setTargets] = useState<PerformanceTargets | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showTargets, setShowTargets] = useState(false);

  // Fetch audits and targets on mount
  useEffect(() => {
    fetchAudits();
    fetchTargets();
  }, []);

  // Fetch action items when audit is selected
  useEffect(() => {
    if (selectedAudit) {
      fetchActionItems(selectedAudit.id);
    }
  }, [selectedAudit]);

  const fetchAudits = async () => {
    try {
      const res = await fetch('/api/instagram/audit?action=list');
      const data = await res.json();
      setAudits(data);
      if (data.length > 0 && !selectedAudit) {
        setSelectedAudit(data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch audits:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTargets = async () => {
    try {
      const res = await fetch('/api/instagram/audit?action=targets');
      const data = await res.json();
      setTargets(data);
    } catch (error) {
      console.error('Failed to fetch targets:', error);
    }
  };

  const fetchActionItems = async (auditId: string) => {
    try {
      const res = await fetch(`/api/instagram/audit?action=actions&auditId=${auditId}`);
      const data = await res.json();
      setActionItems(data);
    } catch (error) {
      console.error('Failed to fetch action items:', error);
    }
  };

  const generateAudit = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/instagram/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate' }),
      });
      const data = await res.json();
      if (data.id) {
        setAudits((prev) => [data, ...prev]);
        setSelectedAudit(data);
      }
    } catch (error) {
      console.error('Failed to generate audit:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const updateItemStatus = async (itemId: string, status: ActionItemStatus) => {
    try {
      await fetch('/api/instagram/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-item', itemId, status }),
      });
      setActionItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, status } : item
        )
      );
    } catch (error) {
      console.error('Failed to update item status:', error);
    }
  };

  const markReviewed = async () => {
    if (!selectedAudit) return;
    try {
      await fetch('/api/instagram/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'review', auditId: selectedAudit.id }),
      });
      setSelectedAudit((prev) =>
        prev ? { ...prev, status: 'reviewed', reviewed_at: new Date().toISOString() } : null
      );
      setAudits((prev) =>
        prev.map((a) =>
          a.id === selectedAudit.id ? { ...a, status: 'reviewed' as AuditStatus } : a
        )
      );
    } catch (error) {
      console.error('Failed to mark as reviewed:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Content Audit</h1>
          <p className="text-muted-foreground">
            Weekly performance analysis and action items
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setShowTargets(!showTargets)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Targets
          </Button>
          <Button onClick={generateAudit} disabled={isGenerating}>
            {isGenerating ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <BarChart3 className="h-4 w-4 mr-2" />
            )}
            Generate Audit
          </Button>
        </div>
      </div>

      {/* Performance Targets Panel */}
      {showTargets && targets && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Performance Targets</h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Engagement Rate</p>
                <p className="text-lg font-medium">{targets.engagement_rate_target}% - {targets.engagement_rate_good}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Save Rate</p>
                <p className="text-lg font-medium">{targets.saves_rate_target}%+</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Share Rate</p>
                <p className="text-lg font-medium">{targets.shares_rate_target}%+</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Link Clicks</p>
                <p className="text-lg font-medium">{targets.link_clicks_rate_target}%+</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Followers</p>
                <p className="text-lg font-medium">{targets.monthly_follower_growth_min}-{targets.monthly_follower_growth_good}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Quiz Clicks/Month</p>
                <p className="text-lg font-medium">{targets.monthly_quiz_clicks_target}+</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">IG Sales %</p>
                <p className="text-lg font-medium">{targets.ig_sales_percent_target}%+</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audit List */}
      {audits.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Audits Yet</h3>
            <p className="text-muted-foreground mb-4">
              Generate your first weekly content audit to see performance insights.
            </p>
            <Button onClick={generateAudit} disabled={isGenerating}>
              Generate First Audit
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Audit Selector */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <h3 className="text-lg font-semibold">Audit History</h3>
            </CardHeader>
            <CardContent className="space-y-2">
              {audits.map((audit) => (
                <button
                  key={audit.id}
                  onClick={() => setSelectedAudit(audit)}
                  className={`w-full p-3 rounded-lg text-left transition-colors ${
                    selectedAudit?.id === audit.id
                      ? 'bg-primary/10 border border-primary'
                      : 'hover:bg-muted border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {new Date(audit.period_start).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })} - {new Date(audit.period_end).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {audit.period_type}
                      </p>
                    </div>
                    <Badge
                      variant={audit.status === 'reviewed' ? 'default' : 'secondary'}
                    >
                      {audit.status}
                    </Badge>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Selected Audit Details */}
          {selectedAudit && (
            <div className="lg:col-span-2 space-y-6">
              {/* Metrics Overview */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <h3 className="text-lg font-semibold">Performance Metrics</h3>
                  {selectedAudit.status === 'generated' && (
                    <Button variant="secondary" size="sm" onClick={markReviewed}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Mark Reviewed
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <MetricCard
                      label="Engagement Rate"
                      value={`${selectedAudit.metrics.engagement_rate.value}%`}
                      target={`${selectedAudit.metrics.engagement_rate.target}%`}
                      status={selectedAudit.metrics.engagement_rate.status}
                    />
                    <MetricCard
                      label="Save Rate"
                      value={`${selectedAudit.metrics.saves_rate.value}%`}
                      target={`${selectedAudit.metrics.saves_rate.target}%`}
                      status={selectedAudit.metrics.saves_rate.status}
                    />
                    <MetricCard
                      label="Share Rate"
                      value={`${selectedAudit.metrics.shares_rate.value}%`}
                      target={`${selectedAudit.metrics.shares_rate.target}%`}
                      status={selectedAudit.metrics.shares_rate.status}
                    />
                    <MetricCard
                      label="Total Reach"
                      value={selectedAudit.metrics.reach.value.toLocaleString()}
                    />
                    <MetricCard
                      label="Profile Visits"
                      value={selectedAudit.metrics.profile_visits.value.toLocaleString()}
                    />
                    <MetricCard
                      label="Link Clicks"
                      value={`${selectedAudit.metrics.link_clicks_rate.value}%`}
                      target={`${selectedAudit.metrics.link_clicks_rate.target}%`}
                      status={selectedAudit.metrics.link_clicks_rate.status}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Insights */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">Insights</h3>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {selectedAudit.insights.map((insight, index) => (
                      <li key={index} className="flex items-start gap-2">
                        {insight.includes('above') || insight.includes('✓') ? (
                          <TrendingUp className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        ) : insight.includes('below') ? (
                          <TrendingDown className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                        ) : (
                          <Target className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                        )}
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Action Items */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">Action Items</h3>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {actionItems.map((item) => {
                      const StatusIcon = STATUS_CONFIG[item.status].icon;
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="flex items-start gap-3">
                            <StatusIcon className={`h-5 w-5 mt-0.5 ${
                              item.status === 'completed' ? 'text-green-500' :
                              item.status === 'in_progress' ? 'text-blue-500' :
                              'text-muted-foreground'
                            }`} />
                            <div>
                              <p className={item.status === 'completed' ? 'line-through text-muted-foreground' : ''}>
                                {item.action}
                              </p>
                              <div className="flex gap-2 mt-1">
                                <Badge className={PRIORITY_CONFIG[item.priority].color}>
                                  {item.priority}
                                </Badge>
                                <Badge variant="secondary">{item.category}</Badge>
                              </div>
                            </div>
                          </div>
                          {item.status !== 'completed' && item.status !== 'skipped' && (
                            <div className="flex gap-2">
                              {item.status === 'pending' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => updateItemStatus(item.id, 'in_progress')}
                                >
                                  Start
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => updateItemStatus(item.id, 'completed')}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Top Content */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">Top Performing Content</h3>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium mb-2">Top by Engagement</p>
                      {selectedAudit.top_posts.length > 0 ? (
                        <ul className="space-y-1">
                          {selectedAudit.top_posts.map((postId, i) => (
                            <li key={postId} className="text-sm text-muted-foreground flex items-center">
                              <ChevronRight className="h-4 w-4 mr-1" />
                              Post #{i + 1}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">No data</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Top by Saves</p>
                      {selectedAudit.top_saved.length > 0 ? (
                        <ul className="space-y-1">
                          {selectedAudit.top_saved.map((postId, i) => (
                            <li key={postId} className="text-sm text-muted-foreground flex items-center">
                              <ChevronRight className="h-4 w-4 mr-1" />
                              Post #{i + 1}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">No data</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Top Reels</p>
                      {selectedAudit.top_reels.length > 0 ? (
                        <ul className="space-y-1">
                          {selectedAudit.top_reels.map((postId, i) => (
                            <li key={postId} className="text-sm text-muted-foreground flex items-center">
                              <ChevronRight className="h-4 w-4 mr-1" />
                              Reel #{i + 1}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">No data</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Top by Shares</p>
                      {selectedAudit.top_shared.length > 0 ? (
                        <ul className="space-y-1">
                          {selectedAudit.top_shared.map((postId, i) => (
                            <li key={postId} className="text-sm text-muted-foreground flex items-center">
                              <ChevronRight className="h-4 w-4 mr-1" />
                              Post #{i + 1}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">No data</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function MetricCard({
  label,
  value,
  target,
  status,
}: {
  label: string;
  value: string;
  target?: string;
  status?: 'above' | 'below' | 'at';
}) {
  return (
    <div className="p-4 bg-muted/50 rounded-lg">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="flex items-baseline gap-2 mt-1">
        <p className="text-2xl font-semibold">{value}</p>
        {target && (
          <span className={`text-sm ${
            status === 'above' ? 'text-green-600' :
            status === 'below' ? 'text-red-600' :
            'text-muted-foreground'
          }`}>
            / {target}
          </span>
        )}
      </div>
      {status && (
        <div className="flex items-center gap-1 mt-1">
          {status === 'above' ? (
            <>
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-xs text-green-600">Above target</span>
            </>
          ) : status === 'below' ? (
            <>
              <TrendingDown className="h-4 w-4 text-red-500" />
              <span className="text-xs text-red-600">Below target</span>
            </>
          ) : (
            <>
              <Target className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-blue-600">On target</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
