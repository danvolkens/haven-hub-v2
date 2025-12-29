'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Target,
  TrendingUp,
  ChevronRight,
  Wand2,
  CheckCircle,
  RefreshCw,
  Users,
  Heart,
  MousePointerClick,
  ExternalLink,
} from 'lucide-react';
import { api } from '@/lib/fetcher';
import Link from 'next/link';

// Inlined types
type WeekType = 'foundation' | 'engagement' | 'community' | 'conversion';

interface WeekTheme {
  week: number;
  theme: string;
  focus: string;
  week_type: WeekType;
}

interface MonthlyKPIs {
  followers?: string;
  engagement_rate?: string;
  quiz_clicks?: number | string;
  website_traffic?: string;
  saves?: string;
  repeat_customers?: string;
  email_list?: string;
}

interface MonthlyPlan {
  id?: string;
  month_number: number;
  theme_name: string;
  description: string | null;
  week_themes: WeekTheme[];
  kpis: MonthlyKPIs;
}

const MONTH_COLORS: Record<number, string> = {
  1: 'border-blue-200 bg-blue-50',
  2: 'border-green-200 bg-green-50',
  3: 'border-purple-200 bg-purple-50',
};

const MONTH_ICONS: Record<number, string> = {
  1: '🚀',
  2: '📈',
  3: '⚡',
};

const WEEK_TYPE_LABELS: Record<WeekType, string> = {
  foundation: 'Foundation',
  engagement: 'Engagement',
  community: 'Community',
  conversion: 'Conversion',
};

const WEEK_TYPE_COLORS: Record<WeekType, string> = {
  foundation: 'bg-blue-100 text-blue-800',
  engagement: 'bg-green-100 text-green-800',
  community: 'bg-purple-100 text-purple-800',
  conversion: 'bg-orange-100 text-orange-800',
};

const KPI_ICONS: Record<string, typeof Target> = {
  followers: Users,
  engagement_rate: Heart,
  quiz_clicks: MousePointerClick,
  website_traffic: ExternalLink,
  saves: Heart,
  repeat_customers: Users,
  email_list: Users,
};

export default function PlanningPage() {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  // Fetch all monthly plans
  const { data: plans = [], isLoading } = useQuery<MonthlyPlan[]>({
    queryKey: ['monthly-plans'],
    queryFn: () => api.get<MonthlyPlan[]>('/instagram/planning', { action: 'all' }),
  });

  // Initialize themes
  const initializeMutation = useMutation({
    mutationFn: () => api.post('/instagram/planning', { action: 'initialize' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly-plans'] });
    },
  });

  const selectedPlan = plans.find((p) => p.month_number === selectedMonth);

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
          <h1 className="text-2xl font-bold">Monthly Planning</h1>
          <p className="text-muted-foreground">
            3-month content strategy with weekly themes and KPI targets
          </p>
        </div>
        {plans.length === 0 && (
          <Button
            onClick={() => initializeMutation.mutate()}
            disabled={initializeMutation.isPending}
          >
            <Wand2 className="mr-2 h-4 w-4" />
            Initialize Plans
          </Button>
        )}
      </div>

      {/* Month Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <Card
            key={plan.month_number}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedMonth === plan.month_number ? 'ring-2 ring-primary' : ''
            } ${MONTH_COLORS[plan.month_number] || ''}`}
            onClick={() => setSelectedMonth(plan.month_number)}
          >
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-3xl mb-2">{MONTH_ICONS[plan.month_number]}</div>
                  <h3 className="font-semibold text-lg">Month {plan.month_number}</h3>
                  <p className="text-sm font-medium text-primary">{plan.theme_name}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {plan.description}
                  </p>
                </div>
                {selectedMonth === plan.month_number && (
                  <CheckCircle className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                {plan.week_themes.length} weeks
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Selected Month Details */}
      {selectedPlan ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Week Themes */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader title="Weekly Themes">
                <span className="text-sm text-muted-foreground">
                  Month {selectedPlan.month_number}: {selectedPlan.theme_name}
                </span>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {selectedPlan.week_themes.map((weekTheme) => (
                    <div
                      key={weekTheme.week}
                      className="flex items-start gap-4 p-4 border rounded-lg"
                    >
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-lg font-bold text-primary">
                          {weekTheme.week}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{weekTheme.theme}</h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs ${
                              WEEK_TYPE_COLORS[weekTheme.week_type]
                            }`}
                          >
                            {WEEK_TYPE_LABELS[weekTheme.week_type]}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {weekTheme.focus}
                        </p>
                      </div>
                      <Link
                        href={`/dashboard/instagram/calendar/generate?weekType=${weekTheme.week_type}`}
                      >
                        <Button variant="secondary" size="sm">
                          <Calendar className="mr-1 h-3.5 w-3.5" />
                          Generate
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Generate All Weeks */}
            <Card>
              <CardContent className="py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Generate Full Month</h3>
                    <p className="text-sm text-muted-foreground">
                      Create content calendar for all 4 weeks
                    </p>
                  </div>
                  <Link href="/dashboard/instagram/calendar/generate">
                    <Button>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Generate Weeks
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* KPI Targets */}
          <div className="space-y-4">
            <Card>
              <CardHeader title="KPI Targets" />
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(selectedPlan.kpis).map(([key, value]) => {
                    const Icon = KPI_ICONS[key] || Target;
                    const label = key
                      .split('_')
                      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                      .join(' ');

                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                          <span className="text-sm font-medium">{label}</span>
                        </div>
                        <span className="text-sm font-semibold text-primary">
                          {value}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader title="Quick Actions" />
              <CardContent className="space-y-2">
                <Link href="/dashboard/instagram/calendar">
                  <Button variant="secondary" className="w-full justify-start">
                    <Calendar className="mr-2 h-4 w-4" />
                    View Calendar
                  </Button>
                </Link>
                <Link href="/dashboard/instagram/analytics">
                  <Button variant="secondary" className="w-full justify-start">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    View Analytics
                  </Button>
                </Link>
                <Link href="/dashboard/instagram/analytics/audit">
                  <Button variant="secondary" className="w-full justify-start">
                    <Target className="mr-2 h-4 w-4" />
                    Content Audit
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Select a Month</h3>
            <p className="text-muted-foreground">
              Choose a month above to see weekly themes and KPI targets
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
