export { default } from 'next-auth/middleware'

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/items/:path*',
    '/preorders/:path*',
    '/profile/:path*',
  ],
}
