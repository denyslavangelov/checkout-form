import { NextRequest, NextResponse } from 'next/server';

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
        shippingLine {
          title
          price
          code
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

// CORS headers helper
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function POST(request: NextRequest) {
  // Handle CORS preflight request
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const body = await request.json();
    console.log('🏢 Draft Order API - Request received:', {
      timestamp: new Date().toISOString(),
      bodyKeys: Object.keys(body),
      hasProductId: !!body.productId,
      hasVariantId: !!body.variantId,
      hasCartData: !!body.cartData,
      hasShippingMethod: !!body.shippingMethod,
      hasShopify: !!body.shopify
    });
    
    const { productId, variantId, quantity, shippingAddress, cartData, shippingMethod, shopify } = body;
    
    // Extract Shopify credentials from request body
    const STORE_URL = shopify?.storeUrl;
    const ACCESS_TOKEN = shopify?.accessToken;
    
    // Validate required credentials
    if (!STORE_URL) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameter: shopify.storeUrl'
      }, { 
        status: 400,
        headers: corsHeaders
      });
    }

    if (!ACCESS_TOKEN) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameter: shopify.accessToken'
      }, { 
        status: 400,
        headers: corsHeaders
      });
    }
    
    console.log('🏢 Draft Order API - Using Shopify credentials:', { 
      storeUrl: STORE_URL, 
      accessToken: ACCESS_TOKEN.substring(0, 10) + '...',
      hasStoreUrl: !!STORE_URL,
      hasAccessToken: !!ACCESS_TOKEN
    });

    // Simple validation
    if (!variantId && !cartData) {
      return NextResponse.json({
        success: false,
        error: 'Either variantId or cartData is required'
      }, { status: 400, headers: corsHeaders });
    }

    if (!shippingAddress) {
      return NextResponse.json({
        success: false,
        error: 'Shipping address is required'
      }, { status: 400, headers: corsHeaders });
    }

    // Process shipping address
    const addressString = shippingAddress.address1 || '';
    const finalAddress = {
      address1: addressString,
      city: shippingAddress.city || '',
      zip: shippingAddress.postalCode || '',
      country: shippingAddress.country || 'Bulgaria'
    };
    
    console.log('🏢 Draft Order API - Shipping address processed:', {
      originalAddress: shippingAddress,
      finalAddress: finalAddress
    });

    // Process line items
    let lineItems: any[] = [];
    
    if (cartData && cartData.items && cartData.items.length > 0) {
      // Cart checkout - use cart items
      lineItems = cartData.items.map((item: any) => ({
        variantId: `gid://shopify/ProductVariant/${item.variant_id}`,
        quantity: item.quantity
      }));
      console.log('🏢 Draft Order API - Cart checkout line items:', {
        cartItemsCount: cartData.items.length,
        lineItems: lineItems
      });
    } else if (productId && variantId) {
      // Buy Now - use single product
      lineItems = [{
        variantId: `gid://shopify/ProductVariant/${variantId}`,
        quantity: parseInt(quantity) || 1
      }];
      console.log('🏢 Draft Order API - Buy Now line items:', {
        productId: productId,
        variantId: variantId,
        quantity: quantity,
        lineItems: lineItems
      });
    }

    // Use shipping line if provided
    let shippingLine = null;
    if (shippingMethod) {
      shippingLine = {
        title: shippingMethod.title || 'Shipping',
        priceWithCurrency: {
          amount: shippingMethod.price || '0.00',
          currencyCode: shippingMethod.currency || 'BGN'
        }
      };
      console.log('🏢 Draft Order API - Shipping method processed:', {
        originalShippingMethod: shippingMethod,
        shippingLine: shippingLine
      });
    } else {
      console.log('🏢 Draft Order API - No shipping method provided');
    }

    // Create draft order input
    const draftOrderInput: any = {
      lineItems,
      shippingAddress: finalAddress
    };

    // Add shipping line if available
    if (shippingLine) {
      draftOrderInput.shippingLine = shippingLine;
    }
    
    console.log('🏢 Draft Order API - Draft order input prepared:', {
      lineItemsCount: lineItems.length,
      hasShippingAddress: !!finalAddress,
      hasShippingLine: !!shippingLine,
      draftOrderInput: draftOrderInput
    });

    console.log('🏢 Draft Order API - Sending GraphQL request to Shopify:', {
      url: `https://${STORE_URL}/admin/api/2024-01/graphql.json`,
      mutation: CREATE_DRAFT_ORDER_MUTATION,
      variables: { input: draftOrderInput }
    });
    
    const response = await fetch(`https://${STORE_URL}/admin/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': ACCESS_TOKEN,
      },
      body: JSON.stringify({
        query: CREATE_DRAFT_ORDER_MUTATION,
        variables: {
          input: draftOrderInput
        }
      })
    });
    
    console.log('🏢 Draft Order API - Shopify GraphQL response received:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({
        success: false,
        error: `GraphQL request failed: ${response.status}`,
        details: errorText
      }, { status: response.status, headers: corsHeaders });
    }

    const data = await response.json();
    
    console.log('🏢 Draft Order API - Shopify GraphQL response data:', {
      hasData: !!data.data,
      hasErrors: !!data.errors,
      errorsCount: data.errors ? data.errors.length : 0,
      fullResponse: data
    });

    if (data.errors && Array.isArray(data.errors)) {
      console.log('🏢 Draft Order API - GraphQL errors received:', JSON.stringify(data.errors, null, 2));
      
      // Check if it's a permission error
      const permissionError = data.errors.some((error: any) => 
        error.message?.includes('permission') || 
        error.message?.includes('access') ||
        error.message?.includes('unauthorized') ||
        error.message?.includes('scope') ||
        error.message?.includes('forbidden')
      );
      
      if (permissionError) {
        return NextResponse.json({
          success: false,
          error: 'Insufficient permissions to create draft order',
          details: data.errors,
          troubleshooting: {
            message: 'This error typically occurs when the app lacks the "write_draft_orders" scope or the staff member lacks draft order permissions.',
            steps: [
              '1. Check app scopes in Shopify Admin: Apps and sales channels → Develop apps → [Your App] → Configuration',
              '2. Ensure "write_draft_orders" scope is enabled',
              '3. Reinstall the app to apply new permissions',
              '4. Check staff permissions: Settings → Users and permissions → [Staff Member] → Draft orders',
              '5. Ensure "Create and edit draft orders" permission is enabled'
            ]
          }
        }, { status: 403, headers: corsHeaders });
      }
      
      return NextResponse.json({
        success: false,
        error: 'Failed to create draft order',
        details: data.errors
      }, { status: 400, headers: corsHeaders });
    }

    if (data.data?.draftOrderCreate?.draftOrder) {
      const draftOrder = data.data.draftOrderCreate.draftOrder;
      
      const draftOrderId = draftOrder.id.split('/').pop();
      const constructedCheckoutUrl = `https://${STORE_URL}/admin/draft_orders/${draftOrderId}/checkout`;
      
      console.log('🏢 Draft Order API - ✅ Draft order created successfully:', {
        id: draftOrder.id,
        name: draftOrder.name,
        status: draftOrder.status,
        totalPrice: draftOrder.totalPrice,
        invoiceUrl: draftOrder.invoiceUrl,
        constructedCheckoutUrl: constructedCheckoutUrl,
        fullDraftOrder: draftOrder
      });
      
      return NextResponse.json({
        success: true,
        draftOrder: {
          id: draftOrder.id,
          name: draftOrder.name,
          status: draftOrder.status,
          totalPrice: draftOrder.totalPrice,
          invoiceUrl: draftOrder.invoiceUrl,
          checkoutUrl: constructedCheckoutUrl
        }
      }, { headers: corsHeaders });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to create draft order',
        details: data.data?.draftOrderCreate?.userErrors || 'Unknown error'
      }, { status: 400, headers: corsHeaders });
    }

  } catch (error) {
    console.error('🏢 Draft Order API - ❌ Error creating draft order:', {
      error: error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500, headers: corsHeaders });
  }
}
