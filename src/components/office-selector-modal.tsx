'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, MapPin, Building2, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { debounce } from '@/lib/utils';
import { createPortal } from 'react-dom';

interface City {
  id: string;
  name: string;
  postCode?: string;
  value: string;
  label: string;
}

interface Office {
  id: string;
  name: string;
  address: any;
  fullAddressString?: string;
}

interface OfficeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: (checkoutUrl: string) => void;
  productId: string;
  variantId: string;
  quantity?: string;
  config?: {
    availableCouriers: string[];
    defaultCourier: string;
    defaultDeliveryType: string;
    shopify?: {
      storeUrl: string;
      accessToken: string;
    };
  };
}

export function OfficeSelectorModal({ 
  isOpen, 
  onClose, 
  onOrderCreated, 
  productId, 
  variantId,
  quantity = '1',
  config = {
    availableCouriers: ['speedy', 'econt'],
    defaultCourier: 'speedy',
    defaultDeliveryType: 'office',
    shopify: {
      storeUrl: '',
      accessToken: ''
    }
  }
}: OfficeSelectorModalProps) {
  const [cities, setCities] = useState<City[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [selectedOffice, setSelectedOffice] = useState<Office | null>(null);
  const [citySearch, setCitySearch] = useState('');
  const [officeSearch, setOfficeSearch] = useState('');
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingOffices, setLoadingOffices] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [error, setError] = useState('');
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  
  
  // Courier selection states
  const [selectedCourier, setSelectedCourier] = useState<'speedy' | 'econt'>(() => {
    const defaultCourier = config.defaultCourier;   
    
    // Validate that the default courier is available
    if (config.availableCouriers.includes(defaultCourier)) {
      return defaultCourier as 'speedy' | 'econt';
    } else {
      return 'speedy';
    }
  });
  const [deliveryType, setDeliveryType] = useState<'office' | 'address'>(config.defaultDeliveryType as 'office' | 'address');
  const [showOfficeDropdown, setShowOfficeDropdown] = useState(false);
  const [addressInput, setAddressInput] = useState('');
  
  // Shipping methods state
  const [availableShippingMethods, setAvailableShippingMethods] = useState<any[]>([]);
  const [loadingShippingMethods, setLoadingShippingMethods] = useState(false);
  const [selectedShippingMethodId, setSelectedShippingMethodId] = useState<string | null>(null);
  
  // Browser detection
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isChrome = /Chrome/i.test(navigator.userAgent);
  const isChromeMobile = isMobile && isChrome;
  
  // Ref for the continue button to enable scrolling
  const continueButtonRef = useRef<HTMLButtonElement>(null);
  
  // Scroll to continue button when it becomes active (address or office selected)
  useEffect(() => {
    if (isOpen && continueButtonRef.current) {
      // Check if the button is enabled (address/office selected)
      const isButtonEnabled = !creatingOrder && 
        ((deliveryType === 'office' && selectedOffice) || 
         (deliveryType === 'address' && addressInput.trim()));
      
      if (isButtonEnabled) {
        // Small delay to ensure modal is fully rendered
        const timer = setTimeout(() => {
          continueButtonRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'end',
            inline: 'nearest'
          });
        }, 100);
        
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, deliveryType, selectedOffice, addressInput, creatingOrder]);
  
  // Fetch shipping methods from Shopify
  const fetchShippingMethods = useCallback(async () => {
    try {
      setLoadingShippingMethods(true);

      const baseUrl = 'https://checkout-form-zeta.vercel.app';

      // Get Shopify credentials (support both nested and root level)
      let storeUrl = config.shopify?.storeUrl;
      let accessToken = config.shopify?.accessToken || (config as any).accessToken;
      
      // If credentials are not in config, try to get them from URL parameters
      if (!storeUrl || !accessToken) {
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          storeUrl = storeUrl || urlParams.get('storeUrl') || '';
          accessToken = accessToken || urlParams.get('accessToken') || '';
        }
      }
      
      // No fallback credentials - require proper configuration
      
      // Debug logging for credentials
      console.log('🔑 Shopify credentials check:', {
        hasConfigShopify: !!config.shopify,
        configStoreUrl: config.shopify?.storeUrl,
        configAccessToken: config.shopify?.accessToken ? '***' + config.shopify.accessToken.slice(-4) : 'none',
        finalStoreUrl: storeUrl,
        finalAccessToken: accessToken ? '***' + accessToken.slice(-4) : 'none',
        hasStoreUrl: !!storeUrl,
        hasAccessToken: !!accessToken,
        fullConfig: config
      });
      
      // Validate Shopify credentials
      if (!storeUrl || !accessToken) {
        const errorMsg = `Shopify credentials are missing. Please provide them via:
        
1. URL parameters: ?storeUrl=your-store.myshopify.com&accessToken=shpat_...
2. Config parameter: ?config={"shopify":{"storeUrl":"...","accessToken":"..."}}
3. Config object when calling the component

Current config: ${JSON.stringify(config, null, 2)}`;
        console.error('❌', errorMsg);
        throw new Error('Shopify credentials are missing. Please configure storeUrl and accessToken.');
      }

      // Build URL with Shopify credentials
      const params = new URLSearchParams({
        storeUrl: storeUrl,
        accessToken: accessToken
      });

      const apiUrl = `${baseUrl}/api/shopify/shipping-methods?${params.toString()}`;
      
      const response = await fetch(apiUrl);

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (data.success && data.shippingMethods) {
        setAvailableShippingMethods(data.shippingMethods);
      } else if (data.error) {
        setAvailableShippingMethods([]);
      }
    } catch (error) {
      setAvailableShippingMethods([]);
      
      // Alert when fetch fails with an exception
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to fetch shipping methods:', errorMessage);
    } finally {
      setLoadingShippingMethods(false);
    }
  }, [config]);

  // Load shipping methods when component mounts or config changes
  useEffect(() => {
    if (isOpen && config.shopify?.storeUrl && config.shopify?.accessToken) {
      console.log('🏢 Config is ready, fetching shipping methods');
      fetchShippingMethods();
    }
  }, [isOpen, config.shopify?.storeUrl, config.shopify?.accessToken, fetchShippingMethods]);

  // Update courier selection when config changes
  useEffect(() => {
    
    if (config.availableCouriers.includes(config.defaultCourier)) {
      setSelectedCourier(config.defaultCourier as 'speedy' | 'econt');
    }
  }, [config.defaultCourier, config.availableCouriers]);

  // Reset office selection when courier or delivery type changes
  useEffect(() => {
    setSelectedOffice(null);
    setOfficeSearch('');
    setOffices([]);
    setShowOfficeDropdown(false);
    setAddressInput('');
  }, [selectedCourier, deliveryType]);

  // Helper function to get price for a specific courier and delivery type combination
  const getShippingPrice = (courier: 'speedy' | 'econt', deliveryType: 'office' | 'address') => {
    // If only one courier is available, assume non-office methods belong to that courier
    const isSingleCourier = config.availableCouriers.length === 1;
    const availableCourier = config.availableCouriers[0] as 'speedy' | 'econt';
    
    const method = availableShippingMethods.find(m => {
      const title = m.title.toLowerCase();
      const code = m.code?.toLowerCase() || '';
      
      // Check for courier match
      let courierMatch = false;
      
      if (isSingleCourier) {
        // For single courier, check if method matches the available courier
        courierMatch = (availableCourier === 'speedy' && (
          title.includes('speedy') || 
          code.includes('speedy') ||
          title.includes('спиди') ||
          code.includes('спиди')
        )) || (availableCourier === 'econt' && (
          title.includes('econt') || 
          code.includes('econt') ||
          title.includes('еконт') ||
          code.includes('еконт')
        ));
        
        // For single courier and address delivery, also match non-office methods that don't specify courier
        if (!courierMatch && deliveryType === 'address' && !title.includes('офис') && !title.includes('office')) {
          courierMatch = true;
        }
      } else {
        // For multiple couriers, use exact matching
        courierMatch = (courier === 'speedy' && (
          title.includes('speedy') || 
          code.includes('speedy') ||
          title.includes('спиди') ||
          code.includes('спиди')
        )) || (courier === 'econt' && (
          title.includes('econt') || 
          code.includes('econt') ||
          title.includes('еконт') ||
          code.includes('еконт')
        ));
      }
      
      // Check for delivery type match
      const deliveryMatch = (deliveryType === 'office' && (title.includes('офис') || title.includes('office'))) ||
                          (deliveryType === 'address' && !title.includes('офис') && !title.includes('office'));
      
      return courierMatch && deliveryMatch;
    });
    
    if (method && method.price && method.price !== '0.00') {
      return `${method.price} ${method.currency || 'BGN'}`;
    }
    return null;
  };

  // Auto-select shipping method based on courier and delivery type
  useEffect(() => {
    if (availableShippingMethods.length > 0) {
      
      debugger;
      
      // Try to find a matching shipping method
      const matchingMethod = availableShippingMethods.find(method => {
        const title = method.title.toLowerCase();
        const code = method.code?.toLowerCase() || '';
        
        // Check for courier match (both English and Bulgarian names)
        const courierMatch = (selectedCourier === 'speedy' && (
          title.includes('speedy') || 
          code.includes('speedy') ||
          title.includes('спиди') ||
          code.includes('спиди')
        )) || (selectedCourier === 'econt' && (
          title.includes('econt') || 
          code.includes('econt') ||
          title.includes('еконт') ||
          code.includes('еконт')
        ));
        
        // Check for delivery type match
        const deliveryMatch = (deliveryType === 'office' && (title.includes('офис') || title.includes('office'))) ||
                            (deliveryType === 'address' && !title.includes('офис') && !title.includes('office'));
        
        return courierMatch && deliveryMatch;
      });
      
      if (matchingMethod) {
        setSelectedShippingMethodId(matchingMethod.id);
      } else {
        // Fallback: select first method that matches the courier and delivery type
        const courierMethod = availableShippingMethods.find(method => {
          const title = method.title.toLowerCase();
          const code = method.code?.toLowerCase() || '';
          
          const courierMatch = (selectedCourier === 'speedy' && (
            title.includes('speedy') || 
            code.includes('speedy') ||
            title.includes('спиди') ||
            code.includes('спиди')
          )) || (selectedCourier === 'econt' && (
            title.includes('econt') || 
            code.includes('econt') ||
            title.includes('еконт') ||
            code.includes('еконт')
          ));
          
          // For address delivery, exclude methods with "офис" or "office"
          const deliveryMatch = (deliveryType === 'office' && (title.includes('офис') || title.includes('office'))) ||
                              (deliveryType === 'address' && !title.includes('офис') && !title.includes('office'));
          
          return courierMatch && deliveryMatch;
        });
        
        if (courierMethod) {
          setSelectedShippingMethodId(courierMethod.id);
        } else {
          // Last resort: select first available method that doesn't contain "офис" for address delivery
          if (deliveryType === 'address') {
            const nonOfficeMethod = availableShippingMethods.find(method => {
              const title = method.title.toLowerCase();
              return !title.includes('офис') && !title.includes('office');
            });
            if (nonOfficeMethod) {
              setSelectedShippingMethodId(nonOfficeMethod.id);
            } else if (availableShippingMethods.length > 0) {
              setSelectedShippingMethodId(availableShippingMethods[0].id);
            }
          } else {
            // For office delivery, select first available method
            if (availableShippingMethods.length > 0) {
              setSelectedShippingMethodId(availableShippingMethods[0].id);
            }
          }
        }
      }
    }
  }, [availableShippingMethods, selectedCourier, deliveryType]);

  // Test message to parent when component mounts
  useEffect(() => {
    if (isOpen && window.parent && window.parent !== window) {
      try {
        window.parent.postMessage({ type: 'iframe-ready' }, '*');
      } catch (error) {
        console.error('Error sending test message:', error);
      }
    }
  }, [isOpen]);


  // Function to get cart data from parent window with mobile retry
  const getCartDataFromParent = async () => {
    const maxRetries = isChromeMobile ? 1 : (isMobile ? 2 : 1); // Chrome mobile gets 1 retry, others get 2
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) { 
      
      const result = await new Promise((resolve) => {
        
        // Request fresh cart data from parent
        if (window.parent && window.parent !== window) {
          try {
            const message = { 
              type: 'request-fresh-cart-data',
              attempt: attempt,
              isChromeMobile: isChromeMobile
            };
            
            // Chrome mobile specific handling
            if (isChromeMobile) {
              // Try multiple ways to send message for Chrome mobile
              window.parent.postMessage(message, '*');
              // Also try with window.top for Chrome mobile
              if (window.top && window.top !== window) {
                window.top.postMessage(message, '*');
              }
            } else {
              window.parent.postMessage(message, '*');
            }
            
          } catch (error) {
            console.error('Error sending message to parent:', error);
            resolve(null);
            return;
          }
          
                  // Listen for response
        const messageHandler = (event: MessageEvent) => {       
          
          if (event.data?.type === 'cart-data') {
            window.removeEventListener('message', messageHandler);
            resolve(event.data.cart);
          } else {
          }
        };
          
          window.addEventListener('message', messageHandler);
          
          // Timeout - Chrome mobile needs longer timeout
          const timeoutDuration = isChromeMobile ? 12000 : (isMobile ? 8000 : 5000);
          
          setTimeout(() => {
            window.removeEventListener('message', messageHandler);
            resolve(null);
          }, timeoutDuration);
        } else {
          resolve(null);
        }
      });
      
      if (result) {
        return result;
      } else if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
      }
    }
    
    return null;
  };

  // Search cities function
  const searchCities = useCallback(async (term: string) => {
    if (!term || term.length < 1) {
      setCities([]);
      return;
    }
    
    setLoadingCities(true);
    try {
      const baseUrl = 'https://checkout-form-zeta.vercel.app';
      const response = await fetch(`${baseUrl}/api/speedy/search-site?term=${encodeURIComponent(term)}`);
      
      if (!response.ok) {
        throw new Error('Failed to search cities');
      }
      
      const data = await response.json();
      
      if (data.sites && data.sites.length > 0) {
        const cityOptions: City[] = data.sites.map((site: any) => ({
          id: site.id,
          name: site.name,
          postCode: site.postCode || site.postalCode,
          value: site.value,
          label: site.label
        }));
        setCities(cityOptions);
      } else {
        setCities([]);
      }
    } catch (error) {
      console.error('Error searching cities:', error);
      setCities([]);
    } finally {
      setLoadingCities(false);
    }
  }, []);

  // Search offices function
  const searchOffices = useCallback(async (cityId: string, term: string = '') => {
    if (!cityId) {
      setOffices([]);
      return;
    }

    setLoadingOffices(true);
    try {
      const baseUrl = 'https://checkout-form-zeta.vercel.app';
      const response = await fetch(`${baseUrl}/api/speedy/search-office`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          siteId: cityId,
          term: term
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to search offices');
      }
      
      const data = await response.json();
      
      if (data.offices && data.offices.length > 0) {
        setOffices(data.offices);
      } else {
        setOffices([]);
      }
    } catch (error) {
      console.error('Error searching offices:', error);
      setOffices([]);
    } finally {
      setLoadingOffices(false);
    }
  }, []);

  // Debounced search functions
  const debouncedSearchCities = useCallback(
    debounce((term: string) => {
      searchCities(term);
    }, 300),
    [searchCities]
  );

  const debouncedSearchOffices = useCallback(
    debounce((cityId: string, term: string) => {
      searchOffices(cityId, term);
    }, 300),
    [searchOffices]
  );

  // Handle city selection
  const handleCitySelect = (city: City) => {
    setSelectedCity(city);
    setCitySearch(city.label);
    setShowCityDropdown(false);
    setSelectedOffice(null);
    setOfficeSearch('');
    setOffices([]);
    
    // Load offices for selected city
    searchOffices(city.id);
  };

  // Handle office selection
  const handleOfficeSelect = (office: Office) => {
    setSelectedOffice(office);
    setOfficeSearch(office.name);
    setShowOfficeDropdown(false);
  };

  // Handle city search input
  const handleCitySearch = (value: string) => {
    setCitySearch(value);
    if (value.length >= 1) {
      setShowCityDropdown(true);
      debouncedSearchCities(value);
    } else {
      setShowCityDropdown(false);
      setCities([]);
    }
  };

  // Handle office search input
  const handleOfficeSearch = (value: string) => {
    setOfficeSearch(value);
    if (selectedCity && value.length >= 1) {
      setShowOfficeDropdown(true);
      debouncedSearchOffices(selectedCity.id, value);
    } else {
      setShowOfficeDropdown(false);
      setOffices([]);
    }
  };

  // Create order function
  const handleCreateOrder = async () => {
    // Validate based on delivery type
    if (deliveryType === 'office') {
      if (!selectedOffice || !selectedCity) {
        setError('Моля, изберете град и офис');
        return;
      }
    } else if (deliveryType === 'address') {
      if (!addressInput.trim() || !selectedCity) {
        setError('Моля, изберете град и въведете адрес за доставка');
        return;
      }
    }

    try {
      setCreatingOrder(true);
      setError('');

      const baseUrl = 'https://checkout-form-zeta.vercel.app';

      // Check if this is a cart checkout
      if (productId === 'cart' && variantId === 'cart') {
        // For cart checkout, we need to create a draft order with the cart items
        
        // Get cart data from the parent window
        let cartData = await getCartDataFromParent() as any;
        
        // Chrome mobile fallback - try to get cart data from localStorage
        if (!cartData && isChromeMobile) {
          try {
            const storedCartData = localStorage.getItem('shopify-cart-data');
            if (storedCartData) {
              cartData = JSON.parse(storedCartData);
            }
          } catch (error) {
            console.error('Chrome mobile: localStorage fallback failed:', error);
          }
        }
        
        // No other fallback needed - parent communication is the only way due to CORS
        if (!cartData) {
        }
        
        if (!cartData) {
          setError('Не можахме да получим данните за кошницата. Моля, опитайте отново или обновете страницата.');
          return;
        }
        
        if (!cartData.items && !cartData.line_items && !cartData.products) {
          setError('Кошницата е празна. Моля, добавете продукти преди да продължите.');
          return;
        }
        
        // Check for different possible cart data structures
        const items = cartData.items || cartData.line_items || cartData.products || [];
        
        if (!items || items.length === 0) {
          setError('Кошницата е празна. Моля, добавете продукти преди да продължите.');
          return;
        }
        
        // Validate Shopify credentials before creating draft order
        const storeUrl = config.shopify?.storeUrl || (config as any).storeUrl;
        const accessToken = config.shopify?.accessToken || (config as any).accessToken;
        
        if (!storeUrl || !accessToken) {
          setError('Shopify credentials are missing. Please configure storeUrl and accessToken in the config.');
          return;
        }

        // Create draft order with cart items and office address
        const response = await fetch(`${baseUrl}/api/create-draft-order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cartData: { ...cartData, items: items },
            shippingMethod: {
              courier: selectedCourier,
              deliveryType: deliveryType
            },
            selectedShippingMethodId: selectedShippingMethodId,
            selectedShippingMethod: availableShippingMethods.find(method => method.id === selectedShippingMethodId),
            shopify: { storeUrl, accessToken }, // Pass Shopify credentials
            shippingAddress: {
              address1: (() => {
                if (deliveryType === 'address') {
                  return addressInput.trim();
                } else if (deliveryType === 'office' && selectedOffice) {
                  if (typeof selectedOffice.address === 'string') {
                    return selectedOffice.address;
                  } else if (selectedOffice.fullAddressString) {
                    return selectedOffice.fullAddressString;
                  } else if (selectedOffice.address && typeof selectedOffice.address === 'object') {
                    return selectedOffice.address.fullAddressString || selectedOffice.address.address || JSON.stringify(selectedOffice.address);
                  }
                  return 'Address not available';
                }
                return 'Address not available';
              })(),
              city: selectedCity?.name || '',
              country: 'Bulgaria',
              postalCode: selectedCity?.postCode || ''
            }
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create draft order');
        }

        const data = await response.json();   
        
        // Debug logging to see what response we got
        console.log('Draft order creation response:', JSON.stringify(data, null, 2));
        
        // Handle nested response structure from draft order API
        const checkoutUrl = data.checkoutUrl || data.draftOrder?.checkoutUrl;
        const invoiceUrl = data.invoiceUrl || data.draftOrder?.invoiceUrl;
        
        console.log('🏢 Draft order response received:', {
          success: data.success,
          checkoutUrl: checkoutUrl,
          invoiceUrl: invoiceUrl,
          fullResponse: data
        });
        
        // Prioritize invoiceUrl as it's the customer-facing checkout URL
        if (invoiceUrl) {
          console.log('🏢 Using invoiceUrl for redirection:', invoiceUrl);
          onOrderCreated(invoiceUrl);
        } else if (checkoutUrl) {
          console.log('🏢 Using checkoutUrl for redirection:', checkoutUrl);
          onOrderCreated(checkoutUrl);
        } else {
          console.error('❌ No checkout URL or invoice URL in response:', data);
          throw new Error('No checkout URL received');
        }
        return;
      }

      // For Buy Now buttons, create draft order with product data
      
      // Validate Shopify credentials before creating draft order
      const storeUrl = config.shopify?.storeUrl || (config as any).storeUrl;
      const accessToken = config.shopify?.accessToken || (config as any).accessToken;
      
      if (!storeUrl || !accessToken) {
        setError('Shopify credentials are missing. Please configure storeUrl and accessToken in the config.');
        return;
      }

      // For Buy Now buttons, create draft order (no cart data needed)
      const response = await fetch(`${baseUrl}/api/create-draft-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          variantId,
          quantity: parseInt(quantity) || 1, // Use quantity from props
          shippingMethod: {
            courier: selectedCourier,
            deliveryType: deliveryType
          },
          selectedShippingMethodId: selectedShippingMethodId,
          selectedShippingMethod: availableShippingMethods.find(method => method.id === selectedShippingMethodId),
          shopify: { storeUrl, accessToken }, // Pass Shopify credentials
          shippingAddress: {
            address1: (() => {
              if (deliveryType === 'address') {
                return addressInput.trim();
              } else if (deliveryType === 'office' && selectedOffice) {
                if (typeof selectedOffice.address === 'string') {
                  return selectedOffice.address;
                } else if (selectedOffice.fullAddressString) {
                  return selectedOffice.fullAddressString;
                } else if (selectedOffice.address && typeof selectedOffice.address === 'object') {
                  return selectedOffice.address.fullAddressString || selectedOffice.address.address || JSON.stringify(selectedOffice.address);
                }
                return 'Address not available';
              }
              return 'Address not available';
            })(),
            city: selectedCity?.name || '',
            country: 'Bulgaria',
            postalCode: selectedCity?.postCode || ''
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create order');
      }

      const data = await response.json();
      
      // Handle nested response structure from draft order API
      const checkoutUrl = data.checkoutUrl || data.draftOrder?.checkoutUrl;
      const invoiceUrl = data.invoiceUrl || data.draftOrder?.invoiceUrl;
      
      console.log('🏢 Buy Now - Draft order response received:', {
        success: data.success,
        checkoutUrl: checkoutUrl,
        invoiceUrl: invoiceUrl,
        fullResponse: data
      });
      
      // Prioritize invoiceUrl as it's the customer-facing checkout URL
      if (invoiceUrl) {
        console.log('🏢 Buy Now - Using invoiceUrl for redirection:', invoiceUrl);
        onOrderCreated(invoiceUrl);
      } else if (checkoutUrl) {
        console.log('🏢 Buy Now - Using checkoutUrl for redirection:', checkoutUrl);
        onOrderCreated(checkoutUrl);
      } else {
        console.error('❌ Buy Now - No checkout URL or invoice URL in response:', data);
        throw new Error('No checkout URL received');
      }

    } catch (err) {
      console.error('Error creating order:', err);
      setError(err instanceof Error ? err.message : 'Failed to create order');
    } finally {
      setCreatingOrder(false);
    }
  };

  // Close modal and reset state
  const handleClose = () => {
    setSelectedCity(null);
    setSelectedOffice(null);
    setCitySearch('');
    setOfficeSearch('');
    setCities([]);
    setOffices([]);
    setError('');
    setShowCityDropdown(false);
    setShowOfficeDropdown(false);
    onClose();
  };

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.city-dropdown') && !target.closest('.office-dropdown')) {
        setShowCityDropdown(false);
        setShowOfficeDropdown(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  if (!isOpen) return null;


  if (typeof window === 'undefined') return null;
  
  return createPortal(
    <div className="fixed inset-0 bg-transparent flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div 
        className="office-selector-modal bg-transparent rounded-lg p-6 sm:p-8 max-w-md w-full relative shadow-lg border border-gray-200 min-h-fit my-8"
        style={{
          fontFamily: 'inherit',
          fontSize: 'inherit',
          fontWeight: 'inherit',
          lineHeight: 'inherit',
          letterSpacing: 'inherit',
          textTransform: 'inherit',
          fontStyle: 'inherit',
          textDecoration: 'inherit',
          fontVariant: 'inherit'
        }}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-500 hover:text-gray-700 z-10"
        >
          <X className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>

        {/* Header with Courier Selection */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
            Метод на доставка
          </h2>
          <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-4">
            Изберете куриер и начин на доставка
          </h3>
          
           {/* Courier Selection */}
           <div className="flex gap-1 sm:gap-2 mb-4 sm:mb-6">
             {config.availableCouriers.includes('speedy') && (
               <button
                 onClick={() => setSelectedCourier('speedy')}
                 className={`flex-1 flex flex-col items-center justify-center gap-1 p-2 sm:p-3 rounded-lg border-2 transition-colors ${
                   selectedCourier === 'speedy' 
                     ? 'border-red-500 bg-red-50' 
                     : 'border-gray-200 bg-white hover:border-gray-300'
                 }`}
               >
                 <div className="flex items-center gap-1 sm:gap-2">
                   <div className="w-4 h-4 sm:w-6 sm:h-6 flex items-center justify-center">
                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 307 287" className="w-full h-full">
                       <g transform="translate(0,287) scale(0.1,-0.1)" fill={selectedCourier === 'speedy' ? '#f02a2a' : '#6b7280'}>
                         <path d="M1370 2557 c-52 -29 -267 -147 -477 -261 -211 -114 -383 -211 -383 -214 0 -4 100 -65 223 -136 122 -71 285 -166 362 -212 77 -45 212 -123 300 -173 88 -51 168 -101 178 -113 16 -19 17 -56 17 -475 0 -293 -4 -461 -10 -474 -6 -10 -29 -28 -51 -39 l-40 -21 -44 22 c-25 13 -46 23 -47 23 -1 1 -5 192 -8 426 l-5 424 -85 52 c-139 83 -829 484 -845 490 -13 5 -15 -60 -15 -536 0 -344 4 -548 10 -560 9 -17 71 -55 500 -308 80 -47 188 -111 240 -142 200 -119 277 -160 300 -160 13 0 88 38 165 83 77 46 219 130 315 187 565 333 541 318 557 350 10 19 13 151 13 559 0 494 -1 533 -17 527 -17 -7 -97 -53 -378 -216 -277 -162 -259 -154 -297 -134 -58 29 -68 43 -68 94 0 32 5 52 16 61 17 15 172 106 486 286 103 60 187 110 188 113 0 3 -33 23 -72 45 -40 21 -89 47 -108 58 -19 11 -107 59 -195 107 -88 48 -234 127 -325 177 -215 118 -266 143 -287 143 -10 0 -61 -24 -113 -53z"/>
                       </g>
                     </svg>
                   </div>
                   <span className={`text-xs sm:text-sm font-medium ${selectedCourier === 'speedy' ? 'text-red-600' : 'text-gray-600'}`}>
                     Спиди
                   </span>
                 </div>
                 <div className="text-xs text-gray-500">
                   {getShippingPrice('speedy', deliveryType) || 'Цена при избор'}
                 </div>
               </button>
             )}
             
             {config.availableCouriers.includes('econt') && (
               <button
                 onClick={() => setSelectedCourier('econt')}
                 className={`flex-1 flex flex-col items-center justify-center gap-1 p-2 sm:p-3 rounded-lg border-2 transition-colors ${
                   selectedCourier === 'econt' 
                     ? 'border-blue-500 bg-blue-50' 
                     : 'border-gray-200 bg-white hover:border-gray-300'
                 }`}
               >
                 <div className="flex items-center gap-1 sm:gap-2">
                   <div className="w-4 h-4 sm:w-6 sm:h-6 flex items-center justify-center">
                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" className="w-full h-full">
                       <g transform="translate(0,500) scale(0.1,-0.1)" fill={selectedCourier === 'econt' ? '#2a4786' : '#6b7280'}>
                         <path d="M1668 4335 c-137 -37 -263 -127 -341 -242 -79 -114 -90 -162 -147 -608 -28 -220 -103 -789 -166 -1265 -63 -476 -119 -896 -124 -933 -19 -154 32 -300 140 -400 65 -61 134 -92 235 -108 35 -6 434 -9 975 -7 l915 3 66 22 c215 74 379 290 379 503 0 183 -102 331 -275 396 -47 17 -93 19 -707 22 -646 3 -658 3 -658 23 0 11 29 236 65 502 35 265 83 626 105 802 22 176 42 330 45 343 l5 22 648 0 c714 0 707 -1 826 63 125 67 233 198 272 332 25 86 23 214 -6 288 -43 113 -133 199 -247 236 -63 21 -75 21 -1011 20 -742 -1 -957 -4 -994 -14z"/>
                         <path d="M2773 3105 c-245 -66 -413 -284 -413 -536 0 -142 33 -244 115 -354 171 -229 505 -282 750 -119 192 127 290 404 221 625 -60 193 -227 350 -414 388 -72 15 -196 13 -259 -4z"/>
                       </g>
                     </svg>
                   </div>
                   <span className={`text-xs sm:text-sm font-medium ${selectedCourier === 'econt' ? 'text-blue-600' : 'text-gray-600'}`}>
                     Еконт
                   </span>
                 </div>
                 <div className="text-xs text-gray-500">
                   {getShippingPrice('econt', deliveryType) || 'Цена при избор'}
                 </div>
               </button>
             )}
           </div>
          
          {/* Delivery Type Selection */}
          <div className="flex gap-1 sm:gap-2">
            <button
              onClick={() => setDeliveryType('office')}
              className={`flex-1 flex flex-col items-center justify-center gap-1 p-2 sm:p-3 rounded-lg border-2 transition-colors ${
                deliveryType === 'office' 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-1 sm:gap-2">
                <Building2 className={`w-4 h-4 sm:w-5 sm:h-5 ${deliveryType === 'office' ? 'text-green-600' : 'text-gray-500'}`} />
                <span className={`text-xs sm:text-sm font-medium ${deliveryType === 'office' ? 'text-green-600' : 'text-gray-600'}`}>
                  До Офис
                </span>
              </div>
              <div className="text-xs text-gray-500">
                {getShippingPrice(selectedCourier, 'office') || 'Цена при избор'}
              </div>
            </button>
            
            <button
              onClick={() => setDeliveryType('address')}
              className={`flex-1 flex flex-col items-center justify-center gap-1 p-2 sm:p-3 rounded-lg border-2 transition-colors ${
                deliveryType === 'address' 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-1 sm:gap-2">
                <MapPin className={`w-4 h-4 sm:w-5 sm:h-5 ${deliveryType === 'address' ? 'text-green-600' : 'text-gray-500'}`} />
                <span className={`text-xs sm:text-sm font-medium ${deliveryType === 'address' ? 'text-green-600' : 'text-gray-600'}`}>
                  До Адрес
                </span>
              </div>
              <div className="text-xs text-gray-500">
                {getShippingPrice(selectedCourier, 'address') || 'Цена при избор'}
              </div>
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* City Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Град<span className="text-red-500 ml-1">*</span>
            </Label>
            <div className="relative city-dropdown">
              <Input
                type="text"
                placeholder="Изберете населено място"
                value={citySearch}
                onChange={(e) => handleCitySearch(e.target.value)}
                className="pr-8"
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              
              {/* City Dropdown */}
              {showCityDropdown && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-20 max-h-64 overflow-y-auto">
                  {loadingCities ? (
                    <div className="p-3 text-center text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1" />
                      <span className="text-sm">Зареждане...</span>
                    </div>
                  ) : cities.length > 0 ? (
                    cities.map((city) => (
                      <button
                        key={city.id}
                        onClick={() => handleCitySelect(city)}
                        className="w-full px-3 py-2 sm:py-3 text-left hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100 last:border-b-0"
                      >
                        <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm sm:text-base truncate">{city.label}</span>
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-center text-gray-500 text-sm">
                      Няма намерени градове
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Office/Address Selection */}
          {deliveryType === 'office' ? (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Изберете офис<span className="text-red-500 ml-1">*</span>
              </Label>
              <div className="relative office-dropdown">
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10">
                    {selectedCourier === 'speedy' ? (
                      <div className="w-4 h-4 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 307 287" className="w-full h-full">
                          <g transform="translate(0,287) scale(0.1,-0.1)" fill="#f02a2a">
                            <path d="M1370 2557 c-52 -29 -267 -147 -477 -261 -211 -114 -383 -211 -383 -214 0 -4 100 -65 223 -136 122 -71 285 -166 362 -212 77 -45 212 -123 300 -173 88 -51 168 -101 178 -113 16 -19 17 -56 17 -475 0 -293 -4 -461 -10 -474 -6 -10 -29 -28 -51 -39 l-40 -21 -44 22 c-25 13 -46 23 -47 23 -1 1 -5 192 -8 426 l-5 424 -85 52 c-139 83 -829 484 -845 490 -13 5 -15 -60 -15 -536 0 -344 4 -548 10 -560 9 -17 71 -55 500 -308 80 -47 188 -111 240 -142 200 -119 277 -160 300 -160 13 0 88 38 165 83 77 46 219 130 315 187 565 333 541 318 557 350 10 19 13 151 13 559 0 494 -1 533 -17 527 -17 -7 -97 -53 -378 -216 -277 -162 -259 -154 -297 -134 -58 29 -68 43 -68 94 0 32 5 52 16 61 17 15 172 106 486 286 103 60 187 110 188 113 0 3 -33 23 -72 45 -40 21 -89 47 -108 58 -19 11 -107 59 -195 107 -88 48 -234 127 -325 177 -215 118 -266 143 -287 143 -10 0 -61 -24 -113 -53z"/>
                          </g>
                        </svg>
                      </div>
                    ) : (
                      <div className="w-4 h-4 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" className="w-full h-full">
                          <g transform="translate(0,500) scale(0.1,-0.1)" fill="#2a4786">
                            <path d="M1668 4335 c-137 -37 -263 -127 -341 -242 -79 -114 -90 -162 -147 -608 -28 -220 -103 -789 -166 -1265 -63 -476 -119 -896 -124 -933 -19 -154 32 -300 140 -400 65 -61 134 -92 235 -108 35 -6 434 -9 975 -7 l915 3 66 22 c215 74 379 290 379 503 0 183 -102 331 -275 396 -47 17 -93 19 -707 22 -646 3 -658 3 -658 23 0 11 29 236 65 502 35 265 83 626 105 802 22 176 42 330 45 343 l5 22 648 0 c714 0 707 -1 826 63 125 67 233 198 272 332 25 86 23 214 -6 288 -43 113 -133 199 -247 236 -63 21 -75 21 -1011 20 -742 -1 -957 -4 -994 -14z"/>
                            <path d="M2773 3105 c-245 -66 -413 -284 -413 -536 0 -142 33 -244 115 -354 171 -229 505 -282 750 -119 192 127 290 404 221 625 -60 193 -227 350 -414 388 -72 15 -196 13 -259 -4z"/>
                          </g>
                        </svg>
                      </div>
                    )}
                  </div>
                  <Input
                    type="text"
                    placeholder={`Изберете Офис на ${selectedCourier === 'speedy' ? 'Спиди' : 'Еконт'}`}
                    value={officeSearch}
                    onChange={(e) => handleOfficeSearch(e.target.value)}
                    disabled={!selectedCity}
                    className="pl-8 pr-8"
                  />
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              
              {/* Office Dropdown */}
              {showOfficeDropdown && selectedCity && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-20 max-h-64 overflow-y-auto">
                  {loadingOffices ? (
                    <div className="p-3 text-center text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1" />
                      <span className="text-sm">Зареждане...</span>
                    </div>
                  ) : offices.length > 0 ? (
                    offices.map((office) => (
                      <button
                        key={office.id}
                        onClick={() => handleOfficeSelect(office)}
                        className="w-full px-3 py-2 sm:py-3 text-left hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 307 287" className="w-full h-full">
                            <g transform="translate(0,287) scale(0.1,-0.1)" fill="#f02a2a">
                              <path d="M1370 2557 c-52 -29 -267 -147 -477 -261 -211 -114 -383 -211 -383 -214 0 -4 100 -65 223 -136 122 -71 285 -166 362 -212 77 -45 212 -123 300 -173 88 -51 168 -101 178 -113 16 -19 17 -56 17 -475 0 -293 -4 -461 -10 -474 -6 -10 -29 -28 -51 -39 l-40 -21 -44 22 c-25 13 -46 23 -47 23 -1 1 -5 192 -8 426 l-5 424 -85 52 c-139 83 -829 484 -845 490 -13 5 -15 -60 -15 -536 0 -344 4 -548 10 -560 9 -17 71 -55 500 -308 80 -47 188 -111 240 -142 200 -119 277 -160 300 -160 13 0 88 38 165 83 77 46 219 130 315 187 565 333 541 318 557 350 10 19 13 151 13 559 0 494 -1 533 -17 527 -17 -7 -97 -53 -378 -216 -277 -162 -259 -154 -297 -134 -58 29 -68 43 -68 94 0 32 5 52 16 61 17 15 172 106 486 286 103 60 187 110 188 113 0 3 -33 23 -72 45 -40 21 -89 47 -108 58 -19 11 -107 59 -195 107 -88 48 -234 127 -325 177 -215 118 -266 143 -287 143 -10 0 -61 -24 -113 -53z"/>
                            </g>
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm sm:text-base font-medium truncate">{office.name}</div>
                          <div className="text-xs sm:text-sm text-gray-500 truncate">
                            {(() => {
                              if (typeof office.address === 'string') {
                                return office.address;
                              } else if (office.fullAddressString) {
                                return office.fullAddressString;
                              } else if (office.address && typeof office.address === 'object') {
                                return office.address.fullAddressString || office.address.address || JSON.stringify(office.address);
                              }
                              return 'Address not available';
                            })()}
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-center text-gray-500 text-sm">
                      Няма намерени офиси
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Адрес за доставка<span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                type="text"
                placeholder="Въведете адрес за доставка"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                className="w-full"
              />
            </div>
          )}

          {/* Office Preview */}
          {selectedOffice && (
            <div className="p-3 sm:p-4 bg-gray-50 border border-gray-200 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 307 287" className="w-full h-full">
                    <g transform="translate(0,287) scale(0.1,-0.1)" fill="#f02a2a">
                      <path d="M1370 2557 c-52 -29 -267 -147 -477 -261 -211 -114 -383 -211 -383 -214 0 -4 100 -65 223 -136 122 -71 285 -166 362 -212 77 -45 212 -123 300 -173 88 -51 168 -101 178 -113 16 -19 17 -56 17 -475 0 -293 -4 -461 -10 -474 -6 -10 -29 -28 -51 -39 l-40 -21 -44 22 c-25 13 -46 23 -47 23 -1 1 -5 192 -8 426 l-5 424 -85 52 c-139 83 -829 484 -845 490 -13 5 -15 -60 -15 -536 0 -344 4 -548 10 -560 9 -17 71 -55 500 -308 80 -47 188 -111 240 -142 200 -119 277 -160 300 -160 13 0 88 38 165 83 77 46 219 130 315 187 565 333 541 318 557 350 10 19 13 151 13 559 0 494 -1 533 -17 527 -17 -7 -97 -53 -378 -216 -277 -162 -259 -154 -297 -134 -58 29 -68 43 -68 94 0 32 5 52 16 61 17 15 172 106 486 286 103 60 187 110 188 113 0 3 -33 23 -72 45 -40 21 -89 47 -108 58 -19 11 -107 59 -195 107 -88 48 -234 127 -325 177 -215 118 -266 143 -287 143 -10 0 -61 -24 -113 -53z"/>
                    </g>
                  </svg>
                </div>
                <div className="text-sm sm:text-base font-medium text-gray-700">Избран офис:</div>
              </div>
              <div className="text-sm sm:text-base text-gray-600">
                <div className="font-medium mb-1">{selectedOffice.name}</div>
                <div className="text-gray-500 text-xs sm:text-sm">
                  {(() => {
                    if (typeof selectedOffice.address === 'string') {
                      return selectedOffice.address;
                    } else if (selectedOffice.fullAddressString) {
                      return selectedOffice.fullAddressString;
                    } else if (selectedOffice.address && typeof selectedOffice.address === 'object') {
                      return selectedOffice.address.fullAddressString || selectedOffice.address.address || JSON.stringify(selectedOffice.address);
                    }
                    return 'Address not available';
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="text-sm text-red-600">{error}</div>
            </div>
          )}

          {/* Explanatory Text
          <div className="text-center text-sm text-gray-600 mb-6">
            <p>След като натиснете бутона по-долу, ще бъдете пренасочени към страницата за завършване на поръчката, където ще можете да попълните останалата информация.</p>
          </div> */}

          {/* Create Order Button */}
          <Button
            ref={continueButtonRef}
            onClick={handleCreateOrder}
            disabled={
              creatingOrder || 
              (deliveryType === 'office' && !selectedOffice) ||
              (deliveryType === 'address' && !addressInput.trim())
            }
            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 sm:py-4 text-sm sm:text-base font-medium"
          >
            {creatingOrder ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span className="text-sm sm:text-base">Зареждане...</span>
              </>
            ) : (
              <span className="text-sm sm:text-base">Продължи към завършване</span>
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
