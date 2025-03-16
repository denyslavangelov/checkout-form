import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Read the script file
    const scriptPath = path.join(process.cwd(), 'src', 'cdn', 'shopify-integration.js');
    const script = fs.readFileSync(scriptPath, 'utf-8');
    
    // Return the script with appropriate headers
    return new NextResponse(script, {
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Error serving integration script:', error);
    return new NextResponse('console.error("Failed to load checkout integration script");', {
      headers: {
        'Content-Type': 'application/javascript'
      },
      status: 500
    });
  }
} 