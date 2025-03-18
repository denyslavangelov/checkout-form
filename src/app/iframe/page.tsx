"use client"

import { useState, useEffect } from "react"
import { CheckoutForm } from "@/components/checkout-form"
import styles from "./page.module.css"

// Define a type for the cart data
interface CartData {
  items: Array<{
    id: string;
    title: string;
    quantity: number;
    price: number;
    line_price: number;
    original_line_price: number;
    image: string | null;
    [key: string]: any;
  }>;
  total_price: number;
  items_subtotal_price: number;
  total_discount: number;
  item_count: number;
  currency: string;
  [key: string]: any;
}

// Extend the Window interface to include our global properties
declare global {
  interface Window {
    cartData: CartData | null;
    customCheckoutData: {
      cartData: CartData | null;
      metadata?: any;
      received?: string;
    };
  }
}

// Loading spinner component
function LoadingSpinner() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin"></div>
        <div className="text-lg font-medium text-gray-700">Зареждане на кошницата...</div>
        <div className="text-sm text-gray-500">Моля, изчакайте докато подготвим вашата поръчка</div>
      </div>
    </div>
  );
}

export default function IframePage() {
  const [isOpen, setIsOpen] = useState(false)
  const [cartData, setCartData] = useState<CartData | null>(null)
  const [dataReceived, setDataReceived] = useState(false)
  const [loadingRetries, setLoadingRetries] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  
  // Set appropriate viewport meta tags for mobile
  useEffect(() => {
    // Check URL parameters for mobile indicators
    const urlParams = new URLSearchParams(window.location.search);
    const mobileParam = urlParams.get('isMobile');
    const viewportWidth = urlParams.get('viewportWidth');
    const pixelRatio = urlParams.get('pixelRatio');
    
    // Set mobile state based on URL parameters or screen size
    const isMobileDevice = 
      mobileParam === 'true' || 
      (typeof window !== 'undefined' && window.innerWidth < 768);
    
    setIsMobile(isMobileDevice);
    
    // Set appropriate viewport meta tag for better mobile display
    if (isMobileDevice) {
      // Get existing viewport meta tag or create a new one
      let viewportMeta = document.querySelector('meta[name="viewport"]');
      if (!viewportMeta) {
        viewportMeta = document.createElement('meta');
        viewportMeta.setAttribute('name', 'viewport');
        document.head.appendChild(viewportMeta);
      }
      
      // Set content attribute - using width=device-width for most mobile devices
      // but with a larger initial-scale to prevent zooming too far in
      viewportMeta.setAttribute(
        'content', 
        `width=device-width, initial-scale=0.95, maximum-scale=1.2, user-scalable=yes`
      );
      
      // Add some mobile-specific styles
      const mobileStyle = document.createElement('style');
      mobileStyle.textContent = `
        body {
          /* Prevent overscroll bouncing on iOS */
          position: fixed;
          width: 100%;
          height: 100%;
          overflow: auto;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: none;
        }
        
        /* Make input fields more mobile-friendly */
        input, button, select, .combobox-input {
          font-size: 16px !important; /* Prevent iOS zoom on focus */
          min-height: 44px !important; /* Larger touch targets */
          line-height: 1.3 !important;
        }
        
        /* Add extra padding to list items for better touch targets */
        .combobox-popover ul li {
          padding: 10px 8px !important;
        }
        
        /* Fix search inputs to be more mobile-friendly */
        .combobox-container {
          position: relative !important;
        }
        
        .combobox-popover {
          position: fixed !important;
          z-index: 100;
          left: 5% !important;
          right: 5% !important;
          width: 90% !important;
          max-height: 50vh !important;
        }
      `;
      document.head.appendChild(mobileStyle);
    }
  }, []);
  
  // Effect to notify parent when checkout is ready
  useEffect(() => {
    // If we have cart data and are no longer loading, tell the parent we're ready
    if (cartData && !isLoading) {
      console.log('Checkout is ready, notifying parent window');
      window.parent.postMessage('checkout-ready', '*');
    }
  }, [cartData, isLoading]);
  
  // Automatically open the form when the iframe loads
  useEffect(() => {
    setIsOpen(true)
    console.log('IframePage mounted, waiting for cart data...')
    
    // Check if we have URL parameters indicating cart data should be available
    const urlParams = new URLSearchParams(window.location.search);
    const hasCartParam = urlParams.get('hasCart');
    
    if (hasCartParam === 'true') {
      console.log('URL indicates cart data should be available, will request if not received');
    }
    
    // Add message listener for communication with parent window
    const handleMessage = (event: MessageEvent) => {
      // Handle messages from parent (Shopify store)
      if (event.data === 'close-checkout') {
        console.log('Received close request from parent window')
        setIsOpen(false)
      }
      
      // Handle cart data
      if (event.data && event.data.type === 'cart-data') {
        console.log('Received cart data from parent:', {
          hasItems: !!event.data.cart?.items,
          itemCount: event.data.cart?.items?.length || 0,
          metadata: event.data.metadata,
          resent: event.data.metadata?.resent || false
        });
        
        if (!event.data.cart || !event.data.cart.items) {
          console.warn('Received cart data is invalid, missing items array');
          return;
        }
        
        // Make cart data available globally in the iframe window too
        if (typeof window !== 'undefined') {
          window.cartData = event.data.cart;
          window.customCheckoutData = {
            cartData: event.data.cart,
            metadata: event.data.metadata,
            received: new Date().toISOString()
          };
          console.log('Cart data made globally available in iframe window');
          
          // Also store in localStorage for backup
          try {
            localStorage.setItem('cartData', JSON.stringify(event.data.cart));
            console.log('Cart data saved to localStorage');
          } catch (e) {
            console.warn('Could not save cart data to localStorage', e);
          }
        }
        
        setCartData(event.data.cart);
        setDataReceived(true);
        setIsLoading(false); // Hide loading screen once data is received
      }
    }
    
    window.addEventListener('message', handleMessage)
    
    // Request cart data from parent immediately
    if (hasCartParam === 'true') {
      console.log(`Requesting cart data from parent immediately...`);
      window.parent.postMessage('request-cart-data', '*');
    }
    
    // Request cart data from parent again if needed (first retry faster)
    const requestCartData = () => {
      if (!dataReceived && hasCartParam === 'true') {
        console.log(`Requesting cart data from parent (attempt ${loadingRetries + 1})...`);
        window.parent.postMessage('request-cart-data', '*');
        setLoadingRetries(prev => prev + 1);
      }
    };
    
    // Set up multiple attempts to request cart data - do first retry quicker
    const requestTimeoutId = setTimeout(requestCartData, 200); // Faster first retry
    
    // Check for cart data in various places if not received directly - also faster
    const fallbackTimeoutId = setTimeout(() => {
      if (!dataReceived) {
        console.log('No cart data received, checking alternatives...');
        
        // 1. Check if cart data exists in the window object (might have been set already)
        if (window.cartData) {
          console.log('Found cart data in window.cartData');
          setCartData(window.cartData);
          setDataReceived(true);
          setIsLoading(false);
          return;
        }
        
        if (window.customCheckoutData?.cartData) {
          console.log('Found cart data in window.customCheckoutData.cartData');
          setCartData(window.customCheckoutData.cartData);
          setDataReceived(true);
          setIsLoading(false);
          return;
        }
        
        // 2. Check localStorage first from current session
        try {
          const storedCartData = localStorage.getItem('cartData');
          if (storedCartData) {
            const parsedCartData = JSON.parse(storedCartData);
            console.log('Using cart data from localStorage');
            setCartData(parsedCartData);
            setDataReceived(true);
            setIsLoading(false);
            return;
          }
          
          // 3. Check for temporary cart data stored by the parent
          const tempCartData = localStorage.getItem('tempCartData');
          if (tempCartData) {
            const parsedTempCartData = JSON.parse(tempCartData);
            console.log('Using temporary cart data from localStorage');
            setCartData(parsedTempCartData);
            setDataReceived(true);
            setIsLoading(false);
            
            // Store it as regular cart data for future use
            localStorage.setItem('cartData', tempCartData);
            return;
          }
        } catch (error) {
          console.error('Error accessing localStorage:', error);
        }
        
        // 4. Make a last request for cart data
        if (hasCartParam === 'true' && loadingRetries < 3) {
          requestCartData();
        } else {
          console.warn('Failed to receive cart data after multiple attempts');
          
          // If in development, use a test cart
          if (process.env.NODE_ENV === 'development') {
            console.log('Using test cart in development mode');
            const testCart = {
              items: [
                {
                  id: 'test-item-1',
                  title: 'Test Product',
                  quantity: 1,
                  price: 2999,
                  line_price: 2999,
                  original_line_price: 2999,
                  image: null
                }
              ],
              total_price: 2999,
              items_subtotal_price: 2999,
              total_discount: 0,
              item_count: 1,
              currency: 'BGN'
            };
            setCartData(testCart);
            setIsLoading(false);
          } else {
            // Still show form in production, but with error state
            setIsLoading(false);
          }
        }
      }
    }, 800); // Reduced from 2000ms to 800ms for faster fallback checks
    
    // Set a final timeout to hide loading screen even if we can't get data
    const loadingTimeoutId = setTimeout(() => {
      if (isLoading) {
        console.warn('Forcing loading screen to hide after timeout');
        setIsLoading(false);
      }
    }, 4000); // Force loading to end after 4 seconds max
    
    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(requestTimeoutId);
      clearTimeout(fallbackTimeoutId);
      clearTimeout(loadingTimeoutId);
    }
  }, [dataReceived, loadingRetries, isLoading]);

  // Check if this is a Buy Now context from URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const isBuyNow = urlParams.get('buyNow') === 'true';
      
      if (isBuyNow) {
        console.log('Buy Now context detected from URL');
        // Use a safer approach with window as an indexable type
        (window as any).isBuyNowContext = true;
        
        // If cart data is missing or empty, create a default structure
        if (!cartData || (cartData.items && cartData.items.length === 0)) {
          const buyNowCartData = {
            items: [],
            total_price: 0,
            items_subtotal_price: 0,
            total_discount: 0,
            item_count: 0,
            currency: 'BGN',
            cart_type: 'buy_now',
            source: 'buy_now_button'
          };
          
          console.log('Creating default Buy Now cart data structure');
          setCartData(buyNowCartData);
          
          // Also store in window for access from checkout form
          (window as any).cartData = buyNowCartData;
        }
      }
    }
  }, [cartData]);

  // This function will communicate back to the parent window
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      // Tell parent window to close the iframe
      console.log('Sending checkout-closed message to parent window');
      window.parent.postMessage('checkout-closed', '*')
    }
  }

  return (
    <div className={`${styles.container} ${styles.globalStyles} ${isMobile ? 'mobile-checkout' : ''}`}>
      {isLoading && <LoadingSpinner />}
      
      <CheckoutForm 
        open={isOpen} 
        onOpenChange={handleOpenChange} 
        cartData={cartData}
        isMobile={isMobile}
      />
    </div>
  )
} 