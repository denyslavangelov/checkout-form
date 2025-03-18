// Custom checkout integration for Shopify
(function() {
  // Store original addEventListener method
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  
  // Override addEventListener to intercept checkout button click handlers
  EventTarget.prototype.addEventListener = function(type, listener, options) {
    // Call the original method
    const result = originalAddEventListener.call(this, type, listener, options);
    
    // Check if this is a checkout button and a click event
    if (isCheckoutButton(this) && type === 'click') {
      console.log('Detected click handler being added to checkout button!');
      
      // Add our custom handler right after (this will run last)
      setTimeout(() => {
        addOurCheckoutHandler(this);
      }, 100);
    }
    
    return result;
  };
  
  // Store original onclick setter
  const originalOnClickDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'onclick');
  
  // Override onclick property
  Object.defineProperty(HTMLElement.prototype, 'onclick', {
    set: function(newValue) {
      const result = originalOnClickDescriptor.set.call(this, newValue);
      
      // Check if this is a checkout button
      if (isCheckoutButton(this)) {
        console.log('Detected onclick property being set on checkout button!');
        
        // Add our custom handler right after
        setTimeout(() => {
          addOurCheckoutHandler(this);
        }, 100);
      }
      
      return result;
    },
    get: originalOnClickDescriptor.get
  });

  // Function to check if an element is a checkout button
  function isCheckoutButton(element) {
    if (!element || !element.tagName) return false;

    // Common checkout button identifiers
    const checkoutIdentifiers = [
      { attr: 'id', value: 'CartDrawer-Checkout' },
      { attr: 'name', value: 'checkout' },
      { attr: 'href', value: '/checkout' },
      { attr: 'class', value: 'checkout-button' },
      { attr: 'class', value: 'cart__checkout' },
      { attr: 'class', value: 'cart-checkout' },
      { attr: 'data-action', value: 'checkout' },
      { attr: 'class', value: 'shopify-payment-button__button' }
    ];

    // Check if element matches any identifier
    const isIdentifiedCheckout = checkoutIdentifiers.some(identifier => {
      const attrValue = element.getAttribute(identifier.attr);
      return attrValue && (
        attrValue === identifier.value ||
        attrValue.includes(identifier.value) ||
        (identifier.value === '/checkout' && attrValue.includes('/checkout'))
      );
    });

    // Check text content for "checkout" keyword
    const hasCheckoutText = element.textContent && 
      element.textContent.toLowerCase().includes('checkout');

    // Check if it's inside a cart form
    const isInCartForm = element.closest('form[action="/cart"]') !== null;

    return isIdentifiedCheckout || hasCheckoutText || isInCartForm;
  }
  
  // Function to add our checkout handler
  function addOurCheckoutHandler(button) {
    if (button && !button._hasOurHandler) {
      button._hasOurHandler = true;
      
      // Use capture phase to get event first, before other handlers
      button.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopImmediatePropagation(); // Stop other handlers
        
        // Check if this is a "Buy Now" button specifically
        const isBuyNowButton = button.closest('.shopify-payment-button__button') !== null;
        console.log('Checkout button clicked, isBuyNowButton:', isBuyNowButton);
        
        // Pass the event to openCustomCheckout
        openCustomCheckout(e);
        return false;
      }, { capture: true }); // Use capture to get event first
      
      // Add visual indicator
      const dot = document.createElement('span');
      dot.style.position = 'absolute';
      dot.style.top = '3px';
      dot.style.right = '3px';
      dot.style.width = '6px';
      dot.style.height = '6px';
      dot.style.backgroundColor = 'red';
      dot.style.borderRadius = '50%';
      dot.style.zIndex = '9999';
      
      // Make sure the button has relative positioning for the indicator
      if (getComputedStyle(button).position === 'static') {
        button.style.position = 'relative';
      }
      
      button.appendChild(dot);
    }
  }
  
  // Function to find and initialize all checkout buttons
  function findAndInitializeCheckoutButtons() {
    // Common checkout button selectors
    const selectors = [
      '#CartDrawer-Checkout',
      '[name="checkout"]',
      '[href="/checkout"]',
      '[href*="/checkout"]',
      '.checkout-button',
      '.cart__checkout',
      '.cart-checkout',
      '[data-action="checkout"]',
      'form[action="/cart"] [type="submit"]',
      '.shopify-payment-button__button'
    ];

    // Find all potential checkout buttons
    const buttons = document.querySelectorAll(selectors.join(','));
    
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
    // Check frequently for checkout buttons
    setInterval(monitorForCheckoutButtons, 500);
    
    // Also use MutationObserver to detect when new buttons are added
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(mutation => {
        if (mutation.addedNodes.length) {
          findAndInitializeCheckoutButtons();
        }
      });
    });
    
    // Observe the entire document
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
    let isBuyNowButton = false;
    let currentProduct = null;
    
    if (event && event.target) {
      const button = event.target.closest('.shopify-payment-button__button');
      // Check if this is a Buy Now button
      if (button) {
        isBuyNowButton = true;
        console.log('Buy Now button detected, getting current product info');
        
        try {
          // Get product data from the page meta tags or JSON
          const productJson = document.getElementById('ProductJson-product-template') || 
                             document.getElementById('ProductJson-product') ||
                             document.querySelector('[id^="ProductJson-"]') ||
                             document.querySelector('script[type="application/json"][data-product-json]');
          
          if (productJson && productJson.textContent) {
            currentProduct = JSON.parse(productJson.textContent);
            console.log('Found product JSON:', currentProduct);
          } 
          
          // If not found in JSON, try to get from meta tags
          if (!currentProduct) {
            console.log('No product JSON found, trying meta tags and other methods');
            
            // Try data-product-json attribute first (common in many themes)
            const productDataElements = document.querySelectorAll('[data-product-json]');
            for (const element of productDataElements) {
              try {
                if (element.textContent) {
                  currentProduct = JSON.parse(element.textContent);
                  console.log('Found product from data-product-json attribute:', currentProduct);
                  break;
                }
              } catch (e) {
                console.warn('Failed to parse product data from element:', e);
              }
            }
            
            // Try finding JSON in any script tag that contains product data
            if (!currentProduct) {
              const scriptTags = document.querySelectorAll('script:not([src])');
              for (const script of scriptTags) {
                try {
                  if (script.textContent && 
                     (script.textContent.includes('"product":') || 
                      script.textContent.includes('"variants":')) && 
                     script.textContent.includes('"price":')) {
                    
                    // Try to extract just the product object
                    const matches = script.textContent.match(/\{(?:[^{}]|(\{(?:[^{}]|(?:\{[^{}]*\}))*\}))*\}/g);
                    if (matches) {
                      for (const jsonText of matches) {
                        try {
                          const parsed = JSON.parse(jsonText);
                          if (parsed.id && parsed.title && parsed.price !== undefined) {
                            currentProduct = parsed;
                            console.log('Found product in script content:', currentProduct);
                            break;
                          }
                        } catch (e) {
                          // Skip invalid JSON
                        }
                      }
                    }
                    
                    if (currentProduct) break;
                  }
                } catch (e) {
                  // Skip errors
                }
              }
            }
            
            // Try meta tags as last resort
            if (!currentProduct) {
              const productMetaTag = document.querySelector('meta[property="og:product"]') ||
                                    document.querySelector('meta[property="product:price:amount"]');
              
              if (productMetaTag) {
                // This is just a fallback with limited information
                const price = document.querySelector('meta[property="product:price:amount"]')?.content;
                const title = document.querySelector('meta[property="og:title"]')?.content;
                const image = document.querySelector('meta[property="og:image"]')?.content;
                const url = window.location.href;
                
                // Try to extract product ID from URL
                const productId = url.match(/\/products\/([^\/\?#]+)/)?.[1];
                
                if (price && title) {
                  currentProduct = {
                    id: productId || 'unknown',
                    title: title,
                    price: parseFloat(price) * 100, // Convert to cents
                    featured_image: image,
                    url: url,
                    quantity: 1
                  };
                  console.log('Constructed product from meta tags:', currentProduct);
                }
              }
            }
            
            // Try extracting directly from the page HTML
            if (!currentProduct) {
              // Look for price elements
              const priceElement = document.querySelector('.price') || 
                                  document.querySelector('[data-product-price]') ||
                                  document.querySelector('.product-price') ||
                                  document.querySelector('[data-price]');
              
              const titleElement = document.querySelector('h1') || 
                                  document.querySelector('.product-title') ||
                                  document.querySelector('[data-product-title]');
              
              const imageElement = document.querySelector('.product-featured-image') ||
                                  document.querySelector('[data-product-featured-image]') ||
                                  document.querySelector('.product-single__photo') ||
                                  document.querySelector('.product-image');
              
              if (priceElement && titleElement) {
                // Extract price - remove currency and non-numeric characters
                let priceText = priceElement.textContent.trim().replace(/[^\d.,]/g, '').replace(',', '.');
                const price = parseFloat(priceText) * 100; // Convert to cents
                
                const productId = window.location.pathname.match(/\/products\/([^\/\?#]+)/)?.[1] || 'unknown';
                
                currentProduct = {
                  id: productId,
                  title: titleElement.textContent.trim(),
                  price: isNaN(price) ? 0 : price,
                  featured_image: imageElement?.src || null,
                  url: window.location.href,
                  quantity: 1
                };
                
                console.log('Constructed product from page elements:', currentProduct);
              }
            }
          }
          
          // Look for variant information if available
          if (currentProduct) {
            // Try to get selected variant
            const selectedOptions = {};
            
            // Find all selected option inputs
            document.querySelectorAll('select[name^="options"], input[name^="options"]:checked').forEach(input => {
              const option = input.getAttribute('name').match(/options\[([^\]]+)\]/)?.[1];
              if (option) {
                selectedOptions[option] = input.value;
              }
            });
            
            // Find quantity input
            const quantityInput = document.querySelector('input[name="quantity"]');
            if (quantityInput && quantityInput.value) {
              currentProduct.quantity = parseInt(quantityInput.value, 10) || 1;
            }
            
            // Find the selected variant if available
            if (currentProduct.variants && currentProduct.variants.length > 0 && Object.keys(selectedOptions).length > 0) {
              const selectedVariant = currentProduct.variants.find(variant => {
                // Check if all selected options match this variant
                if (!variant.options || !variant.options.length) return false;
                
                return variant.options.every((option, index) => {
                  const optionName = currentProduct.options[index];
                  return !selectedOptions[optionName] || selectedOptions[optionName] === option;
                });
              });
              
              if (selectedVariant) {
                console.log('Found selected variant:', selectedVariant);
                currentProduct.variant_id = selectedVariant.id;
                currentProduct.price = selectedVariant.price;
                currentProduct.compare_at_price = selectedVariant.compare_at_price;
                currentProduct.variant_title = selectedVariant.title;
              }
            }
          }
        } catch (e) {
          console.error('Error getting product info:', e);
        }
      }
    }
    
    // Create and show the modal and iframe immediately
    let modal = document.createElement('div');
    modal.id = 'custom-checkout-modal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    modal.style.zIndex = '9999';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    
    // Create iframe immediately
    const iframe = document.createElement('iframe');
    iframe.id = 'checkout-iframe';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.maxWidth = '600px';
    iframe.style.maxHeight = '90vh';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '8px';
    iframe.style.backgroundColor = 'white';
    iframe.style.margin = 'auto';
    
    // Configure iframe URL
    const iframeUrl = new URL('https://checkout-form-zeta.vercel.app/iframe');
    iframeUrl.searchParams.append('hasCart', 'true');
    
    // If this is a Buy Now button, add a flag to the URL
    if (isBuyNowButton) {
      iframeUrl.searchParams.append('buyNow', 'true');
    }
    
    // Get and append the Shopify domain
    const shopifyDomain = Shopify.shop || window.Shopify.shop || 
      document.querySelector('meta[name="shopify-checkout-api-token"]')?.dataset?.shopifyDomain ||
      window.location.hostname;
    iframeUrl.searchParams.append('shopifyDomain', shopifyDomain);
    
    // Optimize for mobile/tablet immediately
    if (window.innerWidth < 768) {
      iframe.style.maxWidth = '100%';
      iframe.style.maxHeight = '100%';
      iframe.style.height = '100%';
      iframe.style.borderRadius = '0';
      iframeUrl.searchParams.append('isMobile', 'true');
      modal.style.padding = '0';
    } else if (window.innerWidth < 992) {
      iframe.style.maxWidth = '90%';
      iframe.style.maxHeight = '95vh';
      iframeUrl.searchParams.append('isTablet', 'true');
    }
    
    // Add viewport information
    iframeUrl.searchParams.append('viewportWidth', window.innerWidth);
    iframeUrl.searchParams.append('pixelRatio', window.devicePixelRatio || 1);
    
    // For Buy Now button, use the current product instead of cart data
    if (isBuyNowButton && currentProduct) {
      console.log('Using product from Buy Now button:', currentProduct);
      
      // Create a cart-like structure with the single product
      const singleProductCart = {
        product: currentProduct,
        cart_type: 'buy_now',
        source: 'buy_now_button',
        items: [{
          id: currentProduct.variant_id || currentProduct.id,
          title: currentProduct.title,
          quantity: currentProduct.quantity || 1,
          price: currentProduct.price,
          line_price: currentProduct.price * (currentProduct.quantity || 1),
          original_line_price: (currentProduct.compare_at_price || currentProduct.price) * (currentProduct.quantity || 1),
          variant_id: currentProduct.variant_id || currentProduct.id,
          product_id: currentProduct.id,
          sku: currentProduct.sku || '',
          variant_title: currentProduct.variant_title || '',
          vendor: currentProduct.vendor || '',
          image: currentProduct.image?.src || currentProduct.featured_image || null,
          requires_shipping: true
        }],
        total_price: currentProduct.price * (currentProduct.quantity || 1),
        items_subtotal_price: currentProduct.price * (currentProduct.quantity || 1),
        total_discount: currentProduct.compare_at_price ? 
          (currentProduct.compare_at_price - currentProduct.price) * (currentProduct.quantity || 1) : 0,
        item_count: currentProduct.quantity || 1,
        currency: 'BGN'
      };
      
      // Store this data globally
      window.shopifyCart = singleProductCart;
      window.cartData = singleProductCart;
      window.buyNowProduct = currentProduct; // Store the individual product
      
      // Store in localStorage for backup
      try {
        localStorage.setItem('tempCartData', JSON.stringify(singleProductCart));
        localStorage.setItem('buyNowProduct', JSON.stringify(currentProduct));
      } catch (e) {
        console.warn('Could not store Buy Now data in localStorage', e);
      }
      
      // Now set the iframe src
      iframe.src = iframeUrl.toString();
      
      // Test that product data is available
      console.log('Product data check before iframe load:', {
        singleProductCart,
        currentProduct,
        windowBuyNowProduct: window.buyNowProduct,
        localStorageBuyNowProduct: JSON.parse(localStorage.getItem('buyNowProduct') || '{}')
      });
      
      // Send the product data when iframe loads
      iframe.onload = function() {
        console.log('Iframe loaded, sending product data immediately');
        
        // Test that product data is still available
        console.log('Product data check before sending to iframe:', {
          fromVariable: currentProduct,
          fromWindow: window.buyNowProduct,
          fromCart: singleProductCart
        });
        
        if (iframe.contentWindow) {
          // Add the buyNow=true flag to the iframe URL
          try {
            const iframeWindow = iframe.contentWindow;
            const currentUrl = new URL(iframeWindow.location.href);
            currentUrl.searchParams.set('buyNow', 'true');
            
            // This won't actually navigate, but will make the param available to the iframe
            iframeWindow.history.replaceState({}, '', currentUrl.toString());
            console.log('Added buyNow=true to iframe URL:', currentUrl.toString());
          } catch (e) {
            console.error('Error adding buyNow param to iframe URL:', e);
          }
          
          // Add a small delay to ensure iframe is ready to receive messages
          setTimeout(() => {
            console.log('Sending product data to iframe now');
            iframe.contentWindow.postMessage({
              type: 'cart-data',
              cart: singleProductCart,
              product: currentProduct, // Send the individual product explicitly
              metadata: {
                timestamp: new Date().toISOString(),
                shopUrl: window.location.hostname,
                shopifyDomain: shopifyDomain,
                source: 'buy_now_button',
                hasItems: true,
                itemCount: singleProductCart.item_count || 1,
                isBuyNowContext: true,
                isSingleProduct: true
              }
            }, '*');
          }, 100);
        }
      };
      
      modal.appendChild(iframe);
      document.body.appendChild(modal);
    } else {
      // Regular flow - load cart data first, then set the iframe src
      fetch('/cart.js')
        .then(response => response.json())
        .then(cartData => {
          // Store cart data globally for later use
          window.shopifyCart = cartData;
          window.cartData = cartData;
          window.customCheckoutData = {
            cartData: cartData,
            timestamp: new Date().toISOString()
          };
          
          try {
            localStorage.setItem('tempCartData', JSON.stringify(cartData));
          } catch (e) {
            console.warn('Could not store cart data in localStorage', e);
          }

          // Now set the iframe src after we have the data
          iframe.src = iframeUrl.toString();
          
          // Add a load event listener to immediately send data when iframe loads
          iframe.onload = function() {
            console.log('Iframe loaded, sending cart data immediately');
            if (iframe.contentWindow) {
              iframe.contentWindow.postMessage({
                type: 'cart-data',
                cart: cartData,
                metadata: {
                  timestamp: new Date().toISOString(),
                  shopUrl: window.location.hostname,
                  shopifyDomain: shopifyDomain,
                  source: 'shopify-integration'
                }
              }, '*');
            }
          };
        })
        .catch(error => {
          console.error('Error fetching cart data:', error);
          // Set iframe src even if cart data fetch fails
          iframe.src = iframeUrl.toString();
        });
      
      modal.appendChild(iframe);
      document.body.appendChild(modal);
    }
    
    // Set up message handler
    window.addEventListener('message', function messageHandler(event) {
      // Only accept messages from our checkout form
      if (event.origin !== 'https://checkout-form-zeta.vercel.app') return;

      console.log('Received message from iframe:', event.data?.type || event.data);

      // Handle messages from iframe
      const messageType = event.data?.type || event.data;
      
      switch (messageType) {
        case 'request-cart-data':
          console.log('Received request for cart data from iframe');
          
          // Check if we have Buy Now data
          if (window.shopifyCart && window.shopifyCart.cart_type === 'buy_now') {
            console.log('We have Buy Now data, sending it directly to iframe');
            
            // Make sure we have product data
            const buyNowProduct = window.buyNowProduct || 
               (localStorage.getItem('buyNowProduct') ? JSON.parse(localStorage.getItem('buyNowProduct')) : null);
            
            // Debug the product data
            console.log('Buy Now product data check:', {
              windowBuyNowProduct: window.buyNowProduct ? true : false,
              localStorageBuyNowProduct: localStorage.getItem('buyNowProduct') ? true : false,
              buyNowProduct: buyNowProduct,
              windowShopifyCart: window.shopifyCart
            });
            
            // Make sure the data has the expected structure with both product and items
            if (!window.shopifyCart.items || window.shopifyCart.items.length === 0) {
              console.log('Buy Now cart has no items, adding product to cart');
              
              // If we don't have product data, create a test product
              if (!buyNowProduct) {
                console.log('No product data found for Buy Now. Current page product data is required.');
                
                // Try to extract product data from the page again
                const pageProduct = extractProductFromPage();
                
                if (pageProduct) {
                  console.log('Extracted product from page:', pageProduct);
                  window.buyNowProduct = pageProduct;
                  localStorage.setItem('buyNowProduct', JSON.stringify(pageProduct));
                  window.shopifyCart.product = pageProduct;
                } else {
                  console.error('Could not extract product data from the page.');
                  if (event.source) {
                    event.source.postMessage({
                      type: 'error-message',
                      message: 'Не можахме да намерим информация за продукта. Моля, опитайте отново.'
                    }, '*');
                  }
                  return;
                }
              }
              
              // Use buyNowProduct or the test product we just created
              const product = buyNowProduct || window.buyNowProduct;
              
              if (product) {
                window.shopifyCart.items = [{
                  id: product.variant_id || product.id,
                  title: product.title,
                  quantity: product.quantity || 1,
                  price: product.price,
                  line_price: product.price * (product.quantity || 1),
                  original_line_price: (product.compare_at_price || product.price) * (product.quantity || 1),
                  variant_id: product.variant_id || product.id,
                  product_id: product.id,
                  sku: product.sku || '',
                  variant_title: product.variant_title || '',
                  vendor: product.vendor || '',
                  image: product.image?.src || product.featured_image || null,
                  requires_shipping: true
                }];
                window.shopifyCart.total_price = product.price * (product.quantity || 1);
                window.shopifyCart.items_subtotal_price = product.price * (product.quantity || 1);
                window.shopifyCart.total_discount = product.compare_at_price ? 
                  (product.compare_at_price - product.price) * (product.quantity || 1) : 0;
                window.shopifyCart.item_count = product.quantity || 1;
                window.shopifyCart.currency = 'BGN';
                window.shopifyCart.product = product; // Make sure product data is included
              }
            }
            
            if (event.source) {
              event.source.postMessage({
                type: 'cart-data',
                cart: window.shopifyCart,
                product: buyNowProduct, // Send the individual product explicitly
                metadata: {
                  timestamp: new Date().toISOString(),
                  shopUrl: window.location.hostname,
                  source: 'buy_now_button',
                  hasItems: true,
                  itemCount: window.shopifyCart.item_count || 1,
                  isBuyNowContext: true,
                  isSingleProduct: true
                }
              }, '*');
            }
            break;
          }
          
          // Otherwise fetch fresh cart data
          fetch('/cart.js')
            .then(response => response.json())
            .then(cartData => {
              window.shopifyCart = cartData;
              window.cartData = cartData;
              
              // Check if we're in a Buy Now context (even with empty cart)
              const isBuyNowContext = window.location.href.includes('product') || 
                                     document.querySelector('.shopify-payment-button') !== null;
              
              // Add Buy Now context to empty carts when appropriate
              if (isBuyNowContext && (!cartData.items || cartData.items.length === 0)) {
                console.log('Adding Buy Now context to empty cart in domain response:', cartData);
                cartData.cart_type = 'buy_now';
                cartData.source = 'buy_now_button';
              }
              
              console.log('Sending fresh cart data to iframe:', cartData);
              if (event.source) {
                event.source.postMessage({
                  type: 'cart-data',
                  cart: cartData,
                  metadata: {
                    timestamp: new Date().toISOString(),
                    shopUrl: window.location.hostname,
                    hasItems: cartData.items && cartData.items.length > 0,
                    itemCount: cartData.items?.length || 0,
                    isBuyNowContext: isBuyNowContext
                  }
                }, '*');
              }
            })
            .catch(error => {
              console.error('Error fetching cart data:', error);
            });
          break;

        case 'GET_SHOPIFY_DOMAIN':
          event.source.postMessage({
            type: 'SHOPIFY_DOMAIN_RESPONSE',
            domain: shopifyDomain
          }, '*');
          
          // Send cart data along with domain response
          if (window.shopifyCart && event.source) {
            // Special handling for Buy Now data
            let metadata = { timestamp: new Date().toISOString() };
            
            // Ensure Buy Now data has the correct structure
            if (window.shopifyCart.cart_type === 'buy_now') {
              metadata.source = 'buy_now_button';
              metadata.hasItems = true;
              metadata.itemCount = window.shopifyCart.item_count || 1;
              
              // Make sure the data has the expected structure with both product and items
              if (!window.shopifyCart.items && window.shopifyCart.product) {
                const product = window.shopifyCart.product;
                window.shopifyCart.items = [{
                  id: product.variant_id || product.id,
                  title: product.title,
                  quantity: product.quantity || 1,
                  price: product.price,
                  line_price: product.price * (product.quantity || 1),
                  original_line_price: (product.compare_at_price || product.price) * (product.quantity || 1),
                  variant_id: product.variant_id || product.id,
                  product_id: product.id,
                  sku: product.sku || '',
                  variant_title: product.variant_title || '',
                  vendor: product.vendor || '',
                  image: product.image?.src || product.featured_image || null,
                  requires_shipping: true
                }];
                window.shopifyCart.total_price = product.price * (product.quantity || 1);
                window.shopifyCart.items_subtotal_price = product.price * (product.quantity || 1);
                window.shopifyCart.total_discount = product.compare_at_price ? 
                  (product.compare_at_price - product.price) * (product.quantity || 1) : 0;
                window.shopifyCart.item_count = product.quantity || 1;
                window.shopifyCart.currency = 'BGN';
              }
            } else {
              metadata.hasItems = window.shopifyCart.items && window.shopifyCart.items.length > 0;
              metadata.itemCount = window.shopifyCart.items?.length || 0;
            }
            
            event.source.postMessage({
              type: 'cart-data',
              cart: window.shopifyCart,
              metadata: metadata
            }, '*');
          } else {
            // If we don't have cart data yet, fetch it
            fetch('/cart.js')
              .then(response => response.json())
              .then(cartData => {
                window.shopifyCart = cartData;
                window.cartData = cartData;
                
                // Check if we're in a Buy Now context (even with empty cart)
                const isBuyNowContext = window.location.href.includes('product') || 
                                      document.querySelector('.shopify-payment-button') !== null;
                
                // Add Buy Now context to empty carts when appropriate
                if (isBuyNowContext && (!cartData.items || cartData.items.length === 0)) {
                  console.log('Adding Buy Now context to empty cart in domain response:', cartData);
                  cartData.cart_type = 'buy_now';
                  cartData.source = 'buy_now_button';
                }
                
                if (event.source) {
                  event.source.postMessage({
                    type: 'cart-data',
                    cart: cartData,
                    metadata: {
                      timestamp: new Date().toISOString(),
                      hasItems: cartData.items && cartData.items.length > 0,
                      itemCount: cartData.items?.length || 0,
                      isBuyNowContext: isBuyNowContext
                    }
                  }, '*');
                }
              })
              .catch(error => console.error('Error fetching cart data:', error));
          }
          break;

        case 'submit-checkout':
          handleOrderCreation(event.data.formData, event.source);
          break;

        case 'checkout-closed':
          if (document.body.contains(modal)) {
            document.body.removeChild(modal);
          }
          window.removeEventListener('message', messageHandler);
          // Send cleanup confirmation back to iframe
          if (event.source) {
            event.source.postMessage({ type: 'checkout-cleanup-done' }, '*');
          }
          break;
      }
    });
  }

  // Function to handle order creation
  async function handleOrderCreation(formData, source) {
    try {
      console.log('Creating order with data:', formData);
      
      debugger;
      // Show loading state in the iframe
      source.postMessage({
        type: 'order-processing',
        message: 'Създаване на поръчка..'
      }, '*');
      
      // Format cart data to match API expectations
      const cartItems = formData.cartData.items.map(item => ({
        id: item.id,
        quantity: item.quantity,
        title: item.title,
        price: item.price,
        variant_id: item.variant_id,
        product_id: item.product_id,
        sku: item.sku || '',
        variant_title: item.variant_title || '',
        vendor: item.vendor || '',
        line_price: item.line_price
      }));

      const requestPayload = {
        shop_domain: formData.shop_domain,
        cart: {
          items: cartItems,
          currency: formData.cartData.currency,
          total_price: formData.cartData.total_price,
          total_weight: formData.cartData.total_weight,
          item_count: formData.cartData.item_count,
          items_subtotal_price: formData.cartData.items_subtotal_price,
          total_discount: formData.cartData.total_discount,
          requires_shipping: formData.cartData.requires_shipping
        },
        shipping_method: formData.shipping_method,
        shipping_price: formData.shipping_price,
        shipping_method_data: formData.shipping_method_data,
        client_details: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
          email: formData.email,
          address: {
            city: formData.city,
            address1: formData.address,
            postcode: formData.postalCode
          },
          note: formData.note || ''
        }
      };

      console.log('Sending formatted request:', requestPayload);
      
      const response = await fetch('https://checkout-form-zeta.vercel.app/api/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response from API:', errorText);
        throw new Error(`Failed to create order: ${response.status}`);
      }

      const data = await response.json();
      console.log('Order created successfully:', data);

      if (data.success && data.order && data.order.order_status_url) {
        // First notify the iframe about successful order creation
        source.postMessage({
          type: 'order-created',
          data: data
        }, '*');

        // Show success message before redirect
        source.postMessage({
          type: 'order-redirect',
          message: 'Пренасочване към страницата на поръчката...'
        }, '*');

        // Short delay to show the success message
        setTimeout(() => {
          window.location.href = data.order.order_status_url;
        }, 500);
      } else {
        throw new Error('Invalid response format from API');
      }

    } catch (error) {
      console.error('Error creating order:', error);
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
      
      // Try JSON first
      const productJson = document.getElementById('ProductJson-product-template') || 
                         document.getElementById('ProductJson-product') ||
                         document.querySelector('[id^="ProductJson-"]') ||
                         document.querySelector('script[type="application/json"][data-product-json]');
                         
      if (productJson && productJson.textContent) {
        const product = JSON.parse(productJson.textContent);
        console.log('Found product JSON:', product);
        return product;
      }
      
      // Try meta tags
      const price = document.querySelector('meta[property="product:price:amount"]')?.content;
      const title = document.querySelector('meta[property="og:title"]')?.content;
      const image = document.querySelector('meta[property="og:image"]')?.content;
      const url = window.location.href;
      const productId = url.match(/\/products\/([^\/\?#]+)/)?.[1];
      
      if (price && title) {
        return {
          id: productId || 'unknown',
          title: title,
          price: parseFloat(price) * 100, // Convert to cents
          featured_image: image,
          url: url,
          quantity: 1
        };
      }
      
      // Try extracting directly from the page HTML
      const priceElement = document.querySelector('.price') || 
                          document.querySelector('[data-product-price]') ||
                          document.querySelector('.product-price') ||
                          document.querySelector('[data-price]');
      
      const titleElement = document.querySelector('h1') || 
                          document.querySelector('.product-title') ||
                          document.querySelector('[data-product-title]');
      
      const imageElement = document.querySelector('.product-featured-image') ||
                          document.querySelector('[data-product-featured-image]') ||
                          document.querySelector('.product-single__photo') ||
                          document.querySelector('.product-image');
      
      if (priceElement && titleElement) {
        // Extract price - remove currency and non-numeric characters
        let priceText = priceElement.textContent.trim().replace(/[^\d.,]/g, '').replace(',', '.');
        const price = parseFloat(priceText) * 100; // Convert to cents
        
        return {
          id: productId || 'unknown',
          title: titleElement.textContent.trim(),
          price: isNaN(price) ? 0 : price,
          featured_image: imageElement?.src || null,
          url: window.location.href,
          quantity: 1
        };
      }
      
      return null;
    } catch (e) {
      console.error('Error extracting product from page:', e);
      return null;
    }
  }

  // Start when the page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserving);
  } else {
    startObserving();
  }

  // When page loads, make cart data globally available
  document.addEventListener('DOMContentLoaded', function() {
    // Get cart data on page load and make it available for the checkout form
    fetch('/cart.js')
      .then(response => response.json())
      .then(cartData => {
        console.log('Shopify cart data loaded:', cartData);
        // Store cart data globally
        window.shopifyCart = cartData;
        // Store for checkout form
        window.cartData = cartData;
      })
      .catch(error => console.error('Error fetching cart data:', error));
  });
})(); 