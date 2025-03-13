"use client"

import { useState, useEffect } from "react"
import { CheckoutForm } from "@/components/checkout-form"
import styles from "./page.module.css"

// Extend the Window interface to include our global properties
declare global {
  interface Window {
    cartData: any;
    customCheckoutData: {
      cartData: any;
      metadata?: any;
      received?: string;
    };
  }
}

export default function IframePage() {
  const [isOpen, setIsOpen] = useState(false)
  const [cartData, setCartData] = useState(null)
  const [dataReceived, setDataReceived] = useState(false)
  
  // Automatically open the form when the iframe loads
  useEffect(() => {
    setIsOpen(true)
    console.log('IframePage mounted, waiting for cart data...')
    
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
          metadata: event.data.metadata
        });
        
        // Make cart data available globally in the iframe window too
        if (typeof window !== 'undefined') {
          window.cartData = event.data.cart;
          window.customCheckoutData = {
            cartData: event.data.cart,
            metadata: event.data.metadata,
            received: new Date().toISOString()
          };
          console.log('Cart data made globally available in iframe window');
        }
        
        setCartData(event.data.cart);
        setDataReceived(true);
      }
    }
    
    window.addEventListener('message', handleMessage)
    
    // If we're in development mode and no cart data received after 2 seconds,
    // check localStorage for test cart data
    const timeoutId = setTimeout(() => {
      if (!dataReceived && process.env.NODE_ENV === 'development') {
        console.log('No cart data received, checking localStorage for test data');
        try {
          const storedCartData = localStorage.getItem('cartData');
          if (storedCartData) {
            const parsedCartData = JSON.parse(storedCartData);
            console.log('Using test cart data from localStorage');
            setCartData(parsedCartData);
          } else {
            console.log('No test data in localStorage either');
          }
        } catch (error) {
          console.error('Error accessing localStorage:', error);
        }
      }
    }, 2000);
    
    return () => {
      window.removeEventListener('message', handleMessage)
      clearTimeout(timeoutId);
    }
  }, [dataReceived])

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