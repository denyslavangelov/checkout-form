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
    console.log('🚀 Starting shipping methods fetch via GraphQL...');
    console.log('📡 Request URL:', request.url);
    console.log('📡 Request headers:', Object.fromEntries(request.headers.entries()));

    // Extract Shopify credentials from query parameters
    const { searchParams } = new URL(request.url);
    const storeUrl = searchParams.get('storeUrl');
    const accessToken = searchParams.get('accessToken');
    
    console.log('🔑 Extracted credentials:', {
      storeUrl: storeUrl,
      hasAccessToken: !!accessToken,
      accessTokenPreview: accessToken ? accessToken.substring(0, 10) + '...' : 'none'
    });

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

    console.log('🔑 Using Shopify credentials:', { storeUrl, accessToken: accessToken.substring(0, 10) + '...' });

    const graphqlUrl = `https://${storeUrl}/admin/api/2024-01/graphql.json`;
    console.log('🌐 Making GraphQL request to:', graphqlUrl);
    console.log('📝 GraphQL query:', SHIPPING_METHODS_QUERY);

    const response = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({
        query: SHIPPING_METHODS_QUERY
      })
    });
    
    console.log('📡 GraphQL response status:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ GraphQL request failed:', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText,
        url: graphqlUrl
      });
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
    console.log('📦 GraphQL response data:', {
      hasData: !!data.data,
      hasErrors: !!data.errors,
      errors: data.errors,
      dataKeys: data.data ? Object.keys(data.data) : [],
      fullResponse: data
    });

    if (data.errors && Array.isArray(data.errors)) {
      console.error('❌ GraphQL errors received:', {
        errorCount: data.errors.length,
        errors: data.errors,
        fullResponse: data
      });
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
    console.log('🏪 Processing delivery profiles:', {
      profileCount: deliveryProfiles.length,
      profiles: deliveryProfiles.map((p: any) => ({
        hasLocationGroups: !!p.profileLocationGroups,
        locationGroupCount: p.profileLocationGroups?.length || 0
      }))
    });
    
    const allShippingMethods: any[] = [];
    
    deliveryProfiles.forEach((profile: any, profileIndex: number) => {
      console.log(`📦 Processing profile ${profileIndex + 1}:`, {
        hasLocationGroups: !!profile.profileLocationGroups,
        locationGroupCount: profile.profileLocationGroups?.length || 0
      });
      
      profile.profileLocationGroups?.forEach((locationGroup: any, groupIndex: number) => {
        console.log(`📍 Processing location group ${groupIndex + 1}:`, {
          hasZones: !!locationGroup.locationGroupZones,
          zoneCount: locationGroup.locationGroupZones?.nodes?.length || 0
        });
        
        locationGroup.locationGroupZones?.nodes?.forEach((zone: any, zoneIndex: number) => {
          console.log(`🌍 Processing zone ${zoneIndex + 1}:`, {
            zoneName: zone.zone?.name,
            hasMethods: !!zone.methodDefinitions,
            methodCount: zone.methodDefinitions?.nodes?.length || 0
          });
          
          zone.methodDefinitions?.nodes?.forEach((method: any, methodIndex: number) => {
            console.log(`🚚 Processing method ${methodIndex + 1}:`, {
              name: method.name,
              rateProviderType: method.rateProvider?.__typename,
              hasPrice: !!method.rateProvider?.price
            });
            
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
            
            console.log(`✅ Created shipping method:`, shippingMethod);
            allShippingMethods.push(shippingMethod);
          });
        });
      });
    });

    // Filter for Bulgaria-specific methods (Domestic zone and Bulgarian shipping methods)
    console.log('🔍 Filtering for Bulgaria-specific methods...');
    console.log('📋 All methods before filtering:', allShippingMethods.map(m => ({
      name: m.name,
      zone: m.zone,
      price: m.price,
      currency: m.currency
    })));
    
    const bulgariaMethods = allShippingMethods.filter(method => {
      const zoneMatch = method.zone?.toLowerCase().includes('domestic');
      const nameMatch = method.name?.toLowerCase().includes('спиди') ||
        method.name?.toLowerCase().includes('еконт') ||
        method.name?.toLowerCase().includes('speedy') ||
        method.name?.toLowerCase().includes('econt') ||
        method.name?.toLowerCase().includes('офис') ||
        method.name?.toLowerCase().includes('адрес') ||
        method.name?.toLowerCase().includes('доставка') ||
        method.name?.toLowerCase().includes('личен');
      
      const isMatch = zoneMatch || nameMatch;
      console.log(`🔍 Method "${method.name}" (${method.zone}): zoneMatch=${zoneMatch}, nameMatch=${nameMatch}, isMatch=${isMatch}`);
      return isMatch;
    });

    console.log('📊 GraphQL Shipping Methods Results:', {
      total: allShippingMethods.length,
      bulgariaRelevant: bulgariaMethods.length,
      bulgariaMethods: bulgariaMethods.map(m => ({
        name: m.name,
        zone: m.zone,
        price: m.price,
        currency: m.currency
      }))
    });

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
    console.error('❌ Error fetching shipping methods via GraphQL:', {
      error: error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
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
