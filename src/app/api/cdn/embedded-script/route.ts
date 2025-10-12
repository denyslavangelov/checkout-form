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

    // Create the embedded script that includes both config and the integration script
    const embeddedScript = `
/**
 * Office Selector CDN Integration Script - Embedded Version
 * 
 * This script includes both the configuration and the integration code.
 * No need for separate script tags - just include this one script.
 * 
 * Usage:
 * <script src="${baseUrl}/api/cdn/embedded-script?config=YOUR_CONFIG_JSON"></script>
 * 
 * Where YOUR_CONFIG_JSON is a URL-encoded JSON string of your configuration.
 * 
 * Example:
 * <script src="${baseUrl}/api/cdn/embedded-script?config=%7B%22availableCouriers%22%3A%5B%22speedy%22%2C%22econt%22%5D%2C%22defaultCourier%22%3A%22speedy%22%2C%22shopify%22%3A%7B%22storeUrl%22%3A%22your-store.myshopify.com%22%2C%22accessToken%22%3A%22shpat_your_token%22%7D%7D"></script>
 */

(function() {
  'use strict';

  // Get configuration from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const configParam = urlParams.get('config');
  
  let embeddedConfig = {};
  if (configParam) {
    try {
      embeddedConfig = JSON.parse(decodeURIComponent(configParam));
    } catch (error) {
      console.error('🏢 Error parsing embedded config:', error);
    }
  }

  // Merge with any existing window.officeSelectorConfig (for backward compatibility)
  const config = { ...embeddedConfig, ...(window.officeSelectorConfig || {}) };
  
  // Set the config on window for the integration script to use
  window.officeSelectorConfig = config;

  // Log the configuration being used
  console.log('🏢 Embedded script loaded with config:', {
    hasShopify: !!config.shopify,
    storeUrl: config.shopify?.storeUrl,
    accessToken: config.shopify?.accessToken ? '***' + config.shopify.accessToken.slice(-4) : 'none',
    availableCouriers: config.availableCouriers,
    defaultCourier: config.defaultCourier
  });

  // Now include the actual integration script
  ${fileContent}
})();
`;

    // Return the embedded JavaScript content with appropriate headers
    return new NextResponse(embeddedScript, {
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
    console.error('Error serving embedded script:', error);
    return new NextResponse('Error loading embedded script', { status: 500 });
  }
}

