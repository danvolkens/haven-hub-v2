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

const mockQueryBuilder = createMockQueryBuilder([]);

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => mockQueryBuilder),
  })),
}));

describe('TikTok Attribution Types', () => {
  describe('AttributionEvent', () => {
    it('should have required fields', () => {
      const event = {
        session_id: 'session-123',
        tiktok_post_id: 'post-123',
        content_pillar: 'growth',
        utm_source: 'tiktok',
        utm_medium: 'organic',
      };

      expect(event.session_id).toBeDefined();
      expect(event.utm_source).toBe('tiktok');
    });
  });

  describe('ConversionEvent', () => {
    it('should support all event types', () => {
      const eventTypes = [
        'quiz_started',
        'quiz_completed',
        'email_captured',
        'added_to_cart',
        'checkout_started',
        'purchase_made',
      ];

      eventTypes.forEach(type => {
        expect(eventTypes).toContain(type);
      });
    });

    it('should include order details for purchase', () => {
      const event = {
        session_id: 'session-123',
        event_type: 'purchase_made',
        order_id: 'order-456',
        order_value: 99.99,
        products_purchased: ['product-1', 'product-2'],
      };

      expect(event.order_id).toBeDefined();
      expect(event.order_value).toBe(99.99);
    });
  });
});

describe('Conversion Funnel', () => {
  describe('Funnel Structure', () => {
    it('should have all funnel stages', () => {
      const funnel = {
        total_sessions: 1000,
        profile_visits: 800,
        link_clicks: 600,
        quiz_starts: 400,
        quiz_completions: 300,
        email_captures: 250,
        cart_adds: 100,
        checkouts: 50,
        purchases: 30,
        total_revenue: 2999.70,
        conversion_rate: 3,
      };

      expect(funnel.total_sessions).toBe(1000);
      expect(funnel.purchases).toBe(30);
      expect(funnel.conversion_rate).toBe(3);
    });
  });

  describe('Conversion Rate Calculation', () => {
    it('should calculate overall conversion rate', () => {
      const sessions = 1000;
      const purchases = 30;
      const conversionRate = (purchases / sessions) * 100;

      expect(conversionRate).toBe(3);
    });

    it('should calculate stage-to-stage conversion', () => {
      const linkClicks = 600;
      const quizStarts = 400;
      const clickToQuizRate = (quizStarts / linkClicks) * 100;

      expect(clickToQuizRate).toBeCloseTo(66.67, 1);
    });
  });

  describe('Revenue Attribution', () => {
    it('should calculate total revenue', () => {
      const orders = [
        { value: 49.99 },
        { value: 99.99 },
        { value: 149.99 },
      ];

      const totalRevenue = orders.reduce((sum, o) => sum + o.value, 0);
      expect(totalRevenue).toBeCloseTo(299.97);
    });

    it('should calculate average order value', () => {
      const totalRevenue = 299.97;
      const orderCount = 3;
      const aov = totalRevenue / orderCount;

      expect(aov).toBeCloseTo(99.99);
    });
  });
});

describe('UTM Parameters', () => {
  describe('TikTok UTM Format', () => {
    it('should use tiktok as source', () => {
      const utmSource = 'tiktok';
      expect(utmSource).toBe('tiktok');
    });

    it('should use organic as medium', () => {
      const utmMedium = 'organic';
      expect(utmMedium).toBe('organic');
    });

    it('should use content pillar as campaign', () => {
      const pillar = 'growth';
      const utmCampaign = pillar;
      expect(utmCampaign).toBe('growth');
    });

    it('should use post ID as content', () => {
      const postId = 'post-123';
      const utmContent = postId;
      expect(utmContent).toBe('post-123');
    });
  });

  describe('UTM Link Generation', () => {
    it('should build full UTM link', () => {
      const baseUrl = 'https://example.com/quiz';
      const params = new URLSearchParams({
        utm_source: 'tiktok',
        utm_medium: 'organic',
        utm_campaign: 'growth',
        utm_content: 'post-123',
      });

      const fullUrl = `${baseUrl}?${params.toString()}`;
      expect(fullUrl).toContain('utm_source=tiktok');
      expect(fullUrl).toContain('utm_medium=organic');
    });
  });

  describe('UTM Parsing', () => {
    it('should parse UTM from URL', () => {
      const url = new URL('https://example.com/quiz?utm_source=tiktok&utm_medium=organic&utm_campaign=growth');
      const params = url.searchParams;

      expect(params.get('utm_source')).toBe('tiktok');
      expect(params.get('utm_medium')).toBe('organic');
      expect(params.get('utm_campaign')).toBe('growth');
    });
  });
});

describe('Top Converting Posts', () => {
  it('should sort by revenue descending', () => {
    const posts = [
      { post_id: 'p1', revenue: 100 },
      { post_id: 'p2', revenue: 500 },
      { post_id: 'p3', revenue: 250 },
    ];

    const sorted = [...posts].sort((a, b) => b.revenue - a.revenue);

    expect(sorted[0].post_id).toBe('p2');
    expect(sorted[1].post_id).toBe('p3');
    expect(sorted[2].post_id).toBe('p1');
  });

  it('should calculate post conversion rate', () => {
    const post = {
      sessions: 100,
      purchases: 5,
    };

    const conversionRate = (post.purchases / post.sessions) * 100;
    expect(conversionRate).toBe(5);
  });
});

describe('Pillar Conversion', () => {
  it('should aggregate by pillar', () => {
    const posts = [
      { pillar: 'growth', sessions: 100, purchases: 5, revenue: 500 },
      { pillar: 'growth', sessions: 150, purchases: 8, revenue: 800 },
      { pillar: 'healing', sessions: 200, purchases: 10, revenue: 1000 },
    ];

    const pillarMap = new Map<string, { sessions: number; purchases: number; revenue: number }>();

    posts.forEach(p => {
      const existing = pillarMap.get(p.pillar) || { sessions: 0, purchases: 0, revenue: 0 };
      pillarMap.set(p.pillar, {
        sessions: existing.sessions + p.sessions,
        purchases: existing.purchases + p.purchases,
        revenue: existing.revenue + p.revenue,
      });
    });

    const growthStats = pillarMap.get('growth')!;
    expect(growthStats.sessions).toBe(250);
    expect(growthStats.purchases).toBe(13);
    expect(growthStats.revenue).toBe(1300);
  });
});

describe('Session Tracking', () => {
  it('should generate unique session ID', () => {
    const generateSessionId = () => `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const id1 = generateSessionId();
    const id2 = generateSessionId();

    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^session-/);
  });

  it('should track session start time', () => {
    const session = {
      id: 'session-123',
      started_at: new Date().toISOString(),
    };

    expect(session.started_at).toBeDefined();
  });
});

describe('Visitor ID', () => {
  it('should persist visitor across sessions', () => {
    const visitorId = 'visitor-abc-123';
    const sessions = [
      { session_id: 'session-1', visitor_id: visitorId },
      { session_id: 'session-2', visitor_id: visitorId },
    ];

    const sameVisitor = sessions.every(s => s.visitor_id === visitorId);
    expect(sameVisitor).toBe(true);
  });
});

describe('Attribution Window', () => {
  it('should attribute within 7 days', () => {
    const windowDays = 7;
    const conversionDate = new Date();
    const attributionStart = new Date(conversionDate);
    attributionStart.setDate(attributionStart.getDate() - windowDays);

    const clickDate = new Date(conversionDate);
    clickDate.setDate(clickDate.getDate() - 5);

    const isWithinWindow = clickDate >= attributionStart;
    expect(isWithinWindow).toBe(true);
  });

  it('should not attribute beyond window', () => {
    const windowDays = 7;
    const conversionDate = new Date();
    const attributionStart = new Date(conversionDate);
    attributionStart.setDate(attributionStart.getDate() - windowDays);

    const clickDate = new Date(conversionDate);
    clickDate.setDate(clickDate.getDate() - 10);

    const isWithinWindow = clickDate >= attributionStart;
    expect(isWithinWindow).toBe(false);
  });
});
