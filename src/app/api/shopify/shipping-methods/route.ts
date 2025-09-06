import { NextRequest, NextResponse } from 'next/server';

const STORE_URL = 'testing-client-check.myshopify.com';
const ACCESS_TOKEN = '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';

// GraphQL query to get delivery profiles and their methods
const SHIPPING_METHODS_QUERY = `
  query getDeliveryProfiles {
    deliveryProfiles(first: 10) {
      edges {
        node {
          id
          name
          profileLocationGroups {
            locationGroup {
              id
              name
            }
            locationGroupZones {
              zone {
                id
                name
                countries {
                  code
                  name
                }
                deliveryMethods {
                  id
                  title
                  code
                  price {
                    amount
                    currencyCode
                  }
                  deliveryCategory
                  carrierService {
                    id
                    name
                    serviceName
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

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Fetching shipping methods from Shopify...');
    
    const response = await fetch(`https://${STORE_URL}/admin/api/2025-01/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': ACCESS_TOKEN,
      },
      body: JSON.stringify({
        query: SHIPPING_METHODS_QUERY
      })
    });

    const data = await response.json();
    console.log('🔍 Shopify shipping methods response:', JSON.stringify(data, null, 2));

    if (data.errors) {
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
          status: 403 
        });
      }
      
      return NextResponse.json({ error: 'GraphQL errors', details: data.errors }, { 
        status: 400 
      });
    }

    // Process the delivery profiles and their methods
    const deliveryProfiles = data.data?.deliveryProfiles?.edges || [];
    const allShippingMethods: any[] = [];
    
    deliveryProfiles.forEach((profile: any) => {
      const profileData = profile.node;
      console.log(`🔍 Processing delivery profile: ${profileData.name}`);
      
      profileData.profileLocationGroups?.forEach((locationGroup: any) => {
        locationGroup.locationGroupZones?.forEach((zoneGroup: any) => {
          const zone = zoneGroup.zone;
          console.log(`🔍 Processing zone: ${zone.name}`);
          
          zone.deliveryMethods?.forEach((method: any) => {
            const shippingMethod = {
              id: method.id,
              title: method.title,
              code: method.code,
              price: method.price?.amount || '0.00',
              currency: method.price?.currencyCode || 'BGN',
              deliveryCategory: method.deliveryCategory,
              carrierService: method.carrierService ? {
                id: method.carrierService.id,
                name: method.carrierService.name,
                serviceName: method.carrierService.serviceName
              } : null,
              profile: profileData.name,
              zone: zone.name,
              countries: zone.countries?.map((country: any) => country.code) || []
            };
            
            allShippingMethods.push(shippingMethod);
            console.log(`🔍 Added shipping method: ${method.title} (${method.code})`);
          });
        });
      });
    });

    console.log(`🔍 Total shipping methods found: ${allShippingMethods.length}`);

    // Filter for Bulgaria-specific methods or methods that might be relevant
    const bulgariaMethods = allShippingMethods.filter(method => 
      method.countries.includes('BG') || 
      method.title.toLowerCase().includes('speedy') ||
      method.title.toLowerCase().includes('econt') ||
      method.title.toLowerCase().includes('спиди') ||
      method.title.toLowerCase().includes('еконт') ||
      method.title.toLowerCase().includes('доставка') ||
      method.title.toLowerCase().includes('shipping')
    );

    console.log(`🔍 Bulgaria-relevant methods: ${bulgariaMethods.length}`);

    // Alert the shipping methods for debugging
    const alertMessage = `Shipping Methods Found:
Total: ${allShippingMethods.length}
Bulgaria-relevant: ${bulgariaMethods.length}

All Methods:
${allShippingMethods.map(method => `- ${method.title} (${method.code}) - ${method.price} ${method.currency}`).join('\n')}

Bulgaria Methods:
${bulgariaMethods.map(method => `- ${method.title} (${method.code}) - ${method.price} ${method.currency}`).join('\n')}`;

    console.log('🚨 ALERT - Shipping Methods:', alertMessage);

    return NextResponse.json({
      success: true,
      shippingMethods: allShippingMethods,
      bulgariaMethods: bulgariaMethods,
      total: allShippingMethods.length,
      alert: alertMessage // Include alert message in response
    });

  } catch (error) {
    console.error('🔍 Error fetching shipping methods:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch shipping methods',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 500 
    });
  }
}
