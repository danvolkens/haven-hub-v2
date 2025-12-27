import React, { type ReactElement, type ReactNode } from 'react';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';

// Create a fresh QueryClient for each test
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
        staleTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface WrapperProps {
  children: ReactNode;
}

// Base wrapper with QueryClient
function BaseWrapper({ children }: WrapperProps) {
  const queryClient = createTestQueryClient();

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

// Custom render with all providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

interface CustomRenderResult extends RenderResult {
  user: ReturnType<typeof userEvent.setup>;
}

export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): CustomRenderResult {
  const { queryClient = createTestQueryClient(), ...renderOptions } = options;

  function Wrapper({ children }: WrapperProps) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  const user = userEvent.setup();

  return {
    user,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

// Re-export everything from testing-library
export * from '@testing-library/react';
export { userEvent };

// Helper to wait for loading states
export async function waitForLoadingToFinish() {
  const { waitFor, screen } = await import('@testing-library/react');
  await waitFor(() => {
    const loaders = screen.queryAllByRole('progressbar');
    const spinners = screen.queryAllByTestId(/loading|spinner/i);
    const loadingTexts = screen.queryAllByText(/loading/i);
    expect([...loaders, ...spinners, ...loadingTexts].length).toBe(0);
  });
}

// Helper to create mock fetch response
export function createMockFetchResponse<T>(data: T, options?: { status?: number; ok?: boolean }) {
  const { status = 200, ok = true } = options || {};
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    headers: new Headers(),
    redirected: false,
    statusText: ok ? 'OK' : 'Error',
    type: 'basic' as ResponseType,
    url: '',
    clone: function () {
      return this;
    },
    body: null,
    bodyUsed: false,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
  });
}

// Helper to create mock error fetch response
export function createMockFetchError(message: string, status = 500) {
  return createMockFetchResponse({ error: message }, { status, ok: false });
}

// Mock Next.js Request helper
export function createMockNextRequest(
  url: string,
  options?: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  }
) {
  const { method = 'GET', body, headers = {} } = options || {};

  const request = new Request(new URL(url, 'http://localhost:3000'), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // Add Next.js specific properties
  return Object.assign(request, {
    nextUrl: new URL(url, 'http://localhost:3000'),
  });
}

// Helper to mock console methods
export function mockConsole() {
  const originalConsole = { ...console };

  beforeEach(() => {
    console.log = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
  });

  afterEach(() => {
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });

  return {
    getLogCalls: () => (console.log as ReturnType<typeof vi.fn>).mock.calls,
    getWarnCalls: () => (console.warn as ReturnType<typeof vi.fn>).mock.calls,
    getErrorCalls: () => (console.error as ReturnType<typeof vi.fn>).mock.calls,
  };
}

// Helper to test async component
export async function renderAsyncComponent(component: ReactElement) {
  const result = renderWithProviders(component);
  await waitForLoadingToFinish();
  return result;
}

// Import vi for console mock
import { vi, beforeEach, afterEach, expect } from 'vitest';
