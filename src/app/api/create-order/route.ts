import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
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
      return new NextResponse(errorText, { status: response.status });
    }

    const data = await response.json();
    console.log('Success response:', data);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating order:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Failed to create order' }), 
      { status: 500 }
    );
  }
} 