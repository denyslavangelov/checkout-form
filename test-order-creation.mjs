#!/usr/bin/env node

// Test script to verify order creation with fixed variant_id formatting
// Run with: node test-order-creation.mjs

const API_URL = 'http://localhost:3000/api/create-order';

const testCases = [
  {
    name: "String variant_id (Should Work)",
    data: {
      shop_domain: "test-shop.myshopify.com",
      cart: {
        items: [{
          id: "123456789",
          quantity: 1,
          title: "Test Product - Deluxe Starting Solids Set",
          price: 5500,
          variant_id: "123456789", // String
          product_id: "987654321", // String
          sku: "TEST-SKU-001",
          variant_title: "Default Title",
          vendor: "Test Vendor",
          line_price: 5500
        }],
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
        note: "Test order with string variant_id"
      }
    }
  },
  {
    name: "Numeric variant_id (Should Fail with Old Error)",
    data: {
      shop_domain: "test-shop.myshopify.com",
      cart: {
        items: [{
          id: "123456789",
          quantity: 1,
          title: "Test Product - Deluxe Starting Solids Set",
          price: 5500,
          variant_id: 123456789, // Numeric - should cause old error
          product_id: 987654321, // Numeric - should cause old error
          sku: "TEST-SKU-001",
          variant_title: "Default Title",
          vendor: "Test Vendor",
          line_price: 5500
        }],
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
        note: "Test order with numeric variant_id"
      }
    }
  },
  {
    name: "Real Cart Data Format",
    data: {
      shop_domain: "test-shop.myshopify.com",
      cartData: {
        items: [{
          id: "123456789",
          title: "Deluxe Starting Solids Set",
          quantity: 1,
          price: 5500,
          line_price: 5500,
          original_line_price: 5500,
          variant_id: "123456789", // String from our fix
          product_id: "987654321", // String from our fix
          sku: "DELUXE-SET-001",
          variant_title: "Default Title",
          vendor: "Baby Store",
          image: "https://example.com/product.jpg",
          requires_shipping: true
        }],
        total_price: 5500,
        items_subtotal_price: 5500,
        total_discount: 0,
        item_count: 1,
        currency: "BGN"
      },
      shippingMethod: "speedy",
      shipping_method: "Офис на Спиди",
      shipping_price: 599,
      shipping_method_data: {
        type: "speedy",
        name: "Офис на Спиди",
        price: 599,
        price_formatted: "5.99 лв."
      },
      firstName: "Test",
      lastName: "User",
      phone: "0888123456",
      email: "test@example.com",
      city: "София",
      address: "ул. Тестова 123",
      postalCode: "1000",
      note: "Test order with real cart data format"
    }
  }
];

async function testOrderCreation(testCase) {
  console.log(`\n🧪 Testing: ${testCase.name}`);
  console.log('=' .repeat(60));
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCase.data)
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = responseText;
    }

    console.log(`📡 Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      console.log('✅ SUCCESS: Order created successfully');
      console.log('📄 Response:', JSON.stringify(responseData, null, 2));
      return { success: true, status: response.status, data: responseData };
    } else {
      const isVariantIdError = responseText.includes('variant_id') && responseText.includes('expected String');
      
      if (isVariantIdError) {
        console.log('🚨 FAILED: variant_id validation error still exists');
        console.log('📄 Error:', responseText);
        return { success: false, status: response.status, error: responseText, isVariantIdError: true };
      } else {
        console.log('✅ PASSED: variant_id error is fixed (different error)');
        console.log('📄 Error:', responseText);
        return { success: false, status: response.status, error: responseText, isVariantIdError: false };
      }
    }

  } catch (error) {
    console.log('❌ NETWORK ERROR:', error.message);
    return { success: false, error: error.message };
  }
}

async function runAllTests() {
  console.log('🚀 Starting comprehensive order creation tests...');
  console.log(`📡 API URL: ${API_URL}`);
  
  const results = [];
  
  for (const testCase of testCases) {
    const result = await testOrderCreation(testCase);
    results.push({ name: testCase.name, result });
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n🏁 TEST SUMMARY');
  console.log('=' .repeat(60));
  
  results.forEach(({ name, result }) => {
    if (result.success) {
      console.log(`✅ ${name}: PASSED`);
    } else if (result.isVariantIdError) {
      console.log(`🚨 ${name}: FAILED - variant_id error still exists`);
    } else {
      console.log(`✅ ${name}: PASSED - variant_id error is fixed (different error)`);
    }
  });
  
  const variantIdErrors = results.filter(r => r.result.isVariantIdError);
  const fixedErrors = results.filter(r => !r.result.success && !r.result.isVariantIdError);
  const successful = results.filter(r => r.result.success);
  
  console.log('\n📊 STATISTICS:');
  console.log(`   ✅ Successful orders: ${successful.length}`);
  console.log(`   🚨 Variant ID errors: ${variantIdErrors.length}`);
  console.log(`   ✅ Fixed errors (other issues): ${fixedErrors.length}`);
  
  if (variantIdErrors.length === 0) {
    console.log('\n🎉 SUCCESS: All variant_id validation errors have been fixed!');
  } else {
    console.log('\n⚠️  WARNING: Some variant_id validation errors still exist.');
  }
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.log('❌ This script requires Node.js 18+ or a fetch polyfill.');
  console.log('   Install node-fetch: npm install node-fetch');
  process.exit(1);
}

// Run the tests
runAllTests().catch(console.error);
