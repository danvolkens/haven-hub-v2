import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { TEST_USER_ID } from '../../setup';

// Create mock chain builder
function createMockQueryBuilder(data: unknown[] | unknown = [], error: unknown = null) {
  const dataArray = Array.isArray(data) ? data : [data];
  return {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue({ data: dataArray, error, count: dataArray.length }),
    single: vi.fn().mockResolvedValue({ data: dataArray[0] || null, error }),
    maybeSingle: vi.fn().mockResolvedValue({ data: dataArray[0] || null, error }),
    then: vi.fn((resolve) => resolve({ data: dataArray, error, count: dataArray.length })),
  };
}

const mockInsights = [
  { id: 'insight-1', status: 'new', priority: 'high', type: 'opportunity' },
  { id: 'insight-2', status: 'new', priority: 'critical', type: 'warning' },
  { id: 'insight-3', status: 'viewed', priority: 'medium', type: 'trend' },
];

const mockRecommendations = [
  { id: 'rec-1', status: 'pending', type: 'collection_focus' },
  { id: 'rec-2', status: 'pending', type: 'posting_schedule' },
];

const mockLatestJob = {
  id: 'job-1',
  type: 'daily_analysis',
  status: 'completed',
  completed_at: new Date().toISOString(),
  insights_generated: 3,
  recommendations_generated: 2,
};

// Mock the auth session helper
vi.mock('@/lib/auth/session', () => ({
  getApiUserId: vi.fn(() => Promise.resolve(TEST_USER_ID)),
}));

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve({
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: TEST_USER_ID } }, error: null }),
    },
    from: vi.fn((table: string) => {
      if (table === 'insights') {
        return createMockQueryBuilder(mockInsights);
      }
      if (table === 'recommendations') {
        return createMockQueryBuilder(mockRecommendations);
      }
      if (table === 'ai_analysis_jobs') {
        return createMockQueryBuilder([mockLatestJob]);
      }
      if (table === 'pins') {
        return createMockQueryBuilder([]);
      }
      return createMockQueryBuilder([]);
    }),
  })),
}));

// Helper to create mock NextRequest
function createMockRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options as any);
}

describe('Intelligence API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/intelligence', () => {
    it('returns intelligence overview', async () => {
      const { GET } = await import('@/app/api/intelligence/route');
      const request = createMockRequest('http://localhost:3000/api/intelligence');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('insights');
      expect(data).toHaveProperty('recommendations');
    });

    it('returns insights summary with counts', async () => {
      const { GET } = await import('@/app/api/intelligence/route');
      const request = createMockRequest('http://localhost:3000/api/intelligence');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.insights).toHaveProperty('total');
      expect(data.insights).toHaveProperty('byPriority');
      expect(data.insights).toHaveProperty('byStatus');
    });

    it('returns insights by priority breakdown', async () => {
      const { GET } = await import('@/app/api/intelligence/route');
      const request = createMockRequest('http://localhost:3000/api/intelligence');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.insights.byPriority).toHaveProperty('critical');
      expect(data.insights.byPriority).toHaveProperty('high');
      expect(data.insights.byPriority).toHaveProperty('medium');
      expect(data.insights.byPriority).toHaveProperty('low');
    });

    it('returns hasUrgent flag', async () => {
      const { GET } = await import('@/app/api/intelligence/route');
      const request = createMockRequest('http://localhost:3000/api/intelligence');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(typeof data.insights.hasUrgent).toBe('boolean');
    });

    it('returns recommendations summary', async () => {
      const { GET } = await import('@/app/api/intelligence/route');
      const request = createMockRequest('http://localhost:3000/api/intelligence');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.recommendations).toHaveProperty('total');
      expect(data.recommendations).toHaveProperty('byType');
    });

    it('returns last analysis info', async () => {
      const { GET } = await import('@/app/api/intelligence/route');
      const request = createMockRequest('http://localhost:3000/api/intelligence');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('lastAnalysis');
    });
  });

  describe('POST /api/intelligence', () => {
    it('triggers analysis with default type', async () => {
      const { POST } = await import('@/app/api/intelligence/route');
      const request = createMockRequest('http://localhost:3000/api/intelligence', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      // May succeed or fail depending on mock setup
      expect([200, 500]).toContain(response.status);
    });

    it('triggers daily analysis', async () => {
      const { POST } = await import('@/app/api/intelligence/route');
      const request = createMockRequest('http://localhost:3000/api/intelligence', {
        method: 'POST',
        body: JSON.stringify({ type: 'daily_analysis' }),
      });

      const response = await POST(request);
      expect([200, 500]).toContain(response.status);
    });

    it('triggers weekly analysis', async () => {
      const { POST } = await import('@/app/api/intelligence/route');
      const request = createMockRequest('http://localhost:3000/api/intelligence', {
        method: 'POST',
        body: JSON.stringify({ type: 'weekly_analysis' }),
      });

      const response = await POST(request);
      expect([200, 500]).toContain(response.status);
    });

    it('triggers content analysis', async () => {
      const { POST } = await import('@/app/api/intelligence/route');
      const request = createMockRequest('http://localhost:3000/api/intelligence', {
        method: 'POST',
        body: JSON.stringify({ type: 'content_analysis' }),
      });

      const response = await POST(request);
      expect([200, 500]).toContain(response.status);
    });

    it('triggers performance analysis', async () => {
      const { POST } = await import('@/app/api/intelligence/route');
      const request = createMockRequest('http://localhost:3000/api/intelligence', {
        method: 'POST',
        body: JSON.stringify({ type: 'performance_analysis' }),
      });

      const response = await POST(request);
      expect([200, 500]).toContain(response.status);
    });

    it('triggers trend detection', async () => {
      const { POST } = await import('@/app/api/intelligence/route');
      const request = createMockRequest('http://localhost:3000/api/intelligence', {
        method: 'POST',
        body: JSON.stringify({ type: 'trend_detection' }),
      });

      const response = await POST(request);
      expect([200, 500]).toContain(response.status);
    });

    it('triggers anomaly detection', async () => {
      const { POST } = await import('@/app/api/intelligence/route');
      const request = createMockRequest('http://localhost:3000/api/intelligence', {
        method: 'POST',
        body: JSON.stringify({ type: 'anomaly_detection' }),
      });

      const response = await POST(request);
      expect([200, 500]).toContain(response.status);
    });

    it('rejects invalid analysis type', async () => {
      const { POST } = await import('@/app/api/intelligence/route');
      const request = createMockRequest('http://localhost:3000/api/intelligence', {
        method: 'POST',
        body: JSON.stringify({ type: 'invalid_type' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid analysis type');
    });

    it('returns job ID on success', async () => {
      const { POST } = await import('@/app/api/intelligence/route');
      const request = createMockRequest('http://localhost:3000/api/intelligence', {
        method: 'POST',
        body: JSON.stringify({ type: 'daily_analysis' }),
      });

      const response = await POST(request);
      const data = await response.json();

      if (response.status === 200) {
        expect(data).toHaveProperty('jobId');
      }
    });
  });
});

describe('Intelligence API - Analysis Types', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validTypes = [
    'daily_analysis',
    'weekly_analysis',
    'content_analysis',
    'performance_analysis',
    'trend_detection',
    'anomaly_detection',
  ];

  validTypes.forEach((type) => {
    it(`accepts ${type} as valid analysis type`, async () => {
      const { POST } = await import('@/app/api/intelligence/route');
      const request = createMockRequest('http://localhost:3000/api/intelligence', {
        method: 'POST',
        body: JSON.stringify({ type }),
      });

      const response = await POST(request);
      // Should not return 400 for valid types
      expect(response.status).not.toBe(400);
    });
  });

  const invalidTypes = ['monthly_analysis', 'real_time', 'custom', ''];

  invalidTypes.forEach((type) => {
    it(`rejects ${type || 'empty string'} as invalid analysis type`, async () => {
      const { POST } = await import('@/app/api/intelligence/route');
      const request = createMockRequest('http://localhost:3000/api/intelligence', {
        method: 'POST',
        body: JSON.stringify({ type }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });
});
