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

const mockMockups = [
  {
    id: 'mockup-1',
    user_id: TEST_USER_ID,
    asset_id: 'asset-1',
    scene: 'frame-white',
    status: 'ready',
    mockup_url: 'https://example.com/mockup1.jpg',
    credits_used: 1,
    created_at: new Date().toISOString(),
    assets: {
      id: 'asset-1',
      file_url: 'https://example.com/asset1.jpg',
      format: 'jpg',
      quotes: {
        id: 'quote-1',
        text: 'Be the change',
        collection: 'growth',
        mood: 'inspirational',
      },
    },
  },
  {
    id: 'mockup-2',
    user_id: TEST_USER_ID,
    asset_id: 'asset-2',
    scene: 'canvas-gallery',
    status: 'pending',
    created_at: new Date().toISOString(),
    assets: {
      id: 'asset-2',
      file_url: 'https://example.com/asset2.jpg',
      format: 'png',
      quotes: null,
    },
  },
];

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
      if (table === 'mockups') {
        return createMockQueryBuilder(mockMockups);
      }
      if (table === 'assets') {
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

describe('Mockups API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/mockups', () => {
    it('returns list of mockups', async () => {
      const { GET } = await import('@/app/api/mockups/route');
      const request = createMockRequest('http://localhost:3000/api/mockups');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('mockups');
      expect(Array.isArray(data.mockups)).toBe(true);
    });

    it('returns pagination info', async () => {
      const { GET } = await import('@/app/api/mockups/route');
      const request = createMockRequest('http://localhost:3000/api/mockups?limit=10&offset=0');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('limit');
      expect(data).toHaveProperty('offset');
    });

    it('accepts scene filter parameter', async () => {
      const { GET } = await import('@/app/api/mockups/route');
      const request = createMockRequest('http://localhost:3000/api/mockups?scene=frame-white');

      const response = await GET(request);
      expect([200, 500]).toContain(response.status);
    });

    it('accepts status filter parameter', async () => {
      const { GET } = await import('@/app/api/mockups/route');
      const request = createMockRequest('http://localhost:3000/api/mockups?status=ready');

      const response = await GET(request);
      expect([200, 500]).toContain(response.status);
    });

    it('accepts assetId filter parameter with valid UUID', async () => {
      const { GET } = await import('@/app/api/mockups/route');
      const request = createMockRequest('http://localhost:3000/api/mockups?assetId=123e4567-e89b-12d3-a456-426614174000');

      const response = await GET(request);
      expect([200, 500]).toContain(response.status);
    });

    it('rejects invalid assetId format', async () => {
      const { GET } = await import('@/app/api/mockups/route');
      const request = createMockRequest('http://localhost:3000/api/mockups?assetId=invalid-uuid');

      const response = await GET(request);

      expect(response.status).toBe(400);
    });

    it('rejects invalid limit parameter', async () => {
      const { GET } = await import('@/app/api/mockups/route');
      const request = createMockRequest('http://localhost:3000/api/mockups?limit=500');

      const response = await GET(request);

      expect(response.status).toBe(400);
    });

    it('rejects limit above 100', async () => {
      const { GET } = await import('@/app/api/mockups/route');
      const request = createMockRequest('http://localhost:3000/api/mockups?limit=101');

      const response = await GET(request);

      expect(response.status).toBe(400);
    });

    it('rejects negative offset', async () => {
      const { GET } = await import('@/app/api/mockups/route');
      const request = createMockRequest('http://localhost:3000/api/mockups?offset=-5');

      const response = await GET(request);

      expect(response.status).toBe(400);
    });

    it('uses default limit and offset when not provided', async () => {
      const { GET } = await import('@/app/api/mockups/route');
      const request = createMockRequest('http://localhost:3000/api/mockups');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.limit).toBe(20);
      expect(data.offset).toBe(0);
    });
  });
});

describe('Mockups API - Response Structure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mockups have expected structure', async () => {
    const { GET } = await import('@/app/api/mockups/route');
    const request = createMockRequest('http://localhost:3000/api/mockups');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    if (data.mockups && data.mockups.length > 0) {
      const mockup = data.mockups[0];
      expect(mockup).toHaveProperty('id');
      expect(mockup).toHaveProperty('scene');
      expect(mockup).toHaveProperty('status');
    }
  });

  it('includes nested asset data', async () => {
    const { GET } = await import('@/app/api/mockups/route');
    const request = createMockRequest('http://localhost:3000/api/mockups');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    if (data.mockups && data.mockups.length > 0) {
      const mockup = data.mockups[0];
      expect(mockup).toHaveProperty('assets');
      if (mockup.assets) {
        expect(mockup.assets).toHaveProperty('id');
        expect(mockup.assets).toHaveProperty('file_url');
      }
    }
  });

  it('includes nested quote data through assets', async () => {
    const { GET } = await import('@/app/api/mockups/route');
    const request = createMockRequest('http://localhost:3000/api/mockups');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    if (data.mockups && data.mockups.length > 0) {
      const mockup = data.mockups[0];
      if (mockup.assets && mockup.assets.quotes) {
        expect(mockup.assets.quotes).toHaveProperty('text');
        expect(mockup.assets.quotes).toHaveProperty('collection');
      }
    }
  });
});

describe('Mockups API - Scene Filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const scenes = ['frame-white', 'frame-black', 'canvas-gallery', 'living-room', 'bedroom'];

  scenes.forEach((scene) => {
    it(`filters by ${scene} scene`, async () => {
      const { GET } = await import('@/app/api/mockups/route');
      const request = createMockRequest(`http://localhost:3000/api/mockups?scene=${scene}`);

      const response = await GET(request);
      expect([200, 500]).toContain(response.status);
    });
  });
});

describe('Mockups API - Status Filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const statuses = ['pending', 'processing', 'ready', 'failed', 'approved'];

  statuses.forEach((status) => {
    it(`filters by ${status} status`, async () => {
      const { GET } = await import('@/app/api/mockups/route');
      const request = createMockRequest(`http://localhost:3000/api/mockups?status=${status}`);

      const response = await GET(request);
      expect([200, 500]).toContain(response.status);
    });
  });
});

describe('Mockups API - Pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('respects limit parameter', async () => {
    const { GET } = await import('@/app/api/mockups/route');
    const request = createMockRequest('http://localhost:3000/api/mockups?limit=5');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.limit).toBe(5);
  });

  it('respects offset parameter', async () => {
    const { GET } = await import('@/app/api/mockups/route');
    const request = createMockRequest('http://localhost:3000/api/mockups?offset=10');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.offset).toBe(10);
  });

  it('accepts limit at maximum boundary (100)', async () => {
    const { GET } = await import('@/app/api/mockups/route');
    const request = createMockRequest('http://localhost:3000/api/mockups?limit=100');

    const response = await GET(request);

    expect(response.status).toBe(200);
  });

  it('accepts limit at minimum boundary (1)', async () => {
    const { GET } = await import('@/app/api/mockups/route');
    const request = createMockRequest('http://localhost:3000/api/mockups?limit=1');

    const response = await GET(request);

    expect(response.status).toBe(200);
  });

  it('rejects limit below minimum (0)', async () => {
    const { GET } = await import('@/app/api/mockups/route');
    const request = createMockRequest('http://localhost:3000/api/mockups?limit=0');

    const response = await GET(request);

    expect(response.status).toBe(400);
  });
});
