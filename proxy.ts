import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

export async function proxy(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}

// /styleguide holds no data and is a 404 in production (see app/styleguide/page.tsx).
export const config = {
  matcher: [
    '/((?!api/auth|login|legal|styleguide|robots.txt|_next/static|_next/image|favicon.ico).*)',
  ],
};
