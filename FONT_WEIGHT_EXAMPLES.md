# Font Weight Examples

The office selector now supports both font family and font weight configuration. Here are examples of how to use it:

## Basic Usage

```javascript
window.officeSelectorConfig = {
  font: {
    family: 'Roboto',
    weight: '500'
  }
  // ... other config
}
```

## Font Weight Options

### Numeric Weights
```javascript
font: { weight: 100 }  // Thin
font: { weight: 200 }  // Extra Light
font: { weight: 300 }  // Light
font: { weight: 400 }  // Normal/Regular (default)
font: { weight: 500 }  // Medium
font: { weight: 600 }  // Semi Bold
font: { weight: 700 }  // Bold
font: { weight: 800 }  // Extra Bold
font: { weight: 900 }  // Black
```

### String Weights
```javascript
font: { weight: 'thin' }        // → 100
font: { weight: 'extralight' }  // → 200
font: { weight: 'light' }       // → 300
font: { weight: 'normal' }      // → 400
font: { weight: 'regular' }     // → 400
font: { weight: 'medium' }      // → 500
font: { weight: 'semibold' }    // → 600
font: { weight: 'bold' }        // → 700
font: { weight: 'extrabold' }   // → 800
font: { weight: 'black' }       // → 900
```

## Complete Examples

### Google Font with Custom Weight
```javascript
window.officeSelectorConfig = {
  availableCouriers: ['speedy', 'econt'],
  defaultCourier: 'speedy',
  defaultDeliveryType: 'office',
  showPrices: true,
  font: {
    family: 'Inter',
    weight: '600'
  },
  continueButton: {
    text: 'Завърши поръчката',
    backgroundColor: 'bg-blue-600',
    hoverColor: 'hover:bg-blue-700'
  },
  shopify: {
    storeUrl: 'your-store.myshopify.com',
    accessToken: 'your-access-token'
  }
};
```

### System Font with Bold Weight
```javascript
window.officeSelectorConfig = {
  font: {
    family: 'Arial, sans-serif',
    weight: 'bold'
  }
  // ... other config
}
```

### Multiple Weights for Google Fonts
The system automatically loads the specified weight from Google Fonts. If you need multiple weights, you can specify them as an array in the font loader, but for the office selector, you typically want one consistent weight.

### URL Parameter Example
```
?config={"font":{"family":"Roboto","weight":"500"}}
```

## Fallback Behavior

- **No weight specified**: Defaults to `400` (normal)
- **Invalid weight**: Falls back to `400`
- **Google Font not available**: Uses system font with specified weight
- **System font**: Applies weight using CSS font-weight property

## Browser Support

- **Google Fonts**: Automatically loads the specified weight
- **System Fonts**: Uses CSS font-weight (supported in all browsers)
- **Fallback**: Always provides a readable font weight

## Debug Information

Check the browser console for font loading messages:
```
🔄 Loading Google Font: Roboto (weights: 500)
✅ Google Font loaded: Roboto with weights 500
```

Or for system fonts:
```
📝 Using system font: Arial, sans-serif (weight: bold)
```
