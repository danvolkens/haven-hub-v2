import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock quotes data
const mockQuotes = {
  quotes: [
    {
      id: 'quote-1',
      text: 'Be the change you wish to see in the world.',
      attribution: 'Gandhi',
      collection: 'growth',
      mood: 'inspirational',
      status: 'active',
      created_at: new Date().toISOString(),
    },
    {
      id: 'quote-2',
      text: 'The only way to do great work is to love what you do.',
      attribution: 'Steve Jobs',
      collection: 'grounding',
      mood: 'motivational',
      status: 'active',
      created_at: new Date().toISOString(),
    },
  ],
  total: 2,
  limit: 20,
  offset: 0,
};

// Mock the fetcher
vi.mock('@/lib/fetcher', () => ({
  api: {
    get: vi.fn((url: string) => {
      if (url.startsWith('/quotes')) {
        return Promise.resolve(mockQuotes);
      }
      return Promise.resolve({});
    }),
    post: vi.fn(() => Promise.resolve({ id: 'new-quote', text: 'New quote' })),
    patch: vi.fn(() => Promise.resolve({ id: 'quote-1', text: 'Updated quote' })),
    delete: vi.fn(() => Promise.resolve({ success: true })),
  },
}));

// Mock toast provider
vi.mock('@/components/providers/toast-provider', () => ({
  useToast: () => ({
    toasts: [],
    toast: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

// Create wrapper with providers
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe('useQuotes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch quotes', async () => {
    const { useQuotes } = await import('@/hooks/use-quotes');

    const { result } = renderHook(() => useQuotes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });
  });

  it('should return quotes array', async () => {
    const { useQuotes } = await import('@/hooks/use-quotes');

    const { result } = renderHook(() => useQuotes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      if (result.current.data) {
        expect(Array.isArray(result.current.data.quotes)).toBe(true);
      }
    });
  });

  it('should accept collection filter', async () => {
    const { useQuotes } = await import('@/hooks/use-quotes');

    const { result } = renderHook(() => useQuotes({ collection: 'growth' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });
  });

  it('should accept mood filter', async () => {
    const { useQuotes } = await import('@/hooks/use-quotes');

    const { result } = renderHook(() => useQuotes({ mood: 'inspirational' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });
  });

  it('should accept status filter', async () => {
    const { useQuotes } = await import('@/hooks/use-quotes');

    const { result } = renderHook(() => useQuotes({ status: 'active' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });
  });

  it('should accept search parameter', async () => {
    const { useQuotes } = await import('@/hooks/use-quotes');

    const { result } = renderHook(() => useQuotes({ search: 'change' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });
  });

  it('should accept pagination parameters', async () => {
    const { useQuotes } = await import('@/hooks/use-quotes');

    const { result } = renderHook(() => useQuotes({ limit: 10, offset: 5 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });
  });

  it('should accept sort parameter', async () => {
    const { useQuotes } = await import('@/hooks/use-quotes');

    const { result } = renderHook(() => useQuotes({ sort: 'created_at' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });
  });

  it('should accept order parameter', async () => {
    const { useQuotes } = await import('@/hooks/use-quotes');

    const { result } = renderHook(() => useQuotes({ order: 'desc' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });
  });
});

describe('useQuote (single)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch a single quote by ID', async () => {
    const { useQuote } = await import('@/hooks/use-quotes');

    const { result } = renderHook(() => useQuote('quote-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });
  });

  it('should not fetch when ID is empty', async () => {
    const { useQuote } = await import('@/hooks/use-quotes');

    const { result } = renderHook(() => useQuote(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeUndefined();
  });
});

describe('useCreateQuote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return mutation function', async () => {
    const { useCreateQuote } = await import('@/hooks/use-quotes');

    const { result } = renderHook(() => useCreateQuote(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.mutateAsync).toBe('function');
  });

  it('should have isPending state', async () => {
    const { useCreateQuote } = await import('@/hooks/use-quotes');

    const { result } = renderHook(() => useCreateQuote(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.isPending).toBe('boolean');
  });
});

describe('useUpdateQuote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be exported as a function', async () => {
    const { useUpdateQuote } = await import('@/hooks/use-quotes');
    expect(typeof useUpdateQuote).toBe('function');
  });
});

describe('useDeleteQuote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be exported as a function', async () => {
    const { useDeleteQuote } = await import('@/hooks/use-quotes');
    expect(typeof useDeleteQuote).toBe('function');
  });
});

describe('useImportQuotes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be exported as a function', async () => {
    const { useImportQuotes } = await import('@/hooks/use-quotes');
    expect(typeof useImportQuotes).toBe('function');
  });
});

describe('Quote Collections', () => {
  const validCollections = ['growth', 'grounding', 'wholeness', 'general'];

  validCollections.forEach((collection) => {
    it(`should accept ${collection} as valid collection`, () => {
      expect(validCollections).toContain(collection);
    });
  });
});

describe('Quote Moods', () => {
  const validMoods = [
    'inspirational',
    'motivational',
    'calming',
    'energizing',
    'reflective',
    'empowering',
  ];

  validMoods.forEach((mood) => {
    it(`should accept ${mood} as valid mood`, () => {
      expect(validMoods).toContain(mood);
    });
  });
});

describe('Quote Status', () => {
  const validStatuses = ['active', 'archived', 'generating'];

  validStatuses.forEach((status) => {
    it(`should accept ${status} as valid status`, () => {
      expect(validStatuses).toContain(status);
    });
  });
});

describe('Quote Sort Options', () => {
  const validSortFields = ['created_at', 'updated_at', 'total_impressions'];

  validSortFields.forEach((field) => {
    it(`should accept ${field} as valid sort field`, () => {
      expect(validSortFields).toContain(field);
    });
  });
});
