import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  getSupabaseBrowserClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
        error: null,
      }),
    },
  })),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Fetcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('ApiError', () => {
    it('should be a custom error class', async () => {
      const { ApiError } = await import('@/lib/fetcher');
      const error = new ApiError('Test error', 400, { field: 'value' });

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('ApiError');
      expect(error.message).toBe('Test error');
      expect(error.status).toBe(400);
      expect(error.data).toEqual({ field: 'value' });
    });

    it('should work without data', async () => {
      const { ApiError } = await import('@/lib/fetcher');
      const error = new ApiError('Simple error', 500);

      expect(error.status).toBe(500);
      expect(error.data).toBeUndefined();
    });
  });

  describe('fetcher', () => {
    it('should be exported as a function', async () => {
      const { fetcher } = await import('@/lib/fetcher');
      expect(typeof fetcher).toBe('function');
    });

    it('should add /api prefix to relative endpoints', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('{"data": "test"}'),
      });

      const { fetcher } = await import('@/lib/fetcher');
      await fetcher('/users');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/users',
        expect.any(Object)
      );
    });

    it('should not modify absolute URLs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('{"data": "test"}'),
      });

      const { fetcher } = await import('@/lib/fetcher');
      await fetcher('https://external.api.com/data');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://external.api.com/data',
        expect.any(Object)
      );
    });

    it('should add query params to URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('{"data": "test"}'),
      });

      const { fetcher } = await import('@/lib/fetcher');
      await fetcher('/users', { params: { page: 1, limit: 10 } });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/users?page=1&limit=10',
        expect.any(Object)
      );
    });

    it('should ignore undefined params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('{"data": "test"}'),
      });

      const { fetcher } = await import('@/lib/fetcher');
      await fetcher('/users', { params: { page: 1, limit: undefined } });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/users?page=1',
        expect.any(Object)
      );
    });

    it('should add authorization header when session exists', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('{"data": "test"}'),
      });

      const { fetcher } = await import('@/lib/fetcher');
      await fetcher('/users');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('should set Content-Type header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('{"data": "test"}'),
      });

      const { fetcher } = await import('@/lib/fetcher');
      await fetcher('/users');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should parse JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('{"message": "Hello"}'),
      });

      const { fetcher } = await import('@/lib/fetcher');
      const result = await fetcher('/test');

      expect(result).toEqual({ message: 'Hello' });
    });

    it('should return empty object for empty response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(''),
      });

      const { fetcher } = await import('@/lib/fetcher');
      const result = await fetcher('/test');

      expect(result).toEqual({});
    });

    it('should throw ApiError for non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'Not found' }),
      });

      const { fetcher, ApiError } = await import('@/lib/fetcher');

      await expect(fetcher('/missing')).rejects.toThrow(ApiError);
    });

    it('should handle response with error field', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Bad request' }),
      });

      const { fetcher } = await import('@/lib/fetcher');

      try {
        await fetcher('/bad');
      } catch (error: any) {
        expect(error.message).toBe('Bad request');
        expect(error.status).toBe(400);
      }
    });

    it('should handle response with no JSON body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('No JSON')),
      });

      const { fetcher } = await import('@/lib/fetcher');

      try {
        await fetcher('/error');
      } catch (error: any) {
        expect(error.status).toBe(500);
        expect(error.message).toBe('HTTP error 500');
      }
    });
  });

  describe('api convenience methods', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('{"success": true}'),
      });
    });

    it('should export api object', async () => {
      const { api } = await import('@/lib/fetcher');
      expect(api).toBeDefined();
      expect(typeof api.get).toBe('function');
      expect(typeof api.post).toBe('function');
      expect(typeof api.patch).toBe('function');
      expect(typeof api.put).toBe('function');
      expect(typeof api.delete).toBe('function');
    });

    it('should make GET request', async () => {
      const { api } = await import('@/lib/fetcher');
      await api.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should make GET request with params', async () => {
      const { api } = await import('@/lib/fetcher');
      await api.get('/test', { page: 1 });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test?page=1',
        expect.any(Object)
      );
    });

    it('should make POST request', async () => {
      const { api } = await import('@/lib/fetcher');
      await api.post('/test', { name: 'John' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'John' }),
        })
      );
    });

    it('should make POST request without body', async () => {
      const { api } = await import('@/lib/fetcher');
      await api.post('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: undefined,
        })
      );
    });

    it('should make PATCH request', async () => {
      const { api } = await import('@/lib/fetcher');
      await api.patch('/test', { name: 'Jane' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ name: 'Jane' }),
        })
      );
    });

    it('should make PUT request', async () => {
      const { api } = await import('@/lib/fetcher');
      await api.put('/test', { id: 1, name: 'Update' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ id: 1, name: 'Update' }),
        })
      );
    });

    it('should make DELETE request', async () => {
      const { api } = await import('@/lib/fetcher');
      await api.delete('/test/1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });
});

describe('URL Building', () => {
  it('should handle boolean params', async () => {
    const params = { active: true, deleted: false };
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    expect(searchParams.toString()).toBe('active=true&deleted=false');
  });

  it('should handle numeric params', async () => {
    const params = { page: 1, limit: 50 };
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    expect(searchParams.toString()).toBe('page=1&limit=50');
  });

  it('should handle empty params', async () => {
    const params = {};
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    expect(searchParams.toString()).toBe('');
  });
});
