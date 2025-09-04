#!/usr/bin/env node

// Create a draft order with completely empty address fields
// Usage: node create-draft-order-empty-address.js

const STORE_URL = 'testing-client-check.myshopify.com';
const ACCESS_TOKEN = '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';
const VARIANT_ID = '45304463556739'; // Real variant ID from your store

// GraphQL mutation to create draft order with no address fields
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
          firstName
          lastName
          company
          address1
          address2
          city
          province
          country
          zip
          phone
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

async function createDraftOrderWithEmptyAddress() {
  console.log('📦 Creating Draft Order with Empty Address Fields');
  console.log('================================================\n');
  
  console.log('📦 Store:', STORE_URL);
  console.log('📦 Variant ID:', VARIANT_ID);

  try {
    console.log('\n🚀 Creating draft order with empty address fields...');
    
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
            // No shippingAddress field at all - completely empty
            tags: ["empty-address", "test", "no-address-fields"]
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
      
      console.log('\n🎉 SUCCESS: DRAFT ORDER CREATED WITH EMPTY ADDRESS FIELDS!');
      console.log('==========================================================');
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
      
      console.log('\n🏠 Shipping Address (Empty):');
      if (draftOrder.shippingAddress) {
        const addr = draftOrder.shippingAddress;
        console.log(`   First Name: ${addr.firstName || '❌ Empty'}`);
        console.log(`   Last Name: ${addr.lastName || '❌ Empty'}`);
        console.log(`   Company: ${addr.company || '❌ Empty'}`);
        console.log(`   Address: ${addr.address1 || '❌ Empty'}`);
        console.log(`   Address 2: ${addr.address2 || '❌ Empty'}`);
        console.log(`   City: ${addr.city || '❌ Empty'}`);
        console.log(`   Province: ${addr.province || '❌ Empty'}`);
        console.log(`   Country: ${addr.country || '❌ Empty'}`);
        console.log(`   ZIP: ${addr.zip || '❌ Empty'}`);
        console.log(`   Phone: ${addr.phone || '❌ Empty'}`);
      } else {
        console.log('   ❌ No shipping address object at all');
      }
      
      console.log('\n🏷️  Tags:', draftOrder.tags.join(', '));
      console.log('📅 Created:', draftOrder.createdAt);
      
      console.log('\n✅ PERFECT: Draft order created with completely empty address fields!');
      console.log('✅ No address information required at all!');
      console.log('✅ Customer can fill address during checkout!');
      
    } else {
      console.log('\n❌ Unexpected response format');
      console.log('Full response:', JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.error('\n❌ Network error:', error.message);
  }
}

async function main() {
  await createDraftOrderWithEmptyAddress();
  
  console.log('\n🏁 Draft order creation completed!');
  console.log('\n📝 Benefits of empty address draft orders:');
  console.log('   ✅ No address information required upfront');
  console.log('   ✅ Customer fills address during checkout');
  console.log('   ✅ Maximum flexibility for address collection');
  console.log('   ✅ Can collect address at payment time');
  console.log('   ✅ Perfect for cart-to-checkout flows');
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.log('❌ This script requires Node.js 18+ or a fetch polyfill.');
  console.log('   Install node-fetch: npm install node-fetch');
  process.exit(1);
}

// Run the main function
main().catch(console.error);
