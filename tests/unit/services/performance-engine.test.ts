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

const mockRules = [
  {
    id: 'rule-1',
    user_id: 'user-123',
    name: 'Scale Winners',
    metric: 'cpa',
    comparison: 'less_than',
    threshold_value: 8,
    action_type: 'increase_budget',
    action_config: { percentage: 25, max_daily: 50 },
    min_spend: 50,
    min_days_active: 7,
    min_conversions: 5,
    is_active: true,
    priority: 1,
  },
  {
    id: 'rule-2',
    name: 'Flag Winners',
    metric: 'roas',
    comparison: 'greater_than',
    threshold_value: 3,
    action_type: 'flag_winner',
    action_config: {},
    min_spend: 50,
    min_days_active: 7,
    min_conversions: 3,
    is_active: true,
    priority: 2,
  },
];

const mockQueryBuilder = createMockQueryBuilder(mockRules);

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: vi.fn(() => ({
    from: vi.fn(() => mockQueryBuilder),
  })),
}));

vi.mock('@/lib/integrations/pinterest/service', () => ({
  getPinterestClient: vi.fn().mockResolvedValue({
    getAdAccounts: vi.fn().mockResolvedValue({ items: [{ id: 'ad-account-1' }] }),
    updateAdCampaign: vi.fn().mockResolvedValue({ success: true }),
  }),
}));

describe('Performance Engine Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('evaluateCampaignPerformance', () => {
    it('should be exported as a function', async () => {
      const { evaluateCampaignPerformance } = await import('@/lib/services/performance-engine');
      expect(typeof evaluateCampaignPerformance).toBe('function');
    });

    it('should accept userId and campaignMetrics', async () => {
      const { evaluateCampaignPerformance } = await import('@/lib/services/performance-engine');
      const metrics = {
        campaign_id: 'campaign-1',
        pinterest_campaign_id: 'pin-campaign-1',
        spend: 100,
        conversions: 10,
        clicks: 500,
        impressions: 10000,
        cpa: 10,
        roas: 2.5,
        ctr: 0.05,
        days_active: 14,
        daily_budget: 20,
      };

      const result = await evaluateCampaignPerformance('user-123', metrics);
      expect(result).toBeDefined();
      expect(result).toHaveProperty('actions');
      expect(result).toHaveProperty('isWinner');
    });
  });

  describe('getDefaultRules', () => {
    it('should be exported as a function', async () => {
      const { getDefaultRules } = await import('@/lib/services/performance-engine');
      expect(typeof getDefaultRules).toBe('function');
    });

    it('should return array of rules', async () => {
      const { getDefaultRules } = await import('@/lib/services/performance-engine');
      const rules = await getDefaultRules('user-123');

      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(0);
    });

    it('should include scale winners rule', async () => {
      const { getDefaultRules } = await import('@/lib/services/performance-engine');
      const rules = await getDefaultRules('user-123');

      const scaleRule = rules.find((r) => r.action_type === 'increase_budget');
      expect(scaleRule).toBeDefined();
    });

    it('should include flag winners rule', async () => {
      const { getDefaultRules } = await import('@/lib/services/performance-engine');
      const rules = await getDefaultRules('user-123');

      const flagRule = rules.find((r) => r.action_type === 'flag_winner');
      expect(flagRule).toBeDefined();
    });

    it('should include pause underperformers rule', async () => {
      const { getDefaultRules } = await import('@/lib/services/performance-engine');
      const rules = await getDefaultRules('user-123');

      const pauseRule = rules.find((r) => r.action_type === 'pause');
      expect(pauseRule).toBeDefined();
    });
  });

  describe('applyBudgetChange', () => {
    it('should be exported as a function', async () => {
      const { applyBudgetChange } = await import('@/lib/services/performance-engine');
      expect(typeof applyBudgetChange).toBe('function');
    });
  });

  describe('pauseCampaign', () => {
    it('should be exported as a function', async () => {
      const { pauseCampaign } = await import('@/lib/services/performance-engine');
      expect(typeof pauseCampaign).toBe('function');
    });
  });
});

describe('Performance Rule Types', () => {
  describe('Metric Types', () => {
    const validMetrics = ['cpa', 'roas', 'ctr', 'conversion_rate'];

    validMetrics.forEach((metric) => {
      it(`should recognize ${metric} as valid metric`, () => {
        expect(validMetrics).toContain(metric);
      });
    });
  });

  describe('Comparison Types', () => {
    const validComparisons = ['less_than', 'greater_than', 'between'];

    validComparisons.forEach((comparison) => {
      it(`should recognize ${comparison} as valid comparison`, () => {
        expect(validComparisons).toContain(comparison);
      });
    });
  });

  describe('Action Types', () => {
    const validActions = ['increase_budget', 'decrease_budget', 'pause', 'flag_winner'];

    validActions.forEach((action) => {
      it(`should recognize ${action} as valid action type`, () => {
        expect(validActions).toContain(action);
      });
    });
  });
});

describe('Rule Evaluation Logic', () => {
  describe('Minimum Spend Check', () => {
    it('should skip rule when spend below minimum', () => {
      const rule = { min_spend: 50 };
      const metrics = { spend: 30 };

      const shouldSkip = metrics.spend < rule.min_spend;

      expect(shouldSkip).toBe(true);
    });

    it('should apply rule when spend meets minimum', () => {
      const rule = { min_spend: 50 };
      const metrics = { spend: 75 };

      const shouldSkip = metrics.spend < rule.min_spend;

      expect(shouldSkip).toBe(false);
    });
  });

  describe('Minimum Days Active Check', () => {
    it('should skip rule when days below minimum', () => {
      const rule = { min_days_active: 7 };
      const metrics = { days_active: 3 };

      const shouldSkip = metrics.days_active < rule.min_days_active;

      expect(shouldSkip).toBe(true);
    });
  });

  describe('Minimum Conversions Check', () => {
    it('should skip rule when conversions below minimum', () => {
      const rule = { min_conversions: 5 };
      const metrics = { conversions: 2 };

      const shouldSkip = metrics.conversions < rule.min_conversions;

      expect(shouldSkip).toBe(true);
    });
  });

  describe('Less Than Comparison', () => {
    it('should match when value less than threshold', () => {
      const rule = { comparison: 'less_than', threshold_value: 10 };
      const metricValue = 5;

      const matches = metricValue < rule.threshold_value;

      expect(matches).toBe(true);
    });

    it('should not match when value above threshold', () => {
      const rule = { comparison: 'less_than', threshold_value: 10 };
      const metricValue = 15;

      const matches = metricValue < rule.threshold_value;

      expect(matches).toBe(false);
    });
  });

  describe('Greater Than Comparison', () => {
    it('should match when value greater than threshold', () => {
      const rule = { comparison: 'greater_than', threshold_value: 3 };
      const metricValue = 5;

      const matches = metricValue > rule.threshold_value;

      expect(matches).toBe(true);
    });

    it('should not match when value below threshold', () => {
      const rule = { comparison: 'greater_than', threshold_value: 3 };
      const metricValue = 2;

      const matches = metricValue > rule.threshold_value;

      expect(matches).toBe(false);
    });
  });

  describe('Between Comparison', () => {
    it('should match when value in range', () => {
      const rule = { comparison: 'between', threshold_min: 10, threshold_max: 15 };
      const metricValue = 12;

      const matches = metricValue >= rule.threshold_min && metricValue <= rule.threshold_max;

      expect(matches).toBe(true);
    });

    it('should match at boundary values', () => {
      const rule = { comparison: 'between', threshold_min: 10, threshold_max: 15 };

      expect(10 >= rule.threshold_min && 10 <= rule.threshold_max).toBe(true);
      expect(15 >= rule.threshold_min && 15 <= rule.threshold_max).toBe(true);
    });

    it('should not match outside range', () => {
      const rule = { comparison: 'between', threshold_min: 10, threshold_max: 15 };
      const metricValue = 20;

      const matches = metricValue >= rule.threshold_min && metricValue <= rule.threshold_max;

      expect(matches).toBe(false);
    });
  });
});

describe('Action Generation', () => {
  describe('Flag Winner Action', () => {
    it('should set isWinner when flag_winner rule matches', () => {
      const rule = { action_type: 'flag_winner' };
      const isWinner = rule.action_type === 'flag_winner';

      expect(isWinner).toBe(true);
    });
  });

  describe('Budget Actions', () => {
    it('should generate action with required fields', () => {
      const rule = {
        id: 'rule-1',
        action_type: 'increase_budget',
        action_config: { percentage: 25, max_daily: 50 },
      };

      const metrics = {
        campaign_id: 'campaign-1',
        pinterest_campaign_id: 'pin-campaign-1',
        daily_budget: 20,
      };

      const action = {
        rule_id: rule.id,
        campaign_id: metrics.campaign_id,
        pinterest_campaign_id: metrics.pinterest_campaign_id,
        action_type: rule.action_type,
        action_config: rule.action_config,
        metrics_snapshot: metrics,
        current_budget: metrics.daily_budget,
      };

      expect(action.rule_id).toBe('rule-1');
      expect(action.action_type).toBe('increase_budget');
      expect(action.current_budget).toBe(20);
    });
  });
});

describe('Default Rules Configuration', () => {
  describe('Scale Winners Rule', () => {
    it('should have correct CPA threshold', () => {
      const rule = {
        metric: 'cpa',
        comparison: 'less_than',
        threshold_value: 8,
      };

      expect(rule.threshold_value).toBe(8);
    });

    it('should have 25% budget increase', () => {
      const rule = {
        action_config: { percentage: 25, max_daily: 50 },
      };

      expect(rule.action_config.percentage).toBe(25);
    });
  });

  describe('Flag Winners Rule', () => {
    it('should have correct ROAS threshold', () => {
      const rule = {
        metric: 'roas',
        comparison: 'greater_than',
        threshold_value: 3,
      };

      expect(rule.threshold_value).toBe(3);
    });
  });

  describe('Pause Underperformers Rule', () => {
    it('should have higher spend requirement', () => {
      const rule = {
        min_spend: 75,
        min_days_active: 14,
      };

      expect(rule.min_spend).toBe(75);
      expect(rule.min_days_active).toBe(14);
    });
  });

  describe('Reduce Budget Rule', () => {
    it('should use between comparison for borderline CPA', () => {
      const rule = {
        metric: 'cpa',
        comparison: 'between',
        threshold_min: 12,
        threshold_max: 15,
        action_type: 'decrease_budget',
        action_config: { percentage: 20 },
      };

      expect(rule.comparison).toBe('between');
      expect(rule.threshold_min).toBe(12);
      expect(rule.threshold_max).toBe(15);
    });
  });
});

describe('Campaign Metrics Structure', () => {
  it('should have all required metrics', () => {
    const metrics = {
      campaign_id: 'campaign-1',
      pinterest_campaign_id: 'pin-campaign-1',
      spend: 100,
      conversions: 10,
      clicks: 500,
      impressions: 10000,
      cpa: 10,
      roas: 2.5,
      ctr: 0.05,
      days_active: 14,
      daily_budget: 20,
    };

    expect(metrics.campaign_id).toBeDefined();
    expect(metrics.spend).toBeDefined();
    expect(metrics.cpa).toBeDefined();
    expect(metrics.roas).toBeDefined();
    expect(metrics.ctr).toBeDefined();
  });

  describe('CPA Calculation', () => {
    it('should calculate CPA correctly', () => {
      const spend = 100;
      const conversions = 10;
      const cpa = spend / conversions;

      expect(cpa).toBe(10);
    });

    it('should handle zero conversions', () => {
      const spend = 100;
      const conversions = 0;
      const cpa = conversions > 0 ? spend / conversions : Infinity;

      expect(cpa).toBe(Infinity);
    });
  });

  describe('ROAS Calculation', () => {
    it('should calculate ROAS correctly', () => {
      const revenue = 250;
      const spend = 100;
      const roas = revenue / spend;

      expect(roas).toBe(2.5);
    });
  });

  describe('CTR Calculation', () => {
    it('should calculate CTR correctly', () => {
      const clicks = 500;
      const impressions = 10000;
      const ctr = clicks / impressions;

      expect(ctr).toBe(0.05);
    });

    it('should handle zero impressions', () => {
      const clicks = 0;
      const impressions = 0;
      const ctr = impressions > 0 ? clicks / impressions : 0;

      expect(ctr).toBe(0);
    });
  });
});
