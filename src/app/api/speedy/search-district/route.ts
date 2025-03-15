import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    // Get site ID from URL params
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');
    const term = searchParams.get('term') || '';

    console.log(`Searching for districts in site ID: ${siteId} with term: ${term || '(empty)'}`);

    // Get credentials from env variables
    const username = process.env.SPEEDY_USERNAME || 'demo';
    const password = process.env.SPEEDY_PASSWORD || 'demo';

    // Validate input
    if (!siteId) {
      console.error("Missing siteId parameter");
      return NextResponse.json(
        { error: "Missing required parameter: siteId" },
        { status: 400 }
      );
    }

    // Call Speedy API to get districts for the site
    const requestBody: any = {
      userName: username,
      password: password,
      language: 'BG',
      siteId: siteId,
      countryId: 100 // Bulgaria
    };

    // Only add name parameter if a search term is provided
    if (term) {
      requestBody.name = term;
    }

    const response = await fetch('https://api.speedy.bg/v1/location/complex', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      console.error(`Error from Speedy API: ${response.status} ${response.statusText}`);
      throw new Error('Failed to fetch districts from Speedy API');
    }

    const data = await response.json();
    console.log(`District search response for term "${term || '(empty)'}" returned ${data.complexes?.length || 0} results`);

    // Format districts for autocomplete with prefixes
    const districts = data.complexes?.map((complex: any) => {
      // Extract the complex/district prefix if available
      const prefix = complex.namePrefix || 'ж.к.'; // Default to "ж.к." if prefix not available
      
      return {
        id: complex.id,
        name: complex.name,
        prefix: prefix,
        siteId: complex.siteId,
        siteName: complex.siteName,
        value: `${complex.id}|${complex.name}|${prefix}`,
        label: `${prefix} ${complex.name}`
      };
    }) || [];

    return NextResponse.json({ districts });
  } catch (error) {
    console.error('Error searching districts:', error);
    return NextResponse.json(
      { error: 'Failed to search districts' },
      { status: 500 }
    );
  }
} 