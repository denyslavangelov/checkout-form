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
    const { productId, variantId, quantity, shippingAddress, cartData, shippingMethod, selectedShippingMethodId, shopify } = body;
    
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
    const finalAddress = {
      address1: addressString,
      city: shippingAddress.city || '',
      zip: shippingAddress.postalCode || '',
      country: shippingAddress.country || 'Bulgaria'
    };

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
    
    // If we have a specific shipping method ID, fetch its details and use title/price
    if (selectedShippingMethodId) {
      try {
        const shippingMethodsUrl = `${request.nextUrl.origin}/api/shopify/shipping-methods`;
        console.log('🔍 Fetching shipping methods for validation:', {
          url: shippingMethodsUrl,
          selectedShippingMethodId: selectedShippingMethodId,
          timestamp: new Date().toISOString()
        });
        
        const shippingMethodsResponse = await fetch(shippingMethodsUrl);
        console.log('📡 Shipping methods API response status:', {
          status: shippingMethodsResponse.status,
          statusText: shippingMethodsResponse.statusText,
          headers: Object.fromEntries(shippingMethodsResponse.headers.entries()),
          url: shippingMethodsResponse.url
        });
        
        const shippingMethodsData = await shippingMethodsResponse.json();
        console.log('📦 Shipping methods API response data:', {
          success: shippingMethodsData.success,
          hasShippingMethods: !!shippingMethodsData.shippingMethods,
          shippingMethodsCount: shippingMethodsData.shippingMethods?.length || 0,
          error: shippingMethodsData.error,
          details: shippingMethodsData.details,
          fullResponse: shippingMethodsData
        });
        
        if (shippingMethodsData.success && shippingMethodsData.shippingMethods) {
          console.log('🔎 Searching for method with ID:', selectedShippingMethodId);
          console.log('📋 Available shipping methods:', shippingMethodsData.shippingMethods.map((m: any) => ({
            id: m.id,
            name: m.name,
            price: m.price,
            currency: m.currency
          })));
          
          const methodDetails = shippingMethodsData.shippingMethods.find((method: any) => method.id === selectedShippingMethodId);
          console.log('🎯 Method details found:', methodDetails);
          
          if (methodDetails) {
            shippingLine = {
              title: methodDetails.name,
              priceWithCurrency: {
                amount: methodDetails.price,
                currencyCode: methodDetails.currency
              }
            };
            console.log('✅ Shipping line created:', shippingLine);
          } else {
            return NextResponse.json({
              success: false,
              error: 'Shipping method not found',
              details: `Could not find shipping method with ID: ${selectedShippingMethodId}. Please ensure the shipping method exists and is properly configured.`
            }, { status: 400 });
          }
        } else {
          return NextResponse.json({
            success: false,
            error: 'Failed to fetch shipping methods for validation',
            details: `Could not retrieve shipping methods to validate the selected method ID: ${selectedShippingMethodId}. Please ensure the store has shipping methods configured.`
          }, { status: 400 });
        }
      } catch (error) {
        console.error('❌ Error validating shipping method:', {
          error: error,
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          selectedShippingMethodId: selectedShippingMethodId,
          timestamp: new Date().toISOString()
        });
        
        return NextResponse.json({
          success: false,
          error: 'Error validating shipping method',
          details: `Failed to validate shipping method ID ${selectedShippingMethodId}: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your network connection and API credentials.`
        }, { status: 500 });
      }
    } else if (shippingMethod) {
      // Fetch actual shipping methods from the store and match with courier/delivery type
      const { courier, deliveryType } = shippingMethod;
      
      try {
        const shippingMethodsUrl = `${request.nextUrl.origin}/api/shopify/shipping-methods`;
        console.log('🔍 Fetching shipping methods for matching:', {
          url: shippingMethodsUrl,
          courier: courier,
          deliveryType: deliveryType,
          timestamp: new Date().toISOString()
        });
        
        const shippingMethodsResponse = await fetch(shippingMethodsUrl);
        console.log('📡 Shipping methods API response status:', {
          status: shippingMethodsResponse.status,
          statusText: shippingMethodsResponse.statusText,
          headers: Object.fromEntries(shippingMethodsResponse.headers.entries()),
          url: shippingMethodsResponse.url
        });
        
        const shippingMethodsData = await shippingMethodsResponse.json();
        console.log('📦 Shipping methods API response data:', {
          success: shippingMethodsData.success,
          hasShippingMethods: !!shippingMethodsData.shippingMethods,
          shippingMethodsCount: shippingMethodsData.shippingMethods?.length || 0,
          error: shippingMethodsData.error,
          details: shippingMethodsData.details,
          fullResponse: shippingMethodsData
        });
        
        if (shippingMethodsData.success && shippingMethodsData.shippingMethods) {
          console.log('🔎 Starting shipping method matching process:', {
            courier: courier,
            deliveryType: deliveryType,
            availableMethods: shippingMethodsData.shippingMethods.map((m: any) => ({
              id: m.id,
              name: m.name,
              price: m.price,
              currency: m.currency
            }))
          });
          
          // Find matching shipping method based on courier and delivery type
          const matchingMethod = shippingMethodsData.shippingMethods.find((method: any) => {
            const name = method.name?.toLowerCase() || '';
            console.log(`🔍 Checking method: "${method.name}" (${method.id})`);
            
            // Special case: If "До Адрес" is selected, prioritize "Личен адрес" method
            if (deliveryType === 'address' && (name.includes('личен адрес') || name.includes('личен') || name.includes('личный адрес'))) {
              console.log('✅ Found "Личен адрес" method for address delivery');
              return true;
            }
            
            // First, try to match by courier and delivery type
            if (courier === 'speedy' || courier === 'econt') {
              // Match courier
              const courierMatch = (courier === 'speedy' && (
                name.includes('speedy') || 
                name.includes('спиди')
              )) || (courier === 'econt' && (
                name.includes('econt') || 
                name.includes('еконт')
              ));
              
              // Match delivery type
              const deliveryMatch = (deliveryType === 'office' && (
                name.includes('office') || 
                name.includes('офис') ||
                name.includes('pickup') ||
                name.includes('вземане')
              )) || (deliveryType === 'address' && (
                name.includes('address') || 
                name.includes('адрес') ||
                name.includes('delivery') ||
                name.includes('доставка')
              ));
              
              console.log(`🔍 Courier match: ${courierMatch}, Delivery match: ${deliveryMatch}`);
              return courierMatch && deliveryMatch;
            } else {
              // For cases where courier is not specified
              if (deliveryType === 'office') {
                const officeMatch = name.includes('office') || 
                       name.includes('офис') || 
                       name.includes('pickup') ||
                       name.includes('вземане');
                console.log(`🔍 Office match: ${officeMatch}`);
                return officeMatch;
              } else if (deliveryType === 'address') {
                const addressMatch = (name.includes('address') || 
                        name.includes('адрес') || 
                        name.includes('delivery') ||
                        name.includes('доставка')) && 
                       !name.includes('office') && 
                       !name.includes('офис') && 
                       !name.includes('pickup') &&
                       !name.includes('вземане');
                console.log(`🔍 Address match: ${addressMatch}`);
                return addressMatch;
              }
            }
            
            console.log('❌ No match found for this method');
            return false;
          });
          
          console.log('🎯 Final matching result:', {
            found: !!matchingMethod,
            method: matchingMethod ? {
              id: matchingMethod.id,
              name: matchingMethod.name,
              price: matchingMethod.price,
              currency: matchingMethod.currency
            } : null
          });
          
          if (matchingMethod) {
            shippingLine = {
              title: matchingMethod.name,
              priceWithCurrency: {
                amount: matchingMethod.price,
                currencyCode: matchingMethod.currency
              }
            };
            console.log('✅ Shipping line created from matching method:', shippingLine);
          } else {
            return NextResponse.json({
              success: false,
              error: `No matching shipping method found for ${courier} ${deliveryType === 'office' ? 'office delivery' : 'address delivery'}`,
              details: `Could not find a shipping method matching courier: ${courier}, delivery type: ${deliveryType}. Please ensure the store has the appropriate shipping methods configured.`
            }, { status: 400 });
          }
        } else {
          return NextResponse.json({
            success: false,
            error: 'Failed to fetch shipping methods from store',
            details: `Could not retrieve shipping methods from the store. Please ensure the store has shipping methods configured and the API credentials are correct.`
          }, { status: 400 });
        }
      } catch (error) {
        console.error('❌ Error fetching shipping methods for matching:', {
          error: error,
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          courier: courier,
          deliveryType: deliveryType,
          timestamp: new Date().toISOString()
        });
        
        return NextResponse.json({
          success: false,
          error: 'Error fetching shipping methods',
          details: `Failed to fetch shipping methods from the store: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your network connection and API credentials.`
        }, { status: 500 });
      }
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
