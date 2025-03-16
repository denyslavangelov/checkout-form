import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Read the unminified JavaScript file
    const filePath = path.join(process.cwd(), 'src', 'cdn', 'shopify-integration.js');
    const fileContent = await fs.promises.readFile(filePath, 'utf8');

    // Return the JavaScript content with appropriate headers
    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'public, max-age=31536000',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Error serving shopify-integration.js:', error);
    return new NextResponse('Error loading script', { status: 500 });
  }
} 