export { default } from 'next-auth/middleware';

export const config = {
  matcher: [
    '/camera',
    '/log',
    '/analysis',
    '/group/:path*',
    '/compare',
    '/settings',
    '/meal/:path*',
  ],
};
