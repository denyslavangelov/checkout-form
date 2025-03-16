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
        openCustomCheckout();
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
  
  function openCustomCheckout() {
    console.log('Opening custom checkout...');
    
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
    
    // Set up message handler
    window.addEventListener('message', function messageHandler(event) {
      // Only accept messages from our checkout form
      if (event.origin !== 'https://checkout-form-zeta.vercel.app') return;

      switch (event.data.type) {
        case 'request-cart-data':
          if (window.shopifyCart && iframe.contentWindow) {
            iframe.contentWindow.postMessage({
              type: 'cart-data',
              cart: window.shopifyCart,
              metadata: {
                timestamp: new Date().toISOString(),
                shopUrl: window.location.hostname,
                shopifyDomain: shopifyDomain,
                source: 'shopify-integration'
              }
            }, '*');
          }
          break;

        case 'GET_SHOPIFY_DOMAIN':
          event.source.postMessage({
            type: 'SHOPIFY_DOMAIN_RESPONSE',
            domain: shopifyDomain
          }, '*');
          break;

        case 'submit-checkout':
          handleOrderCreation(event.data.formData, event.source);
          break;

        case 'checkout-closed':
          if (document.body.contains(modal)) {
            document.body.removeChild(modal);
          }
          window.removeEventListener('message', messageHandler);
          break;
      }
    });
    
    // Show the iframe immediately
    iframe.src = iframeUrl.toString();
    modal.appendChild(iframe);
    document.body.appendChild(modal);
    
    // Fetch cart data in parallel
    fetch('/cart.js')
      .then(response => response.json())
      .then(cartData => {
        window.shopifyCart = cartData;
        window.customCheckoutData = {
          cartData: cartData,
          timestamp: new Date().toISOString()
        };
        
        try {
          localStorage.setItem('tempCartData', JSON.stringify(cartData));
        } catch (e) {
          console.warn('Could not store cart data in localStorage', e);
        }
        
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
      })
      .catch(error => {
        console.error('Error fetching cart data:', error);
        alert('Възникна грешка при зареждането на информацията за кошницата. Моля, опитайте отново.');
      });
  }

  // Function to handle order creation
  async function handleOrderCreation(formData, source) {
    try {
      console.log('Creating order with data:', formData);
      
      const response = await fetch('https://shipfast-v2.vercel.app/api/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'no-cors', // Add this to handle CORS
        body: JSON.stringify({
          domain: formData.shop_domain,
          cart_data: formData.cartData,
          shipping_method: formData.shippingMethod
        })
      });

      // With no-cors mode, we can't read the response
      // Assume success if the request didn't throw
      source.postMessage({
        type: 'order-created',
        data: { status: 'success' }
      }, '*');

    } catch (error) {
      console.error('Error creating order:', error);
      source.postMessage({
        type: 'order-error',
        error: error.message
      }, '*');
    }
  }

  // Start when the page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserving);
  } else {
    startObserving();
  }
})(); 