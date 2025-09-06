import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Read the JavaScript file
    const filePath = path.join(process.cwd(), 'src', 'cdn', 'shopify-integration.js');
    const fileContent = await fs.promises.readFile(filePath, 'utf8');

    // Return the JavaScript content with headers to avoid ORB blocking
    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': 'text/javascript; charset=utf-8',
        'Cache-Control': 'public, max-age=31536000',
        'Access-Control-Allow-Origin': '*',
        'Cross-Origin-Resource-Policy': 'cross-origin'
      }
    });
  } catch (error) {
    console.error('Error serving shopify-integration.js:', error);
    return new NextResponse('Error loading script', { status: 500 });
  }
}
