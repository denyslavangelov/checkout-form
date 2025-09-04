'use client';

import React, { useEffect } from 'react';

// Extend Window interface to include our custom function
declare global {
  interface Window {
    showOfficeSelector?: (event: any) => void;
  }
}

export default function TestBuyNowPage() {
  useEffect(() => {
    // Add the product JSON to the page for the integration to read
    const productJson = {
      "id": 8597449146499,
      "title": "First Foods Recipe Book",
      "handle": "first-foods-recipe-book",
      "description": "A comprehensive guide to introducing solid foods to your baby",
      "published_at": "2024-01-01T00:00:00Z",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "vendor": "Test Vendor",
      "type": "Books",
      "tags": ["baby", "food", "recipe"],
      "price": 4895,
      "price_min": 4895,
      "price_max": 4895,
      "available": true,
      "price_varies": false,
      "compare_at_price": null,
      "compare_at_price_min": null,
      "compare_at_price_max": null,
      "compare_at_price_varies": false,
      "variants": [
        {
          "id": 45304463556739,
          "title": "Default Title",
          "option1": "Default Title",
          "option2": null,
          "option3": null,
          "sku": "FFRB-001",
          "requires_shipping": true,
          "taxable": true,
          "featured_image": null,
          "available": true,
          "name": "First Foods Recipe Book - Default Title",
          "public_title": "Default Title",
          "options": ["Default Title"],
          "price": 4895,
          "weight": 500,
          "compare_at_price": null,
          "inventory_management": "shopify",
          "barcode": "123456789",
          "featured_media": {
            "alt": "First Foods Recipe Book",
            "id": 123456789,
            "position": 1,
            "preview_image": {
              "aspect_ratio": 1.0,
              "height": 1024,
              "width": 1024,
              "src": "https://via.placeholder.com/1024x1024"
            }
          },
          "requires_selling_plan": false,
          "selling_plan_allocations": []
        }
      ],
      "images": [
        "https://via.placeholder.com/1024x1024"
      ],
      "featured_image": "https://via.placeholder.com/1024x1024",
      "options": [
        {
          "name": "Title",
          "position": 1,
          "values": ["Default Title"]
        }
      ],
      "url": "/products/first-foods-recipe-book"
    };

    // Add the product JSON script to the page
    const script = document.createElement('script');
    script.type = 'application/json';
    script.id = 'ProductJson-product-template';
    script.textContent = JSON.stringify(productJson);
    document.head.appendChild(script);

    // Add the shopify integration script
    const integrationScript = document.createElement('script');
    integrationScript.src = '/cdn/shopify-integration.js';
    document.head.appendChild(integrationScript);

    console.log('🏢 Test Buy Now page loaded');
    console.log('📦 Product JSON added:', productJson);
    console.log('📦 Integration script added');

    return () => {
      // Cleanup
      const existingScript = document.getElementById('ProductJson-product-template');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  const handleBuyNowClick = (e: React.MouseEvent) => {
    e.preventDefault();
    console.log('🏢 Buy Now button clicked manually');
    
    // Manually trigger the office selector
    if (window.showOfficeSelector) {
      window.showOfficeSelector(e);
    } else {
      console.error('showOfficeSelector function not found');
    }
  };

  return (
    <div style={{ 
      fontFamily: 'Arial, sans-serif', 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '20px',
      lineHeight: '1.6'
    }}>
      <h1>🏢 Buy Now Office Selector Test</h1>
      
      <div style={{
        background: '#e7f3ff',
        border: '1px solid #b3d9ff',
        borderRadius: '4px',
        padding: '16px',
        marginBottom: '20px'
      }}>
        <h3 style={{ marginTop: 0, color: '#0066cc' }}>How This Works</h3>
        <p>This page tests the updated shopify-integration.js that now shows an office selector for Buy Now buttons instead of the checkout form.</p>
        <ol>
          <li>Click the "Buy Now" button below</li>
          <li>You should see an office selector modal (not the checkout form)</li>
          <li>Select a city and office</li>
          <li>Click "Create Order & Checkout"</li>
          <li>You'll be redirected to Shopify checkout with the office address pre-filled</li>
        </ol>
      </div>

      <div style={{
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '20px',
        margin: '20px 0',
        background: '#f9f9f9'
      }}>
        <h2 style={{ marginTop: 0, color: '#333' }}>First Foods Recipe Book</h2>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          A comprehensive guide to introducing solid foods to your baby, with 50+ nutritious recipes and feeding tips.
        </p>
        <div style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#007cba',
          marginBottom: '20px'
        }}>
          $48.95
        </div>
        
        {/* Buy Now button that will trigger office selector */}
        <div className="shopify-payment-button">
          <button 
            className="shopify-payment-button__button" 
            data-testid="Checkout-button"
            onClick={handleBuyNowClick}
            style={{
              background: '#007cba',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '4px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              marginRight: '10px'
            }}
          >
            Buy Now
          </button>
        </div>

        {/* Alternative Buy Now button with different class */}
        <button 
          className="buy-now-button" 
          onClick={handleBuyNowClick}
          style={{
            background: '#28a745',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          Buy Now (Alt)
        </button>
      </div>

      <div style={{
        background: '#e7f3ff',
        border: '1px solid #b3d9ff',
        borderRadius: '4px',
        padding: '16px',
        marginBottom: '20px'
      }}>
        <h3 style={{ marginTop: 0, color: '#0066cc' }}>What Should Happen</h3>
        <p>When you click the "Buy Now" button above:</p>
        <ul>
          <li>✅ <strong>Office selector modal appears</strong> (not checkout form)</li>
          <li>✅ <strong>City dropdown loads</strong> from Speedy API</li>
          <li>✅ <strong>Office dropdown loads</strong> when city is selected</li>
          <li>✅ <strong>Office preview shows</strong> selected office details</li>
          <li>✅ <strong>Draft order created</strong> with office address + Bulgaria</li>
          <li>✅ <strong>Redirect to checkout</strong> with pre-filled address</li>
        </ul>
      </div>

      <div style={{
        background: '#fff3cd',
        border: '1px solid #ffeaa7',
        borderRadius: '4px',
        padding: '16px',
        marginBottom: '20px'
      }}>
        <h3 style={{ marginTop: 0, color: '#856404' }}>Debug Info</h3>
        <p>Check the browser console for debug messages. You should see:</p>
        <ul>
          <li>🏢 Test Buy Now page loaded</li>
          <li>📦 Product JSON added</li>
          <li>📦 Integration script added</li>
          <li>🏢 Buy Now button clicked manually</li>
          <li>🏢 Showing office selector for Buy Now button</li>
        </ul>
      </div>
    </div>
  );
}
