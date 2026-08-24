'use client';

import { useEffect, useState } from 'react';
import { OfficeSelectorModal } from '@/components/office-selector-modal';

type PreCheckoutConfig = {
  availableCouriers: string[];
  defaultCourier: string;
  defaultDeliveryType: string;
  showPrices: boolean;
  freeShipping?: { enabled: boolean; threshold: number };
  continueButton: {
    text?: string;
    backgroundColor?: string;
    hoverColor?: string;
  };
  font: {
    family?: string;
    weight?: string | number;
  };
  shopify: {
    storeUrl: string;
    accessToken: string;
  };
  cartCheckout: {
    mode: 'draft-order' | 'native';
  };
};

function slimCart(cart: any) {
  if (!cart) return null;
  const items = cart.items || cart.line_items || [];
  return {
    token: cart.token,
    currency: cart.currency || 'BGN',
    item_count: cart.item_count || items.length,
    total_price: cart.total_price || 0,
    items: items.map((item: any) => ({
      id: item.id,
      variant_id: item.variant_id,
      product_id: item.product_id,
      title: item.title,
      quantity: item.quantity,
      price: item.price,
      line_price: item.line_price,
      final_line_price: item.final_line_price,
      original_line_price: item.original_line_price,
      original_price: item.original_price
    }))
  };
}

export default function PreCheckoutPage() {
  const [ready, setReady] = useState(false);
  const [productId, setProductId] = useState('cart');
  const [variantId, setVariantId] = useState('cart');
  const [quantity, setQuantity] = useState('1');
  const [storeOrigin, setStoreOrigin] = useState('');
  const [config, setConfig] = useState<PreCheckoutConfig>({
    availableCouriers: ['speedy', 'econt'],
    defaultCourier: 'speedy',
    defaultDeliveryType: 'office',
    showPrices: true,
    continueButton: {
      text: 'Продължи към завършване',
      backgroundColor: '#dc2626',
      hoverColor: '#b91c1c'
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
      mode: 'draft-order'
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const product = params.get('productId') || 'cart';
    const variant = params.get('variantId') || 'cart';
    const qty = params.get('quantity') || '1';
    const origin = params.get('storeOrigin') || '';
    const configParam = params.get('config');

    setProductId(product);
    setVariantId(variant);
    setQuantity(qty);
    setStoreOrigin(origin);

    if (configParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(configParam));
        setConfig({
          availableCouriers: parsed.availableCouriers || ['speedy', 'econt'],
          defaultCourier: parsed.defaultCourier || 'speedy',
          defaultDeliveryType: parsed.defaultDeliveryType || 'office',
          showPrices: parsed.showPrices !== undefined ? parsed.showPrices : true,
          freeShipping: parsed.freeShipping,
          continueButton: {
            text: parsed.continueButton?.text || 'Продължи към завършване',
            backgroundColor: parsed.continueButton?.backgroundColor || '#dc2626',
            hoverColor: parsed.continueButton?.hoverColor || '#b91c1c'
          },
          font: {
            family: parsed.font?.family || 'inherit',
            weight: parsed.font?.weight || '400'
          },
          shopify: {
            storeUrl: parsed.shopify?.storeUrl || '',
            accessToken: parsed.shopify?.accessToken || ''
          },
          cartCheckout: {
            mode: parsed.cartCheckout?.mode === 'native' ? 'native' : 'draft-order'
          }
        });
      } catch {
        // keep defaults
      }
    }

    // Cart payload is passed in the URL hash from the store CDN (cross-origin safe).
    if (window.location.hash.startsWith('#cart=')) {
      try {
        const raw = decodeURIComponent(window.location.hash.slice('#cart='.length));
        const cart = JSON.parse(raw);
        const slim = slimCart(cart);
        if (slim) {
          localStorage.setItem('shopify-cart-data', JSON.stringify(slim));
        }
        history.replaceState(null, '', window.location.pathname + window.location.search);
      } catch {
        // ignore bad hash
      }
    }

    setReady(true);
  }, []);

  const handleClose = () => {
    if (storeOrigin) {
      window.location.href = `${storeOrigin}/cart`;
      return;
    }
    window.history.back();
  };

  const handleOrderCreated = (checkoutUrl: string) => {
    if (checkoutUrl.startsWith('native-checkout:')) {
      const encoded = checkoutUrl.slice('native-checkout:'.length);
      const storeUrl =
        storeOrigin ||
        (config.shopify.storeUrl
          ? `https://${config.shopify.storeUrl.replace(/^https?:\/\//, '')}`
          : '');

      if (!storeUrl) {
        window.alert('Липсва store URL за native checkout handoff.');
        return;
      }

      const handoffUrl = new URL(storeUrl);
      handoffUrl.searchParams.set('__office_checkout_handoff', encoded);
      window.location.href = handoffUrl.toString();
      return;
    }

    if (checkoutUrl === '/checkout') {
      const storeUrl =
        storeOrigin ||
        (config.shopify.storeUrl
          ? `https://${config.shopify.storeUrl.replace(/^https?:\/\//, '')}`
          : '');
      window.location.href = storeUrl ? `${storeUrl}/checkout` : '/checkout';
      return;
    }

    window.location.href = checkoutUrl;
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600 text-sm">
        Зареждане...
      </div>
    );
  }

  return (
    <OfficeSelectorModal
      isOpen={true}
      onClose={handleClose}
      onOrderCreated={handleOrderCreated}
      productId={productId}
      variantId={variantId}
      quantity={quantity}
      displayMode="page"
      config={config}
    />
  );
}
