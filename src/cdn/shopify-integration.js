/**
 * Office Selector CDN Integration Script
 * 
 * To configure Shopify credentials, set window.officeSelectorConfig before loading this script:
 * 
 * <script>
 * window.officeSelectorConfig = {
 *   shopify: {
 *     storeUrl: 'your-store.myshopify.com',
 *     accessToken: 'shpat_your_access_token_here'
 *   },
 *   availableCouriers: ['speedy', 'econt'],
 *   defaultCourier: 'speedy',
 *   defaultDeliveryType: 'office'
 * };
 * </script>
 * <script src="https://checkout-form-zeta.vercel.app/cdn/shopify-integration.js"></script>
 */
(function() {
  'use strict';

  // Configuration object - can be set before script loads
  const config = window.officeSelectorConfig || {};
  
  // Ensure all configuration properties have defaults
  const defaultConfig = {
    availableCouriers: ['speedy', 'econt'], // Default: both couriers available
    defaultCourier: 'speedy', // Default selected courier
    defaultDeliveryType: 'office', // Default delivery type
    shopify: {
      storeUrl: '', // Shopify store URL (e.g., 'your-store.myshopify.com')
      accessToken: '' // Shopify access token (e.g., 'shpat_...')
    },
    buttonTargets: {
      targetByClass: [], // Array of class names to target (e.g., ['cart__checkout-button', 'checkout-btn'])
      debugMode: false // Show red dots on targeted buttons for debugging
    }
  };
  
  // Merge user config with defaults
  const finalConfig = {
    ...defaultConfig,
    ...config,
    shopify: {
      ...defaultConfig.shopify,
      ...(config.shopify || {})
    },
    buttonTargets: {
      ...defaultConfig.buttonTargets,
      ...(config.buttonTargets || {})
    }
  };    

  // Office selector iframe container
  const OFFICE_SELECTOR_HTML = `
    <div id="office-selector-backdrop" style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      z-index: 9999;
      display: none;
    "></div>
    <iframe 
      id="office-selector-iframe"
      src=""
      loading="eager"
      style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 95%;
        max-width: 500px;
        height: auto;
        min-height: 600px;
        z-index: 10000;
        display: none;
        background: transparent;
        border-radius: 10px;
      "
      allow="clipboard-write"
    ></iframe>
  `;
  
  // Initialize button targeting by class names
  if (finalConfig.buttonTargets.targetByClass.length > 0) {
    initializeClassBasedTargeting();
  }

  // Function to show office selector
  function showOfficeSelector(event) {
    
    // Prevent default behavior
    event.preventDefault();
    event.stopPropagation();
    
    // Get the button element
    const button = event.target;
    
    // Determine if this is a Buy Now button or regular checkout
    const isBuyNow = button.textContent?.toLowerCase().includes('buy now') ||
                     button.textContent?.toLowerCase().includes('купи сега') ||
                     button.className?.toLowerCase().includes('buy-now') ||
                     button.className?.toLowerCase().includes('shopify-payment-button__button') ||
                     button.id?.toLowerCase().includes('buy-now');
    
    
    let productData = null;
    let isCartCheckout = false;
    
    if (isBuyNow) {
      // For Buy Now buttons, try to get product data from the button or its parent
      if (button.dataset.productId && button.dataset.variantId) {
        productData = {
          productId: button.dataset.productId,
          variantId: button.dataset.variantId
        };
      } else {
        // Try to find product data in the page
        const productForm = button.closest('form[action*="/cart/add"]');
        if (productForm) {
          const variantInput = productForm.querySelector('input[name="id"]');
          if (variantInput) {
            productData = {
              productId: 'unknown',
              variantId: variantInput.value
            };
          }
        }
      }
      
      // Get quantity from the form or button
      let quantity = 1; // Default quantity
      if (button.dataset.quantity) {
        quantity = parseInt(button.dataset.quantity) || 1;
      } else {
        // Try to find quantity input in the form
        const productForm = button.closest('form[action*="/cart/add"]');
        if (productForm) {
          const quantityInput = productForm.querySelector('input[name="quantity"]');
          if (quantityInput) {
            quantity = parseInt(quantityInput.value) || 1;
          }
        }
      }
      
      // Add quantity to product data
      if (productData) {
        productData.quantity = quantity;
      }
      
      // If no product data found, use test data
      if (!productData) {
        productData = {
          productId: '8378591772803',
          variantId: '44557290995843'
        };
      }
    } else {
      // For regular checkout, this is a cart checkout
      isCartCheckout = true;
      productData = {
        productId: 'cart',
        variantId: 'cart',
        isCartCheckout: true
      };
    }
    
    // Production URL for live sites - can be overridden by config
    const baseUrl = config.baseUrl || 'https://checkout-form-zeta.vercel.app';
    
    // Add backdrop and iframe to page if not already there
    if (!document.getElementById('office-selector-iframe')) {
      document.body.insertAdjacentHTML('beforeend', OFFICE_SELECTOR_HTML);
    }
    
    // Show the backdrop and iframe
    const backdrop = document.getElementById('office-selector-backdrop');
    const iframe = document.getElementById('office-selector-iframe');
    
    if (backdrop && iframe) {
      // Show backdrop first for immediate visual feedback
      backdrop.style.display = 'block';
      
      // Add click handler to backdrop to close modal
      backdrop.onclick = (e) => {
        if (e.target === backdrop) {
          hideOfficeSelector();
        }
      };
      
      // Disable body scrolling
      document.body.style.overflow = 'hidden';
      
      // Add keyboard support (ESC key)
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          hideOfficeSelector();
          document.removeEventListener('keydown', handleKeyDown);
        }
      };
      document.addEventListener('keydown', handleKeyDown);
      
      // Set iframe source with product data and configuration
      const configParam = encodeURIComponent(JSON.stringify(finalConfig));
      const quantityParam = productData.quantity ? `&quantity=${encodeURIComponent(productData.quantity)}` : '';
      const officeSelectorUrl = `${baseUrl}/office-selector?productId=${encodeURIComponent(productData.productId)}&variantId=${encodeURIComponent(productData.variantId)}${quantityParam}&config=${configParam}`;
      
      
      iframe.src = officeSelectorUrl;
      
      iframe.style.display = 'block';
      
      // Listen for messages from the iframe
      const messageHandler = (event) => {
        
        // Allow messages from our iframe domain
        const allowedOrigins = [
          'https://checkout-form-zeta.vercel.app',
          baseUrl
        ];
        
        
        if (!allowedOrigins.includes(event.origin)) {
          return;
        }
        
        
        if (event.data.type === 'iframe-ready') {
        } else if (event.data.type === 'office-selector-closed') {
          hideOfficeSelector();
          window.removeEventListener('message', messageHandler);
        } else if (event.data.type === 'order-created') {
          window.location.href = event.data.checkoutUrl;
          hideOfficeSelector();
          window.removeEventListener('message', messageHandler);
        } else if (event.data.type === 'request-cart-data' || event.data.type === 'request-fresh-cart-data') {
          
          // Fetch fresh cart data from Shopify
          fetch('/cart.js')
            .then(response => {
              if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
              }
              return response.json();
            })
            .then(freshCartData => {
              
              // Update global cart data
              window.shopifyCart = freshCartData;
              window.cartData = freshCartData;
              
              // Store in localStorage for Chrome mobile fallback
              try {
                localStorage.setItem('shopify-cart-data', JSON.stringify(freshCartData));
              } catch (error) {
              }
              
              // Send fresh cart data to the office selector iframe
              if (iframe.contentWindow) {
                
                try {
                  iframe.contentWindow.postMessage({
                    type: 'cart-data',
                    cart: freshCartData
                  }, baseUrl);
                } catch (error) {
                  console.error('🏢 Error sending message to iframe:', error);
                }
              } else {
                console.error('🏢 No iframe contentWindow found');
              }
            })
            .catch(error => {
              console.error('🏢 Error fetching fresh cart data:', error);
              
              // Fallback to cached cart data
              const fallbackCart = window.shopifyCart || window.cartData;   
              
              if (iframe.contentWindow) {
                if (fallbackCart) {
                  iframe.contentWindow.postMessage({
                    type: 'cart-data',
                    cart: fallbackCart
                  }, baseUrl);
                } else {
                  console.error('🏢 No fallback cart data available');
                  iframe.contentWindow.postMessage({
                    type: 'cart-data',
                    cart: null
                  }, baseUrl);
                }
              } else {
                console.error('🏢 No iframe contentWindow found for fallback');
              }
            });
        }
      };
      
      window.addEventListener('message', messageHandler);
    } else {
      console.error('🏢 Office selector modal or iframe not found');
    }
  }

  // Hide office selector
  function hideOfficeSelector() {
    const backdrop = document.getElementById('office-selector-backdrop');
    const iframe = document.getElementById('office-selector-iframe');
    
    if (backdrop) {
      backdrop.style.display = 'none';
    }
    
    if (iframe) {
      iframe.style.display = 'none';
    }
    
    // Re-enable body scrolling
    document.body.style.overflow = '';
  }

  // Initialize class-based button targeting
  function initializeClassBasedTargeting() {
    // Find and attach to existing buttons
    finalConfig.buttonTargets.targetByClass.forEach(className => {
      const buttons = document.querySelectorAll(`.${className}`);
      
      buttons.forEach(button => {
        if (button && !button._hasOurHandler) {
          addOurCheckoutHandler(button);
        }
      });
    });
    
    // Watch for new buttons being added to the DOM
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            // Check if the added node itself matches any class
            finalConfig.buttonTargets.targetByClass.forEach(className => {
              if (node.classList && node.classList.contains(className)) {
                if (!node._hasOurHandler) {
                  addOurCheckoutHandler(node);
                }
              }
            });
            
            // Check if any child elements match our classes
            finalConfig.buttonTargets.targetByClass.forEach(className => {
              const newButtons = node.querySelectorAll && node.querySelectorAll(`.${className}`);
              if (newButtons) {
                newButtons.forEach(button => {
                  if (!button._hasOurHandler) {
                    addOurCheckoutHandler(button);
                  }
                });
              }
            });
          }
        });
      });
    });
    
    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  
  // Function to add our checkout handler
  function addOurCheckoutHandler(button) {
    if (button && !button._hasOurHandler) {
      button._hasOurHandler = true;
      
      // Store original onclick
      const originalOnclick = button.onclick;
      
      // Set new onclick that calls our function
      button.onclick = function(event) {
          event.preventDefault();
          event.stopPropagation();
          showOfficeSelector(event);
          return false;
      };
      
      // Add visual indicator - red dot (if debug mode is enabled)
      if (finalConfig.buttonTargets.debugMode) {
        const dot = document.createElement('div');
        dot.style.cssText = `
          position: absolute;
          top: 2px;
          right: 2px;
          width: 10px;
          height: 10px;
          background: #ef4444;
          border: 2px solid white;
          border-radius: 50%;
          z-index: 1000;
          pointer-events: none;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        `;
        
        // Make sure button has relative positioning for absolute dot
        if (button.style.position !== 'absolute' && button.style.position !== 'relative') {
          button.style.position = 'relative';
        }
        
        button.appendChild(dot);
      }
      
    }
  }
  

  // Make showOfficeSelector available globally for testing
  window.showOfficeSelector = showOfficeSelector;



  // When page loads, make cart data globally available
  document.addEventListener('DOMContentLoaded', function() {
    // Get cart data on page load and make it available for the checkout form
    fetch('/cart.js')
      .then(response => response.json())
      .then(cartData => {
        window.shopifyCart = cartData;
        // Store for checkout form
        window.cartData = cartData;
      })
      .catch(error => console.error('Error fetching cart data:', error));
  });
})(); 
