'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, MapPin, Building2, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { debounce } from '@/lib/utils';

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
}

export function OfficeSelectorModal({ 
  isOpen, 
  onClose, 
  onOrderCreated, 
  productId, 
  variantId 
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
  const [showOfficeDropdown, setShowOfficeDropdown] = useState(false);

  // Function to get cart data from parent window
  const getCartDataFromParent = async () => {
    return new Promise((resolve) => {
      console.log('🏢 Requesting fresh cart data from parent...');
      
      // Request fresh cart data from parent
      if (window.parent) {
        window.parent.postMessage({ type: 'request-fresh-cart-data' }, '*');
        console.log('🏢 Fresh cart data request sent to parent');
        
        // Listen for response
        const messageHandler = (event: MessageEvent) => {
          console.log('🏢 Received message in iframe:', event.data);
          
          if (event.data?.type === 'cart-data') {
            console.log('🏢 Fresh cart data received:', event.data.cart);
            window.removeEventListener('message', messageHandler);
            resolve(event.data.cart);
          }
        };
        
        window.addEventListener('message', messageHandler);
        
        // Timeout after 5 seconds (longer for fresh fetch)
        setTimeout(() => {
          console.error('🏢 Fresh cart data request timed out after 5 seconds');
          window.removeEventListener('message', messageHandler);
          resolve(null);
        }, 5000);
      } else {
        console.log('🏢 No parent window found');
        resolve(null);
      }
    });
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
    if (!selectedOffice || !selectedCity) {
      setError('Моля, изберете град и офис');
      return;
    }

    try {
      setCreatingOrder(true);
      setError('');

      const baseUrl = 'https://checkout-form-zeta.vercel.app';

      // Check if this is a cart checkout
      if (productId === 'cart' && variantId === 'cart') {
        // For cart checkout, we need to create a draft order with the cart items
        console.log('🏢 Cart checkout - creating draft order with cart items');
        
        // Get cart data from the parent window
        console.log('🏢 Starting cart data fetch...');
        const cartData = await getCartDataFromParent() as any;
        console.log('🏢 Raw cart data received:', cartData);
        
        if (!cartData) {
          console.error('🏢 No cart data received from parent');
          setError('Не можахме да получим данните за кошницата. Моля, опитайте отново.');
          return;
        }
        
        if (!cartData.items && !cartData.line_items && !cartData.products) {
          console.error('🏢 Cart data received but no items found:', cartData);
          setError('Кошницата е празна. Моля, добавете продукти преди да продължите.');
          return;
        }
        
        // Check for different possible cart data structures
        const items = cartData.items || cartData.line_items || cartData.products || [];
        console.log('🏢 Cart items found:', items);
        
        if (!items || items.length === 0) {
          setError('Кошницата е празна. Моля, добавете продукти преди да продължите.');
          return;
        }
        
        console.log('🏢 Cart data processed successfully:', { items, count: items.length });
        
        // Create draft order with cart items and office address
        const response = await fetch(`${baseUrl}/api/create-draft-order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cartData: { ...cartData, items: items },
            shippingAddress: {
              address1: (() => {
                if (typeof selectedOffice.address === 'string') {
                  return selectedOffice.address;
                } else if (selectedOffice.fullAddressString) {
                  return selectedOffice.fullAddressString;
                } else if (selectedOffice.address && typeof selectedOffice.address === 'object') {
                  return selectedOffice.address.fullAddressString || selectedOffice.address.address || JSON.stringify(selectedOffice.address);
                }
                return 'Address not available';
              })(),
              city: selectedCity.name,
              country: 'Bulgaria',
              postalCode: selectedCity.postCode || ''
            }
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create draft order');
        }

        const data = await response.json();
        console.log('🏢 Draft order created for cart:', data);
        
        if (data.checkoutUrl) {
          onOrderCreated(data.checkoutUrl);
        } else if (data.invoiceUrl) {
          onOrderCreated(data.invoiceUrl);
        } else {
          throw new Error('No checkout URL received');
        }
        return;
      }

      // For Buy Now buttons, create draft order
      const response = await fetch(`${baseUrl}/api/create-draft-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          variantId,
          shippingAddress: {
            address1: (() => {
              if (typeof selectedOffice.address === 'string') {
                return selectedOffice.address;
              } else if (selectedOffice.fullAddressString) {
                return selectedOffice.fullAddressString;
              } else if (selectedOffice.address && typeof selectedOffice.address === 'object') {
                return selectedOffice.address.fullAddressString || selectedOffice.address.address || JSON.stringify(selectedOffice.address);
              }
              return 'Address not available';
            })(),
            city: selectedCity.name,
            country: 'Bulgaria',
            postalCode: selectedCity.postCode || ''
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create order');
      }

      const data = await response.json();
      
      if (data.checkoutUrl) {
        onOrderCreated(data.checkoutUrl);
      } else if (data.invoiceUrl) {
        onOrderCreated(data.invoiceUrl);
      } else {
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

  return (
    <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full mx-2 sm:mx-4 relative shadow-lg border border-gray-200">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-500 hover:text-gray-700 z-10"
        >
          <X className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>

        {/* Header with Speedy Logo */}
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 307 287" className="w-full h-full">
              <g transform="translate(0,287) scale(0.1,-0.1)" fill="#f02a2a">
                <path d="M1370 2557 c-52 -29 -267 -147 -477 -261 -211 -114 -383 -211 -383 -214 0 -4 100 -65 223 -136 122 -71 285 -166 362 -212 77 -45 212 -123 300 -173 88 -51 168 -101 178 -113 16 -19 17 -56 17 -475 0 -293 -4 -461 -10 -474 -6 -10 -29 -28 -51 -39 l-40 -21 -44 22 c-25 13 -46 23 -47 23 -1 1 -5 192 -8 426 l-5 424 -85 52 c-139 83 -829 484 -845 490 -13 5 -15 -60 -15 -536 0 -344 4 -548 10 -560 9 -17 71 -55 500 -308 80 -47 188 -111 240 -142 200 -119 277 -160 300 -160 13 0 88 38 165 83 77 46 219 130 315 187 565 333 541 318 557 350 10 19 13 151 13 559 0 494 -1 533 -17 527 -17 -7 -97 -53 -378 -216 -277 -162 -259 -154 -297 -134 -58 29 -68 43 -68 94 0 32 5 52 16 61 17 15 172 106 486 286 103 60 187 110 188 113 0 3 -33 23 -72 45 -40 21 -89 47 -108 58 -19 11 -107 59 -195 107 -88 48 -234 127 -325 177 -215 118 -266 143 -287 143 -10 0 -61 -24 -113 -53z"/>
              </g>
            </svg>
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">
            {productId === 'cart' ? 'Изберете офис за доставка' : 'Офис на Спиди'}
          </h3>
        </div>

        <div className="space-y-4">
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
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-20 max-h-48 overflow-y-auto">
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

          {/* Office Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Изберете офис<span className="text-red-500 ml-1">*</span>
            </Label>
            <div className="relative office-dropdown">
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-red-600 font-bold text-xs z-10">
                  S
                </div>
                <Input
                  type="text"
                  placeholder="Изберете Офис на Спиди"
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
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-20 max-h-48 overflow-y-auto">
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

          {/* Create Order Button */}
          <Button
            onClick={handleCreateOrder}
            disabled={!selectedOffice || creatingOrder}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 sm:py-4 text-sm sm:text-base font-medium"
          >
            {creatingOrder ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span className="text-sm sm:text-base">Създаване на поръчка...</span>
              </>
            ) : (
              <span className="text-sm sm:text-base">
                {productId === 'cart' ? 'Продължи към завършване на поръчката' : 'Продължи към завършване на поръчката'}
              </span>
            )}
          </Button>
        </div>
      </div>
  );
}
