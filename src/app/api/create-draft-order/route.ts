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
    const { productId, variantId, shippingAddress } = body;

    // Validate required fields
    if (!variantId) {
      return NextResponse.json(
        { error: 'Variant ID is required' },
        { status: 400 }
      );
    }

    if (!shippingAddress || !shippingAddress.address1 || !shippingAddress.country) {
      return NextResponse.json(
        { error: 'Shipping address with address1 and country is required' },
        { status: 400 }
      );
    }

    console.log('Creating draft order with office address:', {
      variantId,
      shippingAddress
    });

    // Log the full GraphQL request
    const graphqlRequest = {
      query: CREATE_DRAFT_ORDER_MUTATION,
      variables: {
        input: {
          lineItems: [
            {
              variantId: `gid://shopify/ProductVariant/${variantId}`,
              quantity: 1
            }
          ],
          shippingAddress: {
            address1: shippingAddress.address1,
            city: shippingAddress.city || 'Sofia',
            country: shippingAddress.country
          },
          tags: ["office-pickup", "bulgaria-market", "auto-created"]
        }
      }
    };
    
    console.log('GraphQL request:', JSON.stringify(graphqlRequest, null, 2));

    // Create draft order via Shopify GraphQL API
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
                variantId: `gid://shopify/ProductVariant/${variantId}`,
                quantity: 1
              }
            ],
            shippingAddress: {
              address1: shippingAddress.address1,
              city: shippingAddress.city || 'Sofia',
              country: shippingAddress.country
            },
            tags: ["office-pickup", "bulgaria-market", "auto-created"]
          }
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Shopify API error:', data);
      return NextResponse.json(
        { error: 'Failed to create draft order', details: data },
        { status: response.status }
      );
    }

    if (data.errors) {
      console.error('GraphQL errors:', data.errors);
      return NextResponse.json(
        { error: 'GraphQL errors', details: data.errors },
        { status: 400 }
      );
    }

    if (data.data?.draftOrderCreate?.userErrors?.length > 0) {
      console.error('User errors:', data.data.draftOrderCreate.userErrors);
      return NextResponse.json(
        { error: 'Draft order creation failed', details: data.data.draftOrderCreate.userErrors },
        { status: 400 }
      );
    }

    const draftOrder = data.data?.draftOrderCreate?.draftOrder;
    if (!draftOrder) {
      console.error('No draft order created:', data);
      return NextResponse.json(
        { error: 'No draft order created', details: data },
        { status: 500 }
      );
    }

    console.log('Draft order created successfully:', {
      id: draftOrder.id,
      name: draftOrder.name,
      invoiceUrl: draftOrder.invoiceUrl
    });

    // Return the checkout URL (invoice URL serves as checkout URL)
    return NextResponse.json({
      success: true,
      draftOrderId: draftOrder.id,
      draftOrderName: draftOrder.name,
      checkoutUrl: draftOrder.invoiceUrl,
      invoiceUrl: draftOrder.invoiceUrl,
      totalPrice: draftOrder.totalPrice,
      shippingAddress: draftOrder.shippingAddress
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });

  } catch (error) {
    console.error('Error creating draft order:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
    );
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
