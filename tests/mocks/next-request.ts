import { vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Create a mock NextRequest for API route testing
 */
export function createMockRequest(
  url: string,
  options?: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    searchParams?: Record<string, string>;
  }
): NextRequest {
  const { method = 'GET', body, headers = {}, searchParams = {} } = options || {};

  const urlObj = new URL(url, 'http://localhost:3000');

  // Add search params
  Object.entries(searchParams).forEach(([key, value]) => {
    urlObj.searchParams.set(key, value);
  });

  const requestInit: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body && method !== 'GET' && method !== 'HEAD') {
    requestInit.body = JSON.stringify(body);
  }

  return new NextRequest(urlObj, requestInit);
}

/**
 * Helper to parse NextResponse JSON body
 */
export async function parseNextResponse<T>(response: NextResponse): Promise<T> {
  const text = await response.text();
  return JSON.parse(text) as T;
}

/**
 * Create mock request context with params
 */
export function createMockContext(params: Record<string, string>) {
  return { params: Promise.resolve(params) };
}

/**
 * Test helper for API route testing
 */
export interface ApiTestResult<T> {
  status: number;
  data: T;
  headers: Headers;
}

export async function testApiRoute<T>(
  handler: (req: NextRequest, context?: unknown) => Promise<NextResponse>,
  request: NextRequest,
  context?: unknown
): Promise<ApiTestResult<T>> {
  const response = await handler(request, context);
  const data = await parseNextResponse<T>(response);

  return {
    status: response.status,
    data,
    headers: response.headers,
  };
}

/**
 * Mock authenticated request
 */
export function createAuthenticatedRequest(
  url: string,
  options?: {
    method?: string;
    body?: unknown;
    userId?: string;
  }
): NextRequest {
  const { userId = 'test-user-id', ...rest } = options || {};

  return createMockRequest(url, {
    ...rest,
    headers: {
      Authorization: `Bearer mock-token-for-${userId}`,
      'X-User-Id': userId,
    },
  });
}
