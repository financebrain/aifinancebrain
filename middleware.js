import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
 
export async function middleware(req) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()
 
  const { pathname } = req.nextUrl
 
  // Public routes — never redirect these
  const publicRoutes = ['/login', '/onboarding']
  const isPublic = publicRoutes.some(r => pathname.startsWith(r))
  const isApi = pathname.startsWith('/api')
 
  // Not logged in and trying to access protected page
  if (!session && !isPublic && !isApi) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
 
  // Logged in but onboarding not done
  if (session && !isPublic && !isApi) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_complete')
      .eq('id', session.user.id)
      .single()
    if (profile && !profile.onboarding_complete
      && pathname !== '/onboarding') {
      return NextResponse.redirect(new URL('/onboarding', req.url))
    }
  }
 
  return res
}
 
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

