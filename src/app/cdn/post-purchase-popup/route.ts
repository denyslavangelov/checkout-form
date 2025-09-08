import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Read the post-purchase popup script
    const scriptContent = `
/**
 * Post-Purchase Popup for Shopify Thank You Page
 * 
 * This script can be injected into Shopify's thank you page to show
 * a post-purchase popup with additional product offers.
 * 
 * Usage:
 * 1. Add this script to your Shopify theme's checkout.liquid file
 * 2. Or inject it via a Shopify app
 * 3. Configure the products and settings below
 */

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    // Base URL for the post-purchase page
    baseUrl: 'https://checkout-form-zeta.vercel.app',
    
    // Popup settings
    showDelay: 3000, // Show popup after 3 seconds
    autoClose: 30000, // Auto close after 30 seconds
    
    // Post-purchase products
    products: [
      {
        id: 'upsell-1',
        title: 'Допълнителна гаранция',
        price: 2999, // in cents
        image: '/api/placeholder/200/200',
        description: 'Разширена гаранция за вашия продукт',
        discount: 20
      },
      {
        id: 'upsell-2', 
        title: 'Аксесоари комплект',
        price: 1999,
        image: '/api/placeholder/200/200',
        description: 'Полезни аксесоари за вашия продукт',
        discount: 15
      },
      {
        id: 'upsell-3',
        title: 'Специална поддръжка',
        price: 999,
        image: '/api/placeholder/200/200', 
        description: 'Приоритетна поддръжка и консултации',
        discount: 10
      }
    ]
  };

  // Check if we're on a thank you page
  function isThankYouPage() {
    return window.location.pathname.includes('/thank_you') || 
           window.location.pathname.includes('/checkout/thank_you') ||
           document.querySelector('[data-thank-you]') ||
           document.querySelector('.thank-you') ||
           document.querySelector('.order-confirmation');
  }

  // Get order information from the page
  function getOrderInfo() {
    const orderNumber = document.querySelector('.order-number')?.textContent ||
                       document.querySelector('[data-order-number]')?.textContent ||
                       window.Shopify?.checkout?.order_id;
    
    const orderId = document.querySelector('.order-id')?.textContent ||
                    document.querySelector('[data-order-id]')?.textContent ||
                    window.Shopify?.checkout?.order_id;

    return {
      orderNumber: orderNumber?.replace(/[^\\d]/g, ''),
      orderId: orderId?.replace(/[^\\d]/g, '')
    };
  }

  // Create and show the popup
  function showPostPurchasePopup() {
    // Don't show if already shown
    if (document.querySelector('.post-purchase-popup')) {
      return;
    }

    const orderInfo = getOrderInfo();
    
    // Create popup HTML
    const popupHTML = \`
      <div class="post-purchase-popup" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <div style="
          background: white;
          border-radius: 12px;
          max-width: 600px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        ">
          <!-- Header -->
          <div style="
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 20px 24px;
            border-bottom: 1px solid #e5e7eb;
          ">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="
                width: 24px;
                height: 24px;
                background: #3b82f6;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 14px;
              ">🎁</div>
              <h2 style="
                font-size: 20px;
                font-weight: bold;
                color: #111827;
                margin: 0;
              ">Специална оферта за вас!</h2>
            </div>
            <button onclick="this.closest('.post-purchase-popup').remove()" style="
              background: none;
              border: none;
              color: #6b7280;
              cursor: pointer;
              font-size: 20px;
              padding: 4px;
            ">×</button>
          </div>

          <!-- Content -->
          <div style="padding: 24px;">
            <p style="
              color: #6b7280;
              margin-bottom: 24px;
              text-align: center;
              line-height: 1.5;
            ">
              Благодарим за покупката! Ето няколко продукта, които може да ви заинтересуват:
            </p>

            <div style="display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
              \${CONFIG.products.map(product => \`
                <div style="
                  border: 1px solid #e5e7eb;
                  border-radius: 8px;
                  padding: 16px;
                  text-align: center;
                ">
                  <div style="
                    width: 100%;
                    height: 120px;
                    background: #f3f4f6;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 12px;
                    color: #9ca3af;
                    font-size: 24px;
                  ">🛍️</div>
                  
                  <h3 style="
                    font-weight: 600;
                    color: #111827;
                    margin-bottom: 8px;
                    font-size: 16px;
                  ">\${product.title}</h3>
                  
                  <p style="
                    font-size: 14px;
                    color: #6b7280;
                    margin-bottom: 12px;
                    line-height: 1.4;
                  ">\${product.description}</p>
                  
                  <div style="margin-bottom: 12px;">
                    \${product.discount ? \`
                      <div style="font-size: 12px; color: #6b7280; text-decoration: line-through;">
                        \${(product.price / 100).toFixed(2)} лв.
                      </div>
                    \` : ''}
                    <div style="
                      font-size: 18px;
                      font-weight: bold;
                      color: #059669;
                    ">
                      \${((product.price * (1 - (product.discount || 0) / 100)) / 100).toFixed(2)} лв.
                    </div>
                    \${product.discount ? \`
                      <span style="
                        background: #fef2f2;
                        color: #dc2626;
                        font-size: 12px;
                        padding: 2px 8px;
                        border-radius: 4px;
                        margin-left: 8px;
                      ">-\${product.discount}%</span>
                    \` : ''}
                  </div>

                  <button onclick="addToCart('\${product.id}', \${product.price}, \${product.discount || 0})" style="
                    width: 100%;
                    background: #3b82f6;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    padding: 8px 16px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: background-color 0.2s;
                  " onmouseover="this.style.backgroundColor='#2563eb'" onmouseout="this.style.backgroundColor='#3b82f6'">
                    Добави в кошницата
                  </button>
                </div>
              \`).join('')}
            </div>

            <div style="
              margin-top: 24px;
              text-align: center;
              display: flex;
              gap: 12px;
              justify-content: center;
              flex-wrap: wrap;
            ">
              <button onclick="this.closest('.post-purchase-popup').remove()" style="
                background: white;
                color: #374151;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                padding: 8px 16px;
                font-size: 14px;
                cursor: pointer;
              ">
                Не, благодаря
              </button>
              <button onclick="window.location.href='\${CONFIG.baseUrl}'" style="
                background: #3b82f6;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 8px 16px;
                font-size: 14px;
                cursor: pointer;
              ">
                Продължете пазаруването
              </button>
            </div>
          </div>
        </div>
      </div>
    \`;

    // Add popup to page
    document.body.insertAdjacentHTML('beforeend', popupHTML);

    // Auto close after delay
    setTimeout(() => {
      const popup = document.querySelector('.post-purchase-popup');
      if (popup) {
        popup.remove();
      }
    }, CONFIG.autoClose);
  }

  // Add to cart function
  window.addToCart = function(productId, price, discount) {
    // In a real implementation, you would make an API call to add the product to cart
    console.log('Adding to cart:', { productId, price, discount });
    
    // For now, redirect to the main site with the product
    const cartUrl = \`\${CONFIG.baseUrl}/cart?added=\${productId}&price=\${price}&discount=\${discount}\`;
    window.location.href = cartUrl;
  };

  // Initialize
  function init() {
    if (isThankYouPage()) {
      console.log('Post-purchase popup: Thank you page detected');
      
      // Show popup after delay
      setTimeout(showPostPurchasePopup, CONFIG.showDelay);
    }
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
`;

    return new NextResponse(scriptContent, {
      headers: {
        'Content-Type': 'application/javascript',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });

  } catch (error) {
    console.error('Error serving post-purchase popup script:', error);
    return new NextResponse('Error loading script', { status: 500 });
  }
}

// Handle preflight OPTIONS requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}
