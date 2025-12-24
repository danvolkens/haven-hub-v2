import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Lightbulb, TrendingUp, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface AIInsightsProps {
  userId: string;
}

export async function AIInsights({ userId }: AIInsightsProps) {
  const supabase = await createClient();

  // Fetch recent AI insights
  const { data: insights } = await (supabase as any)
    .from('intelligence_insights')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(3);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity':
        return <Lightbulb className="h-4 w-4 text-yellow-500" />;
      case 'trend':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'alert':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Sparkles className="h-4 w-4 text-purple-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'low':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-500" />
          AI Insights
        </h3>
        <Link
          href="/dashboard/intelligence"
          className="text-sm text-primary hover:underline"
        >
          View all
        </Link>
      </div>

      <div className="space-y-4">
        {insights && insights.length > 0 ? (
          insights.map((insight: any) => (
            <div
              key={insight.id}
              className="p-3 rounded-lg bg-muted/50 border border-border"
            >
              <div className="flex items-start gap-3">
                {getInsightIcon(insight.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium">{insight.title}</p>
                    <Badge className={`text-xs ${getPriorityColor(insight.priority)}`}>
                      {insight.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {insight.description}
                  </p>
                  {insight.action_url && (
                    <Link
                      href={insight.action_url}
                      className="inline-block text-xs text-primary hover:underline mt-2"
                    >
                      {insight.action_label || 'Take action'} →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-6">
            <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No insights available yet. Keep using the platform to generate AI-powered recommendations.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
