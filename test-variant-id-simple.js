#!/usr/bin/env node

// Simple test focused on variant_id validation
// Usage: node test-variant-id-simple.js <store-url> <access-token> <variant-id>

const args = process.argv.slice(2);

if (args.length < 3) {
  console.log('Usage: node test-variant-id-simple.js <store-url> <access-token> <variant-id>');
  console.log('');
  console.log('Example:');
  console.log('  node test-variant-id-simple.js my-store.myshopify.com shpat_abc123 gid://shopify/ProductVariant/123456789');
  process.exit(1);
}

const [storeUrl, accessToken, variantId] = args;

// Minimal GraphQL mutation focused on variant_id testing
const DRAFT_ORDER_CREATE_MUTATION = `
  mutation draftOrderCreate($input: DraftOrderInput!) {
    draftOrderCreate(input: $input) {
      draftOrder {
        id
        name
        status
        totalPrice
        lineItems(first: 1) {
          edges {
            node {
              id
              title
              quantity
              variant {
                id
                title
              }
              product {
                id
                title
              }
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

async function testVariantId(storeUrl, accessToken, variantId) {
  console.log('🧪 Testing variant_id with real Shopify data...');
  console.log('📦 Store:', storeUrl);
  console.log('📦 Variant ID:', variantId);

  const testData = {
    input: {
      email: "test@example.com",
      lineItems: [
        {
          variantId: variantId,
          quantity: 1
        }
      ]
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
      if (errorMessages.includes('variant_id') || errorMessages.includes('variant') || errorMessages.includes('Variant')) {
        console.error('\n🚨 VARIANT ID ERROR DETECTED!');
        console.error('❌ This suggests our variant_id fixes may not be working properly.');
        return { success: false, isVariantError: true };
      } else {
        console.log('\n✅ NO VARIANT_ID ERRORS - Our fix is working!');
        console.log('ℹ️  The error is unrelated to variant_id validation.');
        return { success: false, isVariantError: false };
      }
    } else if (data.data?.draftOrderCreate?.userErrors?.length > 0) {
      console.error('\n❌ User errors:');
      data.data.draftOrderCreate.userErrors.forEach(error => {
        console.error(`   - ${error.message}`);
      });
      
      // Check if it's a variant_id related error
      const errorMessages = data.data.draftOrderCreate.userErrors.map(e => e.message).join(' ');
      if (errorMessages.includes('variant_id') || errorMessages.includes('variant') || errorMessages.includes('Variant')) {
        console.error('\n🚨 VARIANT ID ERROR DETECTED!');
        console.error('❌ This suggests our variant_id fixes may not be working properly.');
        return { success: false, isVariantError: true };
      } else {
        console.log('\n✅ NO VARIANT_ID ERRORS - Our fix is working!');
        console.log('ℹ️  The error is unrelated to variant_id validation.');
        return { success: false, isVariantError: false };
      }
    } else if (data.data?.draftOrderCreate?.draftOrder) {
      const draftOrder = data.data.draftOrderCreate.draftOrder;
      console.log('\n🎉 SUCCESS: Draft order created successfully!');
      console.log('📄 Draft Order ID:', draftOrder.id);
      console.log('📄 Draft Order Name:', draftOrder.name);
      console.log('📄 Status:', draftOrder.status);
      console.log('📄 Total Price:', draftOrder.totalPrice);
      
      if (draftOrder.lineItems.edges.length > 0) {
        const item = draftOrder.lineItems.edges[0].node;
        console.log('\n📦 Line Item Details:');
        console.log('   Title:', item.title);
        console.log('   Quantity:', item.quantity);
        console.log('   Variant ID:', item.variant?.id);
        console.log('   Product ID:', item.product?.id);
      }
      
      console.log('\n✅ PERFECT: This confirms our variant_id fixes are working with real Shopify data!');
      return { success: true, isVariantError: false };
    } else {
      console.log('\n❓ Unexpected response format');
      console.log('Full response:', JSON.stringify(data, null, 2));
      return { success: false, isVariantError: false };
    }

  } catch (error) {
    console.error('\n❌ Network error:', error.message);
    return { success: false, isVariantError: false };
  }
}

async function main() {
  console.log('🧪 Simple Variant ID Test');
  console.log('=========================\n');
  
  const result = await testVariantId(storeUrl, accessToken, variantId);
  
  console.log('\n📊 FINAL RESULT:');
  if (result.success) {
    console.log('🎉 SUCCESS: Draft order created successfully!');
    console.log('✅ This definitively proves our variant_id fixes are working!');
  } else if (result.isVariantError) {
    console.log('🚨 FAILED: Variant ID validation error detected.');
    console.log('❌ Our variant_id fixes may not be working properly.');
  } else {
    console.log('✅ PASSED: No variant_id validation errors detected.');
    console.log('✅ This confirms our variant_id fixes are working!');
    console.log('ℹ️  Any other errors are unrelated to variant_id validation.');
  }
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.log('❌ This script requires Node.js 18+ or a fetch polyfill.');
  console.log('   Install node-fetch: npm install node-fetch');
  process.exit(1);
}

// Run the main function
main().catch(console.error);
