'use client';

import { useState, useEffect, useMemo } from 'react';
import { OfficeSelectorModal } from '@/components/office-selector-modal';

export default function OfficeSelectorPage() {
  const [isOpen, setIsOpen] = useState(true);
  const [productId, setProductId] = useState('');
  const [variantId, setVariantId] = useState('');
  const [config, setConfig] = useState({
    availableCouriers: ['speedy', 'econt'],
    defaultCourier: 'speedy',
    defaultDeliveryType: 'office'
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
          defaultDeliveryType: 'office'
        }
      };
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const product = urlParams.get('productId') || '';
    const variant = urlParams.get('variantId') || '';
    const configParam = urlParams.get('config');
    
    let parsedConfig = {
      availableCouriers: ['speedy', 'econt'],
      defaultCourier: 'speedy',
      defaultDeliveryType: 'office'
    };
    
    if (configParam) {
      try {
        parsedConfig = JSON.parse(decodeURIComponent(configParam));
        console.log('🏢 Office selector config loaded:', parsedConfig);
      } catch (error) {
        console.error('🏢 Error parsing config:', error);
      }
    }
    
    return { product, variant, parsedConfig };
  }, []);

  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') return;
    
    setProductId(urlData.product);
    setVariantId(urlData.variant);
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
    
    // Notify parent window about order creation
    if (window.parent) {
      window.parent.postMessage({ 
        type: 'order-created', 
        checkoutUrl: checkoutUrl 
      }, '*');
    }
    
    // For cart checkout, redirect the parent window to Shopify checkout
    if (productId === 'cart' && variantId === 'cart') {
      if (window.parent) {
        // Redirect parent to Shopify checkout page
        window.parent.location.href = '/checkout';
      } else {
        window.location.href = '/checkout';
      }
    } else {
      // For Buy Now, redirect the parent window to the checkout URL
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
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
      <OfficeSelectorModal
        isOpen={isOpen}
        onClose={handleClose}
        onOrderCreated={handleOrderCreated}
        productId={productId}
        variantId={variantId}
        config={config}
      />
    </div>
  );
}
