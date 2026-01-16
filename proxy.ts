import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Public routes that don't require auth
  const publicRoutes = ['/login', '/signup'];

  // If accessing public routes and authenticated, redirect to home
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    if (session) {
      return NextResponse.redirect(new URL('/home', req.url));
    }
    return NextResponse.next();
  }

  // Protected routes
  if (pathname.startsWith('/home') || pathname.startsWith('/api/contacts')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    // Allow members and superadmins
    return NextResponse.next();
  }

  // Admin-only routes (assuming /debug and /users are admin)
  if (pathname.startsWith('/debug') || pathname.startsWith('/users')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    if (session.user.role !== 'SuperAdmin') {
      return NextResponse.redirect(new URL('/home', req.url)); // Or to an unauthorized page
    }
    return NextResponse.next();
  }

  // Other routes, allow
  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};

/*
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isAuth = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith('/login') || req.nextUrl.pathname.startsWith('/signup');
  const isApiAuth = req.nextUrl.pathname.startsWith('/api/auth');

  if (!isAuth && !isAuthPage && !isApiAuth) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (isAuth && isAuthPage) {
    return NextResponse.redirect(new URL('/contacts', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
*/