/** @type {import('next').NextConfig} */
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';

const nextConfig = {
  // Barcha /api/* va /auth/* so'rovlari Next.js server orqali backend ga yo'naltiriladi.
  // Bu cookie ni same-origin sifatida uzatadi (cross-site muammo hal bo'ladi).
  // app/api/** da mavjud route.ts fayllar rewrites dan ustun turadi.
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
      {
        source: '/auth/:path*',
        destination: `${BACKEND_URL}/auth/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${BACKEND_URL}/uploads/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
