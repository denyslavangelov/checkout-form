import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Read the minified file
    const filePath = path.join(process.cwd(), 'src', 'cdn', 'shopify-integration.min.js');
    const fileContent = fs.readFileSync(filePath, 'utf8');

    // Return the file with proper headers
    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error serving CDN file:', error);
    return new NextResponse('Error serving file', { status: 500 });
  }
} 