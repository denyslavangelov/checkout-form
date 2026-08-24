/**
 * Office Selector CDN — FULL PAGE (not popup)
 *
 * Intercepts checkout buttons and redirects to a separate pre-checkout page
 * instead of opening an iframe modal.
 *
 * Usage (use THIS script OR shopify-integration.js, not both):
 *
 * <script>
 * window.officeSelectorConfig = {
 *   shopify: {
 *     storeUrl: 'your-store.myshopify.com',
 *     accessToken: 'shpat_...'
 *   },
 *   availableCouriers: ['speedy', 'econt'],
 *   defaultCourier: 'speedy',
 *   defaultDeliveryType: 'office',
 *   // Optional: native cart checkout (/checkouts/cn/...)
 *   cartCheckout: { mode: 'native' },
 *   // Optional override:
 *   // baseUrl: 'https://checkout-form-zeta.vercel.app'
 * };
 * </script>
 * <script src="https://checkout-form-zeta.vercel.app/cdn/shopify-integration-page.js"></script>
 */
(function () {
  'use strict';

  if (window.__officeSelectorPageLoaded) return;
  window.__officeSelectorPageLoaded = true;

  var config = window.officeSelectorConfig || {};
  var defaultConfig = {
    availableCouriers: ['speedy', 'econt'],
    defaultCourier: 'speedy',
    defaultDeliveryType: 'office',
    cartCheckout: { mode: 'draft-order' },
    baseUrl: 'https://checkout-form-zeta.vercel.app',
    shopify: { storeUrl: '', accessToken: '' },
    buttonTargets: {
      enableSmartDetection: true,
      customSelectors: [],
      excludeSelectors: [],
      buttonTypes: ['checkout', 'buy-now', 'cart-checkout'],
      targetByClass: [],
      targetByName: [],
      targetByClassAndName: []
    }
  };

  var finalConfig = {
    availableCouriers: config.availableCouriers || defaultConfig.availableCouriers,
    defaultCourier: config.defaultCourier || defaultConfig.defaultCourier,
    defaultDeliveryType: config.defaultDeliveryType || defaultConfig.defaultDeliveryType,
    cartCheckout: Object.assign({}, defaultConfig.cartCheckout, config.cartCheckout || {}),
    baseUrl: config.baseUrl || defaultConfig.baseUrl,
    shopify: Object.assign({}, defaultConfig.shopify, config.shopify || {}),
    freeShipping: config.freeShipping,
    continueButton: config.continueButton,
    font: config.font,
    showPrices: config.showPrices,
    meta: config.meta,
    pixelId: config.pixelId,
    metaPixelId: config.metaPixelId,
    buttonTargets: Object.assign({}, defaultConfig.buttonTargets, config.buttonTargets || {})
  };

  function slimCart(cart) {
    if (!cart) return null;
    var items = cart.items || cart.line_items || [];
    return {
      token: cart.token,
      currency: cart.currency || 'BGN',
      item_count: cart.item_count || items.length,
      total_price: cart.total_price || 0,
      items: items.map(function (item) {
        return {
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
        };
      })
    };
  }

  function buildConfigForPage() {
    return {
      availableCouriers: finalConfig.availableCouriers,
      defaultCourier: finalConfig.defaultCourier,
      defaultDeliveryType: finalConfig.defaultDeliveryType,
      showPrices: finalConfig.showPrices,
      freeShipping: finalConfig.freeShipping,
      continueButton: finalConfig.continueButton,
      font: finalConfig.font,
      shopify: finalConfig.shopify,
      cartCheckout: finalConfig.cartCheckout,
      meta: finalConfig.meta,
      pixelId: finalConfig.pixelId,
      metaPixelId: finalConfig.metaPixelId
    };
  }

  function redirectToPreCheckout(productData, cart) {
    var baseUrl = finalConfig.baseUrl.replace(/\/$/, '');
    var params = new URLSearchParams();
    params.set('productId', productData.productId || 'cart');
    params.set('variantId', productData.variantId || 'cart');
    if (productData.quantity) params.set('quantity', String(productData.quantity));
    params.set('storeOrigin', window.location.origin);
    params.set('config', JSON.stringify(buildConfigForPage()));

    var url = baseUrl + '/pre-checkout?' + params.toString();
    var slim = slimCart(cart);
    if (slim) {
      url += '#cart=' + encodeURIComponent(JSON.stringify(slim));
    }

    window.location.href = url;
  }

  function resolveProductData(button) {
    var text = (button.textContent || '').toLowerCase();
    var className = (button.className || '').toLowerCase();
    var id = (button.id || '').toLowerCase();

    var isBuyNow =
      text.indexOf('buy now') !== -1 ||
      text.indexOf('купи сега') !== -1 ||
      className.indexOf('buy-now') !== -1 ||
      className.indexOf('shopify-payment-button__button') !== -1 ||
      id.indexOf('buy-now') !== -1;

    if (!isBuyNow) {
      return { productId: 'cart', variantId: 'cart', isCartCheckout: true };
    }

    var productData = null;
    if (button.dataset && button.dataset.productId && button.dataset.variantId) {
      productData = {
        productId: button.dataset.productId,
        variantId: button.dataset.variantId
      };
    } else {
      var productForm = button.closest('form[action*="/cart/add"]');
      if (productForm) {
        var variantInput = productForm.querySelector('input[name="id"]');
        if (variantInput) {
          productData = {
            productId: 'unknown',
            variantId: variantInput.value
          };
        }
      }
    }

    var quantity = 1;
    if (button.dataset && button.dataset.quantity) {
      quantity = parseInt(button.dataset.quantity, 10) || 1;
    } else {
      var form = button.closest('form[action*="/cart/add"]');
      if (form) {
        var quantityInput = form.querySelector('input[name="quantity"]');
        if (quantityInput) quantity = parseInt(quantityInput.value, 10) || 1;
      }
    }

    if (!productData) {
      productData = { productId: 'cart', variantId: 'cart', isCartCheckout: true };
    } else {
      productData.quantity = quantity;
    }

    return productData;
  }

  function goToPreCheckout(event) {
    event.preventDefault();
    event.stopPropagation();

    var button = event.currentTarget || event.target;
    var productData = resolveProductData(button);

    if (productData.isCartCheckout || (productData.productId === 'cart' && productData.variantId === 'cart')) {
      fetch('/cart.js', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
        .then(function (res) {
          if (!res.ok) throw new Error('cart fetch failed');
          return res.json();
        })
        .then(function (cart) {
          try {
            localStorage.setItem('shopify-cart-data', JSON.stringify(cart));
          } catch (e) {}
          window.shopifyCart = cart;
          window.cartData = cart;
          redirectToPreCheckout(productData, cart);
        })
        .catch(function () {
          redirectToPreCheckout(productData, window.shopifyCart || window.cartData || null);
        });
      return;
    }

    redirectToPreCheckout(productData, null);
  }

  function isExcluded(el) {
    var excludes = finalConfig.buttonTargets.excludeSelectors || [];
    for (var i = 0; i < excludes.length; i++) {
      try {
        if (el.matches(excludes[i])) return true;
      } catch (e) {}
    }
    return false;
  }

  function isCheckoutButton(el) {
    if (!el || el.nodeType !== 1) return false;
    if (isExcluded(el)) return false;

    var custom = finalConfig.buttonTargets.customSelectors || [];
    for (var i = 0; i < custom.length; i++) {
      try {
        if (el.matches(custom[i])) return true;
      } catch (e) {}
    }

    var byClass = finalConfig.buttonTargets.targetByClass || [];
    for (var c = 0; c < byClass.length; c++) {
      if (el.classList && el.classList.contains(byClass[c])) return true;
    }

    var byName = finalConfig.buttonTargets.targetByName || [];
    var nameAttr = (el.getAttribute('name') || '').toLowerCase();
    for (var n = 0; n < byName.length; n++) {
      if (nameAttr === String(byName[n]).toLowerCase()) return true;
    }

    if (!finalConfig.buttonTargets.enableSmartDetection) return false;

    var text = (el.textContent || '').toLowerCase().trim();
    var className = (el.className || '').toString().toLowerCase();
    var id = (el.id || '').toLowerCase();
    var type = (el.getAttribute('type') || '').toLowerCase();
    var name = nameAttr;

    var checkoutLike =
      text.indexOf('checkout') !== -1 ||
      text.indexOf(' към плащане') !== -1 ||
      text.indexOf('завършване') !== -1 ||
      text.indexOf('плащане') !== -1 ||
      className.indexOf('checkout') !== -1 ||
      className.indexOf('cart__checkout') !== -1 ||
      id.indexOf('checkout') !== -1 ||
      name === 'checkout' ||
      (type === 'submit' && (className.indexOf('checkout') !== -1 || name.indexOf('checkout') !== -1));

    var buyNowLike =
      text.indexOf('buy now') !== -1 ||
      text.indexOf('купи сега') !== -1 ||
      className.indexOf('shopify-payment-button') !== -1 ||
      className.indexOf('buy-now') !== -1;

    var types = finalConfig.buttonTargets.buttonTypes || [];
    if (types.indexOf('checkout') !== -1 || types.indexOf('cart-checkout') !== -1) {
      if (checkoutLike) return true;
    }
    if (types.indexOf('buy-now') !== -1 && buyNowLike) return true;

    return false;
  }

  function bindButton(el) {
    if (!el || el.__officeSelectorPageBound) return;
    el.__officeSelectorPageBound = true;
    el.addEventListener('click', goToPreCheckout, true);
  }

  function scanButtons() {
    var nodes = document.querySelectorAll(
      'button, a, input[type="submit"], [name="checkout"], .cart__checkout-button, .shopify-payment-button__button'
    );
    for (var i = 0; i < nodes.length; i++) {
      if (isCheckoutButton(nodes[i])) bindButton(nodes[i]);
    }
  }

  function handleNativeHandoff() {
    var params = new URLSearchParams(window.location.search);
    var encoded = params.get('__office_checkout_handoff');
    if (!encoded) return false;

    var delivery = {};
    try {
      delivery = JSON.parse(decodeURIComponent(encoded));
    } catch (e) {
      return false;
    }

    var attributes = delivery.attributes || {};
    var note = delivery.note || '';
    var address1 = delivery.address || '';
    var city = delivery.city || '';
    var postalCode = delivery.postalCode || '';

    try {
      if (typeof window.fbq === 'function') {
        var cart = window.shopifyCart || window.cartData || {};
        var value = typeof cart.total_price === 'number' ? cart.total_price / 100 : undefined;
        window.fbq('track', 'InitiateCheckout', {
          value: value,
          currency: cart.currency || 'BGN',
          num_items: cart.item_count || 0,
          content_type: 'product'
        });
      }
    } catch (e) {}

    var checkoutParams = [];
    if (city) checkoutParams.push('checkout[shipping_address][city]=' + encodeURIComponent(city));
    if (address1) checkoutParams.push('checkout[shipping_address][address1]=' + encodeURIComponent(address1));
    if (postalCode) checkoutParams.push('checkout[shipping_address][zip]=' + encodeURIComponent(postalCode));
    checkoutParams.push('checkout[shipping_address][country]=' + encodeURIComponent('BG'));
    var checkoutUrl = '/checkout' + (checkoutParams.length ? '?' + checkoutParams.join('&') : '');

    // Clean handoff params from the URL before leaving.
    params.delete('__office_checkout_handoff');
    var clean = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
    history.replaceState(null, '', clean);

    fetch('/cart/update.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ note: note, attributes: attributes })
    })
      .catch(function () {})
      .finally(function () {
        window.location.href = checkoutUrl;
      });

    return true;
  }

  function init() {
    if (handleNativeHandoff()) return;
    scanButtons();
    setInterval(scanButtons, 1500);

    if (window.MutationObserver) {
      var observer = new MutationObserver(function () {
        scanButtons();
      });
      observer.observe(document.documentElement || document.body, {
        childList: true,
        subtree: true
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.redirectToOfficePreCheckout = function () {
    goToPreCheckout({ preventDefault: function () {}, stopPropagation: function () {}, currentTarget: document.body });
  };
})();
