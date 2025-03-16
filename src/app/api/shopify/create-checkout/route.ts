import { NextResponse } from 'next/server';

// Shopify Storefront API credentials
const SHOPIFY_STORE_URL = process.env.NEXT_PUBLIC_STORE_URL || 'https://your-store.myshopify.com';
const SHOPIFY_API_VERSION = '2023-10'; // Update to your preferred API version
const STOREFRONT_ACCESS_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

/**
 * Converts our app's cart data format to Shopify's expected format
 */
function mapCartItemsToShopifyFormat(items: any[]) {
  return items.map(item => ({
    merchandiseId: item.variant_id || item.id,
    quantity: item.quantity
  }));
}

/**
 * Creates a checkout using Shopify's Storefront API
 */
export async function POST(request: Request) {
  try {
    // Get cart and customer data from request
    const { customerData, cartData } = await request.json();

    if (!cartData || !cartData.items || cartData.items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required cart data' },
        { status: 400 }
      );
    }

    if (!STOREFRONT_ACCESS_TOKEN) {
      console.error('Missing Shopify Storefront API token');
      return NextResponse.json(
        { error: 'Shopify API not configured properly' },
        { status: 500 }
      );
    }

    // Step 1: Create a cart with items
    const createCartMutation = `
      mutation cartCreate($input: CartInput!) {
        cartCreate(input: $input) {
          cart {
            id
            checkoutUrl
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const cartInput = {
      lines: mapCartItemsToShopifyFormat(cartData.items)
    };

    const createCartResponse = await fetch(
      `${SHOPIFY_STORE_URL}/api/${SHOPIFY_API_VERSION}/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': STOREFRONT_ACCESS_TOKEN
        },
        body: JSON.stringify({
          query: createCartMutation,
          variables: { input: cartInput }
        })
      }
    );

    const createCartData = await createCartResponse.json();

    // Check for errors in cart creation
    if (createCartData.errors || createCartData.data?.cartCreate?.userErrors?.length > 0) {
      console.error('Error creating cart:', 
        createCartData.errors || createCartData.data?.cartCreate?.userErrors);
      return NextResponse.json(
        { error: 'Failed to create Shopify cart' },
        { status: 500 }
      );
    }

    const cartId = createCartData.data?.cartCreate?.cart?.id;
    
    // If cart creation succeeded but no ID was returned, something went wrong
    if (!cartId) {
      console.error('No cart ID returned from Shopify');
      return NextResponse.json(
        { error: 'Failed to create Shopify cart - no ID returned' },
        { status: 500 }
      );
    }

    // Step 2: Update cart with buyer identity (customer information)
    const updateBuyerIdentityMutation = `
      mutation cartBuyerIdentityUpdate($buyerIdentity: CartBuyerIdentityInput!, $cartId: ID!) {
        cartBuyerIdentityUpdate(buyerIdentity: $buyerIdentity, cartId: $cartId) {
          cart {
            id
            buyerIdentity {
              email
              phone
              countryCode
            }
            checkoutUrl
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    // Extract shipping address from customer data
    const address = {
      // Combine the address parts into a single string
      address1: customerData.street 
        ? `${customerData.street}${customerData.number ? ` ${customerData.number}` : ''}`
        : customerData.address || '',
      address2: customerData.building 
        ? `${customerData.building}${customerData.entrance ? `, вх. ${customerData.entrance}` : ''}${customerData.floor ? `, ет. ${customerData.floor}` : ''}${customerData.apartment ? `, ап. ${customerData.apartment}` : ''}`
        : '',
      city: customerData.city || customerData.officeCity || '',
      province: '', // Not used in Bulgaria
      zip: customerData.postalCode || customerData.officePostalCode || '',
      country: 'Bulgaria',
      firstName: customerData.firstName || '',
      lastName: customerData.lastName || '',
      phone: customerData.phone || ''
    };

    // Prepare the buyer identity input
    const buyerIdentityInput = {
      email: customerData.email || undefined,
      phone: customerData.phone || undefined,
      countryCode: 'BG', // Bulgaria
      deliveryAddressPreferences: [{
        address: {
          address1: address.address1,
          address2: address.address2,
          city: address.city,
          province: address.province,
          zip: address.zip,
          country: address.country
        }
      }]
    };

    const updateBuyerIdentityResponse = await fetch(
      `${SHOPIFY_STORE_URL}/api/${SHOPIFY_API_VERSION}/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': STOREFRONT_ACCESS_TOKEN
        },
        body: JSON.stringify({
          query: updateBuyerIdentityMutation,
          variables: { 
            buyerIdentity: buyerIdentityInput,
            cartId: cartId
          }
        })
      }
    );

    const updateBuyerIdentityData = await updateBuyerIdentityResponse.json();

    // Check for errors in buyer identity update
    if (updateBuyerIdentityData.errors || updateBuyerIdentityData.data?.cartBuyerIdentityUpdate?.userErrors?.length > 0) {
      console.error('Error updating buyer identity:', 
        updateBuyerIdentityData.errors || updateBuyerIdentityData.data?.cartBuyerIdentityUpdate?.userErrors);
      
      // Even if this fails, we can still proceed with the checkout URL from the initial cart creation
    }

    // Step 3: Retrieve a checkout URL
    // We can get this from the response of cartBuyerIdentityUpdate, or fallback to the one from cartCreate
    const checkoutUrl = updateBuyerIdentityData.data?.cartBuyerIdentityUpdate?.cart?.checkoutUrl || 
                       createCartData.data?.cartCreate?.cart?.checkoutUrl;

    if (!checkoutUrl) {
      console.error('No checkout URL returned from Shopify');
      return NextResponse.json(
        { error: 'Failed to get checkout URL' },
        { status: 500 }
      );
    }

    // Add custom attributes for the note if provided
    if (customerData.note) {
      // This would require an additional call to update cart attributes, but for now
      // we'll just include it in the response so we can show it to the user
      console.log('Order note:', customerData.note);
    }

    // Return the checkout URL and cart ID
    return NextResponse.json({
      success: true,
      checkoutUrl,
      cartId,
      message: 'Checkout created successfully.'
    });

  } catch (error) {
    console.error('Error processing checkout:', error);
    return NextResponse.json(
      { error: 'Failed to process checkout' },
      { status: 500 }
    );
  }
} 