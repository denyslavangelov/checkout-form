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

  // Beautiful office selector modal HTML matching checkout form design
  const OFFICE_SELECTOR_HTML = `
    <div id="office-selector-modal" style="
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
      backdrop-filter: blur(4px);
    ">
      <div style="
        background: white;
        border-radius: 12px;
        padding: 32px;
        max-width: 500px;
        width: 90%;
        max-height: 85vh;
        overflow-y: auto;
        position: relative;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        border: 1px solid #e5e7eb;
      ">
        <button id="office-modal-close" style="
          position: absolute;
          top: 16px;
          right: 16px;
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #6b7280;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        " onmouseover="this.style.backgroundColor='#f3f4f6'" onmouseout="this.style.backgroundColor='transparent'">&times;</button>
        
        <div style="margin-bottom: 24px;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
            <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">
              S
            </div>
            <h3 style="margin: 0; color: #111827; font-size: 20px; font-weight: 600;">Изберете офис за получаване</h3>
          </div>
          <p style="margin: 0; color: #6b7280; font-size: 14px;">Изберете град и офис за получаване на вашата поръчка</p>
        </div>
        
        <div id="office-form">
          <!-- City Selection -->
          <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #374151; font-size: 14px;">
              Град<span style="color: #ef4444; margin-left: 2px;">*</span>
            </label>
            <div style="position: relative;">
              <div style="display: flex; align-items: center; gap: 8px; width: 100%;">
                <div style="flex-shrink: 0; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; color: #6b7280;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                </div>
                <div style="flex: 1; position: relative;">
                  <input id="office-city-search" type="text" placeholder="Търсете град..." style="
                    width: 100%;
                    padding: 12px 16px;
                    border: 1px solid #d1d5db;
                    border-radius: 8px;
                    font-size: 14px;
                    box-sizing: border-box;
                    background: white;
                    transition: all 0.2s;
                    outline: none;
                  " onfocus="this.style.borderColor='#3b82f6'; this.style.boxShadow='0 0 0 3px rgba(59, 130, 246, 0.1)'" onblur="this.style.borderColor='#d1d5db'; this.style.boxShadow='none'">
                  <div id="office-city-dropdown" style="
                    display: none;
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    background: white;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    max-height: 200px;
                    overflow-y: auto;
                    z-index: 1000;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                    margin-top: 4px;
                  "></div>
                </div>
              </div>
            </div>
            <div id="office-city-loading" style="display: none; margin-top: 8px; font-size: 12px; color: #6b7280; display: flex; align-items: center; gap: 6px;">
              <div style="width: 12px; height: 12px; border: 2px solid #e5e7eb; border-top: 2px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite;"></div>
              Зареждане...
            </div>
          </div>
          
          <!-- Office Selection -->
          <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #374151; font-size: 14px;">
              Офис<span style="color: #ef4444; margin-left: 2px;">*</span>
            </label>
            <div style="position: relative;">
              <div style="display: flex; align-items: center; gap: 8px; width: 100%;">
                <div style="flex-shrink: 0; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; color: #dc2626; font-weight: bold; font-size: 12px;">
                  S
                </div>
                <div style="flex: 1; position: relative;">
                  <input id="office-office-search" type="text" placeholder="Търсете офис..." style="
                    width: 100%;
                    padding: 12px 16px;
                    border: 1px solid #d1d5db;
                    border-radius: 8px;
                    font-size: 14px;
                    box-sizing: border-box;
                    background: #f9fafb;
                    transition: all 0.2s;
                    outline: none;
                  " disabled>
                  <div id="office-office-dropdown" style="
                    display: none;
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    background: white;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    max-height: 200px;
                    overflow-y: auto;
                    z-index: 1000;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                    margin-top: 4px;
                  "></div>
                </div>
              </div>
            </div>
            <div id="office-office-loading" style="display: none; margin-top: 8px; font-size: 12px; color: #6b7280; display: flex; align-items: center; gap: 6px;">
              <div style="width: 12px; height: 12px; border: 2px solid #e5e7eb; border-top: 2px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite;"></div>
              Зареждане...
            </div>
          </div>
          
          <!-- Office Preview -->
          <div id="office-preview" style="
            margin-bottom: 20px;
            padding: 16px;
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            border: 1px solid #bfdbfe;
            border-radius: 8px;
            display: none;
          ">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <div style="width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; color: #3b82f6;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 12l2 2 4-4"></path>
                  <circle cx="12" cy="12" r="10"></circle>
                </svg>
              </div>
              <div style="font-weight: 600; color: #1e40af; font-size: 14px;">Избран офис</div>
            </div>
            <div id="office-details" style="color: #1e3a8a; font-size: 13px; line-height: 1.4;"></div>
          </div>
          
          <!-- Create Order Button -->
          <button id="office-create-order" style="
            width: 100%;
            padding: 14px 20px;
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            margin-bottom: 16px;
            transition: all 0.2s;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          " disabled onmouseover="if(!this.disabled) this.style.transform='translateY(-1px)'; this.style.boxShadow='0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'" onmouseout="if(!this.disabled) this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'">
            <span style="display: flex; align-items: center; justify-content: center; gap: 8px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 11V7a4 4 0 0 0-8 0v4"></path>
                <rect x="5" y="11" width="14" height="10" rx="2" ry="2"></rect>
              </svg>
              Създай поръчка и продължи към плащане
            </span>
          </button>
          
          <!-- Error Message -->
          <div id="office-error" style="
            padding: 12px 16px;
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 8px;
            color: #dc2626;
            display: none;
            margin-bottom: 16px;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
          ">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            <span id="office-error-text"></span>
          </div>
        </div>
      </div>
    </div>
    
    <style>
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>
  `;

  // Function to show office selector
  function showOfficeSelector(event) {
    console.log('🏢 Showing office selector for Buy Now button');
    console.log('🏢 Event details:', event);
    console.log('🏢 Event target:', event?.target);
    
    // Add modal to page if not already there
    if (!document.getElementById('office-selector-modal')) {
      console.log('🏢 Adding office selector modal to page');
      document.body.insertAdjacentHTML('beforeend', OFFICE_SELECTOR_HTML);
      setupOfficeSelectorEvents();
    } else {
      console.log('🏢 Office selector modal already exists');
    }
    
    // Show the modal
    const modal = document.getElementById('office-selector-modal');
    if (modal) {
      console.log('🏢 Showing office selector modal');
      modal.style.display = 'flex';
    } else {
      console.error('🏢 Office selector modal not found!');
    }
    
    // Initialize the office selector
    console.log('🏢 Initializing office selector');
    
    // Reset state
    currentCityId = null;
    currentCityName = '';
    currentCityPostcode = '';
    currentOfficeId = null;
    currentOfficeName = '';
    currentOfficeAddress = '';
    
    // Clear inputs
    const citySearch = document.getElementById('office-city-search');
    const officeSearch = document.getElementById('office-office-search');
    if (citySearch) citySearch.value = '';
    if (officeSearch) {
      officeSearch.value = '';
      officeSearch.disabled = true;
      officeSearch.placeholder = 'Първо изберете град';
    }
    
    // Hide previews and dropdowns
    hideOfficePreview();
    const cityDropdown = document.getElementById('office-city-dropdown');
    const officeDropdown = document.getElementById('office-office-dropdown');
    if (cityDropdown) cityDropdown.style.display = 'none';
    if (officeDropdown) officeDropdown.style.display = 'none';
    
    // Update button state
    updateCreateOrderButton();
  }

  // Setup office selector event listeners
  function setupOfficeSelectorEvents() {
    const modal = document.getElementById('office-selector-modal');
    const closeBtn = document.getElementById('office-modal-close');
    const citySearch = document.getElementById('office-city-search');
    const officeSearch = document.getElementById('office-office-search');
    const createOrderBtn = document.getElementById('office-create-order');

    // Close modal
    closeBtn.addEventListener('click', hideOfficeSelector);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) hideOfficeSelector();
    });

    // City search with debouncing
    const debouncedCitySearch = debounce((term) => {
      if (term.length >= 1) {
        searchCitiesForOfficeSelector(term);
      } else {
        // Load all cities when search is cleared
        searchCitiesForOfficeSelector('');
      }
    }, 300);

    citySearch.addEventListener('input', (e) => {
      const term = e.target.value;
      debouncedCitySearch(term);
    });

    citySearch.addEventListener('focus', () => {
      // Show all cities when focused
      searchCitiesForOfficeSelector('');
    });

    // Office search with debouncing
    const debouncedOfficeSearch = debounce((term) => {
      if (currentCityId) {
        searchOfficesForOfficeSelector(term);
      }
    }, 300);

    officeSearch.addEventListener('input', (e) => {
      const term = e.target.value;
      debouncedOfficeSearch(term);
    });

    officeSearch.addEventListener('focus', () => {
      // Show all offices when focused
      if (currentCityId) {
        searchOfficesForOfficeSelector('');
      }
    });

    // Hide dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#office-city-search') && !e.target.closest('#office-city-dropdown')) {
        const cityDropdown = document.getElementById('office-city-dropdown');
        if (cityDropdown) cityDropdown.style.display = 'none';
      }
      
      if (!e.target.closest('#office-office-search') && !e.target.closest('#office-office-dropdown')) {
        const officeDropdown = document.getElementById('office-office-dropdown');
        if (officeDropdown) officeDropdown.style.display = 'none';
      }
    });

    debugger;

    // Create order
    createOrderBtn.addEventListener('click', createOrderFromOfficeSelector);
  }

  // Hide office selector
  function hideOfficeSelector() {
    const modal = document.getElementById('office-selector-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  // Global variables for office selector
  let citySearchTimeout = null;
  let officeSearchTimeout = null;
  let currentCityId = null;
  let currentCityName = '';
  let currentCityPostcode = '';
  let currentOfficeId = null;
  let currentOfficeName = '';
  let currentOfficeAddress = '';

  // Debounce function
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Search cities with debounced API calls
  async function searchCitiesForOfficeSelector(term) {
    try {
      console.log('🏢 Searching cities with term:', term);
      
      const loadingEl = document.getElementById('office-city-loading');
      loadingEl.style.display = 'block';
      
      const response = await fetch('https://checkout-form-zeta.vercel.app/api/speedy/search-site', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to search cities: ${response.status}`);
      }

      const data = await response.json();
      console.log('🏢 City search results:', data);
      
      if (data.sites && Array.isArray(data.sites)) {
        // Filter cities based on search term
        let filteredCities = data.sites;
        if (term && term.length > 0) {
          filteredCities = data.sites.filter(site => 
            site.name.toLowerCase().includes(term.toLowerCase()) ||
            site.label.toLowerCase().includes(term.toLowerCase())
          );
        }
        
        displayCityOptions(filteredCities);
      } else {
        throw new Error('Invalid cities data format');
      }
    } catch (error) {
      console.error('🏢 Error searching cities:', error);
      showOfficeError(`Failed to search cities: ${error.message}`);
    } finally {
      const loadingEl = document.getElementById('office-city-loading');
      loadingEl.style.display = 'none';
    }
  }

  // Display city options in dropdown
  function displayCityOptions(cities) {
    const dropdown = document.getElementById('office-city-dropdown');
    dropdown.innerHTML = '';
    
    if (cities.length === 0) {
      dropdown.innerHTML = `
        <div style="padding: 16px; color: #6b7280; text-align: center; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
          Няма намерени градове
        </div>
      `;
    } else {
      cities.forEach((city, index) => {
        const option = document.createElement('div');
        option.style.cssText = `
          padding: 12px 16px;
          cursor: pointer;
          border-bottom: ${index === cities.length - 1 ? 'none' : '1px solid #f3f4f6'};
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        `;
        
        const icon = document.createElement('div');
        icon.style.cssText = `
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6b7280;
          flex-shrink: 0;
        `;
        icon.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
        `;
        
        const text = document.createElement('span');
        text.textContent = city.label || city.name;
        text.style.cssText = 'color: #374151; font-size: 14px;';
        
        option.appendChild(icon);
        option.appendChild(text);
        
        option.addEventListener('mouseenter', () => {
          option.style.backgroundColor = '#f8fafc';
        });
        
        option.addEventListener('mouseleave', () => {
          option.style.backgroundColor = 'white';
        });
        
        option.addEventListener('click', () => {
          selectCity(city);
        });
        
        dropdown.appendChild(option);
      });
    }
    
    dropdown.style.display = 'block';
  }

  // Select a city
  function selectCity(city) {
    console.log('🏢 City selected:', city);
    
    currentCityId = city.id;
    currentCityName = city.name;
    // Extract postcode from city data
    currentCityPostcode = city.postCode || city.postalCode || '';
    
    console.log('🏢 City data:', {
      id: currentCityId,
      name: currentCityName,
      postcode: currentCityPostcode
    });
    
    // Update the search input
    const searchInput = document.getElementById('office-city-search');
    searchInput.value = city.label || city.name;
    
    // Hide dropdown
    const dropdown = document.getElementById('office-city-dropdown');
    dropdown.style.display = 'none';
    
    // Enable office search
    const officeSearch = document.getElementById('office-office-search');
    officeSearch.disabled = false;
    officeSearch.placeholder = 'Търсете офис...';
    
    // Clear office selection
    currentOfficeId = null;
    currentOfficeName = '';
    currentOfficeAddress = '';
    officeSearch.value = '';
    
    // Hide office preview
    hideOfficePreview();
    
    // Load all offices for this city
    searchOfficesForOfficeSelector('');
  }

  // Search offices with debounced API calls
  async function searchOfficesForOfficeSelector(term) {
    if (!currentCityId) {
      console.log('🏢 No city selected, cannot search offices');
      return;
    }

    try {
      console.log('🏢 Searching offices with term:', term, 'for city:', currentCityId);
      
      const loadingEl = document.getElementById('office-office-loading');
      loadingEl.style.display = 'block';
      
      const response = await fetch('https://checkout-form-zeta.vercel.app/api/speedy/search-office', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          siteId: currentCityId,
          term: term || '' // Empty term to get all offices
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to search offices: ${response.status}`);
      }

      const data = await response.json();
      console.log('🏢 Office search results:', data);
      
      if (data.offices && Array.isArray(data.offices)) {
        displayOfficeOptions(data.offices);
      } else {
        throw new Error('Invalid offices data format');
      }
    } catch (error) {
      console.error('🏢 Error searching offices:', error);
      showOfficeError(`Failed to search offices: ${error.message}`);
    } finally {
      const loadingEl = document.getElementById('office-office-loading');
      loadingEl.style.display = 'none';
    }
  }

  // Display office options in dropdown
  function displayOfficeOptions(offices) {
    const dropdown = document.getElementById('office-office-dropdown');
    dropdown.innerHTML = '';
    
    if (offices.length === 0) {
      dropdown.innerHTML = `
        <div style="padding: 16px; color: #6b7280; text-align: center; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
          Няма намерени офиси
        </div>
      `;
    } else {
      offices.forEach((office, index) => {
        const option = document.createElement('div');
        option.style.cssText = `
          padding: 12px 16px;
          cursor: pointer;
          border-bottom: ${index === offices.length - 1 ? 'none' : '1px solid #f3f4f6'};
          transition: all 0.2s;
          display: flex;
          align-items: flex-start;
          gap: 8px;
        `;
        
        const icon = document.createElement('div');
        icon.style.cssText = `
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #dc2626;
          font-weight: bold;
          font-size: 10px;
          flex-shrink: 0;
          margin-top: 2px;
        `;
        icon.textContent = 'S';
        
        const content = document.createElement('div');
        content.style.cssText = 'flex: 1; min-width: 0;';
        
        const nameDiv = document.createElement('div');
        nameDiv.style.cssText = 'font-weight: 500; color: #374151; font-size: 14px; margin-bottom: 2px;';
        nameDiv.textContent = office.name;
        
        const addressDiv = document.createElement('div');
        addressDiv.style.cssText = 'font-size: 12px; color: #6b7280; line-height: 1.3;';
        // Use fullAddressString if available, otherwise fall back to address
        let displayAddress = office.fullAddressString || office.address || office.fullAddress;
        // Ensure it's a string, not an object
        if (typeof displayAddress === 'object') {
          displayAddress = displayAddress.fullAddressString || displayAddress.address || JSON.stringify(displayAddress);
        }
        addressDiv.textContent = displayAddress;
        
        content.appendChild(nameDiv);
        content.appendChild(addressDiv);
        
        option.appendChild(icon);
        option.appendChild(content);
        
        option.addEventListener('mouseenter', () => {
          option.style.backgroundColor = '#f8fafc';
        });
        
        option.addEventListener('mouseleave', () => {
          option.style.backgroundColor = 'white';
        });
        
        option.addEventListener('click', () => {
          selectOffice(office);
        });
        
        dropdown.appendChild(option);
      });
    }
    
    dropdown.style.display = 'block';
  }

  // Select an office
  function selectOffice(office) {
    console.log('🏢 Office selected:', office);
    console.log('🏢 Office object keys:', Object.keys(office));
    console.log('🏢 Office fullAddressString:', office.fullAddressString);
    console.log('🏢 Office address:', office.address);
    console.log('🏢 Office fullAddress:', office.fullAddress);
    
    currentOfficeId = office.id;
    currentOfficeName = office.name;
    // Use fullAddressString if available, otherwise fall back to address
    currentOfficeAddress = office.fullAddressString || office.address || office.fullAddress;
    
    console.log('🏢 Extracted office address:', currentOfficeAddress);
    console.log('🏢 Address type:', typeof currentOfficeAddress);
    
    // Update the search input
    const searchInput = document.getElementById('office-office-search');
    searchInput.value = `${office.name}: ${currentOfficeAddress}`;
    
    // Hide dropdown
    const dropdown = document.getElementById('office-office-dropdown');
    dropdown.style.display = 'none';
    
    // Show office preview
    updateOfficePreview();
    updateCreateOrderButton();
  }

  // Load offices for selected city
  async function loadOfficesForOfficeSelector(cityId) {
    try {
      const response = await fetch('https://checkout-form-zeta.vercel.app/api/speedy/search-office', {
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
        const officeSelect = document.getElementById('office-office-select');
        officeSelect.innerHTML = '<option value="">Select office...</option>';
        
        if (data.offices.length === 0) {
          officeSelect.disabled = true;
          return;
        }
        
        officeSelect.disabled = false;
        data.offices.forEach(office => {
          const option = document.createElement('option');
          option.value = office.id.toString();
          option.textContent = `${office.name} - ${office.address || office.fullAddress || 'Address not available'}`;
          officeSelect.appendChild(option);
        });
      } else {
        throw new Error('Invalid offices data');
      }
    } catch (error) {
      console.error('Error loading offices:', error);
      showOfficeError('Failed to load offices. Please try again.');
    }
  }

  // Update office preview
  function updateOfficePreview() {
    if (currentOfficeId && currentOfficeName && currentOfficeAddress) {
      const preview = document.getElementById('office-preview');
      const details = document.getElementById('office-details');
      
      // Ensure address is a string
      let displayAddress = currentOfficeAddress;
      if (typeof displayAddress === 'object') {
        displayAddress = displayAddress.fullAddressString || displayAddress.address || JSON.stringify(displayAddress);
      }
      
      details.innerHTML = `
        <div><strong>${currentOfficeName}</strong></div>
        <div>${displayAddress}</div>
        <div>${currentCityName}, Bulgaria</div>
      `;
      
      preview.style.display = 'block';
    } else {
      hideOfficePreview();
    }
  }

  // Hide office preview
  function hideOfficePreview() {
    const preview = document.getElementById('office-preview');
    if (preview) {
      preview.style.display = 'none';
    }
  }

  // Update create order button state
  function updateCreateOrderButton() {
    const button = document.getElementById('office-create-order');
    if (button) {
      button.disabled = !(currentOfficeId && currentOfficeName && currentOfficeAddress);
    }
  }

  // Show office error
  function showOfficeError(message) {
    const errorDiv = document.getElementById('office-error');
    const errorText = document.getElementById('office-error-text');
    if (errorDiv && errorText) {
      errorText.textContent = message;
      errorDiv.style.display = 'flex';
    }
  }

  // Create order from office selector
  async function createOrderFromOfficeSelector() {
    debugger;
    if (!currentOfficeId || !currentOfficeName || !currentOfficeAddress) {
      showOfficeError('Моля, изберете офис');
      return;
    }

    console.log('🏢 Creating order with selected office:', {
      officeId: currentOfficeId,
      officeName: currentOfficeName,
      officeAddress: currentOfficeAddress,
      cityName: currentCityName,
      cityPostcode: currentCityPostcode
    });
    
    console.log('🏢 Office address type:', typeof currentOfficeAddress);
    console.log('🏢 Office address value:', currentOfficeAddress);
    console.log('🏢 City postcode:', currentCityPostcode);

    const button = document.getElementById('office-create-order');
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Creating Order...';

    try {
      // Use current valid variant ID for testing
      const testVariantId = '44557290995843'; // Current valid variant ID from "Sensitive" product
      const testProductId = '8378591772803'; // Product ID for "Sensitive" product
      
      console.log('🏢 Creating draft order with test variant ID:', testVariantId);

      const orderData = {
        productId: testProductId,
        variantId: testVariantId,
        shippingAddress: {
          address1: currentOfficeAddress,
          city: currentCityName || 'Sofia',
          postalCode: currentCityPostcode || '',
          country: 'Bulgaria'
        }
      };
      
      console.log('🏢 Sending order data:::', orderData);

      const response = await fetch('https://checkout-form-zeta.vercel.app/api/create-draft-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      });

      console.log('🏢 API response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('🏢 API error response:', errorData);
        console.error('🏢 Error details:', errorData.details);
        
        // Show more detailed error message
        let errorMessage = errorData.error || `Failed to create order: ${response.status} ${response.statusText}`;
        if (errorData.details && errorData.details.length > 0) {
          errorMessage += ` - Details: ${JSON.stringify(errorData.details)}`;
        }
        
        throw new Error(errorMessage);
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
      showOfficeError(error.message || 'Failed to create order');
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  // Function to check if an element is a checkout button
  function isCheckoutButton(element) {
    if (!element || !element.tagName) return false;

    // More specific checkout button identifiers with priority order
    const checkoutIdentifiers = [
      // Primary identifiers (most specific)
      { attr: 'id', value: 'CartDrawer-Checkout', priority: 1 },
      { attr: 'name', value: 'checkout', priority: 1 },
      { attr: 'data-action', value: 'checkout', priority: 1 },
      { attr: 'data-checkout-button', value: 'true', priority: 1 },
      
      // Secondary identifiers (class-based)
      { attr: 'class', value: 'shopify-payment-button__button--buy-now', priority: 2 },
      { attr: 'class', value: 'cart__checkout', priority: 2 },
      { attr: 'class', value: 'cart-checkout', priority: 2 },
      { attr: 'class', value: 'checkout-button', priority: 2 },
      
      // Tertiary identifiers (less specific)
      { attr: 'href', value: '/checkout', priority: 3 },
      { attr: 'class', value: 'shopify-payment-button__button', priority: 3 }
    ];

    // Check context first
    const isInCart = element.closest('[data-cart], [data-section="cart"], #cart-drawer, #CartDrawer, [data-cart-drawer]') !== null;
    const isInProductForm = element.closest('form[action*="/cart/add"]') !== null;
    const isInCheckoutForm = element.closest('form[action="/cart"]') !== null;

    // If not in any valid context, return false unless it's a very specific button
    if (!isInCart && !isInProductForm && !isInCheckoutForm) {
      // Only allow highly specific buttons outside these contexts
      const hasHighPriorityMatch = checkoutIdentifiers
        .filter(id => id.priority === 1)
        .some(identifier => {
          const attrValue = element.getAttribute(identifier.attr);
          return attrValue && (
            attrValue === identifier.value ||
            attrValue.split(' ').includes(identifier.value)
          );
        });
      
      if (!hasHighPriorityMatch) return false;
    }

    // Check if element matches any identifier
    const isIdentifiedCheckout = checkoutIdentifiers.some(identifier => {
      const attrValue = element.getAttribute(identifier.attr);
      return attrValue && (
        attrValue === identifier.value ||
        attrValue.split(' ').includes(identifier.value) ||
        (identifier.value === '/checkout' && attrValue.includes('/checkout'))
      );
    });

    // More precise text content check
    const hasCheckoutText = element.textContent && (
      element.textContent.toLowerCase().trim() === 'checkout' ||
      element.textContent.toLowerCase().trim() === 'check out' ||
      element.textContent.toLowerCase().includes('proceed to checkout') ||
      element.textContent.toLowerCase().includes('buy now')
    );

    // Additional validation for Buy Now buttons
    const isBuyNowButton = element.matches('.shopify-payment-button__button') && (
      element.closest('.shopify-payment-button') !== null ||
      element.getAttribute('data-testid')?.includes('Checkout-button')
    );

    // Exclude common false positives
    const isExcluded = (
      element.classList.contains('cart__remove') ||
      element.classList.contains('remove') ||
      element.classList.contains('quantity') ||
      element.classList.contains('close') ||
      element.getAttribute('aria-label')?.toLowerCase().includes('close') ||
      element.getAttribute('aria-label')?.toLowerCase().includes('remove')
    );

    return !isExcluded && (isIdentifiedCheckout || hasCheckoutText || isBuyNowButton);
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
    // More specific selectors
    const selectors = [
      // Primary selectors (most specific)
      '#CartDrawer-Checkout',
      '[name="checkout"]',
      '[data-action="checkout"]',
      '[data-checkout-button="true"]',
      
      // Cart-specific selectors
      '[data-cart] [type="submit"]',
      '[data-section="cart"] button',
      '#cart-drawer button',
      '#CartDrawer button',
      
      // Buy Now buttons
      '.shopify-payment-button__button--buy-now',
      
      // Secondary selectors
      '.cart__checkout',
      '.cart-checkout',
      '.checkout-button',
      
      // Generic checkout links/buttons
      '[href="/checkout"]',
      '[href*="/checkout"]',
      '.shopify-payment-button__button'
    ].join(',');

    // Find all potential checkout buttons
    const buttons = document.querySelectorAll(selectors);
    
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
        console.log('Buy Now button detected, showing office selector instead of checkout form');
        
        // Show office selector for Buy Now buttons
        showOfficeSelector(event);
        return; // Don't proceed with regular checkout
        
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
                                  document.querySelector('img.product__media-item') ||
                                  document.querySelector('.product__media img') ||
                                  document.querySelector('.product-image') ||
                                  document.querySelector('img[itemprop="image"]') ||
                                  document.querySelector('.product-page img') ||
                                  document.querySelector('.product-single img');
              
              if (priceElement && titleElement) {
                // Extract price - remove currency and non-numeric characters
                let priceText = priceElement.textContent.trim().replace(/[^\d.,]/g, '').replace(',', '.');
                const price = parseFloat(priceText) * 100; // Convert to cents
                
                const productId = window.location.pathname.match(/\/products\/([^\/\?#]+)/)?.[1] || 'unknown';
                
                // Get image information, look for high-quality versions
                let imageSrc = null;
                if (imageElement) {
                  // Try data attributes first, which often contain better quality images
                  imageSrc = imageElement.getAttribute('data-src') || 
                            imageElement.getAttribute('data-srcset')?.split(',')[0]?.trim()?.split(' ')[0] ||
                            imageElement.getAttribute('srcset')?.split(',')[0]?.trim()?.split(' ')[0] ||
                            imageElement.src;
                  console.log('Found image sources:', {
                    dataSrc: imageElement.getAttribute('data-src'),
                    dataSrcset: imageElement.getAttribute('data-srcset'),
                    srcset: imageElement.getAttribute('srcset'),
                    src: imageElement.src
                  });
                }
                
                currentProduct = {
                  id: productId,
                  title: titleElement.textContent.trim(),
                  price: isNaN(price) ? 0 : price,
                  featured_image: imageSrc,
                  image: { src: imageSrc },
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
          id: currentProduct.variant_id ? String(currentProduct.variant_id) : String(currentProduct.id),
          title: currentProduct.title + (currentProduct.variant_title ? ` - ${currentProduct.variant_title}` : ''),
          quantity: currentProduct.quantity || 1,
          price: currentProduct.price,
          line_price: currentProduct.price * (currentProduct.quantity || 1),
          original_line_price: (currentProduct.compare_at_price || currentProduct.price) * (currentProduct.quantity || 1),
          variant_id: currentProduct.variant_id ? String(currentProduct.variant_id) : String(currentProduct.id),
          product_id: currentProduct.id ? String(currentProduct.id) : String(currentProduct.variant_id || 'unknown'),
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

      debugger;
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
                  id: product.variant_id ? String(product.variant_id) : String(product.id),
                  title: product.title + (product.variant_title ? ` - ${product.variant_title}` : ''),
                  quantity: product.quantity || 1,
                  price: product.price,
                  line_price: product.price * (product.quantity || 1),
                  original_line_price: (product.compare_at_price || product.price) * (product.quantity || 1),
                  variant_id: product.variant_id ? String(product.variant_id) : String(product.id),
                  product_id: product.id ? String(product.id) : String(product.variant_id || 'unknown'),
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
                  id: product.variant_id ? String(product.variant_id) : String(product.id),
                  title: product.title + (product.variant_title ? ` - ${product.variant_title}` : ''),
                  quantity: product.quantity || 1,
                  price: product.price,
                  line_price: product.price * (product.quantity || 1),
                  original_line_price: (product.compare_at_price || product.price) * (product.quantity || 1),
                  variant_id: product.variant_id ? String(product.variant_id) : String(product.id),
                  product_id: product.id ? String(product.id) : String(product.variant_id || 'unknown'),
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
      
      debugger;
      // Format cart data to match API expectations
      const cartItems = formData.cartData.items.map(item => ({
        id: item.id,
        quantity: item.quantity,
        title: item.title,
        price: item.price,
        variant_id: item.variant_id ? String(item.variant_id) : String(item.id),
        product_id: item.product_id ? String(item.product_id) : String(item.id),
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

      debugger;

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response from API:', errorText);
        throw new Error(`Failed to create order: ${response.status}`);
      }

      const data = await response.json();
      console.log('Order created successfully:', data);

      if (data.success) {
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

        // Get the redirect URL directly from the API response
        let orderStatusUrl;
        
        // Use the redirect_url or checkout_url if provided directly by the API
        if (data.redirect_url) {
          orderStatusUrl = data.redirect_url;
        } else if (data.checkout_url) {
          orderStatusUrl = data.checkout_url;
        } else if (data.order_status_url) {
          orderStatusUrl = data.order_status_url;
        } else if (data.order && data.order.order_status_url) {
          orderStatusUrl = data.order.order_status_url;
        } else {
          // Fallback to homepage if no redirect URL provided
          orderStatusUrl = `https://${requestPayload.shop_domain}`;
        }

        // Short delay to show the success message
        setTimeout(() => {
          window.location.href = orderStatusUrl;
        }, 500);
      } else {
        throw new Error(data.message || 'Failed to create order');
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
        // Ensure image is properly formatted for use in checkout form
        if (product.featured_image && !product.image) {
          product.image = { src: product.featured_image };
        } else if (product.images && product.images.length > 0 && !product.image) {
          product.image = { src: product.images[0] };
        }
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
          image: { src: image },
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
                          document.querySelector('img.product__media-item') ||
                          document.querySelector('.product__media img') ||
                          document.querySelector('.product-image') ||
                          document.querySelector('img[itemprop="image"]') ||
                          document.querySelector('.product-page img') ||
                          document.querySelector('.product-single img');
      
      if (priceElement && titleElement) {
        // Extract price - remove currency and non-numeric characters
        let priceText = priceElement.textContent.trim().replace(/[^\d.,]/g, '').replace(',', '.');
        const price = parseFloat(priceText) * 100; // Convert to cents
        
        // Get image source with fallbacks
        let imageSrc = null;
        if (imageElement) {
          // Try data attributes first, which often contain better quality images
          imageSrc = imageElement.getAttribute('data-src') || 
                    imageElement.getAttribute('data-srcset')?.split(',')[0]?.trim()?.split(' ')[0] ||
                    imageElement.getAttribute('srcset')?.split(',')[0]?.trim()?.split(' ')[0] ||
                    imageElement.src;
        }
        
        return {
          id: productId || 'unknown',
          title: titleElement.textContent.trim(),
          price: isNaN(price) ? 0 : price,
          featured_image: imageSrc,
          image: { src: imageSrc },
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

  // Make showOfficeSelector available globally for testing
  window.showOfficeSelector = showOfficeSelector;

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