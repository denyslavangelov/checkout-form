import { NextRequest, NextResponse } from 'next/server';

const STORE_URL = 'colorlamb-bulgaria.myshopify.com';
const ACCESS_TOKEN = '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';

// GraphQL query to get delivery profiles and their method definitions
const SHIPPING_METHODS_QUERY = `
  query getDeliveryProfiles {
    deliveryProfiles(first: 10) {
      nodes {
        id
        name
        profileLocationGroups {
          locationGroupZones(first: 50) {
            nodes {
              zone {
                id
                name
              }
              methodDefinitions(first: 50) {
                nodes {
                  id
                  name
                  rateProvider {
                    __typename
                    ... on DeliveryRateDefinition {
                      price {
                        amount
                        currencyCode
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

// Handle preflight OPTIONS requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Cross-Origin-Embedder-Policy': 'unsafe-none'
    }
  });
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Fetching shipping methods from Shopify...');
    
    const response = await fetch(`https://${STORE_URL}/admin/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': ACCESS_TOKEN,
      },
      body: JSON.stringify({
        query: SHIPPING_METHODS_QUERY
      })
    });

    console.log('🔍 DEBUG: GraphQL response status:', response.status);
    console.log('🔍 DEBUG: GraphQL response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🔍 DEBUG: GraphQL request failed:', response.status, errorText);
      return NextResponse.json({
        success: false,
        error: `GraphQL request failed: ${response.status}`,
        details: errorText
      }, { 
        status: response.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Cross-Origin-Resource-Policy': 'cross-origin',
          'Cross-Origin-Embedder-Policy': 'unsafe-none'
        }
      });
    }

    const data = await response.json();
    console.log('🔍 Shopify shipping methods response:', JSON.stringify(data, null, 2));

    if (data.errors && Array.isArray(data.errors)) {
      console.error('🔍 GraphQL errors:', data.errors);
      
      // Check if it's a permission error
      const permissionError = data.errors.some((error: any) => 
        error.message?.includes('permission') || 
        error.message?.includes('access') ||
        error.message?.includes('unauthorized')
      );
      
      if (permissionError) {
        console.log('🔍 Permission error detected - API token may not have shipping permissions');
        return NextResponse.json({ 
          error: 'Permission denied - API token needs shipping permissions',
          details: data.errors,
          fallback: true
        }, { 
          status: 403,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Cross-Origin-Resource-Policy': 'cross-origin',
            'Cross-Origin-Embedder-Policy': 'unsafe-none'
          }
        });
      }
      
      return NextResponse.json({ error: 'GraphQL errors', details: data.errors }, { 
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Cross-Origin-Resource-Policy': 'cross-origin',
          'Cross-Origin-Embedder-Policy': 'unsafe-none'
        }
      });
    } else if (data.errors) {
      // Handle non-array errors (like "Not Found" string)
      console.error('🔍 Non-array GraphQL errors:', data.errors);
      return NextResponse.json({ 
        success: false,
        error: 'GraphQL request failed', 
        details: data.errors 
      }, { 
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Cross-Origin-Resource-Policy': 'cross-origin',
          'Cross-Origin-Embedder-Policy': 'unsafe-none'
        }
      });
    }

    // Process the delivery profiles and their method definitions
    const deliveryProfiles = data.data?.deliveryProfiles?.nodes || [];
    const allShippingMethods: any[] = [];
    
    deliveryProfiles.forEach((profile: any) => {
      console.log(`🔍 Processing delivery profile: ${profile.name}`);
      
      profile.profileLocationGroups?.forEach((locationGroup: any) => {
        const locationGroupZones = locationGroup.locationGroupZones?.nodes || [];
        locationGroupZones.forEach((zoneData: any) => {
          const zone = zoneData.zone;
          console.log(`🔍 Processing zone: ${zone.name}`);
          
          const methodDefinitions = zoneData.methodDefinitions?.nodes || [];
          methodDefinitions.forEach((method: any) => {
            const shippingMethod = {
              id: method.id,
              name: method.name,
              title: method.name, // Use name as title for consistency
              price: method.rateProvider?.price?.amount || '0.00',
              currency: method.rateProvider?.price?.currencyCode || 'BGN',
              rateProviderType: method.rateProvider?.__typename,
              profile: profile.name,
              zone: zone.name,
              zoneId: zone.id
            };
            
            allShippingMethods.push(shippingMethod);
            console.log(`🔍 Added shipping method: ${method.name} - ${method.rateProvider?.price?.amount} ${method.rateProvider?.price?.currencyCode}`);
          });
        });
      });
    });

    console.log(`🔍 Total shipping methods found: ${allShippingMethods.length}`);

    // Filter for Bulgaria-specific methods or methods that might be relevant
    const bulgariaMethods = allShippingMethods.filter(method => 
      method.zone?.toLowerCase().includes('domestic') ||
      method.zone?.toLowerCase().includes('bulgaria') ||
      method.name?.toLowerCase().includes('спиди') ||
      method.name?.toLowerCase().includes('еконт') ||
      method.name?.toLowerCase().includes('speedy') ||
      method.name?.toLowerCase().includes('econt') ||
      method.name?.toLowerCase().includes('офис') ||
      method.name?.toLowerCase().includes('адрес') ||
      method.name?.toLowerCase().includes('доставка')
    );

    console.log(`🔍 Bulgaria-relevant methods: ${bulgariaMethods.length}`);

    // Alert the shipping methods for debugging
    const alertMessage = `Shipping Methods Found:
Total: ${allShippingMethods.length}
Bulgaria-relevant: ${bulgariaMethods.length}

All Methods:
${allShippingMethods.map(method => `- ${method.name} (${method.id}) - ${method.price} ${method.currency} - Zone: ${method.zone}`).join('\n')}

Bulgaria Methods:
${bulgariaMethods.map(method => `- ${method.name} (${method.id}) - ${method.price} ${method.currency} - Zone: ${method.zone}`).join('\n')}`;

    console.log('🚨 ALERT - Shipping Methods:', alertMessage);

    return NextResponse.json({
      success: true,
      shippingMethods: allShippingMethods,
      bulgariaMethods: bulgariaMethods,
      total: allShippingMethods.length,
      alert: alertMessage // Include alert message in response
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Cross-Origin-Embedder-Policy': 'unsafe-none'
      }
    });

  } catch (error) {
    console.error('🔍 Error fetching shipping methods:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch shipping methods',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Cross-Origin-Embedder-Policy': 'unsafe-none'
      }
    });
  }
}
