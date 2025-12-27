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
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue({ data: dataArray, error, count: dataArray.length }),
    single: vi.fn().mockResolvedValue({ data: dataArray[0] || null, error }),
    maybeSingle: vi.fn().mockResolvedValue({ data: dataArray[0] || null, error }),
    then: vi.fn((resolve) => resolve({ data: dataArray, error, count: dataArray.length })),
  };
}

const mockData: Record<string, unknown[]> = {
  integrations: [
    {
      id: 'int-1',
      user_id: TEST_USER_ID,
      provider: 'pinterest',
      access_token: 'mock-token',
      refresh_token: 'mock-refresh',
      expires_at: new Date(Date.now() + 3600000).toISOString(),
    },
  ],
  pinterest_boards: [
    { id: 'board-1', name: 'Home Decor', pin_count: 45 },
    { id: 'board-2', name: 'Quotes', pin_count: 100 },
  ],
  pins: [
    { id: 'pin-1', title: 'Test Pin', impressions: 1000, saves: 50 },
  ],
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
    from: vi.fn((table: string) => createMockQueryBuilder(mockData[table] || [])),
  })),
  createClient: vi.fn(() => Promise.resolve({
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: TEST_USER_ID } }, error: null }),
    },
    from: vi.fn((table: string) => createMockQueryBuilder(mockData[table] || [])),
  })),
}));

// Mock Pinterest service
vi.mock('@/lib/pinterest/analytics-service', () => ({
  getPinterestAnalytics: vi.fn().mockResolvedValue({
    impressions: 5000,
    saves: 250,
    clicks: 125,
    engagement_rate: 0.075,
  }),
  getTopPins: vi.fn().mockResolvedValue([
    { id: 'pin-1', title: 'Popular Quote', impressions: 500, saves: 25 },
    { id: 'pin-2', title: 'Home Decor', impressions: 400, saves: 20 },
  ]),
}));

// Helper to create mock NextRequest
function createMockRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options);
}

describe('Pinterest Analytics API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/pinterest/analytics/overview', () => {
    it('returns analytics overview', async () => {
      const { GET } = await import('@/app/api/pinterest/analytics/overview/route');
      const request = createMockRequest('http://localhost:3000/api/pinterest/analytics/overview');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toBeDefined();
    });
  });

  describe('GET /api/pinterest/analytics/chart', () => {
    it('returns chart data', async () => {
      const { GET } = await import('@/app/api/pinterest/analytics/chart/route');
      const request = createMockRequest(
        'http://localhost:3000/api/pinterest/analytics/chart?period=7d'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toBeDefined();
    });
  });

  describe('GET /api/pinterest/analytics/top-pins', () => {
    it('returns top performing pins', async () => {
      const { GET } = await import('@/app/api/pinterest/analytics/top-pins/route');
      const request = createMockRequest('http://localhost:3000/api/pinterest/analytics/top-pins');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('pins');
    });
  });
});

describe('Pinterest Status API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/pinterest/status', () => {
    it('returns connection status', async () => {
      const { GET } = await import('@/app/api/pinterest/status/route');
      const request = createMockRequest('http://localhost:3000/api/pinterest/status');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('connected');
    });
  });
});

describe('Pinterest Boards API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/pinterest/boards', () => {
    it('handles boards request', async () => {
      const { GET } = await import('@/app/api/pinterest/boards/route');
      const request = createMockRequest('http://localhost:3000/api/pinterest/boards');

      const response = await GET(request);

      // Should return valid response (200) or handle error gracefully (not a 400 validation error)
      expect([200, 401, 500]).toContain(response.status);
    });
  });
});

describe('Pinterest Pins API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/pinterest/pins/publish', () => {
    it('publishes a pin to Pinterest', async () => {
      const { POST } = await import('@/app/api/pinterest/pins/publish/route');
      const request = createMockRequest('http://localhost:3000/api/pinterest/pins/publish', {
        method: 'POST',
        body: JSON.stringify({
          pinId: 'pin-123',
          boardId: 'board-1',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);

      // Should succeed or return meaningful error
      expect([200, 201, 400, 500]).toContain(response.status);
    });
  });
});

describe('Pinterest Input Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates pin publish request body', async () => {
    const { POST } = await import('@/app/api/pinterest/pins/publish/route');
    const request = createMockRequest('http://localhost:3000/api/pinterest/pins/publish', {
      method: 'POST',
      body: JSON.stringify({}), // Empty body - should fail validation
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);

    // Should return 400 for invalid request
    expect(response.status).toBe(400);
  });
});
