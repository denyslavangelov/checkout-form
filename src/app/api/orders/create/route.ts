import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Get the access token from the Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization token' }, { status: 401 });
    }

    const accessToken = authHeader.split(' ')[1];

    // Get the order data from the request body
    const orderData = await request.json();

    // Create the order using your API
    const response = await fetch(`${process.env.API_URL}/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create order');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create order' },
      { status: 500 }
    );
  }
} 