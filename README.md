# Custom Checkout Form for Shopify

This project provides a custom checkout form that can be integrated with your Shopify store. The form is built with Next.js and can be embedded in your Shopify store via an iframe.

## Integration Steps

### 1. Deploy the Next.js App

First, deploy this Next.js application to a hosting service (like Vercel, Netlify, etc.).

```bash
# Build the application
npm run build

# Deploy (depends on your hosting service)
# Example for Vercel:
vercel deploy
```

### 2. Add the Integration Script to Your Shopify Theme

1. Go to your Shopify admin panel
2. Navigate to **Online Store > Themes > Current theme > Actions > Edit code**
3. In the **Assets** folder, create a new file called `custom-checkout.js`
4. Copy the contents from `src/cdn/shopify-integration.js` to this file
5. Replace `REPLACE_WITH_YOUR_CHECKOUT_FORM_URL` with the actual URL where your Next.js app is deployed (e.g., `https://your-checkout-form.vercel.app`)

### 3. Include the Script in Your Theme Layout

1. In your Shopify theme editor, navigate to **Layout > theme.liquid**
2. Add the following code just before the closing `</body>` tag:

```html
{{ 'custom-checkout.js' | asset_url | script_tag }}
```

### 4. Test Your Integration

1. Go to your Shopify store
2. Add an item to your cart
3. Open the cart drawer
4. Click the "Checkout" button
5. Your custom checkout form should appear in an iframe modal

## Customization

You can customize the appearance of the checkout form by modifying the components in the `src/components` directory. The main checkout form component is in `src/components/checkout-form.tsx`.

## Troubleshooting

- If the checkout button doesn't trigger the custom checkout form, make sure the ID `CartDrawer-Checkout` matches the actual ID of your checkout button in the cart drawer.
- Check the browser console for any JavaScript errors.
- Make sure that your Next.js app is properly deployed and accessible from your Shopify store.

## Security Considerations

- Ensure your Next.js app is served over HTTPS
- Consider implementing CORS restrictions to only allow your Shopify store to embed the checkout form
- Implement proper validation and security measures for processing customer data

# Checkout Form

A customizable checkout form integrated with Shopify that provides a seamless user experience.

## Features

- Responsive design that works on all devices
- City autocomplete using Speedy API
- Multiple shipping options (Speedy, Econt, Personal Address)
- Dynamic cart updating
- Product quantity adjustment
- Multilingual support (Bulgarian)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
Create a `.env.local` file in the root directory with the following variables:
```
SPEEDY_USERNAME=your_speedy_username
SPEEDY_PASSWORD=your_speedy_password
```

3. Run the development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## API Routes

### `/api/speedy/search-site`

Searches for cities using the Speedy API.

**Parameters:**
- `term`: Search term for city name
- `postcode` (optional): Filter by postal code
