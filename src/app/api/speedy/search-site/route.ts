import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const term = searchParams.get('term');
  
  // Get credentials from environment variables
  const username = process.env.SPEEDY_USERNAME || "1904618";
  const password = process.env.SPEEDY_PASSWORD || "6661214521";

  // Allow empty search term to get all sites
  const searchTerm = term || '';

  try {
    
    const response = await fetch('https://api.speedy.bg/v1/location/site', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userName: username,
        password: password,
        language: 'bg',
        countryId: 100,
        name: searchTerm
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
    
    if (data.sites && data.sites.length > 0) {
      // Format the sites for autocomplete with prefixes
      const formattedSites = data.sites.map((site: any) => {
        // Extract the site prefix if available
        const prefix = site.namePrefix || 'гр.'; // Default to "гр." if prefix not available
        
        return {
          id: site.id,
          name: site.name,
          prefix: prefix,
          postCode: site.postCode,
          value: `${site.name}|${site.postCode}|${site.id}|${prefix}`,
          label: `${prefix} ${site.name}`
        };
      });

      return NextResponse.json({ sites: formattedSites }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    } else {
      return NextResponse.json({ sites: [] }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }
  } catch (error) {
    console.error('Error in /api/speedy/search-site:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch site data' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}