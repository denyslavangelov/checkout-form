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

  // Search cities function
  const searchCities = useCallback(async (term: string) => {
    if (!term || term.length < 1) {
      setCities([]);
      return;
    }
    
    setLoadingCities(true);
    try {
      const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? `http://${window.location.hostname}:3001`
        : 'https://checkout-form-zeta.vercel.app';
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
      const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? `http://${window.location.hostname}:3001`
        : 'https://checkout-form-zeta.vercel.app';
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

      const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? `http://${window.location.hostname}:3001`
        : 'https://checkout-form-zeta.vercel.app';

      // Check if this is a cart checkout
      if (productId === 'cart' && variantId === 'cart') {
        // For cart checkout, redirect to regular checkout with office address
        console.log('🏢 Cart checkout - redirecting to regular checkout');
        
        // Store office address in localStorage for the checkout form to use
        const officeAddress = {
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
        };
        
        localStorage.setItem('selectedOfficeAddress', JSON.stringify(officeAddress));
        
        // For cart checkout, notify the parent with a special checkout URL
        console.log('🏢 Cart checkout - office address stored, notifying parent');
        onOrderCreated('/checkout');
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 relative">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          {productId === 'cart' ? 'Изберете офис за доставка' : 'Офис на Спиди'}
        </h3>

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
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                  {loadingCities ? (
                    <div className="p-3 text-center text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1" />
                      Зареждане...
                    </div>
                  ) : cities.length > 0 ? (
                    cities.map((city) => (
                      <button
                        key={city.id}
                        onClick={() => handleCitySelect(city)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                      >
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{city.label}</span>
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
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                  {loadingOffices ? (
                    <div className="p-3 text-center text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1" />
                      Зареждане...
                    </div>
                  ) : offices.length > 0 ? (
                    offices.map((office) => (
                      <button
                        key={office.id}
                        onClick={() => handleOfficeSelect(office)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                      >
                        <div className="w-4 h-4 bg-red-600 text-white text-xs font-bold rounded flex items-center justify-center">
                          S
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{office.name}</div>
                          <div className="text-xs text-gray-500 truncate">
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
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
              <div className="text-sm font-medium text-gray-700 mb-1">Избран офис:</div>
              <div className="text-sm text-gray-600">
                <div className="font-medium">{selectedOffice.name}</div>
                <div className="text-gray-500">
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
            className="w-full bg-red-600 hover:bg-red-700 text-white"
          >
            {creatingOrder ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Създаване на поръчка...
              </>
            ) : (
              productId === 'cart' ? 'Продължи към плащане' : 'Създай поръчка и продължи към плащане'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
