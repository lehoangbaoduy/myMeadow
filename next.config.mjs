/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    // Next 14's default client Router Cache reuses a dynamic page's data for
    // up to 30s after navigating away from it (Next 15 changed this default
    // to 0). For chore/calendar pages that must reflect an admin's just-made
    // change immediately on the next navigation, that window is exactly the
    // kind of staleness this app can't tolerate — disable it.
    staleTimes: {
      dynamic: 0,
    },
  },
};

export default nextConfig;
