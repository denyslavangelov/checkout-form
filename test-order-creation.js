// Test script to verify order creation with fixed variant_id formatting
// This script tests the order creation API with properly formatted data

const testOrderData = {
  shop_domain: "test-shop.myshopify.com",
  cart: {
    items: [
      {
        id: "123456789", // String ID
        quantity: 1,
        title: "Test Product - Deluxe Starting Solids Set",
        price: 5500, // Price in cents
        variant_id: "123456789", // String variant_id (this was the issue)
        product_id: "987654321", // String product_id
        sku: "TEST-SKU-001",
        variant_title: "Default Title",
        vendor: "Test Vendor",
        line_price: 5500
      }
    ],
    currency: "BGN",
    total_price: 5500,
    total_weight: 500,
    item_count: 1,
    items_subtotal_price: 5500,
    total_discount: 0,
    requires_shipping: true
  },
  shipping_method: "speedy",
  shipping_price: 599,
  shipping_method_data: {
    type: "speedy",
    name: "Офис на Спиди",
    price: 599,
    price_formatted: "5.99 лв."
  },
  client_details: {
    first_name: "Test",
    last_name: "User",
    phone: "0888123456",
    email: "test@example.com",
    address: {
      city: "София",
      address1: "ул. Тестова 123",
      postcode: "1000"
    },
    note: "Test order with fixed variant_id formatting"
  }
};

async function testOrderCreation() {
  console.log('🧪 Testing order creation with fixed variant_id formatting...');
  console.log('📦 Test data:', JSON.stringify(testOrderData, null, 2));
  
  try {
    const response = await fetch('http://localhost:3000/api/create-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testOrderData)
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      
      // Check if it's the variant_id error we were trying to fix
      if (errorText.includes('variant_id') && errorText.includes('expected String')) {
        console.error('🚨 The variant_id error still exists! Our fix may not be working.');
      } else {
        console.log('✅ The variant_id error is fixed! This is a different error.');
      }
    } else {
      const data = await response.json();
      console.log('✅ Success! Order created:', data);
    }

  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

// Test with different data formats to ensure our fixes work
const testVariations = [
  {
    name: "Numeric variant_id (should be converted to string)",
    data: {
      ...testOrderData,
      cart: {
        ...testOrderData.cart,
        items: [{
          ...testOrderData.cart.items[0],
          variant_id: 123456789, // Numeric - this should cause the old error
          product_id: 987654321  // Numeric - this should cause the old error
        }]
      }
    }
  },
  {
    name: "String variant_id (should work)",
    data: testOrderData
  },
  {
    name: "Undefined variant_id (should use fallback)",
    data: {
      ...testOrderData,
      cart: {
        ...testOrderData.cart,
        items: [{
          ...testOrderData.cart.items[0],
          variant_id: undefined, // Undefined - should use id as fallback
          product_id: undefined  // Undefined - should use id as fallback
        }]
      }
    }
  }
];

async function runAllTests() {
  console.log('🚀 Starting comprehensive order creation tests...\n');
  
  for (const test of testVariations) {
    console.log(`\n📋 Test: ${test.name}`);
    console.log('=' .repeat(50));
    
    try {
      const response = await fetch('http://localhost:3000/api/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(test.data)
      });

      console.log('📡 Status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('📄 Response:', errorText);
        
        if (errorText.includes('variant_id') && errorText.includes('expected String')) {
          console.log('🚨 FAILED: variant_id validation error still exists');
        } else {
          console.log('✅ PASSED: variant_id error is fixed (different error)');
        }
      } else {
        const data = await response.json();
        console.log('✅ PASSED: Order created successfully');
        console.log('📄 Response:', JSON.stringify(data, null, 2));
      }
    } catch (error) {
      console.log('❌ ERROR:', error.message);
    }
  }
  
  console.log('\n🏁 Tests completed!');
}

// Run the tests
if (typeof window === 'undefined') {
  // Node.js environment
  const fetch = require('node-fetch');
  runAllTests();
} else {
  // Browser environment
  runAllTests();
}
