import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { siteId, term } = body;
    
    // Get credentials from environment variables
    const username = process.env.SPEEDY_USERNAME || "1904618";
    const password = process.env.SPEEDY_PASSWORD || "6661214521";

    if (!siteId) {
      return NextResponse.json(
        { error: 'Missing site ID' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        }
      );
    }
    
    const response = await fetch('https://api.speedy.bg/v1/location/office', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userName: username,
        password: password,
        language: 'bg',
        siteId: parseInt(siteId),
        countryId: 100,
        name: term || undefined // Only include name if term is provided
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('Speedy API error:', errorData);
      throw new Error(
        errorData?.error?.message || 
        `HTTP error! status: ${response.status}`
      );
    }

    const data = await response.json();

    // Format the offices for office selector
    let formattedOffices = data.offices?.map((office: any) => ({
      id: office.id,
      name: office.name,
      address: office.address,
      siteId: office.siteId,
      siteName: office.siteName,
      value: `${office.id}|${office.name}|${office.address}`,
      label: `${office.name}: ${office.address}`
    })) || [];

    // Return empty array if no offices found - no mock data

    return NextResponse.json({ offices: formattedOffices }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  } catch (error) {
    console.error('Error in /api/speedy/search-office:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch office data' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}