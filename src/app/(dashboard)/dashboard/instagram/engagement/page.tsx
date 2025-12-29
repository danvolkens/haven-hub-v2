'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  buttonVariants,
  Badge,
  Progress,
} from '@/components/ui';
import {
  MessageCircle,
  CheckCircle,
  Clock,
  Users,
  Mail,
  Instagram,
  ExternalLink,
  SkipForward,
  ChevronRight,
  RefreshCw,
  Target,
  Sparkles,
  Calendar,
  Send,
} from 'lucide-react';
// ============================================================================
// Types (inline to avoid importing server-side code)
// ============================================================================

type TaskType = 'respond_comment' | 'respond_dm' | 'engage_account' | 'post_story' | 'follow_up_dm';
type TimeSlot = 'morning' | 'afternoon' | 'evening';
type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'expired';

interface EngagementTask {
  id: string;
  user_id: string;
  task_type: TaskType;
  priority: number;
  target_account: string | null;
  target_content_id: string | null;
  target_content_preview: string | null;
  scheduled_date: string;
  scheduled_slot: TimeSlot;
  status: TaskStatus;
  started_at: string | null;
  completed_at: string | null;
  skipped_reason: string | null;
  notes: string | null;
  response_used: string | null;
  created_at: string;
  updated_at: string;
}

interface DailyEngagementSummary {
  date: string;
  slots: {
    morning: { tasks: EngagementTask[]; completed: number; total: number };
    afternoon: { tasks: EngagementTask[]; completed: number; total: number };
    evening: { tasks: EngagementTask[]; completed: number; total: number };
  };
  overallProgress: { completed: number; total: number; percentage: number };
  accountsEngaged: number;
  commentsResponded: number;
  dmsReplied: number;
}

interface DMTemplate {
  id: string;
  name: string;
  template_type: string;
  message_template: string;
  variables: string[];
  use_count: number;
  is_system: boolean;
}

// Time slot configuration
const TIME_SLOT_CONFIG: Record<TimeSlot, { label: string; duration: string; description: string }> = {
  morning: {
    label: 'Morning',
    duration: '15 min',
    description: 'Comments, DMs, engage 5 accounts',
  },
  afternoon: {
    label: 'Afternoon',
    duration: '15 min',
    description: 'Comment responses, reciprocal engagement',
  },
  evening: {
    label: 'Evening',
    duration: '15 min',
    description: 'Final responses, Stories, DM replies',
  },
};

const TASK_TYPE_CONFIG: Record<TaskType, { label: string; icon: string; action: string }> = {
  respond_comment: {
    label: 'Respond to Comment',
    icon: '💬',
    action: 'Reply to this comment',
  },
  respond_dm: {
    label: 'Respond to DM',
    icon: '✉️',
    action: 'Check and reply to DMs',
  },
  engage_account: {
    label: 'Engage Account',
    icon: '👋',
    action: 'Like, comment on their posts',
  },
  post_story: {
    label: 'Post Story',
    icon: '📱',
    action: 'Share a story',
  },
  follow_up_dm: {
    label: 'Follow-up DM',
    icon: '📩',
    action: 'Send follow-up message',
  },
};

// ============================================================================
// Main Component
// ============================================================================

export default function EngagementDashboard() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const queryClient = useQueryClient();

  // Fetch daily summary
  const { data: summary, isLoading: loadingSummary, refetch: refetchSummary } = useQuery<DailyEngagementSummary>({
    queryKey: ['engagement', 'summary', selectedDate.toISOString().split('T')[0]],
    queryFn: async () => {
      const res = await fetch(`/api/instagram/engagement/summary?date=${selectedDate.toISOString().split('T')[0]}`);
      if (!res.ok) {
        // Return mock data if API not ready
        return {
          date: selectedDate.toISOString().split('T')[0],
          slots: {
            morning: { tasks: [], completed: 0, total: 7 },
            afternoon: { tasks: [], completed: 0, total: 4 },
            evening: { tasks: [], completed: 0, total: 5 },
          },
          overallProgress: { completed: 0, total: 16, percentage: 0 },
          accountsEngaged: 0,
          commentsResponded: 0,
          dmsReplied: 0,
        };
      }
      return res.json();
    },
  });

  // Fetch DM templates
  const { data: dmTemplates } = useQuery<DMTemplate[]>({
    queryKey: ['engagement', 'dm-templates'],
    queryFn: async () => {
      const res = await fetch('/api/instagram/engagement/dm-templates');
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Generate tasks mutation
  const generateTasksMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/instagram/engagement/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate.toISOString().split('T')[0] }),
      });
      if (!res.ok) throw new Error('Failed to generate tasks');
      return res.json();
    },
    onSuccess: () => {
      refetchSummary();
    },
  });

  // Complete task mutation
  const completeTaskMutation = useMutation({
    mutationFn: async ({ taskId, notes }: { taskId: string; notes?: string }) => {
      const res = await fetch(`/api/instagram/engagement/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed', notes }),
      });
      if (!res.ok) throw new Error('Failed to complete task');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engagement'] });
    },
  });

  // Skip task mutation
  const skipTaskMutation = useMutation({
    mutationFn: async ({ taskId, reason }: { taskId: string; reason?: string }) => {
      const res = await fetch(`/api/instagram/engagement/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'skipped', skipped_reason: reason }),
      });
      if (!res.ok) throw new Error('Failed to skip task');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engagement'] });
    },
  });

  const isToday = selectedDate.toDateString() === new Date().toDateString();
  const dateLabel = isToday ? 'Today' : selectedDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <PageContainer title="Instagram Engagement">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Daily Engagement</h2>
              <p className="text-sm text-muted-foreground">
                30-45 minutes for meaningful connections
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => generateTasksMutation.mutate()}
              disabled={generateTasksMutation.isPending}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Tasks
            </Button>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants()}
            >
              <Instagram className="mr-2 h-4 w-4" />
              Open Instagram
              <ExternalLink className="ml-2 h-3 w-3" />
            </a>
          </div>
        </div>

        {/* Date Selector & Progress */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Calendar className="h-4 w-4" />
              Date
            </div>
            <p className="text-lg font-semibold">{dateLabel}</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Target className="h-4 w-4" />
              Progress
            </div>
            <div className="flex items-center gap-2">
              <Progress
                value={summary?.overallProgress.percentage || 0}
                className="flex-1"
              />
              <span className="text-sm font-medium">
                {summary?.overallProgress.completed || 0}/{summary?.overallProgress.total || 0}
              </span>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              Accounts Engaged
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{summary?.accountsEngaged || 0}</span>
              <span className="text-sm text-muted-foreground">/ 10</span>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <MessageCircle className="h-4 w-4" />
              Responses
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-lg font-bold">{summary?.commentsResponded || 0}</p>
                <p className="text-xs text-muted-foreground">Comments</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{summary?.dmsReplied || 0}</p>
                <p className="text-xs text-muted-foreground">DMs</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Time Slots */}
        <div className="grid gap-6 lg:grid-cols-3">
          {(['morning', 'afternoon', 'evening'] as TimeSlot[]).map((slot) => (
            <TimeSlotCard
              key={slot}
              slot={slot}
              data={summary?.slots[slot]}
              onComplete={(taskId) => completeTaskMutation.mutate({ taskId })}
              onSkip={(taskId) => skipTaskMutation.mutate({ taskId })}
              isLoading={loadingSummary}
            />
          ))}
        </div>

        {/* DM Templates */}
        <DMTemplatesCard templates={dmTemplates || []} />

        {/* Quick Links */}
        <Card>
          <CardHeader className="pb-2">
            <h3 className="font-semibold">Quick Links</h3>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <a
              href="https://instagram.com/direct/inbox/"
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: 'secondary', size: 'sm' })}
            >
              <Mail className="mr-2 h-4 w-4" />
              DM Inbox
              <ExternalLink className="ml-2 h-3 w-3" />
            </a>
            <a
              href="https://instagram.com/accounts/activity/"
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: 'secondary', size: 'sm' })}
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Activity Feed
              <ExternalLink className="ml-2 h-3 w-3" />
            </a>
            <Link
              href="/dashboard/instagram/calendar"
              className={buttonVariants({ variant: 'secondary', size: 'sm' })}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Content Calendar
            </Link>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

// ============================================================================
// Sub-Components
// ============================================================================

interface TimeSlotCardProps {
  slot: TimeSlot;
  data?: {
    tasks: EngagementTask[];
    completed: number;
    total: number;
  };
  onComplete: (taskId: string) => void;
  onSkip: (taskId: string) => void;
  isLoading: boolean;
}

function TimeSlotCard({ slot, data, onComplete, onSkip, isLoading }: TimeSlotCardProps) {
  const config = TIME_SLOT_CONFIG[slot];
  const isComplete = data && data.completed === data.total && data.total > 0;
  const hasProgress = data && data.completed > 0;

  return (
    <Card className={isComplete ? 'border-green-200 bg-green-50/50' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">{config.label}</h3>
            <Badge variant="secondary">{config.duration}</Badge>
          </div>
          {isComplete && (
            <Badge variant="success">
              <CheckCircle className="mr-1 h-3 w-3" />
              Complete
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{config.description}</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : data?.tasks.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Sparkles className="mx-auto h-8 w-8 mb-2" />
            <p className="text-sm">No tasks scheduled</p>
            <p className="text-xs">Generate tasks to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data?.tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onComplete={() => onComplete(task.id)}
                onSkip={() => onSkip(task.id)}
              />
            ))}
          </div>
        )}

        {hasProgress && !isComplete && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">
                {data.completed}/{data.total}
              </span>
            </div>
            <Progress
              value={(data.completed / data.total) * 100}
              size="sm"
              className="mt-1"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface TaskItemProps {
  task: EngagementTask;
  onComplete: () => void;
  onSkip: () => void;
}

function TaskItem({ task, onComplete, onSkip }: TaskItemProps) {
  const config = TASK_TYPE_CONFIG[task.task_type];
  const isCompleted = task.status === 'completed';
  const isSkipped = task.status === 'skipped';

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
        isCompleted
          ? 'bg-green-50 border-green-200'
          : isSkipped
            ? 'bg-muted/50 border-muted'
            : 'hover:bg-muted/50'
      }`}
    >
      <span className="text-xl">{config.icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${isSkipped ? 'text-muted-foreground line-through' : ''}`}>
          {config.label}
        </p>
        {task.target_account && (
          <p className="text-xs text-muted-foreground truncate">@{task.target_account}</p>
        )}
        {task.target_content_preview && (
          <p className="text-xs text-muted-foreground truncate">{task.target_content_preview}</p>
        )}
      </div>
      {isCompleted ? (
        <CheckCircle className="h-5 w-5 text-green-600" />
      ) : isSkipped ? (
        <SkipForward className="h-5 w-5 text-muted-foreground" />
      ) : (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={onSkip} title="Skip">
            <SkipForward className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={onComplete} title="Complete">
            <CheckCircle className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function DMTemplatesCard({ templates }: { templates: DMTemplate[] }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (template: DMTemplate) => {
    navigator.clipboard.writeText(template.message_template);
    setCopiedId(template.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const groupedTemplates = templates.reduce(
    (acc, template) => {
      if (!acc[template.template_type]) {
        acc[template.template_type] = [];
      }
      acc[template.template_type].push(template);
      return acc;
    },
    {} as Record<string, DMTemplate[]>
  );

  const typeLabels: Record<string, string> = {
    new_follower: 'New Follower',
    quiz_complete: 'Quiz Complete',
    purchase_thank_you: 'Purchase Thank You',
    ugc_request: 'UGC Request',
    follow_up: 'Follow-up',
    general: 'General',
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">DM Templates</h3>
          </div>
          <Badge variant="secondary">{templates.length} templates</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Click to copy a template for quick DM responses
        </p>
      </CardHeader>
      <CardContent>
        {Object.entries(groupedTemplates).map(([type, typeTemplates]) => (
          <div key={type} className="mb-4 last:mb-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              {typeLabels[type] || type}
            </p>
            <div className="space-y-2">
              {typeTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleCopy(template)}
                  className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium">{template.name}</p>
                    {copiedId === template.id ? (
                      <Badge variant="success">Copied!</Badge>
                    ) : (
                      <Badge variant="secondary">Click to copy</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {template.message_template.substring(0, 100)}...
                  </p>
                </button>
              ))}
            </div>
          </div>
        ))}
        {templates.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <Mail className="mx-auto h-8 w-8 mb-2" />
            <p className="text-sm">No DM templates found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
