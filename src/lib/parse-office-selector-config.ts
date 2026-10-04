export type OfficeSelectorParsedConfig = {
  availableCouriers: string[];
  defaultCourier: string;
  defaultDeliveryType: string;
  showPrices: boolean;
  freeShipping?: { enabled: boolean; threshold: number };
  continueButton: {
    text: string;
    backgroundColor: string;
    hoverColor: string;
  };
  font: {
    family: string;
    weight: string;
  };
  shopify: {
    storeUrl: string;
    accessToken: string;
  };
  cartCheckout: {
    mode: 'draft-order' | 'native';
  };
};

const DEFAULTS: OfficeSelectorParsedConfig = {
  availableCouriers: ['speedy', 'econt'],
  defaultCourier: 'speedy',
  defaultDeliveryType: 'office',
  showPrices: true,
  freeShipping: undefined,
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
    mode: 'draft-order'
  }
};

/** URLSearchParams already decodes once — only fall back to decodeURIComponent if needed. */
export function parseConfigQueryValue(configParam: string): Record<string, unknown> | null {
  try {
    return JSON.parse(configParam);
  } catch {
    try {
      return JSON.parse(decodeURIComponent(configParam));
    } catch (error) {
      console.error('Failed to parse office selector config', error);
      return null;
    }
  }
}

export function normalizeOfficeSelectorConfig(
  parsed: Record<string, unknown> | null | undefined,
  fallbackStoreUrl = '',
  fallbackAccessToken = ''
): OfficeSelectorParsedConfig {
  const shopify = (parsed?.shopify as Record<string, string> | undefined) || {};
  const continueButton = (parsed?.continueButton as Record<string, string> | undefined) || {};
  const font = (parsed?.font as Record<string, string> | undefined) || {};
  const cartCheckout = (parsed?.cartCheckout as Record<string, string> | undefined) || {};

  return {
    availableCouriers: Array.isArray(parsed?.availableCouriers)
      ? (parsed!.availableCouriers as string[])
      : DEFAULTS.availableCouriers,
    defaultCourier: (parsed?.defaultCourier as string) || DEFAULTS.defaultCourier,
    defaultDeliveryType: (parsed?.defaultDeliveryType as string) || DEFAULTS.defaultDeliveryType,
    showPrices:
      parsed?.showPrices !== undefined ? Boolean(parsed.showPrices) : DEFAULTS.showPrices,
    freeShipping: parsed?.freeShipping as OfficeSelectorParsedConfig['freeShipping'],
    continueButton: {
      text: continueButton.text || DEFAULTS.continueButton.text,
      backgroundColor: continueButton.backgroundColor || DEFAULTS.continueButton.backgroundColor,
      hoverColor: continueButton.hoverColor || DEFAULTS.continueButton.hoverColor
    },
    font: {
      family: font.family || DEFAULTS.font.family,
      weight: font.weight || DEFAULTS.font.weight
    },
    shopify: {
      storeUrl: shopify.storeUrl || fallbackStoreUrl || '',
      accessToken: shopify.accessToken || fallbackAccessToken || ''
    },
    cartCheckout: {
      mode: cartCheckout.mode === 'native' ? 'native' : 'draft-order'
    }
  };
}

export function readOfficeSelectorConfigFromSearch(
  search: string
): OfficeSelectorParsedConfig | null {
  const urlParams = new URLSearchParams(search);
  const configParam = urlParams.get('config');
  if (!configParam && !urlParams.get('storeUrl') && !urlParams.get('accessToken')) {
    return null;
  }

  const parsed = configParam ? parseConfigQueryValue(configParam) : {};
  return normalizeOfficeSelectorConfig(
    parsed,
    urlParams.get('storeUrl') || '',
    urlParams.get('accessToken') || ''
  );
}
