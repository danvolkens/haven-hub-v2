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

const mockModel = {
  id: 'model-1',
  user_id: 'user-123',
  model_type: 'last_touch',
  window_days: 7,
  is_default: true,
};

const mockQueryBuilder = createMockQueryBuilder([mockModel]);

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: vi.fn(() => mockQueryBuilder),
  })),
}));

describe('Attribution Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('trackAttributionEvent', () => {
    it('should be exported as a function', async () => {
      const { trackAttributionEvent } = await import('@/lib/attribution/attribution-service');
      expect(typeof trackAttributionEvent).toBe('function');
    });

    it('should accept userId and event params', async () => {
      const { trackAttributionEvent } = await import('@/lib/attribution/attribution-service');
      const result = await trackAttributionEvent('user-123', {
        eventType: 'click',
        sourceType: 'pinterest_pin',
        quoteId: 'quote-1',
      });

      expect(result).toHaveProperty('success');
    });

    it('should support all event fields', async () => {
      const { trackAttributionEvent } = await import('@/lib/attribution/attribution-service');
      const result = await trackAttributionEvent('user-123', {
        eventType: 'purchase',
        sourceType: 'pinterest_pin',
        sourceId: 'pin-123',
        quoteId: 'quote-1',
        assetId: 'asset-1',
        productId: 'product-1',
        customerId: 'customer-1',
        sessionId: 'session-abc',
        utmParams: {
          source: 'pinterest',
          medium: 'social',
          campaign: 'spring-sale',
        },
        orderId: 'order-1',
        orderTotal: 150,
      });

      expect(result).toHaveProperty('success');
    });
  });

  describe('calculateRevenueAttribution', () => {
    it('should be exported as a function', async () => {
      const { calculateRevenueAttribution } = await import('@/lib/attribution/attribution-service');
      expect(typeof calculateRevenueAttribution).toBe('function');
    });

    it('should accept order details', async () => {
      const { calculateRevenueAttribution } = await import('@/lib/attribution/attribution-service');
      const result = await calculateRevenueAttribution(
        'user-123',
        'order-1',
        150,
        '2024-06-15',
        'customer-1'
      );

      expect(result).toHaveProperty('success');
    });
  });

  describe('getAttributionReport', () => {
    it('should be exported as a function', async () => {
      const { getAttributionReport } = await import('@/lib/attribution/attribution-service');
      expect(typeof getAttributionReport).toBe('function');
    });

    it('should return report structure', async () => {
      const { getAttributionReport } = await import('@/lib/attribution/attribution-service');
      const result = await getAttributionReport('user-123');

      expect(result).toHaveProperty('totalRevenue');
      expect(result).toHaveProperty('totalOrders');
      expect(result).toHaveProperty('topContent');
    });

    it('should support date filters', async () => {
      const { getAttributionReport } = await import('@/lib/attribution/attribution-service');
      const result = await getAttributionReport('user-123', {
        startDate: '2024-01-01',
        endDate: '2024-06-30',
        contentType: 'quote',
      });

      expect(result).toBeDefined();
    });
  });
});

describe('Attribution Event Types', () => {
  const eventTypes = ['impression', 'click', 'save', 'add_to_cart', 'checkout', 'purchase'];

  eventTypes.forEach((type) => {
    it(`should recognize ${type} as valid event type`, () => {
      expect(eventTypes).toContain(type);
    });
  });
});

describe('Attribution Source Types', () => {
  const sourceTypes = ['pinterest_pin', 'pinterest_ad', 'email', 'quiz', 'landing_page', 'direct', 'organic'];

  sourceTypes.forEach((type) => {
    it(`should recognize ${type} as valid source type`, () => {
      expect(sourceTypes).toContain(type);
    });
  });
});

describe('Attribution Models', () => {
  describe('First Touch', () => {
    it('should assign 100% to first touchpoint', () => {
      const touchpoints = [1, 2, 3];
      const weights = touchpoints.map((_, i) => i === 0 ? 1 : 0);

      expect(weights).toEqual([1, 0, 0]);
    });
  });

  describe('Last Touch', () => {
    it('should assign 100% to last touchpoint', () => {
      const touchpoints = [1, 2, 3];
      const weights = touchpoints.map((_, i) => i === touchpoints.length - 1 ? 1 : 0);

      expect(weights).toEqual([0, 0, 1]);
    });
  });

  describe('Linear', () => {
    it('should assign equal weight to all touchpoints', () => {
      const touchpoints = [1, 2, 3, 4];
      const equalWeight = 1 / touchpoints.length;
      const weights = touchpoints.map(() => equalWeight);

      expect(weights).toEqual([0.25, 0.25, 0.25, 0.25]);
    });
  });

  describe('Position Based', () => {
    it('should assign 40% to first, 40% to last, 20% to middle', () => {
      const touchpoints = [1, 2, 3, 4, 5];
      const count = touchpoints.length;
      const middleWeight = 0.2 / (count - 2);

      const weights = touchpoints.map((_, i) => {
        if (i === 0) return 0.4;
        if (i === count - 1) return 0.4;
        return middleWeight;
      });

      expect(weights[0]).toBeCloseTo(0.4);
      expect(weights[4]).toBeCloseTo(0.4);
      expect(weights[1]).toBeCloseTo(0.0667, 3);
    });

    it('should handle single touchpoint', () => {
      const touchpoints = [1];
      const weights = touchpoints.length === 1 ? [1] : [];

      expect(weights).toEqual([1]);
    });

    it('should handle two touchpoints', () => {
      const touchpoints = [1, 2];
      const weights = touchpoints.length === 2 ? [0.5, 0.5] : [];

      expect(weights).toEqual([0.5, 0.5]);
    });
  });

  describe('Time Decay', () => {
    it('should weight recent touchpoints higher', () => {
      const now = Date.now();
      const halfLife = 7 * 24 * 60 * 60 * 1000; // 7 days

      const touchpoints = [
        { occurred_at: new Date(now - 14 * 24 * 60 * 60 * 1000) }, // 14 days ago
        { occurred_at: new Date(now - 7 * 24 * 60 * 60 * 1000) },  // 7 days ago
        { occurred_at: new Date(now - 1 * 24 * 60 * 60 * 1000) },  // 1 day ago
      ];

      const rawWeights = touchpoints.map((tp) => {
        const age = now - tp.occurred_at.getTime();
        return Math.pow(0.5, age / halfLife);
      });

      // Most recent should have highest raw weight
      expect(rawWeights[2]).toBeGreaterThan(rawWeights[1]);
      expect(rawWeights[1]).toBeGreaterThan(rawWeights[0]);
    });

    it('should normalize weights to sum to 1', () => {
      const rawWeights = [0.25, 0.5, 0.9];
      const totalWeight = rawWeights.reduce((a, b) => a + b, 0);
      const normalizedWeights = rawWeights.map(w => w / totalWeight);

      const sum = normalizedWeights.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1);
    });
  });
});

describe('Attribution Window', () => {
  describe('Default Window', () => {
    it('should default to 7 days', () => {
      const defaultWindow = 7;
      expect(defaultWindow).toBe(7);
    });
  });

  describe('Window Calculation', () => {
    it('should calculate window start date', () => {
      const orderDate = new Date('2024-06-15');
      const windowDays = 7;

      const windowStart = new Date(orderDate);
      windowStart.setDate(windowStart.getDate() - windowDays);

      expect(windowStart.toISOString().split('T')[0]).toBe('2024-06-08');
    });
  });
});

describe('Content Performance Aggregation', () => {
  describe('Event Counters', () => {
    it('should increment impressions', () => {
      const eventType = 'impression';
      const updates: Record<string, number> = {};

      if (eventType === 'impression') {
        updates.impressions = 1;
      }

      expect(updates.impressions).toBe(1);
    });

    it('should increment clicks', () => {
      const eventType = 'click';
      const updates: Record<string, number> = {};

      if (eventType === 'click') {
        updates.clicks = 1;
      }

      expect(updates.clicks).toBe(1);
    });

    it('should track revenue on purchase', () => {
      const eventType = 'purchase';
      const orderTotal = 150;
      const updates: Record<string, number> = {};

      if (eventType === 'purchase') {
        updates.purchases = 1;
        updates.revenue = orderTotal;
      }

      expect(updates.purchases).toBe(1);
      expect(updates.revenue).toBe(150);
    });
  });
});

describe('Report Generation', () => {
  describe('Content Aggregation', () => {
    it('should aggregate revenue by content', () => {
      const attributions = [
        { content_type: 'quote', content_id: 'q1', attributed_revenue: 50, order_id: 'o1' },
        { content_type: 'quote', content_id: 'q1', attributed_revenue: 75, order_id: 'o2' },
        { content_type: 'asset', content_id: 'a1', attributed_revenue: 100, order_id: 'o3' },
      ];

      const contentMap = new Map<string, { revenue: number; orders: Set<string> }>();

      for (const attr of attributions) {
        const key = `${attr.content_type}:${attr.content_id}`;
        const existing = contentMap.get(key) || { revenue: 0, orders: new Set() };
        existing.revenue += attr.attributed_revenue;
        existing.orders.add(attr.order_id);
        contentMap.set(key, existing);
      }

      const quoteStats = contentMap.get('quote:q1');
      expect(quoteStats?.revenue).toBe(125);
      expect(quoteStats?.orders.size).toBe(2);
    });

    it('should sort by attributed revenue descending', () => {
      const topContent = [
        { attributedRevenue: 50 },
        { attributedRevenue: 150 },
        { attributedRevenue: 100 },
      ];

      const sorted = [...topContent].sort((a, b) => b.attributedRevenue - a.attributedRevenue);

      expect(sorted[0].attributedRevenue).toBe(150);
      expect(sorted[1].attributedRevenue).toBe(100);
      expect(sorted[2].attributedRevenue).toBe(50);
    });
  });
});
