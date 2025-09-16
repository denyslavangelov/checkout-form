"use client"

import { Button } from "@/components/ui/button"
import { config, getEnvironmentBadge } from "@/lib/config"

export default function Home() {
  const envBadge = getEnvironmentBadge()
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Welcome to Our Store</h1>
        <p className="text-lg text-muted-foreground">Office Selector is available for integration.</p>
        
        {/* Environment indicator */}
        {config.features.enableStagingIndicator && (
          <div className="space-y-2">
            <p className={`text-sm font-semibold ${envBadge.color}`}>
              {envBadge.text} ENVIRONMENT
            </p>
            <p className="text-xs text-gray-500">
              API: {config.apiBaseUrl}
            </p>
            <p className="text-xs text-gray-500">
              Debug Mode: {config.features.enableDebugMode ? 'ON' : 'OFF'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
