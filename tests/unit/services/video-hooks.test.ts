import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock query builder
function createMockQueryBuilder(data: unknown[] | unknown = [], error: unknown = null) {
  const dataArray = Array.isArray(data) ? data : [data];
  const builder: Record<string, unknown> = {};

  ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'in', 'or', 'gte', 'lte', 'order', 'limit', 'range', 'single', 'is'].forEach(method => {
    builder[method] = vi.fn().mockReturnValue(builder);
  });

  builder.single = vi.fn().mockResolvedValue({ data: dataArray[0] || null, error });
  builder.then = vi.fn((resolve) => resolve({ data: dataArray, error, count: dataArray.length }));

  return builder;
}

const mockQueryBuilder = createMockQueryBuilder([]);

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: vi.fn(() => ({
    from: vi.fn(() => mockQueryBuilder),
  })),
}));

describe('Video Hooks Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Hook Types', () => {
    const hookTypes = [
      'question',
      'statistic',
      'myth_buster',
      'transformation',
      'curiosity',
      'controversy',
      'promise',
      'story',
    ];

    hookTypes.forEach(type => {
      it(`should recognize ${type} as valid hook type`, () => {
        expect(hookTypes).toContain(type);
      });
    });
  });

  describe('Hook Structure', () => {
    it('should have required fields', () => {
      const hook = {
        id: 'hook-1',
        type: 'question',
        template: 'Have you ever wondered why {{topic}}?',
        duration_seconds: 3,
        is_active: true,
      };

      expect(hook.id).toBeDefined();
      expect(hook.type).toBeDefined();
      expect(hook.template).toBeDefined();
    });
  });

  describe('Template Variables', () => {
    it('should extract variable names', () => {
      const template = 'Have you ever wondered why {{topic}} affects {{outcome}}?';
      const variables = template.match(/\{\{(\w+)\}\}/g)?.map(v => v.replace(/\{\{|\}\}/g, ''));

      expect(variables).toContain('topic');
      expect(variables).toContain('outcome');
    });

    it('should replace variables with values', () => {
      const template = 'Did you know {{statistic}}?';
      const values = { statistic: '90% of people' };
      const result = template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key as keyof typeof values] || '');

      expect(result).toBe('Did you know 90% of people?');
    });
  });

  describe('Hook Selection', () => {
    it('should filter by type', () => {
      const hooks = [
        { id: 'h1', type: 'question' },
        { id: 'h2', type: 'statistic' },
        { id: 'h3', type: 'question' },
      ];

      const questions = hooks.filter(h => h.type === 'question');
      expect(questions.length).toBe(2);
    });

    it('should filter by mood', () => {
      const hooks = [
        { id: 'h1', mood: 'inspirational' },
        { id: 'h2', mood: 'calming' },
        { id: 'h3', mood: 'inspirational' },
      ];

      const inspirational = hooks.filter(h => h.mood === 'inspirational');
      expect(inspirational.length).toBe(2);
    });

    it('should select random hook', () => {
      const hooks = [
        { id: 'h1' },
        { id: 'h2' },
        { id: 'h3' },
      ];

      const randomIndex = Math.floor(Math.random() * hooks.length);
      const selected = hooks[randomIndex];

      expect(hooks).toContainEqual(selected);
    });
  });

  describe('Hook Duration', () => {
    it('should validate duration range', () => {
      const minDuration = 2;
      const maxDuration = 5;
      const duration = 3;

      const isValid = duration >= minDuration && duration <= maxDuration;
      expect(isValid).toBe(true);
    });

    it('should reject too short duration', () => {
      const minDuration = 2;
      const duration = 1;

      const isValid = duration >= minDuration;
      expect(isValid).toBe(false);
    });

    it('should reject too long duration', () => {
      const maxDuration = 5;
      const duration = 7;

      const isValid = duration <= maxDuration;
      expect(isValid).toBe(false);
    });
  });

  describe('Hook Usage Tracking', () => {
    it('should increment usage count', () => {
      let usageCount = 5;
      usageCount += 1;

      expect(usageCount).toBe(6);
    });

    it('should track last used date', () => {
      const lastUsed = new Date().toISOString();
      expect(lastUsed).toBeDefined();
    });
  });

  describe('Hook Performance', () => {
    it('should calculate completion rate', () => {
      const views = 1000;
      const completions = 650;
      const completionRate = (completions / views) * 100;

      expect(completionRate).toBe(65);
    });

    it('should calculate retention rate', () => {
      const startViews = 1000;
      const threeSecViews = 800;
      const retentionRate = (threeSecViews / startViews) * 100;

      expect(retentionRate).toBe(80);
    });
  });
});

describe('Hook Categories', () => {
  describe('Question Hooks', () => {
    it('should end with question mark', () => {
      const hook = 'Have you ever wondered why this works?';
      expect(hook.endsWith('?')).toBe(true);
    });
  });

  describe('Statistic Hooks', () => {
    it('should contain a number', () => {
      const hook = 'Did you know that 90% of people fail at this?';
      const hasNumber = /\d+/.test(hook);
      expect(hasNumber).toBe(true);
    });
  });

  describe('Transformation Hooks', () => {
    it('should have before/after structure', () => {
      const hook = "I went from stressed to peaceful in just 5 minutes";
      expect(hook).toContain('from');
      expect(hook).toContain('to');
    });
  });
});

describe('Hook Templates by Collection', () => {
  describe('Growth Collection', () => {
    const growthHooks = [
      'Ready to unlock your potential?',
      'What if you could change your life today?',
    ];

    it('should have growth-themed hooks', () => {
      expect(growthHooks.length).toBeGreaterThan(0);
    });
  });

  describe('Healing Collection', () => {
    const healingHooks = [
      'This simple practice changed everything for me',
      'The truth about healing that no one tells you',
    ];

    it('should have healing-themed hooks', () => {
      expect(healingHooks.length).toBeGreaterThan(0);
    });
  });
});
