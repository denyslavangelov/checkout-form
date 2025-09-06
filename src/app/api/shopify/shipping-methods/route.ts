import { NextRequest, NextResponse } from 'next/server';

const STORE_URL = 'testing-client-check.myshopify.com';
const ACCESS_TOKEN = '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';

// GraphQL query to get shipping zones and their methods
const SHIPPING_METHODS_QUERY = `
  query getShippingZones {
    shippingZones(first: 10) {
      edges {
        node {
          id
          name
          countries {
            code
            name
          }
          shippingMethods {
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
      return NextResponse.json({ error: 'GraphQL errors', details: data.errors }, { 
        status: 400 
      });
    }

    // Process the shipping methods
    const shippingZones = data.data?.shippingZones?.edges || [];
    const allShippingMethods: any[] = [];
    
    shippingZones.forEach((zone: any) => {
      const zoneData = zone.node;
      console.log(`🔍 Processing shipping zone: ${zoneData.name}`);
      
      zoneData.shippingMethods.forEach((method: any) => {
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
          zone: zoneData.name,
          countries: zoneData.countries.map((country: any) => country.code)
        };
        
        allShippingMethods.push(shippingMethod);
        console.log(`🔍 Added shipping method: ${method.title} (${method.code})`);
      });
    });

    console.log(`🔍 Total shipping methods found: ${allShippingMethods.length}`);

    // Filter for Bulgaria-specific methods or methods that might be relevant
    const bulgariaMethods = allShippingMethods.filter(method => 
      method.countries.includes('BG') || 
      method.title.toLowerCase().includes('speedy') ||
      method.title.toLowerCase().includes('econt') ||
      method.title.toLowerCase().includes('доставка') ||
      method.title.toLowerCase().includes('shipping')
    );

    console.log(`🔍 Bulgaria-relevant methods: ${bulgariaMethods.length}`);

    return NextResponse.json({
      success: true,
      shippingMethods: allShippingMethods,
      bulgariaMethods: bulgariaMethods,
      total: allShippingMethods.length
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
