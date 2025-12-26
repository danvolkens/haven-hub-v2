'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Target,
  TrendingUp,
  ChevronRight,
  CheckCircle,
  Circle,
  Clock,
  ArrowRight,
  Play,
  RefreshCw,
  Info,
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  Badge,
  Progress,
} from '@/components/ui';
import { PageContainer } from '@/components/layout/page-container';
import { api } from '@/lib/fetcher';
import { useToast } from '@/components/providers/toast-provider';
import { cn } from '@/lib/utils';

interface PhaseTarget {
  name: string;
  weeks: string;
  pins_per_week?: number;
  boards_to_create?: number;
  products_to_mockup?: number;
  target_impressions?: number;
  ad_budget_daily?: number;
  target_traffic?: number;
  conversion_rate?: number;
  target_roas?: number;
  winner_refresh_count?: number;
  target_revenue?: number;
  automation_level?: number;
}

interface PlaybookProgress {
  id: string;
  current_phase: number;
  current_week: number;
  phase_started_at: string;
  playbook_started_at: string;
  phase_targets: Record<string, PhaseTarget>;
}

interface WeekSnapshot {
  week_number: number;
  phase: number;
  snapshot_date: string;
  pins_published: number;
  impressions: number;
  saves: number;
  clicks: number;
  ad_spend: number;
  ad_revenue: number;
  ad_roas: number;
  total_revenue: number;
  overall_score: number;
  goals_met: Record<string, boolean>;
}

interface PlaybookResponse {
  progress: PlaybookProgress | null;
  snapshots: WeekSnapshot[];
  currentMetrics: {
    pinsThisWeek: number;
    impressionsThisWeek: number;
    savesThisWeek: number;
    clicksThisWeek: number;
    adSpendThisWeek: number;
    revenueThisWeek: number;
  };
  started: boolean;
}

const PHASE_COLORS = {
  1: 'bg-blue-500',
  2: 'bg-green-500',
  3: 'bg-yellow-500',
  4: 'bg-purple-500',
};

const PHASE_INFO = [
  { name: 'Foundation', description: 'Build your Pinterest presence', weeks: '1-4' },
  { name: 'Growth', description: 'Start paid advertising', weeks: '5-8' },
  { name: 'Optimization', description: 'Refine for performance', weeks: '9-12' },
  { name: 'Scale', description: 'Maximize returns', weeks: '13-16' },
];

export default function ScalingPlaybookPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery<PlaybookResponse>({
    queryKey: ['scaling-playbook'],
    queryFn: () => api.get('/scaling-playbook'),
  });

  const startMutation = useMutation({
    mutationFn: () => api.post('/scaling-playbook/start'),
    onSuccess: () => {
      toast('Playbook started!', 'success');
      queryClient.invalidateQueries({ queryKey: ['scaling-playbook'] });
    },
    onError: (error) => {
      toast(error instanceof Error ? error.message : 'Failed to start playbook', 'error');
    },
  });

  const advanceWeekMutation = useMutation({
    mutationFn: () => api.post('/scaling-playbook/advance-week'),
    onSuccess: () => {
      toast('Week advanced!', 'success');
      queryClient.invalidateQueries({ queryKey: ['scaling-playbook'] });
    },
    onError: (error) => {
      toast(error instanceof Error ? error.message : 'Failed to advance week', 'error');
    },
  });

  if (!data?.started) {
    return (
      <PageContainer
        title="16-Week Scaling Playbook"
        description="Track your Pinterest growth journey"
      >
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-sage/10 flex items-center justify-center mx-auto mb-6">
              <Target className="h-10 w-10 text-sage" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Start Your Pinterest Scaling Journey</h2>
            <p className="text-body text-[var(--color-text-secondary)] mb-6 max-w-lg mx-auto">
              The 16-week Pinterest Scaling Playbook guides you through building,
              growing, optimizing, and scaling your Pinterest presence for maximum ROI.
            </p>

            <div className="grid grid-cols-4 gap-4 max-w-2xl mx-auto mb-8">
              {PHASE_INFO.map((phase, idx) => (
                <div key={phase.name} className="text-center p-4 border rounded-lg">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2',
                    PHASE_COLORS[(idx + 1) as keyof typeof PHASE_COLORS]
                  )}>
                    <span className="text-white font-semibold text-sm">{idx + 1}</span>
                  </div>
                  <p className="text-body-sm font-medium">{phase.name}</p>
                  <p className="text-caption text-[var(--color-text-tertiary)]">
                    Weeks {phase.weeks}
                  </p>
                </div>
              ))}
            </div>

            <Button
              size="lg"
              onClick={() => startMutation.mutate()}
              isLoading={startMutation.isPending}
              leftIcon={<Play className="h-5 w-5" />}
            >
              Start Playbook
            </Button>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  const progress = data.progress!;
  const currentPhaseTargets = progress.phase_targets[`phase_${progress.current_phase}`];
  const weekInPhase = ((progress.current_week - 1) % 4) + 1;
  const overallProgress = (progress.current_week / 16) * 100;
  const phaseProgress = (weekInPhase / 4) * 100;

  return (
    <PageContainer
      title="16-Week Scaling Playbook"
      description={`Week ${progress.current_week} of 16 • ${currentPhaseTargets.name} Phase`}
      actions={
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => refetch()}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Refresh
          </Button>
          <Button
            onClick={() => advanceWeekMutation.mutate()}
            isLoading={advanceWeekMutation.isPending}
            leftIcon={<ArrowRight className="h-4 w-4" />}
          >
            Advance Week
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Progress Overview */}
        <div className="grid lg:grid-cols-4 gap-4">
          {PHASE_INFO.map((phase, idx) => {
            const phaseNum = idx + 1;
            const isComplete = progress.current_phase > phaseNum;
            const isCurrent = progress.current_phase === phaseNum;
            const isPending = progress.current_phase < phaseNum;

            return (
              <Card key={phase.name} className={cn(isCurrent && 'ring-2 ring-sage')}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center',
                      isComplete ? 'bg-success' : isCurrent ? PHASE_COLORS[phaseNum as keyof typeof PHASE_COLORS] : 'bg-elevated'
                    )}>
                      {isComplete ? (
                        <CheckCircle className="h-5 w-5 text-white" />
                      ) : (
                        <span className={cn(
                          'font-semibold',
                          isCurrent ? 'text-white' : 'text-[var(--color-text-tertiary)]'
                        )}>
                          {phaseNum}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-body-sm font-medium">{phase.name}</p>
                      <p className="text-caption text-[var(--color-text-tertiary)]">
                        Weeks {phase.weeks}
                      </p>
                    </div>
                  </div>
                  {isCurrent && (
                    <Progress value={phaseProgress} className="h-2" />
                  )}
                  {isComplete && (
                    <Badge variant="success" className="mt-2">Complete</Badge>
                  )}
                  {isPending && (
                    <Badge variant="secondary" className="mt-2">Upcoming</Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Current Phase Goals */}
          <Card className="lg:col-span-2">
            <CardHeader
              title={`${currentPhaseTargets.name} Phase Goals`}
              description={`Week ${weekInPhase} of 4 in this phase`}
            />
            <CardContent className="p-4">
              <div className="space-y-4">
                {currentPhaseTargets.pins_per_week && (
                  <GoalRow
                    label="Pins per week"
                    target={currentPhaseTargets.pins_per_week}
                    current={data.currentMetrics.pinsThisWeek}
                    format="number"
                  />
                )}
                {currentPhaseTargets.target_impressions && (
                  <GoalRow
                    label="Weekly impressions"
                    target={currentPhaseTargets.target_impressions}
                    current={data.currentMetrics.impressionsThisWeek}
                    format="number"
                  />
                )}
                {currentPhaseTargets.ad_budget_daily && (
                  <GoalRow
                    label="Daily ad budget"
                    target={currentPhaseTargets.ad_budget_daily * 7}
                    current={data.currentMetrics.adSpendThisWeek}
                    format="currency"
                  />
                )}
                {currentPhaseTargets.target_revenue && (
                  <GoalRow
                    label="Weekly revenue target"
                    target={currentPhaseTargets.target_revenue / 4}
                    current={data.currentMetrics.revenueThisWeek}
                    format="currency"
                  />
                )}
                {currentPhaseTargets.target_roas && (
                  <GoalRow
                    label="Target ROAS"
                    target={currentPhaseTargets.target_roas}
                    current={
                      data.currentMetrics.adSpendThisWeek > 0
                        ? data.currentMetrics.revenueThisWeek / data.currentMetrics.adSpendThisWeek
                        : 0
                    }
                    format="roas"
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* This Week's Stats */}
          <Card>
            <CardHeader title="This Week" />
            <CardContent className="p-4">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-body-sm text-[var(--color-text-secondary)]">Pins Published</span>
                  <span className="text-body-sm font-medium">{data.currentMetrics.pinsThisWeek}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-body-sm text-[var(--color-text-secondary)]">Impressions</span>
                  <span className="text-body-sm font-medium">{data.currentMetrics.impressionsThisWeek.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-body-sm text-[var(--color-text-secondary)]">Saves</span>
                  <span className="text-body-sm font-medium">{data.currentMetrics.savesThisWeek}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-body-sm text-[var(--color-text-secondary)]">Clicks</span>
                  <span className="text-body-sm font-medium">{data.currentMetrics.clicksThisWeek}</span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-body-sm text-[var(--color-text-secondary)]">Ad Spend</span>
                    <span className="text-body-sm font-medium">${data.currentMetrics.adSpendThisWeek.toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-body-sm text-[var(--color-text-secondary)]">Revenue</span>
                  <span className="text-body-sm font-medium text-success">${data.currentMetrics.revenueThisWeek.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Weekly History */}
        <Card>
          <CardHeader
            title="Weekly Progress"
            description="Track your performance over time"
          />
          <CardContent className="p-0">
            {data.snapshots.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-elevated">
                    <tr>
                      <th className="text-left text-caption font-medium p-3">Week</th>
                      <th className="text-left text-caption font-medium p-3">Phase</th>
                      <th className="text-right text-caption font-medium p-3">Pins</th>
                      <th className="text-right text-caption font-medium p-3">Impressions</th>
                      <th className="text-right text-caption font-medium p-3">Clicks</th>
                      <th className="text-right text-caption font-medium p-3">Ad Spend</th>
                      <th className="text-right text-caption font-medium p-3">Revenue</th>
                      <th className="text-right text-caption font-medium p-3">ROAS</th>
                      <th className="text-right text-caption font-medium p-3">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.snapshots.map((snapshot) => (
                      <tr key={snapshot.week_number} className="hover:bg-elevated/50">
                        <td className="p-3 text-body-sm font-medium">Week {snapshot.week_number}</td>
                        <td className="p-3">
                          <Badge variant="secondary" className="text-xs">
                            {PHASE_INFO[snapshot.phase - 1].name}
                          </Badge>
                        </td>
                        <td className="p-3 text-right text-body-sm">{snapshot.pins_published}</td>
                        <td className="p-3 text-right text-body-sm">{snapshot.impressions.toLocaleString()}</td>
                        <td className="p-3 text-right text-body-sm">{snapshot.clicks}</td>
                        <td className="p-3 text-right text-body-sm">${snapshot.ad_spend.toFixed(2)}</td>
                        <td className="p-3 text-right text-body-sm text-success">${snapshot.total_revenue.toFixed(2)}</td>
                        <td className="p-3 text-right text-body-sm">
                          {snapshot.ad_spend > 0 ? `${snapshot.ad_roas.toFixed(1)}x` : '-'}
                        </td>
                        <td className="p-3 text-right">
                          <Badge variant={snapshot.overall_score >= 80 ? 'success' : snapshot.overall_score >= 50 ? 'warning' : 'error'}>
                            {snapshot.overall_score}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-[var(--color-text-secondary)]">
                <Clock className="h-8 w-8 mx-auto mb-3 opacity-50" />
                <p>No weekly snapshots yet. Complete your first week to see progress.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="bg-elevated">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-sage mt-0.5" />
              <div>
                <h4 className="text-body-sm font-medium mb-1">Phase {progress.current_phase} Tips</h4>
                <p className="text-caption text-[var(--color-text-secondary)]">
                  {progress.current_phase === 1 && 'Focus on creating quality content and establishing your boards. Aim for consistency over volume.'}
                  {progress.current_phase === 2 && 'Start with a small ad budget to test what resonates. Monitor click-through rates closely.'}
                  {progress.current_phase === 3 && 'Double down on winners. Refresh underperforming pins and optimize your best performers.'}
                  {progress.current_phase === 4 && 'Scale your budget on proven winners. Automate as much as possible to maintain growth.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

function GoalRow({
  label,
  target,
  current,
  format,
}: {
  label: string;
  target: number;
  current: number;
  format: 'number' | 'currency' | 'percent' | 'roas';
}) {
  const progress = Math.min((current / target) * 100, 100);
  const isComplete = current >= target;

  const formatValue = (value: number) => {
    switch (format) {
      case 'currency':
        return `$${value.toFixed(2)}`;
      case 'percent':
        return `${(value * 100).toFixed(1)}%`;
      case 'roas':
        return `${value.toFixed(1)}x`;
      default:
        return value.toLocaleString();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-body-sm">{label}</span>
        <div className="flex items-center gap-2">
          <span className={cn('text-body-sm font-medium', isComplete && 'text-success')}>
            {formatValue(current)}
          </span>
          <span className="text-caption text-[var(--color-text-tertiary)]">
            / {formatValue(target)}
          </span>
          {isComplete && <CheckCircle className="h-4 w-4 text-success" />}
        </div>
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
}
