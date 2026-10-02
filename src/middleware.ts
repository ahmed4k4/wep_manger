/**
 * Middleware for i18n and Authentication
 * Combines next-intl locale handling with Supabase auth
 */

import createMiddleware from 'next-intl/middleware';
import { updateSession } from '@/shared/lib/supabase/middleware';
import { routing } from '@/shared/lib/i18n/routing';
import { NextRequest } from 'next/server';

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  // Preserve next-intl redirects and rewrites. Replacing this response with
  // NextResponse.next() loses the redirect and can send /en back to itself.
  const intlResponse = intlMiddleware(request);

  // Locale redirects need no Supabase network request or session refresh.
  if (intlResponse.status >= 300 && intlResponse.status < 400) return intlResponse;

  return updateSession(request, intlResponse);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};
