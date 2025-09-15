/**
 * Environment-aware configuration system
 * Handles different environments: development, staging, production
 */

export type Environment = 'development' | 'staging' | 'production';

export interface AppConfig {
  environment: Environment;
  apiBaseUrl: string;
  isDevelopment: boolean;
  isStaging: boolean;
  isProduction: boolean;
}

/**
 * Get the current environment from environment variables
 */
export function getEnvironment(): Environment {
  const env = process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || 'development';
  
  // Map NODE_ENV to our environment types
  if (env === 'production') {
    return 'production';
  } else if (env === 'staging') {
    return 'staging';
  } else {
    return 'development';
  }
}

/**
 * Get the appropriate API base URL based on environment
 */
export function getApiBaseUrl(): string {
  const environment = getEnvironment();
  
  switch (environment) {
    case 'development':
      return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
    case 'staging':
      return process.env.NEXT_PUBLIC_STAGING_API_BASE_URL || 'https://checkout-form-staging.vercel.app';
    case 'production':
      return process.env.NEXT_PUBLIC_PRODUCTION_API_BASE_URL || 'https://checkout-form-zeta.vercel.app';
    default:
      return 'http://localhost:3000';
  }
}

/**
 * Get the complete application configuration
 */
export function getAppConfig(): AppConfig {
  const environment = getEnvironment();
  const apiBaseUrl = getApiBaseUrl();
  
  return {
    environment,
    apiBaseUrl,
    isDevelopment: environment === 'development',
    isStaging: environment === 'staging',
    isProduction: environment === 'production',
  };
}

/**
 * Log configuration for debugging (only in development/staging)
 */
export function logConfig(): void {
  const config = getAppConfig();
  
  if (config.isDevelopment || config.isStaging) {
    console.log('🔧 App Configuration:', {
      environment: config.environment,
      apiBaseUrl: config.apiBaseUrl,
      nodeEnv: process.env.NODE_ENV,
      appEnv: process.env.NEXT_PUBLIC_APP_ENV,
    });
  }
}

