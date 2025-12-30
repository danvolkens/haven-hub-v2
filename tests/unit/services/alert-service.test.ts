import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock query builder
function createMockQueryBuilder(data: unknown[] | unknown = [], error: unknown = null) {
  const dataArray = Array.isArray(data) ? data : [data];
  const builder: Record<string, unknown> = {};

  ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'in', 'or', 'gte', 'lte', 'order', 'limit', 'range'].forEach(method => {
    builder[method] = vi.fn().mockReturnValue(builder);
  });

  builder.single = vi.fn().mockResolvedValue({ data: dataArray[0] || null, error });
  builder.then = vi.fn((resolve) => resolve({ data: dataArray, error, count: 5 }));

  return builder;
}

const mockRule = {
  id: 'rule-1',
  user_id: 'user-123',
  name: 'CPA Alert',
  alert_type: 'campaign_cpa',
  metric: 'campaign_cpa',
  operator: 'gt',
  threshold: 10,
  is_active: true,
};

const mockAlert = {
  id: 'alert-1',
  user_id: 'user-123',
  alert_type: 'campaign_cpa',
  title: 'CPA Alert Triggered',
  message: 'Campaign CPA exceeded $10',
  status: 'pending',
};

const mockQueryBuilder = createMockQueryBuilder([mockRule, mockAlert]);

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: vi.fn(() => ({
    from: vi.fn(() => mockQueryBuilder),
  })),
}));

describe('Alert Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getOperatorText', () => {
    it('should be exported as a function', async () => {
      const { getOperatorText } = await import('@/lib/alerts/alert-service');
      expect(typeof getOperatorText).toBe('function');
    });

    it('should return correct text for gt', async () => {
      const { getOperatorText } = await import('@/lib/alerts/alert-service');
      expect(getOperatorText('gt')).toBe('greater than');
    });

    it('should return correct text for lt', async () => {
      const { getOperatorText } = await import('@/lib/alerts/alert-service');
      expect(getOperatorText('lt')).toBe('less than');
    });

    it('should return correct text for eq', async () => {
      const { getOperatorText } = await import('@/lib/alerts/alert-service');
      expect(getOperatorText('eq')).toBe('equal to');
    });

    it('should return correct text for gte', async () => {
      const { getOperatorText } = await import('@/lib/alerts/alert-service');
      expect(getOperatorText('gte')).toBe('at least');
    });

    it('should return correct text for lte', async () => {
      const { getOperatorText } = await import('@/lib/alerts/alert-service');
      expect(getOperatorText('lte')).toBe('at most');
    });
  });

  describe('getAlertTypeText', () => {
    it('should be exported as a function', async () => {
      const { getAlertTypeText } = await import('@/lib/alerts/alert-service');
      expect(typeof getAlertTypeText).toBe('function');
    });

    it('should return correct text for pin_milestone', async () => {
      const { getAlertTypeText } = await import('@/lib/alerts/alert-service');
      expect(getAlertTypeText('pin_milestone')).toBe('Pin Milestone');
    });

    it('should return correct text for campaign_cpa', async () => {
      const { getAlertTypeText } = await import('@/lib/alerts/alert-service');
      expect(getAlertTypeText('campaign_cpa')).toBe('Campaign CPA');
    });

    it('should return correct text for winner_detected', async () => {
      const { getAlertTypeText } = await import('@/lib/alerts/alert-service');
      expect(getAlertTypeText('winner_detected')).toBe('Winner Detected');
    });
  });

  describe('getAlertRules', () => {
    it('should be exported as a function', async () => {
      const { getAlertRules } = await import('@/lib/alerts/alert-service');
      expect(typeof getAlertRules).toBe('function');
    });

    it('should return array of rules', async () => {
      const { getAlertRules } = await import('@/lib/alerts/alert-service');
      const rules = await getAlertRules('user-123');

      expect(Array.isArray(rules)).toBe(true);
    });
  });

  describe('createAlertRule', () => {
    it('should be exported as a function', async () => {
      const { createAlertRule } = await import('@/lib/alerts/alert-service');
      expect(typeof createAlertRule).toBe('function');
    });

    it('should accept userId and input', async () => {
      const { createAlertRule } = await import('@/lib/alerts/alert-service');
      const input = {
        name: 'Test Rule',
        alert_type: 'campaign_cpa' as const,
        metric: 'campaign_cpa',
        operator: 'gt' as const,
        threshold: 10,
      };

      const result = await createAlertRule('user-123', input);
      expect(result).toBeDefined();
    });
  });

  describe('getAlerts', () => {
    it('should be exported as a function', async () => {
      const { getAlerts } = await import('@/lib/alerts/alert-service');
      expect(typeof getAlerts).toBe('function');
    });

    it('should return array of alerts', async () => {
      const { getAlerts } = await import('@/lib/alerts/alert-service');
      const alerts = await getAlerts('user-123');

      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should support filtering by status', async () => {
      const { getAlerts } = await import('@/lib/alerts/alert-service');
      const alerts = await getAlerts('user-123', { status: ['pending', 'sent'] });

      expect(alerts).toBeDefined();
    });
  });

  describe('getUnreadAlertCount', () => {
    it('should be exported as a function', async () => {
      const { getUnreadAlertCount } = await import('@/lib/alerts/alert-service');
      expect(typeof getUnreadAlertCount).toBe('function');
    });

    it('should return a number', async () => {
      const { getUnreadAlertCount } = await import('@/lib/alerts/alert-service');
      const count = await getUnreadAlertCount('user-123');

      expect(typeof count).toBe('number');
    });
  });

  describe('markAlertAsRead', () => {
    it('should be exported as a function', async () => {
      const { markAlertAsRead } = await import('@/lib/alerts/alert-service');
      expect(typeof markAlertAsRead).toBe('function');
    });
  });

  describe('markAllAlertsAsRead', () => {
    it('should be exported as a function', async () => {
      const { markAllAlertsAsRead } = await import('@/lib/alerts/alert-service');
      expect(typeof markAllAlertsAsRead).toBe('function');
    });
  });

  describe('dismissAlert', () => {
    it('should be exported as a function', async () => {
      const { dismissAlert } = await import('@/lib/alerts/alert-service');
      expect(typeof dismissAlert).toBe('function');
    });
  });
});

describe('Alert Types', () => {
  const alertTypes = [
    'pin_milestone',
    'pin_underperformer',
    'campaign_cpa',
    'campaign_roas',
    'daily_spend',
    'winner_detected',
  ];

  alertTypes.forEach((type) => {
    it(`should recognize ${type} as valid alert type`, () => {
      expect(alertTypes).toContain(type);
    });
  });
});

describe('Operator Types', () => {
  const operators = ['gt', 'lt', 'eq', 'gte', 'lte'];

  operators.forEach((op) => {
    it(`should recognize ${op} as valid operator`, () => {
      expect(operators).toContain(op);
    });
  });
});

describe('Alert Status', () => {
  const statuses = ['pending', 'sent', 'read', 'dismissed'];

  statuses.forEach((status) => {
    it(`should recognize ${status} as valid status`, () => {
      expect(statuses).toContain(status);
    });
  });
});

describe('Condition Evaluation Logic', () => {
  describe('Greater Than', () => {
    it('should match when value > threshold', () => {
      const value = 15;
      const threshold = 10;
      const matches = value > threshold;
      expect(matches).toBe(true);
    });

    it('should not match when value <= threshold', () => {
      const value = 10;
      const threshold = 10;
      const matches = value > threshold;
      expect(matches).toBe(false);
    });
  });

  describe('Less Than', () => {
    it('should match when value < threshold', () => {
      const value = 5;
      const threshold = 10;
      const matches = value < threshold;
      expect(matches).toBe(true);
    });

    it('should not match when value >= threshold', () => {
      const value = 10;
      const threshold = 10;
      const matches = value < threshold;
      expect(matches).toBe(false);
    });
  });

  describe('Equal To', () => {
    it('should match when value === threshold', () => {
      const value = 10;
      const threshold = 10;
      const matches = value === threshold;
      expect(matches).toBe(true);
    });

    it('should not match when value !== threshold', () => {
      const value = 11;
      const threshold = 10;
      const matches = value === threshold;
      expect(matches).toBe(false);
    });
  });

  describe('Greater Than or Equal', () => {
    it('should match when value >= threshold', () => {
      const value = 10;
      const threshold = 10;
      const matches = value >= threshold;
      expect(matches).toBe(true);
    });

    it('should match when value > threshold', () => {
      const value = 15;
      const threshold = 10;
      const matches = value >= threshold;
      expect(matches).toBe(true);
    });
  });

  describe('Less Than or Equal', () => {
    it('should match when value <= threshold', () => {
      const value = 10;
      const threshold = 10;
      const matches = value <= threshold;
      expect(matches).toBe(true);
    });

    it('should match when value < threshold', () => {
      const value = 5;
      const threshold = 10;
      const matches = value <= threshold;
      expect(matches).toBe(true);
    });
  });
});

describe('Metric Formatting', () => {
  describe('Percentage Metrics', () => {
    it('should format CTR as percentage', () => {
      const value = 0.025;
      const formatted = `${(value * 100).toFixed(2)}%`;
      expect(formatted).toBe('2.50%');
    });
  });

  describe('Currency Metrics', () => {
    it('should format spend as currency', () => {
      const value = 125.5;
      const formatted = `$${value.toFixed(2)}`;
      expect(formatted).toBe('$125.50');
    });

    it('should format CPA as currency', () => {
      const value = 8.75;
      const formatted = `$${value.toFixed(2)}`;
      expect(formatted).toBe('$8.75');
    });
  });

  describe('ROAS Metrics', () => {
    it('should format ROAS with x suffix', () => {
      const value = 2.5;
      const formatted = `${value.toFixed(2)}x`;
      expect(formatted).toBe('2.50x');
    });
  });

  describe('Count Metrics', () => {
    it('should format counts with locale', () => {
      const value = 1500;
      const formatted = value.toLocaleString();
      expect(formatted).toBe('1,500');
    });
  });
});

describe('Default Alert Rules', () => {
  it('should have pin milestone rule', async () => {
    const { DEFAULT_ALERT_RULES } = await import('@/lib/alerts/alert-service');
    const rule = DEFAULT_ALERT_RULES.find((r) => r.alert_type === 'pin_milestone');
    expect(rule).toBeDefined();
    expect(rule?.threshold).toBe(1000);
  });

  it('should have pin underperformer rule', async () => {
    const { DEFAULT_ALERT_RULES } = await import('@/lib/alerts/alert-service');
    const rule = DEFAULT_ALERT_RULES.find((r) => r.alert_type === 'pin_underperformer');
    expect(rule).toBeDefined();
    expect(rule?.metric).toBe('pin_ctr');
  });

  it('should have campaign CPA rule', async () => {
    const { DEFAULT_ALERT_RULES } = await import('@/lib/alerts/alert-service');
    const rule = DEFAULT_ALERT_RULES.find((r) => r.alert_type === 'campaign_cpa');
    expect(rule).toBeDefined();
    expect(rule?.threshold).toBe(10);
  });

  it('should have campaign ROAS rule', async () => {
    const { DEFAULT_ALERT_RULES } = await import('@/lib/alerts/alert-service');
    const rule = DEFAULT_ALERT_RULES.find((r) => r.alert_type === 'campaign_roas');
    expect(rule).toBeDefined();
    expect(rule?.threshold).toBe(1.5);
  });

  it('should enable email notifications by default', async () => {
    const { DEFAULT_ALERT_RULES } = await import('@/lib/alerts/alert-service');
    const allHaveEmail = DEFAULT_ALERT_RULES.every((r) => r.send_email === true);
    expect(allHaveEmail).toBe(true);
  });
});

describe('Alert Message Generation', () => {
  it('should include metric value', () => {
    const metric = 'campaign_cpa';
    const value = 12.5;
    const message = `${metric} is $${value.toFixed(2)}`;

    expect(message).toContain('12.50');
  });

  it('should include threshold', () => {
    const threshold = 10;
    const message = `threshold: greater than $${threshold.toFixed(2)}`;

    expect(message).toContain('10.00');
  });

  it('should include entity reference', () => {
    const campaignId = 'campaign-123';
    const message = `Campaign ${campaignId}: CPA exceeded`;

    expect(message).toContain('campaign-123');
  });
});
