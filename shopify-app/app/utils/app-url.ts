/**
 * Resolve the public app URL for Shopify OAuth / App Bridge.
 * Prefer explicit SHOPIFY_APP_URL; fall back to Vercel production URL.
 */
export function getAppUrl(): string {
  const candidates = [
    process.env.SHOPIFY_APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ];

  for (const raw of candidates) {
    if (!raw) continue;
    const cleaned = raw.trim().replace(/\/$/, "");
    if (!cleaned || cleaned === "[SENSITIVE]") continue;
    try {
      // Validate
      // eslint-disable-next-line no-new
      new URL(cleaned.includes("://") ? cleaned : `https://${cleaned}`);
      return cleaned.includes("://") ? cleaned : `https://${cleaned}`;
    } catch {
      // try next candidate
    }
  }

  return "http://localhost:3000";
}
