#!/usr/bin/env node

// Script to get real variant IDs from your Shopify store
// Usage: node get-real-variant-id.js <store-url> <access-token>

const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage: node get-real-variant-id.js <store-url> <access-token>');
  console.log('');
  console.log('Example:');
  console.log('  node get-real-variant-id.js my-store.myshopify.com shpat_abc123');
  process.exit(1);
}

const [storeUrl, accessToken] = args;

// GraphQL query to get products and their variants
const GET_PRODUCTS_QUERY = `
  query getProducts($first: Int!) {
    products(first: $first) {
      edges {
        node {
          id
          title
          handle
          status
          variants(first: 10) {
            edges {
              node {
                id
                title
                sku
                price
                availableForSale
                inventoryQuantity
                selectedOptions {
                  name
                  value
                }
              }
            }
          }
        }
      }
    }
  }
`;

// GraphQL query to get customers
const GET_CUSTOMERS_QUERY = `
  query getCustomers($first: Int!) {
    customers(first: $first) {
      edges {
        node {
          id
          email
          firstName
          lastName
        }
      }
    }
  }
`;

async function fetchProducts(storeUrl, accessToken) {
  console.log('🔍 Fetching products from your store...');
  
  try {
    const response = await fetch(`https://${storeUrl}/admin/api/2025-01/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({
        query: GET_PRODUCTS_QUERY,
        variables: { first: 10 }
      })
    });

    const data = await response.json();
    
    if (data.errors) {
      console.error('❌ GraphQL errors:', data.errors);
      return null;
    }
    
    return data.data.products.edges;
  } catch (error) {
    console.error('❌ Network error:', error.message);
    return null;
  }
}

async function fetchCustomers(storeUrl, accessToken) {
  console.log('👥 Fetching customers from your store...');
  
  try {
    const response = await fetch(`https://${storeUrl}/admin/api/2025-01/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({
        query: GET_CUSTOMERS_QUERY,
        variables: { first: 5 }
      })
    });

    const data = await response.json();
    
    if (data.errors) {
      console.error('❌ GraphQL errors:', data.errors);
      return null;
    }
    
    return data.data.customers.edges;
  } catch (error) {
    console.error('❌ Network error:', error.message);
    return null;
  }
}

function displayProducts(products) {
  console.log('\n📦 PRODUCTS AND VARIANTS:');
  console.log('=' .repeat(80));
  
  if (!products || products.length === 0) {
    console.log('❌ No products found in your store.');
    return [];
  }
  
  const availableVariants = [];
  
  products.forEach((productEdge, productIndex) => {
    const product = productEdge.node;
    console.log(`\n${productIndex + 1}. ${product.title}`);
    console.log(`   Product ID: ${product.id}`);
    console.log(`   Handle: ${product.handle}`);
    console.log(`   Status: ${product.status}`);
    
    if (product.variants.edges.length === 0) {
      console.log('   ❌ No variants found');
    } else {
      console.log('   📋 Variants:');
      product.variants.edges.forEach((variantEdge, variantIndex) => {
        const variant = variantEdge.node;
        console.log(`      ${variantIndex + 1}. ${variant.title || 'Default Title'}`);
        console.log(`         Variant ID: ${variant.id}`);
        console.log(`         SKU: ${variant.sku || 'No SKU'}`);
        console.log(`         Price: $${variant.price}`);
        console.log(`         Available: ${variant.availableForSale ? 'Yes' : 'No'}`);
        console.log(`         Inventory: ${variant.inventoryQuantity || 'Unknown'}`);
        
        if (variant.selectedOptions && variant.selectedOptions.length > 0) {
          console.log(`         Options: ${variant.selectedOptions.map(opt => `${opt.name}: ${opt.value}`).join(', ')}`);
        }
        
        // Collect available variants for testing
        if (variant.availableForSale) {
          availableVariants.push({
            productTitle: product.title,
            variantTitle: variant.title || 'Default Title',
            variantId: variant.id,
            productId: product.id,
            price: variant.price,
            sku: variant.sku
          });
        }
      });
    }
  });
  
  return availableVariants;
}

function displayCustomers(customers) {
  console.log('\n👥 CUSTOMERS:');
  console.log('=' .repeat(50));
  
  if (!customers || customers.length === 0) {
    console.log('❌ No customers found in your store.');
    return [];
  }
  
  customers.forEach((customerEdge, index) => {
    const customer = customerEdge.node;
    console.log(`${index + 1}. ${customer.firstName} ${customer.lastName}`);
    console.log(`   Customer ID: ${customer.id}`);
    console.log(`   Email: ${customer.email}`);
  });
  
  return customers.map(c => c.node);
}

function generateTestCommands(availableVariants, customers) {
  console.log('\n🚀 READY TO TEST:');
  console.log('=' .repeat(50));
  
  if (availableVariants.length === 0) {
    console.log('❌ No available variants found. You need at least one product with available variants.');
    return;
  }
  
  // Use the first available variant
  const testVariant = availableVariants[0];
  const testCustomer = customers.length > 0 ? customers[0] : null;
  
  console.log('📋 Test Data:');
  console.log(`   Product: ${testVariant.productTitle}`);
  console.log(`   Variant: ${testVariant.variantTitle}`);
  console.log(`   Variant ID: ${testVariant.variantId}`);
  console.log(`   Price: $${testVariant.price}`);
  if (testCustomer) {
    console.log(`   Customer: ${testCustomer.firstName} ${testCustomer.lastName} (${testCustomer.email})`);
  }
  
  console.log('\n🧪 Test Commands:');
  console.log('=' .repeat(50));
  
  // Generate test command
  let testCommand = `node test-variant-id-simple.js ${storeUrl} ${accessToken} "${testVariant.variantId}"`;
  console.log('1. Test variant_id validation:');
  console.log(`   ${testCommand}`);
  
  // Generate draft order creation command
  let draftOrderCommand = `node test-draft-order-cli.js ${storeUrl} ${accessToken} "${testVariant.variantId}"`;
  if (testCustomer) {
    draftOrderCommand += ` "${testCustomer.id}"`;
  }
  console.log('\n2. Create real draft order:');
  console.log(`   ${draftOrderCommand}`);
  
  console.log('\n📝 Copy and paste these commands to test with real data!');
  
  // Save to file for easy access
  const commands = {
    testVariantId: testCommand,
    createDraftOrder: draftOrderCommand,
    testData: {
      variant: testVariant,
      customer: testCustomer
    }
  };
  
  require('fs').writeFileSync('test-commands.json', JSON.stringify(commands, null, 2));
  console.log('\n💾 Commands saved to test-commands.json for easy access!');
}

async function main() {
  console.log('🔍 Getting Real Data from Your Shopify Store');
  console.log('=============================================\n');
  
  // Fetch products and variants
  const products = await fetchProducts(storeUrl, accessToken);
  if (!products) {
    console.log('❌ Failed to fetch products. Check your store URL and access token.');
    return;
  }
  
  // Fetch customers
  const customers = await fetchCustomers(storeUrl, accessToken);
  
  // Display the data
  const availableVariants = displayProducts(products);
  const customerList = displayCustomers(customers);
  
  // Generate test commands
  generateTestCommands(availableVariants, customerList);
  
  console.log('\n✅ Done! You now have real data to test with.');
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.log('❌ This script requires Node.js 18+ or a fetch polyfill.');
  console.log('   Install node-fetch: npm install node-fetch');
  process.exit(1);
}

// Run the main function
main().catch(console.error);
