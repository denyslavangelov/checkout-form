"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { CheckoutForm } from "@/components/checkout-form"

// Test cart data that matches the expected format exactly
const testCart = {
  items: [
    {
      id: 1,
      title: "Test Product",
      variant_title: null,
      price: 2999,
      line_price: 2999,
      original_line_price: 2999,
      quantity: 1,
      image: "https://picsum.photos/200"
    }
  ],
  total_price: 2999,
  items_subtotal_price: 2999,
  total_discount: 0,
  currency: "BGN",
  item_count: 1,
  requires_shipping: true
};

export default function TestPage() {
    
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [cartData, setCartData] = useState(testCart);

  // Only mount the form after initial render to avoid SSR issues
  useEffect(() => {
    debugger;
    setMounted(true);
    // Open the form after mounting
    setOpen(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Button onClick={() => setOpen(true)}>
        Open Checkout Form
      </Button>

      <CheckoutForm 
        open={open}
        onOpenChange={setOpen}
        cartData={cartData}
      />
    </div>
  );
} 