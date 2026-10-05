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
 *   defaultDeliveryType: 'office',
 *   // Opt-in only for one store at a time. Omit elsewhere to keep draft orders.
 *   cartCheckout: { mode: 'native' },
 *   // Modal opens ONLY for buttons matching these config targets (no auto fallbacks).
 *   buttonTargets: {
 *     targetByClass: ['cart__checkout-button button'],
 *     targetByName: ['checkout'],
 *     debugMode: false
 *   }
 * };
 * </script>
 * <script src="https://checkout-form-zeta.vercel.app/cdn/shopify-integration.js?v=20261005"></script>
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
    // Default keeps existing draft-order behavior for all stores.
    cartCheckout: {
      mode: 'draft-order'
    },
    shopify: {
      storeUrl: '', // Shopify store URL (e.g., 'your-store.myshopify.com')
      accessToken: '' // Shopify access token (e.g., 'shpat_...')
    },
    buttonTargets: {
      // Only target buttons listed in config — no automatic fallbacks.
      enableSmartDetection: false,
      customSelectors: [],
      excludeSelectors: [],
      buttonTypes: ['checkout', 'cart-checkout'],
      debugMode: false,
      targetByClass: [], // e.g. ['cart__checkout-button button']
      targetByName: [], // e.g. ['checkout']
      targetByClassAndName: []
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
    },
    cartCheckout: {
      ...defaultConfig.cartCheckout,
      ...(config.cartCheckout || {})
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
  
  const bt = finalConfig.buttonTargets;
  const hasConfigTargeting =
    bt.customSelectors.length > 0 ||
    bt.targetByClass.length > 0 ||
    bt.targetByName.length > 0 ||
    bt.targetByClassAndName.length > 0;

  /** Match class list from config, e.g. "cart__checkout-button button" requires both tokens. */
  function elementMatchesTargetClass(element, targetClass) {
    const tokens = String(targetClass || '')
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    if (!tokens.length) return false;
    const raw =
      typeof element.className === 'string'
        ? element.className
        : element.getAttribute && element.getAttribute('class')
          ? element.getAttribute('class')
          : '';
    const elClasses = String(raw)
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    return tokens.every((token) => elClasses.includes(token));
  }

  /** Resolve checkout control using ONLY buttonTargets from config (no hardcoded selectors). */
  function resolveCheckoutControl(fromEl) {
    if (!hasConfigTargeting && !bt.enableSmartDetection) return null;

    if (!fromEl || fromEl.nodeType !== 1) {
      fromEl = fromEl && fromEl.parentElement;
    }
    if (!fromEl || !fromEl.closest) return null;

    // Config customSelectors only (never built-in defaults)
    for (let i = 0; i < bt.customSelectors.length; i++) {
      try {
        const match = fromEl.closest(bt.customSelectors[i]);
        if (match && isCheckoutButton(match)) return match;
      } catch (e) {}
    }

    let el = fromEl;
    while (el && el !== document.documentElement) {
      if (isCheckoutButton(el)) return el;
      el = el.parentElement;
    }
    return null;
  }

  function interceptCheckoutEvent(event) {
    if (event.__officeSelectorHandled) return;
    const control = resolveCheckoutControl(event.target || event.submitter);
    if (!control) return;

    event.__officeSelectorHandled = true;
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') {
      event.stopImmediatePropagation();
    }
    showOfficeSelector(event, control);
  }

  // Capture-phase listeners — only fire when config buttonTargets match
  document.addEventListener('click', interceptCheckoutEvent, true);
  document.addEventListener('submit', function (event) {
    if (event.__officeSelectorHandled) return;
    const control = resolveCheckoutControl(event.submitter || event.target);
    if (!control) return;

    event.__officeSelectorHandled = true;
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') {
      event.stopImmediatePropagation();
    }
    showOfficeSelector(event, control);
  }, true);

  function bootButtonHooks() {
    if (!hasConfigTargeting && !bt.enableSmartDetection) {
      if (bt.debugMode) {
        console.warn('🏢 Office selector: no buttonTargets configured — modal will not open');
      }
      return;
    }
    if (bt.customSelectors.length > 0) {
      initializeCustomSelectorTargeting();
    } else {
      findAndInitializeCheckoutButtons();
    }
    if (bt.debugMode) {
      console.log('🏢 Office selector armed from config only', {
        targetByClass: bt.targetByClass,
        targetByName: bt.targetByName,
        targetByClassAndName: bt.targetByClassAndName,
        customSelectors: bt.customSelectors,
        smart: bt.enableSmartDetection
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootButtonHooks);
  } else {
    bootButtonHooks();
  }

  // Function to show office selector
  function showOfficeSelector(event, controlEl) {
    
    // Prevent default behavior
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
      event.stopPropagation();
    }
    
    // Get the button element (prefer resolved control — click target is often a child span)
    const button = controlEl || (event && event.target && event.target.closest
      ? event.target.closest('button, input[type="submit"], a, [name="checkout"]')
      : event && event.target) || document.body;
    
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
      
      // Pass only modal-relevant config (skip buttonTargets — keeps URL short/reliable)
      const iframeConfig = {
        availableCouriers: finalConfig.availableCouriers,
        defaultCourier: finalConfig.defaultCourier,
        defaultDeliveryType: finalConfig.defaultDeliveryType,
        showPrices: finalConfig.showPrices !== undefined ? finalConfig.showPrices : true,
        freeShipping: finalConfig.freeShipping,
        continueButton: finalConfig.continueButton,
        font: finalConfig.font,
        shopify: finalConfig.shopify,
        cartCheckout: finalConfig.cartCheckout
      };
      const configParam = encodeURIComponent(JSON.stringify(iframeConfig));
      const quantityParam = productData.quantity ? `&quantity=${encodeURIComponent(productData.quantity)}` : '';
      const storeUrlParam = finalConfig.shopify?.storeUrl
        ? `&storeUrl=${encodeURIComponent(finalConfig.shopify.storeUrl)}`
        : '';
      const accessTokenParam = finalConfig.shopify?.accessToken
        ? `&accessToken=${encodeURIComponent(finalConfig.shopify.accessToken)}`
        : '';
      const officeSelectorUrl = `${baseUrl}/office-selector?productId=${encodeURIComponent(productData.productId)}&variantId=${encodeURIComponent(productData.variantId)}${quantityParam}&config=${configParam}${storeUrlParam}${accessTokenParam}`;

      if (finalConfig.buttonTargets.debugMode) {
        console.log('🏢 Opening office selector with config:', {
          couriers: iframeConfig.availableCouriers,
          mode: iframeConfig.cartCheckout?.mode,
          storeUrl: iframeConfig.shopify?.storeUrl,
          hasToken: !!iframeConfig.shopify?.accessToken,
          urlLength: officeSelectorUrl.length
        });
      }

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
          // Re-send config via postMessage (backup if URL config was truncated/failed to parse)
          if (iframe.contentWindow) {
            try {
              iframe.contentWindow.postMessage({
                type: 'office-selector-config',
                config: {
                  availableCouriers: finalConfig.availableCouriers,
                  defaultCourier: finalConfig.defaultCourier,
                  defaultDeliveryType: finalConfig.defaultDeliveryType,
                  showPrices: finalConfig.showPrices !== undefined ? finalConfig.showPrices : true,
                  freeShipping: finalConfig.freeShipping,
                  continueButton: finalConfig.continueButton,
                  font: finalConfig.font,
                  shopify: finalConfig.shopify,
                  cartCheckout: finalConfig.cartCheckout
                }
              }, baseUrl);
            } catch (e) {}
          }
        } else if (event.data.type === 'office-selector-closed') {
          hideOfficeSelector();
          window.removeEventListener('message', messageHandler);
        } else if (event.data.type === 'order-created') {
          window.location.href = event.data.checkoutUrl;
          hideOfficeSelector();
          window.removeEventListener('message', messageHandler);
        } else if (
          event.data.type === 'proceed-to-cart-checkout' &&
          finalConfig.cartCheckout &&
          finalConfig.cartCheckout.mode === 'native'
        ) {
          // Agility-style handoff: stamp cart, fire Meta on parent, go to /checkout.
          var delivery = event.data.delivery || {};
          var attributes = delivery.attributes || {};
          var note = delivery.note || '';
          var address1 = delivery.address || '';
          var city = delivery.city || '';
          var postalCode = delivery.postalCode || '';

          try {
            if (typeof window.fbq === 'function') {
              var cart = window.shopifyCart || window.cartData || {};
              var value = typeof cart.total_price === 'number' ? cart.total_price / 100 : undefined;
              var currency = cart.currency || 'BGN';
              var numItems = cart.item_count || (cart.items && cart.items.length) || 0;
              window.fbq('track', 'InitiateCheckout', {
                value: value,
                currency: currency,
                num_items: numItems,
                content_type: 'product'
              });
            }
          } catch (e) {}

          var checkoutParams = [];
          if (city) {
            checkoutParams.push('checkout[shipping_address][city]=' + encodeURIComponent(city));
          }
          if (address1) {
            checkoutParams.push('checkout[shipping_address][address1]=' + encodeURIComponent(address1));
          }
          if (postalCode) {
            checkoutParams.push('checkout[shipping_address][zip]=' + encodeURIComponent(postalCode));
          }
          checkoutParams.push('checkout[shipping_address][country]=' + encodeURIComponent('BG'));
          var checkoutUrl = '/checkout' + (checkoutParams.length ? '?' + checkoutParams.join('&') : '');

          fetch('/cart/update.js', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              note: note,
              attributes: attributes
            })
          })
            .catch(function () {})
            .finally(function () {
              window.location.href = checkoutUrl;
              hideOfficeSelector();
              window.removeEventListener('message', messageHandler);
            });
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
                }
              } else {
              }
            })
            .catch(error => {
              
              // Fallback to cached cart data
              const fallbackCart = window.shopifyCart || window.cartData;   
              
              if (iframe.contentWindow) {
                if (fallbackCart) {
                  iframe.contentWindow.postMessage({
                    type: 'cart-data',
                    cart: fallbackCart
                  }, baseUrl);
                } else {
                  iframe.contentWindow.postMessage({
                    type: 'cart-data',
                    cart: null
                  }, baseUrl);
                }
              } else {
              }
            });
        }
      };
      
      window.addEventListener('message', messageHandler);
    } else {
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

  // Match ONLY against buttonTargets from config (no built-in selector guesses).
  function isCheckoutButton(element) {
    if (!element || !element.tagName) return false;

    if (bt.excludeSelectors.length > 0) {
      const excludeMatch = bt.excludeSelectors.some((selector) => {
        try {
          return element.matches(selector);
        } catch (e) {
          return false;
        }
      });
      if (excludeMatch) return false;
    }

    // Explicit CSS selectors from config
    if (bt.customSelectors.length > 0) {
      return bt.customSelectors.some((selector) => {
        try {
          return element.matches(selector);
        } catch (e) {
          return false;
        }
      });
    }

    const name = String(element.name || element.getAttribute?.('name') || '').toLowerCase();

    if (bt.targetByClass.length > 0) {
      if (bt.targetByClass.some((targetClass) => elementMatchesTargetClass(element, targetClass))) {
        return true;
      }
    }

    if (bt.targetByName.length > 0) {
      if (bt.targetByName.some((targetName) => name === String(targetName).toLowerCase() || name.includes(String(targetName).toLowerCase()))) {
        return true;
      }
    }

    if (bt.targetByClassAndName.length > 0) {
      if (
        bt.targetByClassAndName.some((target) => {
          return (
            elementMatchesTargetClass(element, target.class) &&
            (name === String(target.name).toLowerCase() ||
              name.includes(String(target.name).toLowerCase()))
          );
        })
      ) {
        return true;
      }
    }

    // If any explicit targeting is configured, never fall through to smart detection
    if (hasConfigTargeting) {
      return false;
    }

    // Smart detection only when explicitly enabled AND no config targeting is set
    if (!bt.enableSmartDetection) {
      return false;
    }

    const className =
      typeof element.className === 'string'
        ? element.className.toLowerCase()
        : String(element.getAttribute?.('class') || '').toLowerCase();
    const text = element.textContent?.toLowerCase().trim() || '';
    const id = element.id?.toLowerCase() || '';
    const type = element.type?.toLowerCase() || '';

    const patterns = {
      submitButtons: [type === 'submit'],
      buyNow: [
        text.includes('buy now') || text.includes('buy it now') || text.includes('купи сега'),
        className.includes('buy-now') || className.includes('quick-buy') || className.includes('shopify-payment-button'),
        id.includes('buy-now') || id.includes('quick-buy'),
        type === 'button' && (className.includes('payment') || className.includes('checkout')),
        type === 'button' && className.includes('shopify-payment-button__button') && className.includes('shopify-payment-button__button--unbranded')
      ],
      checkout: [
        text.includes('checkout') || text.includes('proceed to checkout') || text.includes('go to checkout') ||
        text.includes('завърши поръчката') || text.includes('продължи към плащане'),
        className.includes('checkout') || className.includes('cart-checkout') || className.includes('proceed'),
        className.includes('cart__checkout-button') && className.includes('button'),
        id.includes('checkout') || id.includes('cart-checkout') || id.includes('proceed'),
        type === 'submit' && (className.includes('checkout') || name.includes('checkout'))
      ],
      exclude: [
        text.includes('add to cart') || text.includes('добави в кошницата') || text.includes('add to bag'),
        className.includes('add-to-cart') || className.includes('cart-add') || className.includes('product-form__submit'),
        id.includes('add-to-cart') || id.includes('cart-add') || id.startsWith('productsubmitbutton-'),
        name.includes('add') && (name.includes('cart') || name.includes('product')),
        className.includes('close') || className.includes('remove') || className.includes('delete'),
        element.getAttribute('aria-label')?.toLowerCase().includes('close') ||
        element.getAttribute('aria-label')?.toLowerCase().includes('remove')
      ]
    };

    if (patterns.exclude.some((pattern) => pattern)) return false;

    const isSubmitButton = bt.buttonTypes.includes('submit') && patterns.submitButtons.some((pattern) => pattern);
    const isBuyNow = bt.buttonTypes.includes('buy-now') && patterns.buyNow.some((pattern) => pattern);
    const isCheckout = bt.buttonTypes.includes('checkout') && patterns.checkout.some((pattern) => pattern);
    const isCartCheckout = bt.buttonTypes.includes('cart-checkout') && patterns.checkout.some((pattern) => pattern);
    return isSubmitButton || isBuyNow || isCheckout || isCartCheckout;
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


  // Make functions globally available for testing
  window.testButtonDetection = testButtonDetection;

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
