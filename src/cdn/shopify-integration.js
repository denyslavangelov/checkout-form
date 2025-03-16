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
  
  // Start when the page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserving);
  } else {
    startObserving();
  }
})();

function openCustomCheckout() {
  console.log('Opening custom checkout...');
  
  // Create a visual loading indicator immediately
  const loadingOverlay = document.createElement('div');
  loadingOverlay.style.position = 'fixed';
  loadingOverlay.style.top = '0';
  loadingOverlay.style.left = '0';
  loadingOverlay.style.width = '100%';
  loadingOverlay.style.height = '100%';
  loadingOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  loadingOverlay.style.zIndex = '9998'; // Just below the modal
  loadingOverlay.style.display = 'flex';
  loadingOverlay.style.justifyContent = 'center';
  loadingOverlay.style.alignItems = 'center';
  
  const loadingContent = document.createElement('div');
  loadingContent.style.backgroundColor = 'white';
  loadingContent.style.padding = '20px';
  loadingContent.style.borderRadius = '8px';
  loadingContent.style.textAlign = 'center';
  loadingContent.style.maxWidth = '90%';
  
  const spinner = document.createElement('div');
  spinner.style.width = '40px';
  spinner.style.height = '40px';
  spinner.style.margin = '0 auto 15px auto';
  spinner.style.border = '4px solid #f3f3f3';
  spinner.style.borderTop = '4px solid #3498db';
  spinner.style.borderRadius = '50%';
  spinner.style.animation = 'checkoutSpin 1s linear infinite';
  
  const spinnerStyle = document.createElement('style');
  spinnerStyle.textContent = '@keyframes checkoutSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
  document.head.appendChild(spinnerStyle);
  
  const loadingText = document.createElement('div');
  loadingText.textContent = 'Зареждане на кошницата...';
  loadingText.style.fontWeight = 'bold';
  
  loadingContent.appendChild(spinner);
  loadingContent.appendChild(loadingText);
  loadingOverlay.appendChild(loadingContent);
  document.body.appendChild(loadingOverlay);
  
  // First, fetch the current cart data
  fetch('/cart.js')
    .then(response => response.json())
    .then(cartData => {
      console.log('Cart data retrieved:', cartData);
      
      // Make cart data globally available so the checkout form can access it
      window.shopifyCart = cartData;
      window.customCheckoutData = {
        cartData: cartData,
        timestamp: new Date().toISOString()
      };
      console.log('Cart data made globally available at window.shopifyCart and window.customCheckoutData.cartData');
      
      // Create modal container if it doesn't exist
      let modal = document.getElementById('custom-checkout-modal');

        modal = document.createElement('div');
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
        
        // Create iframe
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
        
        // Add cart data as URL parameters to ensure it's available immediately
        const iframeUrl = new URL('https://checkout-form-zeta.vercel.app/iframe');
        iframeUrl.searchParams.append('hasCart', 'true');
        
        // Enhanced mobile styling
        if (window.innerWidth < 768) {
          // Full width on very small screens
          iframe.style.maxWidth = '100%';
          iframe.style.maxHeight = '100%';
          iframe.style.height = '100%';
          iframe.style.borderRadius = '0';
          
          // Add a parameter to tell the iframe it's on mobile
          iframeUrl.searchParams.append('isMobile', 'true');
          
          // Make sure the modal takes up full screen on mobile
          modal.style.padding = '0';
        } else if (window.innerWidth < 992) {
          // Medium screens (tablets)
          iframe.style.maxWidth = '90%';
          iframe.style.maxHeight = '95vh';
          
          // Add a parameter for tablet size
          iframeUrl.searchParams.append('isTablet', 'true');
        }
        
        // Add meta viewport instructions for better mobile rendering
        const metaTag = document.createElement('meta');
        iframeUrl.searchParams.append('viewportWidth', window.innerWidth);
        iframeUrl.searchParams.append('pixelRatio', window.devicePixelRatio || 1);
        
        // Pre-stringify cart data for more reliable storage
        try {
          localStorage.setItem('tempCartData', JSON.stringify(cartData));
          console.log('Cart data saved to localStorage as backup before iframe loads');
        } catch (e) {
          console.warn('Could not store cart data in localStorage', e);
        }
        
        // Set up a listener before loading the iframe
        window.addEventListener('message', function cartDataHandler(event) {
          // Handle requests for cart data from the iframe
          if (event.data === 'request-cart-data') {
            console.log('Received request for cart data from iframe, sending data...');
            if (iframe.contentWindow) {
              iframe.contentWindow.postMessage({
                type: 'cart-data',
                cart: cartData,
                metadata: {
                  timestamp: new Date().toISOString(),
                  shopUrl: window.location.hostname,
                  source: 'shopify-integration',
                  resent: true
                }
              }, '*');
            }
          }
          
          // Remove loading overlay when checkout-ready message received
          if (event.data === 'checkout-ready') {
            if (document.body.contains(loadingOverlay)) {
              document.body.removeChild(loadingOverlay);
            }
          }
          
          // Close the modal when checkout is closed
          if (event.data === 'checkout-closed') {
            if (document.body.contains(modal)) {
              document.body.removeChild(modal);
            }
            window.removeEventListener('message', cartDataHandler);
          }
        });
        
        // Now set the iframe source
        iframe.src = iframeUrl.toString();
        modal.appendChild(iframe);
        document.body.appendChild(modal);
        
        // Multiple approaches to ensure cart data is received:
        
        // 1. Wait for iframe to load, then send cart data
        iframe.onload = function() {
          console.log('Iframe loaded, sending cart data...');
          
          // Remove the loading overlay once iframe has loaded
          if (document.body.contains(loadingOverlay)) {
            document.body.removeChild(loadingOverlay);
          }
          
          // Send the cart data via postMessage
          iframe.contentWindow.postMessage({
            type: 'cart-data',
            cart: cartData,
            metadata: {
              timestamp: new Date().toISOString(),
              shopUrl: window.location.hostname,
              source: 'shopify-integration'
            }
          }, '*');
          
          // Log the message sent to iframe
          console.log('Sent cart data to iframe with details:', {
            itemCount: cartData.items.length,
            total: cartData.total_price,
            items: cartData.items.map(item => ({
              id: item.id,
              title: item.title,
              quantity: item.quantity
            }))
          });
          
          // Send data again after a short delay as backup
          setTimeout(() => {
            console.log('Sending cart data again after delay to ensure receipt...');
            iframe.contentWindow.postMessage({
              type: 'cart-data',
              cart: cartData,
              metadata: {
                timestamp: new Date().toISOString(),
                shopUrl: window.location.hostname,
                source: 'shopify-integration',
                resent: true
              }
            }, '*');
          }, 500); // Reduced from 1000ms to 500ms
        };
    })
    .catch(error => {
      console.error('Error fetching cart data:', error);
      
      // Remove loading overlay in case of error
      if (document.body.contains(loadingOverlay)) {
        document.body.removeChild(loadingOverlay);
      }
      
      alert('Възникна грешка при зареждането на информацията за кошницата. Моля, опитайте отново.');
    });
} 