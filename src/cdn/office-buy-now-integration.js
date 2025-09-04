/**
 * Office Buy Now Integration
 * Attach this script to your live site to enable office selection on Buy Now buttons
 * 
 * Usage:
 * 1. Include this script on your product pages
 * 2. Add data attributes to your Buy Now buttons
 * 3. The script will intercept clicks and show office selection form
 */

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    formContainerId: 'office-selection-modal',
    apiBaseUrl: 'https://checkout-form-zeta.vercel.app', // Your deployed checkout form URL
    defaultVariantId: null, // Will be set from button data
    defaultProductId: null  // Will be set from button data
  };

  // Office selection form HTML
  const OFFICE_FORM_HTML = `
    <div id="${CONFIG.formContainerId}" class="office-modal" style="
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
      <div class="office-modal-content" style="
        background: white;
        border-radius: 8px;
        padding: 24px;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        position: relative;
      ">
        <button class="office-modal-close" style="
          position: absolute;
          top: 12px;
          right: 12px;
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
        ">&times;</button>
        
        <h3 style="margin: 0 0 20px 0; color: #333;">Select Pickup Office</h3>
        
        <div class="office-form" style="display: none;">
          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 8px; font-weight: 500;">City</label>
            <select id="office-city-select" style="
              width: 100%;
              padding: 12px;
              border: 1px solid #ddd;
              border-radius: 4px;
              font-size: 14px;
            ">
              <option value="">Loading cities...</option>
            </select>
          </div>
          
          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 8px; font-weight: 500;">Office</label>
            <select id="office-office-select" style="
              width: 100%;
              padding: 12px;
              border: 1px solid #ddd;
              border-radius: 4px;
              font-size: 14px;
            " disabled>
              <option value="">Select city first</option>
            </select>
          </div>
          
          <div id="office-preview" style="
            margin-bottom: 16px;
            padding: 12px;
            background: #f0f8ff;
            border: 1px solid #b3d9ff;
            border-radius: 4px;
            display: none;
          ">
            <div style="font-weight: 500; margin-bottom: 4px;">Selected Office:</div>
            <div id="office-details"></div>
          </div>
          
          <button id="office-create-order" style="
            width: 100%;
            padding: 12px;
            background: #007cba;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            margin-bottom: 12px;
          " disabled>
            Create Order & Checkout
          </button>
          
          <div id="office-error" style="
            padding: 12px;
            background: #ffe6e6;
            border: 1px solid #ffb3b3;
            border-radius: 4px;
            color: #d00;
            display: none;
            margin-bottom: 16px;
          "></div>
          
          <div id="office-loading" style="
            text-align: center;
            padding: 20px;
            color: #666;
          ">Loading...</div>
        </div>
      </div>
    </div>
  `;

  // State management
  let currentProductId = null;
  let currentVariantId = null;
  let cities = [];
  let offices = [];
  let selectedCityId = '';
  let selectedOfficeId = '';

  // Initialize the integration
  function init() {
    console.log('🏢 Office Buy Now Integration: Initializing...');
    
    // Add the modal HTML to the page
    if (!document.getElementById(CONFIG.formContainerId)) {
      document.body.insertAdjacentHTML('beforeend', OFFICE_FORM_HTML);
      setupEventListeners();
    }
    
    // Find and modify Buy Now buttons
    modifyBuyNowButtons();
    
    console.log('✅ Office Buy Now Integration: Ready');
  }

  // Setup event listeners for the modal
  function setupEventListeners() {
    const modal = document.getElementById(CONFIG.formContainerId);
    const closeBtn = modal.querySelector('.office-modal-close');
    const citySelect = document.getElementById('office-city-select');
    const officeSelect = document.getElementById('office-office-select');
    const createOrderBtn = document.getElementById('office-create-order');

    // Close modal
    closeBtn.addEventListener('click', hideModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) hideModal();
    });

    // City selection
    citySelect.addEventListener('change', (e) => {
      selectedCityId = e.target.value;
      loadOffices(selectedCityId);
      updateOfficeSelect();
      hideOfficePreview();
    });

    // Office selection
    officeSelect.addEventListener('change', (e) => {
      selectedOfficeId = e.target.value;
      updateOfficePreview();
      updateCreateOrderButton();
    });

    // Create order
    createOrderBtn.addEventListener('click', createOrder);
  }

  // Modify Buy Now buttons to show office selection
  function modifyBuyNowButtons() {
    // Look for common Buy Now button selectors
    const buyNowSelectors = [
      'button[data-testid*="buy-now"]',
      'button[class*="buy-now"]',
      'button[class*="buyNow"]',
      'a[href*="checkout"]',
      'button:contains("Buy Now")',
      'button:contains("Buy now")',
      'button:contains("BUY NOW")'
    ];

    buyNowSelectors.forEach(selector => {
      try {
        const buttons = document.querySelectorAll(selector);
        buttons.forEach(button => {
          if (!button.hasAttribute('data-office-integration')) {
            button.setAttribute('data-office-integration', 'true');
            button.addEventListener('click', handleBuyNowClick);
            console.log('🏢 Attached office integration to button:', button);
          }
        });
      } catch (e) {
        // Selector might not be supported in all browsers
      }
    });

    // Also look for buttons with specific text content
    const allButtons = document.querySelectorAll('button, a');
    allButtons.forEach(button => {
      const text = button.textContent?.toLowerCase() || '';
      if ((text.includes('buy now') || text.includes('buynow')) && 
          !button.hasAttribute('data-office-integration')) {
        button.setAttribute('data-office-integration', 'true');
        button.addEventListener('click', handleBuyNowClick);
        console.log('🏢 Attached office integration to text-based button:', button);
      }
    });
  }

  // Handle Buy Now button clicks
  function handleBuyNowClick(e) {
    e.preventDefault();
    e.stopPropagation();

    console.log('🏢 Buy Now button clicked, showing office selection');

    // Try to extract product and variant information
    extractProductInfo(e.target);
    
    // Show the modal
    showModal();
  }

  // Extract product information from the button or page
  function extractProductInfo(button) {
    // Try to get from data attributes
    currentProductId = button.getAttribute('data-product-id') || 
                      button.getAttribute('data-productid') ||
                      button.getAttribute('data-product');
    
    currentVariantId = button.getAttribute('data-variant-id') || 
                      button.getAttribute('data-variantid') ||
                      button.getAttribute('data-variant');

    // Try to get from parent elements
    if (!currentProductId || !currentVariantId) {
      const productForm = button.closest('form[action*="cart"]') || 
                         button.closest('[data-product-id]') ||
                         button.closest('.product-form');
      
      if (productForm) {
        currentProductId = currentProductId || productForm.getAttribute('data-product-id');
        currentVariantId = currentVariantId || productForm.querySelector('input[name="id"]')?.value;
      }
    }

    // Try to get from URL parameters or page data
    if (!currentProductId || !currentVariantId) {
      const urlParams = new URLSearchParams(window.location.search);
      currentProductId = currentProductId || urlParams.get('product_id');
      currentVariantId = currentVariantId || urlParams.get('variant_id');
    }

    console.log('🏢 Extracted product info:', {
      productId: currentProductId,
      variantId: currentVariantId
    });

    // We'll use test variant ID, so no need to check for currentVariantId
    console.log('🏢 Using test variant ID for order creation');
    return true;
  }

  // Show the modal
  function showModal() {
    const modal = document.getElementById(CONFIG.formContainerId);
    const form = modal.querySelector('.office-form');
    const loading = modal.querySelector('#office-loading');
    
    modal.style.display = 'flex';
    form.style.display = 'none';
    loading.style.display = 'block';
    
    // Load cities
    loadCities();
  }

  // Hide the modal
  function hideModal() {
    const modal = document.getElementById(CONFIG.formContainerId);
    modal.style.display = 'none';
    resetForm();
  }

  // Reset form state
  function resetForm() {
    selectedCityId = '';
    selectedOfficeId = '';
    offices = [];
    
    document.getElementById('office-city-select').selectedIndex = 0;
    document.getElementById('office-office-select').selectedIndex = 0;
    document.getElementById('office-office-select').disabled = true;
    document.getElementById('office-create-order').disabled = true;
    hideOfficePreview();
    hideError();
  }

  // Load cities - hardcoded Sofia
  async function loadCities() {
    try {
      console.log('🏢 Loading Sofia as the only city option...');
      
      // Hardcode Sofia as the only city
      cities = [{
        id: '1',
        name: 'гр. София'
      }];
      
      updateCitySelect();
      showForm();
      console.log('🏢 Sofia loaded successfully');
    } catch (error) {
      console.error('Error loading cities:', error);
      showError('Failed to load cities. Please try again.');
    }
  }

  // Load offices for selected city
  async function loadOffices(cityId) {
    try {
      const response = await fetch('http://localhost:3000/api/speedy/search-office', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          siteId: cityId,
          term: '' // Empty term to get all offices
        })
      });

      if (!response.ok) {
        throw new Error('Failed to load offices');
      }

      const data = await response.json();
      
      if (data.offices && Array.isArray(data.offices)) {
        offices = data.offices.map(office => ({
          id: office.id.toString(),
          name: office.name,
          address: office.address || office.fullAddress || 'Address not available',
          city: office.city || 'City not available'
        }));
        
        updateOfficeSelect();
      } else {
        throw new Error('Invalid offices data');
      }
    } catch (error) {
      console.error('Error loading offices:', error);
      showError('Failed to load offices. Please try again.');
    }
  }

  // Update city select dropdown
  function updateCitySelect() {
    const select = document.getElementById('office-city-select');
    select.innerHTML = '<option value="">Select city...</option>';
    
    cities.forEach(city => {
      const option = document.createElement('option');
      option.value = city.id;
      option.textContent = city.name;
      select.appendChild(option);
    });
  }

  // Update office select dropdown
  function updateOfficeSelect() {
    const select = document.getElementById('office-office-select');
    select.innerHTML = '<option value="">Select office...</option>';
    
    if (offices.length === 0) {
      select.disabled = true;
      return;
    }
    
    select.disabled = false;
    offices.forEach(office => {
      const option = document.createElement('option');
      option.value = office.id;
      option.textContent = `${office.name} - ${office.address}`;
      select.appendChild(option);
    });
  }

  // Update office preview
  function updateOfficePreview() {
    const office = offices.find(o => o.id === selectedOfficeId);
    if (!office) {
      hideOfficePreview();
      return;
    }

    const preview = document.getElementById('office-preview');
    const details = document.getElementById('office-details');
    
    details.innerHTML = `
      <div><strong>${office.name}</strong></div>
      <div>${office.address}</div>
      <div>${office.city}, Bulgaria</div>
    `;
    
    preview.style.display = 'block';
  }

  // Hide office preview
  function hideOfficePreview() {
    document.getElementById('office-preview').style.display = 'none';
  }

  // Update create order button state
  function updateCreateOrderButton() {
    const button = document.getElementById('office-create-order');
    button.disabled = !selectedOfficeId;
  }

  // Show the form (hide loading)
  function showForm() {
    const modal = document.getElementById(CONFIG.formContainerId);
    const form = modal.querySelector('.office-form');
    const loading = modal.querySelector('#office-loading');
    
    form.style.display = 'block';
    loading.style.display = 'none';
  }

  // Show error message
  function showError(message) {
    const errorDiv = document.getElementById('office-error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  }

  // Hide error message
  function hideError() {
    document.getElementById('office-error').style.display = 'none';
  }

  // Create order and redirect to checkout
  async function createOrder() {
    if (!selectedOfficeId) {
      showError('Please select an office');
      return;
    }

    const office = offices.find(o => o.id === selectedOfficeId);
    if (!office) {
      showError('Selected office not found');
      return;
    }

    const button = document.getElementById('office-create-order');
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Creating Order...';

    try {
      hideError();

      debugger;
      // Use current valid variant ID for testing
      const testVariantId = '44557290995843'; // Current valid variant ID from "Sensitive" product
      const testProductId = '8378591772803'; // Product ID for "Sensitive" product
      
      console.log('🏢 Creating draft order with test variant ID:', testVariantId);

      const response = await fetch('http://localhost:3000/api/create-draft-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: testProductId,
          variantId: testVariantId,
          shippingAddress: {
            address1: office.address,
            city: office.city,
            country: 'Bulgaria'
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create order');
      }

      const data = await response.json();
      
      if (data.checkoutUrl || data.invoiceUrl) {
        console.log('🏢 Order created successfully, redirecting to checkout');
        window.location.href = data.checkoutUrl || data.invoiceUrl;
      } else {
        throw new Error('No checkout URL received');
      }

    } catch (error) {
      console.error('Error creating order:', error);
      showError(error.message || 'Failed to create order');
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-initialize when new content is added (for dynamic pages)
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // Check if any new Buy Now buttons were added
        setTimeout(() => {
          modifyBuyNowButtons();
        }, 100);
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Export for manual initialization if needed
  window.OfficeBuyNowIntegration = {
    init,
    showModal,
    hideModal
  };

})();
