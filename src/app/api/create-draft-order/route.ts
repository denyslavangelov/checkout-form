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
    console.log('🔍 DEBUG: Received request body:', JSON.stringify(body, null, 2));
    
    const { productId, variantId, quantity, shippingAddress, cartData, shippingMethod, selectedShippingMethodId } = body;
    
    console.log('🔍 DEBUG: Extracted data:', {
      productId,
      variantId,
      cartData: cartData ? 'present' : 'not present',
      cartItemsCount: cartData?.items?.length || 0,
      shippingAddress,
      address1Type: typeof shippingAddress?.address1,
      address1Value: shippingAddress?.address1,
      postalCode: shippingAddress?.postalCode,
      city: shippingAddress?.city
    });

    // Simple validation
    if (!variantId && !cartData) {
      return NextResponse.json({ error: 'Either variant ID or cart data is required' }, { 
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

    // Create line items based on whether we have cart data or single product
    let lineItems;
    if (cartData && cartData.items && cartData.items.length > 0) {
      // Use cart items
      console.log('🔍 DEBUG: Raw cart items:', cartData.items);
      console.log('🔍 DEBUG: Cart items count:', cartData.items.length);
      
      lineItems = cartData.items.map((item: any, index: number) => {
        console.log(`🔍 DEBUG: Processing item ${index + 1}:`, {
          id: item.id,
          variant_id: item.variant_id,
          quantity: item.quantity,
          title: item.title,
          product_id: item.product_id
        });
        
        // Handle different possible ID fields
        const variantId = item.variant_id || item.id || item.variantId;
        if (!variantId) {
          console.error('🔍 DEBUG: No variant ID found for item:', item);
        }
        
        return {
          variantId: `gid://shopify/ProductVariant/${variantId}`,
          quantity: item.quantity || 1
        };
      });
      
      console.log('🔍 DEBUG: Final line items for draft order:', lineItems);
      console.log('🔍 DEBUG: Total line items count:', lineItems.length);
    } else {
      // Use single product
      lineItems = [{
        variantId: `gid://shopify/ProductVariant/${variantId}`,
        quantity: quantity || 1
      }];
      console.log('🔍 DEBUG: Using single product:', lineItems);
    }

    // Create shipping line based on shipping method
    let shippingLine = null;
    
    // If we have a specific shipping method ID, use that
    if (selectedShippingMethodId) {
      shippingLine = {
        shippingMethodId: selectedShippingMethodId
      };
      console.log('🔍 DEBUG: Using specific shipping method ID:', selectedShippingMethodId);
    } else if (shippingMethod) {
      // Fallback to hardcoded shipping methods based on courier and delivery type
      const { courier, deliveryType } = shippingMethod;
      
      // Define shipping methods based on courier and delivery type
      if (courier === 'speedy') {
        if (deliveryType === 'office') {
          shippingLine = {
            title: 'Спиди - До офис',
            price: '0.00',
            code: 'speedy-office'
          };
        } else if (deliveryType === 'address') {
          shippingLine = {
            title: 'Спиди - До адрес',
            price: '0.00',
            code: 'speedy-address'
          };
        }
      } else if (courier === 'econt') {
        if (deliveryType === 'office') {
          shippingLine = {
            title: 'Еконт - До офис',
            price: '0.00',
            code: 'econt-office'
          };
        } else if (deliveryType === 'address') {
          shippingLine = {
            title: 'Еконт - До адрес',
            price: '0.00',
            code: 'econt-address'
          };
        }
      }
      
      console.log('🔍 DEBUG: Created fallback shipping line:', shippingLine);
    }

    // Create draft order
    const draftOrderInput: any = {
      lineItems: lineItems,
      shippingAddress: {
        address1: addressString,
        city: shippingAddress.city || 'Sofia',
        zip: shippingAddress.postalCode || '',
        country: shippingAddress.country || 'Bulgaria'
      }
    };

    // Add shipping line if available
    if (shippingLine) {
      draftOrderInput.shippingLine = shippingLine;
    }

    const response = await fetch(`https://${STORE_URL}/admin/api/2025-01/graphql.json`, {
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
