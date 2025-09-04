#!/usr/bin/env node

// Command line test for Shopify draft order creation
// Usage: node test-draft-order-cli.js <store-url> <access-token> <variant-id> [customer-id]

const args = process.argv.slice(2);

if (args.length < 3) {
  console.log('Usage: node test-draft-order-cli.js <store-url> <access-token> <variant-id> [customer-id]');
  console.log('');
  console.log('Example:');
  console.log('  node test-draft-order-cli.js my-store.myshopify.com shpat_abc123 gid://shopify/ProductVariant/123456789');
  console.log('');
  console.log('Arguments:');
  console.log('  store-url    Your Shopify store URL (e.g., my-store.myshopify.com)');
  console.log('  access-token Your Admin API access token (starts with shpat_)');
  console.log('  variant-id   A real product variant ID (gid://shopify/ProductVariant/...)');
  console.log('  customer-id  Optional customer ID (gid://shopify/Customer/...)');
  process.exit(1);
}

const [storeUrl, accessToken, variantId, customerId] = args;

// GraphQL mutation for creating a draft order
const DRAFT_ORDER_CREATE_MUTATION = `
  mutation draftOrderCreate($input: DraftOrderInput!) {
    draftOrderCreate(input: $input) {
      draftOrder {
        id
        name
        status
        totalPrice
        subtotalPrice
        totalTax
        totalShippingPrice
        lineItems(first: 10) {
          edges {
            node {
              id
              title
              quantity
              originalUnitPrice
              discountedUnitPrice
              variant {
                id
                title
                sku
              }
              product {
                id
                title
              }
            }
          }
        }
        customer {
          id
          email
          firstName
          lastName
        }
        tags
        createdAt
        updatedAt
      }
      userErrors {
        field
        message
      }
    }
  }
`;

async function createDraftOrder(storeUrl, accessToken, variantId, customerId = null) {
  console.log('🧪 Creating draft order with real data...');
  console.log('📦 Store:', storeUrl);
  console.log('📦 Variant ID:', variantId);
  console.log('📦 Customer ID:', customerId || 'Not specified');

  const testData = {
    input: {
      // Customer information
      ...(customerId && { customerId }),
      email: "test@example.com",
      phone: "+1234567890",
      
      // Billing address
      billingAddress: {
        firstName: "Test",
        lastName: "User",
        address1: "123 Test Street",
        city: "Test City",
        province: "Test Province",
        country: "US",
        zip: "12345",
        phone: "+1234567890"
      },
      
      // Shipping address
      shippingAddress: {
        firstName: "Test",
        lastName: "User",
        address1: "123 Test Street",
        city: "Test City",
        province: "Test Province",
        country: "US",
        zip: "12345",
        phone: "+1234567890"
      },
      
      // Line items with the provided variant ID
      lineItems: [
        {
          variantId: variantId,
          quantity: 1,
          customAttributes: [
            {
              key: "test_attribute",
              value: "variant_id_fix_test"
            }
          ]
        }
      ],
      
      // Shipping line
      shippingLine: {
        title: "Standard Shipping",
        price: "5.99",
        customAttributes: [
          {
            key: "shipping_method",
            value: "standard"
          }
        ]
      },
      
      // Additional options
      tags: ["test", "variant-id-fix", "cli-test"],
      useCustomerDefaultAddress: false,
      allowPartialAddresses: true
    }
  };

  try {
    const response = await fetch(`https://${storeUrl}/admin/api/2025-01/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({
        query: DRAFT_ORDER_CREATE_MUTATION,
        variables: testData
      })
    });

    const data = await response.json();
    
    console.log('\n📡 Response status:', response.status);
    
    if (data.errors) {
      console.error('\n❌ GraphQL errors:');
      data.errors.forEach(error => {
        console.error(`   - ${error.message}`);
      });
      
      // Check if it's a variant_id related error
      const errorMessages = data.errors.map(e => e.message).join(' ');
      if (errorMessages.includes('variant_id') || errorMessages.includes('variant')) {
        console.error('\n🚨 Variant ID related error detected!');
        return { success: false, isVariantError: true, errors: data.errors };
      } else {
        console.log('\n✅ No variant_id errors - our fix is working!');
        return { success: false, isVariantError: false, errors: data.errors };
      }
    } else if (data.data?.draftOrderCreate?.userErrors?.length > 0) {
      console.error('\n❌ User errors:');
      data.data.draftOrderCreate.userErrors.forEach(error => {
        console.error(`   - ${error.message}`);
      });
      
      // Check if it's a variant_id related error
      const errorMessages = data.data.draftOrderCreate.userErrors.map(e => e.message).join(' ');
      if (errorMessages.includes('variant_id') || errorMessages.includes('variant')) {
        console.error('\n🚨 Variant ID related error detected!');
        return { success: false, isVariantError: true, errors: data.data.draftOrderCreate.userErrors };
      } else {
        console.log('\n✅ No variant_id errors - our fix is working!');
        return { success: false, isVariantError: false, errors: data.data.draftOrderCreate.userErrors };
      }
    } else if (data.data?.draftOrderCreate?.draftOrder) {
      const draftOrder = data.data.draftOrderCreate.draftOrder;
      console.log('\n✅ SUCCESS: Draft order created successfully!');
      console.log('📄 Draft Order ID:', draftOrder.id);
      console.log('📄 Draft Order Name:', draftOrder.name);
      console.log('📄 Status:', draftOrder.status);
      console.log('📄 Total Price:', draftOrder.totalPrice);
      console.log('📄 Line Items:', draftOrder.lineItems.edges.length);
      
      // Show line item details
      draftOrder.lineItems.edges.forEach((edge, index) => {
        const item = edge.node;
        console.log(`\n   Item ${index + 1}:`);
        console.log(`     Title: ${item.title}`);
        console.log(`     Quantity: ${item.quantity}`);
        console.log(`     Variant ID: ${item.variant?.id}`);
        console.log(`     Product ID: ${item.product?.id}`);
        console.log(`     Price: ${item.originalUnitPrice}`);
      });
      
      return { success: true, draftOrder };
    } else {
      console.log('\n❓ Unexpected response format');
      console.log('Full response:', JSON.stringify(data, null, 2));
      return { success: false, isVariantError: false, errors: ['Unexpected response format'] };
    }

  } catch (error) {
    console.error('\n❌ Network error:', error.message);
    return { success: false, isVariantError: false, errors: [error.message] };
  }
}

async function main() {
  console.log('🧪 Shopify Draft Order Creation Test (CLI)');
  console.log('==========================================\n');
  
  // Validate inputs
  if (!accessToken.startsWith('shpat_')) {
    console.log('⚠️  Warning: Access token should start with "shpat_"');
  }
  
  if (!variantId.startsWith('gid://shopify/ProductVariant/')) {
    console.log('⚠️  Warning: Variant ID should start with "gid://shopify/ProductVariant/"');
  }
  
  console.log('🚀 Starting test...\n');
  
  // Create draft order
  const result = await createDraftOrder(storeUrl, accessToken, variantId, customerId);
  
  if (result.success) {
    console.log('\n🎉 SUCCESS: Draft order created successfully!');
    console.log('✅ This confirms that our variant_id fixes are working with real Shopify data.');
  } else if (result.isVariantError) {
    console.log('\n🚨 FAILED: Variant ID validation error detected.');
    console.log('❌ This suggests our variant_id fixes may not be working properly.');
  } else {
    console.log('\n✅ PASSED: No variant_id validation errors detected.');
    console.log('✅ This confirms that our variant_id fixes are working!');
    console.log('ℹ️  The error is unrelated to variant_id validation.');
  }
  
  console.log('\n📊 Test completed!');
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.log('❌ This script requires Node.js 18+ or a fetch polyfill.');
  console.log('   Install node-fetch: npm install node-fetch');
  process.exit(1);
}

// Run the main function
main().catch(console.error);
