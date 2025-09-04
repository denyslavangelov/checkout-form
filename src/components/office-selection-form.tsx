'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Combobox } from './ui/combobox';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Loader2, MapPin, Building2 } from 'lucide-react';

interface City {
  id: string;
  name: string;
}

interface Office {
  id: string;
  name: string;
  address: string;
  city: string;
  phone?: string;
}

interface OfficeSelectionFormProps {
  productId: string;
  variantId: string;
  onOrderCreated?: (checkoutUrl: string) => void;
}

export function OfficeSelectionForm({ 
  productId, 
  variantId, 
  onOrderCreated 
}: OfficeSelectionFormProps) {
  const [cities, setCities] = useState<City[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedOffice, setSelectedOffice] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [error, setError] = useState<string>('');

  // Load cities on component mount
  useEffect(() => {
    loadCities();
  }, []);

  // Load offices when city is selected
  useEffect(() => {
    if (selectedCity) {
      loadOffices(selectedCity);
      setSelectedOffice(''); // Reset office selection
    } else {
      setOffices([]);
      setSelectedOffice('');
    }
  }, [selectedCity]);

  const loadCities = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch('/api/speedy/search-district', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          countryId: 100, // Bulgaria country ID for Speedy
          name: '' // Get all districts/cities
        })
      });

      if (!response.ok) {
        throw new Error('Failed to load cities');
      }

      const data = await response.json();
      
      if (data.districts && Array.isArray(data.districts)) {
        const cityList = data.districts.map((district: any) => ({
          id: district.id.toString(),
          name: district.name
        }));
        setCities(cityList);
      } else {
        throw new Error('Invalid cities data format');
      }
    } catch (err) {
      console.error('Error loading cities:', err);
      setError('Failed to load cities. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadOffices = async (cityId: string) => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch('/api/speedy/search-office', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          siteId: cityId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to load offices');
      }

      const data = await response.json();
      
      if (data.offices && Array.isArray(data.offices)) {
        const officeList = data.offices.map((office: any) => ({
          id: office.id.toString(),
          name: office.name,
          address: office.address || office.fullAddress || 'Address not available',
          city: office.city || 'City not available',
          phone: office.phone
        }));
        setOffices(officeList);
      } else {
        throw new Error('Invalid offices data format');
      }
    } catch (err) {
      console.error('Error loading offices:', err);
      setError('Failed to load offices. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!selectedOffice) {
      setError('Please select an office');
      return;
    }

    const office = offices.find(o => o.id === selectedOffice);
    if (!office) {
      setError('Selected office not found');
      return;
    }

    try {
      setCreatingOrder(true);
      setError('');

      // Create draft order with office address
      const response = await fetch('/api/create-draft-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          variantId,
          shippingAddress: {
            address1: office.address,
            city: office.city,
            country: 'Bulgaria'
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create order');
      }

      const data = await response.json();
      
      if (data.checkoutUrl) {
        // Redirect to checkout
        window.location.href = data.checkoutUrl;
      } else if (data.invoiceUrl) {
        // Use invoice URL as checkout URL
        window.location.href = data.invoiceUrl;
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

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Select Pickup Office
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">City</label>
          <Combobox
            options={cities.map(city => ({ value: city.id, label: city.name }))}
            value={selectedCity}
            onChange={setSelectedCity}
            placeholder="Select city..."
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Office</label>
          <Combobox
            options={offices.map(office => ({ 
              value: office.id, 
              label: `${office.name} - ${office.address}` 
            }))}
            value={selectedOffice}
            onChange={setSelectedOffice}
            placeholder={selectedCity ? "Select office..." : "Select city first"}
            disabled={!selectedCity || loading}
          />
        </div>

        {selectedOffice && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-start gap-2">
              <Building2 className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900">
                  {offices.find(o => o.id === selectedOffice)?.name}
                </p>
                <p className="text-blue-700">
                  {offices.find(o => o.id === selectedOffice)?.address}
                </p>
                <p className="text-blue-600">
                  {offices.find(o => o.id === selectedOffice)?.city}, Bulgaria
                </p>
              </div>
            </div>
          </div>
        )}

        <Button 
          onClick={handleCreateOrder}
          disabled={!selectedOffice || creatingOrder}
          className="w-full"
        >
          {creatingOrder ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Order...
            </>
          ) : (
            'Create Order & Checkout'
          )}
        </Button>

        <p className="text-xs text-gray-500 text-center">
          You will be redirected to Shopify checkout with the office address pre-filled
        </p>
      </CardContent>
    </Card>
  );
}
