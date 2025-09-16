# Office Selector Configuration Examples

## Production Environment Configuration

```html
<script>
    window.officeSelectorConfig = {
      environment: 'production', // or omit this line (production is default)
      availableCouriers: ['speedy', 'econt'],
      defaultCourier: 'speedy',
      defaultDeliveryType: 'office',
      showPrices: true,
      font: {
        family: 'Geologica'
      },
      continueButton: {
        text: 'Завърши поръчката',
        backgroundColor: 'bg-blue-600',
        hoverColor: 'hover:bg-blue-700'
      },
      shopify: {
        storeUrl: 'your-production-store.myshopify.com',
        accessToken: 'shpat_your_production_token'
      },
      buttonTargets: {
        targetByClass: ['shopify-payment-button__button'],
        targetByName: ['checkout'],
        debugMode: false
      }
    };
</script>
```

## Staging Environment Configuration

```html
<script>
    window.officeSelectorConfig = {
      environment: 'staging', // This will use staging.vercel.app
      availableCouriers: ['speedy', 'econt'],
      defaultCourier: 'speedy',
      defaultDeliveryType: 'office',
      showPrices: true,
      font: {
        family: 'Geologica'
      },
      continueButton: {
        text: 'Завърши поръчката',
        backgroundColor: 'bg-blue-600',
        hoverColor: 'hover:bg-blue-700'
      },
      shopify: {
        storeUrl: 'testing-client-check.myshopify.com',
        accessToken: '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'
      },
      buttonTargets: {
        targetByClass: ['shopify-payment-button__button'],
        targetByName: ['checkout'],
        debugMode: true
      }
    };
</script>
```

## Custom Base URL Configuration

If you need to use a completely custom URL:

```html
<script>
    window.officeSelectorConfig = {
      baseUrl: 'https://your-custom-domain.com', // This overrides environment setting
      availableCouriers: ['speedy', 'econt'],
      defaultCourier: 'speedy',
      defaultDeliveryType: 'office',
      showPrices: true,
      font: {
        family: 'Geologica'
      },
      continueButton: {
        text: 'Завърши поръчката',
        backgroundColor: 'bg-blue-600',
        hoverColor: 'hover:bg-blue-700'
      },
      shopify: {
        storeUrl: 'your-store.myshopify.com',
        accessToken: 'shpat_your_token'
      },
      buttonTargets: {
        targetByClass: ['shopify-payment-button__button'],
        targetByName: ['checkout'],
        debugMode: false
      }
    };
</script>
```

## Environment URLs

- **Production**: `https://checkout-form-zeta.vercel.app` (default)
- **Staging**: `https://checkout-form-staging-eight.vercel.app` (when `environment: 'staging'`)

## Priority Order

1. **`baseUrl`** - If specified, this takes highest priority
2. **`environment: 'staging'`** - Uses staging URL
3. **Default** - Uses production URL

## Testing Different Environments

### For Production Testing:
- Use `environment: 'production'` or omit the environment parameter
- Use production Shopify credentials
- Set `debugMode: false`

### For Staging Testing:
- Use `environment: 'staging'`
- Use staging/test Shopify credentials  
- Set `debugMode: true` for additional logging
