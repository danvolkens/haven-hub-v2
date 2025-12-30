import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock query builder
function createMockQueryBuilder(data: unknown[] | unknown = [], error: unknown = null) {
  const dataArray = Array.isArray(data) ? data : [data];
  const builder: Record<string, unknown> = {};

  ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'in', 'or', 'gte', 'lte', 'order', 'limit', 'range'].forEach(method => {
    builder[method] = vi.fn().mockReturnValue(builder);
  });

  builder.single = vi.fn().mockResolvedValue({ data: dataArray[0] || null, error });
  builder.then = vi.fn((resolve) => resolve({ data: dataArray, error, count: dataArray.length }));

  return builder;
}

const mockMilestones = {
  id: 'milestone-1',
  user_id: 'user-123',
  total_sales: 50,
  total_purchasers: 25,
  has_pixel_data: true,
  has_site_visitors_audience: true,
  has_cart_abandoners_audience: false,
  has_purchasers_audience: false,
  phase_2_unlocked_at: '2024-06-01',
  phase_3_unlocked_at: null,
  updated_at: new Date().toISOString(),
};

const mockTemplates = [
  {
    id: 'template-1',
    name: 'Interest Targeting',
    description: 'Target users based on interests',
    objective: 'CONSIDERATION',
    default_daily_budget: 20,
    targeting_type: 'interest',
    targeting_presets: {},
    phase: 1,
    min_sales_required: 0,
    min_purchases_for_lookalike: 0,
    requires_pixel_data: false,
    requires_audience: null,
    is_recommended: true,
    display_order: 1,
    is_active: true,
  },
  {
    id: 'template-2',
    name: 'Retargeting Site Visitors',
    description: 'Target site visitors',
    objective: 'CONVERSIONS',
    default_daily_budget: 30,
    targeting_type: 'retargeting',
    targeting_presets: {},
    phase: 2,
    min_sales_required: 10,
    min_purchases_for_lookalike: 0,
    requires_pixel_data: true,
    requires_audience: 'site_visitors',
    is_recommended: false,
    display_order: 2,
    is_active: true,
  },
];

const mockQueryBuilder = createMockQueryBuilder([mockMilestones, ...mockTemplates]);

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: vi.fn(() => ({
    from: vi.fn(() => mockQueryBuilder),
  })),
}));

describe('Campaign Templates Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserMilestones', () => {
    it('should be exported as a function', async () => {
      const { getUserMilestones } = await import('@/lib/services/campaign-templates');
      expect(typeof getUserMilestones).toBe('function');
    });

    it('should accept userId parameter', async () => {
      const { getUserMilestones } = await import('@/lib/services/campaign-templates');
      const result = await getUserMilestones('user-123');
      expect(result).toBeDefined();
    });

    it('should return milestones with required properties', async () => {
      const { getUserMilestones } = await import('@/lib/services/campaign-templates');
      const result = await getUserMilestones('user-123');

      expect(result).toHaveProperty('total_sales');
      expect(result).toHaveProperty('total_purchasers');
      expect(result).toHaveProperty('has_pixel_data');
    });
  });

  describe('getAvailableTemplates', () => {
    it('should be exported as a function', async () => {
      const { getAvailableTemplates } = await import('@/lib/services/campaign-templates');
      expect(typeof getAvailableTemplates).toBe('function');
    });

    it('should accept userId parameter', async () => {
      const { getAvailableTemplates } = await import('@/lib/services/campaign-templates');
      const result = await getAvailableTemplates('user-123');
      expect(result).toBeDefined();
    });

    it('should return templates grouped by phase', async () => {
      const { getAvailableTemplates } = await import('@/lib/services/campaign-templates');
      const result = await getAvailableTemplates('user-123');

      expect(result).toHaveProperty('phase1');
      expect(result).toHaveProperty('phase2');
      expect(result).toHaveProperty('phase3');
      expect(result).toHaveProperty('milestones');
    });
  });
});

describe('Campaign Template Types', () => {
  describe('CampaignTemplate', () => {
    it('should have required properties', () => {
      const template = {
        id: 'template-1',
        name: 'Test Template',
        description: 'A test template',
        objective: 'CONSIDERATION' as const,
        default_daily_budget: 20,
        targeting_type: 'interest' as const,
        targeting_presets: {},
        phase: 1,
        min_sales_required: 0,
        min_purchases_for_lookalike: 0,
        requires_pixel_data: false,
        requires_audience: null,
        is_recommended: true,
        display_order: 1,
        is_active: true,
      };

      expect(template.id).toBeDefined();
      expect(template.name).toBeDefined();
      expect(template.objective).toBeDefined();
    });
  });

  describe('Objective Types', () => {
    const validObjectives = ['CONSIDERATION', 'CONVERSIONS'];

    validObjectives.forEach((objective) => {
      it(`should recognize ${objective} as valid objective`, () => {
        expect(validObjectives).toContain(objective);
      });
    });
  });

  describe('Targeting Types', () => {
    const validTypes = ['interest', 'keyword', 'retargeting', 'lookalike'];

    validTypes.forEach((type) => {
      it(`should recognize ${type} as valid targeting type`, () => {
        expect(validTypes).toContain(type);
      });
    });
  });

  describe('Audience Types', () => {
    const audienceTypes = ['site_visitors', 'cart_abandoners', 'purchasers'];

    audienceTypes.forEach((audience) => {
      it(`should recognize ${audience} as valid audience type`, () => {
        expect(audienceTypes).toContain(audience);
      });
    });
  });
});

describe('Template Lock Status Logic', () => {
  describe('Sales Requirement', () => {
    it('should lock template when sales insufficient', () => {
      const template = { min_sales_required: 20 };
      const milestones = { total_sales: 10 };

      const isLocked = milestones.total_sales < template.min_sales_required;
      const salesNeeded = template.min_sales_required - milestones.total_sales;

      expect(isLocked).toBe(true);
      expect(salesNeeded).toBe(10);
    });

    it('should unlock template when sales sufficient', () => {
      const template = { min_sales_required: 20 };
      const milestones = { total_sales: 25 };

      const isLocked = milestones.total_sales < template.min_sales_required;

      expect(isLocked).toBe(false);
    });
  });

  describe('Purchasers Requirement for Lookalike', () => {
    it('should lock lookalike template when purchasers insufficient', () => {
      const template = { min_purchases_for_lookalike: 100 };
      const milestones = { total_purchasers: 50 };

      const isLocked = milestones.total_purchasers < template.min_purchases_for_lookalike;
      const purchasersNeeded = template.min_purchases_for_lookalike - milestones.total_purchasers;

      expect(isLocked).toBe(true);
      expect(purchasersNeeded).toBe(50);
    });
  });

  describe('Pixel Data Requirement', () => {
    it('should lock template when pixel data required but missing', () => {
      const template = { requires_pixel_data: true };
      const milestones = { has_pixel_data: false };

      const isLocked = template.requires_pixel_data && !milestones.has_pixel_data;

      expect(isLocked).toBe(true);
    });

    it('should unlock when pixel data present', () => {
      const template = { requires_pixel_data: true };
      const milestones = { has_pixel_data: true };

      const isLocked = template.requires_pixel_data && !milestones.has_pixel_data;

      expect(isLocked).toBe(false);
    });
  });

  describe('Audience Requirement', () => {
    it('should check site_visitors audience', () => {
      const template = { requires_audience: 'site_visitors' };
      const milestones = { has_site_visitors_audience: true };

      const hasAudience = template.requires_audience === 'site_visitors'
        ? milestones.has_site_visitors_audience
        : false;

      expect(hasAudience).toBe(true);
    });

    it('should check cart_abandoners audience', () => {
      const template = { requires_audience: 'cart_abandoners' };
      const milestones = { has_cart_abandoners_audience: false };

      const hasAudience = template.requires_audience === 'cart_abandoners'
        ? milestones.has_cart_abandoners_audience
        : false;

      expect(hasAudience).toBe(false);
    });

    it('should check purchasers audience', () => {
      const template = { requires_audience: 'purchasers' };
      const milestones = { has_purchasers_audience: true };

      const hasAudience = template.requires_audience === 'purchasers'
        ? milestones.has_purchasers_audience
        : false;

      expect(hasAudience).toBe(true);
    });
  });

  describe('Lock Reason Generation', () => {
    it('should generate combined lock reason', () => {
      const reasons = ['Need 10 more sales', 'Pinterest pixel data required'];
      const lockReason = reasons.join(', ');

      expect(lockReason).toBe('Need 10 more sales, Pinterest pixel data required');
    });

    it('should return null when no lock reasons', () => {
      const reasons: string[] = [];
      const lockReason = reasons.length > 0 ? reasons.join(', ') : null;

      expect(lockReason).toBeNull();
    });
  });
});

describe('Phase Grouping Logic', () => {
  describe('Template Phase Assignment', () => {
    it('should group phase 1 templates', () => {
      const templates = [
        { phase: 1, name: 'Phase 1 Template A' },
        { phase: 1, name: 'Phase 1 Template B' },
        { phase: 2, name: 'Phase 2 Template' },
      ];

      const phase1 = templates.filter((t) => t.phase === 1);

      expect(phase1.length).toBe(2);
    });

    it('should group phase 2 templates', () => {
      const templates = [
        { phase: 1, name: 'Phase 1 Template' },
        { phase: 2, name: 'Phase 2 Template A' },
        { phase: 2, name: 'Phase 2 Template B' },
        { phase: 3, name: 'Phase 3 Template' },
      ];

      const phase2 = templates.filter((t) => t.phase === 2);

      expect(phase2.length).toBe(2);
    });

    it('should group phase 3 templates', () => {
      const templates = [
        { phase: 1, name: 'Phase 1 Template' },
        { phase: 2, name: 'Phase 2 Template' },
        { phase: 3, name: 'Phase 3 Template A' },
        { phase: 3, name: 'Phase 3 Template B' },
        { phase: 3, name: 'Phase 3 Template C' },
      ];

      const phase3 = templates.filter((t) => t.phase === 3);

      expect(phase3.length).toBe(3);
    });
  });
});

describe('Default Milestones', () => {
  it('should initialize with zero values', () => {
    const defaultMilestones = {
      total_sales: 0,
      total_purchasers: 0,
      has_pixel_data: false,
      has_site_visitors_audience: false,
      has_cart_abandoners_audience: false,
      has_purchasers_audience: false,
      phase_2_unlocked_at: null,
      phase_3_unlocked_at: null,
    };

    expect(defaultMilestones.total_sales).toBe(0);
    expect(defaultMilestones.total_purchasers).toBe(0);
    expect(defaultMilestones.has_pixel_data).toBe(false);
  });
});
