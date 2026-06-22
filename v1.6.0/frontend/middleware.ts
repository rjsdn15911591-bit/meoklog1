export { default } from 'next-auth/middleware';

export const config = {
  matcher: [
    '/camera/:path*',
    '/analysis/:path*',
    '/group/:path*',
    '/log/:path*',
    '/ai-coach/:path*',
    '/settings/:path*',
    '/onboarding',
    '/meal/:path*',
    '/compare/:path*',
  ],
};
