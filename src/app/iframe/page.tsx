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

export default function IframePage() {
  const [isOpen, setIsOpen] = useState(false)
  const [cartData, setCartData] = useState<CartData | null>(null)
  const [dataReceived, setDataReceived] = useState(false)
  const [loadingRetries, setLoadingRetries] = useState(0)
  
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
      }
    }
    
    window.addEventListener('message', handleMessage)
    
    // Request cart data from parent if needed
    const requestCartData = () => {
      if (!dataReceived && hasCartParam === 'true') {
        console.log(`Requesting cart data from parent (attempt ${loadingRetries + 1})...`);
        window.parent.postMessage('request-cart-data', '*');
        setLoadingRetries(prev => prev + 1);
      }
    };
    
    // Set up multiple attempts to request cart data
    const requestTimeoutId = setTimeout(requestCartData, 500);
    
    // Check for cart data in various places if not received directly
    const fallbackTimeoutId = setTimeout(() => {
      if (!dataReceived) {
        console.log('No cart data received, checking alternatives...');
        
        // 1. Check if cart data exists in the window object (might have been set already)
        if (window.cartData) {
          console.log('Found cart data in window.cartData');
          setCartData(window.cartData);
          setDataReceived(true);
          return;
        }
        
        if (window.customCheckoutData?.cartData) {
          console.log('Found cart data in window.customCheckoutData.cartData');
          setCartData(window.customCheckoutData.cartData);
          setDataReceived(true);
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
            return;
          }
          
          // 3. Check for temporary cart data stored by the parent
          const tempCartData = localStorage.getItem('tempCartData');
          if (tempCartData) {
            const parsedTempCartData = JSON.parse(tempCartData);
            console.log('Using temporary cart data from localStorage');
            setCartData(parsedTempCartData);
            setDataReceived(true);
            
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
          }
        }
      }
    }, 2000);
    
    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(requestTimeoutId);
      clearTimeout(fallbackTimeoutId);
    }
  }, [dataReceived, loadingRetries]);

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
    <div className={`${styles.container} ${styles.globalStyles}`}>
      <CheckoutForm 
        open={isOpen} 
        onOpenChange={handleOpenChange} 
        cartData={cartData} 
      />
    </div>
  )
} 