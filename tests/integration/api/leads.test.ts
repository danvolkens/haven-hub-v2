import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { TEST_USER_ID } from '../../setup';

// Create mock chain builder
function createMockQueryBuilder(data: unknown[] = [], count = 0, error: unknown = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue({ data, error, count }),
    single: vi.fn().mockResolvedValue({ data: data[0] || null, error }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  };
  return chain;
}

const mockLeads = [
  {
    id: 'lead-1',
    email: 'lead1@example.com',
    first_name: 'John',
    source: 'quiz',
    status: 'new',
    user_id: TEST_USER_ID,
    created_at: new Date().toISOString(),
    landing_page: { id: 'lp-1', name: 'Quiz Page', type: 'quiz' },
  },
  {
    id: 'lead-2',
    email: 'lead2@example.com',
    first_name: 'Jane',
    source: 'popup',
    status: 'contacted',
    user_id: TEST_USER_ID,
    created_at: new Date().toISOString(),
    landing_page: null,
  },
];

// Mock the auth session helper
vi.mock('@/lib/auth/session', () => ({
  getApiUserId: vi.fn(() => Promise.resolve(TEST_USER_ID)),
}));

// Mock Supabase with proper chain
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => {
    return Promise.resolve({
      from: vi.fn(() => createMockQueryBuilder(mockLeads, 2)),
      auth: {
        getUser: () => Promise.resolve({
          data: { user: { id: TEST_USER_ID } },
          error: null,
        }),
      },
    });
  }),
  createClient: vi.fn(() => {
    return Promise.resolve({
      from: vi.fn(() => createMockQueryBuilder(mockLeads, 2)),
      auth: {
        getUser: () => Promise.resolve({
          data: { user: { id: TEST_USER_ID } },
          error: null,
        }),
      },
    });
  }),
}));

// Helper to create mock NextRequest
function createMockRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options as any);
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

    it('accepts status filter parameter', async () => {
      const { GET } = await import('@/app/api/leads/route');
      const request = createMockRequest('http://localhost:3000/api/leads?status=new');

      const response = await GET(request);

      // Either succeeds or fails gracefully (not a validation error)
      expect(response.status).not.toBe(400);
    });

    it('accepts source filter parameter', async () => {
      const { GET } = await import('@/app/api/leads/route');
      const request = createMockRequest('http://localhost:3000/api/leads?source=quiz');

      const response = await GET(request);

      // Either succeeds or fails gracefully (not a validation error)
      expect(response.status).not.toBe(400);
    });

    it('accepts search parameter', async () => {
      const { GET } = await import('@/app/api/leads/route');
      const request = createMockRequest('http://localhost:3000/api/leads?search=john');

      const response = await GET(request);

      // Either succeeds or fails gracefully (not a validation error)
      expect(response.status).not.toBe(400);
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
