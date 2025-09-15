# Quick Start Guide - Staging Environment

## 🚀 Deploy to Staging

```bash
# Deploy to staging environment
npm run deploy staging

# Deploy staging preview (for testing)
npm run deploy staging preview
```

## 🧪 Test on Your Store

Add this to your Shopify theme for testing:

```html
<script>
window.officeSelectorConfig = {
  baseUrl: 'https://checkout-form-staging.vercel.app', // Override for staging
  shopify: {
    storeUrl: 'your-store.myshopify.com',
    accessToken: 'shpat_your_access_token_here'
  }
};
</script>
<script src="https://checkout-form-zeta.vercel.app/cdn/shopify-integration.js"></script>
```

## 🎯 Deploy to Production (when ready)

```bash
# Deploy to production
npm run deploy production
```

## 🔧 Switch Local Environment

```bash
# Switch to development
npm run env:dev

# Switch to staging
npm run env:staging

# Switch to production
npm run env:production
```

## 📋 Environment URLs

| Environment | URL | CDN Script | Configuration |
|-------------|-----|------------|---------------|
| **Development** | `http://localhost:3000` | N/A | N/A |
| **Staging** | `https://checkout-form-staging.vercel.app` | `shopify-integration.js` | Override `baseUrl` |
| **Production** | `https://checkout-form-zeta.vercel.app` | `shopify-integration.js` | Default config |

## 🎨 Visual Indicators

- **Staging**: Orange border on iframe, orange debug dots on buttons
- **Production**: Clean UI without debug elements

## 🐛 Debugging

- **Staging**: Enhanced logging with 🧪 STAGING prefix
- **Production**: Minimal logging
- **Development**: Full logging

## 📚 Full Documentation

See [STAGING_SETUP.md](./STAGING_SETUP.md) for complete documentation.

