'use client';

import { useState, useEffect, useMemo } from 'react';
import { OfficeSelectorModal } from '@/components/office-selector-modal';

export default function OfficeSelectorPage() {
  const [isOpen, setIsOpen] = useState(true);
  const [productId, setProductId] = useState('');
  const [variantId, setVariantId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [config, setConfig] = useState({
    availableCouriers: ['speedy', 'econt'],
    defaultCourier: 'speedy',
    defaultDeliveryType: 'office',
    shopify: {
      storeUrl: '',
      accessToken: ''
    }
  });

  // Memoize URL parsing for performance
  const urlData = useMemo(() => {
    // Check if we're in the browser environment
    if (typeof window === 'undefined') {
      return {
        product: '',
        variant: '',
        parsedConfig: {
          availableCouriers: ['speedy', 'econt'],
          defaultCourier: 'speedy',
          defaultDeliveryType: 'office',
          shopify: {
            storeUrl: '',
            accessToken: ''
          }
        }
      };
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const product = urlParams.get('productId') || '';
    const variant = urlParams.get('variantId') || '';
    const quantity = urlParams.get('quantity') || '1';
    const configParam = urlParams.get('config');
    const storeUrl = urlParams.get('storeUrl') || '';
    const accessToken = urlParams.get('accessToken') || '';
    
    debugger;
    
    // Debug logging for URL parameters
    console.log('🏢 Office Selector URL Parameters:', {
      productId: product,
      variantId: variant,
      quantity: quantity,
      configParam: configParam,
      storeUrl: storeUrl,
      accessToken: accessToken ? '***' + accessToken.slice(-4) : 'none',
      allParams: Object.fromEntries(urlParams.entries())
    });
    
    let parsedConfig = {
      availableCouriers: ['speedy', 'econt'],
      defaultCourier: 'speedy',
      defaultDeliveryType: 'office',
      shopify: {
        storeUrl: '',
        accessToken: ''
      }
    };
    
    if (configParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(configParam));
        parsedConfig = {
          ...parsedConfig,
          ...parsed,
          shopify: {
            storeUrl: parsed.shopify?.storeUrl || '',
            accessToken: parsed.shopify?.accessToken || ''
          }
        };
      } catch (error) {
        console.error('🏢 Error parsing config:', error);
      }
    }
    
    // Add Shopify credentials from URL parameters if available
    if (storeUrl && accessToken) {
      parsedConfig.shopify = {
        storeUrl: storeUrl,
        accessToken: accessToken
      };
      console.log('🏢 Using credentials from URL parameters');
    } else {
      // Keep empty credentials - will be handled by the modal component
      console.log('🏢 No valid credentials found in URL parameters');
      parsedConfig.shopify = {
        storeUrl: '',
        accessToken: ''
      };
    }
    
    return { product, variant, quantity: quantity || '1', parsedConfig };
  }, []);

  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') return;
    
    // Debug logging for URL data
    console.log('🏢 Office Selector URL Data:', {
      product: urlData.product,
      variant: urlData.variant,
      quantity: urlData.quantity,
      parsedConfig: urlData.parsedConfig,
      hasShopify: !!urlData.parsedConfig.shopify,
      storeUrl: urlData.parsedConfig.shopify?.storeUrl,
      accessToken: urlData.parsedConfig.shopify?.accessToken ? '***' + urlData.parsedConfig.shopify.accessToken.slice(-4) : 'none'
    });
    
    setProductId(urlData.product);
    setVariantId(urlData.variant);
    setQuantity(urlData.quantity || '1');
    setConfig(urlData.parsedConfig);

    // Listen for messages from parent window
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'open-office-selector') {
        setProductId(event.data.productId || '');
        setVariantId(event.data.variantId || '');
        setIsOpen(true);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [urlData]);

  const handleOrderCreated = (checkoutUrl: string) => {
    // Only run in browser environment
    if (typeof window === 'undefined') return;
    
    console.log('🏢 Order created with checkout URL:', checkoutUrl);
    console.log('🏢 Product ID:', productId, 'Variant ID:', variantId);
    
    // Notify parent window about order creation
    if (window.parent) {
      window.parent.postMessage({ 
        type: 'order-created', 
        checkoutUrl: checkoutUrl 
      }, '*');
    }
    
    // For cart checkout, redirect the parent window to Shopify checkout
    if (productId === 'cart' && variantId === 'cart') {
      console.log('🏢 Cart checkout - redirecting to /checkout');
      if (window.parent) {
        // Redirect parent to Shopify checkout page
        window.parent.location.href = '/checkout';
      } else {
        window.location.href = '/checkout';
      }
    } else {
      // For Buy Now, redirect the parent window to the checkout URL
      console.log('🏢 Buy Now - redirecting to checkout URL:', checkoutUrl);
      if (window.parent) {
        window.parent.location.href = checkoutUrl;
      } else {
        window.location.href = checkoutUrl;
      }
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    // Notify parent window that modal is closed
    if (typeof window !== 'undefined' && window.parent) {
      window.parent.postMessage({ type: 'office-selector-closed' }, '*');
    }
  };

  return (
      <OfficeSelectorModal
        isOpen={isOpen}
        onClose={handleClose}
        onOrderCreated={handleOrderCreated}
        productId={productId}
        variantId={variantId}
        quantity={quantity}
        config={config}
      />
  );
}
