/**
 * Middleware for i18n and Authentication
 * Combines next-intl locale handling with Supabase auth
 *
 * Performance note:
 * The matcher below intentionally excludes all Next.js internals, build assets,
 * source maps, static files and the favicon so that neither the next-intl
 * middleware nor the Supabase session-refresh (which performs a network call to
 * the Auth server) runs for asset requests. Previously only `.png` and a couple
 * of `_next` paths were excluded, which meant every image, font, css chunk,
 * hMR request and arbitrary static file triggered a full auth round-trip.
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
  // Match all request paths except:
  //  - api                 (route handlers manage their own auth)
  //  - _next/static        (build assets)
  //  - _next/image         (image optimization)
  //  - _next/data          (client-side navigation payloads)
  //  - any file with an extension (images, fonts, css, js, maps, favicon, etc.)
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};