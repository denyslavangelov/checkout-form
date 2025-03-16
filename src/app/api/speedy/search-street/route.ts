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
    console.log('Searching for streets and complexes in site:', siteId, 'with term:', term);
    
    // Fetch streets
    const streetResponse = await fetch('https://api.speedy.bg/v1/location/street', {
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
        name: term || undefined
      })
    });

    // Fetch complexes
    const complexResponse = await fetch('https://api.speedy.bg/v1/location/complex', {
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
        name: term || undefined
      })
    });
    
    if (!streetResponse.ok || !complexResponse.ok) {
      const errorResponse = !streetResponse.ok ? streetResponse : complexResponse;
      const errorData = await errorResponse.json().catch(() => null);
      console.error('Speedy API error:', errorData);
      throw new Error(
        errorData?.error?.message || 
        `HTTP error! status: ${errorResponse.status}`
      );
    }

    const [streetData, complexData] = await Promise.all([
      streetResponse.json(),
      complexResponse.json()
    ]);

    console.log('Speedy API response:', {
      term,
      streetsCount: streetData.streets?.length || 0,
      complexesCount: complexData.complexes?.length || 0
    });

    // Format the streets for autocomplete with prefixes
    const formattedStreets = streetData.streets?.map((street: any) => {
      const prefix = street.namePrefix || 'ул.';
      return {
        id: street.id,
        name: street.name,
        prefix: prefix,
        type: 'street',
        districtId: street.districtId,
        districtName: street.districtName,
        siteId: street.siteId,
        siteName: street.siteName,
        value: `street|${street.id}|${street.name}|${street.districtName || ''}|${prefix}`,
        label: street.districtName 
          ? `${prefix} ${street.name} (${street.districtName})` 
          : `${prefix} ${street.name}`
      };
    }) || [];

    // Format complexes for autocomplete with prefixes
    const formattedComplexes = complexData.complexes?.map((complex: any) => {
      const prefix = complex.namePrefix || 'ж.к.';
      return {
        id: complex.id,
        name: complex.name,
        prefix: prefix,
        type: 'complex',
        siteId: complex.siteId,
        siteName: complex.siteName,
        value: `complex|${complex.id}|${complex.name}|${prefix}`,
        label: `${prefix} ${complex.name}`
      };
    }) || [];

    // Combine and sort results
    const combinedResults = [...formattedStreets, ...formattedComplexes].sort((a, b) => 
      a.label.localeCompare(b.label, 'bg')
    );

    return NextResponse.json({ streets: combinedResults });
  } catch (error) {
    console.error('Error in /api/speedy/search-street:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch street data' },
      { status: 500 }
    );
  }
} 