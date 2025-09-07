'use client';

import { useState, useEffect } from 'react';
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


  // Simple function to parse URL parameters
  const parseUrlParams = () => {
    if (typeof window === 'undefined') return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const product = urlParams.get('productId') || '';
    const variant = urlParams.get('variantId') || '';
    const qty = urlParams.get('quantity') || '1';
    const configParam = urlParams.get('config');
    
    // Set basic parameters
    setProductId(product);
    setVariantId(variant);
    setQuantity(qty);
    
    // Parse config if present
    if (configParam) {
      try {
        const parsedConfig = JSON.parse(decodeURIComponent(configParam));
        
        // Set the config with Shopify credentials
        setConfig({
          availableCouriers: parsedConfig.availableCouriers || ['speedy', 'econt'],
          defaultCourier: parsedConfig.defaultCourier || 'speedy',
          defaultDeliveryType: parsedConfig.defaultDeliveryType || 'office',
          shopify: {
            storeUrl: parsedConfig.shopify?.storeUrl || '',
            accessToken: parsedConfig.shopify?.accessToken || ''
          }
        });
        
      } catch (error) {
        console.error('🏢 Error parsing config:', error);
      }
    }
  };

  // Run once when component mounts
  useEffect(() => {
    parseUrlParams();
  }, []);

  const handleOrderCreated = (invoiceUrl: string) => {
    if (typeof window === 'undefined') return;

    if (window.parent) {
      window.parent.location.href = invoiceUrl;
    } else {
      window.location.href = invoiceUrl;
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
    <div className="min-h-screen bg-white-100">
      <OfficeSelectorModal
        isOpen={isOpen}
        onClose={handleClose}
        onOrderCreated={handleOrderCreated}
        productId={productId}
        variantId={variantId}
        quantity={quantity}
        config={config}
      />
    </div>
  );
}