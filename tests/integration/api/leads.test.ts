import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { TEST_USER_ID } from '../../setup';

// Mock the auth session helper
vi.mock('@/lib/auth/session', () => ({
  getApiUserId: vi.fn(() => TEST_USER_ID),
}));

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() =>
    Promise.resolve({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'lead-1',
              email: 'lead1@example.com',
              first_name: 'John',
              source: 'quiz',
              status: 'new',
              created_at: new Date().toISOString(),
              landing_page: { id: 'lp-1', name: 'Quiz Page', type: 'quiz' },
            },
            {
              id: 'lead-2',
              email: 'lead2@example.com',
              first_name: 'Jane',
              source: 'popup',
              status: 'contacted',
              created_at: new Date().toISOString(),
              landing_page: null,
            },
          ],
          error: null,
          count: 2,
        }),
      })),
    })
  ),
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: () =>
          Promise.resolve({
            data: { user: { id: TEST_USER_ID } },
            error: null,
          }),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      })),
    })
  ),
}));

// Helper to create mock NextRequest
function createMockRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options);
}

describe('Leads API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/leads', () => {
    it('returns list of leads', async () => {
      const { GET } = await import('@/app/api/leads/route');
      const request = createMockRequest('http://localhost:3000/api/leads');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('leads');
      expect(Array.isArray(data.leads)).toBe(true);
    });

    it('returns leads with pagination info', async () => {
      const { GET } = await import('@/app/api/leads/route');
      const request = createMockRequest('http://localhost:3000/api/leads?limit=10&offset=0');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('limit');
      expect(data).toHaveProperty('offset');
    });

    it('filters leads by status', async () => {
      const { GET } = await import('@/app/api/leads/route');
      const request = createMockRequest('http://localhost:3000/api/leads?status=new');

      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('filters leads by source', async () => {
      const { GET } = await import('@/app/api/leads/route');
      const request = createMockRequest('http://localhost:3000/api/leads?source=quiz');

      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('searches leads by email or name', async () => {
      const { GET } = await import('@/app/api/leads/route');
      const request = createMockRequest('http://localhost:3000/api/leads?search=john');

      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('rejects invalid limit parameter', async () => {
      const { GET } = await import('@/app/api/leads/route');
      const request = createMockRequest('http://localhost:3000/api/leads?limit=500');

      const response = await GET(request);

      // Should return 400 for invalid query params
      expect(response.status).toBe(400);
    });

    it('rejects negative offset parameter', async () => {
      const { GET } = await import('@/app/api/leads/route');
      const request = createMockRequest('http://localhost:3000/api/leads?offset=-10');

      const response = await GET(request);

      // Should return 400 for invalid query params
      expect(response.status).toBe(400);
    });
  });
});

describe('Leads API - Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles database errors gracefully', async () => {
    // Mock a database error
    vi.doMock('@/lib/supabase/server', () => ({
      createServerSupabaseClient: vi.fn(() =>
        Promise.resolve({
          from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            range: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database connection failed' },
              count: null,
            }),
          })),
        })
      ),
    }));

    // Re-import to get the new mock
    vi.resetModules();

    const { GET } = await import('@/app/api/leads/route');
    const request = createMockRequest('http://localhost:3000/api/leads');

    const response = await GET(request);

    // Should handle error gracefully
    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});

// Keep original validation tests
describe('Lead Validation', () => {
  it('validates correct lead data', async () => {
    const { validateInput, createLeadSchema } = await import('@/lib/validation/schemas');

    const result = validateInput(createLeadSchema, {
      email: 'test@example.com',
      firstName: 'Test',
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid email', async () => {
    const { validateInput, createLeadSchema } = await import('@/lib/validation/schemas');

    const result = validateInput(createLeadSchema, {
      email: 'not-an-email',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toContain('email: Invalid email address');
    }
  });

  it('accepts optional fields', async () => {
    const { validateInput, createLeadSchema } = await import('@/lib/validation/schemas');

    const result = validateInput(createLeadSchema, {
      email: 'test@example.com',
      utmSource: 'google',
      utmMedium: 'cpc',
      utmCampaign: 'spring-sale',
    });

    expect(result.success).toBe(true);
  });
});
