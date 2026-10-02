/**
 * Middleware for i18n and Authentication
 * Combines next-intl locale handling with Supabase auth
 */

import createMiddleware from 'next-intl/middleware';
import { updateSession } from '@/shared/lib/supabase/middleware';
import { routing } from '@/shared/lib/i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  // 1. Run i18n middleware first (locale detection, redirects)
  const intlResponse = intlMiddleware(request);
  
  // 2. Run Supabase auth middleware
  const authResponse = await updateSession(request);
  
  // Combine headers (cookies from both)
  const response = NextResponse.next({ request });
  
  // Copy cookies from both responses
  intlResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
  authResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
  
  // Copy headers
  intlResponse.headers.forEach((value, key) => response.headers.set(key, value));
  authResponse.headers.forEach((value, key) => response.headers.set(key, value));
  
  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};