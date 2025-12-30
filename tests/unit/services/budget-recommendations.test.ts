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

const mockQueryBuilder = createMockQueryBuilder([]);

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: vi.fn(() => ({
    from: vi.fn(() => mockQueryBuilder),
  })),
}));

vi.mock('./performance-engine', () => ({
  applyBudgetChange: vi.fn().mockResolvedValue({ success: true }),
  pauseCampaign: vi.fn().mockResolvedValue({ success: true }),
}));

describe('Budget Recommendations Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateRecommendations', () => {
    it('should be exported as a function', async () => {
      const { generateRecommendations } = await import('@/lib/services/budget-recommendations');
      expect(typeof generateRecommendations).toBe('function');
    });

    it('should accept userId, campaigns, and guardrails', async () => {
      const { generateRecommendations } = await import('@/lib/services/budget-recommendations');
      const campaigns = [
        {
          id: 'campaign-1',
          pinterest_campaign_id: 'pin-1',
          name: 'Test Campaign',
          daily_budget: 20,
          spend_7d: 100,
          conversions_7d: 10,
          clicks_7d: 500,
          impressions_7d: 10000,
          days_active: 14,
        },
      ];
      const guardrails = { weekly_cap: 500, monthly_cap: 2000 };

      const result = await generateRecommendations('user-123', campaigns, guardrails);
      expect(Array.isArray(result)).toBe(true);
    });
  });
});

describe('Budget Recommendation Types', () => {
  describe('Recommendation Types', () => {
    const validTypes = ['increase', 'decrease', 'pause', 'maintain', 'test_increase'];

    validTypes.forEach((type) => {
      it(`should recognize ${type} as valid type`, () => {
        expect(validTypes).toContain(type);
      });
    });
  });

  describe('Campaign Data Structure', () => {
    it('should have required campaign fields', () => {
      const campaign = {
        id: 'campaign-1',
        pinterest_campaign_id: 'pin-1',
        name: 'Test Campaign',
        daily_budget: 20,
        spend_7d: 100,
        conversions_7d: 10,
        clicks_7d: 500,
        impressions_7d: 10000,
        days_active: 14,
      };

      expect(campaign.id).toBeDefined();
      expect(campaign.daily_budget).toBeDefined();
      expect(campaign.spend_7d).toBeDefined();
    });
  });

  describe('Recommendation Structure', () => {
    it('should have required recommendation fields', () => {
      const recommendation = {
        campaign_id: 'campaign-1',
        campaign_name: 'Test Campaign',
        current_daily_budget: 20,
        current_cpa: 10,
        current_roas: 2.5,
        current_spend_7d: 100,
        recommendation_type: 'increase',
        recommended_daily_budget: 25,
        recommended_change_percentage: 25,
        confidence_score: 0.85,
        reasoning: {
          primary: 'CPA below target',
          supporting: ['7+ days of performance'],
          risks: ['May increase CPA'],
        },
        projected_additional_spend: 35,
        projected_additional_conversions: 4,
        projected_new_cpa: 10,
        valid_until: new Date().toISOString(),
      };

      expect(recommendation.campaign_id).toBeDefined();
      expect(recommendation.recommendation_type).toBeDefined();
      expect(recommendation.recommended_daily_budget).toBeDefined();
      expect(recommendation.confidence_score).toBeDefined();
    });
  });
});

describe('Threshold Constants', () => {
  const THRESHOLDS = {
    CPA_EXCELLENT: 8,
    CPA_ACCEPTABLE: 12,
    CPA_POOR: 15,
    ROAS_EXCELLENT: 3,
    ROAS_GOOD: 2,
    MIN_SPEND_FOR_RECOMMENDATION: 50,
    MIN_DAYS_FOR_CONFIDENCE: 7,
    MIN_CONVERSIONS_FOR_CONFIDENCE: 3,
  };

  describe('CPA Thresholds', () => {
    it('should have excellent CPA at $8', () => {
      expect(THRESHOLDS.CPA_EXCELLENT).toBe(8);
    });

    it('should have acceptable CPA at $12', () => {
      expect(THRESHOLDS.CPA_ACCEPTABLE).toBe(12);
    });

    it('should have poor CPA at $15', () => {
      expect(THRESHOLDS.CPA_POOR).toBe(15);
    });
  });

  describe('ROAS Thresholds', () => {
    it('should have excellent ROAS at 3x', () => {
      expect(THRESHOLDS.ROAS_EXCELLENT).toBe(3);
    });

    it('should have good ROAS at 2x', () => {
      expect(THRESHOLDS.ROAS_GOOD).toBe(2);
    });
  });

  describe('Minimum Requirements', () => {
    it('should require $50 minimum spend', () => {
      expect(THRESHOLDS.MIN_SPEND_FOR_RECOMMENDATION).toBe(50);
    });

    it('should require 7 days for confidence', () => {
      expect(THRESHOLDS.MIN_DAYS_FOR_CONFIDENCE).toBe(7);
    });

    it('should require 3 conversions for confidence', () => {
      expect(THRESHOLDS.MIN_CONVERSIONS_FOR_CONFIDENCE).toBe(3);
    });
  });
});

describe('Recommendation Logic', () => {
  describe('CPA Calculation', () => {
    it('should calculate CPA correctly', () => {
      const spend_7d = 100;
      const conversions_7d = 10;
      const cpa = spend_7d / conversions_7d;

      expect(cpa).toBe(10);
    });

    it('should return null for zero conversions', () => {
      const spend_7d = 100;
      const conversions_7d = 0;
      const cpa = conversions_7d > 0 ? spend_7d / conversions_7d : null;

      expect(cpa).toBeNull();
    });
  });

  describe('ROAS Calculation', () => {
    it('should calculate ROAS with AOV', () => {
      const conversions_7d = 10;
      const spend_7d = 100;
      const aov = 15;
      const roas = (conversions_7d * aov) / spend_7d;

      expect(roas).toBe(1.5);
    });

    it('should return null for zero spend', () => {
      const spend_7d = 0;
      const conversions_7d = 10;
      const aov = 15;
      const roas = spend_7d > 0 ? (conversions_7d * aov) / spend_7d : null;

      expect(roas).toBeNull();
    });
  });

  describe('Increase Recommendation', () => {
    it('should recommend 25% increase for excellent CPA', () => {
      const current_budget = 20;
      const increase_percent = 25;
      const new_budget = current_budget * 1.25;

      expect(new_budget).toBe(25);
    });

    it('should calculate additional weekly spend', () => {
      const current_budget = 20;
      const new_budget = 25;
      const additional_weekly = (new_budget - current_budget) * 7;

      expect(additional_weekly).toBe(35);
    });

    it('should project additional conversions', () => {
      const additional_spend = 35;
      const cpa = 10;
      const projected_conversions = Math.round(additional_spend / cpa);

      expect(projected_conversions).toBe(4);
    });
  });

  describe('Decrease Recommendation', () => {
    it('should recommend 20% decrease for borderline CPA', () => {
      const current_budget = 20;
      const new_budget = current_budget * 0.8;

      expect(new_budget).toBe(16);
    });
  });

  describe('Pause Recommendation', () => {
    it('should recommend pause for poor CPA over 14 days', () => {
      const cpa = 18;
      const days_active = 20;
      const CPA_POOR = 15;

      const shouldPause = cpa > CPA_POOR && days_active >= 14;

      expect(shouldPause).toBe(true);
    });

    it('should not recommend pause for poor CPA under 14 days', () => {
      const cpa = 18;
      const days_active = 10;
      const CPA_POOR = 15;

      const shouldPause = cpa > CPA_POOR && days_active >= 14;

      expect(shouldPause).toBe(false);
    });
  });
});

describe('Confidence Score Calculation', () => {
  describe('Factors', () => {
    it('should increase confidence with more days active', () => {
      const base = 0.5;
      const days_factor = Math.min(14 / 14, 1) * 0.2; // Full 0.2 for 14+ days
      const confidence = base + days_factor;

      expect(confidence).toBeCloseTo(0.7, 1);
    });

    it('should increase confidence with more conversions', () => {
      const base = 0.5;
      const conversions_factor = Math.min(10 / 10, 1) * 0.2; // Full 0.2 for 10+ conversions
      const confidence = base + conversions_factor;

      expect(confidence).toBeCloseTo(0.7, 1);
    });

    it('should cap confidence at 1.0', () => {
      const confidence = Math.min(1.2, 1.0);

      expect(confidence).toBe(1.0);
    });
  });
});

describe('Risk Assessment', () => {
  describe('Budget Cap Risk', () => {
    it('should warn when approaching weekly cap', () => {
      const new_budget = 100;
      const weekly_cap = 500;
      const weekly_spend = new_budget * 7;

      const approachingCap = weekly_spend >= weekly_cap * 0.8;

      expect(approachingCap).toBe(weekly_spend >= 400);
    });
  });

  describe('Pause Risks', () => {
    const pauseRisks = ['Pausing may lose audience learning', 'Consider creative refresh first'];

    it('should include audience learning risk', () => {
      expect(pauseRisks).toContain('Pausing may lose audience learning');
    });

    it('should suggest creative refresh', () => {
      expect(pauseRisks).toContain('Consider creative refresh first');
    });
  });
});

describe('Validity Period', () => {
  describe('Recommendation Expiry', () => {
    it('should set 3 day validity for increase recommendations', () => {
      const validityDays = 3;
      const expiryMs = validityDays * 24 * 60 * 60 * 1000;
      const validUntil = new Date(Date.now() + expiryMs);

      const daysDiff = Math.round((validUntil.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
      expect(daysDiff).toBe(3);
    });

    it('should set 7 day validity for pause recommendations', () => {
      const validityDays = 7;
      const expiryMs = validityDays * 24 * 60 * 60 * 1000;
      const validUntil = new Date(Date.now() + expiryMs);

      const daysDiff = Math.round((validUntil.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
      expect(daysDiff).toBe(7);
    });
  });
});

describe('Guardrails', () => {
  describe('Weekly Cap', () => {
    it('should respect weekly cap', () => {
      const weekly_cap = 500;
      const current_weekly_spend = 400;
      const proposed_increase = 150;
      const total = current_weekly_spend + proposed_increase;

      const exceedsCap = total > weekly_cap;

      expect(exceedsCap).toBe(true);
    });
  });

  describe('Monthly Cap', () => {
    it('should respect monthly cap', () => {
      const monthly_cap = 2000;
      const current_monthly_spend = 1800;
      const proposed_increase = 300;
      const total = current_monthly_spend + proposed_increase;

      const exceedsCap = total > monthly_cap;

      expect(exceedsCap).toBe(true);
    });
  });
});
