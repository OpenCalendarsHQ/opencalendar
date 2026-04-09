const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: '/auth/sign-in', destination: '/api/auth/signin/ipulse', permanent: false },
      { source: '/sign-in', destination: '/api/auth/signin/ipulse', permanent: false },
    ];
  },
};

module.exports = withNextIntl(nextConfig);
