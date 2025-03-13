// Custom checkout integration for Shopify
document.addEventListener('DOMContentLoaded', function() {
  // Find the checkout button in cart drawer
  const checkoutButton = document.getElementById('CartDrawer-Checkout');
  
  if (checkoutButton) {
    // Replace the default checkout behavior
    checkoutButton.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Open our custom checkout in an iframe modal
      openCustomCheckout();
    });
  }
});

function openCustomCheckout() {
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
    iframe.src = 'vercel/iframe';
    
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