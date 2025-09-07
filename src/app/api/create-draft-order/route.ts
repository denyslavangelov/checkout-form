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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, variantId, quantity, shippingAddress, cartData, shippingMethod, selectedShippingMethodId, selectedShippingMethod, customerInfo, shopify } = body;
    
    // Extract Shopify credentials from request body
    const STORE_URL = shopify?.storeUrl;
    const ACCESS_TOKEN = shopify?.accessToken;
    
    // Validate required credentials
    if (!STORE_URL) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameter: shopify.storeUrl'
      }, { status: 400 });
    }

    if (!ACCESS_TOKEN) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameter: shopify.accessToken'
      }, { status: 400 });
    }
    
    console.log('Using Shopify credentials:', { storeUrl: STORE_URL, accessToken: ACCESS_TOKEN.substring(0, 10) + '...' });

    // Simple validation
    if (!variantId && !cartData) {
      return NextResponse.json({
        success: false,
        error: 'Either variantId or cartData is required'
      }, { status: 400 });
    }

    if (!shippingAddress) {
      return NextResponse.json({
        success: false,
        error: 'Shipping address is required'
      }, { status: 400 });
    }

    // Process shipping address
    const addressString = shippingAddress.address1 || '';
    const finalAddress: any = {
      address1: addressString,
      city: shippingAddress.city || '',
      zip: shippingAddress.postalCode || '',
      country: shippingAddress.country || 'Bulgaria'
    };

    // Add customer info to address if provided
    if (customerInfo && customerInfo.firstName && customerInfo.lastName) {
      finalAddress.firstName = customerInfo.firstName;
      finalAddress.lastName = customerInfo.lastName;
      if (customerInfo.phoneNumber) {
        finalAddress.phone = customerInfo.phoneNumber;
      }
    }

    // Process line items
    let lineItems: any[] = [];
    
    if (cartData && cartData.items && cartData.items.length > 0) {
      // Cart checkout - use cart items
      lineItems = cartData.items.map((item: any) => ({
        variantId: `gid://shopify/ProductVariant/${item.variant_id}`,
        quantity: item.quantity
      }));
    } else if (productId && variantId) {
      // Buy Now - use single product
      lineItems = [{
        variantId: `gid://shopify/ProductVariant/${variantId}`,
        quantity: parseInt(quantity) || 1
      }];
    }

    // Create shipping line based on shipping method
    let shippingLine = null;
    
    // If we have a specific shipping method, use it with the actual price
    if (selectedShippingMethodId && selectedShippingMethod) {
      // Use the actual price from the shipping method object
      const shippingPrice = selectedShippingMethod.price || '0.00';
      const shippingTitle = selectedShippingMethod.title || selectedShippingMethod.name || selectedShippingMethodId;
      const shippingCurrency = selectedShippingMethod.currency || 'BGN';
      
      shippingLine = {
        title: shippingTitle,
        priceWithCurrency: {
          amount: shippingPrice,
          currencyCode: shippingCurrency
        }
      };
      console.log('✅ Using shipping method with actual price:', {
        title: shippingTitle,
        price: shippingPrice,
        currency: shippingCurrency,
        fullMethod: selectedShippingMethod
      });
    } else if (selectedShippingMethodId) {
      // Fallback: use just the ID without price (will default to 0.00)
      shippingLine = {
        title: selectedShippingMethodId,
        priceWithCurrency: {
          amount: '0.00',
          currencyCode: 'BGN'
        }
      };
      console.log('⚠️ Using shipping method without price data:', shippingLine);
    } else {
      // No shipping method selected - log error and proceed without shipping line
      console.error('❌ No shipping method selected:', {
        selectedShippingMethodId: selectedShippingMethodId,
        shippingMethod: shippingMethod,
        message: 'Proceeding without shipping method - this should be handled by the modal'
      });
    }

    // Create draft order input
    const draftOrderInput: any = {
      lineItems,
      shippingAddress: finalAddress
    };

    // Add customer info as tags (supported by DraftOrderInput)
    if (customerInfo && customerInfo.firstName && customerInfo.lastName) {
      const tags = [
        `customer-first-name:${customerInfo.firstName}`,
        `customer-last-name:${customerInfo.lastName}`
      ];
      
      if (customerInfo.phoneNumber) {
        tags.push(`customer-phone:${customerInfo.phoneNumber}`);
      }
      
      draftOrderInput.tags = tags;
      console.log('✅ Customer info added as tags:', {
        firstName: customerInfo.firstName,
        lastName: customerInfo.lastName,
        phoneNumber: customerInfo.phoneNumber
      });
    }

    // Add shipping line if available
    if (shippingLine) {
      draftOrderInput.shippingLine = shippingLine;
    }

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

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({
        success: false,
        error: `GraphQL request failed: ${response.status}`,
        details: errorText
      }, { status: response.status });
    }

    const data = await response.json();

    if (data.errors && Array.isArray(data.errors)) {
      console.log('GraphQL errors received:', JSON.stringify(data.errors, null, 2));
      
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
        }, { status: 403 });
      }
      
      return NextResponse.json({
        success: false,
        error: 'Failed to create draft order',
        details: data.errors
      }, { status: 400 });
    }

    if (data.data?.draftOrderCreate?.draftOrder) {
      const draftOrder = data.data.draftOrderCreate.draftOrder;
      
      const draftOrderId = draftOrder.id.split('/').pop();
      const constructedCheckoutUrl = `https://${STORE_URL}/admin/draft_orders/${draftOrderId}/checkout`;
      
      console.log('✅ Draft order created successfully:', {
        id: draftOrder.id,
        name: draftOrder.name,
        status: draftOrder.status,
        totalPrice: draftOrder.totalPrice,
        invoiceUrl: draftOrder.invoiceUrl,
        constructedCheckoutUrl: constructedCheckoutUrl
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
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to create draft order',
        details: data.data?.draftOrderCreate?.userErrors || 'Unknown error'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Error creating draft order:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
