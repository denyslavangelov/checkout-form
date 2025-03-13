// Custom checkout integration for Shopify
(function() {
  // Store original addEventListener method
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  
  // Override addEventListener to intercept checkout button click handlers
  EventTarget.prototype.addEventListener = function(type, listener, options) {
    // Call the original method
    const result = originalAddEventListener.call(this, type, listener, options);
    
    // Check if this is a checkout button and a click event
    if (this.id === 'CartDrawer-Checkout' && type === 'click') {
      console.log('Detected click handler being added to checkout button!');
      
      // Add our custom handler right after (this will run last)
      setTimeout(() => {
        addOurCheckoutHandler();
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
      if (this.id === 'CartDrawer-Checkout') {
        console.log('Detected onclick property being set on checkout button!');
        
        // Add our custom handler right after
        setTimeout(() => {
          addOurCheckoutHandler();
        }, 100);
      }
      
      return result;
    },
    get: originalOnClickDescriptor.get
  });
  
  // Function to add our checkout handler
  function addOurCheckoutHandler() {
    const checkoutButton = document.getElementById('CartDrawer-Checkout');
    
    if (checkoutButton && !checkoutButton._hasOurHandler) {
      console.log('Adding our checkout handler');
      
      // Mark this button as processed
      checkoutButton._hasOurHandler = true;
      
      // Use capture phase to get event first, before other handlers
      checkoutButton.addEventListener('click', function(e) {
        console.log('OUR HANDLER EXECUTED!!!');
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
      if (getComputedStyle(checkoutButton).position === 'static') {
        checkoutButton.style.position = 'relative';
      }
      
      checkoutButton.appendChild(dot);
    }
  }
  
  // Function to continuously monitor for the button
  function monitorForCheckoutButton() {
    const checkoutButton = document.getElementById('CartDrawer-Checkout');
    
    if (checkoutButton && 
        checkoutButton.offsetParent !== null && // Button is visible
        !checkoutButton._hasOurHandler) { 
      addOurCheckoutHandler();
    }
  }
  
  // Monitor the DOM for changes to catch when the cart drawer opens
  function startObserving() {
    // Check frequently for the checkout button
    setInterval(monitorForCheckoutButton, 500);
    
    // Also use MutationObserver to detect when the cart drawer is added/shown
    const observer = new MutationObserver(function() {
      monitorForCheckoutButton();
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
  // Create modal container if it doesn't exist
  let modal = document.getElementById('custom-checkout-modal');
  
  if (!modal) {
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
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '15px';
    closeButton.style.right = '15px';
    closeButton.style.fontSize = '24px';
    closeButton.style.background = 'white';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '50%';
    closeButton.style.width = '30px';
    closeButton.style.height = '30px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.display = 'flex';
    closeButton.style.alignItems = 'center';
    closeButton.style.justifyContent = 'center';
    closeButton.style.zIndex = '10000';
    
    closeButton.addEventListener('click', function() {
      // Send message to iframe to close the checkout form
      const iframe = document.getElementById('checkout-iframe');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage('close-checkout', '*');
      }
      
      // Also close the modal
      document.body.removeChild(modal);
    });
    
    modal.appendChild(closeButton);
    
    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.id = 'checkout-iframe';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.maxWidth = '600px';
    iframe.style.maxHeight = '90%';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '8px';
    iframe.style.backgroundColor = 'white';
    
    // Set the URL of your Next.js iframe page
    iframe.src = 'https://checkout-form-zeta.vercel.app/iframe';
    
    modal.appendChild(iframe);
    
    // Listen for messages from the iframe
    window.addEventListener('message', function(event) {
      if (event.data === 'checkout-closed') {
        // Remove the modal when checkout is closed
        if (document.body.contains(modal)) {
          document.body.removeChild(modal);
        }
      }
    });
    
    document.body.appendChild(modal);
  }
} 