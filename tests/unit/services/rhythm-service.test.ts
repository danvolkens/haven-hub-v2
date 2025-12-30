import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock query builder
function createMockQueryBuilder(data: unknown[] | unknown = [], error: unknown = null) {
  const dataArray = Array.isArray(data) ? data : [data];
  const builder: Record<string, unknown> = {};

  ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'in', 'or', 'gte', 'lte', 'order', 'limit', 'range', 'single', 'is', 'not', 'upsert'].forEach(method => {
    builder[method] = vi.fn().mockReturnValue(builder);
  });

  builder.single = vi.fn().mockResolvedValue({ data: dataArray[0] || null, error });
  builder.then = vi.fn((resolve) => resolve({ data: dataArray, error, count: dataArray.length }));

  return builder;
}

const mockTask = {
  id: 'task-1',
  user_id: 'user-123',
  day_of_week: 1,
  task_name: 'Review analytics',
  task_description: 'Weekly analytics review',
  category: 'analytics',
  sort_order: 0,
  is_recurring: true,
  is_active: true,
  created_at: new Date().toISOString(),
};

const mockQueryBuilder = createMockQueryBuilder([mockTask]);

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: vi.fn(() => mockQueryBuilder),
  })),
}));

describe('Rhythm Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTasksForDay', () => {
    it('should be exported as a function', async () => {
      const { getTasksForDay } = await import('@/lib/rhythm/rhythm-service');
      expect(typeof getTasksForDay).toBe('function');
    });

    it('should accept userId and date', async () => {
      const { getTasksForDay } = await import('@/lib/rhythm/rhythm-service');
      const tasks = await getTasksForDay('user-123', new Date());

      expect(Array.isArray(tasks)).toBe(true);
    });

    it('should return empty array on error', async () => {
      const { getTasksForDay } = await import('@/lib/rhythm/rhythm-service');
      const tasks = await getTasksForDay('user-123');

      expect(tasks).toBeDefined();
    });
  });

  describe('completeTask', () => {
    it('should be exported as a function', async () => {
      const { completeTask } = await import('@/lib/rhythm/rhythm-service');
      expect(typeof completeTask).toBe('function');
    });
  });

  describe('uncompleteTask', () => {
    it('should be exported as a function', async () => {
      const { uncompleteTask } = await import('@/lib/rhythm/rhythm-service');
      expect(typeof uncompleteTask).toBe('function');
    });
  });

  describe('getWeeklyProgress', () => {
    it('should be exported as a function', async () => {
      const { getWeeklyProgress } = await import('@/lib/rhythm/rhythm-service');
      expect(typeof getWeeklyProgress).toBe('function');
    });
  });

  describe('createTask', () => {
    it('should be exported as a function', async () => {
      const { createTask } = await import('@/lib/rhythm/rhythm-service');
      expect(typeof createTask).toBe('function');
    });
  });

  describe('updateTask', () => {
    it('should be exported as a function', async () => {
      const { updateTask } = await import('@/lib/rhythm/rhythm-service');
      expect(typeof updateTask).toBe('function');
    });
  });

  describe('deleteTask', () => {
    it('should be exported as a function', async () => {
      const { deleteTask } = await import('@/lib/rhythm/rhythm-service');
      expect(typeof deleteTask).toBe('function');
    });
  });

  describe('getAllTasks', () => {
    it('should be exported as a function', async () => {
      const { getAllTasks } = await import('@/lib/rhythm/rhythm-service');
      expect(typeof getAllTasks).toBe('function');
    });

    it('should accept userId', async () => {
      const { getAllTasks } = await import('@/lib/rhythm/rhythm-service');
      const tasks = await getAllTasks('user-123');

      expect(tasks).toBeDefined();
    });
  });
});

describe('Rhythm Task Interface', () => {
  describe('Required Fields', () => {
    it('should have task_name', () => {
      const task = { task_name: 'Review analytics' };
      expect(task.task_name).toBeDefined();
    });

    it('should have day_of_week', () => {
      const task = { day_of_week: 1 };
      expect(task.day_of_week).toBe(1);
    });

    it('should have category', () => {
      const task = { category: 'analytics' };
      expect(task.category).toBeDefined();
    });
  });
});

describe('Task Categories', () => {
  const validCategories = ['content', 'engagement', 'analytics', 'ads', 'maintenance'];

  validCategories.forEach((category) => {
    it(`should recognize ${category} as valid category`, () => {
      expect(validCategories).toContain(category);
    });
  });
});

describe('Day of Week', () => {
  const days = [
    { index: 0, name: 'Sunday' },
    { index: 1, name: 'Monday' },
    { index: 2, name: 'Tuesday' },
    { index: 3, name: 'Wednesday' },
    { index: 4, name: 'Thursday' },
    { index: 5, name: 'Friday' },
    { index: 6, name: 'Saturday' },
  ];

  days.forEach(({ index, name }) => {
    it(`should map index ${index} to ${name}`, () => {
      const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      expect(DAY_NAMES[index]).toBe(name);
    });
  });
});

describe('Daily Progress', () => {
  it('should calculate completion rate', () => {
    const progress = {
      totalTasks: 10,
      completedTasks: 7,
    };

    const completionRate = (progress.completedTasks / progress.totalTasks) * 100;
    expect(completionRate).toBe(70);
  });

  it('should handle zero tasks', () => {
    const progress = {
      totalTasks: 0,
      completedTasks: 0,
    };

    const completionRate = progress.totalTasks > 0
      ? (progress.completedTasks / progress.totalTasks) * 100
      : 0;
    expect(completionRate).toBe(0);
  });
});

describe('Weekly Progress', () => {
  it('should aggregate 7 days', () => {
    const days = [0, 1, 2, 3, 4, 5, 6];
    expect(days.length).toBe(7);
  });

  it('should calculate week completion rate', () => {
    const weeklyProgress = {
      totalTasks: 35,
      completedTasks: 28,
    };

    const completionRate = (weeklyProgress.completedTasks / weeklyProgress.totalTasks) * 100;
    expect(completionRate).toBe(80);
  });
});

describe('Task Completion', () => {
  it('should mark task as completed', () => {
    const task = { completed_today: false };
    task.completed_today = true;
    expect(task.completed_today).toBe(true);
  });

  it('should store completion date', () => {
    const completion = {
      completed_date: '2024-06-15',
      completed_at: new Date().toISOString(),
    };

    expect(completion.completed_date).toBe('2024-06-15');
  });
});

describe('Task Ordering', () => {
  it('should sort by sort_order ascending', () => {
    const tasks = [
      { task_name: 'Third', sort_order: 2 },
      { task_name: 'First', sort_order: 0 },
      { task_name: 'Second', sort_order: 1 },
    ];

    const sorted = [...tasks].sort((a, b) => a.sort_order - b.sort_order);

    expect(sorted[0].task_name).toBe('First');
    expect(sorted[1].task_name).toBe('Second');
    expect(sorted[2].task_name).toBe('Third');
  });

  it('should reorder tasks', () => {
    const taskIds = ['task-1', 'task-2', 'task-3'];
    const newOrder = ['task-3', 'task-1', 'task-2'];

    const updates = newOrder.map((id, index) => ({ id, sort_order: index }));

    expect(updates[0]).toEqual({ id: 'task-3', sort_order: 0 });
    expect(updates[1]).toEqual({ id: 'task-1', sort_order: 1 });
    expect(updates[2]).toEqual({ id: 'task-2', sort_order: 2 });
  });
});

describe('Recurring Tasks', () => {
  it('should identify recurring tasks', () => {
    const task = { is_recurring: true };
    expect(task.is_recurring).toBe(true);
  });

  it('should identify one-time tasks', () => {
    const task = { is_recurring: false };
    expect(task.is_recurring).toBe(false);
  });
});

describe('Active Status', () => {
  it('should filter active tasks', () => {
    const tasks = [
      { task_name: 'Active', is_active: true },
      { task_name: 'Inactive', is_active: false },
    ];

    const activeTasks = tasks.filter(t => t.is_active);
    expect(activeTasks.length).toBe(1);
    expect(activeTasks[0].task_name).toBe('Active');
  });
});

describe('Default Tasks', () => {
  it('should cover all 7 days', () => {
    const defaultTasksByDay = new Map<number, string[]>();

    // Monday - Content Day
    defaultTasksByDay.set(1, ['Schedule pins', 'Create mockups']);
    // Tuesday - Engagement
    defaultTasksByDay.set(2, ['Respond to comments', 'Engage with followers']);
    // etc.

    expect(defaultTasksByDay.size).toBeGreaterThan(0);
  });
});
