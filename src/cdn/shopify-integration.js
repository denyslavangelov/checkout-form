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
  
  function initializeCustomCheckout() {
    // Function to extract product data from the page
    function getProductData() {
      try {
        // Try to get product data from the page
        const productJson = document.querySelector('[data-product-json]')?.textContent;
        if (productJson) {
          const product = JSON.parse(productJson);
          const variant = product.variants[0]; // Default to first variant if none selected
          
          return {
            id: product.id,
            title: product.title,
            price: variant.price * 100, // Convert to cents
            variant_id: variant.id,
            image: product.featured_image,
            sku: variant.sku,
            variant_title: variant.title !== "Default Title" ? variant.title : "",
            vendor: product.vendor,
            quantity: 1
          };
        }
        return null;
      } catch (error) {
        console.error('Error getting product data:', error);
        return null;
      }
    }

    // Function to handle checkout button clicks
    function handleCheckoutClick(event) {
      const button = event.target.closest('button, .button, [type="button"], [type="submit"]');
      if (!button) return;

      // Check if this is a buy now or checkout button
      const isBuyNowButton = button.textContent?.toLowerCase().includes('buy') || 
                            button.getAttribute('name')?.toLowerCase().includes('buy') ||
                            button.classList.toString().toLowerCase().includes('buy');

      if (isBuyNowButton) {
        event.preventDefault();
        event.stopPropagation();

        // Get product data for buy now
        const productData = getProductData();
        if (productData) {
          openCustomCheckout({ product: productData });
        } else {
          console.error('Could not get product data for buy now');
        }
      } else if (button.textContent?.toLowerCase().includes('checkout') ||
                 button.getAttribute('name')?.toLowerCase().includes('checkout') ||
                 button.classList.toString().toLowerCase().includes('checkout')) {
        event.preventDefault();
        event.stopPropagation();
        
        // Use regular cart data for checkout
        openCustomCheckout();
      }
    }

    // Add click event listener to the document
    document.addEventListener('click', handleCheckoutClick, true);

    // Function to open custom checkout
    function openCustomCheckout(data = null) {
      // Create modal container if it doesn't exist
      let modalContainer = document.getElementById('custom-checkout-modal');
      if (!modalContainer) {
        modalContainer = document.createElement('div');
        modalContainer.id = 'custom-checkout-modal';
        modalContainer.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
        `;
        document.body.appendChild(modalContainer);
      }

      // Create iframe if it doesn't exist
      let checkoutFrame = document.getElementById('custom-checkout-frame');
      if (!checkoutFrame) {
        checkoutFrame = document.createElement('iframe');
        checkoutFrame.id = 'custom-checkout-frame';
        checkoutFrame.style.cssText = `
          width: 100%;
          height: 100%;
          border: none;
          background: transparent;
        `;
        modalContainer.appendChild(checkoutFrame);
      }

      // Set iframe src with data
      const baseUrl = 'https://checkout.example.com'; // Replace with your actual checkout URL
      checkoutFrame.src = baseUrl;

      // Listen for messages from the iframe
      window.addEventListener('message', function(event) {
        if (event.data.type === 'GET_SHOPIFY_DOMAIN') {
          // Send shop domain to the iframe
          checkoutFrame.contentWindow.postMessage({
            type: 'SHOPIFY_DOMAIN_RESPONSE',
            domain: window.Shopify?.shop || window.location.host
          }, '*');
        } else if (event.data.type === 'checkout-closed') {
          // Handle checkout close
          modalContainer.style.display = 'none';
          // Send cleanup confirmation
          checkoutFrame.contentWindow.postMessage({
            type: 'checkout-cleanup-done'
          }, '*');
        } else if (event.data.type === 'submit-checkout') {
          // Handle order creation
          handleOrderCreation(event.data.formData)
            .then(response => {
              checkoutFrame.contentWindow.postMessage({
                type: 'order-created',
                data: response
              }, '*');
            })
            .catch(error => {
              checkoutFrame.contentWindow.postMessage({
                type: 'order-error',
                error: error.message
              }, '*');
            });
        }
      });

      // Show the modal
      modalContainer.style.display = 'flex';

      // If we have data (from buy now), pass it to the iframe
      if (data) {
        // Wait for iframe to load
        checkoutFrame.onload = function() {
          setTimeout(() => {
            checkoutFrame.contentWindow.postMessage({
              type: 'SET_CART_DATA',
              data: data
            }, '*');
          }, 500);
        };
      }
    }
  }

  // Start when the page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserving);
  } else {
    startObserving();
  }
})(); 