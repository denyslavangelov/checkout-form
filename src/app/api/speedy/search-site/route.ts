import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const username = searchParams.get('username');
  const password = searchParams.get('password');
  const term = searchParams.get('term');
  const postcode = searchParams.get('postcode');

  if (!term) {
    return NextResponse.json(
      { error: 'Missing search term' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch('https://api.speedy.bg/v1/location/site', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userName: 1904618,
        password: 6661214521,
        language: 'bg',
        name: term || '',
        postCode: postcode || '',
        countryId: 100
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.error?.message || 
        `HTTP error! status: ${response.status}`
      );
    }

    const data = await response.json();
    console.log('Speedy API response:', data);

    // Форматираме резултата за autocomplete с повече информация
    const formattedSites = data.sites?.map((site: any) => ({
      id: site.id,
      name: site.name,
      postCode: site.postCode,
      value: `${site.name}|${site.postCode}`,
      label: `${site.name}${site.postCode ? ` (${site.postCode})` : ''}`
    })) || [];

    return NextResponse.json({ sites: formattedSites });
  } catch (error) {
    console.error('Error in /api/speedy/search-site:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch site data' },
      { status: 500 }
    );
  }
} 