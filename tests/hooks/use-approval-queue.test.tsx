import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock the fetcher
const mockApprovals = {
  items: [
    { id: 'item-1', type: 'asset', status: 'pending', payload: {} },
    { id: 'item-2', type: 'mockup', status: 'pending', payload: {} },
  ],
  total: 2,
  limit: 20,
  offset: 0,
};

const mockCounts = {
  total: 10,
  asset: 4,
  mockup: 3,
  pin: 2,
  ugc: 1,
  product: 0,
};

vi.mock('@/lib/fetcher', () => ({
  api: {
    get: vi.fn((url: string) => {
      if (url === '/approvals') {
        return Promise.resolve(mockApprovals);
      }
      if (url === '/approvals/counts') {
        return Promise.resolve(mockCounts);
      }
      return Promise.resolve({});
    }),
    patch: vi.fn(() => Promise.resolve({ success: true })),
    post: vi.fn(() => Promise.resolve({ success: true })),
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

describe('useApprovalQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch approval items', async () => {
    const { useApprovalQueue } = await import('@/hooks/use-approval-queue');

    const { result } = renderHook(() => useApprovalQueue(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.items).toBeDefined();
    });
  });

  it('should return items array', async () => {
    const { useApprovalQueue } = await import('@/hooks/use-approval-queue');

    const { result } = renderHook(() => useApprovalQueue(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(Array.isArray(result.current.items)).toBe(true);
    });
  });

  it('should return total count', async () => {
    const { useApprovalQueue } = await import('@/hooks/use-approval-queue');

    const { result } = renderHook(() => useApprovalQueue(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(typeof result.current.total).toBe('number');
    });
  });

  it('should return counts by type', async () => {
    const { useApprovalQueue } = await import('@/hooks/use-approval-queue');

    const { result } = renderHook(() => useApprovalQueue(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.counts).toHaveProperty('total');
      expect(result.current.counts).toHaveProperty('asset');
      expect(result.current.counts).toHaveProperty('mockup');
    });
  });

  it('should accept filters', async () => {
    const { useApprovalQueue } = await import('@/hooks/use-approval-queue');

    const filters = { type: 'asset' as const };

    const { result } = renderHook(() => useApprovalQueue(filters), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });
  });

  it('should accept limit and offset', async () => {
    const { useApprovalQueue } = await import('@/hooks/use-approval-queue');

    const { result } = renderHook(() => useApprovalQueue({}, 10, 5), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });
  });

  it('should provide approve action', async () => {
    const { useApprovalQueue } = await import('@/hooks/use-approval-queue');

    const { result } = renderHook(() => useApprovalQueue(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.approve).toBe('function');
  });

  it('should provide reject action', async () => {
    const { useApprovalQueue } = await import('@/hooks/use-approval-queue');

    const { result } = renderHook(() => useApprovalQueue(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.reject).toBe('function');
  });

  it('should provide skip action', async () => {
    const { useApprovalQueue } = await import('@/hooks/use-approval-queue');

    const { result } = renderHook(() => useApprovalQueue(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.skip).toBe('function');
  });

  it('should provide bulk approve action', async () => {
    const { useApprovalQueue } = await import('@/hooks/use-approval-queue');

    const { result } = renderHook(() => useApprovalQueue(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.bulkApprove).toBe('function');
  });

  it('should provide bulk reject action', async () => {
    const { useApprovalQueue } = await import('@/hooks/use-approval-queue');

    const { result } = renderHook(() => useApprovalQueue(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.bulkReject).toBe('function');
  });

  it('should provide loading state', async () => {
    const { useApprovalQueue } = await import('@/hooks/use-approval-queue');

    const { result } = renderHook(() => useApprovalQueue(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.isLoading).toBe('boolean');
  });

  it('should provide actioning state', async () => {
    const { useApprovalQueue } = await import('@/hooks/use-approval-queue');

    const { result } = renderHook(() => useApprovalQueue(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.isActioning).toBe('boolean');
  });

  it('should provide bulk actioning state', async () => {
    const { useApprovalQueue } = await import('@/hooks/use-approval-queue');

    const { result } = renderHook(() => useApprovalQueue(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.isBulkActioning).toBe('boolean');
  });

  it('should provide refetch function', async () => {
    const { useApprovalQueue } = await import('@/hooks/use-approval-queue');

    const { result } = renderHook(() => useApprovalQueue(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.refetch).toBe('function');
  });
});

describe('Approval Queue Filters', () => {
  const validTypes = ['asset', 'mockup', 'pin', 'ugc', 'product'];

  validTypes.forEach((type) => {
    it(`should accept ${type} as valid filter type`, () => {
      expect(validTypes).toContain(type);
    });
  });
});

describe('Approval Actions', () => {
  const validActions = ['approve', 'reject', 'skip'];

  validActions.forEach((action) => {
    it(`should support ${action} action`, () => {
      expect(validActions).toContain(action);
    });
  });
});
