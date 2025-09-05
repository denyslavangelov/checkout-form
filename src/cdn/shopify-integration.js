(function() {
  'use strict';

  // Override onclick property to intercept all button clicks
  const originalOnClickDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'onclick');
  
  Object.defineProperty(HTMLElement.prototype, 'onclick', {
    set: function(value) {
      const result = originalOnClickDescriptor.set.call(this, value);
      
      // Add our handler after a short delay to ensure it runs after the original
        setTimeout(() => {
          addOurCheckoutHandler(this);
        }, 100);
      
      return result;
    },
    get: originalOnClickDescriptor.get
  });

  // Office selector iframe container
  const OFFICE_SELECTOR_HTML = `
    <div id="office-selector-modal" style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: none;
      z-index: 10000;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        background: white;
        border-radius: 8px;
        width: 90%;
        max-width: 500px;
        height: auto;
        max-height: 500px;
        position: relative;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        border: 1px solid #e5e7eb;
        overflow: hidden;
      ">
        <iframe 
          id="office-selector-iframe"
          src=""
          style="
            width: 100%;
            height: 450px;
            border: none;
            border-radius: 8px;
          "
          allow="clipboard-write"
        ></iframe>
      </div>
    </div>
  `;

  // Function to show office selector
  function showOfficeSelector(event) {
    console.log('🏢 Showing office selector');
    console.log('🏢 Event details:', event);
    
    // Prevent default behavior
    event.preventDefault();
    event.stopPropagation();
    
    // Get the button element
    const button = event.target;
    console.log('🏢 Button element:', button);
    
    // Determine if this is a Buy Now button or regular checkout
    const isBuyNow = button.textContent?.toLowerCase().includes('buy now') ||
                     button.textContent?.toLowerCase().includes('купи сега') ||
                     button.className?.toLowerCase().includes('buy-now') ||
                     button.id?.toLowerCase().includes('buy-now');
    
    console.log('🏢 Is Buy Now button:', isBuyNow);
    
    let productData = null;
    let isCartCheckout = false;
    
    if (isBuyNow) {
      // For Buy Now buttons, try to get product data from the button or its parent
      if (button.dataset.productId && button.dataset.variantId) {
        productData = {
          productId: button.dataset.productId,
          variantId: button.dataset.variantId
        };
        console.log('🏢 Found product data in button attributes:', productData);
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
            console.log('🏢 Found variant ID in form:', productData);
          }
        }
      }
      
      // If no product data found, use test data
      if (!productData) {
        productData = {
          productId: '8378591772803',
          variantId: '44557290995843'
        };
        console.log('🏢 Using test product data:', productData);
      }
    } else {
      // For regular checkout, this is a cart checkout
      isCartCheckout = true;
      productData = {
        productId: 'cart',
        variantId: 'cart',
        isCartCheckout: true
      };
      console.log('🏢 This is a cart checkout');
    }
    
    // Production URL for live sites
    const baseUrl = 'https://checkout-form-zeta.vercel.app';
    
    // Add modal to page if not already there
    if (!document.getElementById('office-selector-modal')) {
      console.log('🏢 Adding office selector modal to page');
      document.body.insertAdjacentHTML('beforeend', OFFICE_SELECTOR_HTML);
    }
    
    // Show the modal with iframe
    const modal = document.getElementById('office-selector-modal');
    const iframe = document.getElementById('office-selector-iframe');
    
    if (modal && iframe) {
      // Set iframe source with product data
      const officeSelectorUrl = `${baseUrl}/office-selector?productId=${encodeURIComponent(productData.productId)}&variantId=${encodeURIComponent(productData.variantId)}`;
      iframe.src = officeSelectorUrl;
      
      modal.style.display = 'flex';
      console.log('🏢 Office selector modal shown with iframe:', officeSelectorUrl);
      
      // Listen for messages from the iframe
      const messageHandler = (event) => {
        console.log('🏢 Parent received message:', event.data, 'from origin:', event.origin);
        
        // Allow messages from our iframe domain
        const allowedOrigins = [
          'https://checkout-form-zeta.vercel.app'
        ];
        
        if (!allowedOrigins.includes(event.origin)) {
          console.log('🏢 Message origin not allowed:', event.origin, 'allowed:', allowedOrigins);
          return;
        }
        
        if (event.data.type === 'office-selector-closed') {
          console.log('🏢 Office selector closed');
          hideOfficeSelector();
          window.removeEventListener('message', messageHandler);
        } else if (event.data.type === 'order-created') {
          console.log('🏢 Order created, redirecting to checkout');
          window.location.href = event.data.checkoutUrl;
          hideOfficeSelector();
          window.removeEventListener('message', messageHandler);
        } else if (event.data.type === 'request-cart-data' || event.data.type === 'request-fresh-cart-data') {
          console.log('🏢 Office selector requesting cart data:', event.data.type);
          
          // Fetch fresh cart data from Shopify
          console.log('🏢 Fetching fresh cart data from /cart.js...');
          fetch('/cart.js')
            .then(response => {
              console.log('🏢 Cart fetch response status:', response.status);
              if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
              }
              return response.json();
            })
            .then(freshCartData => {
              console.log('🏢 Fresh cart data fetched successfully:', freshCartData);
              
              // Update global cart data
              window.shopifyCart = freshCartData;
              window.cartData = freshCartData;
              
              // Send fresh cart data to the office selector iframe
              if (iframe.contentWindow) {
                console.log('🏢 Sending fresh cart data to iframe:', freshCartData);
                
                iframe.contentWindow.postMessage({
                  type: 'cart-data',
                  cart: freshCartData
                }, event.origin);
              } else {
                console.error('🏢 No iframe contentWindow found');
              }
            })
            .catch(error => {
              console.error('🏢 Error fetching fresh cart data:', error);
              
              // Fallback to cached cart data
              const fallbackCart = window.shopifyCart || window.cartData;
              console.log('🏢 Using fallback cart data:', fallbackCart);
              
              if (iframe.contentWindow) {
                if (fallbackCart) {
                  iframe.contentWindow.postMessage({
                    type: 'cart-data',
                    cart: fallbackCart
                  }, event.origin);
                } else {
                  console.error('🏢 No fallback cart data available');
                  iframe.contentWindow.postMessage({
                    type: 'cart-data',
                    cart: null
                  }, event.origin);
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
    const modal = document.getElementById('office-selector-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  // Function to check if an element is a checkout button
  function isCheckoutButton(element) {
    if (!element || !element.tagName) return false;

    const tagName = element.tagName.toLowerCase();
    const text = element.textContent?.toLowerCase().trim() || '';
    const className = element.className?.toLowerCase() || '';
    const id = element.id?.toLowerCase() || '';
    const type = element.type?.toLowerCase() || '';
    const name = element.name?.toLowerCase() || '';

    // Smart detection patterns for different Shopify themes
    const patterns = {
      // Primary target: All submit buttons (covers most checkout/buy now buttons)
      submitButtons: [
        type === 'submit'
      ],
      
      // Buy Now / Quick Buy patterns
      buyNow: [
        // Text patterns
        text.includes('buy now') || text.includes('buy it now') || text.includes('купи сега'),
        // Class patterns
        className.includes('buy-now') || className.includes('quick-buy') || className.includes('shopify-payment-button'),
        // ID patterns
        id.includes('buy-now') || id.includes('quick-buy'),
        // Type patterns
        type === 'button' && (className.includes('payment') || className.includes('checkout')),
        // Specific Shopify payment button pattern
        type === 'button' && className.includes('shopify-payment-button__button') && className.includes('shopify-payment-button__button--unbranded')
      ],
      
      // Checkout patterns
      checkout: [
        // Text patterns
        text.includes('checkout') || text.includes('proceed to checkout') || text.includes('go to checkout') || 
        text.includes('завърши поръчката') || text.includes('продължи към плащане'),
        // Class patterns
        className.includes('checkout') || className.includes('cart-checkout') || className.includes('proceed'),
        // Specific cart checkout button pattern
        className.includes('cart__checkout-button') && className.includes('button'),
        // ID patterns
        id.includes('checkout') || id.includes('cart-checkout') || id.includes('proceed'),
        // Form submit patterns
        (type === 'submit' && (className.includes('checkout') || name.includes('checkout')))
      ],
      
      // Exclude patterns (Add to Cart, etc.)
      exclude: [
        // Add to Cart patterns
        text.includes('add to cart') || text.includes('добави в кошницата') || text.includes('add to bag'),
        className.includes('add-to-cart') || className.includes('cart-add') || className.includes('product-form__submit'),
        id.includes('add-to-cart') || id.includes('cart-add') || id.startsWith('productsubmitbutton-'),
        name.includes('add') && (name.includes('cart') || name.includes('product')),
        // Other exclusions
        className.includes('close') || className.includes('remove') || className.includes('delete'),
        element.getAttribute('aria-label')?.toLowerCase().includes('close') ||
        element.getAttribute('aria-label')?.toLowerCase().includes('remove')
      ]
    };

    // Check if button matches any exclusion patterns
    const isExcluded = patterns.exclude.some(pattern => pattern);
    if (isExcluded) {
      console.log('🏢 Button excluded:', { tagName, text, className, id, reason: 'matches exclusion pattern' });
      return false;
    }

    // Check if button matches any target patterns
    const isSubmitButton = patterns.submitButtons.some(pattern => pattern);
    const isBuyNow = patterns.buyNow.some(pattern => pattern);
    const isCheckout = patterns.checkout.some(pattern => pattern);
    const isTargetButton = isSubmitButton || isBuyNow || isCheckout;

    // Only log when we actually detect a target button (reduce console spam)
    if (isTargetButton) {
      console.log('🎯 Target button detected:', {
        tagName,
        text: text.substring(0, 30),
        className: className.substring(0, 50),
        id,
        type,
        result: isTargetButton ? (isSubmitButton ? 'SUBMIT' : isBuyNow ? 'BUY_NOW' : 'CHECKOUT') : 'NONE'
      });
    }

    return isTargetButton;
  }
  
  // Function to add our checkout handler
  function addOurCheckoutHandler(button) {
    if (button && !button._hasOurHandler) {
      button._hasOurHandler = true;
      
      // Store original onclick
      const originalOnclick = button.onclick;
      
      // Set new onclick that calls our function
      button.onclick = function(event) {
        console.log('🏢 Button clicked:', {
          tagName: button.tagName,
          className: button.className,
          id: button.id,
          text: button.textContent
        });
        
        if (isCheckoutButton(button)) {
          console.log('🏢 This is a checkout button, showing office selector');
          event.preventDefault();
          event.stopPropagation();
          showOfficeSelector(event);
          return false; // Prevent default behavior
        }
        
        console.log('🏢 Not a checkout button, calling original handler');
        // If not a checkout button, call original handler
        if (originalOnclick) {
          return originalOnclick.call(this, event);
        }
      };
      
      // Add visual indicator - red dot
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
      
      console.log('🏢 Added red dot indicator to button:', {
        tagName: button.tagName,
        text: button.textContent?.substring(0, 30),
        className: button.className,
        id: button.id
      });
    }
  }
  
  // Function to find and initialize all checkout buttons
  function findAndInitializeCheckoutButtons() {
    // Comprehensive selectors to catch all possible buttons
    const selectors = [
      // All buttons and submit inputs
      'button',
      'input[type="submit"]',
      'input[type="button"]',
      'a[role="button"]',
      
      // Specific type selectors
      'button[type="submit"]',
      'button[type="button"]',
      
      // Class-based selectors
      'button[class*="checkout"]',
      'button[class*="buy-now"]',
      'button[class*="buy"]',
      'button[class*="payment"]',
      'button[class*="cart"]',
      'button[class*="proceed"]',
      'button[class*="add-to-cart"]',
      'button[class*="product-form"]',
      'button[class*="shopify-payment"]',
      
      // ID-based selectors
      'button[id*="checkout"]',
      'button[id*="buy-now"]',
      'button[id*="buy"]',
      'button[id*="payment"]',
      'button[id*="cart"]',
      'button[id*="proceed"]',
      'button[id*="add-to-cart"]',
      'button[id*="product"]',
      
      // Link-based selectors
      'a[class*="checkout"]',
      'a[class*="buy-now"]',
      'a[class*="buy"]',
      'a[class*="payment"]',
      'a[class*="cart"]',
      'a[class*="proceed"]',
      'a[id*="checkout"]',
      'a[id*="buy-now"]',
      'a[id*="buy"]',
      'a[id*="payment"]',
      'a[id*="cart"]',
      'a[id*="proceed"]'
    ];
    
    const buttons = [];
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => buttons.push(el));
    });
    
    // Log all found buttons for debugging
    if (buttons.length > 0) {
      console.log(`🔍 Scanning ${buttons.length} potential checkout buttons:`, buttons.map(b => ({
        tagName: b.tagName,
        text: b.textContent?.trim().substring(0, 30),
        className: b.className,
        id: b.id,
        type: b.type
      })));
    }
    
    buttons.forEach(button => {
      if (isCheckoutButton(button)) {
        addOurCheckoutHandler(button);
      }
    });
  }
  
  // Function to continuously monitor for checkout buttons
  function monitorForCheckoutButtons() {
    findAndInitializeCheckoutButtons();
  }
  
  // Monitor the DOM for changes to catch when buttons appear
  function startObserving() {
    // Check for checkout buttons (reduced frequency to avoid console spam)
    setInterval(monitorForCheckoutButtons, 2000);
    
    // Also use MutationObserver for more efficient monitoring
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (isCheckoutButton(node)) {
                addOurCheckoutHandler(node);
              }
              // Also check children
              const buttons = node.querySelectorAll ? node.querySelectorAll('button, input[type="submit"], a') : [];
              buttons.forEach(button => {
                if (isCheckoutButton(button)) {
                  addOurCheckoutHandler(button);
                }
              });
            }
          });
        }
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'display', 'visibility']
    });
    
    console.log('Persistent checkout button monitoring started');
  }
  
  function openCustomCheckout(event) {
  console.log('Opening custom checkout...');
  
    // Determine if this is a "Buy Now" button click
    const isBuyNow = event.target.textContent?.toLowerCase().includes('buy now') ||
                     event.target.textContent?.toLowerCase().includes('купи сега') ||
                     event.target.className?.toLowerCase().includes('buy-now') ||
                     event.target.id?.toLowerCase().includes('buy-now');
    
    console.log('Is Buy Now button:', isBuyNow);
    
    if (isBuyNow) {
      console.log('Buy Now button clicked - showing office selector');
      showOfficeSelector(event);
      return;
    }
    
    // For regular checkout, show office selector first, then proceed to checkout
    console.log('Regular checkout button clicked - showing office selector');
    showOfficeSelector(event);
    return;
    
    // Extract product data from the page
    const productData = extractProductFromPage();
    console.log('Extracted product data:', productData);
    
    if (!productData) {
      console.error('Could not extract product data from page');
      return;
    }
    
              // Production URL for live sites
     const baseUrl = 'https://checkout-form-zeta.vercel.app';
     
     // Create iframe for checkout form
        const iframe = document.createElement('iframe');
     iframe.src = `${baseUrl}/iframe`;
     iframe.style.cssText = `
       position: fixed;
       top: 0;
       left: 0;
       width: 100%;
       height: 100%;
       border: none;
       z-index: 10000;
       background: white;
     `;
     
     document.body.appendChild(iframe);
    
     // Listen for messages from iframe
     const messageHandler = (event) => {
                const allowedOrigins = [
           'https://checkout-form-zeta.vercel.app'
         ];
       if (!allowedOrigins.includes(event.origin)) return;
      
      switch (event.data.type) {
        case 'checkout-closed':
          console.log('Checkout form closed');
          document.body.removeChild(iframe);
          window.removeEventListener('message', messageHandler);
          break;
        case 'request-cart-data':
          console.log('Checkout form requesting cart data');
            iframe.contentWindow.postMessage({
              type: 'cart-data',
            cart: productData
          }, baseUrl);
          break;
        case 'submit-checkout':
          console.log('Checkout form submitted');
          handleOrderCreation(event.data.formData, event.source);
          break;
        case 'GET_SHOPIFY_DOMAIN':
          console.log('Checkout form requesting Shopify domain');
          const domain = window.location.hostname;
          event.source.postMessage({
            type: 'SHOPIFY_DOMAIN_RESPONSE',
            domain: domain
          }, '*');
          break;
        case 'checkout-cleanup-done':
          console.log('Checkout cleanup completed');
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
          window.removeEventListener('message', messageHandler);
          break;
      }
    };
    
    window.addEventListener('message', messageHandler);
  }

  // Function to handle order creation
  async function handleOrderCreation(formData, source) {
    try {
      console.log('Creating order with data:', formData);
      
      const response = await fetch('https://checkout-form-zeta.vercel.app/api/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create order');
      }

      const data = await response.json();
      console.log('Order created successfully:', data);

      // Send success response back to iframe
        source.postMessage({
          type: 'order-created',
        orderId: data.orderId,
        checkoutUrl: data.checkoutUrl
        }, '*');

    } catch (error) {
      console.error('Error creating order:', error);
      
      // Send error response back to iframe
      source.postMessage({
        type: 'order-error',
        error: error.message
      }, '*');
    }
  }

  // Helper function to extract product data from the page
  function extractProductFromPage() {
    try {
      console.log('Attempting to extract product data from page elements...');
      
      // Try to get product data from various sources
      let productData = null;
      
      // Method 1: Check for Shopify product object
      if (typeof window.ShopifyAnalytics !== 'undefined' && window.ShopifyAnalytics.meta) {
        const meta = window.ShopifyAnalytics.meta;
        if (meta.product) {
          productData = {
            product: {
              id: meta.product.id,
              title: meta.product.title,
              vendor: meta.product.vendor,
              price: meta.product.price,
              image: meta.product.image,
              variant_id: meta.product.variant_id
            }
          };
          console.log('Found product data in ShopifyAnalytics.meta:', productData);
        }
      }
      
      // Method 2: Check for product JSON in script tags
      if (!productData) {
        const productScripts = document.querySelectorAll('script[type="application/json"][data-product-json]');
        for (const script of productScripts) {
          try {
            const product = JSON.parse(script.textContent);
            if (product && product.id) {
              productData = { product };
              console.log('Found product data in script tag:', productData);
              break;
            }
          } catch (e) {
            console.warn('Failed to parse product script:', e);
          }
        }
      }
      
      // Method 3: Check for product data in meta tags
      if (!productData) {
        const productIdMeta = document.querySelector('meta[property="product:id"]');
        const productTitleMeta = document.querySelector('meta[property="product:title"]');
        const productPriceMeta = document.querySelector('meta[property="product:price:amount"]');
        
        if (productIdMeta) {
          productData = {
            product: {
              id: productIdMeta.content,
              title: productTitleMeta?.content || 'Product',
              price: productPriceMeta ? parseInt(productPriceMeta.content) * 100 : 0
            }
          };
          console.log('Found product data in meta tags:', productData);
        }
      }
      
      // Method 4: Try to extract from form data
      if (!productData) {
        const addToCartForm = document.querySelector('form[action*="/cart/add"]');
        if (addToCartForm) {
          const variantInput = addToCartForm.querySelector('input[name="id"]');
          const quantityInput = addToCartForm.querySelector('input[name="quantity"]');
          
          if (variantInput) {
            productData = {
              product: {
                variant_id: variantInput.value,
                quantity: quantityInput ? parseInt(quantityInput.value) || 1 : 1
              }
            };
            console.log('Found product data in form:', productData);
          }
        }
      }
      
      // Method 5: Check for product data in window object
      if (!productData) {
        const windowKeys = Object.keys(window);
        for (const key of windowKeys) {
          if (key.toLowerCase().includes('product') && typeof window[key] === 'object') {
            const obj = window[key];
            if (obj && (obj.id || obj.variant_id)) {
              productData = { product: obj };
              console.log(`Found product data in window.${key}:`, productData);
              break;
            }
          }
        }
      }
      
      if (productData) {
        // Normalize the product data structure
        const product = productData.product;
        if (product) {
          // Ensure we have required fields
          if (!product.variant_id && product.id) {
            product.variant_id = product.id;
          }
          if (!product.quantity) {
            product.quantity = 1;
          }
          if (!product.price) {
            product.price = 0;
          }
        }
      }
      
      return productData;
    } catch (e) {
      console.error('Error extracting product from page:', e);
      return null;
    }
  }

  // Make showOfficeSelector available globally for testing
  window.showOfficeSelector = showOfficeSelector;

  // Start when the page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserving);
  } else {
    startObserving();
  }

  // Test function to analyze button HTML
  function testButtonDetection(buttonHtml) {
    console.log('🧪 Testing button detection for:', buttonHtml);
    
    // Create a temporary element to parse the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = buttonHtml;
    const button = tempDiv.firstElementChild;
    
    if (!button) {
      console.log('❌ Invalid button HTML');
      return;
    }
    
    // Run the detection logic
    const tagName = button.tagName.toLowerCase();
    const text = button.textContent?.toLowerCase().trim() || '';
    const className = button.className?.toLowerCase() || '';
    const id = button.id?.toLowerCase() || '';
    const type = button.type?.toLowerCase() || '';
    const name = button.name?.toLowerCase() || '';

    // Smart detection patterns for different Shopify themes
    const patterns = {
      // Primary target: All submit buttons (covers most checkout/buy now buttons)
      submitButtons: [
        type === 'submit'
      ],
      
      // Buy Now / Quick Buy patterns
      buyNow: [
        // Text patterns
        text.includes('buy now') || text.includes('buy it now') || text.includes('купи сега'),
        // Class patterns
        className.includes('buy-now') || className.includes('quick-buy') || className.includes('shopify-payment-button'),
        // ID patterns
        id.includes('buy-now') || id.includes('quick-buy'),
        // Type patterns
        type === 'button' && (className.includes('payment') || className.includes('checkout')),
        // Specific Shopify payment button pattern
        type === 'button' && className.includes('shopify-payment-button__button') && className.includes('shopify-payment-button__button--unbranded')
      ],
      
      // Checkout patterns
      checkout: [
        // Text patterns
        text.includes('checkout') || text.includes('proceed to checkout') || text.includes('go to checkout') || 
        text.includes('завърши поръчката') || text.includes('продължи към плащане'),
        // Class patterns
        className.includes('checkout') || className.includes('cart-checkout') || className.includes('proceed'),
        // Specific cart checkout button pattern
        className.includes('cart__checkout-button') && className.includes('button'),
        // ID patterns
        id.includes('checkout') || id.includes('cart-checkout') || id.includes('proceed'),
        // Form submit patterns
        (type === 'submit' && (className.includes('checkout') || name.includes('checkout')))
      ],
      
      // Exclude patterns (Add to Cart, etc.)
      exclude: [
        // Add to Cart patterns
        text.includes('add to cart') || text.includes('добави в кошницата') || text.includes('add to bag'),
        className.includes('add-to-cart') || className.includes('cart-add') || className.includes('product-form__submit'),
        id.includes('add-to-cart') || id.includes('cart-add') || id.startsWith('productsubmitbutton-'),
        name.includes('add') && (name.includes('cart') || name.includes('product')),
        // Other exclusions
        className.includes('close') || className.includes('remove') || className.includes('delete'),
        button.getAttribute('aria-label')?.toLowerCase().includes('close') ||
        button.getAttribute('aria-label')?.toLowerCase().includes('remove')
      ]
    };

    // Check if button matches any exclusion patterns
    const isExcluded = patterns.exclude.some(pattern => pattern);
    if (isExcluded) {
      console.log('🚫 EXCLUDED - Matches exclusion pattern');
      return 'EXCLUDED';
    }

    // Check if button matches any target patterns
    const isSubmitButton = patterns.submitButtons.some(pattern => pattern);
    const isBuyNow = patterns.buyNow.some(pattern => pattern);
    const isCheckout = patterns.checkout.some(pattern => pattern);
    const isTargetButton = isSubmitButton || isBuyNow || isCheckout;

    console.log('🔍 Analysis:', {
      tagName,
      text: text.substring(0, 50),
      className,
      id,
      type,
      name,
      isSubmitButton,
      isBuyNow,
      isCheckout,
      isExcluded,
      result: isTargetButton
    });

    if (isSubmitButton) {
      console.log('✅ DETECTED AS: SUBMIT BUTTON');
      return 'SUBMIT_BUTTON';
    } else if (isBuyNow) {
      console.log('✅ DETECTED AS: BUY NOW BUTTON');
      return 'BUY_NOW';
    } else if (isCheckout) {
      console.log('✅ DETECTED AS: CHECKOUT BUTTON');
      return 'CHECKOUT';
    } else {
      console.log('❌ NOT DETECTED - No matching patterns');
      return 'NOT_DETECTED';
    }
  }

  // Function to scan all buttons on the page and show what we find
  function scanAllButtons() {
    console.log('🔍 SCANNING ALL BUTTONS ON PAGE:');
    const allButtons = document.querySelectorAll('button, input[type="submit"], input[type="button"], a[role="button"]');
    console.log(`Found ${allButtons.length} total buttons/links`);
    
    allButtons.forEach((button, index) => {
      const isTarget = isCheckoutButton(button);
      console.log(`Button ${index + 1}:`, {
        element: button,
        tagName: button.tagName,
        text: button.textContent?.trim().substring(0, 40),
        className: button.className,
        id: button.id,
        type: button.type,
        name: button.name,
        isTarget: isTarget,
        hasHandler: button._hasOurHandler
      });
    });
  }

  // Make functions globally available for testing
  window.testButtonDetection = testButtonDetection;
  window.scanAllButtons = scanAllButtons;

  // When page loads, make cart data globally available
  document.addEventListener('DOMContentLoaded', function() {
    // Get cart data on page load and make it available for the checkout form
    fetch('/cart.js')
      .then(response => response.json())
      .then(cartData => {
        console.log('Cart data loaded:', cartData);
        window.shopifyCart = cartData;
        // Store for checkout form
        window.cartData = cartData;
      })
      .catch(error => console.error('Error fetching cart data:', error));
  });
})(); 
