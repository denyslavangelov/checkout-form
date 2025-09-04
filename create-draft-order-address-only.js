#!/usr/bin/env node

// Create a draft order with only address fields (address, zipcode, country)
// Usage: node create-draft-order-address-only.js

const STORE_URL = 'testing-client-check.myshopify.com';
const ACCESS_TOKEN = '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';
const VARIANT_ID = '45304463556739'; // Real variant ID from your store

// GraphQL mutation to create draft order with minimal address fields
const CREATE_DRAFT_ORDER_MUTATION = `
  mutation draftOrderCreate($input: DraftOrderInput!) {
    draftOrderCreate(input: $input) {
      draftOrder {
        id
        name
        status
        totalPrice
        subtotalPrice
        totalTax
        invoiceUrl
        lineItems(first: 10) {
          edges {
            node {
              id
              title
              quantity
              originalUnitPrice
            }
          }
        }
        shippingAddress {
          address1
          city
          province
          country
          zip
        }
        tags
        createdAt
      }
      userErrors {
        field
        message
      }
    }
  }
`;

async function createDraftOrderWithAddressFieldsOnly() {
  console.log('📦 Creating Draft Order with Address Fields Only');
  console.log('===============================================\n');
  
  console.log('📦 Store:', STORE_URL);
  console.log('📦 Variant ID:', VARIANT_ID);

  try {
    console.log('\n🚀 Creating draft order with address fields only...');
    
    const response = await fetch(`https://${STORE_URL}/admin/api/2025-01/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': ACCESS_TOKEN,
      },
      body: JSON.stringify({
        query: CREATE_DRAFT_ORDER_MUTATION,
        variables: {
          input: {
            lineItems: [
              {
                variantId: `gid://shopify/ProductVariant/${VARIANT_ID}`,
                quantity: 1
              }
            ],
            shippingAddress: {
              address1: "123 Main Street",
              city: "New York",
              province: "NY",
              country: "United States",
              zip: "10001"
            },
            tags: ["address-fields-only", "test", "minimal-address"]
          }
        }
      })
    });

    const data = await response.json();
    
    console.log('📡 Response status:', response.status);
    
    if (data.errors) {
      console.error('\n❌ GraphQL errors:');
      data.errors.forEach(error => {
        console.error(`   - ${error.message}`);
      });
      return;
    }
    
    if (data.data?.draftOrderCreate?.userErrors?.length > 0) {
      console.error('\n❌ User errors:');
      data.data.draftOrderCreate.userErrors.forEach(error => {
        console.error(`   - ${error.message}`);
      });
      return;
    }
    
    if (data.data?.draftOrderCreate?.draftOrder) {
      const draftOrder = data.data.draftOrderCreate.draftOrder;
      
      console.log('\n🎉 SUCCESS: DRAFT ORDER CREATED WITH ADDRESS FIELDS ONLY!');
      console.log('========================================================');
      console.log('📄 Draft Order ID:', draftOrder.id);
      console.log('📄 Draft Order Name:', draftOrder.name);
      console.log('📄 Status:', draftOrder.status);
      console.log('📄 Total Price:', draftOrder.totalPrice);
      console.log('📄 Subtotal:', draftOrder.subtotalPrice);
      console.log('📄 Tax:', draftOrder.totalTax);
      
      if (draftOrder.invoiceUrl) {
        console.log('\n🔗 Invoice URL:', draftOrder.invoiceUrl);
      }
      
      console.log('\n📦 Line Item Details:');
      if (draftOrder.lineItems.edges.length > 0) {
        draftOrder.lineItems.edges.forEach((edge, index) => {
          const item = edge.node;
          console.log(`   ${index + 1}. ${item.title}`);
          console.log(`      Quantity: ${item.quantity}`);
          console.log(`      Price: ${item.originalUnitPrice}`);
        });
      }
      
      console.log('\n🏠 Shipping Address (Fields Only):');
      if (draftOrder.shippingAddress) {
        const addr = draftOrder.shippingAddress;
        console.log(`   Address: ${addr.address1}`);
        console.log(`   City: ${addr.city}`);
        console.log(`   Province: ${addr.province}`);
        console.log(`   Country: ${addr.country}`);
        console.log(`   ZIP: ${addr.zip}`);
        console.log('   ✅ No name, email, or phone required!');
      }
      
      console.log('\n🏷️  Tags:', draftOrder.tags.join(', '));
      console.log('📅 Created:', draftOrder.createdAt);
      
      console.log('\n✅ PERFECT: Draft order created with address fields only!');
      console.log('✅ Only address, city, province, country, and zip required!');
      console.log('✅ No customer name, email, or phone needed!');
      
    } else {
      console.log('\n❌ Unexpected response format');
      console.log('Full response:', JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.error('\n❌ Network error:', error.message);
  }
}

async function main() {
  await createDraftOrderWithAddressFieldsOnly();
  
  console.log('\n🏁 Draft order creation completed!');
  console.log('\n📝 Benefits of address-fields-only draft orders:');
  console.log('   ✅ Minimal required information');
  console.log('   ✅ Only address, city, province, country, zip');
  console.log('   ✅ No customer personal details required');
  console.log('   ✅ Faster form completion');
  console.log('   ✅ Guest checkout friendly');
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.log('❌ This script requires Node.js 18+ or a fetch polyfill.');
  console.log('   Install node-fetch: npm install node-fetch');
  process.exit(1);
}

// Run the main function
main().catch(console.error);