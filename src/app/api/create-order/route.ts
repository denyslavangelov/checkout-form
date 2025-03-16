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
    console.log('Received request:', body);

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
    console.log('Success response:', data);

    return NextResponse.json(data, {
      headers: corsHeaders(origin)
    });
  } catch (error) {
    console.error('Error creating order:', error);
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