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
    showPrices: true,
    freeShipping: undefined as { enabled: boolean; threshold: number } | undefined,
    continueButton: {
      text: 'Продължи към завършване',
      backgroundColor: 'bg-red-600',
      hoverColor: 'hover:bg-red-700'
    },
    font: {
      family: 'inherit',
      weight: '400'
    },
    shopify: {
      storeUrl: '',
      accessToken: ''
    },
    cartCheckout: {
      mode: 'draft-order' as 'draft-order' | 'native'
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
    const mockCart = urlParams.get('mockCart');

    const shouldInjectMockCart = mockCart === '1' || mockCart === 'true';
    if (shouldInjectMockCart && typeof window !== 'undefined') {
      const mockItems = [
        {
          id: Date.now(),
          variant_id: 900111001,
          product_id: 700111001,
          title: 'Тениска Premium Black / M',
          product_title: 'Тениска Premium Black',
          variant_title: 'M',
          quantity: 2,
          price: 3490,
          line_price: 6980,
          final_line_price: 6980
        },
        {
          id: Date.now() + 1,
          variant_id: 900111002,
          product_id: 700111002,
          title: 'Суичър Urban Grey / L',
          product_title: 'Суичър Urban Grey',
          variant_title: 'L',
          quantity: 1,
          price: 6260,
          line_price: 6260,
          final_line_price: 6260
        }
      ];

      window.localStorage.setItem(
        'shopify-cart-data',
        JSON.stringify({
          token: `mock-${Date.now()}`,
          currency: 'BGN',
          item_count: mockItems.reduce((sum, item) => sum + item.quantity, 0),
          total_price: mockItems.reduce((sum, item) => sum + item.final_line_price, 0),
          items: mockItems
        })
      );
    }
    
    // Set basic parameters
    setProductId(shouldInjectMockCart ? 'cart' : product);
    setVariantId(shouldInjectMockCart ? 'cart' : variant);
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
          showPrices: parsedConfig.showPrices !== undefined ? parsedConfig.showPrices : true,
          freeShipping: parsedConfig.freeShipping, // Include freeShipping configuration
          continueButton: {
            text: parsedConfig.continueButton?.text || 'Продължи към завършване',
            backgroundColor: parsedConfig.continueButton?.backgroundColor || 'bg-red-600',
            hoverColor: parsedConfig.continueButton?.hoverColor || 'hover:bg-red-700'
          },
          font: {
            family: parsedConfig.font?.family || 'inherit',
            weight: parsedConfig.font?.weight || '400'
          },
          shopify: {
            storeUrl: parsedConfig.shopify?.storeUrl || '',
            accessToken: parsedConfig.shopify?.accessToken || ''
          },
          cartCheckout: {
            mode: parsedConfig.cartCheckout?.mode === 'native' ? 'native' : 'draft-order'
          }
        });
        
      } catch (error) {
      }
    }
  };

  // Run once when component mounts
  useEffect(() => {
    parseUrlParams();
  }, []);

  const handleOrderCreated = (checkoutUrl: string) => {
    if (typeof window === 'undefined') return;

    // Native cart checkout: parent CDN handles /cart/update.js + redirect.
    // Do not race-redirect from the iframe when embedded.
    if (checkoutUrl === '/checkout') {
      if (!window.parent || window.parent === window) {
        const storeUrl = config.shopify?.storeUrl;
        if (storeUrl) {
          window.location.href = `https://${storeUrl.replace(/^https?:\/\//, '')}/checkout`;
        }
      }
      return;
    }

    if (window.parent && window.parent !== window) {
      window.parent.location.href = checkoutUrl;
    } else {
      window.location.href = checkoutUrl;
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