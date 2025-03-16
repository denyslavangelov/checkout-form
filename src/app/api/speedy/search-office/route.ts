import { NextResponse } from 'next/server';

/**
 * API endpoint to search for Speedy offices in a specific site/city
 */
export async function GET(request: Request) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');
    const term = searchParams.get('term') || '';

    if (!siteId) {
      return NextResponse.json(
        { error: 'Missing required siteId parameter' },
        { status: 400 }
      );
    }

    // Fetch offices from the Speedy API
    const apiUrl = `https://api.speedy.bg/v1/location/office?siteId=${encodeURIComponent(siteId)}`;
    console.log('Fetching offices from Speedy API:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Speedy API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    let offices = data.offices || [];
    
    // If a search term is provided, filter the offices
    if (term && term.trim()) {
      const normalizedTerm = term.trim().toLowerCase();
      
      console.log(`Filtering ${offices.length} offices by term: "${normalizedTerm}"`);
      
      offices = offices.filter((office: any) => {
        const officeName = (office.name || '').toLowerCase();
        const officeAddress = (office.address?.fullAddressString || '').toLowerCase();
        
        return officeName.includes(normalizedTerm) || 
               officeAddress.includes(normalizedTerm) ||
               (office.id && office.id.toString().includes(normalizedTerm));
      });
      
      console.log(`Found ${offices.length} offices matching term: "${normalizedTerm}"`);
    }

    // Format the response
    return NextResponse.json({
      offices: offices
    });

  } catch (error) {
    console.error('Error searching Speedy offices:', error);
    return NextResponse.json(
      { error: 'Failed to search offices' },
      { status: 500 }
    );
  }
} 