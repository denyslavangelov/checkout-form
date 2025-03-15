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

    const response = await fetch('https://api.speedy.bg/v1/location/quarter', {
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
    console.log(`District search response for term "${term || '(empty)'}" returned ${data.quarters?.length || 0} results`);

    // Format districts for autocomplete
    const districts = data.quarters?.map((quarter: any) => {
      return {
        id: quarter.id,
        name: quarter.name,
        siteId: quarter.siteId,
        siteName: quarter.siteName,
        value: `${quarter.id}|${quarter.name}`,
        label: quarter.name
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