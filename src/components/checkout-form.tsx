"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { X, Trash2, Home } from "lucide-react"
import { useState, useEffect, useCallback } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { ComboboxOption, Combobox } from "@/components/ui/combobox"
import { debounce } from "@/lib/utils"

const formSchema = z.object({
  firstName: z.string().min(2, {
    message: "Името трябва да бъде поне 2 символа.",
  }),
  lastName: z.string().min(2, {
    message: "Фамилията трябва да бъде поне 2 символа.",
  }),
  phone: z.string().min(10, {
    message: "Моля, въведете валиден телефонен номер.",
  }),
  address: z.string().min(5, {
    message: "Адресът трябва да бъде поне 5 символа.",
  }),
  city: z.string().min(2, {
    message: "Градът трябва да бъде поне 2 символа.",
  }),
  postalCode: z.string().min(4, {
    message: "Моля, въведете валиден пощенски код.",
  }),
  shippingMethod: z.string().default("speedy"),
  officeAddress: z.string().optional(),
  officeCity: z.string().optional(),
  officePostalCode: z.string().optional(),
  note: z.string().optional(),
})

// Shipping costs in cents (matching the cart data format)
const SHIPPING_COSTS = {
  speedy: 599,
  econt: 699,
  address: 899
};

interface CheckoutFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cartData: any | null
}

// City search interface
interface CitySearchResult {
  id: string;
  name: string;
  postCode?: string;
  value: string;
  label: string;
}

export function CheckoutForm({ open, onOpenChange, cartData }: CheckoutFormProps) {
  // Enhanced debug logging for cart data
  console.log('CheckoutForm rendered with props:', { 
    open, 
    cartData, 
    hasCartData: !!cartData,
    cartDataType: cartData ? typeof cartData : 'null/undefined',
    cartItemsCount: cartData?.items?.length || 0,
    componentOrigin: 'CheckoutForm component'
  });

  // Look for cart data in the global window object if it's not passed as props
  useEffect(() => {
    // This runs only when cartData is null and we're in a browser environment
    if (!cartData && typeof window !== 'undefined') {
      console.log('Attempting to find cart data in window object...');
      
      // Check if cart data exists in any known locations
      // These are common places where the custom checkout script might store cart data
      const possibleCartData = 
        (window as any).cartData || 
        (window as any).customCheckoutData?.cartData || 
        (window as any).shopifyCart;
      
      if (possibleCartData) {
        console.log('Found cart data in window object:', possibleCartData);
        setLocalCartData(possibleCartData);
      } else {
        // If we need to, we could also try to fetch the cart data directly
        console.log('Could not find cart data in window object. Consider adding a global variable in custom-checkout.js');
        
        // If we're in development, we might also check localStorage
        if (process.env.NODE_ENV === 'development') {
          const storedCartData = localStorage.getItem('cartData');
          if (storedCartData) {
            try {
              const parsedCartData = JSON.parse(storedCartData);
              console.log('Found cart data in localStorage:', parsedCartData);
              setLocalCartData(parsedCartData);
            } catch (e) {
              console.error('Error parsing cart data from localStorage:', e);
            }
          }
        }
      }
    }
  }, [cartData]);

  // Create a default test cart for development/testing
  const defaultTestCart = {
    items: [
      {
        id: 'test-item-1',
        title: 'Test Product',
        quantity: 1,
        price: 2999,
        line_price: 2999,
        original_line_price: 2999,
        image: null
      }
    ],
    total_price: 2999,
    items_subtotal_price: 2999,
    total_discount: 0,
    item_count: 1,
    currency: 'BGN'
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      address: "",
      city: "",
      postalCode: "",
      shippingMethod: "speedy",
      officeAddress: "",
      officeCity: "",
      officePostalCode: "",
      note: "",
    },
  })

  // Use the defaultTestCart when cartData is null/undefined and we're in development
  const [localCartData, setLocalCartData] = useState<typeof cartData>(() => {
    console.log('Initializing localCartData', {
      hasCartData: !!cartData,
      usingTestCart: !cartData && process.env.NODE_ENV === 'development',
      environment: process.env.NODE_ENV
    });
    
    // Helper function to normalize cart data to ensure it has the expected structure
    const normalizeCartData = (data: any) => {
      if (!data) return null;
      
      // Check if the data has the expected structure
      if (!data.items || !Array.isArray(data.items)) {
        console.warn('Cart data has invalid format, missing items array', data);
        return process.env.NODE_ENV === 'development' ? defaultTestCart : null;
      }
      
      // If the data is valid, return it
      return data;
    };
    
    // If running in development and no cart data provided, use test cart
    if (!cartData && process.env.NODE_ENV === 'development') {
      console.log('Using default test cart for development');
      return defaultTestCart;
    }
    
    if (cartData) {
      const normalizedData = normalizeCartData(cartData);
      if (normalizedData) {
        console.log('Using provided cart data', { 
          itemCount: normalizedData.items?.length || 0
        });
        return normalizedData;
      } else {
        console.warn('Provided cart data was invalid, using fallback');
        return process.env.NODE_ENV === 'development' ? defaultTestCart : null;
      }
    }
    
    return cartData;
  });
  
  // Update local cart data when prop changes
  useEffect(() => {
    // Helper function to normalize cart data to ensure it has the expected structure
    const normalizeCartData = (data: any) => {
      if (!data) return null;
      
      // Check if the data has the expected structure
      if (!data.items || !Array.isArray(data.items)) {
        console.warn('Cart data has invalid format, missing items array', data);
        return process.env.NODE_ENV === 'development' ? defaultTestCart : null;
      }
      
      // If the data is valid, return it
      return data;
    };
    
    console.log('cartData prop changed', { 
      hasCartData: !!cartData,
      previousCartItems: localCartData?.items?.length || 0,
      newCartItems: cartData?.items?.length || 0
    });
    
    if (cartData) {
      const normalizedData = normalizeCartData(cartData);
      if (normalizedData) {
        console.log('Updating localCartData with new cartData');
        setLocalCartData(normalizedData);
      } else {
        console.warn('Updated cart data was invalid, using fallback');
        if (process.env.NODE_ENV === 'development') {
          setLocalCartData(defaultTestCart);
        }
      }
    } else if (process.env.NODE_ENV === 'development') {
      // In development, if cartData becomes null, use test cart instead of showing loading
      console.log('Using test cart as fallback in development');
      setLocalCartData(defaultTestCart);
    }
  }, [cartData]);
  
  // Track selected shipping method for calculating total
  const [shippingCost, setShippingCost] = useState(SHIPPING_COSTS.speedy);
  
  // State for city search
  const [citySuggestions, setCitySuggestions] = useState<ComboboxOption[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  
  // State for office search
  const [officeSuggestions, setOfficeSuggestions] = useState<ComboboxOption[]>([]);
  const [loadingOffices, setLoadingOffices] = useState(false);
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  
  // Watch for shipping method changes
  const selectedShippingMethod = form.watch("shippingMethod");
  
  // Update shipping cost when shipping method changes
  useEffect(() => {
    setShippingCost(SHIPPING_COSTS[selectedShippingMethod as keyof typeof SHIPPING_COSTS]);
  }, [selectedShippingMethod]);
  
  // Search for cities/offices
  const searchCities = useCallback(async (term: string) => {
    if (!term || term.length < 2) {
      setCitySuggestions([]);
      return;
    }

    setLoadingCities(true);
    try {
      // Use API route that will handle credentials securely
      const response = await fetch(`/api/speedy/search-site?term=${encodeURIComponent(term)}`);
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      const data = await response.json();
      console.log('Search response:', data); // Add logging for debugging
      
      if (data.sites) {
        const options: ComboboxOption[] = data.sites.map((site: CitySearchResult) => ({
          value: `${site.name}|${site.postCode}|${site.id}`,
          label: site.postCode ? `${site.name} (${site.postCode})` : site.name
        }));
        
        setCitySuggestions(options);
      } else {
        setCitySuggestions([]);
      }
    } catch (error) {
      console.error('Error searching cities:', error);
      setCitySuggestions([]);
    } finally {
      setLoadingCities(false);
    }
  }, []);
  
  // Search for offices in a city
  const searchOffices = useCallback(async (siteId: string) => {
    if (!siteId) {
      setOfficeSuggestions([]);
      return;
    }

    setLoadingOffices(true);
    try {
      const response = await fetch(`/api/speedy/search-office?siteId=${encodeURIComponent(siteId)}`);
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      const data = await response.json();
      
      if (data.offices && data.offices.length > 0) {
        const options: ComboboxOption[] = data.offices.map((office: any) => ({
          value: `${office.id}|${office.name}|${office.address.fullAddressString}`,
          label: `${office.name}: ${office.address.fullAddressString}`
        }));
        
        setOfficeSuggestions(options);
      } else {
        setOfficeSuggestions([]);
      }
    } catch (error) {
      console.error('Error searching offices:', error);
      setOfficeSuggestions([]);
    } finally {
      setLoadingOffices(false);
    }
  }, []);

  // Debounced search function to avoid too many API calls
  const debouncedSearchCities = useCallback(
    debounce((term: string) => {
      if (term.length >= 2) {
        searchCities(term);
      } else {
        setCitySuggestions([]);
      }
    }, 300),
    [searchCities]
  );

  const handleCitySelected = (cityValue: string, fieldName: string) => {
    if (cityValue) {
      const [cityName, postalCode, cityId] = cityValue.split('|');
      
      // Set city name in the appropriate field
      form.setValue(fieldName as keyof z.infer<typeof formSchema>, cityName);
      
      // If this is for personal address, also set postal code if available
      if (fieldName === 'city' && postalCode) {
        form.setValue('postalCode', postalCode);
      }
      
      // For office selection, store the city ID for office search and set postal code
      if (fieldName === 'officeCity' && cityId) {
        setSelectedCityId(cityId);
        // Always clear the office selection when changing city
        form.setValue('officeAddress', '');
        if (postalCode) {
          form.setValue('officePostalCode', postalCode);
        }
        
        // Fetch offices for this city
        searchOffices(cityId);
      }
    } else {
      // If the city was cleared, also clear related fields
      if (fieldName === 'officeCity') {
        form.setValue('officeAddress', '');
        form.setValue('officePostalCode', '');
        setSelectedCityId(null);
        setOfficeSuggestions([]);
        setFilteredOfficeSuggestions([]);
      } else if (fieldName === 'city') {
        form.setValue('postalCode', '');
      }
      form.setValue(fieldName as keyof z.infer<typeof formSchema>, '');
    }
  };

  const handleOfficeSelected = (officeValue: string) => {
    if (officeValue) {
      // Explicitly use index 1 to get the office name
      const parts = officeValue.split('|');
      const officeName = parts[1];
      
      // Set only the office name as the value
      form.setValue('officeAddress', officeName);
      
      // Log for debugging
      console.log('Setting office address value:', {
        originalValue: officeValue,
        extractedOfficeName: officeName
      });
    }
  };

  // Check if cart is empty and close the form if it is
  useEffect(() => {
    if (localCartData && localCartData.items && localCartData.items.length === 0) {
      // Close the checkout form if cart is empty
      onOpenChange(false);
      
      // Notify parent window to close iframe
      if (typeof window !== 'undefined' && window.parent) {
        window.parent.postMessage('checkout-closed', '*');
      }
    }
  }, [localCartData, onOpenChange]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log({ 
      ...values, 
      cart: localCartData,
      shipping: {
        method: values.shippingMethod,
        cost: shippingCost
      },
      totalWithShipping: (localCartData?.total_price || 0) + shippingCost
    });
    // Handle form submission here
  }
  
  // Handle quantity changes
  const updateQuantity = (itemIndex: number, newQuantity: number) => {
    if (!localCartData || newQuantity < 1) return;
    
    // Create a deep copy of the cart data
    const updatedCart = JSON.parse(JSON.stringify(localCartData));
    const item = updatedCart.items[itemIndex];
    
    // Calculate price differences
    const priceDifference = item.price * (newQuantity - item.quantity);
    
    // Update the item quantity
    item.quantity = newQuantity;
    item.line_price = item.price * newQuantity;
    
    // Update cart totals
    updatedCart.total_price += priceDifference;
    updatedCart.items_subtotal_price += priceDifference;
    
    setLocalCartData(updatedCart);
  };
  
  // Handle item removal
  const removeItem = (itemIndex: number) => {
    if (!localCartData) return;
    
    // Create a deep copy of the cart data
    const updatedCart = JSON.parse(JSON.stringify(localCartData));
    const itemToRemove = updatedCart.items[itemIndex];
    
    // Calculate price to subtract
    const priceToSubtract = itemToRemove.line_price;
    
    // Remove the item from the array
    updatedCart.items.splice(itemIndex, 1);
    
    // Update cart totals
    updatedCart.total_price -= priceToSubtract;
    updatedCart.items_subtotal_price -= priceToSubtract;
    updatedCart.item_count -= itemToRemove.quantity;
    
    setLocalCartData(updatedCart);
  };

  // Get shipping method label
  const getShippingMethodLabel = (method: string) => {
    switch (method) {
      case "speedy":
        return "Офис на Спиди";
      case "econt":
        return "Офис на Еконт";
      case "address":
        return "Личен адрес";
      default:
        return "";
    }
  };

  // Get shipping method icon
  const getShippingMethodIcon = (method: string) => {
    switch (method) {
      case "speedy":
        return (
          <img 
            src="/assets/logo-speedy-red.svg" 
            alt="Speedy" 
            className="h-5 w-auto"
          />
        );
      case "econt":
        return (
          <img 
            src="/assets/logo-econt-blue.svg" 
            alt="Econt" 
            className="h-5 w-auto"
          />
        );
      case "address":
        return <Home className="h-5 w-5 text-gray-500" />;
      default:
        return null;
    }
  };

  const renderCartSummary = () => {
    console.log('renderCartSummary called with localCartData:', { 
      hasData: !!localCartData,
      itemCount: localCartData?.items?.length || 0,
      dataType: typeof localCartData
    });
    
    if (!localCartData) {
      console.log('No localCartData available');
      return (
        <div className="space-y-2">
          <h3 className="text-base font-medium mb-2">Резюме на поръчката</h3>
          <div className="flex items-center justify-center py-4 text-gray-500">
            <span>Зареждане на данните...</span>
          </div>
          <div className="text-xs text-gray-400 mt-2 text-center">
            Проверка на статуса: проблем с данните на кошницата. Моля, опитайте да добавите продукти отново.
          </div>
        </div>
      );
    }
    
    if (!localCartData.items || !Array.isArray(localCartData.items)) {
      console.error('Invalid cart data structure - missing items array', localCartData);
      return (
        <div className="space-y-2">
          <h3 className="text-base font-medium mb-2">Резюме на поръчката</h3>
          <div className="flex items-center justify-center py-4 text-gray-500">
            <span>Невалидни данни на кошницата</span>
          </div>
          <div className="text-xs text-gray-400 mt-2 text-center">
            Възникна проблем с данните на кошницата. Моля, опитайте отново.
          </div>
        </div>
      );
    }
    
    if (localCartData.items.length === 0) {
      console.log('Cart is empty');
      return (
        <div className="space-y-2">
          <h3 className="text-base font-medium mb-2">Резюме на поръчката</h3>
          <div className="text-center py-4">Кошницата е празна</div>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <h3 className="text-base font-medium mb-2">Резюме на поръчката</h3>
        
        <div className="max-h-[30vh] overflow-y-auto pb-2">
          {localCartData.items.map((item: any, index: number) => (
            <div key={index} className="flex items-start gap-2 bg-gray-50/50 p-2 rounded-lg border border-gray-100 mb-2">
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-12 h-12 object-cover rounded-md flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 bg-gray-200 rounded-md flex items-center justify-center flex-shrink-0">
                  <span className="text-gray-500 text-xs">Няма изображение</span>
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{item.title}</h4>
                {item.variant_title && <p className="text-xs text-gray-500 truncate">{item.variant_title}</p>}
                
                <div className="flex items-center mt-1 justify-between">
                  <div className="flex items-center">
                    <div className="flex items-center border rounded text-sm">
                      <button 
                        type="button"
                        className="px-1.5 py-0 text-gray-600 hover:bg-gray-100"
                        onClick={() => updateQuantity(index, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                      >
                        -
                      </button>
                      <span className="px-1.5 py-0 text-center w-6">{item.quantity}</span>
                      <button 
                        type="button"
                        className="px-1.5 py-0 text-gray-600 hover:bg-gray-100"
                        onClick={() => updateQuantity(index, item.quantity + 1)}
                      >
                        +
                      </button>
              </div>
                    
                    <button
                      type="button"
                      className="ml-2 text-red-500 hover:text-red-700"
                      onClick={() => removeItem(index)}
                      title="Премахни продукта"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
            </div>

                  <div className="text-right">
                    <p className="font-medium text-sm">{formatMoney(item.line_price)}</p>
                    {item.original_line_price !== item.line_price && (
                      <p className="text-xs text-gray-500 line-through">
                        {formatMoney(item.original_line_price)}
                      </p>
                    )}
              </div>
              </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  const renderOrderSummary = () => {
    if (!localCartData) return null;
    
    const totalWithShipping = localCartData.total_price + shippingCost;
    
    return (
      <div className="border-t border-b py-3 space-y-2">
        <div className="flex justify-between text-sm">
          <span>Междинна сума</span>
          <span>{formatMoney(localCartData.items_subtotal_price)}</span>
        </div>
        
        {localCartData.total_discount > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>Отстъпка</span>
            <span>-{formatMoney(localCartData.total_discount)}</span>
          </div>
        )}
        
        <div className="flex justify-between text-sm">
          <span>Доставка</span>
          <span>{formatMoney(shippingCost)}</span>
        </div>
        
        <div className="flex justify-between font-bold text-base pt-1">
          <span>Общо</span>
          <span>{formatMoney(totalWithShipping)}</span>
        </div>
      </div>
    );
  };
  
  const formatMoney = (cents: number) => {
    return (cents / 100).toLocaleString('bg-BG', {
      style: 'currency',
      currency: localCartData?.currency || cartData?.currency || 'BGN'
    });
  };

  // Add a state for filtered office suggestions
  const [filteredOfficeSuggestions, setFilteredOfficeSuggestions] = useState<ComboboxOption[]>([]);

  // Update effect to initialize filtered suggestions when original suggestions change
  useEffect(() => {
    setFilteredOfficeSuggestions(officeSuggestions);
  }, [officeSuggestions]);

  // Add a function to handle office search
  const handleOfficeSearch = useCallback((searchTerm: string) => {
    console.log("Office search term:", searchTerm);
    
    if (!searchTerm || searchTerm.length < 2) {
      setFilteredOfficeSuggestions(officeSuggestions);
      return;
    }
    
    // Filter offices based on search term
    const filtered = officeSuggestions.filter(office => 
      office.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    setFilteredOfficeSuggestions(filtered);
  }, [officeSuggestions]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[500px] max-h-[90vh] p-0 gap-0 bg-white overflow-hidden flex flex-col"
        aria-describedby="checkout-form-description"
      >
        <DialogHeader className="p-4 pb-2 border-b shrink-0">
          <DialogTitle className="text-lg font-medium tracking-tight text-black">
            Поръчайте с наложен платеж
          </DialogTitle>
        </DialogHeader>

        <div id="checkout-form-description" className="sr-only">
          Форма за поръчка с наложен платеж, където можете да въведете данни за доставка и да изберете метод за доставка
        </div>

        <div className="overflow-y-auto px-4 py-3 space-y-4">
          {/* Cart Summary */}
          {renderCartSummary()}

          {localCartData && localCartData.items && localCartData.items.length > 0 && (
          <Form {...form}>
            <form 
              onSubmit={form.handleSubmit(onSubmit)} 
                className="space-y-4" 
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
            >
              {/* Shipping Method */}
                <div className="space-y-2">
                  <h3 className="font-medium text-black text-sm">Изберете метод за доставка</h3>
                <FormField
                  control={form.control}
                  name="shippingMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                            className="flex flex-col gap-1.5"
                          >
                            <div className="flex items-center justify-between border border-gray-200 rounded-lg p-2.5 cursor-pointer hover:bg-gray-50/50 transition-colors">
                              <div className="flex items-center gap-2">
                                <RadioGroupItem value="speedy" id="speedy" />
                                <div className="flex items-center gap-2">
                                  {getShippingMethodIcon("speedy")}
                                  <label htmlFor="speedy" className="cursor-pointer font-medium text-black text-sm">
                                    Офис на Спиди
                                  </label>
                                </div>
                              </div>
                              <span className="text-black text-sm">5.99 лв.</span>
                            </div>
                            
                            <div className="flex items-center justify-between border border-gray-200 rounded-lg p-2.5 cursor-pointer hover:bg-gray-50/50 transition-colors">
                              <div className="flex items-center gap-2">
                                <RadioGroupItem value="econt" id="econt" />
                                <div className="flex items-center gap-2">
                                  {getShippingMethodIcon("econt")}
                                  <label htmlFor="econt" className="cursor-pointer font-medium text-black text-sm">
                                    Офис на Еконт
                              </label>
                                </div>
                              </div>
                              <span className="text-black text-sm">6.99 лв.</span>
                            </div>
                            
                            <div className="flex items-center justify-between border border-gray-200 rounded-lg p-2.5 cursor-pointer hover:bg-gray-50/50 transition-colors">
                              <div className="flex items-center gap-2">
                                <RadioGroupItem value="address" id="address" />
                                <div className="flex items-center gap-2">
                                  {getShippingMethodIcon("address")}
                                  <label htmlFor="address" className="cursor-pointer font-medium text-black text-sm">
                                    Личен адрес
                                  </label>
                                </div>
                              </div>
                              <span className="text-black text-sm">8.99 лв.</span>
                          </div>
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
                
                {/* Order Summary (moved after shipping methods) */}
                {renderOrderSummary()}

              <div>
                  <h3 className="text-center font-medium text-black mb-3 text-sm">
                       Данни за доставка
                  </h3>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-black text-xs">
                            Първо име<span className="text-red-500 ml-0.5">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Първо име" 
                              autoComplete="new-password"
                              autoCorrect="off"
                              spellCheck="false"
                              {...field}
                                className="rounded-lg border-gray-200 focus:border-gray-400 focus:ring-0 bg-gray-50/50 text-black placeholder:text-black/70 h-9 text-sm"
                            />
                          </FormControl>
                            <FormMessage className="text-red-500 text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-black text-xs">
                            Фамилия<span className="text-red-500 ml-0.5">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Фамилия" 
                              autoComplete="new-password"
                              autoCorrect="off"
                              spellCheck="false"
                              {...field}
                                className="rounded-lg border-gray-200 focus:border-gray-400 focus:ring-0 bg-gray-50/50 text-black placeholder:text-black/70 h-9 text-sm"
                            />
                          </FormControl>
                            <FormMessage className="text-red-500 text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                          <FormLabel className="text-black text-xs">
                          Телефон<span className="text-red-500 ml-0.5">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Телефон" 
                            type="tel" 
                            autoComplete="new-password"
                            autoCorrect="off"
                            spellCheck="false"
                            {...field}
                              className="rounded-lg border-gray-200 focus:border-gray-400 focus:ring-0 bg-gray-50/50 text-black placeholder:text-black/70 h-9 text-sm"
                          />
                        </FormControl>
                          <FormMessage className="text-red-500 text-xs" />
                        </FormItem>
                      )}
                    />

                    {selectedShippingMethod !== "address" ? (
                      <>
                        {form.watch('officeCity') && (
                          <FormField
                            control={form.control}
                            name="officePostalCode"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-black text-xs">
                                  Пощенски код
                                </FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field}
                                    disabled
                                    className="rounded-lg border-gray-200 focus:border-gray-400 focus:ring-0 bg-gray-50/50 text-black placeholder:text-black/70 h-9 text-sm"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        )}

                        <FormField
                          control={form.control}
                          name="officeCity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-black text-xs">
                                Град<span className="text-red-500 ml-0.5">*</span>
                              </FormLabel>
                              <div className="flex-1">
                                <Combobox
                                  options={citySuggestions}
                                  value={field.value ?? ""}
                                  onChange={(value) => {
                                    console.log("City selected in form:", value);
                                    handleCitySelected(value, 'officeCity');
                                  }}
                                  onSearch={(value) => {
                                    console.log("City search term in form:", value);
                                    if (value.length >= 2) {
                                      debouncedSearchCities(value);
                                    } else {
                                      setCitySuggestions([]);
                                    }
                                  }}
                                  placeholder="Търсете населено място"
                                  loading={loadingCities}
                                  emptyText="Няма намерени резултати"
                                  className="border-gray-200 focus:border-gray-400"
                                  type="city"
                                />
                              </div>
                              <FormMessage className="text-red-500 text-xs" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="officeAddress"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-black text-xs">
                                Изберете офис<span className="text-red-500 ml-0.5">*</span>
                              </FormLabel>
                              <div className="flex items-center gap-2 w-full">
                                <div className="flex-shrink-0">
                                  {getShippingMethodIcon(selectedShippingMethod)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <Combobox
                                    options={filteredOfficeSuggestions}
                                    value={field.value || ""}
                                    onChange={(value) => {
                                      console.log("Office selected in form:", value);
                                      handleOfficeSelected(value);
                                    }}
                                    onSearch={handleOfficeSearch}
                                    placeholder={`Изберете ${getShippingMethodLabel(selectedShippingMethod)}`}
                                    loading={loadingOffices}
                                    emptyText={selectedCityId ? "Няма намерени офиси" : "Първо изберете град"}
                                    disabled={!selectedCityId}
                                    className="border-gray-200 focus:border-gray-400"
                                    type="office"
                                    courier={selectedShippingMethod as 'speedy' | 'econt'}
                                  />
                                </div>
                              </div>
                              <FormMessage className="text-red-500 text-xs" />
                            </FormItem>
                          )}
                        />
                      </>
                    ) : (
                      <>
                        <FormField
                          control={form.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-black text-xs">
                                Град<span className="text-red-500 ml-0.5">*</span>
                              </FormLabel>
                              <div className="flex-1">
                                <Combobox
                                  options={citySuggestions}
                                  value={field.value || ""}
                                  onChange={(value) => {
                                    console.log("Personal address city selected in form:", value);
                                    handleCitySelected(value, 'city');
                                  }}
                                  onSearch={(value) => {
                                    console.log("Personal address city search term in form:", value);
                                    if (value.length >= 2) {
                                      debouncedSearchCities(value);
                                    } else {
                                      setCitySuggestions([]);
                                    }
                                  }}
                                  placeholder="Търсете населено място"
                                  loading={loadingCities}
                                  emptyText="Няма намерени резултати"
                                  className="border-gray-200 focus:border-gray-400"
                                  type="city"
                                />
                              </div>
                              <FormMessage className="text-red-500 text-xs" />
                            </FormItem>
                          )}
                        />
                        
                        {form.watch('city') && (
                          <FormField
                            control={form.control}
                            name="postalCode"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-black text-xs">
                                  Пощенски код<span className="text-red-500 ml-0.5">*</span>
                                </FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Пощенски код" 
                                    autoComplete="new-password"
                                    autoCorrect="off"
                                    spellCheck="false"
                                    {...field}
                                    className="rounded-lg border-gray-200 focus:border-gray-400 focus:ring-0 bg-gray-50/50 text-black placeholder:text-black/70 h-9 text-sm"
                                  />
                                </FormControl>
                                <FormMessage className="text-red-500 text-xs" />
                              </FormItem>
                            )}
                          />
                        )}

                        <FormField
                          control={form.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-black text-xs">
                                Адрес<span className="text-red-500 ml-0.5">*</span>
                              </FormLabel>
                              <div className="flex items-center gap-2">
                                {getShippingMethodIcon("address")}
                                <FormControl className="flex-1">
                                  <Input 
                                    placeholder="Адрес" 
                                    autoComplete="new-password"
                                    autoCorrect="off"
                                    spellCheck="false"
                                    {...field}
                                    className="rounded-lg border-gray-200 focus:border-gray-400 focus:ring-0 bg-gray-50/50 text-black placeholder:text-black/70 h-9 text-sm"
                                  />
                                </FormControl>
                              </div>
                              <FormMessage className="text-red-500 text-xs" />
                            </FormItem>
                          )}
                        />
                      </>
                    )}

                    {/* Note field - always visible regardless of shipping method */}
                    <FormField
                      control={form.control}
                      name="note"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-black text-xs">
                            Бележка
                          </FormLabel>
                          <FormControl>
                            <Input 
                              {...field}
                              placeholder="Бележка към поръчката"
                              className="rounded-lg border-gray-200 focus:border-gray-400 focus:ring-0 bg-gray-50/50 text-black placeholder:text-black/70 h-9 text-sm"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                </div>
              </div>

                {/* Submit Button */}
              <Button
                type="submit"
                  className="w-full bg-black hover:bg-black/90 text-white font-medium py-2.5"
              >
                  Завършете поръчката си
              </Button>
            </form>
          </Form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 