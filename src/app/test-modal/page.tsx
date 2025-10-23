'use client';

import { useState, useEffect, useMemo } from 'react';
import { OfficeSelectorModal } from '@/components/office-selector-modal';

export default function TestModalPage() {
  const [isOpen, setIsOpen] = useState(true);
  const [productId, setProductId] = useState('test-product-123');
  const [variantId, setVariantId] = useState('test-variant-456');
  const [quantity, setQuantity] = useState('1');
  const [testResults, setTestResults] = useState<string[]>([]);
  const [config, setConfig] = useState({
    availableCouriers: ['speedy', 'econt'],
    defaultCourier: 'speedy',
    defaultDeliveryType: 'office',
    shopify: {
      storeUrl: 'testing-client-check.myshopify.com',
      accessToken: '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'
    }
  });

  // CDN Integration Simulation
  const [cdnConfig, setCdnConfig] = useState({
    shopify: {
      storeUrl: 'testing-client-check.myshopify.com',
      accessToken: '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'
    },
    availableCouriers: ['speedy', 'econt'],
    defaultCourier: 'speedy',
    defaultDeliveryType: 'office',
    buttonTargets: {
      enableSmartDetection: true,
      customSelectors: [],
      excludeSelectors: [],
      buttonTypes: ['checkout', 'buy-now', 'cart-checkout'],
      debugMode: true,
      targetByClass: ['shopify-payment-button__button'],
      targetByName: ['checkout'],
      targetByClassAndName: []
    }
  });

  // Example of how to use the office selector with credentials:
  // 1. Via URL parameters: /office-selector?storeUrl=your-store.myshopify.com&accessToken=shpat_...
  // 2. Via config parameter: /office-selector?config={"shopify":{"storeUrl":"...","accessToken":"..."}}
  // 3. Via component props (as shown below)

  // Memoize URL parsing for performance (same as office-selector page)
  const urlData = useMemo(() => {
    if (typeof window === 'undefined') {
      return {
        product: 'test-product-123',
        variant: 'test-variant-456',
        parsedConfig: {
          availableCouriers: ['speedy', 'econt'],
          defaultCourier: 'speedy',
          defaultDeliveryType: 'office',
          shopify: {
            storeUrl: 'testing-client-check.myshopify.com',
            accessToken: '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'
          }
        }
      };
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const product = urlParams.get('productId') || 'test-product-123';
    const variant = urlParams.get('variantId') || 'test-variant-456';
    const quantity = urlParams.get('quantity') || '1';
    const configParam = urlParams.get('config');
    
    let parsedConfig = {
      availableCouriers: ['speedy', 'econt'],
      defaultCourier: 'speedy',
      defaultDeliveryType: 'office',
      shopify: {
        storeUrl: 'testing-client-check.myshopify.com',
        accessToken: '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'
      }
    };
    
    if (configParam) {
      try {
        parsedConfig = JSON.parse(decodeURIComponent(configParam));
      } catch (error) {
        console.error('🏢 Error parsing config:', error);
      }
    }
    
    return { product, variant, quantity: quantity || '1', parsedConfig };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    setProductId(urlData.product);
    setVariantId(urlData.variant);
    setQuantity(urlData.quantity || '1');
    setConfig(urlData.parsedConfig);

    // Listen for messages from parent window
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'open-office-selector') {
        setProductId(event.data.productId || '');
        setVariantId(event.data.variantId || '');
        setIsOpen(true);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [urlData]);

  const handleOrderCreated = (checkoutUrl: string) => {
    const result = `Order created! Checkout URL: ${checkoutUrl}`;
    setTestResults(prev => [...prev, result]);
    
    // Only run in browser environment
    if (typeof window === 'undefined') return;
    
    
    // For cart checkout, redirect the parent window to Shopify checkout
    if (productId === 'cart' && variantId === 'cart') {
      if (window.parent) {
        window.parent.location.href = '/checkout';
      } else {
        window.location.href = '/checkout';
      }
    } else {
      // For Buy Now, redirect the parent window to the checkout URL
      if (window.parent) {
        window.parent.location.href = checkoutUrl;
      } else {
        window.location.href = checkoutUrl;
      }
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setTestResults(prev => [...prev, 'Modal closed']);
    // Notify parent window that modal is closed
    if (typeof window !== 'undefined' && window.parent) {
      window.parent.postMessage({ type: 'office-selector-closed' }, '*');
    }
  };

  // Simulate CDN Integration Functions - EXACTLY like live server
  const simulateCdnIntegration = () => {
    const result = '🔄 Simulating CDN Integration (Live Server Mode)...';
    setTestResults(prev => [...prev, result]);
    
    // Use the SAME baseUrl as the live server CDN script
    const baseUrl = 'https://checkout-form-zeta.vercel.app';
    const configParam = encodeURIComponent(JSON.stringify(cdnConfig));
    const officeSelectorUrl = `${baseUrl}/office-selector?productId=${encodeURIComponent(productId)}&variantId=${encodeURIComponent(variantId)}&quantity=${encodeURIComponent(quantity)}&config=${configParam}`;
    
    const result2 = `📡 Live Server CDN would create iframe with URL: ${officeSelectorUrl}`;
    setTestResults(prev => [...prev, result2]);
    
    
    // Actually open the iframe URL in a new window to test it
    const result3 = `🌐 Opening iframe URL in new window for testing...`;
    setTestResults(prev => [...prev, result3]);
    window.open(officeSelectorUrl, '_blank');
  };

  const testWithCartCheckout = () => {
    setProductId('cart');
    setVariantId('cart');
    setQuantity('1');
    setTestResults(prev => [...prev, '🛒 Switched to Cart Checkout mode']);
  };

  const testWithBuyNow = () => {
    setProductId('test-product-123');
    setVariantId('test-variant-456');
    setQuantity('1');
    setTestResults(prev => [...prev, '🛍️ Switched to Buy Now mode']);
  };

  // Create iframe exactly like the CDN script does
  const createCdnIframe = () => {
    const result = '🔄 Creating iframe exactly like CDN script...';
    setTestResults(prev => [...prev, result]);
    
    // Remove existing iframe if any
    const existingIframe = document.getElementById('office-selector-iframe');
    if (existingIframe) {
      existingIframe.remove();
    }
    
    // Use localhost for testing (but simulate the exact CDN behavior)
    const baseUrl = window.location.origin; // Use localhost instead of live server
    const configParam = encodeURIComponent(JSON.stringify(cdnConfig));
    const officeSelectorUrl = `${baseUrl}/office-selector?productId=${encodeURIComponent(productId)}&variantId=${encodeURIComponent(variantId)}&quantity=${encodeURIComponent(quantity)}&config=${configParam}`;
    
    
    // Create iframe exactly like CDN script
    const iframe = document.createElement('iframe');
    iframe.id = 'office-selector-iframe';
    iframe.src = officeSelectorUrl;
    iframe.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border: none;
      z-index: 999999;
      background: rgba(0, 0, 0, 0.5);
    `;
    
    // Add backdrop
    const backdrop = document.createElement('div');
    backdrop.id = 'office-selector-backdrop';
    backdrop.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 999998;
    `;
    
    document.body.appendChild(backdrop);
    document.body.appendChild(iframe);
    
    const result2 = `📡 Created iframe with URL: ${officeSelectorUrl}`;
    setTestResults(prev => [...prev, result2]);
    
    // Listen for messages from iframe (like CDN script does)
    const messageHandler = (event: MessageEvent) => {
      const allowedOrigins = [
        'https://checkout-form-zeta.vercel.app',
        'http://localhost:3000',
        'http://localhost:3001',
        baseUrl
      ];
      
      if (!allowedOrigins.includes(event.origin)) {
        return;
      }
      
      if (event.data.type === 'office-selector-closed') {
        const result3 = '📤 Received office-selector-closed message from iframe';
        setTestResults(prev => [...prev, result3]);
        
        // Remove iframe and backdrop
        iframe.remove();
        backdrop.remove();
        window.removeEventListener('message', messageHandler);
      }
    };
    
    window.addEventListener('message', messageHandler);
    
  };

  const updateCdnConfig = (field: string, value: any) => {
    setCdnConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Close any existing iframe
  const closeCdnIframe = () => {
    const existingIframe = document.getElementById('office-selector-iframe');
    const existingBackdrop = document.getElementById('office-selector-backdrop');
    
    if (existingIframe) {
      existingIframe.remove();
    }
    if (existingBackdrop) {
      existingBackdrop.remove();
    }
    
    setTestResults(prev => [...prev, '🗑️ Closed CDN iframe']);
  };

  // Test the iframe URL directly in a new window
  const testIframeUrl = () => {
    const baseUrl = window.location.origin;
    const configParam = encodeURIComponent(JSON.stringify(cdnConfig));
    const officeSelectorUrl = `${baseUrl}/office-selector?productId=${encodeURIComponent(productId)}&variantId=${encodeURIComponent(variantId)}&quantity=${encodeURIComponent(quantity)}&config=${configParam}`;
    
    setTestResults(prev => [...prev, `🌐 Testing iframe URL: ${officeSelectorUrl}`]);
    window.open(officeSelectorUrl, '_blank');
  };

  // Update the main config when CDN config changes
  useEffect(() => {
    setConfig(prev => ({
      ...prev,
      ...cdnConfig
    }));
  }, [cdnConfig]);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Office Selector Modal Test
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
          
          <div className="flex flex-wrap gap-4 mb-6">
            <button
              onClick={() => setIsOpen(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Open Modal
            </button>
            
            <button
              onClick={simulateCdnIntegration}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              Simulate CDN Integration
            </button>
            
            <button
              onClick={createCdnIframe}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Create CDN Iframe
            </button>
            
            <button
              onClick={closeCdnIframe}
              className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Close CDN Iframe
            </button>
            
            <button
              onClick={testIframeUrl}
              className="bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
            >
              Test Iframe URL
            </button>
            
            <button
              onClick={testWithCartCheckout}
              className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition-colors"
            >
              Test Cart Checkout
            </button>
            
            <button
              onClick={testWithBuyNow}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Test Buy Now
            </button>
            
            <button
              onClick={() => setTestResults([])}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Clear Results
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Current Configuration:</h3>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto max-h-64">
                {JSON.stringify(config, null, 2)}
              </pre>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">CDN Configuration:</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Store URL:</label>
                  <input
                    type="text"
                    value={cdnConfig.shopify.storeUrl}
                    onChange={(e) => updateCdnConfig('shopify', { ...cdnConfig.shopify, storeUrl: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="your-store.myshopify.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Access Token:</label>
                  <input
                    type="text"
                    value={cdnConfig.shopify.accessToken}
                    onChange={(e) => updateCdnConfig('shopify', { ...cdnConfig.shopify, accessToken: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="shpat_..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Default Courier:</label>
                  <select
                    value={cdnConfig.defaultCourier}
                    onChange={(e) => updateCdnConfig('defaultCourier', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="speedy">Speedy</option>
                    <option value="econt">Econt</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Test Results:</h3>
              <div className="bg-gray-100 p-3 rounded max-h-64 overflow-auto">
                {testResults.length === 0 ? (
                  <p className="text-gray-500 italic">No test results yet...</p>
                ) : (
                  <ul className="space-y-2">
                    {testResults.map((result, index) => (
                      <li key={index} className="text-sm">
                        <span className="text-blue-600 font-mono">
                          [{new Date().toLocaleTimeString()}]
                        </span>{' '}
                        {result}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">CDN Integration Test Instructions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Basic Testing:</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-700 text-sm">
                <li>Click "Open Modal" to test the office selector</li>
                <li>Try selecting different couriers (Speedy/Econt)</li>
                <li>Test delivery types (Office/Address)</li>
                <li>Search for cities and select offices</li>
                <li>Click "Continue" to test order creation</li>
                <li>Check the results panel for any errors or success messages</li>
                <li>Check browser console for detailed logs</li>
              </ol>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">CDN Simulation (Live Server Mode):</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-700 text-sm">
                <li>Edit the CDN Configuration (Store URL, Access Token)</li>
                <li>Click "Simulate CDN Integration" to see the live server URL and open it in new window</li>
                <li>Click "Create CDN Iframe" to create an iframe on localhost (but with CDN behavior)</li>
                <li>Click "Close CDN Iframe" to remove any existing iframe</li>
                <li>Click "Test Cart Checkout" to simulate cart checkout flow</li>
                <li>Click "Test Buy Now" to simulate buy now flow</li>
                <li>Check the console for detailed CDN simulation logs</li>
                <li>Test with different configurations to see how the iframe URL changes</li>
              </ol>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">💡 Live Server CDN Simulation</h4>
            <p className="text-blue-800 text-sm">
              This page simulates EXACTLY how the CDN script works on the live server. 
              "Simulate CDN Integration" opens the live server URL in a new window. 
              "Create CDN Iframe" creates an iframe on localhost but with the same CDN behavior. 
              Use this to debug issues that only happen on the live server.
            </p>
          </div>
        </div>
      </div>

      {/* Modal Component - Same as office-selector page */}
      <OfficeSelectorModal
        isOpen={isOpen}
        onClose={handleClose}
        onOrderCreated={handleOrderCreated}
        productId={productId}
        variantId={variantId}
        quantity={quantity}
        config={config}
      />
    </div>
  );
}
