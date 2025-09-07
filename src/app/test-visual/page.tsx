'use client';

import { useState } from 'react';
import { OfficeSelectorModal } from '@/components/office-selector-modal';

export default function TestVisualPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  const config = {
    availableCouriers: ['speedy', 'econt'],
    defaultCourier: 'speedy',
    defaultDeliveryType: 'office'
  };

  const handleOrderCreated = (checkoutUrl: string) => {
    const result = `Visual Test - Order created! Checkout URL: ${checkoutUrl}`;
    setTestResults(prev => [...prev, result]);
    console.log('🎨 Visual Test - Order created:', checkoutUrl);
  };

  const handleClose = () => {
    setIsOpen(false);
    setTestResults(prev => [...prev, 'Modal closed']);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      {/* Simulate page content behind the modal */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-6xl mx-auto p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Simulate product cards */}
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow-md p-4">
                <div className="h-48 bg-gray-200 rounded mb-4"></div>
                <h3 className="font-semibold text-gray-800 mb-2">Product {i}</h3>
                <p className="text-gray-600 text-sm mb-4">Product description goes here...</p>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">$29.99</span>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="relative z-10 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Office Selector Modal - Visual Test
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Visual Test Controls</h2>
          
          <div className="flex gap-4 mb-6 items-center">
            <button
              onClick={() => {
                console.log('🎨 Opening modal...');
                setIsOpen(true);
                setTestResults(prev => [...prev, 'Modal opened']);
              }}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Open Modal
            </button>
            
            <button
              onClick={() => {
                console.log('🎨 Closing modal...');
                setIsOpen(false);
                setTestResults(prev => [...prev, 'Modal closed']);
              }}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Close Modal
            </button>
            
            <button
              onClick={() => setTestResults([])}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Clear Results
            </button>
            
            <div className="ml-4">
              <span className="text-sm font-medium">Modal Status: </span>
              <span className={`text-sm font-bold ${isOpen ? 'text-green-600' : 'text-red-600'}`}>
                {isOpen ? 'OPEN' : 'CLOSED'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Visual Test Configuration:</h3>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                {JSON.stringify(config, null, 2)}
              </pre>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Visual Test Results:</h3>
              <div className="bg-gray-100 p-3 rounded max-h-64 overflow-auto">
                {testResults.length === 0 ? (
                  <p className="text-gray-500 italic">No visual test results yet...</p>
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
          <h2 className="text-xl font-semibold mb-4">Visual Test Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Click "Open Modal" to test the visual elements</li>
            <li>Test courier selection buttons (Speedy/Econt)</li>
            <li>Test delivery type buttons (Office/Address)</li>
            <li>Test city search input and dropdown</li>
            <li>Test office search input and dropdown</li>
            <li>Test the "Continue" button</li>
            <li>Test the close button (X)</li>
            <li>Check responsive design on different screen sizes</li>
            <li>Verify font inheritance and styling</li>
            <li>Test dropdown positioning and z-index</li>
          </ol>
        </div>
      </div>

      {/* Modal Component - Visual Test Only */}
      <OfficeSelectorModal
        isOpen={isOpen}
        onClose={handleClose}
        onOrderCreated={handleOrderCreated}
        productId="visual-test-product"
        variantId="visual-test-variant"
        quantity="1"
        config={config}
      />
      </div>

  );
}
