'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type DeliveryPayload = {
  note?: string;
  attributes?: Record<string, string>;
  address?: string;
  city?: string;
  postalCode?: string;
  courier?: string;
  deliveryType?: string;
  officeName?: string;
};

const MOCK_CART = {
  token: 'local-mock-cart',
  currency: 'BGN',
  item_count: 3,
  total_price: 13240,
  items: [
    {
      id: 1,
      variant_id: 900111001,
      product_id: 700111001,
      title: 'Тениска Premium Black / M',
      quantity: 2,
      price: 3490,
      line_price: 6980,
      final_line_price: 6980,
      original_line_price: 6980
    },
    {
      id: 2,
      variant_id: 900111002,
      product_id: 700111002,
      title: 'Суичър Urban Grey / L',
      quantity: 1,
      price: 6260,
      line_price: 6260,
      final_line_price: 6260,
      original_line_price: 6260
    }
  ]
};

function buildCheckoutUrl(storeUrl: string, delivery: DeliveryPayload) {
  const params = new URLSearchParams();
  if (delivery.city) params.set('checkout[shipping_address][city]', delivery.city);
  if (delivery.address) params.set('checkout[shipping_address][address1]', delivery.address);
  if (delivery.postalCode) params.set('checkout[shipping_address][zip]', delivery.postalCode);
  params.set('checkout[shipping_address][country]', 'BG');

  const host = storeUrl.replace(/^https?:\/\//, '');
  const query = params.toString();
  return `https://${host}/checkout${query ? `?${query}` : ''}`;
}

export default function NativeCheckoutTestPage() {
  const [storeUrl, setStoreUrl] = useState('testing-client-check.myshopify.com');
  const [logs, setLogs] = useState<string[]>([]);
  const [lastDelivery, setLastDelivery] = useState<DeliveryPayload | null>(null);
  const [lastPostBody, setLastPostBody] = useState<string>('');
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [iframeOpen, setIframeOpen] = useState(false);

  const appendLog = useCallback((message: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev].slice(0, 40));
  }, []);

  const officeSelectorUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';

    const config = {
      availableCouriers: ['speedy', 'econt'],
      defaultCourier: 'speedy',
      defaultDeliveryType: 'office',
      showPrices: true,
      cartCheckout: { mode: 'native' },
      shopify: {
        storeUrl,
        accessToken: 'local-test-token-not-used-for-native'
      }
    };

    const params = new URLSearchParams({
      productId: 'cart',
      variantId: 'cart',
      quantity: '1',
      mockCart: '1',
      config: JSON.stringify(config)
    });

    return `${window.location.origin}/office-selector?${params.toString()}`;
  }, [storeUrl]);

  useEffect(() => {
    if (!iframeOpen) return;

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'request-fresh-cart-data' || data.type === 'request-cart-data') {
        appendLog('← iframe requested cart data — replying with mock cart');
        const iframe = document.getElementById('native-test-iframe') as HTMLIFrameElement | null;
        iframe?.contentWindow?.postMessage({ type: 'cart-data', cart: MOCK_CART }, event.origin);
        return;
      }

      if (data.type === 'proceed-to-cart-checkout') {
        const delivery = (data.delivery || {}) as DeliveryPayload;
        const postBody = {
          note: delivery.note || '',
          attributes: delivery.attributes || {}
        };
        const url = buildCheckoutUrl(storeUrl, delivery);

        setLastDelivery(delivery);
        setLastPostBody(JSON.stringify(postBody, null, 2));
        setCheckoutUrl(url);

        appendLog('← received proceed-to-cart-checkout (native flow triggered)');
        appendLog(`Would POST /cart/update.js with note + ${Object.keys(postBody.attributes).length} attributes`);
        appendLog(`Would redirect to: ${url}`);
        appendLog('On a real store this becomes /checkouts/cn/...');

        setIframeOpen(false);
        return;
      }

      if (data.type === 'office-selector-closed') {
        appendLog('← office selector closed');
        setIframeOpen(false);
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [iframeOpen, storeUrl, appendLog]);

  const openSimulator = () => {
    setLastDelivery(null);
    setLastPostBody('');
    setCheckoutUrl('');
    setIframeOpen(true);
    appendLog('Opened office selector with cartCheckout.mode=native + mockCart=1');
  };

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      appendLog(`Copied ${label}`);
    } catch {
      appendLog(`Could not copy ${label}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Native cart checkout — local simulator</h1>
        <p className="mt-2 text-sm text-slate-600">
          This page acts as the parent Shopify store. It opens the office selector with
          <code className="mx-1 rounded bg-slate-200 px-1">cartCheckout.mode=native</code>
          and shows exactly what would be POSTed / redirected — without touching other stores.
        </p>

        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
          <label className="block text-sm font-medium">Test store domain</label>
          <input
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            value={storeUrl}
            onChange={(e) => setStoreUrl(e.target.value)}
            placeholder="testing-client-check.myshopify.com"
          />

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openSimulator}
              className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              1. Open office selector (simulate Continue flow)
            </button>
            <button
              type="button"
              onClick={() => copyText(officeSelectorUrl, 'office-selector URL')}
              className="rounded border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50"
            >
              Copy iframe URL
            </button>
            <a
              href={officeSelectorUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50"
            >
              Open iframe URL in new tab
            </a>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold">Would POST to /cart/update.js</h2>
            <pre className="mt-2 max-h-72 overflow-auto rounded bg-slate-100 p-3 text-xs">
              {lastPostBody || 'Complete the form and click Continue to capture the payload.'}
            </pre>
            {lastPostBody ? (
              <button
                type="button"
                className="mt-2 text-sm text-emerald-700 underline"
                onClick={() => copyText(lastPostBody, 'POST body')}
              >
                Copy POST body
              </button>
            ) : null}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold">Would redirect to</h2>
            <pre className="mt-2 max-h-40 overflow-auto rounded bg-slate-100 p-3 text-xs break-all whitespace-pre-wrap">
              {checkoutUrl || 'Waiting for Continue…'}
            </pre>
            {checkoutUrl ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700"
                  onClick={() => copyText(checkoutUrl, 'checkout URL')}
                >
                  Copy checkout URL
                </button>
                <a
                  href={checkoutUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-sm text-indigo-800 hover:bg-indigo-100"
                >
                  2. Open on store (needs items in cart + password)
                </a>
              </div>
            ) : null}

            {lastDelivery ? (
              <p className="mt-3 text-xs text-slate-500">
                Courier: {lastDelivery.courier || '—'} · Type: {lastDelivery.deliveryType || '—'} · City:{' '}
                {lastDelivery.city || '—'} · Office: {lastDelivery.officeName || '—'}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-semibold">How to get a real /checkouts/cn/… URL</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Run this simulator and click Continue (step 1) — confirms app logic locally.</li>
            <li>
              In another tab, open your test store, enter password, add a product to cart.
            </li>
            <li>
              Click “Open on store” (step 2) in the same browser — Shopify redirects to{' '}
              <code>/checkouts/cn/...</code>.
            </li>
            <li>
              Or paste the copied POST body into Postman against{' '}
              <code>https://{storeUrl}/cart/update.js</code> with your cart cookie, then GET{' '}
              <code>/checkout</code> with redirects off.
            </li>
          </ol>
        </div>

        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold">Event log</h2>
          <ul className="mt-2 max-h-56 space-y-1 overflow-auto font-mono text-xs text-slate-700">
            {logs.length === 0 ? (
              <li className="text-slate-400">No events yet.</li>
            ) : (
              logs.map((line) => <li key={line}>{line}</li>)
            )}
          </ul>
        </div>
      </div>

      {iframeOpen ? (
        <>
          <div className="fixed inset-0 z-[9998] bg-black/40" />
          <iframe
            id="native-test-iframe"
            title="Office selector native test"
            src={officeSelectorUrl}
            className="fixed left-1/2 top-1/2 z-[9999] h-[90vh] w-[95vw] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white shadow-xl"
          />
        </>
      ) : null}
    </div>
  );
}
