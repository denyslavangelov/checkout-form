import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  try {
    // Read the JavaScript file
    const filePath = path.join(process.cwd(), 'src', 'cdn', 'shopify-integration.js');
    const fileContent = await fs.promises.readFile(filePath, 'utf8');

    // Get the base URL from the request
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    // Get configuration from URL parameters
    const urlParams = new URLSearchParams(url.search);
    const configParam = urlParams.get('config');
    
    let embeddedConfig = {};
    if (configParam) {
      try {
        embeddedConfig = JSON.parse(decodeURIComponent(configParam));
      } catch (error) {
        console.error('🏢 Error parsing config parameter:', error);
      }
    }

    // Create the simple embedded script
    const simpleScript = `
/**
 * Office Selector - Simple Integration Script
 * 
 * This script includes your configuration and the integration code in one file.
 * 
 * Usage:
 * <script src="${baseUrl}/api/cdn/simple-script?config=YOUR_CONFIG_JSON"></script>
 * 
 * Example with your config:
 * <script src="${baseUrl}/api/cdn/simple-script?config=${encodeURIComponent(JSON.stringify(embeddedConfig))}"></script>
 */

(function() {
  'use strict';

  // Set the configuration
  window.officeSelectorConfig = ${JSON.stringify(embeddedConfig, null, 2)};


  // Include the integration script
  ${fileContent}
})();
`;

    // Return the simple script
    return new NextResponse(simpleScript, {
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'public, max-age=31536000',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Cross-Origin-Embedder-Policy': 'unsafe-none'
      }
    });
  } catch (error) {
    console.error('Error serving simple script:', error);
    return new NextResponse('Error loading simple script', { status: 500 });
  }
}

