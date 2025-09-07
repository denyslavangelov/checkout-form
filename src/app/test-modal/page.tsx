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
    console.log('🏢 Test - Order created:', checkoutUrl);
    
    // Only run in browser environment
    if (typeof window === 'undefined') return;
    
    console.log('🏢 Order created with checkout URL:', checkoutUrl);
    console.log('🏢 Product ID:', productId, 'Variant ID:', variantId);
    
    // For cart checkout, redirect the parent window to Shopify checkout
    if (productId === 'cart' && variantId === 'cart') {
      console.log('🏢 Cart checkout - redirecting to /checkout');
      if (window.parent) {
        window.parent.location.href = '/checkout';
      } else {
        window.location.href = '/checkout';
      }
    } else {
      // For Buy Now, redirect the parent window to the checkout URL
      console.log('🏢 Buy Now - redirecting to checkout URL:', checkoutUrl);
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

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Office Selector Modal Test
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
          
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setIsOpen(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Open Modal
            </button>
            
            <button
              onClick={() => setTestResults([])}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Clear Results
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Test Configuration:</h3>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                {JSON.stringify(config, null, 2)}
              </pre>
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
          <h2 className="text-xl font-semibold mb-4">Test Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Click "Open Modal" to test the office selector</li>
            <li>Try selecting different couriers (Speedy/Econt)</li>
            <li>Test delivery types (Office/Address)</li>
            <li>Search for cities and select offices</li>
            <li>Click "Continue" to test order creation</li>
            <li>Check the results panel for any errors or success messages</li>
            <li>Check browser console for detailed logs</li>
          </ol>
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
