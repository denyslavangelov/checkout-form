import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get('siteId');
  const term = searchParams.get('term') || '';
  
  // Get credentials from environment variables
  const username = process.env.SPEEDY_USERNAME || "1904618";
  const password = process.env.SPEEDY_PASSWORD || "6661214521";

  if (!siteId) {
    return NextResponse.json(
      { error: 'Missing site ID' },
      { status: 400 }
    );
  }

  try {
    console.log('Searching for streets in site:', siteId, 'with term:', term);
    
    const response = await fetch('https://api.speedy.bg/v1/location/street', {
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
    console.log('Speedy Streets API response:', {
      term,
      streetsCount: data.streets?.length || 0
    });

    // Format the streets for autocomplete
    const formattedStreets = data.streets?.map((street: any) => ({
      id: street.id,
      name: street.name,
      districtId: street.districtId,
      districtName: street.districtName,
      siteId: street.siteId,
      siteName: street.siteName,
      value: `${street.id}|${street.name}|${street.districtName || ''}`,
      label: street.districtName ? `${street.name} (${street.districtName})` : street.name
    })) || [];

    return NextResponse.json({ streets: formattedStreets });
  } catch (error) {
    console.error('Error in /api/speedy/search-street:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch street data' },
      { status: 500 }
    );
  }
} 