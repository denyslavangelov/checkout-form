'use client';

import { useState } from 'react';

export default function TestOriginalPage() {
  const [showIframe, setShowIframe] = useState(false);

  const handleButtonClick = () => {
    setShowIframe(true);
  };

  const handleClose = () => {
    setShowIframe(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Original Implementation Test</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
          <h2 className="text-xl font-semibold mb-4">Test Original Store Implementation</h2>
          <p className="text-gray-600 mb-6">
            This simulates exactly how the modal appears on stores when you click a checkout button.
            Click the button below to see the original iframe implementation.
          </p>
          
          <button
            onClick={handleButtonClick}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Click to Open Original Modal
          </button>
        </div>

        {showIframe && (
          <iframe 
            id="office-selector-iframe"
            src="/office-selector?productId=test-product&variantId=test-variant&quantity=1&config=%7B%22availableCouriers%22%3A%5B%22speedy%22%2C%22econt%22%5D%2C%22defaultCourier%22%3A%22speedy%22%2C%22defaultDeliveryType%22%3A%22office%22%7D"
            loading="eager"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '95%',
              maxWidth: '600px',
              height: 'auto',
              minHeight: '600px',
              maxHeight: '90vh',
              border: 'none',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              zIndex: 10000,
              background: 'black',
            }}
            allow="clipboard-write"
          />
        )}
      </div>
    </div>
  );
}
