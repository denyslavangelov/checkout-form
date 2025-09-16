"use client"

import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Welcome to Our Store</h1>
        <p className="text-lg text-muted-foreground">Office Selector is available for integration.</p>
        <p className="text-sm text-green-600 font-semibold">✅ PRODUCTION ENVIRONMENT</p>
      </div>
    </div>
  )
}
