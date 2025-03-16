import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    // Get the store identifier from the request URL
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID is required' }, { status: 400 });
    }

    // TODO: Replace with your actual database query
    // This is where you would fetch the access token from your database
    const response = await fetch(`${process.env.API_URL}/stores/${storeId}/token`, {
      headers: {
        'Authorization': `Bearer ${process.env.API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch access token');
    }

    const data = await response.json();

    return NextResponse.json({ access_token: data.access_token });
  } catch (error) {
    console.error('Error fetching access token:', error);
    return NextResponse.json(
      { error: 'Failed to fetch access token' },
      { status: 500 }
    );
  }
} 