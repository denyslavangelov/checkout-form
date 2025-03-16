# Setting Up Shopify Storefront API

This document explains how to create a Storefront API access token for your Shopify store, which is required for the checkout integration.

## Prerequisites

1. You must have a Shopify store
2. You need admin access to your Shopify store

## Steps to Create a Storefront API Access Token

1. **Log in to your Shopify admin panel**
   - Go to `https://your-store.myshopify.com/admin`

2. **Navigate to Apps**
   - In the left sidebar, click on "Apps"

3. **Access the Storefront API section**
   - Scroll down to the bottom of the Apps page
   - Click on "Develop apps for your store" or "App development"
   - If you don't see this option, you may need to click on "Settings" and then "Apps and sales channels" first

4. **Create a Custom App**
   - Click on "Create an app"
   - Enter a name for your app (e.g., "Checkout Integration")
   - Click "Create app"

5. **Configure API Scopes**
   - In your new app, click on "Configuration"
   - Go to the "Storefront API" or "API permissions" section
   - Check the following permissions:
     - `unauthenticated_read_product_listings`
     - `unauthenticated_write_checkouts`
     - `unauthenticated_write_customers`
     - `unauthenticated_read_customer_tags`
   - Save your changes

6. **Get the Storefront Access Token**
   - After configuring the scopes, go to the "API credentials" tab
   - Look for the "Storefront API access token" section
   - Click "Install app" or "Generate token" if prompted
   - Copy the generated Storefront access token

7. **Add the Token to Your Environment Variables**
   - Create a `.env.local` file in your project root if it doesn't exist already
   - Add the following line:
     ```
     SHOPIFY_STOREFRONT_ACCESS_TOKEN=your_storefront_access_token_here
     ```
   - Replace `your_storefront_access_token_here` with the actual token you copied

## Testing the Integration

After setting up the Storefront API access token:

1. Restart your development server
2. Fill out your checkout form
3. Click "Complete Order"
4. You should be redirected to the Shopify checkout page with all your items and customer information pre-filled

## Troubleshooting

If you encounter issues:

1. **Access Token Invalid**: Make sure you're using the Storefront API token, not the Admin API token
2. **API Permission Errors**: Verify that you've enabled all the required scopes listed above
3. **CORS Errors**: Ensure your store accepts requests from your application's domain
4. **Product ID Issues**: Make sure the product/variant IDs in your cart are valid Shopify Global IDs (gid://shopify/Product/...)

## Additional Resources

- [Shopify Storefront API Documentation](https://shopify.dev/docs/api/storefront)
- [Managing Carts with the Storefront API](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart/manage)
- [Checkout with the Storefront API](https://shopify.dev/docs/api/storefront/2023-10/mutations/checkoutCreate) 