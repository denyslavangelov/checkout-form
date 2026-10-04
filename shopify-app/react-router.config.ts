import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
  // Embedded Shopify admin posts from admin.shopify.com / tunnel hosts while
  // the local request URL may be localhost during `shopify app dev`.
  allowedActionOrigins: [
    "admin.shopify.com",
    "*.myshopify.com",
    "**.trycloudflare.com",
    "localhost",
    "127.0.0.1",
  ],
} satisfies Config;
