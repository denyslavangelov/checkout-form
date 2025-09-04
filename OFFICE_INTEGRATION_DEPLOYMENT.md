# 🏢 Office Buy Now Integration - Deployment Guide

## Overview

This integration allows your live site's Buy Now buttons to show an office selection form (City + Office) and automatically create draft orders with office addresses pre-filled for Bulgaria.

## ✅ What's Been Created

1. **Office Selection Form Component** (`src/components/office-selection-form.tsx`)
2. **Draft Order API** (`src/app/api/create-draft-order/route.ts`)
3. **Buy Now Integration Script** (`src/cdn/office-buy-now-integration.js`)
4. **Test Page** (`test-office-integration.html`)

## 🚀 Deployment Steps

### Step 1: Deploy Your Checkout Form

Deploy your checkout form to get the API endpoints:

```bash
# Deploy to Vercel (or your preferred platform)
vercel --prod
```

Your API will be available at: `https://your-checkout-form.vercel.app`

### Step 2: Add Integration Script to Your Live Site

Add this script to your live site's product pages:

```html
<script src="https://your-checkout-form.vercel.app/cdn/office-buy-now-integration.js"></script>
```

### Step 3: Update Buy Now Buttons (Optional)

Add data attributes to your Buy Now buttons for better integration:

```html
<button data-product-id="YOUR_PRODUCT_ID" data-variant-id="YOUR_VARIANT_ID">
    Buy Now
</button>
```

**Note:** The script will automatically detect Buy Now buttons even without data attributes.

## 🔧 Configuration

### Update API Base URL

In `src/cdn/office-buy-now-integration.js`, update the API base URL:

```javascript
const CONFIG = {
  apiBaseUrl: 'https://your-checkout-form.vercel.app', // Update this
  // ... other config
};
```

### Update Shopify Credentials

In `src/app/api/create-draft-order/route.ts`, update your Shopify credentials:

```typescript
const STORE_URL = 'your-store.myshopify.com';
const ACCESS_TOKEN = 'your-access-token';
```

## 🎯 How It Works

1. **User clicks Buy Now button** on your live site
2. **Modal appears** with city and office selection
3. **Cities load** from Speedy API
4. **Offices load** when city is selected
5. **Draft order created** with office address + Bulgaria country
6. **User redirected** to Shopify checkout with pre-filled address

## 📱 User Experience

### Office Selection Modal
- Clean, responsive modal design
- City dropdown (loads from Speedy API)
- Office dropdown (loads when city selected)
- Office preview with address details
- Error handling and loading states

### Checkout Flow
- Draft order created automatically
- Office address pre-filled in checkout
- Country set to Bulgaria
- User can modify address if needed
- Standard Shopify checkout experience

## 🧪 Testing

### Test the Integration

1. Open `test-office-integration.html` in your browser
2. Click any "Buy Now" button
3. Select a city and office
4. Click "Create Order & Checkout"
5. Verify redirect to Shopify checkout with pre-filled address

### Test on Live Site

1. Add the integration script to your live site
2. Visit a product page
3. Click a Buy Now button
4. Verify the office selection modal appears
5. Complete the flow and check the draft order

## 🔍 Troubleshooting

### Common Issues

1. **Modal doesn't appear**
   - Check browser console for errors
   - Verify script is loaded correctly
   - Check API base URL configuration

2. **Cities don't load**
   - Check Speedy API endpoints
   - Verify API credentials
   - Check network requests in browser dev tools

3. **Draft order creation fails**
   - Check Shopify API credentials
   - Verify variant ID is correct
   - Check Shopify API response in network tab

4. **Checkout redirect doesn't work**
   - Verify draft order was created successfully
   - Check if invoice URL is returned
   - Test the invoice URL manually

### Debug Mode

Add this to your browser console to enable debug logging:

```javascript
localStorage.setItem('office-integration-debug', 'true');
```

## 📊 API Endpoints

### Required Endpoints

1. **Speedy API Integration**
   - `POST /api/speedy/search-district` - Get cities
   - `POST /api/speedy/search-office` - Get offices

2. **Draft Order Creation**
   - `POST /api/create-draft-order` - Create draft order with office address

### API Response Format

**Draft Order Creation Response:**
```json
{
  "success": true,
  "draftOrderId": "gid://shopify/DraftOrder/123456789",
  "draftOrderName": "#D123",
  "checkoutUrl": "https://store.myshopify.com/.../invoices/...",
  "totalPrice": "48.95",
  "shippingAddress": {
    "address1": "Office Address",
    "city": "Sofia",
    "country": "Bulgaria"
  }
}
```

## 🎨 Customization

### Styling

The modal uses inline styles for maximum compatibility. To customize:

1. Override CSS classes in your site's stylesheet
2. Modify the `OFFICE_FORM_HTML` in the integration script
3. Use CSS custom properties for theming

### Button Detection

The script automatically detects Buy Now buttons using:
- Data attributes (`data-product-id`, `data-variant-id`)
- CSS classes containing "buy-now"
- Text content containing "buy now"

### Office Selection

Customize the office selection by modifying:
- City loading logic in `loadCities()`
- Office loading logic in `loadOffices()`
- Office display format in `updateOfficePreview()`

## 🔒 Security Considerations

1. **API Credentials**: Keep Shopify access tokens secure
2. **CORS**: Configure CORS for your API endpoints
3. **Rate Limiting**: Implement rate limiting for API calls
4. **Input Validation**: Validate all user inputs

## 📈 Performance

### Optimization Tips

1. **Cache Cities**: Cache city list to reduce API calls
2. **Lazy Load**: Load integration script only on product pages
3. **Debounce**: Debounce office search requests
4. **CDN**: Use CDN for static assets

### Monitoring

Monitor these metrics:
- Modal open rate
- Office selection completion rate
- Draft order creation success rate
- Checkout conversion rate

## 🚀 Go Live Checklist

- [ ] Deploy checkout form with API endpoints
- [ ] Update API base URL in integration script
- [ ] Update Shopify credentials in draft order API
- [ ] Add integration script to live site
- [ ] Test on staging environment
- [ ] Test on live site with real products
- [ ] Monitor error logs and user feedback
- [ ] Set up analytics tracking

## 📞 Support

If you encounter issues:

1. Check browser console for errors
2. Verify API endpoints are working
3. Test with the provided test page
4. Check Shopify API credentials
5. Review the troubleshooting section above

---

**Ready to go live!** 🎉 Your office selection integration is complete and ready for production use.
