/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep pdfkit UNBUNDLED: it reads `__dirname + '/data/Helvetica.afm'` at construction, which breaks
  // when webpack rewrites __dirname. As an external package it's required from node_modules at runtime
  // (correct __dirname) and Next traces its data files automatically.
  serverExternalPackages: ["pdfkit"],
  // Bundle the Thai TTFs into the report route's function (read via fs at request time).
  outputFileTracingIncludes: {
    "/api/report/[projectId]": ["./lib/server/fonts/**"],
  },
  // The old stale in-app manual (monthly/Excel flow) is replaced by the public /manual guide website.
  // The in-app chatbot (/chat) is retired — old deep links land on ช่วยเหลือ instead.
  async redirects() {
    return [
      { source: "/help/manual", destination: "/manual", permanent: false },
      { source: "/chat", destination: "/help", permanent: false },
    ];
  },
};

export default nextConfig;
