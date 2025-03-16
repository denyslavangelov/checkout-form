// Shopify Checkout Integration Script
(function() {
    // Helper function to add visual indicator and click handler to checkout buttons
    function initializeCheckoutButton(button) {
        if (!button || button._hasOurHandler) return;
        
        button._hasOurHandler = true;
        
        // Add click handler with capture to ensure we intercept the click first
        button.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopImmediatePropagation();
            openCustomCheckout();
            return false;
        }, { capture: true });
        
        // Add visual indicator (red dot)
        const dot = document.createElement('span');
        dot.style.position = 'absolute';
        dot.style.top = '3px';
        dot.style.right = '3px';
        dot.style.width = '6px';
        dot.style.height = '6px';
        dot.style.backgroundColor = 'red';
        dot.style.borderRadius = '50%';
        dot.style.zIndex = '9999';
        
        // Ensure button has relative positioning for dot placement
        if (getComputedStyle(button).position === 'static') {
            button.style.position = 'relative';
        }
        
        button.appendChild(dot);
    }
    
    // Override addEventListener to catch dynamically added click handlers
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, handler, options) {
        const result = originalAddEventListener.call(this, type, handler, options);
        
        if (isCheckoutButton(this) && type === "click") {
            console.log("Detected click handler being added to checkout button!");
            setTimeout(() => {
                initializeCheckoutButton(this);
            }, 100);
        }
        
        return result;
    };
    
    // Override onclick property to catch direct assignments
    const onclickDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "onclick");
    Object.defineProperty(HTMLElement.prototype, "onclick", {
        set: function(handler) {
            const result = onclickDescriptor.set.call(this, handler);
            
            if (isCheckoutButton(this)) {
                console.log("Detected onclick property being set on checkout button!");
                setTimeout(() => {
                    initializeCheckoutButton(this);
                }, 100);
            }
            
            return result;
        },
        get: onclickDescriptor.get
    });
    
    // Helper function to check if an element is a checkout button
    function isCheckoutButton(element) {
        if (!element || !element.tagName) return false;
        
        // List of common checkout button identifiers
        const checkoutIdentifiers = [
            { attr: "id", value: "CartDrawer-Checkout" },
            { attr: "name", value: "checkout" },
            { attr: "href", value: "/checkout" },
            { attr: "class", value: "checkout-button" },
            { attr: "class", value: "cart__checkout" },
            { attr: "class", value: "cart-checkout" },
            { attr: "data-action", value: "checkout" },
            { attr: "class", value: "shopify-payment-button__button" }
        ];
        
        // Check if element matches any of the identifiers
        const matchesIdentifiers = checkoutIdentifiers.some(identifier => {
            const attrValue = element.getAttribute(identifier.attr);
            return attrValue && (
                attrValue === identifier.value ||
                attrValue.includes(identifier.value) ||
                (identifier.value === "/checkout" && attrValue.includes("/checkout"))
            );
        });
        
        // Check if text content contains "checkout"
        const hasCheckoutText = element.textContent && 
                              element.textContent.toLowerCase().includes("checkout");
        
        // Check if element is inside a cart form
        const isInCartForm = element.closest('form[action="/cart"]') !== null;
        
        return matchesIdentifiers || hasCheckoutText || isInCartForm;
    }
    
    // Find and initialize all checkout buttons on the page
    function initializeAllCheckoutButtons() {
        const selectors = [
            '#CartDrawer-Checkout',
            '[name="checkout"]',
            '[href="/checkout"]',
            '[href*="/checkout"]',
            ".checkout-button",
            ".cart__checkout",
            ".cart-checkout",
            '[data-action="checkout"]',
            'form[action="/cart"] [type="submit"]',
            ".shopify-payment-button__button"
        ];
        
        document.querySelectorAll(selectors.join(",")).forEach(button => {
            if (isCheckoutButton(button)) {
                initializeCheckoutButton(button);
            }
        });
    }
    
    // Periodically check for new checkout buttons
    function startButtonMonitoring() {
        // Initialize existing buttons
        initializeAllCheckoutButtons();
        
        // Set up periodic check for new buttons
        setInterval(initializeAllCheckoutButtons, 500);
        
        // Set up mutation observer for dynamic content
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(mutation => {
                if (mutation.addedNodes.length) {
                    initializeAllCheckoutButtons();
                }
            });
        });
        
        // Start observing document for changes
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["class", "style", "display", "visibility"]
        });
        
        console.log("Persistent checkout button monitoring started");
    }
    
    // Start monitoring when DOM is ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", startButtonMonitoring);
    } else {
        startButtonMonitoring();
    }
})();

// Custom checkout handler
function openCustomCheckout() {
    console.log("Opening custom checkout...");
    
    // Create loading overlay
    const loadingOverlay = document.createElement("div");
    loadingOverlay.style.position = "fixed";
    loadingOverlay.style.top = "0";
    loadingOverlay.style.left = "0";
    loadingOverlay.style.width = "100%";
    loadingOverlay.style.height = "100%";
    loadingOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    loadingOverlay.style.zIndex = "9998";
    loadingOverlay.style.display = "flex";
    loadingOverlay.style.justifyContent = "center";
    loadingOverlay.style.alignItems = "center";
    
    // Create loading spinner container
    const spinnerContainer = document.createElement("div");
    spinnerContainer.style.backgroundColor = "white";
    spinnerContainer.style.padding = "20px";
    spinnerContainer.style.borderRadius = "8px";
    spinnerContainer.style.textAlign = "center";
    spinnerContainer.style.maxWidth = "90%";
    
    // Create loading spinner
    const spinner = document.createElement("div");
    spinner.style.width = "40px";
    spinner.style.height = "40px";
    spinner.style.margin = "0 auto 15px auto";
    spinner.style.border = "4px solid #f3f3f3";
    spinner.style.borderTop = "4px solid #3498db";
    spinner.style.borderRadius = "50%";
    spinner.style.animation = "checkoutSpin 1s linear infinite";
    
    // Add spinner animation
    const spinnerStyle = document.createElement("style");
    spinnerStyle.textContent = `
        @keyframes checkoutSpin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(spinnerStyle);
    
    // Add loading text
    const loadingText = document.createElement("div");
    loadingText.textContent = "Зареждане на кошницата...";
    loadingText.style.fontWeight = "bold";
    
    // Assemble loading overlay
    spinnerContainer.appendChild(spinner);
    spinnerContainer.appendChild(loadingText);
    loadingOverlay.appendChild(spinnerContainer);
    document.body.appendChild(loadingOverlay);
    
    // Fetch cart data
    fetch("/cart.js")
        .then(response => response.json())
        .then(cartData => {
            console.log("Cart data retrieved:", cartData);
            
            // Store cart data globally
            window.shopifyCart = cartData;
            window.customCheckoutData = {
                cartData: cartData,
                timestamp: new Date().toISOString()
            };
            console.log("Cart data made globally available at window.shopifyCart and window.customCheckoutData.cartData");
            
            // Create modal for checkout iframe
            let modal = document.getElementById("custom-checkout-modal");
            modal = document.createElement("div");
            modal.id = "custom-checkout-modal";
            modal.style.position = "fixed";
            modal.style.top = "0";
            modal.style.left = "0";
            modal.style.width = "100%";
            modal.style.height = "100%";
            modal.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
            modal.style.zIndex = "9999";
            modal.style.display = "flex";
            modal.style.justifyContent = "center";
            modal.style.alignItems = "center";
            
            // Add close button
            const closeButton = document.createElement("button");
            closeButton.textContent = "×";
            closeButton.style.position = "absolute";
            closeButton.style.top = "15px";
            closeButton.style.right = "15px";
            closeButton.style.fontSize = "24px";
            closeButton.style.background = "white";
            closeButton.style.border = "none";
            closeButton.style.borderRadius = "50%";
            closeButton.style.width = "30px";
            closeButton.style.height = "30px";
            closeButton.style.cursor = "pointer";
            closeButton.style.display = "flex";
            closeButton.style.alignItems = "center";
            closeButton.style.justifyContent = "center";
            closeButton.style.zIndex = "10000";
            
            closeButton.addEventListener("click", function() {
                const iframe = document.getElementById("checkout-iframe");
                if (iframe && iframe.contentWindow) {
                    iframe.contentWindow.postMessage("close-checkout", "*");
                }
                document.body.removeChild(modal);
            });
            
            modal.appendChild(closeButton);
            
            // Create checkout iframe
            const iframe = document.createElement("iframe");
            iframe.id = "checkout-iframe";
            iframe.style.width = "100%";
            iframe.style.height = "100%";
            iframe.style.maxWidth = "600px";
            iframe.style.maxHeight = "90vh";
            iframe.style.border = "none";
            iframe.style.borderRadius = "8px";
            iframe.style.backgroundColor = "white";
            iframe.style.margin = "auto";
            
            // Configure iframe URL
            const iframeUrl = new URL("https://checkout-form-zeta.vercel.app/iframe");
            iframeUrl.searchParams.append("hasCart", "true");
            
            // Adjust layout for mobile devices
            if (window.innerWidth < 768) {
                iframe.style.maxWidth = "100%";
                iframe.style.maxHeight = "100%";
                iframe.style.height = "100%";
                iframe.style.borderRadius = "0";
                iframeUrl.searchParams.append("isMobile", "true");
                modal.style.padding = "0";
                
                // Adjust close button for mobile
                closeButton.style.top = "10px";
                closeButton.style.right = "10px";
                closeButton.style.width = "36px";
                closeButton.style.height = "36px";
                closeButton.style.fontSize = "28px";
                closeButton.style.backgroundColor = "rgba(255, 255, 255, 0.9)";
                closeButton.style.boxShadow = "0 1px 3px rgba(0,0,0,0.2)";
            }
            // Adjust layout for tablets
            else if (window.innerWidth < 992) {
                iframe.style.maxWidth = "90%";
                iframe.style.maxHeight = "95vh";
                iframeUrl.searchParams.append("isTablet", "true");
            }
            
            // Add viewport information
            iframeUrl.searchParams.append("viewportWidth", window.innerWidth.toString());
            iframeUrl.searchParams.append("pixelRatio", (window.devicePixelRatio || 1).toString());
            
            // Store cart data in localStorage for persistence
            localStorage.setItem("tempCartData", JSON.stringify(cartData));
            
            // Handle iframe messages
            window.addEventListener("message", function messageHandler(event) {
                // Handle cart data requests
                if (event.data === "request-cart-data") {
                    console.log("Received request for cart data from iframe, sending data...");
                    if (iframe.contentWindow) {
                        iframe.contentWindow.postMessage({
                            type: "cart-data",
                            cart: cartData,
                            metadata: {
                                timestamp: new Date().toISOString(),
                                shopUrl: window.location.hostname,
                                source: "shopify-integration",
                                resent: true
                            }
                        }, "*");
                    }
                }
                
                // Remove loading overlay when checkout is ready
                if (event.data === "checkout-ready" && document.body.contains(loadingOverlay)) {
                    document.body.removeChild(loadingOverlay);
                }
                
                // Clean up when checkout is closed
                if (event.data === "checkout-closed") {
                    if (document.body.contains(modal)) {
                        document.body.removeChild(modal);
                    }
                    window.removeEventListener("message", messageHandler);
                }
            });
            
            // Set iframe source and add to modal
            iframe.src = iframeUrl.toString();
            modal.appendChild(iframe);
            document.body.appendChild(modal);
            
            // Handle iframe load
            iframe.onload = function() {
                console.log("Iframe loaded, sending cart data...");
                
                // Remove loading overlay
                if (document.body.contains(loadingOverlay)) {
                    document.body.removeChild(loadingOverlay);
                }
                
                // Send initial cart data
                iframe.contentWindow.postMessage({
                    type: "cart-data",
                    cart: cartData,
                    metadata: {
                        timestamp: new Date().toISOString(),
                        shopUrl: window.location.hostname,
                        source: "shopify-integration"
                    }
                }, "*");
                
                console.log("Sent cart data to iframe with details:", {
                    itemCount: cartData.items.length,
                    total: cartData.total_price,
                    items: cartData.items.map(item => ({
                        id: item.id,
                        title: item.title,
                        quantity: item.quantity
                    }))
                });
                
                // Send cart data again after a delay to ensure receipt
                setTimeout(() => {
                    console.log("Sending cart data again after delay to ensure receipt...");
                    iframe.contentWindow.postMessage({
                        type: "cart-data",
                        cart: cartData,
                        metadata: {
                            timestamp: new Date().toISOString(),
                            shopUrl: window.location.hostname,
                            source: "shopify-integration",
                            resent: true
                        }
                    }, "*");
                }, 500);
            };
        })
        .catch(error => {
            console.error("Error fetching cart data:", error);
            
            try {
                // Safely remove the loading overlay if it exists
                if (loadingOverlay && loadingOverlay.parentNode === document.body) {
                    document.body.removeChild(loadingOverlay);
                }
                
                // Show appropriate error message
                if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                    alert("Грешка при свързване с кошницата. Моля, проверете връзката си с интернет и опитайте отново.");
                } else if (error.status === 404) {
                    alert("Грешка: Кошницата не може да бъде намерена. Моля, уверете се, че сте в Shopify магазин.");
                } else {
                    alert("Възникна грешка при зареждането на информацията за кошницата. Моля, опитайте отново.");
                }
            } catch (err) {
                console.error("Error in error handler:", err);
                alert("Възникна неочаквана грешка. Моля, опитайте отново.");
            }
        });
} 