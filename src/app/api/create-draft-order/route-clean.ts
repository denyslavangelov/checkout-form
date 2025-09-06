import { NextRequest, NextResponse } from 'next/server';

const STORE_URL = 'colorlamb-bulgaria.com';
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
    const { productId, variantId, quantity, shippingAddress, cartData, shippingMethod, selectedShippingMethodId } = body;

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
        const shippingMethodsResponse = await fetch(`${request.nextUrl.origin}/api/shopify/shipping-methods-rest`);
        const shippingMethodsData = await shippingMethodsResponse.json();
        
        if (shippingMethodsData.success && shippingMethodsData.shippingMethods) {
          const methodDetails = shippingMethodsData.shippingMethods.find((method: any) => method.id === selectedShippingMethodId);
          
          if (methodDetails) {
            shippingLine = {
              title: methodDetails.name,
              priceWithCurrency: {
                amount: methodDetails.price,
                currencyCode: methodDetails.currency
              }
            };
          } else {
            // Fallback to generic shipping method
            shippingLine = {
              title: 'Shipping',
              priceWithCurrency: {
                amount: '0.00',
                currencyCode: 'BGN'
              }
            };
          }
        } else {
          shippingLine = {
            title: 'Shipping',
            priceWithCurrency: {
              amount: '0.00',
              currencyCode: 'BGN'
            }
          };
        }
      } catch (error) {
        shippingLine = {
          title: 'Shipping',
          priceWithCurrency: {
            amount: '0.00',
            currencyCode: 'BGN'
          }
        };
      }
    } else if (shippingMethod) {
      // Fetch actual shipping methods from the store and match with courier/delivery type
      const { courier, deliveryType } = shippingMethod;
      
      try {
        const shippingMethodsResponse = await fetch(`${request.nextUrl.origin}/api/shopify/shipping-methods-rest`);
        const shippingMethodsData = await shippingMethodsResponse.json();
        
        if (shippingMethodsData.success && shippingMethodsData.shippingMethods) {
          // Find matching shipping method based on courier and delivery type
          const matchingMethod = shippingMethodsData.shippingMethods.find((method: any) => {
            const name = method.name?.toLowerCase() || '';
            
            // Special case: If "До Адрес" is selected, prioritize "Личен адрес" method
            if (deliveryType === 'address' && (name.includes('личен адрес') || name.includes('личен') || name.includes('личный адрес'))) {
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
              
              return courierMatch && deliveryMatch;
            } else {
              // For cases where courier is not specified
              if (deliveryType === 'office') {
                return name.includes('office') || 
                       name.includes('офис') || 
                       name.includes('pickup') ||
                       name.includes('вземане');
              } else if (deliveryType === 'address') {
                return (name.includes('address') || 
                        name.includes('адрес') || 
                        name.includes('delivery') ||
                        name.includes('доставка')) && 
                       !name.includes('office') && 
                       !name.includes('офис') && 
                       !name.includes('pickup') &&
                       !name.includes('вземане');
              }
            }
            
            return false;
          });
          
          if (matchingMethod) {
            shippingLine = {
              title: matchingMethod.name,
              priceWithCurrency: {
                amount: matchingMethod.price,
                currencyCode: matchingMethod.currency
              }
            };
          } else {
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
      // Check if it's a permission error
      const permissionError = data.errors.some((error: any) => 
        error.message?.includes('permission') || 
        error.message?.includes('access') ||
        error.message?.includes('unauthorized')
      );
      
      if (permissionError) {
        return NextResponse.json({
          success: false,
          error: 'Insufficient permissions to create draft order',
          details: data.errors
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
      
      return NextResponse.json({
        success: true,
        draftOrder: {
          id: draftOrder.id,
          name: draftOrder.name,
          status: draftOrder.status,
          totalPrice: draftOrder.totalPrice,
          invoiceUrl: draftOrder.invoiceUrl,
          checkoutUrl: `https://${STORE_URL}/admin/draft_orders/${draftOrder.id.split('/').pop()}/checkout`
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
