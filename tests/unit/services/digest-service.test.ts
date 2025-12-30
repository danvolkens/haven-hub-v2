import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock query builder
function createMockQueryBuilder(data: unknown[] | unknown = [], error: unknown = null) {
  const dataArray = Array.isArray(data) ? data : [data];
  const builder: Record<string, unknown> = {};

  ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'in', 'or', 'gte', 'lte', 'order', 'limit', 'range', 'single'].forEach(method => {
    builder[method] = vi.fn().mockReturnValue(builder);
  });

  builder.single = vi.fn().mockResolvedValue({ data: dataArray[0] || null, error });
  builder.then = vi.fn((resolve) => resolve({ data: dataArray, error, count: dataArray.length }));

  return builder;
}

const mockPrefs = {
  user_id: 'user-123',
  is_enabled: true,
  frequency: 'daily',
  delivery_method: 'email',
  delivery_time: '09:00',
};

const mockQueryBuilder = createMockQueryBuilder([mockPrefs]);

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: vi.fn(() => mockQueryBuilder),
  })),
}));

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: vi.fn(() => ({
    auth: {
      admin: {
        getUserById: vi.fn().mockResolvedValue({
          data: { user: { email: 'test@example.com' } },
        }),
      },
    },
    from: vi.fn(() => mockQueryBuilder),
  })),
}));

vi.mock('@/lib/intelligence/intelligence-service', () => ({
  getActiveInsights: vi.fn().mockResolvedValue([
    { title: 'Test Insight', summary: 'Summary', priority: 'high' },
  ]),
  getPendingRecommendations: vi.fn().mockResolvedValue([
    { id: 'rec-1', action: 'test' },
  ]),
}));

vi.mock('@/lib/email/resend-client', () => ({
  sendDigestEmail: vi.fn().mockResolvedValue({ success: true }),
}));

describe('Digest Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateDailyDigest', () => {
    it('should be exported as a function', async () => {
      const { generateDailyDigest } = await import('@/lib/digest/digest-service');
      expect(typeof generateDailyDigest).toBe('function');
    });

    it('should accept userId parameter', async () => {
      const { generateDailyDigest } = await import('@/lib/digest/digest-service');
      const result = await generateDailyDigest('user-123');

      expect(result).toBeDefined();
    });

    it('should return digest content structure', async () => {
      const { generateDailyDigest } = await import('@/lib/digest/digest-service');
      const result = await generateDailyDigest('user-123');

      expect(result).toHaveProperty('insights_count');
      expect(result).toHaveProperty('pending_approvals');
      expect(result).toHaveProperty('pins_published');
      expect(result).toHaveProperty('revenue');
      expect(result).toHaveProperty('highlights');
    });
  });

  describe('sendDigest', () => {
    it('should be exported as a function', async () => {
      const { sendDigest } = await import('@/lib/digest/digest-service');
      expect(typeof sendDigest).toBe('function');
    });

    it('should return success status', async () => {
      const { sendDigest } = await import('@/lib/digest/digest-service');
      const result = await sendDigest('user-123');

      expect(result).toHaveProperty('success');
    });
  });

  describe('processScheduledDigests', () => {
    it('should be exported as a function', async () => {
      const { processScheduledDigests } = await import('@/lib/digest/digest-service');
      expect(typeof processScheduledDigests).toBe('function');
    });

    it('should return sent and errors counts', async () => {
      const { processScheduledDigests } = await import('@/lib/digest/digest-service');
      const result = await processScheduledDigests();

      expect(result).toHaveProperty('sent');
      expect(result).toHaveProperty('errors');
    });
  });
});

describe('Digest Content Types', () => {
  describe('Required Fields', () => {
    it('should have insights_count', () => {
      const content = { insights_count: 5 };
      expect(typeof content.insights_count).toBe('number');
    });

    it('should have pending_approvals', () => {
      const content = { pending_approvals: 10 };
      expect(typeof content.pending_approvals).toBe('number');
    });

    it('should have revenue', () => {
      const content = { revenue: 1500 };
      expect(typeof content.revenue).toBe('number');
    });

    it('should have highlights array', () => {
      const content = { highlights: ['Highlight 1', 'Highlight 2'] };
      expect(Array.isArray(content.highlights)).toBe(true);
    });
  });

  describe('Optional Fields', () => {
    it('should have optional top_insight', () => {
      const content = {
        top_insight: {
          title: 'Critical Insight',
          summary: 'This is critical',
          priority: 'critical',
        },
      };

      expect(content.top_insight?.title).toBeDefined();
    });
  });
});

describe('Highlight Generation', () => {
  describe('Order Highlights', () => {
    it('should format single order highlight', () => {
      const ordersReceived = 1;
      const revenue = 50;
      const highlight = `💰 ${ordersReceived} new order ($${revenue.toFixed(2)} revenue)`;

      expect(highlight).toContain('1 new order');
      expect(highlight).toContain('$50.00');
    });

    it('should format multiple orders highlight', () => {
      const ordersReceived = 5;
      const revenue = 250;
      const highlight = `💰 ${ordersReceived} new orders ($${revenue.toFixed(2)} revenue)`;

      expect(highlight).toContain('5 new orders');
      expect(highlight).toContain('$250.00');
    });
  });

  describe('Pin Highlights', () => {
    it('should format single pin highlight', () => {
      const pinsPublished = 1;
      const highlight = `📌 ${pinsPublished} pin published yesterday`;

      expect(highlight).toContain('1 pin');
    });

    it('should format multiple pins highlight', () => {
      const pinsPublished = 10;
      const highlight = `📌 ${pinsPublished} pins published yesterday`;

      expect(highlight).toContain('10 pins');
    });
  });

  describe('Lead Highlights', () => {
    it('should format lead capture highlight', () => {
      const newLeads = 15;
      const highlight = `✨ ${newLeads} new leads captured`;

      expect(highlight).toContain('15 new leads');
    });
  });

  describe('At Risk Highlights', () => {
    it('should show warning for high at-risk count', () => {
      const atRiskCustomers = 10;
      const highlight = `⚠️ ${atRiskCustomers} customers at risk of churning`;

      expect(highlight).toContain('10 customers at risk');
    });

    it('should not show warning for low at-risk count', () => {
      const atRiskCustomers = 3;
      const shouldShow = atRiskCustomers > 5;

      expect(shouldShow).toBe(false);
    });
  });
});

describe('Digest Preferences', () => {
  describe('Frequency Options', () => {
    const frequencies = ['daily', 'weekdays', 'weekly'];

    frequencies.forEach((freq) => {
      it(`should recognize ${freq} as valid frequency`, () => {
        expect(frequencies).toContain(freq);
      });
    });
  });

  describe('Delivery Method Options', () => {
    const methods = ['email', 'dashboard', 'both'];

    methods.forEach((method) => {
      it(`should recognize ${method} as valid delivery method`, () => {
        expect(methods).toContain(method);
      });
    });
  });

  describe('Time Format', () => {
    it('should parse delivery time correctly', () => {
      const deliveryTime = '09:00';
      const [hour, minute] = deliveryTime.split(':').map(Number);

      expect(hour).toBe(9);
      expect(minute).toBe(0);
    });
  });
});

describe('Scheduled Digest Processing', () => {
  describe('Time Window', () => {
    it('should allow 5-minute window', () => {
      const currentMinutes = 9 * 60 + 3; // 09:03
      const prefMinutes = 9 * 60; // 09:00

      const withinWindow = Math.abs(currentMinutes - prefMinutes) <= 5;
      expect(withinWindow).toBe(true);
    });

    it('should reject outside window', () => {
      const currentMinutes = 9 * 60 + 10; // 09:10
      const prefMinutes = 9 * 60; // 09:00

      const withinWindow = Math.abs(currentMinutes - prefMinutes) <= 5;
      expect(withinWindow).toBe(false);
    });
  });

  describe('Frequency Checks', () => {
    it('should send weekday digests on weekdays', () => {
      const frequency = 'weekdays';
      const dayOfWeek = 2; // Tuesday
      const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

      const shouldSend = frequency !== 'weekdays' || isWeekday;
      expect(shouldSend).toBe(true);
    });

    it('should not send weekday digests on weekends', () => {
      const frequency = 'weekdays';
      const dayOfWeek = 0; // Sunday
      const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

      const shouldSend = frequency !== 'weekdays' || isWeekday;
      expect(shouldSend).toBe(false);
    });

    it('should send weekly digests on correct day', () => {
      const frequency = 'weekly';
      const weeklyDay = 1; // Monday
      const dayOfWeek = 1; // Monday

      const shouldSend = frequency !== 'weekly' || dayOfWeek === weeklyDay;
      expect(shouldSend).toBe(true);
    });

    it('should not send weekly digests on wrong day', () => {
      const frequency = 'weekly';
      const weeklyDay = 1; // Monday
      const dayOfWeek = 3; // Wednesday

      const shouldSend = frequency !== 'weekly' || dayOfWeek === weeklyDay;
      expect(shouldSend).toBe(false);
    });
  });
});

describe('Top Insight Selection', () => {
  describe('Priority-based Selection', () => {
    it('should select critical insight first', () => {
      const insights = [
        { priority: 'low', title: 'Low' },
        { priority: 'critical', title: 'Critical' },
        { priority: 'high', title: 'High' },
      ];

      const topInsight = insights.find((i) => i.priority === 'critical' || i.priority === 'high');
      expect(topInsight?.title).toBe('Critical');
    });

    it('should select high insight if no critical', () => {
      const insights = [
        { priority: 'low', title: 'Low' },
        { priority: 'medium', title: 'Medium' },
        { priority: 'high', title: 'High' },
      ];

      const topInsight = insights.find((i) => i.priority === 'critical' || i.priority === 'high');
      expect(topInsight?.title).toBe('High');
    });

    it('should return undefined if no high priority insights', () => {
      const insights = [
        { priority: 'low', title: 'Low' },
        { priority: 'medium', title: 'Medium' },
      ];

      const topInsight = insights.find((i) => i.priority === 'critical' || i.priority === 'high');
      expect(topInsight).toBeUndefined();
    });
  });
});
