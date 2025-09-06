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
      // Fetch actual shipping methods from the store and match with courier/delivery type
      const { courier, deliveryType } = shippingMethod;
      
      try {
        console.log('🔍 DEBUG: Fetching store shipping methods to match courier:', courier, 'deliveryType:', deliveryType);
        
        // Fetch shipping methods from our API
        const shippingMethodsResponse = await fetch(`${request.nextUrl.origin}/api/shopify/shipping-methods`);
        const shippingMethodsData = await shippingMethodsResponse.json();
        
        if (shippingMethodsData.success && shippingMethodsData.shippingMethods) {
          console.log('🔍 DEBUG: Found', shippingMethodsData.shippingMethods.length, 'shipping methods');
          
          // Find matching shipping method based on courier and delivery type
            const matchingMethod = shippingMethodsData.shippingMethods.find((method: any) => {
              const name = method.name?.toLowerCase() || '';
              
              // Match courier
              const courierMatch = (courier === 'speedy' && (
                name.includes('speedy') || 
                name.includes('спиди')        // Bulgarian name
              )) || (courier === 'econt' && (
                name.includes('econt') || 
                name.includes('еконт')        // Bulgarian name
              ));
              
              // Match delivery type
              const deliveryMatch = (deliveryType === 'office' && (
                name.includes('office') || 
                name.includes('офис') ||     // Bulgarian
                name.includes('pickup') ||
                name.includes('вземане')     // Bulgarian
              )) || (deliveryType === 'address' && (
                name.includes('address') || 
                name.includes('адрес') ||    // Bulgarian
                name.includes('delivery') ||
                name.includes('доставка')    // Bulgarian
              ));
              
              return courierMatch && deliveryMatch;
            });
          
          if (matchingMethod) {
            console.log('🔍 DEBUG: Found matching shipping method:', matchingMethod);
            shippingLine = {
              title: matchingMethod.name,
              priceWithCurrency: {
                amount: matchingMethod.price,
                currencyCode: matchingMethod.currency
              }
            };
          } else {
            console.log('🔍 DEBUG: No matching shipping method found, using fallback');
            // Fallback to hardcoded shipping methods
            if (courier === 'speedy') {
              if (deliveryType === 'office') {
                shippingLine = {
                  title: 'Спиди - До офис',
                  priceWithCurrency: {
                    amount: '0.00',
                    currencyCode: 'BGN'
                  }
                };
              } else if (deliveryType === 'address') {
                shippingLine = {
                  title: 'Спиди - До адрес',
                  priceWithCurrency: {
                    amount: '0.00',
                    currencyCode: 'BGN'
                  }
                };
              }
            } else if (courier === 'econt') {
              if (deliveryType === 'office') {
                shippingLine = {
                  title: 'Еконт - До офис',
                  priceWithCurrency: {
                    amount: '0.00',
                    currencyCode: 'BGN'
                  }
                };
              } else if (deliveryType === 'address') {
                shippingLine = {
                  title: 'Еконт - До адрес',
                  priceWithCurrency: {
                    amount: '0.00',
                    currencyCode: 'BGN'
                  }
                };
              }
            }
          }
        } else {
          console.log('🔍 DEBUG: Failed to fetch shipping methods, using fallback');
          // Fallback to hardcoded shipping methods
          if (courier === 'speedy') {
            if (deliveryType === 'office') {
              shippingLine = {
                title: 'Спиди - До офис',
                priceWithCurrency: {
                  amount: '0.00',
                  currencyCode: 'BGN'
                }
              };
            } else if (deliveryType === 'address') {
              shippingLine = {
                title: 'Спиди - До адрес',
                priceWithCurrency: {
                  amount: '0.00',
                  currencyCode: 'BGN'
                }
              };
            }
          } else if (courier === 'econt') {
            if (deliveryType === 'office') {
              shippingLine = {
                title: 'Еконт - До офис',
                priceWithCurrency: {
                  amount: '0.00',
                  currencyCode: 'BGN'
                }
              };
            } else if (deliveryType === 'address') {
              shippingLine = {
                title: 'Еконт - До адрес',
                priceWithCurrency: {
                  amount: '0.00',
                  currencyCode: 'BGN'
                }
              };
            }
          }
        }
      } catch (error) {
        console.error('🔍 DEBUG: Error fetching shipping methods:', error);
        // Fallback to hardcoded shipping methods
        if (courier === 'speedy') {
          if (deliveryType === 'office') {
            shippingLine = {
              title: 'Спиди - До офис',
              priceWithCurrency: {
                amount: '0.00',
                currencyCode: 'BGN'
              }
            };
          } else if (deliveryType === 'address') {
            shippingLine = {
              title: 'Спиди - До адрес',
              priceWithCurrency: {
                amount: '0.00',
                currencyCode: 'BGN'
              }
            };
          }
        } else if (courier === 'econt') {
          if (deliveryType === 'office') {
            shippingLine = {
              title: 'Еконт - До офис',
              priceWithCurrency: {
                amount: '0.00',
                currencyCode: 'BGN'
              }
            };
          } else if (deliveryType === 'address') {
            shippingLine = {
              title: 'Еконт - До адрес',
              priceWithCurrency: {
                amount: '0.00',
                currencyCode: 'BGN'
              }
            };
          }
        }
      }
      
      console.log('🔍 DEBUG: Final shipping line:', shippingLine);
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
      console.error('🔍 Draft order creation GraphQL errors:', data.errors);
      
      // Check if it's a permission error
      const permissionError = data.errors.some((error: any) => 
        error.message?.includes('permission') || 
        error.message?.includes('access') ||
        error.message?.includes('unauthorized') ||
        error.message?.includes('forbidden')
      );
      
      if (permissionError) {
        console.log('🔍 Permission error in draft order creation - API token may not have draft order permissions');
        return NextResponse.json({ 
          error: 'Permission denied - API token needs draft order permissions',
          details: data.errors
        }, { 
          status: 403,
          headers: { 'Access-Control-Allow-Origin': '*' }
        });
      }
      
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
