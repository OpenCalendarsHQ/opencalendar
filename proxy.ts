import { auth } from './auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { corsMiddleware, handleCorsPreflightRequest } from './middleware-cors'

const publicPaths = [
  '/welcome',
  '/auth',
  '/privacy',
  '/terms',
  '/sitemap',
  '/robots',
  '/manifest.json',
  '/sw.js',
  '/browserconfig.xml',
  '/api/auth',
]

function isPublicPath(pathname: string): boolean {
  return publicPaths.some(
    (p) => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p + '?')
  ) || /\.(png|svg|ico|jpg|jpeg|gif|webp)$/.test(pathname)
}

export default auth((req: NextRequest & { auth: unknown }) => {
  const { pathname } = req.nextUrl
  const isApiRoute = pathname.startsWith('/api/') || pathname.startsWith('/auth/api/')
  const session = req.auth as { user?: { id?: string } } | null

  // 1. Handle CORS preflight requests for API routes
  if (req.method === 'OPTIONS' && isApiRoute) {
    return handleCorsPreflightRequest(req)
  }

  // 2. Root redirect
  if (pathname === '/') {
    const url = req.nextUrl.clone()
    url.pathname = session?.user?.id ? '/dashboard' : '/welcome'
    return NextResponse.redirect(url)
  }

  // 3. Redirect authenticated users away from welcome
  if (session?.user?.id && pathname.startsWith('/welcome')) {
    const url = req.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // 4. Protect non-public routes
  if (!isPublicPath(pathname) && !isApiRoute && !session?.user?.id) {
    const signInUrl = new URL('/auth/sign-in', req.url)
    signInUrl.searchParams.set('callbackUrl', req.url)
    return NextResponse.redirect(signInUrl)
  }

  // 5. Add CORS headers to API responses for desktop app
  if (isApiRoute) {
    return corsMiddleware(req, NextResponse.next())
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    '/(api|trpc)(.*)',
  ],
}
