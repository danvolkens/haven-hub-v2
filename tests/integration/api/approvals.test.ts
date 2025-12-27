import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { TEST_USER_ID } from '../../setup';

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: () =>
          Promise.resolve({
            data: { user: { id: TEST_USER_ID } },
            error: null,
          }),
      },
      from: vi.fn((table: string) => {
        if (table === 'approvals') {
          return {
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'approval-1',
                  type: 'pin',
                  status: 'pending',
                  content: { title: 'Test Pin' },
                  created_at: new Date().toISOString(),
                },
                {
                  id: 'approval-2',
                  type: 'email',
                  status: 'pending',
                  content: { subject: 'Test Email' },
                  created_at: new Date().toISOString(),
                },
              ],
              error: null,
            }),
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'approval-1',
                type: 'pin',
                status: 'pending',
                content: { title: 'Test Pin' },
              },
              error: null,
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }),
    })
  ),
}));

// Helper to create mock NextRequest
function createMockRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options);
}

describe('Approvals API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/approvals', () => {
    it('returns list of pending approvals', async () => {
      const { GET } = await import('@/app/api/approvals/route');
      const request = createMockRequest('http://localhost:3000/api/approvals');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('approvals');
      expect(Array.isArray(data.approvals)).toBe(true);
    });
  });

  describe('GET /api/approvals/counts', () => {
    it('returns approval counts by type', async () => {
      const { GET } = await import('@/app/api/approvals/counts/route');
      const request = createMockRequest('http://localhost:3000/api/approvals/counts');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('counts');
    });
  });
});

describe('Approvals API - Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 for unauthenticated requests', async () => {
    // Override the mock to return no user
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: vi.fn(() =>
        Promise.resolve({
          auth: {
            getUser: () =>
              Promise.resolve({
                data: { user: null },
                error: { message: 'Not authenticated' },
              }),
          },
        })
      ),
    }));

    vi.resetModules();

    const { GET } = await import('@/app/api/approvals/route');
    const request = createMockRequest('http://localhost:3000/api/approvals');

    const response = await GET(request);

    expect(response.status).toBe(401);
  });
});

describe('Bulk Approvals API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/approvals/bulk', () => {
    it('approves multiple items at once', async () => {
      const { POST } = await import('@/app/api/approvals/bulk/route');
      const request = createMockRequest('http://localhost:3000/api/approvals/bulk', {
        method: 'POST',
        body: JSON.stringify({
          ids: ['approval-1', 'approval-2'],
          action: 'approve',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);

      // Should succeed or handle gracefully
      expect([200, 201, 204]).toContain(response.status);
    });

    it('rejects multiple items at once', async () => {
      const { POST } = await import('@/app/api/approvals/bulk/route');
      const request = createMockRequest('http://localhost:3000/api/approvals/bulk', {
        method: 'POST',
        body: JSON.stringify({
          ids: ['approval-1'],
          action: 'reject',
          reason: 'Not aligned with brand guidelines',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);

      expect([200, 201, 204]).toContain(response.status);
    });
  });
});
