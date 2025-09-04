#!/usr/bin/env node

// Check what fields are available on the draft order and try to create an invoice
// Usage: node check-draft-order-fields.js

const STORE_URL = 'testing-client-check.myshopify.com';
const ACCESS_TOKEN = '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';
const DRAFT_ORDER_ID = 'gid://shopify/DraftOrder/1222407716995';

// GraphQL query to get draft order details with available fields
const GET_DRAFT_ORDER_QUERY = `
  query getDraftOrder($id: ID!) {
    draftOrder(id: $id) {
      id
      name
      status
      totalPrice
      subtotalPrice
      totalTax
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

// GraphQL mutation to send an invoice for the draft order
const SEND_INVOICE_MUTATION = `
  mutation draftOrderInvoiceSend($id: ID!, $email: EmailInput) {
    draftOrderInvoiceSend(id: $id, email: $email) {
      draftOrder {
        id
        name
        status
      }
      userErrors {
        field
        message
      }
    }
  }
`;

async function checkDraftOrderFields() {
  console.log('🔍 Checking Draft Order Fields and Creating Invoice');
  console.log('==================================================\n');
  
  console.log('📦 Store:', STORE_URL);
  console.log('📦 Draft Order ID:', DRAFT_ORDER_ID);

  try {
    // First, get the draft order details
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
      
      console.log('\n📦 Line Items:');
      if (draftOrder.lineItems.edges.length > 0) {
        draftOrder.lineItems.edges.forEach((edge, index) => {
          const item = edge.node;
          console.log(`   ${index + 1}. ${item.title}`);
          console.log(`      Quantity: ${item.quantity}`);
          console.log(`      Price: ${item.originalUnitPrice}`);
        });
      }
      
      console.log('\n🏷️  Tags:', draftOrder.tags.join(', '));
      console.log('📅 Created:', draftOrder.createdAt);
      console.log('📅 Updated:', draftOrder.updatedAt);
      
      // Now try to send an invoice
      console.log('\n📧 Attempting to send invoice...');
      
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
              subject: "Your Order Invoice",
              customMessage: "Thank you for your order! Please complete your payment using the link below."
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
        console.log('\n✅ SUCCESS: Invoice sent successfully!');
        console.log('📧 The customer should receive an email with a payment link');
        console.log('🔗 The email will contain a secure checkout URL for payment');
      } else {
        console.log('\n❓ Unexpected invoice response format');
        console.log('Full response:', JSON.stringify(invoiceData, null, 2));
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
  await checkDraftOrderFields();
  
  console.log('\n🏁 Check completed!');
  console.log('\n📝 Note: Draft orders in Shopify typically work like this:');
  console.log('   1. Create a draft order (✅ Done)');
  console.log('   2. Send an invoice to the customer (📧 Attempted above)');
  console.log('   3. Customer receives email with secure checkout URL');
  console.log('   4. Customer completes payment through the checkout URL');
  console.log('   5. Draft order becomes a completed order');
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.log('❌ This script requires Node.js 18+ or a fetch polyfill.');
  console.log('   Install node-fetch: npm install node-fetch');
  process.exit(1);
}

// Run the main function
main().catch(console.error);
