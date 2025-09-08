# Post-Purchase Popup Setup Guide

This guide explains how to implement a post-purchase popup that shows additional product offers after customers complete their orders.

## Overview

The post-purchase popup system consists of:
1. **Custom Thank You Page** - A dedicated page with popup functionality
2. **JavaScript Injection Script** - Can be injected into Shopify's thank you page
3. **API Endpoints** - For handling cart operations

## Implementation Options

### Option 1: Custom Thank You Page (Recommended)

Use the custom thank you page at `/post-purchase` which includes:
- Beautiful thank you message
- Post-purchase popup with product offers
- Mobile-responsive design
- Bulgarian language support

**Usage:**
```javascript
// Redirect to custom thank you page after order completion
window.location.href = 'https://checkout-form-zeta.vercel.app/post-purchase?order_id=123&order_number=1001';
```

### Option 2: JavaScript Injection into Shopify Thank You Page

Inject the popup script into your Shopify theme's thank you page.

**Step 1: Add Script to Shopify Theme**

Add this script to your `checkout.liquid` file or thank you page template:

```html
<script src="https://checkout-form-zeta.vercel.app/cdn/post-purchase-popup"></script>
```

**Step 2: Configure Products**

Edit the script configuration in `/src/app/cdn/post-purchase-popup/route.ts`:

```javascript
const CONFIG = {
  baseUrl: 'https://checkout-form-zeta.vercel.app',
  showDelay: 3000, // Show popup after 3 seconds
  autoClose: 30000, // Auto close after 30 seconds
  
  products: [
    {
      id: 'upsell-1',
      title: 'Допълнителна гаранция',
      price: 2999, // in cents
      description: 'Разширена гаранция за вашия продукт',
      discount: 20
    },
    // Add more products...
  ]
};
```

## Features

### Post-Purchase Popup Features:
- ✅ **Automatic Detection** - Detects thank you pages automatically
- ✅ **Product Showcase** - Displays up to 3 additional products
- ✅ **Discount Display** - Shows original price and discounted price
- ✅ **Mobile Responsive** - Works on all device sizes
- ✅ **Auto-close** - Automatically closes after 30 seconds
- ✅ **Easy Dismissal** - Users can close with X button or "No thanks"
- ✅ **Cart Integration** - Adds products to cart when clicked

### Customization Options:
- **Products** - Configure which products to show
- **Pricing** - Set prices and discounts
- **Timing** - Control when popup appears and auto-closes
- **Styling** - Customize colors and layout
- **Language** - Currently in Bulgarian, easily translatable

## Integration with Office Selector

The post-purchase popup works seamlessly with the office selector flow:

1. **User selects office/address** in office selector
2. **Draft order created** with shipping details
3. **User redirected** to Shopify checkout
4. **Order completed** on Shopify
5. **Thank you page** shows with post-purchase popup
6. **Additional products** offered to increase order value

## API Endpoints

### Add to Cart API
```
POST /api/add-to-cart
```

**Request Body:**
```json
{
  "productId": "upsell-1",
  "quantity": 1,
  "discount": 20
}
```

**Response:**
```json
{
  "success": true,
  "cartUrl": "/cart?added=upsell-1&quantity=1",
  "message": "Product added to cart successfully"
}
```

## Configuration

### Environment Variables
No additional environment variables needed - the system uses the existing Shopify integration.

### Shopify Setup
1. Ensure your Shopify store has the necessary products for upselling
2. Configure shipping methods for the additional products
3. Set up proper cart handling for the upsell products

## Testing

### Test the Custom Thank You Page:
```
https://checkout-form-zeta.vercel.app/post-purchase?order_id=123&order_number=1001
```

### Test the JavaScript Injection:
1. Add the script to a test page
2. Simulate a thank you page environment
3. Verify popup appears after 3 seconds

## Best Practices

### Product Selection:
- Choose complementary products
- Keep prices reasonable (10-30% of original order)
- Offer genuine value to customers
- Limit to 2-3 products maximum

### Timing:
- Show popup after 2-3 seconds (not immediately)
- Auto-close after 20-30 seconds
- Don't be too aggressive with popups

### User Experience:
- Make it easy to dismiss
- Provide clear value proposition
- Use attractive product images
- Show savings/discounts clearly

## Troubleshooting

### Popup Not Showing:
1. Check if you're on a thank you page
2. Verify script is loaded correctly
3. Check browser console for errors
4. Ensure proper Shopify order completion

### Products Not Adding to Cart:
1. Verify API endpoint is working
2. Check product IDs are correct
3. Ensure Shopify cart integration is set up
4. Test with different browsers

### Styling Issues:
1. Check for CSS conflicts
2. Verify responsive design
3. Test on different screen sizes
4. Ensure proper z-index values

## Support

For issues or questions:
1. Check the browser console for errors
2. Verify all URLs are accessible
3. Test with different order scenarios
4. Contact support with specific error messages

## Future Enhancements

Potential improvements:
- A/B testing for different product offers
- Dynamic product recommendations based on order
- Integration with email marketing
- Analytics and conversion tracking
- Multi-language support
- Advanced discount rules
