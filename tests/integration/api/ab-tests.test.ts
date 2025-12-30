import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { TEST_USER_ID } from '../../setup';

// Mock the ab-testing service
vi.mock('@/lib/services/ab-testing', () => ({
  getTests: vi.fn(() => Promise.resolve({
    tests: [
      {
        id: 'test-1',
        name: 'Button Color Test',
        test_type: 'cta_button',
        status: 'active',
        control: { color: 'blue' },
        variants: [{ color: 'green' }, { color: 'red' }],
        created_at: new Date().toISOString(),
      },
      {
        id: 'test-2',
        name: 'Headline Test',
        test_type: 'headline',
        status: 'draft',
        control: { text: 'Control Text' },
        variants: [{ text: 'Variant A' }],
        created_at: new Date().toISOString(),
      },
    ],
    count: 2,
  })),
  createTest: vi.fn(() => Promise.resolve({
    id: 'new-test-id',
    name: 'New Test',
    test_type: 'headline',
    status: 'draft',
  })),
}));

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: TEST_USER_ID } }, error: null }),
    },
  })),
}));

// Helper to create mock NextRequest
function createMockRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options as any);
}

describe('A/B Tests API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/ab-tests', () => {
    it('returns list of tests', async () => {
      const { GET } = await import('@/app/api/ab-tests/route');
      const request = createMockRequest('http://localhost:3000/api/ab-tests');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('tests');
      expect(Array.isArray(data.tests)).toBe(true);
    });

    it('returns test count', async () => {
      const { GET } = await import('@/app/api/ab-tests/route');
      const request = createMockRequest('http://localhost:3000/api/ab-tests');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('count');
    });

    it('accepts status filter parameter', async () => {
      const { GET } = await import('@/app/api/ab-tests/route');
      const request = createMockRequest('http://localhost:3000/api/ab-tests?status=active');

      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('accepts limit parameter', async () => {
      const { GET } = await import('@/app/api/ab-tests/route');
      const request = createMockRequest('http://localhost:3000/api/ab-tests?limit=10');

      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('accepts offset parameter', async () => {
      const { GET } = await import('@/app/api/ab-tests/route');
      const request = createMockRequest('http://localhost:3000/api/ab-tests?offset=5');

      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('uses default limit of 50', async () => {
      const { getTests } = await import('@/lib/services/ab-testing');
      const { GET } = await import('@/app/api/ab-tests/route');
      const request = createMockRequest('http://localhost:3000/api/ab-tests');

      await GET(request);

      expect(getTests).toHaveBeenCalledWith(
        TEST_USER_ID,
        expect.objectContaining({ limit: 50 })
      );
    });
  });

  describe('POST /api/ab-tests', () => {
    it('creates a new test', async () => {
      const { POST } = await import('@/app/api/ab-tests/route');
      const request = createMockRequest('http://localhost:3000/api/ab-tests', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Button Test',
          test_type: 'cta_button',
          control: { color: 'blue', text: 'Click Me' },
          variants: [{ color: 'green', text: 'Click Me' }],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty('id');
    });

    it('creates test with multiple variants', async () => {
      const { POST } = await import('@/app/api/ab-tests/route');
      const request = createMockRequest('http://localhost:3000/api/ab-tests', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Multi-Variant Test',
          test_type: 'headline',
          control: { text: 'Control' },
          variants: [
            { text: 'Variant A' },
            { text: 'Variant B' },
            { text: 'Variant C' },
          ],
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
    });

    it('rejects test without name', async () => {
      const { POST } = await import('@/app/api/ab-tests/route');
      const request = createMockRequest('http://localhost:3000/api/ab-tests', {
        method: 'POST',
        body: JSON.stringify({
          test_type: 'headline',
          control: { text: 'Control' },
          variants: [{ text: 'Variant A' }],
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('name');
    });

    it('rejects test without test_type', async () => {
      const { POST } = await import('@/app/api/ab-tests/route');
      const request = createMockRequest('http://localhost:3000/api/ab-tests', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Missing Type Test',
          control: { text: 'Control' },
          variants: [{ text: 'Variant A' }],
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('test_type');
    });

    it('rejects test without control', async () => {
      const { POST } = await import('@/app/api/ab-tests/route');
      const request = createMockRequest('http://localhost:3000/api/ab-tests', {
        method: 'POST',
        body: JSON.stringify({
          name: 'No Control Test',
          test_type: 'headline',
          variants: [{ text: 'Variant A' }],
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('control');
    });

    it('rejects test without variants', async () => {
      const { POST } = await import('@/app/api/ab-tests/route');
      const request = createMockRequest('http://localhost:3000/api/ab-tests', {
        method: 'POST',
        body: JSON.stringify({
          name: 'No Variants Test',
          test_type: 'headline',
          control: { text: 'Control' },
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('variants');
    });

    it('rejects test with empty variants array', async () => {
      const { POST } = await import('@/app/api/ab-tests/route');
      const request = createMockRequest('http://localhost:3000/api/ab-tests', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Empty Variants Test',
          test_type: 'headline',
          control: { text: 'Control' },
          variants: [],
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('variant');
    });
  });
});

describe('A/B Tests API - Test Types', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('accepts cta_button test type', async () => {
    const { POST } = await import('@/app/api/ab-tests/route');
    const request = createMockRequest('http://localhost:3000/api/ab-tests', {
      method: 'POST',
      body: JSON.stringify({
        name: 'CTA Button Test',
        test_type: 'cta_button',
        control: { color: 'blue' },
        variants: [{ color: 'green' }],
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
  });

  it('accepts headline test type', async () => {
    const { POST } = await import('@/app/api/ab-tests/route');
    const request = createMockRequest('http://localhost:3000/api/ab-tests', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Headline Test',
        test_type: 'headline',
        control: { text: 'Original' },
        variants: [{ text: 'Alternative' }],
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
  });

  it('accepts image test type', async () => {
    const { POST } = await import('@/app/api/ab-tests/route');
    const request = createMockRequest('http://localhost:3000/api/ab-tests', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Image Test',
        test_type: 'image',
        control: { url: 'https://example.com/a.jpg' },
        variants: [{ url: 'https://example.com/b.jpg' }],
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
  });
});

describe('A/B Tests API - Response Structure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('tests have expected structure', async () => {
    const { GET } = await import('@/app/api/ab-tests/route');
    const request = createMockRequest('http://localhost:3000/api/ab-tests');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    if (data.tests && data.tests.length > 0) {
      const test = data.tests[0];
      expect(test).toHaveProperty('id');
      expect(test).toHaveProperty('name');
      expect(test).toHaveProperty('test_type');
      expect(test).toHaveProperty('status');
      expect(test).toHaveProperty('control');
      expect(test).toHaveProperty('variants');
    }
  });

  it('test has control object', async () => {
    const { GET } = await import('@/app/api/ab-tests/route');
    const request = createMockRequest('http://localhost:3000/api/ab-tests');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    if (data.tests && data.tests.length > 0) {
      const test = data.tests[0];
      expect(typeof test.control).toBe('object');
    }
  });

  it('test has variants array', async () => {
    const { GET } = await import('@/app/api/ab-tests/route');
    const request = createMockRequest('http://localhost:3000/api/ab-tests');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    if (data.tests && data.tests.length > 0) {
      const test = data.tests[0];
      expect(Array.isArray(test.variants)).toBe(true);
    }
  });
});
