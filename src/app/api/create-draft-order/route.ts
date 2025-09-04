import { NextRequest, NextResponse } from 'next/server';

const STORE_URL = 'testing-client-check.myshopify.com';
const ACCESS_TOKEN = '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';

// GraphQL mutation to create draft order with office address
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
          zip
          country
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔍 DEBUG: Received request body:', JSON.stringify(body, null, 2));
    
    const { productId, variantId, shippingAddress } = body;
    
    console.log('🔍 DEBUG: Extracted data:', {
      productId,
      variantId,
      shippingAddress,
      address1Type: typeof shippingAddress?.address1,
      address1Value: shippingAddress?.address1,
      postalCode: shippingAddress?.postalCode,
      city: shippingAddress?.city
    });

    // Simple validation
    if (!variantId) {
      return NextResponse.json({ error: 'Variant ID is required' }, { 
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }

    if (!shippingAddress?.address1) {
      return NextResponse.json({ error: 'Address1 is required' }, { 
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Extract address string properly
    let addressString;
    if (typeof shippingAddress.address1 === 'string') {
      addressString = shippingAddress.address1;
    } else if (shippingAddress.address1?.fullAddressString) {
      addressString = shippingAddress.address1.fullAddressString;
    } else {
      addressString = JSON.stringify(shippingAddress.address1);
    }

    console.log('🔍 DEBUG: Final address string:', addressString);
    console.log('🔍 DEBUG: Final shipping address:', {
      address1: addressString,
      city: shippingAddress.city || 'Sofia',
      zip: shippingAddress.postalCode || '',
      country: shippingAddress.country || 'Bulgaria'
    });

    // Create simple draft order
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
            lineItems: [{
              variantId: `gid://shopify/ProductVariant/${variantId}`,
              quantity: 1
            }],
            shippingAddress: {
              address1: addressString,
              city: shippingAddress.city || 'Sofia',
              zip: shippingAddress.postalCode || '',
              country: shippingAddress.country || 'Bulgaria'
            }
          }
        }
      })
    });

    const data = await response.json();
    console.log('🔍 DEBUG: Shopify response:', JSON.stringify(data, null, 2));

    if (data.errors) {
      return NextResponse.json({ error: 'GraphQL errors', details: data.errors }, { 
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }

    const draftOrder = data.data?.draftOrderCreate?.draftOrder;
    if (!draftOrder) {
      return NextResponse.json({ error: 'No draft order created' }, { 
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }

    return NextResponse.json({
      success: true,
      checkoutUrl: draftOrder.invoiceUrl
    }, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });

  } catch (error) {
    console.error('🔍 DEBUG: Error:', error);
    return NextResponse.json({ error: 'Server error' }, { 
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
