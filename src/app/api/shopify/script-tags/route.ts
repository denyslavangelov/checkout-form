import { NextResponse } from 'next/server';

// Function to create a script tag in a Shopify store
export async function POST(request: Request) {
  try {
    const { shop, accessToken } = await request.json();

    if (!shop || !accessToken) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Create the script tag using Shopify Admin API
    const response = await fetch(`https://${shop}/admin/api/2024-01/script_tags.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken
      },
      body: JSON.stringify({
        script_tag: {
          event: 'onload',
          src: `${process.env.NEXT_PUBLIC_APP_URL}/cdn/shopify-integration.js`,
          display_scope: 'online_store',
          cache: false
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(JSON.stringify(error));
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating script tag:', error);
    return NextResponse.json(
      { error: 'Failed to create script tag' },
      { status: 500 }
    );
  }
}

// Function to list all script tags in a store
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get('shop');
    const accessToken = searchParams.get('accessToken');

    if (!shop || !accessToken) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const response = await fetch(`https://${shop}/admin/api/2024-01/script_tags.json`, {
      headers: {
        'X-Shopify-Access-Token': accessToken
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(JSON.stringify(error));
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error listing script tags:', error);
    return NextResponse.json(
      { error: 'Failed to list script tags' },
      { status: 500 }
    );
  }
}

// Function to delete a script tag
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get('shop');
    const accessToken = searchParams.get('accessToken');
    const scriptTagId = searchParams.get('scriptTagId');

    if (!shop || !accessToken || !scriptTagId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://${shop}/admin/api/2024-01/script_tags/${scriptTagId}.json`,
      {
        method: 'DELETE',
        headers: {
          'X-Shopify-Access-Token': accessToken
        }
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting script tag:', error);
    return NextResponse.json(
      { error: 'Failed to delete script tag' },
      { status: 500 }
    );
  }
} 