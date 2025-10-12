import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const config = await request.json();
    
    // Get the base URL from the request
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    
    // Encode the config as a URL parameter
    const encodedConfig = encodeURIComponent(JSON.stringify(config));
    
    // Generate the script URL
    const scriptUrl = `${baseUrl}/api/cdn/simple-script?config=${encodedConfig}`;
    
    // Return the script tag HTML
    const scriptTag = `<script src="${scriptUrl}"></script>`;
    
    return NextResponse.json({
      scriptUrl,
      scriptTag,
      config: config
    });
  } catch (error) {
    console.error('Error generating script URL:', error);
    return NextResponse.json({ error: 'Error generating script URL' }, { status: 500 });
  }
}

