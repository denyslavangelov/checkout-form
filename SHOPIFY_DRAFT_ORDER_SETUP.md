# Shopify Draft Order Creation Test Setup

This guide will help you set up and test draft order creation using the Shopify Admin GraphQL API to verify our `variant_id` fixes.

## Prerequisites

1. **Shopify Store**: You need access to a Shopify store
2. **Admin API Access**: You need to create a private app or use an existing app with Admin API access

## Step 1: Get Shopify Admin API Access Token

### Option A: Create a Private App (Recommended for Testing)

1. Go to your Shopify Admin → **Apps** → **App and sales channel settings**
2. Click **Develop apps** → **Create an app**
3. Give your app a name (e.g., "Draft Order Test")
4. Click **Configure Admin API scopes**
5. Enable the following scopes:
   - `write_draft_orders` - To create draft orders
   - `read_customers` - To read customer information
   - `read_products` - To read product/variant information
6. Click **Save**
7. Click **Install app**
8. Copy the **Admin API access token** (starts with `shpat_`)

### Option B: Use Existing App

If you already have an app with the required permissions, use its access token.

## Step 2: Get Required Information

### Store URL
Your store URL format: `your-store-name.myshopify.com`

### Customer ID (Optional)
You can either:
1. Use an existing customer ID from your store
2. Create a test customer first
3. Leave it empty to use the default test customer

### Product Variant ID
You need a real product variant ID from your store. Format: `gid://shopify/ProductVariant/123456789`

To find a variant ID:
1. Go to your Shopify Admin → **Products**
2. Click on any product
3. In the browser developer tools, look for variant IDs in the page source
4. Or use the GraphQL query: `{ products(first: 1) { edges { node { variants(first: 1) { edges { node { id } } } } } } } }`

## Step 3: Run the Tests

### Option A: Browser Test (Easiest)

1. Open `test-draft-order-simple.html` in your browser
2. Fill in the form:
   - **Store URL**: `your-store.myshopify.com`
   - **Access Token**: `shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - **Customer ID**: `gid://shopify/Customer/123456789` (optional)
   - **Variant ID**: `gid://shopify/ProductVariant/123456789`
3. Click the test buttons to run different scenarios

### Option B: Node.js Test

1. Set environment variables:
   ```bash
   export SHOPIFY_STORE_URL="your-store.myshopify.com"
   export SHOPIFY_ADMIN_ACCESS_TOKEN="shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   ```

2. Run the test:
   ```bash
   node test-draft-order-creation.js
   ```

### Option C: Manual API Test

Use any API client (Postman, curl, etc.) to send a POST request to:
```
https://your-store.myshopify.com/admin/api/2025-01/graphql.json
```

Headers:
```
Content-Type: application/json
X-Shopify-Access-Token: shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Body:
```json
{
  "query": "mutation draftOrderCreate($input: DraftOrderInput!) { draftOrderCreate(input: $input) { draftOrder { id name status totalPrice } userErrors { field message } } }",
  "variables": {
    "input": {
      "email": "test@example.com",
      "lineItems": [
        {
          "variantId": "gid://shopify/ProductVariant/123456789",
          "quantity": 1
        }
      ],
      "note": "Test draft order"
    }
  }
}
```

## Step 4: Interpret Results

### Success Indicators
- ✅ **Draft order created successfully** - Our variant_id fix is working
- ✅ **No variant_id validation errors** - The API accepts our string format

### Error Indicators
- 🚨 **Variant ID validation errors** - Our fix may not be working
- ❌ **Other errors** (customer not found, invalid store, etc.) - Expected for test data

## Expected Results

Based on our fixes, you should see:

1. **String variant_id**: Should work (create draft order successfully)
2. **Numeric variant_id**: Should fail with a different error (not variant_id validation)
3. **Invalid variant_id**: Should fail with a different error (not variant_id validation)

## Troubleshooting

### Common Issues

1. **"Store not found"**: Check your store URL format
2. **"Invalid access token"**: Verify your access token and permissions
3. **"Customer not found"**: Use a valid customer ID or remove the customerId field
4. **"Variant not found"**: Use a valid variant ID from your store

### Permission Issues

Make sure your app has the required scopes:
- `write_draft_orders`
- `read_customers` (if using customer ID)
- `read_products` (if using variant ID)

## What This Tests

This test verifies that:
1. Our `variant_id` string formatting fix works with real Shopify data
2. The Shopify API accepts our properly formatted variant IDs
3. Draft orders can be created successfully with our fixed data format

If the tests pass, it confirms that our checkout form fixes will work in production with real Shopify stores.
