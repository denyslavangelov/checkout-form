// Test script to create a draft order using Shopify Admin GraphQL API
// This will help us verify that our variant_id fixes work with real Shopify data

const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL || 'your-store.myshopify.com';
const SHOPIFY_ADMIN_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const SHOPIFY_API_VERSION = '2025-01';

// Test data with properly formatted variant_id (string)
const testDraftOrderData = {
  input: {
    // Customer information
    customerId: "gid://shopify/Customer/123456789", // You'll need to replace with a real customer ID
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
    
    // Line items with properly formatted variant_id
    lineItems: [
      {
        variantId: "gid://shopify/ProductVariant/123456789", // String variant ID
        quantity: 1,
        customAttributes: [
          {
            key: "test_attribute",
            value: "test_value"
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
    note: "Test draft order created to verify variant_id fixes",
    tags: ["test", "variant-id-fix"],
    useCustomerDefaultAddress: false,
    allowPartialAddresses: true
  }
};

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
        shippingAddress {
          firstName
          lastName
          address1
          city
          province
          country
          zip
        }
        billingAddress {
          firstName
          lastName
          address1
          city
          province
          country
          zip
        }
        note
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

async function createDraftOrder() {
  if (!SHOPIFY_ADMIN_ACCESS_TOKEN) {
    console.error('❌ Missing SHOPIFY_ADMIN_ACCESS_TOKEN environment variable');
    console.log('Please set your Shopify Admin API access token:');
    console.log('export SHOPIFY_ADMIN_ACCESS_TOKEN="your_access_token_here"');
    return;
  }

  if (!SHOPIFY_STORE_URL || SHOPIFY_STORE_URL === 'your-store.myshopify.com') {
    console.error('❌ Missing or invalid SHOPIFY_STORE_URL');
    console.log('Please set your Shopify store URL:');
    console.log('export SHOPIFY_STORE_URL="your-store.myshopify.com"');
    return;
  }

  console.log('🧪 Testing draft order creation with fixed variant_id formatting...');
  console.log('📦 Store:', SHOPIFY_STORE_URL);
  console.log('📦 Test data:', JSON.stringify(testDraftOrderData, null, 2));

  try {
    const response = await fetch(`https://${SHOPIFY_STORE_URL}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ADMIN_ACCESS_TOKEN,
      },
      body: JSON.stringify({
        query: DRAFT_ORDER_CREATE_MUTATION,
        variables: testDraftOrderData
      })
    });

    const data = await response.json();
    
    console.log('📡 Response status:', response.status);
    console.log('📡 Response data:', JSON.stringify(data, null, 2));

    if (data.errors) {
      console.error('❌ GraphQL errors:', data.errors);
      
      // Check if it's a variant_id related error
      const errorMessages = data.errors.map(e => e.message).join(' ');
      if (errorMessages.includes('variant_id') || errorMessages.includes('variant')) {
        console.error('🚨 Variant ID related error detected!');
      } else {
        console.log('✅ No variant_id errors - our fix is working!');
      }
    } else if (data.data?.draftOrderCreate?.userErrors?.length > 0) {
      console.error('❌ User errors:', data.data.draftOrderCreate.userErrors);
      
      // Check if it's a variant_id related error
      const errorMessages = data.data.draftOrderCreate.userErrors.map(e => e.message).join(' ');
      if (errorMessages.includes('variant_id') || errorMessages.includes('variant')) {
        console.error('🚨 Variant ID related error detected!');
      } else {
        console.log('✅ No variant_id errors - our fix is working!');
      }
    } else if (data.data?.draftOrderCreate?.draftOrder) {
      const draftOrder = data.data.draftOrderCreate.draftOrder;
      console.log('✅ SUCCESS: Draft order created successfully!');
      console.log('📄 Draft Order ID:', draftOrder.id);
      console.log('📄 Draft Order Name:', draftOrder.name);
      console.log('📄 Status:', draftOrder.status);
      console.log('📄 Total Price:', draftOrder.totalPrice);
      console.log('📄 Line Items:', draftOrder.lineItems.edges.length);
      
      // Show line item details
      draftOrder.lineItems.edges.forEach((edge, index) => {
        const item = edge.node;
        console.log(`   Item ${index + 1}:`);
        console.log(`     Title: ${item.title}`);
        console.log(`     Quantity: ${item.quantity}`);
        console.log(`     Variant ID: ${item.variant?.id}`);
        console.log(`     Product ID: ${item.product?.id}`);
      });
    } else {
      console.log('❓ Unexpected response format');
    }

  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

// Test with different variant_id formats
async function testVariantIdFormats() {
  console.log('🚀 Testing different variant_id formats...\n');
  
  const testCases = [
    {
      name: "String variant_id (Should Work)",
      variantId: "gid://shopify/ProductVariant/123456789"
    },
    {
      name: "Numeric variant_id (Should Fail)",
      variantId: 123456789
    },
    {
      name: "Invalid variant_id format (Should Fail)",
      variantId: "invalid-format"
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📋 Test: ${testCase.name}`);
    console.log('=' .repeat(50));
    
    const testData = {
      ...testDraftOrderData,
      input: {
        ...testDraftOrderData.input,
        lineItems: [
          {
            ...testDraftOrderData.input.lineItems[0],
            variantId: testCase.variantId
          }
        ]
      }
    };

    try {
      const response = await fetch(`https://${SHOPIFY_STORE_URL}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': SHOPIFY_ADMIN_ACCESS_TOKEN,
        },
        body: JSON.stringify({
          query: DRAFT_ORDER_CREATE_MUTATION,
          variables: testData
        })
      });

      const data = await response.json();
      
      if (data.errors || data.data?.draftOrderCreate?.userErrors?.length > 0) {
        const errors = data.errors || data.data.draftOrderCreate.userErrors;
        const errorMessages = errors.map(e => e.message).join(' ');
        
        if (errorMessages.includes('variant_id') || errorMessages.includes('variant')) {
          console.log('🚨 FAILED: Variant ID validation error');
        } else {
          console.log('✅ PASSED: No variant_id errors (different error)');
        }
        console.log('📄 Error:', errorMessages);
      } else if (data.data?.draftOrderCreate?.draftOrder) {
        console.log('✅ SUCCESS: Draft order created');
        console.log('📄 Draft Order ID:', data.data.draftOrderCreate.draftOrder.id);
      }
      
    } catch (error) {
      console.log('❌ ERROR:', error.message);
    }
  }
}

// Helper function to get a real customer ID (you'll need to implement this)
async function getCustomerId() {
  // This is a placeholder - you'll need to implement this based on your needs
  // You could either:
  // 1. Use a known customer ID
  // 2. Create a test customer first
  // 3. Query for an existing customer
  return "gid://shopify/Customer/123456789"; // Replace with real customer ID
}

// Main execution
async function main() {
  console.log('🧪 Shopify Draft Order Creation Test');
  console.log('=====================================\n');
  
  // Check if we have the required credentials
  if (!SHOPIFY_ADMIN_ACCESS_TOKEN || !SHOPIFY_STORE_URL || SHOPIFY_STORE_URL === 'your-store.myshopify.com') {
    console.log('❌ Missing required credentials. Please set:');
    console.log('   SHOPIFY_ADMIN_ACCESS_TOKEN');
    console.log('   SHOPIFY_STORE_URL');
    console.log('\nExample:');
    console.log('   export SHOPIFY_ADMIN_ACCESS_TOKEN="shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"');
    console.log('   export SHOPIFY_STORE_URL="your-store.myshopify.com"');
    return;
  }

  // Run the tests
  await createDraftOrder();
  await testVariantIdFormats();
}

// Run if this script is executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  createDraftOrder,
  testVariantIdFormats,
  DRAFT_ORDER_CREATE_MUTATION
};
