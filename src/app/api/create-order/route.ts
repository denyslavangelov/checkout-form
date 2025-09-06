import { NextResponse } from 'next/server';

// Helper function to add CORS headers
function corsHeaders(origin: string) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400' // 24 hours cache for preflight
  };
}

// Handle OPTIONS preflight request
export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin') || '';
  
  // Return response with CORS headers
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin)
  });
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin') || '';
    const body = await request.json();
    
    // Debug logging to see what data is being sent
    console.log('Sending to external API:', JSON.stringify(body, null, 2));

    const response = await fetch('https://shipfast-v2.vercel.app/api/create-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error from shipfast API:', errorText);
      return new NextResponse(errorText, { 
        status: response.status,
        headers: corsHeaders(origin)
      });
    }

    const data = await response.json();
    
    // Debug logging to see what the external API returns
    console.log('External API response:', JSON.stringify(data, null, 2));

    // Map the external API response to the expected format
    // The external service might return different field names
    const mappedResponse = {
      ...data,
      // Try to map common field names to checkoutUrl
      checkoutUrl: data.checkoutUrl || data.checkout_url || data.url || data.orderUrl || data.order_url,
      // Try to map common field names to orderId
      orderId: data.orderId || data.order_id || data.id || data.orderNumber || data.order_number
    };

    console.log('Mapped response:', JSON.stringify(mappedResponse, null, 2));

    // If no checkout URL is found, return an error
    if (!mappedResponse.checkoutUrl) {
      console.error('No checkout URL found in external API response:', data);
      return new NextResponse(
        JSON.stringify({ 
          error: 'No checkout URL received from external service',
          details: 'The external order service did not return a checkout URL'
        }), 
        { 
          status: 500,
          headers: corsHeaders(origin)
        }
      );
    }

    return NextResponse.json(mappedResponse, {
      headers: corsHeaders(origin)
    });
  } catch (error) {
    const origin = request.headers.get('origin') || '';
    
    return new NextResponse(
      JSON.stringify({ error: 'Failed to create order' }), 
      { 
        status: 500,
        headers: corsHeaders(origin)
      }
    );
  }
} 