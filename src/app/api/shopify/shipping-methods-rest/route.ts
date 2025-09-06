import { NextRequest, NextResponse } from 'next/server';

const STORE_URL = 'colorlamb-bulgaria.com';
const ACCESS_TOKEN = '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';

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
    console.log('🔍 Fetching shipping methods from Shopify using REST API...');
    
    // Try to get shipping zones using REST API
    const response = await fetch(`https://${STORE_URL}/admin/api/2024-01/shipping_zones.json`, {
      headers: {
        'X-Shopify-Access-Token': ACCESS_TOKEN,
      }
    });

    console.log('🔍 DEBUG: REST API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🔍 DEBUG: REST API request failed:', response.status, errorText);
      return NextResponse.json({
        success: false,
        error: `REST API request failed: ${response.status}`,
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
    console.log('🔍 REST API shipping zones response:', JSON.stringify(data, null, 2));

    // Process shipping zones and their methods
    const shippingZones = data.shipping_zones || [];
    const allShippingMethods: any[] = [];
    
    shippingZones.forEach((zone: any) => {
      console.log(`🔍 Processing shipping zone: ${zone.name}`);
      
      zone.delivery_methods?.forEach((method: any) => {
        const shippingMethod = {
          id: method.id,
          name: method.title,
          title: method.title,
          price: method.price || '0.00',
          currency: 'BGN',
          zone: zone.name,
          zoneId: zone.id
        };
        
        allShippingMethods.push(shippingMethod);
        console.log(`🔍 Added shipping method: ${method.title} - ${method.price} BGN`);
      });
    });

    console.log(`🔍 Total shipping methods found: ${allShippingMethods.length}`);

    // Filter for Bulgaria-specific methods
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
    const alertMessage = `Shipping Methods Found (REST API):
Total: ${allShippingMethods.length}
Bulgaria-relevant: ${bulgariaMethods.length}

All Methods:
${allShippingMethods.map(method => `- ${method.name} (${method.id}) - ${method.price} ${method.currency} - Zone: ${method.zone}`).join('\n')}

Bulgaria Methods:
${bulgariaMethods.map(method => `- ${method.name} (${method.id}) - ${method.price} ${method.currency} - Zone: ${method.zone}`).join('\n')}`;

    console.log('🚨 ALERT - Shipping Methods (REST):', alertMessage);

    return NextResponse.json({
      success: true,
      shippingMethods: allShippingMethods,
      bulgariaMethods: bulgariaMethods,
      total: allShippingMethods.length,
      alert: alertMessage,
      source: 'REST API'
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
