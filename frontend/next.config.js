/** @type {import('next').NextConfig} */
const nextConfig = {
    // Enable React Strict Mode for highlighting potential problems
    reactStrictMode: true,

    // Environment variables available to the browser
    env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
    },

    // Image optimization configuration
    images: {
        domains: ['localhost'],
        unoptimized: true
    },

    // Disable x-powered-by header
    poweredByHeader: false,

    // Trailing slashes configuration
    trailingSlash: false,

    // Experimental features
    experimental: {
        // Enable server actions
        serverActions: {
            bodySizeLimit: '2mb'
        }
    }
};

module.exports = nextConfig;
