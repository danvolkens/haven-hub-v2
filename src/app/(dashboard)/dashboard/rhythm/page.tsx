'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/page-container';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  Circle,
  Plus,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Trash2,
  BarChart2,
  MessageSquare,
  Megaphone,
  Settings,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RhythmTask {
  id: string;
  day_of_week: number;
  task_name: string;
  task_description: string | null;
  category: 'content' | 'engagement' | 'analytics' | 'ads' | 'maintenance';
  completed_today?: boolean;
}

interface WeeklyProgress {
  startDate: string;
  endDate: string;
  days: {
    date: string;
    dayOfWeek: number;
    dayName: string;
    totalTasks: number;
    completedTasks: number;
    tasks: RhythmTask[];
  }[];
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const CATEGORY_ICONS = {
  content: MessageSquare,
  engagement: Target,
  analytics: BarChart2,
  ads: Megaphone,
  maintenance: Settings,
};

const CATEGORY_COLORS = {
  content: 'bg-blue-100 text-blue-800',
  engagement: 'bg-green-100 text-green-800',
  analytics: 'bg-purple-100 text-purple-800',
  ads: 'bg-orange-100 text-orange-800',
  maintenance: 'bg-gray-100 text-gray-800',
};

export default function RhythmPage() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({
    dayOfWeek: new Date().getDay(),
    taskName: '',
    taskDescription: '',
    category: 'content' as const,
  });

  // Get start of week for the selected date
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    return d;
  };

  const weekStart = getWeekStart(selectedDate);

  // Fetch weekly progress
  const { data: weekData, isLoading } = useQuery<WeeklyProgress>({
    queryKey: ['rhythm-week', weekStart.toISOString()],
    queryFn: async () => {
      const res = await fetch(
        `/api/rhythm?view=week&date=${weekStart.toISOString()}`
      );
      if (!res.ok) throw new Error('Failed to fetch rhythm');
      return res.json();
    },
  });

  // Toggle task completion
  const toggleTask = useMutation({
    mutationFn: async ({
      taskId,
      completed,
      date,
    }: {
      taskId: string;
      completed: boolean;
      date: string;
    }) => {
      const res = await fetch(`/api/rhythm/${taskId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: completed ? 'uncomplete' : 'complete',
          date,
        }),
      });
      if (!res.ok) throw new Error('Failed to toggle task');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rhythm-week'] });
    },
  });

  // Create new task
  const createTask = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/rhythm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask),
      });
      if (!res.ok) throw new Error('Failed to create task');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rhythm-week'] });
      setNewTask({
        dayOfWeek: new Date().getDay(),
        taskName: '',
        taskDescription: '',
        category: 'content',
      });
      setShowAddTask(false);
    },
  });

  // Delete task
  const deleteTask = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await fetch(`/api/rhythm/${taskId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete task');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rhythm-week'] });
    },
  });

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedDate(newDate);
  };

  const isToday = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  };

  return (
    <PageContainer
      title="Weekly Rhythm"
      description="Your Pinterest marketing rhythm - daily tasks for consistent growth"
    >
      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigateWeek('prev')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">
              {weekData?.startDate
                ? new Date(weekData.startDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })
                : ''}{' '}
              -{' '}
              {weekData?.endDate
                ? new Date(weekData.endDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })
                : ''}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigateWeek('next')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-4">
          {weekData && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {weekData.completedTasks}
              </span>{' '}
              of {weekData.totalTasks} tasks (
              {Math.round(weekData.completionRate * 100)}%)
            </div>
          )}
          <Button onClick={() => setShowAddTask(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      {weekData && (
        <div className="mb-6">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-sage transition-all duration-300"
              style={{ width: `${weekData.completionRate * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Add Task Form */}
      {showAddTask && (
        <Card className="p-4 mb-6">
          <h3 className="font-medium mb-4">Add New Task</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <Label>Day</Label>
              <select
                value={newTask.dayOfWeek}
                onChange={(e) =>
                  setNewTask({ ...newTask, dayOfWeek: parseInt(e.target.value) })
                }
                className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2"
              >
                {FULL_DAY_NAMES.map((name, i) => (
                  <option key={i} value={i}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Category</Label>
              <select
                value={newTask.category}
                onChange={(e) =>
                  setNewTask({ ...newTask, category: e.target.value as any })
                }
                className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2"
              >
                <option value="content">Content</option>
                <option value="engagement">Engagement</option>
                <option value="analytics">Analytics</option>
                <option value="ads">Ads</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <Label>Task Name</Label>
              <Input
                value={newTask.taskName}
                onChange={(e) =>
                  setNewTask({ ...newTask, taskName: e.target.value })
                }
                placeholder="e.g., Schedule week's pins"
                className="mt-1"
              />
            </div>
          </div>
          <div className="mb-4">
            <Label>Description (optional)</Label>
            <Input
              value={newTask.taskDescription}
              onChange={(e) =>
                setNewTask({ ...newTask, taskDescription: e.target.value })
              }
              placeholder="Brief description of the task"
              className="mt-1"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowAddTask(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createTask.mutate()}
              disabled={!newTask.taskName || createTask.isPending}
            >
              {createTask.isPending ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </Card>
      )}

      {/* Week Grid */}
      {isLoading ? (
        <div className="text-muted-foreground">Loading rhythm...</div>
      ) : (
        <div className="grid grid-cols-7 gap-4">
          {weekData?.days.map((day) => (
            <Card
              key={day.date}
              className={cn(
                'p-4 min-h-[200px]',
                isToday(day.date) && 'ring-2 ring-sage'
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div
                    className={cn(
                      'font-medium',
                      isToday(day.date) && 'text-sage'
                    )}
                  >
                    {DAY_NAMES[day.dayOfWeek]}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(day.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                </div>
                {day.totalTasks > 0 && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      day.completedTasks === day.totalTasks
                        ? 'bg-green-100 text-green-800'
                        : ''
                    )}
                  >
                    {day.completedTasks}/{day.totalTasks}
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                {day.tasks.map((task) => {
                  const Icon = CATEGORY_ICONS[task.category];
                  return (
                    <div
                      key={task.id}
                      className="group flex items-start gap-2 p-2 rounded hover:bg-muted/50 transition-colors"
                    >
                      <button
                        onClick={() =>
                          toggleTask.mutate({
                            taskId: task.id,
                            completed: task.completed_today || false,
                            date: day.date,
                          })
                        }
                        className="mt-0.5 shrink-0 cursor-pointer"
                      >
                        {task.completed_today ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div
                          className={cn(
                            'text-sm font-medium truncate',
                            task.completed_today &&
                              'line-through text-muted-foreground'
                          )}
                        >
                          {task.task_name}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <Icon className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground capitalize">
                            {task.category}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteTask.mutate(task.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </button>
                    </div>
                  );
                })}

                {day.tasks.length === 0 && (
                  <div className="text-xs text-muted-foreground italic py-4 text-center">
                    No tasks
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Category Legend */}
      <div className="mt-8 flex flex-wrap gap-4 justify-center">
        {Object.entries(CATEGORY_ICONS).map(([category, Icon]) => (
          <div key={category} className="flex items-center gap-2 text-sm">
            <div
              className={cn(
                'w-6 h-6 rounded flex items-center justify-center',
                CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS]
              )}
            >
              <Icon className="h-3 w-3" />
            </div>
            <span className="capitalize">{category}</span>
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
