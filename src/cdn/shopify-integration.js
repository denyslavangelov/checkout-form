/**
 * Office Selector CDN Integration Script - Simplified Version
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
 *   buttonTargets: {
 *     targetByClass: ['cart__checkout-button', 'checkout-button']
 *   }
 * };
 * </script>
 * <script src="https://checkout-form-zeta. brainly.com/cdn/shopify-integration.js"></script>
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
      targetByClass: [], // Array of class names to target
      debugMode: false // Show red dots on targeted buttons
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
  
  // Log the targeting mode
  if (finalConfig.buttonTargets.targetByClass.length > 0) {
    console.log('🎯 Using class-based targeting mode');
  } else {
    console.log('🎯 No class targeting configured - using fallback detection');
  }

  // Simple class-based targeting or fallback detection
  if (finalConfig.buttonTargets.targetByClass.length > 0) {
    // Class-based targeting
    findAndInitializeCheckoutButtons();
  } else {
    // Fallback: use onclick override for smart detection
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
    } else {
      // For checkout buttons, this is a cart checkout
      isCartCheckout = true;
      productData = {
        productId: 'cart',
        variantId: 'cart'
      };
    }
    
    if (!productData) {
      console.error('❌ Could not determine product data for button:', button);
      return;
    }
    
    // Show the office selector
    showOfficeSelectorModal(productData, isCartCheckout);
  }

  // Function to show office selector modal
  function showOfficeSelectorModal(productData, isCartCheckout) {
    // Create and show the modal
    const modalHtml = OFFICE_SELECTOR_HTML;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const backdrop = document.getElementById('office-selector-backdrop');
    const iframe = document.getElementById('office-selector-iframe');
    
    // Show the modal
    backdrop.style.display = 'block';
    iframe.style.display = 'block';
    
    // Set iframe source with product data and configuration
    const configParam = encodeURIComponent(JSON.stringify(finalConfig));
    const quantityParam = productData.quantity ? `&quantity=${encodeURIComponent(productData.quantity)}` : '';
    const officeSelectorUrl = `${baseUrl}/office-selector?productId=${encodeURIComponent(productData.productId)}&variantId=${encodeURIComponent(productData.variantId)}${quantityParam}&config=${configParam}`;
    
    iframe.src = officeSelectorUrl;
    
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
      
      if (event.data?.type === 'office-selector-closed') {
        // Close the modal
        closeOfficeSelectorModal();
      } else if (event.data?.type === 'order-created') {
        // Redirect to checkout
        window.location.href = event.data.checkoutUrl;
      }
    };
    
    window.addEventListener('message', messageHandler);
    
    // Close modal when backdrop is clicked
    backdrop.addEventListener('click', closeOfficeSelectorModal);
    
    // Close modal when escape key is pressed
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeOfficeSelectorModal();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
  }

  // Function to close office selector modal
  function closeOfficeSelectorModal() {
    const backdrop = document.getElementById('office-selector-backdrop');
    const iframe = document.getElementById('office-selector-iframe');
    
    if (backdrop) {
      backdrop.remove();
    }
    if (iframe) {
      iframe.remove();
    }
  }

  // Function to find and initialize checkout buttons using class-based targeting
  function findAndInitializeCheckoutButtons() {
    // Simple class-based targeting only
    const buttons = [];
    
    // Find buttons by class names
    if (finalConfig.buttonTargets.targetByClass.length > 0) {
      finalConfig.buttonTargets.targetByClass.forEach(targetClass => {
        const classButtons = document.querySelectorAll(`.${targetClass}`);
        buttons.push(...Array.from(classButtons));
      });
    }
    
    // Remove duplicates
    const uniqueButtons = [...new Set(buttons)];
    
    // Initialize each button
    uniqueButtons.forEach(button => {
      initializeButton(button);
    });
    
    console.log(`🎯 Initialized ${uniqueButtons.length} buttons using class-based targeting`);
  }

  // Function to initialize a button
  function initializeButton(button) {
    // Remove any existing listeners
    button.removeEventListener('click', showOfficeSelector);
    
    // Add our click listener
    button.addEventListener('click', showOfficeSelector);
    
    // Add visual indicator if debug mode is enabled
    if (finalConfig.buttonTargets.debugMode) {
      button.style.position = 'relative';
      button.style.border = '2px solid red';
      
      // Add a small red dot
      const dot = document.createElement('div');
      dot.style.position = 'absolute';
      dot.style.top = '-5px';
      dot.style.right = '-5px';
      dot.style.width = '10px';
      dot.style.height = '10px';
      dot.style.backgroundColor = 'red';
      dot.style.borderRadius = '50%';
      dot.style.zIndex = '9999';
      button.appendChild(dot);
    }
  }

  // Function to add our checkout handler (for fallback detection)
  function addOurCheckoutHandler(element) {
    if (element.tagName === 'BUTTON' || element.tagName === 'INPUT' || element.tagName === 'A') {
      // Check if this looks like a checkout button
      const text = element.textContent?.toLowerCase() || '';
      const className = element.className?.toLowerCase() || '';
      const id = element.id?.toLowerCase() || '';
      
      if (text.includes('checkout') || text.includes('buy now') || text.includes('купи сега') ||
          className.includes('checkout') || className.includes('buy-now') || className.includes('buy') ||
          id.includes('checkout') || id.includes('buy-now') || id.includes('buy')) {
        
        initializeButton(element);
      }
    }
  }

  // Base URL for the office selector
  const baseUrl = 'https://checkout-form-zeta.vercel.app';

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (finalConfig.buttonTargets.targetByClass.length > 0) {
        findAndInitializeCheckoutButtons();
      }
    });
  } else {
    if (finalConfig.buttonTargets.targetByClass.length > 0) {
      findAndInitializeCheckoutButtons();
    }
  }

  // Also initialize when new content is added (for dynamic content)
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) { // Element node
          if (finalConfig.buttonTargets.targetByClass.length > 0) {
            finalConfig.buttonTargets.targetByClass.forEach(targetClass => {
              const buttons = node.querySelectorAll(`.${targetClass}`);
              buttons.forEach(button => {
                initializeButton(button);
              });
            });
          }
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

})();
