# Office Selector Button Targeting Configuration

## Overview
The office selector now supports flexible button targeting configuration, allowing you to control exactly which buttons the office selector gets attached to.

## Configuration Options

### Basic Configuration
```javascript
window.officeSelectorConfig = {
  // Courier configuration
  availableCouriers: ['speedy', 'econt'], // or ['speedy'] or ['econt']
  defaultCourier: 'speedy',
  defaultDeliveryType: 'office',
  
  // Button targeting configuration
  buttonTargets: {
    enableSmartDetection: true,     // Enable/disable smart button detection
    customSelectors: [],            // Custom CSS selectors for buttons
    excludeSelectors: [],           // CSS selectors to exclude
    buttonTypes: ['checkout', 'buy-now', 'cart-checkout'], // Types of buttons to target
    debugMode: false                // Show red dots on targeted buttons
  }
};
```

## Button Types

### Available Button Types:
- `'submit'` - All submit buttons (type="submit")
- `'buy-now'` - Buy Now / Quick Buy buttons
- `'checkout'` - Checkout buttons
- `'cart-checkout'` - Cart checkout buttons

## Examples

### 1. Only Target Specific Button Types
```javascript
window.officeSelectorConfig = {
  availableCouriers: ['speedy'],
  defaultCourier: 'speedy',
  defaultDeliveryType: 'office',
  buttonTargets: {
    enableSmartDetection: true,
    customSelectors: [],
    excludeSelectors: [],
    buttonTypes: ['buy-now'], // Only target Buy Now buttons
    debugMode: true
  }
};
```

### 2. Use Custom CSS Selectors Only
```javascript
window.officeSelectorConfig = {
  availableCouriers: ['speedy', 'econt'],
  defaultCourier: 'speedy',
  defaultDeliveryType: 'office',
  buttonTargets: {
    enableSmartDetection: false, // Disable smart detection
    customSelectors: [
      '.my-checkout-button',
      '#special-buy-button',
      'button[data-checkout="true"]'
    ],
    excludeSelectors: [],
    buttonTypes: [],
    debugMode: true
  }
};
```

### 3. Exclude Specific Buttons
```javascript
window.officeSelectorConfig = {
  availableCouriers: ['speedy'],
  defaultCourier: 'speedy',
  defaultDeliveryType: 'office',
  buttonTargets: {
    enableSmartDetection: true,
    customSelectors: [],
    excludeSelectors: [
      '.add-to-cart',
      '#product-form-submit',
      'button[data-add-to-cart]'
    ],
    buttonTypes: ['checkout', 'buy-now'],
    debugMode: false
  }
};
```

### 4. Mixed Configuration
```javascript
window.officeSelectorConfig = {
  availableCouriers: ['speedy'],
  defaultCourier: 'speedy',
  defaultDeliveryType: 'office',
  buttonTargets: {
    enableSmartDetection: true,
    customSelectors: [
      '.custom-checkout-btn',
      'button[data-office-selector="true"]'
    ],
    excludeSelectors: [
      '.add-to-cart',
      '.wishlist-button'
    ],
    buttonTypes: ['buy-now', 'checkout'],
    debugMode: true
  }
};
```

### 5. Disable All Button Targeting
```javascript
window.officeSelectorConfig = {
  availableCouriers: ['speedy'],
  defaultCourier: 'speedy',
  defaultDeliveryType: 'office',
  buttonTargets: {
    enableSmartDetection: false,
    customSelectors: [],
    excludeSelectors: [],
    buttonTypes: [],
    debugMode: false
  }
};
```

## Smart Detection Patterns

When `enableSmartDetection: true`, the system automatically detects buttons based on:

### Submit Buttons
- All buttons with `type="submit"`

### Buy Now Buttons
- Text: "buy now", "buy it now", "купи сега"
- Classes: "buy-now", "quick-buy", "shopify-payment-button"
- IDs: "buy-now", "quick-buy"
- Shopify payment buttons

### Checkout Buttons
- Text: "checkout", "proceed to checkout", "завърши поръчката"
- Classes: "checkout", "cart-checkout", "proceed"
- IDs: "checkout", "cart-checkout", "proceed"
- Cart checkout buttons

### Excluded Patterns
- Add to cart buttons
- Wishlist buttons
- Close/remove buttons
- Social media buttons

## Debug Mode

When `debugMode: true`, red dots will appear on all targeted buttons, making it easy to see which buttons the office selector is attached to.

## Implementation

Add the configuration before loading the script:

```html
<script>
  window.officeSelectorConfig = {
    // Your configuration here
  };
</script>
<script src="https://checkout-form-zeta.vercel.app/cdn/shopify-integration.js"></script>
```

## Default Configuration

If no configuration is provided, the system uses these defaults:

```javascript
{
  availableCouriers: ['speedy', 'econt'],
  defaultCourier: 'speedy',
  defaultDeliveryType: 'office',
  buttonTargets: {
    enableSmartDetection: true,
    customSelectors: [],
    excludeSelectors: [],
    buttonTypes: ['checkout', 'buy-now', 'cart-checkout'],
    debugMode: false
  }
}
```
