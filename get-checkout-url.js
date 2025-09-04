#!/usr/bin/env node

// Get the checkout URL for the latest draft order
// Usage: node get-checkout-url.js

const STORE_URL = 'testing-client-check.myshopify.com';
const ACCESS_TOKEN = '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';
const DRAFT_ORDER_ID = 'gid://shopify/DraftOrder/1222407716995';

// GraphQL query to get draft order with invoice URL
const GET_DRAFT_ORDER_QUERY = `
  query getDraftOrder($id: ID!) {
    draftOrder(id: $id) {
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
      tags
      createdAt
      updatedAt
    }
  }
`;

// GraphQL mutation to send invoice and get checkout URL
const SEND_INVOICE_MUTATION = `
  mutation draftOrderInvoiceSend($id: ID!, $email: EmailInput) {
    draftOrderInvoiceSend(id: $id, email: $email) {
      draftOrder {
        id
        name
        status
        invoiceUrl
      }
      userErrors {
        field
        message
      }
    }
  }
`;

async function getCheckoutUrl() {
  console.log('🔗 Getting Checkout URL for Draft Order');
  console.log('======================================\n');
  
  console.log('📦 Store:', STORE_URL);
  console.log('📦 Draft Order ID:', DRAFT_ORDER_ID);

  try {
    // First, try to get the existing invoice URL
    console.log('\n🚀 Checking for existing invoice URL...');
    
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
      
      if (draftOrder.invoiceUrl) {
        console.log('\n✅ FOUND INVOICE URL!');
        console.log('====================');
        console.log('🔗 Invoice URL:', draftOrder.invoiceUrl);
        console.log('\n📝 This URL can be used to:');
        console.log('   - Complete the order payment');
        console.log('   - Test the checkout process');
        console.log('   - Send to customers for payment');
        
        // Try to extract the checkout URL from the invoice URL
        if (draftOrder.invoiceUrl.includes('checkout')) {
          console.log('\n🎯 This appears to be a checkout URL!');
        } else {
          console.log('\nℹ️  This is an invoice URL that will redirect to checkout');
        }
        
      } else {
        console.log('\n❌ No invoice URL found');
        console.log('📧 Sending a new invoice to generate checkout URL...');
        
        // Send a new invoice to generate the checkout URL
        const invoiceResponse = await fetch(`https://${STORE_URL}/admin/api/2025-01/graphql.json`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': ACCESS_TOKEN,
          },
          body: JSON.stringify({
            query: SEND_INVOICE_MUTATION,
            variables: { 
              id: DRAFT_ORDER_ID,
              email: {
                to: "test@example.com",
                subject: "Your Order Invoice - Checkout Link",
                customMessage: "Please complete your payment using the secure checkout link below."
              }
            }
          })
        });

        const invoiceData = await invoiceResponse.json();
        
        console.log('📡 Invoice response status:', invoiceResponse.status);
        
        if (invoiceData.errors) {
          console.error('\n❌ Invoice GraphQL errors:');
          invoiceData.errors.forEach(error => {
            console.error(`   - ${error.message}`);
          });
        } else if (invoiceData.data?.draftOrderInvoiceSend?.userErrors?.length > 0) {
          console.error('\n❌ Invoice user errors:');
          invoiceData.data.draftOrderInvoiceSend.userErrors.forEach(error => {
            console.error(`   - ${error.message}`);
          });
        } else if (invoiceData.data?.draftOrderInvoiceSend?.draftOrder) {
          const updatedDraftOrder = invoiceData.data.draftOrderInvoiceSend.draftOrder;
          
          if (updatedDraftOrder.invoiceUrl) {
            console.log('\n✅ NEW INVOICE URL GENERATED!');
            console.log('============================');
            console.log('🔗 Invoice URL:', updatedDraftOrder.invoiceUrl);
            console.log('\n📝 This URL can be used to complete the order payment');
          } else {
            console.log('\n❓ Invoice sent but no URL returned');
            console.log('Full response:', JSON.stringify(invoiceData, null, 2));
          }
        } else {
          console.log('\n❓ Unexpected invoice response format');
          console.log('Full response:', JSON.stringify(invoiceData, null, 2));
        }
      }
      
    } else {
      console.log('\n❌ Draft order not found');
      console.log('Full response:', JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.error('\n❌ Network error:', error.message);
  }
}

async function main() {
  await getCheckoutUrl();
  
  console.log('\n🏁 Checkout URL retrieval completed!');
  console.log('\n📝 Note: The invoice URL serves as the checkout URL for draft orders.');
  console.log('   When customers click it, they are taken to a secure checkout page');
  console.log('   where they can complete their payment.');
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.log('❌ This script requires Node.js 18+ or a fetch polyfill.');
  console.log('   Install node-fetch: npm install node-fetch');
  process.exit(1);
}

// Run the main function
main().catch(console.error);
