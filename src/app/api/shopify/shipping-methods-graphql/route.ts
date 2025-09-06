import { NextRequest, NextResponse } from 'next/server';

const STORE_URL = 'testing-client-check.myshopify.com';
const ACCESS_TOKEN = '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';

// GraphQL query to fetch shipping methods
const SHIPPING_METHODS_QUERY = `
  query getShippingMethods {
    deliveryProfiles(first: 10) {
      edges {
        node {
          id
          name
          profileLocationGroups {
            locationGroupZones(first: 10) {
              edges {
                node {
                  id
                  zone {
                    id
                    name
                    countries {
                      code
                      name
                    }
                  }
                  methodDefinitions(first: 10) {
                    edges {
                      node {
                        id
                        name
                        description
                        rateDefinition {
                          ... on WeightRateDefinition {
                            pricePerUnit {
                              amount
                              currencyCode
                            }
                            weightUnit
                          }
                          ... on PriceRateDefinition {
                            pricePerUnit {
                              amount
                              currencyCode
                            }
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
    const deliveryProfiles = data.data?.deliveryProfiles?.edges || [];
    const allShippingMethods: any[] = [];
    
    deliveryProfiles.forEach((profileEdge: any) => {
      const profile = profileEdge.node;
      
      profile.profileLocationGroups?.forEach((locationGroup: any) => {
        locationGroup.locationGroupZones?.edges?.forEach((zoneEdge: any) => {
          const zone = zoneEdge.node;
          
          zone.methodDefinitions?.edges?.forEach((methodEdge: any) => {
            const method = methodEdge.node;
            
            // Extract price information
            let price = '0.00';
            let currency = 'BGN';
            
            if (method.rateDefinition) {
              if (method.rateDefinition.pricePerUnit) {
                price = method.rateDefinition.pricePerUnit.amount || '0.00';
                currency = method.rateDefinition.pricePerUnit.currencyCode || 'BGN';
              }
            }
            
            const shippingMethod = {
              id: method.id,
              name: method.name,
              title: method.name,
              description: method.description,
              price: price,
              currency: currency,
              zone: zone.zone?.name || 'Unknown Zone',
              zoneId: zone.zone?.id,
              profileId: profile.id,
              profileName: profile.name,
              countries: zone.zone?.countries?.map((country: any) => country.code) || []
            };
            
            allShippingMethods.push(shippingMethod);
          });
        });
      });
    });

    // Filter for Bulgaria-specific methods
    const bulgariaMethods = allShippingMethods.filter(method => 
      method.countries?.includes('BG') ||
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

    console.log(`GraphQL Shipping Methods Found:
      Total: ${allShippingMethods.length}
      Bulgaria-relevant: ${bulgariaMethods.length}`);

    return NextResponse.json({
      success: true,
      shippingMethods: allShippingMethods,
      bulgariaMethods: bulgariaMethods,
      total: allShippingMethods.length,
      source: 'GraphQL API',
      deliveryProfiles: deliveryProfiles.length
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
