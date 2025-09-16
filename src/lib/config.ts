// Environment configuration
export const config = {
  // Environment detection
  isDevelopment: process.env.NODE_ENV === 'development',
  isStaging: process.env.NODE_ENV === 'staging' || process.env.VERCEL_ENV === 'preview',
  isProduction: process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production',
  
  // Environment-specific settings
  environment: process.env.NODE_ENV === 'staging' ? 'staging' : 
               process.env.NODE_ENV === 'production' ? 'production' : 'development',
  
  // API endpoints (you can customize these)
  apiBaseUrl: process.env.NODE_ENV === 'staging' 
    ? 'https://staging-api.yourdomain.com' 
    : process.env.NODE_ENV === 'production'
    ? 'https://api.yourdomain.com'
    : 'http://localhost:3000/api',
  
  // Feature flags
  features: {
    enableStagingIndicator: process.env.NODE_ENV === 'staging',
    enableDebugMode: process.env.NODE_ENV !== 'production',
    enableAnalytics: process.env.NODE_ENV === 'production',
  },
  
  // Environment-specific styling
  theme: {
    accentColor: process.env.NODE_ENV === 'staging' ? 'blue' : 'green',
    showEnvironmentBadge: process.env.NODE_ENV === 'staging',
  }
} as const;

// Helper functions
export const getEnvironmentInfo = () => ({
  name: config.environment,
  isStaging: config.isStaging,
  isProduction: config.isProduction,
  isDevelopment: config.isDevelopment,
});

export const getEnvironmentBadge = () => {
  if (config.isStaging) {
    return { text: '🚀 STAGING', color: 'text-blue-600' };
  }
  if (config.isProduction) {
    return { text: '✅ PRODUCTION', color: 'text-green-600' };
  }
  return { text: '🔧 DEVELOPMENT', color: 'text-orange-600' };
};
