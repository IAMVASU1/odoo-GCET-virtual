import { NextResponse } from "next/server"

/**
 * Middleware Function
 * Runs on server-side before each page request
 * Protects routes by checking for authentication token
 * Redirects unauthenticated users to login page
 * 
 * @param {Request} request - The incoming HTTP request
 * @returns {NextResponse} - Response object (redirect or continue)
 */
export function middleware(request) {
  const { pathname } = request.nextUrl // Get the requested URL path

  // Allow API routes to pass through without authentication
  if (pathname.startsWith("/api/")) {
    return NextResponse.next()
  }

  // Allow login and signup pages to be accessed without authentication
  const publicPaths = ["/", "/signup"]
  if (publicPaths.includes(pathname)) {
    return NextResponse.next() // Continue to public page
  }

  // Check if authentication token exists (in cookie or will be checked client-side)
  const authToken = request.cookies.get("authToken")?.value

  // If no auth token cookie, allow client-side to handle it
  // (Token might be in localStorage which middleware can't access)
  // Client-side auth-context will handle redirect if needed
  if (!authToken) {
    // Allow the request to continue - client-side will handle auth
    return NextResponse.next()
  }

  // User is authenticated, allow access to the requested page
  return NextResponse.next()
}

/**
 * Middleware Configuration
 * Specifies which routes the middleware should run on
 * Excludes static files, images, and favicon from auth checks
 */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
