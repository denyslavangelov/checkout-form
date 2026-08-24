import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'src', 'cdn', 'shopify-integration-page.js');
    const fileContent = await fs.promises.readFile(filePath, 'utf8');

    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': 'text/javascript; charset=utf-8',
        'Cache-Control': 'public, max-age=60',
        'Access-Control-Allow-Origin': '*',
        'Cross-Origin-Resource-Policy': 'cross-origin'
      }
    });
  } catch (error) {
    return new NextResponse('Error loading script', { status: 500 });
  }
}
