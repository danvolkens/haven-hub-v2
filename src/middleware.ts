import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Routes that don't require authentication
const publicRoutes = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/auth/callback',
  '/auth/confirm',
  '/quiz',
  '/landing',
  '/links',
  '/photos/submit',
];

// API routes that don't require authentication
const publicApiRoutes = [
  '/api/webhooks',
  '/api/cron',
  '/api/quiz',
  '/api/public',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if route is public
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  const isPublicApiRoute = publicApiRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Allow public routes and API webhooks
  if (isPublicRoute || isPublicApiRoute) {
    return NextResponse.next();
  }

  // Update session and check authentication
  const { response, session } = await updateSession(request);

  // Redirect to login if no session on protected routes
  if (!session && pathname.startsWith('/dashboard')) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect to dashboard if authenticated user visits auth pages
  if (session && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
