"use client"

import { useState } from "react"
import { CheckoutForm } from "@/components/checkout-form"
import { Button } from "@/components/ui/button"

export default function Home() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Welcome to Our Store</h1>
        <p className="text-lg text-muted-foreground">Ready to complete your purchase?</p>
        <Button onClick={() => setIsOpen(true)}>
          Open Checkout Form
        </Button>
      </div>

      <CheckoutForm open={isOpen} onOpenChange={setIsOpen} cartData={null} />
    </div>
  )
}
