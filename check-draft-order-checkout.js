#!/usr/bin/env node

// Check if the draft order has a checkout URL
// Usage: node check-draft-order-checkout.js

const STORE_URL = 'testing-client-check.myshopify.com';
const ACCESS_TOKEN = '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';
const DRAFT_ORDER_ID = 'gid://shopify/DraftOrder/1222407716995';

// GraphQL query to get draft order details including checkout URL
const GET_DRAFT_ORDER_QUERY = `
  query getDraftOrder($id: ID!) {
    draftOrder(id: $id) {
      id
      name
      status
      totalPrice
      subtotalPrice
      totalTax
      checkoutUrl
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
  }
`;

async function checkDraftOrderCheckout() {
  console.log('🔍 Checking Draft Order for Checkout URL');
  console.log('========================================\n');
  
  console.log('📦 Store:', STORE_URL);
  console.log('📦 Draft Order ID:', DRAFT_ORDER_ID);

  try {
    console.log('\n🚀 Fetching draft order details...');
    
    const response = await fetch(`https://${STORE_URL}/admin/api/2025-01/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': ACCESS_TOKEN,
      },
      body: JSON.stringify({
        query: GET_DRAFT_ORDER_QUERY,
        variables: { id: DRAFT_ORDER_ID }
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
    
    if (data.data?.draftOrder) {
      const draftOrder = data.data.draftOrder;
      
      console.log('\n📄 Draft Order Details:');
      console.log('======================');
      console.log('ID:', draftOrder.id);
      console.log('Name:', draftOrder.name);
      console.log('Status:', draftOrder.status);
      console.log('Total Price:', draftOrder.totalPrice);
      console.log('Subtotal:', draftOrder.subtotalPrice);
      console.log('Tax:', draftOrder.totalTax);
      
      console.log('\n🔗 URLs:');
      console.log('========');
      console.log('Checkout URL:', draftOrder.checkoutUrl || '❌ No checkout URL');
      console.log('Invoice URL:', draftOrder.invoiceUrl || '❌ No invoice URL');
      
      if (draftOrder.checkoutUrl) {
        console.log('\n✅ SUCCESS: Draft order has a checkout URL!');
        console.log('🔗 Checkout URL:', draftOrder.checkoutUrl);
        console.log('\n📝 You can use this URL to:');
        console.log('   - Send to customers for payment');
        console.log('   - Test the checkout process');
        console.log('   - Complete the order');
      } else {
        console.log('\n❌ No checkout URL available');
        console.log('ℹ️  This might be because:');
        console.log('   - The draft order needs to be completed first');
        console.log('   - The draft order is in a different status');
        console.log('   - Additional setup is required');
      }
      
      if (draftOrder.invoiceUrl) {
        console.log('\n📧 Invoice URL:', draftOrder.invoiceUrl);
        console.log('   You can send this to customers to pay for the order');
      }
      
      console.log('\n📦 Line Items:');
      if (draftOrder.lineItems.edges.length > 0) {
        draftOrder.lineItems.edges.forEach((edge, index) => {
          const item = edge.node;
          console.log(`   ${index + 1}. ${item.title}`);
          console.log(`      Quantity: ${item.quantity}`);
          console.log(`      Price: ${item.originalUnitPrice}`);
        });
      }
      
      if (draftOrder.customer) {
        console.log('\n👤 Customer:');
        console.log('   Name:', `${draftOrder.customer.firstName} ${draftOrder.customer.lastName}`);
        console.log('   Email:', draftOrder.customer.email);
      }
      
      console.log('\n🏷️  Tags:', draftOrder.tags.join(', '));
      console.log('📅 Created:', draftOrder.createdAt);
      console.log('📅 Updated:', draftOrder.updatedAt);
      
    } else {
      console.log('\n❌ Draft order not found');
      console.log('Full response:', JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.error('\n❌ Network error:', error.message);
  }
}

async function main() {
  await checkDraftOrderCheckout();
  
  console.log('\n🏁 Check completed!');
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.log('❌ This script requires Node.js 18+ or a fetch polyfill.');
  console.log('   Install node-fetch: npm install node-fetch');
  process.exit(1);
}

// Run the main function
main().catch(console.error);
