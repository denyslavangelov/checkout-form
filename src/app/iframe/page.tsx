"use client"

import { useState, useEffect } from "react"
import { CheckoutForm } from "@/components/checkout-form"
import styles from "./page.module.css"

export default function IframePage() {
  const [isOpen, setIsOpen] = useState(false)
  const [cartData, setCartData] = useState(null)
  
  // Automatically open the form when the iframe loads
  useEffect(() => {
    setIsOpen(true)
    
    // Add message listener for communication with parent window
    const handleMessage = (event: MessageEvent) => {
      // Handle messages from parent (Shopify store)
      if (event.data === 'close-checkout') {
        setIsOpen(false)
      }
      
      // Handle cart data
      if (event.data && event.data.type === 'cart-data') {
        console.log('Received cart data:', event.data.cart);
        setCartData(event.data.cart);
      }
    }
    
    window.addEventListener('message', handleMessage)
    
    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [])

  // This function will communicate back to the parent window
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      // Tell parent window to close the iframe
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