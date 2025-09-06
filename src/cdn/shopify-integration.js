(function() {
  'use strict';

  // Configuration object - can be set before script loads
  const config = window.officeSelectorConfig || {};
  
  // Ensure all configuration properties have defaults
  const defaultConfig = {
    availableCouriers: ['speedy', 'econt'], // Default: both couriers available
    defaultCourier: 'speedy', // Default selected courier
    defaultDeliveryType: 'office', // Default delivery type
    buttonTargets: {
      // Button targeting configuration
      enableSmartDetection: true, // Enable smart button detection
      customSelectors: [], // Custom CSS selectors for buttons
      excludeSelectors: [], // CSS selectors to exclude
      buttonTypes: ['checkout', 'buy-now', 'cart-checkout'], // Types of buttons to target
      debugMode: false, // Show red dots on targeted buttons
      // Enhanced targeting by class and name
      targetByClass: [], // Array of class names to target
      targetByName: [], // Array of name attributes to target
      targetByClassAndName: [] // Array of objects with both class and name: [{class: 'btn', name: 'checkout'}]
    }
  };
  
  // Merge user config with defaults
  const finalConfig = {
    ...defaultConfig,
    ...config,
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
        max-height: 90vh;
        border: none;
        border-radius: 8px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        z-index: 10000;
        display: none;
        background: white;
      "
      allow="clipboard-write"
    ></iframe>
  `;
  
  // Log the targeting mode
  if (finalConfig.buttonTargets.customSelectors.length > 0) {
  } else if (finalConfig.buttonTargets.targetByClass.length > 0 || 
             finalConfig.buttonTargets.targetByName.length > 0 || 
             finalConfig.buttonTargets.targetByClassAndName.length > 0) {
  } else if (finalConfig.buttonTargets.enableSmartDetection) {
  } else {
  }

  // Only override onclick if we're using smart detection
  // For custom selectors and enhanced targeting, we'll use a different approach
  const hasEnhancedTargeting = finalConfig.buttonTargets.targetByClass.length > 0 ||
                              finalConfig.buttonTargets.targetByName.length > 0 ||
                              finalConfig.buttonTargets.targetByClassAndName.length > 0;
  
  if (finalConfig.buttonTargets.enableSmartDetection && 
      finalConfig.buttonTargets.customSelectors.length === 0 && 
      !hasEnhancedTargeting) {
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
  } else if (finalConfig.buttonTargets.customSelectors.length > 0) {
    // For custom selectors, use a more targeted approach
    initializeCustomSelectorTargeting();
  } else if (hasEnhancedTargeting) {
    // For enhanced targeting, use the standard approach
    findAndInitializeCheckoutButtons();
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
    
    // Production URL for live sites
    const baseUrl = 'https://checkout-form-zeta.vercel.app';
    
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
          'https://checkout-form-zeta.vercel.app'
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
                  }, 'https://checkout-form-zeta.vercel.app');
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
                  }, 'https://checkout-form-zeta.vercel.app');
                } else {
                  console.error('🏢 No fallback cart data available');
                  iframe.contentWindow.postMessage({
                    type: 'cart-data',
                    cart: null
                  }, 'https://checkout-form-zeta.vercel.app');
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

  // Initialize custom selector targeting (no constant checking)
  function initializeCustomSelectorTargeting() {
    
    // Find and attach to existing buttons
    finalConfig.buttonTargets.customSelectors.forEach(selector => {
      const buttons = document.querySelectorAll(selector);
      
      buttons.forEach(button => {
        if (!button._hasOurHandler) {
          addOurCheckoutHandler(button);
        }
      });
    });
    
    // Watch for new buttons being added to the DOM
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            // Check if the added node matches our selectors
            finalConfig.buttonTargets.customSelectors.forEach(selector => {
              if (node.matches && node.matches(selector)) {
                if (!node._hasOurHandler) {
                  addOurCheckoutHandler(node);
                }
              }
            });
            
            // Check if any child elements match our selectors
            finalConfig.buttonTargets.customSelectors.forEach(selector => {
              const newButtons = node.querySelectorAll && node.querySelectorAll(selector);
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

  // Function to check if an element is a checkout button
  function isCheckoutButton(element) {
    if (!element || !element.tagName) return false;

    // Check exclude selectors first (applies to all targeting methods)
    if (finalConfig.buttonTargets.excludeSelectors.length > 0) {
      const excludeMatch = finalConfig.buttonTargets.excludeSelectors.some(selector => {
        try {
          return element.matches(selector);
        } catch (e) {
          return false;
        }
      });
      if (excludeMatch) {
        return false;
      }
    }

    // If we have custom selectors, ONLY use those (skip all other detection)
    if (finalConfig.buttonTargets.customSelectors.length > 0) {
      // Check custom selectors
      const customMatch = finalConfig.buttonTargets.customSelectors.some(selector => {
        try {
          return element.matches(selector);
        } catch (e) {
          return false;
        }
      });
      if (customMatch) {
        return true;
      }
      
      // If we have custom selectors but this element doesn't match, return false
      return false;
    }

    // Check enhanced targeting by class and name
    const className = element.className?.toLowerCase() || '';
    const name = element.name?.toLowerCase() || '';
    
    // Target by class only
    if (finalConfig.buttonTargets.targetByClass.length > 0) {
      const classMatch = finalConfig.buttonTargets.targetByClass.some(targetClass => {
        return className.includes(targetClass.toLowerCase());
      });
      if (classMatch) {
        return true;
      }
    }
    
    // Target by name only
    if (finalConfig.buttonTargets.targetByName.length > 0) {
      const nameMatch = finalConfig.buttonTargets.targetByName.some(targetName => {
        return name.includes(targetName.toLowerCase());
      });
      if (nameMatch) {
        return true;
      }
    }
    
    // Target by both class and name (must match both)
    if (finalConfig.buttonTargets.targetByClassAndName.length > 0) {
      const classAndNameMatch = finalConfig.buttonTargets.targetByClassAndName.some(target => {
        const classMatch = className.includes(target.class.toLowerCase());
        const nameMatch = name.includes(target.name.toLowerCase());
        return classMatch && nameMatch;
      });
      if (classAndNameMatch) {
        return true;
      }
    }
    
    // If we have any enhanced targeting configured, don't use smart detection
    const hasEnhancedTargeting = finalConfig.buttonTargets.targetByClass.length > 0 ||
                                finalConfig.buttonTargets.targetByName.length > 0 ||
                                finalConfig.buttonTargets.targetByClassAndName.length > 0;
    
    if (hasEnhancedTargeting) {
      return false; // Enhanced targeting was already checked above
    }
    
    // If smart detection is disabled, return false
    if (!finalConfig.buttonTargets.enableSmartDetection) {
      return false;
    }

    const tagName = element.tagName.toLowerCase();
    const text = element.textContent?.toLowerCase().trim() || '';
    const id = element.id?.toLowerCase() || '';
    const type = element.type?.toLowerCase() || '';

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
      return false;
    }

    // Check if button matches any target patterns based on configuration
    const isSubmitButton = finalConfig.buttonTargets.buttonTypes.includes('submit') && patterns.submitButtons.some(pattern => pattern);
    const isBuyNow = finalConfig.buttonTargets.buttonTypes.includes('buy-now') && patterns.buyNow.some(pattern => pattern);
    const isCheckout = finalConfig.buttonTargets.buttonTypes.includes('checkout') && patterns.checkout.some(pattern => pattern);
    const isCartCheckout = finalConfig.buttonTargets.buttonTypes.includes('cart-checkout') && patterns.checkout.some(pattern => pattern);
    const isTargetButton = isSubmitButton || isBuyNow || isCheckout || isCartCheckout;

    // Only log when we actually detect a target button (reduce console spam)
    if (isTargetButton) {
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
        // For custom selectors, we know this is a target button, so no need to check
        if (finalConfig.buttonTargets.customSelectors.length > 0) {
          event.preventDefault();
          event.stopPropagation();
          showOfficeSelector(event);
          return false;
        }
        
        // For smart detection, check if this is a target button
        if (isCheckoutButton(button)) {
          event.preventDefault();
          event.stopPropagation();
          showOfficeSelector(event);
          return false;
        }
        
        // If not a target button, call original handler
        if (originalOnclick) {
          return originalOnclick.call(this, event);
        }
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
    
    buttons.forEach(button => {
      if (isCheckoutButton(button)) {
        addOurCheckoutHandler(button);
      }
    });
  }
  
  // Monitor the DOM for changes to catch when buttons appear
  function startObserving() {
    // Check for checkout buttons (reduced frequency to avoid console spam)
    
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
    
   
  }

  // Function to handle order creation
  async function handleOrderCreation(formData, source) {
    try {
     
      
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
    
    // Create a temporary element to parse the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = buttonHtml;
    const button = tempDiv.firstElementChild;
    
    if (!button) {
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
      return 'EXCLUDED';
    }

    // Check if button matches any target patterns
    const isSubmitButton = patterns.submitButtons.some(pattern => pattern);
    const isBuyNow = patterns.buyNow.some(pattern => pattern);
    const isCheckout = patterns.checkout.some(pattern => pattern);
    const isTargetButton = isSubmitButton || isBuyNow || isCheckout;

    if (isSubmitButton) {
      return 'SUBMIT_BUTTON';
    } else if (isBuyNow) {
      return 'BUY_NOW';
    } else if (isCheckout) {
      return 'CHECKOUT';
    } else {
      return 'NOT_DETECTED';
    }
  }

  // Function to scan all buttons on the page and show what we find
  function scanAllButtons() {
    const allButtons = document.querySelectorAll('button, input[type="submit"], input[type="button"], a[role="button"]');
    allButtons.forEach((button, index) => {
      const isTarget = isCheckoutButton(button);
     
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
        window.shopifyCart = cartData;
        // Store for checkout form
        window.cartData = cartData;
      })
      .catch(error => console.error('Error fetching cart data:', error));
  });

  // Debug function to test button detection
  window.testButtonDetection = function(selector) { 
    const buttons = document.querySelectorAll(selector);
    
    // If using custom selectors, just show the buttons without calling isCheckoutButton
    if (finalConfig.buttonTargets.customSelectors.length > 0) {
      buttons.forEach((button, index) => {
      });
    } else {
      // Smart detection mode
      buttons.forEach((button, index) => {
        const isTarget = isCheckoutButton(button);
      });
    }
    
    return buttons;
  };

  // Debug function to scan all buttons on page
  window.scanAllButtons = function() {
    
    // If using custom selectors, only scan those
    if (finalConfig.buttonTargets.customSelectors.length > 0) {
      const targetedButtons = [];
      
      finalConfig.buttonTargets.customSelectors.forEach(selector => {
        const buttons = document.querySelectorAll(selector);
        
        buttons.forEach((button, index) => {
          targetedButtons.push(button);
        });
      });
      
      return targetedButtons;
    }
    
    // Smart detection mode
    const allButtons = document.querySelectorAll('button, a, input[type="button"], input[type="submit"]');
    
    const targetedButtons = [];
    allButtons.forEach((button, index) => {
      const isTarget = isCheckoutButton(button);
      if (isTarget) {
        targetedButtons.push(button);
      }
    });
    
    return targetedButtons;
  };

  // Function to fetch and log current shipping methods
  async function fetchAndLogShippingMethods() {
    try {
      
      const baseUrl = 'https://checkout-form-zeta.vercel.app';
      const response = await fetch(`${baseUrl}/api/shopify/shipping-methods`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json(); 
      
      if (data.success && data.shippingMethods) {
        // Store shipping methods globally for later use
        window.storeShippingMethods = data.shippingMethods;
        window.bulgariaShippingMethods = data.bulgariaMethods;
        
      } else if (data.error) {
      }
    } catch (error) {
      console.error('Error fetching shipping methods:', error);
    }
  }

  // Fetch shipping methods when script loads
  fetchAndLogShippingMethods();
})(); 
