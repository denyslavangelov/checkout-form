# Staging Environment Setup Guide

This guide explains how to set up and use the staging environment for your checkout form, allowing you to test changes without affecting your live store.

## Overview

The staging setup provides:
- **Staging Environment**: `https://checkout-form-staging.vercel.app`
- **Production Environment**: `https://checkout-form-zeta.vercel.app` (your current live site)
- **Environment-aware configuration** that automatically uses the correct URLs
- **Staging-specific CDN script** with enhanced debugging

## Quick Start

### 1. Deploy to Staging

```bash
# Deploy to staging environment
npm run deploy:staging

# Or deploy a preview (for testing before going live)
npm run deploy:staging:preview
```

### 2. Test on Your Store

Add this to your Shopify theme for testing:

```html
<script>
window.officeSelectorConfig = {
  baseUrl: 'https://checkout-form-staging.vercel.app', // Override for staging testing
  shopify: {
    storeUrl: 'your-store.myshopify.com',
    accessToken: 'shpat_your_access_token_here'
  },
  availableCouriers: ['speedy', 'econt'],
  defaultCourier: 'speedy',
  defaultDeliveryType: 'office'
};
</script>
<script src="https://checkout-form-zeta.vercel.app/cdn/shopify-integration.js"></script>
```

**For production use**, simply remove the `baseUrl` override:

```html
<script>
window.officeSelectorConfig = {
  shopify: {
    storeUrl: 'your-store.myshopify.com',
    accessToken: 'shpat_your_access_token_here'
  },
  availableCouriers: ['speedy', 'econt'],
  defaultCourier: 'speedy',
  defaultDeliveryType: 'office'
};
</script>
<script src="https://checkout-form-zeta.vercel.app/cdn/shopify-integration.js"></script>
```

### 3. Deploy to Production (when ready)

```bash
# Deploy to production environment
npm run deploy:production
```

## Environment Configuration

### Development
- **URL**: `http://localhost:3000`
- **Environment**: `development`
- **Debug**: Full logging enabled

### Staging
- **URL**: `https://checkout-form-staging.vercel.app`
- **Environment**: `staging`
- **Debug**: Enhanced logging with 🧪 STAGING prefix
- **Visual Indicators**: Orange border on iframe, orange debug dots on buttons

### Production
- **URL**: `https://checkout-form-zeta.vercel.app`
- **Environment**: `production`
- **Debug**: Minimal logging
- **Visual Indicators**: Clean UI without debug elements

## File Structure

```
src/
├── lib/
│   └── config.ts                    # Environment-aware configuration
├── components/
│   └── office-selector-modal.tsx    # Updated to use environment config
├── cdn/
│   ├── shopify-integration.js       # Production CDN script
│   └── shopify-integration-staging.js # Staging CDN script
vercel.staging.json                  # Staging deployment config
vercel.production.json               # Production deployment config
```

## Deployment Commands

### Staging Deployment
```bash
# Build for staging
npm run build:staging

# Deploy to staging (production URL)
npm run deploy:staging

# Deploy staging preview (for testing)
npm run deploy:staging:preview
```

### Production Deployment
```bash
# Build for production
npm run build:production

# Deploy to production
npm run deploy:production

# Deploy production preview
npm run deploy:production:preview
```

## Testing Workflow

### 1. Development Testing
```bash
npm run dev
# Test locally at http://localhost:3000
```

### 2. Staging Testing
```bash
npm run deploy:staging:preview
# Test the preview URL provided by Vercel
```

### 3. Staging Production Testing
```bash
npm run deploy:staging
# Test at https://checkout-form-staging.vercel.app
```

### 4. Production Deployment
```bash
npm run deploy:production
# Deploy to https://checkout-form-zeta.vercel.app
```

## Staging vs Production Differences

| Feature | Staging | Production |
|---------|---------|------------|
| **URL** | `checkout-form-staging.vercel.app` | `checkout-form-zeta.vercel.app` |
| **Debug Logging** | Enhanced with 🧪 STAGING prefix | Minimal |
| **Visual Indicators** | Orange border on iframe, orange debug dots | Clean UI |
| **CDN Script** | `shopify-integration.js` (same file) | `shopify-integration.js` |
| **Environment** | `staging` | `production` |
| **Configuration** | Override `baseUrl` in config | Use default production URL |

## Configuration

### Environment Variables

The system automatically detects the environment and uses the appropriate configuration:

```typescript
// Automatically set based on deployment
NEXT_PUBLIC_APP_ENV=staging|production
NEXT_PUBLIC_API_BASE_URL=https://checkout-form-staging.vercel.app
```

### Manual Configuration Override

The CDN script automatically detects the environment, but you can override it:

```html
<script>
window.officeSelectorConfig = {
  baseUrl: 'https://checkout-form-staging.vercel.app', // Override for staging testing
  shopify: {
    storeUrl: 'your-store.myshopify.com',
    accessToken: 'shpat_your_access_token_here'
  }
};
</script>
<script src="https://checkout-form-zeta.vercel.app/cdn/shopify-integration.js"></script>
```

**For production**, simply remove the `baseUrl` override and the script will use the production URL automatically.

## Troubleshooting

### Staging Not Working
1. Check that staging is deployed: `npm run deploy:staging`
2. Verify the staging URL is accessible
3. Check browser console for 🧪 STAGING logs
4. Ensure you have `baseUrl: 'https://checkout-form-staging.vercel.app'` in your config

### Production Issues
1. Verify production deployment: `npm run deploy:production`
2. Ensure you're NOT overriding the `baseUrl` in your config
3. Clear browser cache
4. Check for any environment-specific configuration

### Environment Detection
The system automatically detects the environment. You can verify this in the browser console:

```javascript
// Should show the current environment
console.log('Current environment:', window.location.hostname.includes('staging') ? 'staging' : 'production');
```

## Best Practices

1. **Always test in staging first** before deploying to production
2. **Use staging for development** and testing new features
3. **Keep production stable** - only deploy tested features
4. **Use preview deployments** for quick testing before going live
5. **Monitor logs** in staging to catch issues early

## Rollback Strategy

If you need to rollback production:

```bash
# Deploy a previous version to production
npm run deploy:production

# Or use Vercel's rollback feature in the dashboard
```

## Security Considerations

- Staging environment should use test Shopify credentials
- Production environment should use live Shopify credentials
- Both environments are served over HTTPS
- CORS is properly configured for both environments

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify the environment configuration
3. Test in staging first to isolate issues
4. Check Vercel deployment logs for build issues

