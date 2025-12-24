import { NextRequest, NextResponse } from 'next/server';

/**
 * Verify that a cron request is from Vercel
 */
export function verifyCronRequest(request: NextRequest): boolean {
  // Check for Vercel cron secret
  const authHeader = request.headers.get('authorization');
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

  if (authHeader !== expectedAuth) {
    return false;
  }

  return true;
}

/**
 * Create a standardized cron response
 */
export function createCronResponse(
  success: boolean,
  data?: Record<string, unknown>
): NextResponse {
  const body = {
    success,
    timestamp: new Date().toISOString(),
    ...data,
  };

  return NextResponse.json(body, {
    status: success ? 200 : 500,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

/**
 * Wrapper for cron handlers with authentication
 */
export function cronHandler(
  handler: (request: NextRequest) => Promise<{ success: boolean; data?: Record<string, unknown> }>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Verify authorization
    if (!verifyCronRequest(request)) {
      return NextResponse.json(
        { error: 'Unauthorized', timestamp: new Date().toISOString() },
        { status: 401 }
      );
    }

    try {
      const result = await handler(request);
      return createCronResponse(result.success, result.data);
    } catch (error) {
      console.error('Cron handler error:', error);
      return createCronResponse(false, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}
