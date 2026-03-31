import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Since we're using Firebase Client SDK with onAuthStateChanged,
// we'll handle auth redirects on the client side instead of middleware
// This allows Firebase Auth to properly manage the auth state
export function middleware(request: NextRequest) {
  // Handle ActionHub capitalization redirect
  if (request.nextUrl.pathname.includes('/actions/ActionHub')) {
    const correctedPath = request.nextUrl.pathname.replace('/actions/ActionHub', '/actions/new');
    return NextResponse.redirect(new URL(correctedPath, request.url));
  }

  // Let all requests through - Firebase Auth will handle protection on client side
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files) 
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
};