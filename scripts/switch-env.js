#!/usr/bin/env node

/**
 * Environment switcher for local development
 * Usage: node scripts/switch-env.js [development|staging|production]
 */

const fs = require('fs');
const path = require('path');

const environment = process.argv[2];

if (!environment || !['development', 'staging', 'production'].includes(environment)) {
  console.error('❌ Please specify environment: development, staging, or production');
  console.log('Usage: node scripts/switch-env.js [development|staging|production]');
  process.exit(1);
}

const envFile = path.resolve(__dirname, '..', '.env.local');

// Environment configurations
const envConfigs = {
  development: {
    NODE_ENV: 'development',
    NEXT_PUBLIC_APP_ENV: 'development',
    NEXT_PUBLIC_API_BASE_URL: 'http://localhost:3000',
    NEXT_PUBLIC_STAGING_API_BASE_URL: 'https://checkout-form-staging.vercel.app',
    NEXT_PUBLIC_PRODUCTION_API_BASE_URL: 'https://checkout-form-zeta.vercel.app'
  },
  staging: {
    NODE_ENV: 'staging',
    NEXT_PUBLIC_APP_ENV: 'staging',
    NEXT_PUBLIC_API_BASE_URL: 'https://checkout-form-staging.vercel.app',
    NEXT_PUBLIC_STAGING_API_BASE_URL: 'https://checkout-form-staging.vercel.app',
    NEXT_PUBLIC_PRODUCTION_API_BASE_URL: 'https://checkout-form-zeta.vercel.app'
  },
  production: {
    NODE_ENV: 'production',
    NEXT_PUBLIC_APP_ENV: 'production',
    NEXT_PUBLIC_API_BASE_URL: 'https://checkout-form-zeta.vercel.app',
    NEXT_PUBLIC_STAGING_API_BASE_URL: 'https://checkout-form-staging.vercel.app',
    NEXT_PUBLIC_PRODUCTION_API_BASE_URL: 'https://checkout-form-zeta.vercel.app'
  }
};

const config = envConfigs[environment];

// Create .env.local content
const envContent = Object.entries(config)
  .map(([key, value]) => `${key}=${value}`)
  .join('\n') + '\n';

try {
  // Write the environment file
  fs.writeFileSync(envFile, envContent);
  
  console.log(`✅ Switched to ${environment} environment`);
  console.log(`📁 Updated: ${envFile}`);
  console.log(`🔗 API Base URL: ${config.NEXT_PUBLIC_API_BASE_URL}`);
  
  if (environment === 'development') {
    console.log('💡 Run "npm run dev" to start the development server');
  } else {
    console.log('💡 Run "npm run build" to build for this environment');
  }
  
} catch (error) {
  console.error('❌ Failed to switch environment:', error.message);
  process.exit(1);
}

