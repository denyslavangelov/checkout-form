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

    // If no offices returned from Speedy API, use mock data for testing
    if (formattedOffices.length === 0) {
      formattedOffices = [
        { id: 1, name: 'Speedy Office Center', address: 'ул. Витоша 1, София', siteId: siteId, siteName: 'Sofia', value: '1|Speedy Office Center|ул. Витоша 1, София', label: 'Speedy Office Center: ул. Витоша 1, София' },
        { id: 2, name: 'Speedy Office Mall', address: 'бул. Цариградско шосе 125, София', siteId: siteId, siteName: 'Sofia', value: '2|Speedy Office Mall|бул. Цариградско шосе 125, София', label: 'Speedy Office Mall: бул. Цариградско шосе 125, София' },
        { id: 3, name: 'Speedy Office Plaza', address: 'ул. Граф Игнатиев 15, София', siteId: siteId, siteName: 'Sofia', value: '3|Speedy Office Plaza|ул. Граф Игнатиев 15, София', label: 'Speedy Office Plaza: ул. Граф Игнатиев 15, София' }
      ];
    }

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