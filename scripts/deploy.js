#!/usr/bin/env node

/**
 * Deployment script for staging and production environments
 * Usage: node scripts/deploy.js [staging|production] [preview]
 */

const { execSync } = require('child_process');
const path = require('path');

const environment = process.argv[2];
const isPreview = process.argv[3] === 'preview';

if (!environment || !['staging', 'production'].includes(environment)) {
  console.error('❌ Please specify environment: staging or production');
  console.log('Usage: node scripts/deploy.js [staging|production] [preview]');
  console.log('Examples:');
  console.log('  node scripts/deploy.js staging          # Deploy staging to production URL');
  console.log('  node scripts/deploy.js staging preview  # Deploy staging preview');
  console.log('  node scripts/deploy.js production       # Deploy production');
  process.exit(1);
}

const configFile = `vercel.${environment}.json`;
const previewFlag = isPreview ? '' : '--prod';

console.log(`🚀 Deploying to ${environment} environment${isPreview ? ' (preview)' : ''}...`);
console.log(`📁 Using config: ${configFile}`);
console.log(`🔗 Target: ${environment === 'staging' ? 'checkout-form-staging.vercel.app' : 'checkout-form-zeta.vercel.app'}`);

try {
  // Build for the specific environment
  console.log(`🔨 Building for ${environment}...`);
  execSync(`cross-env NEXT_PUBLIC_APP_ENV=${environment} npm run build`, { 
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..')
  });

  // Deploy using the appropriate config
  console.log(`📤 Deploying...`);
  const deployCommand = `vercel ${previewFlag}`;
  execSync(deployCommand, { 
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..')
  });

  console.log(`✅ Successfully deployed to ${environment}!`);
  
  if (isPreview) {
    console.log('🔗 Check your Vercel dashboard for the preview URL');
  } else {
    const url = environment === 'staging' 
      ? 'https://checkout-form-staging.vercel.app'
      : 'https://checkout-form-zeta.vercel.app';
    console.log(`🌐 Live at: ${url}`);
  }

} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
}

