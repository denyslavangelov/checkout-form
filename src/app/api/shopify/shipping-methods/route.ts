import { NextRequest, NextResponse } from 'next/server';

// GraphQL query to fetch shipping methods
const SHIPPING_METHODS_QUERY = `
  query getShippingMethods {
    deliveryProfiles(first: 1) {
      nodes {
        profileLocationGroups {
          locationGroupZones(first: 50) {
            nodes {
              zone {
                name
              }
              methodDefinitions(first: 50) {
                nodes {
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
    console.log('Fetching shipping methods via GraphQL...');

    // Extract Shopify credentials from query parameters
    const { searchParams } = new URL(request.url);
    const storeUrl = searchParams.get('storeUrl');
    const accessToken = searchParams.get('accessToken');

    // Validate required credentials
    if (!storeUrl) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameter: storeUrl'
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

    if (!accessToken) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameter: accessToken'
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

    console.log('Using Shopify credentials:', { storeUrl, accessToken: accessToken.substring(0, 10) + '...' });

    const response = await fetch(`https://${storeUrl}/admin/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({
        query: SHIPPING_METHODS_QUERY
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GraphQL request failed:', response.status, errorText);
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

    if (data.errors && Array.isArray(data.errors)) {
      console.error('GraphQL errors:', data.errors);
      return NextResponse.json({
        success: false,
        error: 'GraphQL query failed',
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

    // Process the GraphQL response
    const deliveryProfiles = data.data?.deliveryProfiles?.nodes || [];
    const allShippingMethods: any[] = [];
    
    deliveryProfiles.forEach((profile: any) => {
      profile.profileLocationGroups?.forEach((locationGroup: any) => {
        locationGroup.locationGroupZones?.nodes?.forEach((zone: any) => {
          zone.methodDefinitions?.nodes?.forEach((method: any) => {
            // Extract price information from rateProvider
            let price = '0.00';
            let currency = 'BGN';
            
            if (method.rateProvider && method.rateProvider.__typename === 'DeliveryRateDefinition') {
              if (method.rateProvider.price) {
                price = method.rateProvider.price.amount || '0.00';
                currency = method.rateProvider.price.currencyCode || 'BGN';
              }
            }
            
            const shippingMethod = {
              id: method.name, // Use name as ID since we don't have a separate ID field
              name: method.name,
              title: method.name,
              price: price,
              currency: currency,
              zone: zone.zone?.name || 'Unknown Zone',
              rateProviderType: method.rateProvider?.__typename || 'Unknown'
            };
            
            allShippingMethods.push(shippingMethod);
          });
        });
      });
    });

    // Filter for Bulgaria-specific methods (Domestic zone and Bulgarian shipping methods)
    const bulgariaMethods = allShippingMethods.filter(method => 
      method.zone?.toLowerCase().includes('domestic') ||
      method.name?.toLowerCase().includes('спиди') ||
      method.name?.toLowerCase().includes('еконт') ||
      method.name?.toLowerCase().includes('speedy') ||
      method.name?.toLowerCase().includes('econt') ||
      method.name?.toLowerCase().includes('офис') ||
      method.name?.toLowerCase().includes('адрес') ||
      method.name?.toLowerCase().includes('доставка') ||
      method.name?.toLowerCase().includes('личен')
    );

    console.log(`GraphQL Shipping Methods Found:
      Total: ${allShippingMethods.length}
      Bulgaria-relevant: ${bulgariaMethods.length}`);

    return NextResponse.json({
      success: true,
      shippingMethods: bulgariaMethods, // Return only Bulgaria-specific methods
      total: bulgariaMethods.length,
      source: 'GraphQL API',
      zone: 'Domestic (Bulgaria)'
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
    console.error('Error fetching shipping methods via GraphQL:', error);
    return NextResponse.json({
      success: false,
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
