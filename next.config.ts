import type { NextConfig } from "next";

// Baseline security headers applied to every response. These are the
// "free win" defences — no app changes required, no risk of breaking
// functionality. Content-Security-Policy is deliberately omitted:
// CSP needs careful per-source allowlisting (Google OAuth, Supabase
// Storage, Vercel Insights, inline scripts/styles Next.js generates)
// and is best added once we have time to test it doesn't break flows.
const securityHeaders = [
  // Prevent the site from being framed by other origins (clickjacking
  // defence). The app has no embedding use-case.
  { key: "X-Frame-Options", value: "DENY" },

  // Stop browsers from MIME-sniffing — required for some XSS defences
  // and to make Content-Type headers authoritative.
  { key: "X-Content-Type-Options", value: "nosniff" },

  // Send the full Referer to same-origin requests, but only the origin
  // when navigating cross-site. Balances analytics with privacy.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

  // Lock down powerful browser APIs the app doesn't use. Loosen as
  // genuine features need them. `microphone=(self)` is kept because
  // the worker PWA uses SpeechRecognition for voice-to-text notes.
  {
    key: "Permissions-Policy",
    value: [
      "camera=()",
      "microphone=(self)",
      "geolocation=(self)",
      "interest-cohort=()",
      "payment=()",
      "usb=()",
      "fullscreen=(self)",
    ].join(", "),
  },
];

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Service-agreement uploads are PDFs and can run to several MB.
      // 10 MB matches the cap in lib/uploads.ts.
      bodySizeLimit: "10mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;