import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Get data from request body
    const body = await request.json();
    const { countryId, name } = body;

    console.log(`Searching for districts with countryId: ${countryId}, name: ${name || '(empty)'}`);

    // Get credentials from env variables
    const username = process.env.SPEEDY_USERNAME || 'demo';
    const password = process.env.SPEEDY_PASSWORD || 'demo';

    // Validate input
    if (!countryId) {
      console.error("Missing countryId parameter");
      return NextResponse.json(
        { error: "Missing required parameter: countryId" },
        { status: 400 }
      );
    }

    // Call Speedy API to get districts for the country
    const requestBody: any = {
      userName: username,
      password: password,
      language: 'bg',
      countryId: parseInt(countryId)
    };

    // Only add name parameter if a search term is provided
    if (name) {
      requestBody.name = name;
    }

    console.log('🏢 Calling Speedy API with request body:', requestBody);
    
    const response = await fetch('https://api.speedy.bg/v1/location/complex', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('🏢 Speedy API response status:', response.status);
    console.log('🏢 Speedy API response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`🏢 Error from Speedy API: ${response.status} ${response.statusText}`, errorText);
      throw new Error('Failed to fetch districts from Speedy API');
    }

    const data = await response.json();
    console.log('🏢 Speedy API raw response:', data);
    console.log(`🏢 District search response for term "${name || '(empty)'}" returned ${data.complexes?.length || 0} results`);

    // Format districts for office selector
    let districts = data.complexes?.map((complex: any) => {
      return {
        id: complex.id,
        name: complex.name,
        siteId: complex.siteId,
        siteName: complex.siteName
      };
    }) || [];

    // If no districts returned from Speedy API, use mock data for testing
    if (districts.length === 0) {
      console.log('🏢 No districts from Speedy API, using mock data for testing');
      districts = [
        { id: 1, name: 'Sofia', siteId: 1, siteName: 'Sofia' },
        { id: 2, name: 'Plovdiv', siteId: 2, siteName: 'Plovdiv' },
        { id: 3, name: 'Varna', siteId: 3, siteName: 'Varna' },
        { id: 4, name: 'Burgas', siteId: 4, siteName: 'Burgas' },
        { id: 5, name: 'Ruse', siteId: 5, siteName: 'Ruse' }
      ];
    }

    return NextResponse.json({ districts }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  } catch (error) {
    console.error('Error searching districts:', error);
    return NextResponse.json(
      { error: 'Failed to search districts' },
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