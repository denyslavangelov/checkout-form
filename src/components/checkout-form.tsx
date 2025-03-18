"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { X, Trash2, Home, Route, Building2, CheckIcon, CreditCardIcon } from "lucide-react"
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
  email: z.string().email({ message: "Невалиден имейл адрес." }).optional(),
  address: z.string().min(5, {
    message: "Адресът трябва да бъде поне 5 символа.",
  }),
  street: z.string().min(2, {
    message: "Улицата/комплексът трябва да бъде поне 2 символа.",
  }).optional(),
  number: z.string().min(1, {
    message: "Моля, въведете номер/блок.",
  }).optional(),
  building: z.string().optional(),
  entrance: z.string().optional(),
  floor: z.string().optional(),
  apartment: z.string().optional(),
  city: z.string().min(2, {
    message: "Градът трябва да бъде поне 2 символа.",
  }),
  postalCode: z.string().min(4, {
    message: "Моля, въведете валиден пощенски код.",
  }),
  shippingMethod: z.string().default("speedy"),
  paymentMethod: z.string().default("cod"),
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
  isMobile?: boolean
}

// City search interface
interface CitySearchResult {
  id: string;
  name: string;
  postCode?: string;
  value: string;
  label: string;
}

export function CheckoutForm({ open, onOpenChange, cartData, isMobile = false }: CheckoutFormProps) {
  // Enhanced debug logging for cart data
  console.log('CheckoutForm rendered with props:', { 
    open, 
    cartData, 
    hasCartData: !!cartData,
    cartDataType: cartData ? typeof cartData : 'null/undefined',
    cartItemsCount: cartData?.items?.length || 0,
    componentOrigin: 'CheckoutForm component',
    isMobile
  });

  // State for tracking the current step
  const [currentStep, setCurrentStep] = useState(0);
  
  // Define the steps in the checkout process
  const steps = [
    { id: 'cart', title: 'Кошница' },
    { id: 'shipping', title: 'Доставка' },
    { id: 'details', title: 'Данни' },
    { id: 'payment', title: 'Плащане' }
  ];

  // Function to advance to the next step
  const nextStep = () => {
    // Validate the current step before proceeding
    if (validateCurrentStep()) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
      // Scroll to top when changing steps
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          const contentElement = document.querySelector('.dialog-content-scroll');
          if (contentElement) {
            contentElement.scrollTop = 0;
          }
        }, 100);
      }
    }
  };

  // Function to go back to the previous step
  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
    // Scroll to top when changing steps
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        const contentElement = document.querySelector('.dialog-content-scroll');
        if (contentElement) {
          contentElement.scrollTop = 0;
        }
      }, 100);
    }
  };

  // Function to validate the current step
  const validateCurrentStep = () => {
    switch(currentStep) {
      case 0: // Cart
        // Just check if cart is not empty
        return localCartData && localCartData.items && localCartData.items.length > 0;
      case 1: // Shipping method
        // Check if shipping method is selected
        return !!form.getValues('shippingMethod');
      case 2: // Customer details
        // Get shipping method
        const shippingMethod = form.getValues('shippingMethod');
        
        // If shipping to office, validate office fields
        if (shippingMethod === 'speedy' || shippingMethod === 'econt') {
          return form.trigger(['firstName', 'lastName', 'phone', 'officeCity', 'officeAddress']);
        }
        
        // If shipping to address, validate address fields
        return form.trigger(['firstName', 'lastName', 'phone', 'city', 'street', 'number', 'postalCode']);
      case 3: // Payment
        // Most validation already done in previous steps
        return true;
      default:
        return true;
    }
  };

  // Handle dialog close
  const handleDialogClose = (isOpen: boolean) => {
    if (!isOpen) {
      // Reset to first step when closing
      setCurrentStep(0);
      onOpenChange(isOpen);
    } else {
      onOpenChange(isOpen);
    }
  };

  // Form submission state
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      address: "",
      street: "",
      number: "",
      entrance: "",
      floor: "",
      apartment: "",
      city: "",
      postalCode: "",
      shippingMethod: "speedy",
      paymentMethod: "cod",
      officeAddress: "",
      officeCity: "",
      officePostalCode: "",
      note: "",
    },
  })

  // Function to normalize cart data between different formats
  const normalizeCartData = (data: any) => {
    if (!data) {
      // Return empty cart structure
      console.log('No cart data to normalize, returning empty structure');
      return {
        items: [],
        total_price: 0,
        items_subtotal_price: 0,
        total_discount: 0,
        item_count: 0,
        currency: 'BGN'
      };
    }

    // Debug print the data to see what image fields we have
    if (data.product) {
      console.log('Product image fields check:', {
        featured_image: data.product.featured_image,
        image: data.product.image,
        image_src: data.product.image?.src,
        images: data.product.images
      });
    }

    // Check for Buy Now data that might be sent directly in the message
    if (data.product && typeof window !== 'undefined') {
      console.log('Detected Buy Now button data:', data.product);
      const product = data.product;
      
      // Find the best available image
      let imageUrl = null;
      if (product.image && product.image.src) {
        imageUrl = product.image.src;
      } else if (product.featured_image) {
        imageUrl = typeof product.featured_image === 'string' 
          ? product.featured_image 
          : product.featured_image.src || product.featured_image;
      } else if (product.images && product.images.length > 0) {
        imageUrl = typeof product.images[0] === 'string'
          ? product.images[0]
          : product.images[0].src || product.images[0];
      }
      
      return {
        items: [{
          id: product.variant_id || product.id,
          title: product.title,
          quantity: product.quantity || 1,
          price: product.price,
          line_price: product.price * (product.quantity || 1),
          original_line_price: (product.compare_at_price || product.price) * (product.quantity || 1),
          variant_id: product.variant_id || product.id,
          product_id: product.id,
          sku: product.sku || '',
          variant_title: product.variant_title || '',
          vendor: product.vendor || '',
          image: imageUrl,
          requires_shipping: true
        }],
        total_price: product.price * (product.quantity || 1),
        items_subtotal_price: product.price * (product.quantity || 1),
        total_discount: product.compare_at_price ? 
          (product.compare_at_price - product.price) * (product.quantity || 1) : 0,
        item_count: product.quantity || 1,
        currency: 'BGN'
      };
    }
    
    // Normal cart structure validation
    if (data.items && Array.isArray(data.items)) {
      // Ensure all items have proper image field
      const processedItems = data.items.map((item: any) => {
        // Handle image field in various formats
        let imageUrl = null;
        if (item.image) {
          imageUrl = typeof item.image === 'string' ? item.image : item.image.src || item.image;
        } else if (item.featured_image) {
          imageUrl = typeof item.featured_image === 'string' 
            ? item.featured_image 
            : item.featured_image.src || item.featured_image;
        }
        
        return {
          ...item,
          image: imageUrl
        };
      });
      
      return {
        ...data,
        items: processedItems
      };
    }
    
    // If it's just a single product (without proper cart structure)
    if (data.title && data.price) {
      // Find the best available image
      let imageUrl = null;
      if (data.image) {
        imageUrl = typeof data.image === 'string' ? data.image : data.image.src || data.image;
      } else if (data.featured_image) {
        imageUrl = typeof data.featured_image === 'string' 
          ? data.featured_image 
          : data.featured_image.src || data.featured_image;
      }
      
      return {
        items: [{
          id: data.variant_id || data.id || Date.now().toString(),
          title: data.title,
          quantity: data.quantity || 1,
          price: data.price,
          line_price: data.price * (data.quantity || 1),
          original_line_price: data.price * (data.quantity || 1),
          image: imageUrl
        }],
        total_price: data.price * (data.quantity || 1),
        items_subtotal_price: data.price * (data.quantity || 1),
        total_discount: 0,
        item_count: data.quantity || 1,
        currency: 'BGN'
      };
    }
    
    // Buy Now context with empty cart - check window for product
    if (data.cart_type === 'buy_now' && (!data.items || data.items.length === 0) && typeof window !== 'undefined') {
      console.log('Detected Buy Now context with empty cart, checking for product data');
      
      // Try to get product data from window
      let productData = null;
      
      if (typeof window !== 'undefined') {
        // Try various sources
        if ((window as any).buyNowProduct) {
          console.log('Found product in window.buyNowProduct');
          productData = (window as any).buyNowProduct;
        } else if (data.product) {
          console.log('Found product in localCartData.product');
          productData = data.product;
        } else {
          // Try localStorage
          try {
            const storedProduct = localStorage.getItem('buyNowProduct');
            if (storedProduct) {
              productData = JSON.parse(storedProduct);
              console.log('Found product in localStorage');
            }
            } catch (e) {
            console.error('Error getting product from localStorage', e);
          }
        }
        
        // Add the product to the cart if we found it
        if (productData) {
          console.log('Adding product to cart:', productData);
          
          // Find the best available image
          let imageUrl = null;
          if (productData.image) {
            imageUrl = typeof productData.image === 'string' ? productData.image : productData.image.src || productData.image;
          } else if (productData.featured_image) {
            imageUrl = typeof productData.featured_image === 'string' 
              ? productData.featured_image 
              : productData.featured_image.src || productData.featured_image;
          } else if (productData.images && productData.images.length > 0) {
            imageUrl = typeof productData.images[0] === 'string'
              ? productData.images[0]
              : productData.images[0].src || productData.images[0];
          }
          
          return {
            ...data,
            items: [{
              id: productData.variant_id || productData.id,
              title: productData.title,
              quantity: productData.quantity || 1,
              price: productData.price,
              line_price: productData.price * (productData.quantity || 1),
              original_line_price: (productData.compare_at_price || productData.price) * (productData.quantity || 1),
              variant_id: productData.variant_id || productData.id,
              product_id: productData.id,
              sku: productData.sku || '',
              variant_title: productData.variant_title || '',
              vendor: productData.vendor || '',
              image: imageUrl,
              requires_shipping: true
            }],
            total_price: productData.price * (productData.quantity || 1),
            items_subtotal_price: productData.price * (productData.quantity || 1),
            total_discount: productData.compare_at_price ? 
              (productData.compare_at_price - productData.price) * (productData.quantity || 1) : 0,
            item_count: productData.quantity || 1
          };
        }
      }
    }
    
    // Last resort - use development test cart
    if (process.env.NODE_ENV === 'development') {
      console.log('Using test cart in development mode');
      return {
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
    }
    
    // Return the unmodified data if we can't normalize it
    return data;
  };

  // Initialize cart data with a reasonable default
  const [localCartData, setLocalCartData] = useState<any>(null);
  
  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Request cart data when form opens
  useEffect(() => {
    if (open && !localCartData && typeof window !== 'undefined' && window.parent) {
      console.log('Form is open, requesting cart data from parent window');
      
      // Request cart data immediately
      window.parent.postMessage({ type: 'request-cart-data' }, '*');
      
      // Try again after a short delay if needed (fallback)
      const timer = setTimeout(() => {
        if (!localCartData) {
          console.log('Fallback: Requesting cart data again after delay');
          window.parent.postMessage({ type: 'request-cart-data' }, '*');
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [open, localCartData]);

  // Add an improved listener for cart data messages
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const messageHandler = (event: MessageEvent) => {
        // Handle cart data messages
        if (event.data?.type === 'cart-data' && (event.data?.cart || event.data?.product)) {
          console.log('Received cart data from parent window:', event.data.cart);
          
          // Check if there's a direct product reference first
          if (event.data.product) {
            console.log('Received product data directly:', event.data.product);
            // Store in window for future reference
            (window as any).buyNowProduct = event.data.product;
            
            // Try to store in localStorage too
            try {
              localStorage.setItem('buyNowProduct', JSON.stringify(event.data.product));
            } catch (e) {
              console.warn('Could not store product data in localStorage', e);
            }
          }
          
          // Special handling for Buy Now button data
          const isBuyNowData = 
            event.data.cart?.cart_type === 'buy_now' || 
            event.data.cart?.source === 'buy_now_button' ||
            event.data.metadata?.source === 'buy_now_button' ||
            event.data.metadata?.isBuyNowContext === true;
                              
          if (isBuyNowData) {
            console.log('Detected Buy Now button data:', event.data.cart);
            
            // Check if we need to show an error because we have empty cart with no product
            if ((!event.data.cart?.items || event.data.cart?.items.length === 0) && !event.data.product) {
              console.warn('Buy Now context with empty cart and no product data');
              
              // Update the error handling to not create a test product
              console.error('Product data not found for Buy Now. This is an error condition.');
            }
          }
          
          // Create a merged object with both cart and product data
          const mergedData = {
            ...event.data.cart,
            product: event.data.product || event.data.cart?.product
          };
          
          // Log the data we're about to normalize
          console.log('Data for normalization:', {
            mergedData,
            hasProduct: !!mergedData.product,
            hasItems: !!(mergedData.items && mergedData.items.length > 0)
          });
          
          try {
            console.log('After normalization:', {
              normalizedData: mergedData,
              hasItems: !!(mergedData?.items && mergedData.items.length > 0)
            });
            
            if (mergedData) {
              console.log('Setting cart data from message');
              setLocalCartData(mergedData);
            }
          } catch (error) {
            console.error('Error setting cart data from message:', error);
          }
        }
        
        // Also handle error messages
        if (event.data?.type === 'error-message') {
          console.error('Received error message from parent:', event.data.message);
          // Could display an error message here
        }
        
        // Also handle CART_DATA_UPDATE messages
        if (event.data?.type === 'CART_DATA_UPDATE' && event.data?.cartData) {
          console.log('Received cart data update from parent window:', event.data.cartData);
          const normalizedData = normalizeCartData(event.data.cartData);
          if (normalizedData) {
            console.log('Setting cart data from update message');
            setLocalCartData(normalizedData);
          }
        }
      };
      
      window.addEventListener('message', messageHandler);
      
      return () => {
        window.removeEventListener('message', messageHandler);
      };
    }
  }, [normalizeCartData, setLocalCartData]);
  
  // Show loading spinner while waiting for cart data
  const isLoadingCart = open && (!localCartData || !localCartData.items || localCartData.items.length === 0);
  
  // Track selected shipping method for calculating total
  const [shippingCost, setShippingCost] = useState(SHIPPING_COSTS.speedy);
  
  // State for city search
  const [citySuggestions, setCitySuggestions] = useState<ComboboxOption[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  
  // State for office search
  const [officeSuggestions, setOfficeSuggestions] = useState<ComboboxOption[]>([]);
  const [loadingOffices, setLoadingOffices] = useState(false);
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  
  // State for street search
  const [streetSuggestions, setStreetSuggestions] = useState<ComboboxOption[]>([]);
  const [loadingStreets, setLoadingStreets] = useState(false);
  const [filteredStreetSuggestions, setFilteredStreetSuggestions] = useState<ComboboxOption[]>([]);
  
  // State for tracking search input values
  const [searchCity, setSearchCity] = useState("");
  const [searchStreet, setSearchStreet] = useState("");
  
  // Watch for shipping method changes
  const selectedShippingMethod = form.watch("shippingMethod");
  
  // Update shipping cost when shipping method changes
  useEffect(() => {
    // Update the shipping cost
    setShippingCost(SHIPPING_COSTS[selectedShippingMethod as keyof typeof SHIPPING_COSTS]);
  }, [selectedShippingMethod]);
  
  // Update the searchCities function to respect the mobile/desktop minimum length difference
  const searchCities = useCallback(async (term: string) => {
    // Mobile allows 1-character searches, desktop requires 2
    const minSearchLength = 1;
    
    if (!term || term.length < minSearchLength) {
      setCitySuggestions([]);
      return;
    }
    
    // More detailed logging of the search context
    console.log('Search context:', {
      term,
      length: term.length,
      minSearchLength,
      isMobile,
      encodedTerm: encodeURIComponent(term),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
      platform: typeof window !== 'undefined' ? window.navigator.platform : 'unknown',
      timestamp: new Date().toISOString(),
    });
    
    setLoadingCities(true);
    
    try {
      // Properly encode the search term
      const encodedTerm = encodeURIComponent(term);
      let apiUrl = `/api/speedy/search-site?term=${encodedTerm}`;
      
      // Add a timestamp to prevent potential caching issues
      const cacheBuster = `&_t=${Date.now()}`;
      const requestUrl = `${apiUrl}${cacheBuster}`;
      
      console.log('Actual request URL with cache buster:', requestUrl);
      
      let response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store', 
          'Pragma': 'no-cache'
        },
        signal: AbortSignal.timeout(5000)
      });
      
      console.log('API response status:', response.status);
      
      // If first request fails, try an alternative encoding for Cyrillic
      if (!response.ok && (term.match(/[а-яА-Я]/g) || term.includes('sof'))) {
        console.log('First request failed, trying alternative encoding for Cyrillic characters');
        
        // Different encoding approach
        const alternativeEncoding = term.split('').map(char => encodeURIComponent(char)).join('');
        apiUrl = `/api/speedy/search-site?term=${alternativeEncoding}${cacheBuster}`;
        console.log('Trying alternative URL:', apiUrl);
        
        response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store', 
            'Pragma': 'no-cache'
          },
          signal: AbortSignal.timeout(5000)
        });
        
        console.log('Alternative request status:', response.status);
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Network response error: ${response.status} - ${errorText}`);
      }
      
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Error parsing API response as JSON:', parseError);
        const rawText = await response.text();
        console.log('Raw API response:', rawText.substring(0, 200) + '...');
        throw new Error('Invalid JSON response from API');
      }
      
      console.log('Search response data:', { 
        success: !!data,
        hasSites: !!data?.sites,
        siteCount: data?.sites?.length || 0,
        firstSite: data?.sites?.[0] || 'none',
        searchTerm: term,
        isMobile
      });
      
      if (data.sites && data.sites.length > 0) {
        // Use the label from the API that includes the prefix
        const options: ComboboxOption[] = data.sites.map((site: any) => ({
          value: site.value,
          label: site.label
        }));
        
        console.log('Mapped suggestions from API:', {
          count: options.length,
          isMobile,
          term,
          examples: options.slice(0, 3)
        });
        
        setCitySuggestions(options);
      } else {
        console.log('No results from API', {
          searchTerm: term, 
          isMobile
        });
        
      }
    } catch (error) {
      console.error('Error searching cities:', {
        error,
        searchTerm: term,
        isMobile
      });

      setCitySuggestions([]);

    } finally {
      setLoadingCities(false);
    }
  }, [isMobile, setCitySuggestions, setLoadingCities]);
  
  // Search for offices in a city
  const searchOffices = useCallback(async (siteId: string, term: string = '') => {
    if (!siteId) {
      setOfficeSuggestions([]);
      return;
    }

    setLoadingOffices(true);
    try {
      const response = await fetch(`/api/speedy/search-office?siteId=${encodeURIComponent(siteId)}&term=${encodeURIComponent(term)}`);
      
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

  // Update the debounced search function to remove Sofia special handling
  const debouncedSearchCities = useCallback(
    debounce((term: string) => {
      const minSearchLength = 1;
      
      if (term.length >= minSearchLength) {
        console.log(`Term meets ${minSearchLength} char threshold, searching cities:`, term);
        searchCities(term);
      } else {
        console.log('Term too short, clearing suggestions');
        setCitySuggestions([]);
      }
    }, isMobile ? 150 : 300),
    [searchCities, setCitySuggestions, isMobile]
  );

  // Search for streets in a city
  const searchStreets = useCallback(async (siteId: string, term: string = '') => {
    if (!siteId) {
      setStreetSuggestions([]);
      setFilteredStreetSuggestions([]);
      return;
    }

    setLoadingStreets(true);
    try {
      // Add the term parameter to the API call
      const encodedTerm = encodeURIComponent(term);
      const cacheBuster = `&_t=${Date.now()}`;
      const requestUrl = `/api/speedy/search-street?siteId=${encodeURIComponent(siteId)}${term ? `&term=${encodedTerm}` : ''}${cacheBuster}`;
      
      console.log('Street search request URL:', requestUrl);
      
      const response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store', 
          'Pragma': 'no-cache'
        },
        signal: AbortSignal.timeout(5000)
      });
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      const data = await response.json();
      
      if (data.streets && data.streets.length > 0) {
        // Use the label from the API that includes the prefix
        const options: ComboboxOption[] = data.streets.map((street: any) => {
          const type = street.value.split('|')[0];
          return {
          value: street.value,
            label: street.label,
            icon: type === 'street' ? <Route className="h-4 w-4 text-gray-500" /> : <Building2 className="h-4 w-4 text-gray-500" />
          };
        });
        
        console.log('Street search results:', {
          term,
          count: options.length,
          firstStreet: options[0]?.label || 'none'
        });
        
        setStreetSuggestions(options);
        setFilteredStreetSuggestions(options);
      } else {
        console.log('No streets found for search term:', term);
        setStreetSuggestions([]);
        setFilteredStreetSuggestions([]);
      }
    } catch (error) {
      console.error('Error searching streets:', error);
      setStreetSuggestions([]);
      setFilteredStreetSuggestions([]);
    } finally {
      setLoadingStreets(false);
    }
  }, []);

  // Use debounced search for streets
  const debouncedSearchStreets = useCallback(
    debounce((siteId: string, term: string) => {
      const minSearchLength = isMobile ? 1 : 2;
      
      // If the term is empty or too short, fetch all streets
      if (!term || term.length < minSearchLength) {
        if (!term) {
          console.log('Empty street search term, fetching all streets');
          searchStreets(siteId);
        } else {
          console.log('Street search term too short, waiting for more input');
        }
        return;
      }
      
      console.log(`Debounced street search with term: "${term}" for siteId: ${siteId}`);
      searchStreets(siteId, term);
    }, isMobile ? 150 : 300),
    [searchStreets, isMobile]
  );

  // Handle search in the street combobox
  const handleStreetSearch = useCallback((searchTerm: string) => {
    console.log("Street search term:", searchTerm);
    
    if (!selectedCityId) {
      console.log("No city selected, cannot search for streets");
      return;
    }
    
    // Only show suggestions when the user has typed something
    if (!searchTerm) {
      setFilteredStreetSuggestions([]);
      return;
    }
    
    debouncedSearchStreets(selectedCityId, searchTerm);
  }, [selectedCityId, debouncedSearchStreets]);

  // Handle street/complex selection with prefix
  const handleStreetSelected = (value: string) => {
    if (value) {
      const parts = value.split('|');
      const type = parts[0];
      const id = parts[1];
      const name = parts[2];
      const districtOrEmpty = parts[3];
      const prefix = parts[4];
      
      // Set street value with prefix
      const displayValue = type === 'street' && districtOrEmpty
        ? `${prefix} ${name} (${districtOrEmpty})`
        : `${prefix} ${name}`;
      
      form.setValue('street', displayValue);
      
      console.log('Setting street/complex value:', {
        originalValue: value,
        type,
        name,
        districtOrEmpty,
        prefix,
        finalValue: displayValue
      });
    }
  };

  // Update effect to initialize filtered street suggestions when original suggestions change
  useEffect(() => {
    console.log(`Street/complex suggestions updated: ${streetSuggestions.length} items`);
    // Only show filtered suggestions when there's a search term
    if (!searchStreet) {
      setFilteredStreetSuggestions([]);
    } else {
      setFilteredStreetSuggestions(streetSuggestions);
    }
  }, [streetSuggestions, searchStreet]);

  // Handle city selection
  const handleCitySelected = (cityValue: string, fieldName: string) => {
    if (cityValue) {
      const parts = cityValue.split('|');
      const cityName = parts[0];
      const postalCode = parts[1];
      const cityId = parts[2];
      const prefix = parts[3] || 'гр.'; // Get the prefix or default to 'гр.'
      
      // Set city name in the appropriate field, with prefix
      form.setValue(fieldName as keyof z.infer<typeof formSchema>, `${prefix} ${cityName}`);
      
      // If this is for personal address, also set postal code if available
      if (fieldName === 'city' && postalCode) {
        form.setValue('postalCode', postalCode);
        
        // If this is for personal address and we have a cityId, fetch streets
        if (selectedShippingMethod === 'address' && cityId) {
          setSelectedCityId(cityId);
          
          // Fetch all streets for this city (empty search term = all streets)
          searchStreets(cityId);
        }
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
        searchOffices(cityId)
      }
    } else {
      // If the city was cleared, also clear related fields
      if (fieldName === 'officeCity') {
        form.setValue('officeAddress', '');
        form.setValue('officePostalCode', '');
        setSelectedCityId(null);
        setOfficeSuggestions([]);
      } else if (fieldName === 'city') {
        form.setValue('postalCode', '');
        form.setValue('street', '');
        form.setValue('building', '');
        form.setValue('entrance', '');
        form.setValue('floor', '');
        form.setValue('apartment', '');
        setStreetSuggestions([]);
        setFilteredStreetSuggestions([]);
        if (selectedShippingMethod === 'address') {
          setSelectedCityId(null);
        }
      }
      form.setValue(fieldName as keyof z.infer<typeof formSchema>, '');
    }
  };

  const handleOfficeSelected = (officeValue: string) => {
    if (officeValue) {
      // Parse all parts from the value (id|name|address)
      const parts = officeValue.split('|');
      const officeId = parts[0];
      const officeName = parts[1];
      const officeAddress = parts[2];
      
      // Format the full address with office ID in brackets
      const fullOfficeAddress = `[${officeId}] ${officeName}: ${officeAddress}`;
      
      // Set the full office address as the value
      form.setValue('officeAddress', fullOfficeAddress);
      
      // Log for debugging
      console.log('Setting office address value:', {
        originalValue: officeValue,
        parsedId: officeId,
        parsedName: officeName,
        parsedAddress: officeAddress,
        fullAddress: fullOfficeAddress
      });
    }
  };

  // Format money helper
  const formatMoney = (cents: number) => {
    return (cents / 100).toLocaleString('bg-BG', {
      style: 'currency',
      currency: localCartData?.currency || cartData?.currency || 'BGN'
    });
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

  // Add back the cart summary rendering function
  const renderCartSummary = () => {
    if (!localCartData) {
      return (
        <div className="space-y-2">
          <h3 className="text-base font-medium mb-2">Продукти в кошницата</h3>
          <div className="flex flex-col items-center justify-center py-6 space-y-2 text-gray-500">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-600"></div>
            <span>Зареждане на данните...</span>
          </div>
        </div>
      );
    }
    
    if (!localCartData.items || !Array.isArray(localCartData.items)) {
      return (
        <div className="space-y-2">
          <h3 className="text-base font-medium mb-2">Продукти в кошницата</h3>
          <div className="flex items-center justify-center py-4 text-gray-500">
            <span>Невалидни данни на кошницата</span>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <h3 className="text-base font-medium mb-2">Продукти в кошницата</h3>
        <div className="max-h-[30vh] overflow-y-auto pb-2">
          {localCartData.items.map((item: any, index: number) => (
            <div key={index} className="flex items-start gap-2 bg-gray-50/50 p-2 rounded-lg border border-gray-100 mb-2">
              {/* Item content */}
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
                {item.variant_title && !item.title.includes(item.variant_title) && 
                  <p className="text-xs text-gray-500 truncate">{item.variant_title}</p>
                }
                
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
                    {item.original_line_price > item.line_price ? (
                      <>
                        <p className="font-medium text-sm text-red-600">{formatMoney(item.line_price)}</p>
                        <p className="text-xs text-gray-500 line-through">
                          {formatMoney(item.original_line_price)}
                        </p>
                      </>
                    ) : (
                      <p className="font-medium text-sm">{formatMoney(item.line_price)}</p>
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

  // Add back the order summary function
  const renderOrderSummary = () => {
    if (!localCartData) return null;
    
    const totalWithShipping = localCartData.total_price + shippingCost;
    
    // Calculate the total original price by summing up all items' original prices
    const originalTotalPrice = localCartData.items.reduce(
      (sum: number, item: any) => sum + item.original_line_price, 
      0
    );
    
    // Determine if there are any discounts
    const hasDiscount = originalTotalPrice > localCartData.total_price;
    
    // Calculate the actual discount amount
    const actualDiscount = originalTotalPrice - localCartData.total_price;
    
    return (
      <div className="border-t border-b py-3 space-y-2">
        <div className="flex justify-between text-sm">
          <span>Междинна сума</span>
          {hasDiscount ? (
            <div className="text-right">
              <span className="text-gray-500 line-through mr-2">{formatMoney(originalTotalPrice)}</span>
              <span>{formatMoney(localCartData.total_price)}</span>
            </div>
          ) : (
            <span>{formatMoney(localCartData.total_price)}</span>
          )}
        </div>
        
        {actualDiscount > 0 && (
          <div className="flex justify-between text-sm text-red-600">
            <span>Отстъпка</span>
            <span>-{formatMoney(actualDiscount)}</span>
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

  // Add the updateQuantity and removeItem functions
  // Handle quantity changes
  const updateQuantity = (itemIndex: number, newQuantity: number) => {
    if (!localCartData || newQuantity < 1) return;
    
    const updatedCart = JSON.parse(JSON.stringify(localCartData));
    const item = updatedCart.items[itemIndex];
    
    // Calculate the price per item (current price)
    const pricePerItem = item.line_price / item.quantity;
    
    // Calculate the original price per item (may be different if on sale)
    const originalPricePerItem = item.original_line_price / item.quantity;
    
    // Update quantity
    item.quantity = newQuantity;
    
    // Update line prices
    item.line_price = pricePerItem * newQuantity;
    item.original_line_price = originalPricePerItem * newQuantity;
    
    // Update cart totals
    updatedCart.total_price = updatedCart.items.reduce((sum: number, item: any) => sum + item.line_price, 0);
    updatedCart.items_subtotal_price = updatedCart.items.reduce((sum: number, item: any) => sum + item.line_price, 0);
    updatedCart.item_count = updatedCart.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
    
    // Update total discount if on sale
    if (originalPricePerItem > pricePerItem) {
      updatedCart.total_discount = updatedCart.items.reduce(
        (sum: number, item: any) => {
          const itemOriginalPrice = item.original_line_price;
          const itemCurrentPrice = item.line_price;
          return sum + (itemOriginalPrice - itemCurrentPrice);
        }, 
        0
      );
    }
    
    setLocalCartData(updatedCart);
  };

  // Handle item removal
  const removeItem = (itemIndex: number) => {
    if (!localCartData) return;
    
    const updatedCart = JSON.parse(JSON.stringify(localCartData));
    const itemToRemove = updatedCart.items[itemIndex];
    
    const priceToSubtract = itemToRemove.line_price;
    
    updatedCart.items.splice(itemIndex, 1);
    
    updatedCart.total_price -= priceToSubtract;
    updatedCart.items_subtotal_price -= priceToSubtract;
    updatedCart.item_count -= itemToRemove.quantity;
    
    // If this was the last item, close the form
    if (updatedCart.items.length === 0) {
      onOpenChange(false);
      // Notify parent window to close iframe
      if (typeof window !== 'undefined' && window.parent) {
        window.parent.postMessage('checkout-closed', '*');
      }
    }
    
    setLocalCartData(updatedCart);
  };

  // Step 1: Cart Review Component
  const CartReviewStep = () => {
    return (
      <div className="space-y-6">
        {renderCartSummary()}
        {renderOrderSummary()}
      </div>
    );
  };

  // Step 2: Shipping Method Component
  const ShippingMethodStep = () => {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold mb-4">Изберете начин на доставка</h2>
          <FormField
            control={form.control}
            name="shippingMethod"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormControl>
                  <RadioGroup
                    onValueChange={(value) => {
                      field.onChange(value);
                      // Update shipping cost immediately
                      setShippingCost(SHIPPING_COSTS[value as keyof typeof SHIPPING_COSTS]);
                    }}
                    defaultValue={field.value}
                    className="flex flex-col gap-4"
                  >
                    <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <RadioGroupItem value="speedy" id="speedy" className="h-5 w-5" />
                      <div className="grid flex-1 gap-1">
                        <div className="flex items-center">
                          {getShippingMethodIcon("speedy")}
                          <label htmlFor="speedy" className="ml-2 text-base font-medium cursor-pointer">
                            Доставка до офис на Спиди
                          </label>
                        </div>
                        <div className="ml-7 text-sm text-gray-500">
                          Доставка до офис на Спиди в цялата страна
                        </div>
                      </div>
                      <div className="text-sm font-medium">
                        {formatMoney(SHIPPING_COSTS.speedy)}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <RadioGroupItem value="econt" id="econt" className="h-5 w-5" />
                      <div className="grid flex-1 gap-1">
                        <div className="flex items-center">
                          {getShippingMethodIcon("econt")}
                          <label htmlFor="econt" className="ml-2 text-base font-medium cursor-pointer">
                            Доставка до офис на Еконт
                          </label>
                        </div>
                        <div className="ml-7 text-sm text-gray-500">
                          Доставка до офис на Еконт в цялата страна
                        </div>
                      </div>
                      <div className="text-sm font-medium">
                        {formatMoney(SHIPPING_COSTS.econt)}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <RadioGroupItem value="address" id="address" className="h-5 w-5" />
                      <div className="grid flex-1 gap-1">
                        <div className="flex items-center">
                          {getShippingMethodIcon("address")}
                          <label htmlFor="address" className="ml-2 text-base font-medium cursor-pointer">
                            Доставка до адрес
                          </label>
                        </div>
                        <div className="ml-7 text-sm text-gray-500">
                          Доставка до вашия адрес
                        </div>
                      </div>
                      <div className="text-sm font-medium">
                        {formatMoney(SHIPPING_COSTS.address)}
                      </div>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="pt-4">
          <h3 className="text-base font-medium mb-2">Обобщение на поръчката</h3>
          {renderOrderSummary()}
        </div>
      </div>
    );
  };

  // Step 3: Customer Details Component
  const CustomerDetailsStep = () => {
    const shippingMethod = form.watch("shippingMethod");
    
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold mb-4">Вашите данни</h2>
        
        {/* Personal Info - Always visible */}
        <div className="space-y-4 border-b pb-6">
          <h3 className="text-base font-semibold">Лична информация</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Име <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Въведете вашето име"
                      {...field}
                      className="h-11"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Фамилия <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Въведете вашата фамилия"
                      {...field}
                      className="h-11"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Телефон <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Телефон за връзка"
                      type="tel"
                      {...field}
                      className="h-11"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Имейл</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="За получаване на известия"
                      type="email"
                      {...field}
                      className="h-11"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        
        {/* Shipping Address - Conditional based on shipping method */}
        <div className="space-y-4 pt-2">
          <h3 className="text-base font-semibold">Адрес за доставка</h3>
          
          {/* If office delivery (Speedy or Econt) */}
          {(shippingMethod === 'speedy' || shippingMethod === 'econt') && (
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="officeCity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Град <span className="text-red-500">*</span></FormLabel>
                    <Combobox
                      options={citySuggestions}
                      placeholder="Изберете град"
                      loading={loadingCities}
                      value={field.value ?? ""}
                      onChange={(value) => {
                        handleCitySelected(value, 'officeCity');
                      }}
                      onSearch={(value) => {
                        debouncedSearchCities(value);
                        setSearchCity(value);
                      }}
                      className="h-11"
                      isMobile={isMobile}
                    />
                    {form.formState.errors.officeCity && (
                      <p className="text-sm font-medium text-red-500 mt-1">
                        {form.formState.errors.officeCity.message}
                      </p>
                    )}
                  </FormItem>
                )}
              />
              
              {form.watch('officeCity') && (
                <FormField
                  control={form.control}
                  name="officeAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Офис <span className="text-red-500">*</span></FormLabel>
                      <Combobox
                        options={officeSuggestions}
                        placeholder={`Изберете офис на ${shippingMethod === 'speedy' ? 'Спиди' : 'Еконт'}`}
                        loading={loadingOffices}
                        value={field.value ?? ""}
                        onChange={(value) => {
                          field.onChange(value);
                          handleOfficeSelected(value);
                        }}
                        className="h-11"
                        isMobile={isMobile}
                      />
                      {form.formState.errors.officeAddress && (
                        <p className="text-sm font-medium text-red-500 mt-1">
                          {form.formState.errors.officeAddress.message}
                        </p>
                      )}
                    </FormItem>
                  )}
                />
              )}
            </div>
          )}
          
          {/* If address delivery */}
          {shippingMethod === 'address' && (
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Град <span className="text-red-500">*</span></FormLabel>
                    <Combobox
                      options={citySuggestions}
                      placeholder="Изберете град"
                      loading={loadingCities}
                      value={field.value ?? ""}
                      onChange={(value) => {
                        handleCitySelected(value, 'city');
                      }}
                      onSearch={(value) => {
                        debouncedSearchCities(value);
                        setSearchCity(value);
                      }}
                      className="h-11"
                      isMobile={isMobile}
                    />
                    {form.formState.errors.city && (
                      <p className="text-sm font-medium text-red-500 mt-1">
                        {form.formState.errors.city.message}
                      </p>
                    )}
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="street"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Улица/Комплекс <span className="text-red-500">*</span></FormLabel>
                      <Combobox
                        options={filteredStreetSuggestions}
                        placeholder="Улица/Комплекс"
                        loading={loadingStreets}
                        value={field.value ?? ""}
                        onChange={(value) => {
                          field.onChange(value);
                        }}
                        onSearch={(value) => {
                          setSearchStreet(value);
                        }}
                        className="h-11"
                        isMobile={isMobile}
                      />
                      {form.formState.errors.street && (
                        <p className="text-sm font-medium text-red-500 mt-1">
                          {form.formState.errors.street.message}
                        </p>
                      )}
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Номер <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Номер/Блок"
                          {...field}
                          className="h-11"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="entrance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Вход</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Вход"
                          {...field}
                          className="h-11"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="floor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Етаж</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Етаж"
                          {...field}
                          className="h-11"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="apartment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Апартамент</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ап."
                          {...field}
                          className="h-11"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Пощенски код <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Пощенски код"
                        {...field}
                        className="h-11 max-w-[200px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>
        
        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Бележки към поръчката</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Допълнителни инструкции за доставката"
                  {...field}
                  className="h-11"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    );
  };

  // Step 4: Payment Summary & Confirmation
  const PaymentStep = () => {
    if (!localCartData) return null;
    
    const totalWithShipping = localCartData.total_price + shippingCost;
    
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold mb-4">Преглед и потвърждение</h2>
        
        {/* Summary of order */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <h3 className="font-semibold">Обобщение на поръчката</h3>
          
          {/* Products summary */}
          <div className="space-y-2">
            {localCartData.items.map((item: any, index: number) => (
              <div key={index} className="flex justify-between text-sm py-1">
                <span>{item.quantity}x {item.title}</span>
                <span>{formatMoney(item.line_price)}</span>
              </div>
            ))}
          </div>
          
          {/* Order totals */}
          {renderOrderSummary()}
        </div>
        
        {/* Customer info summary */}
        <div className="space-y-3">
          <h3 className="font-semibold">Информация за доставка</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm font-medium mb-1">Адрес за доставка</div>
              <div className="text-sm">
                {form.getValues('shippingMethod') === 'address' ? (
                  <>
                    {form.getValues('city')}<br />
                    {form.getValues('street')} {form.getValues('number')}
                    {form.getValues('entrance') && `, вх. ${form.getValues('entrance')}`}
                    {form.getValues('floor') && `, ет. ${form.getValues('floor')}`}
                    {form.getValues('apartment') && `, ап. ${form.getValues('apartment')}`}<br />
                    {form.getValues('postalCode')}
                  </>
                ) : (
                  <>
                    {form.getValues('officeCity')}<br />
                    {form.getValues('officeAddress')}
                  </>
                )}
              </div>
            </div>
            
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm font-medium mb-1">Контактна информация</div>
              <div className="text-sm">
                {form.getValues('firstName')} {form.getValues('lastName')}<br />
                {form.getValues('phone')}<br />
                {form.getValues('email')}
              </div>
            </div>
          </div>
        </div>
        
        {/* Payment method */}
        <div className="space-y-3">
          <h3 className="font-semibold">Метод на плащане</h3>
          
          <div className="bg-gray-50 p-4 rounded-lg flex items-center">
            <CreditCardIcon className="h-5 w-5 mr-2 text-gray-500" />
            <div className="font-medium">Наложен платеж</div>
          </div>
        </div>
        
        {/* Terms agreement */}
        <div className="pt-2">
          <div className="flex items-start">
            <input 
              type="checkbox" 
              id="terms" 
              className="mt-1 mr-2"
            />
            <label htmlFor="terms" className="text-sm">
              Прочетох и съм съгласен с <a href="#" className="text-blue-600 underline">Общите условия</a> и <a href="#" className="text-blue-600 underline">Политиката за поверителност</a>
            </label>
          </div>
        </div>
      </div>
    );
  };

  // Function to handle form submission
  const handleSubmitOrder = async () => {
    if (!localCartData) return;
    
    setIsSubmitting(true);
    setSubmitStatus('loading');
    
    try {
      // Get all form values
      const formValues = form.getValues();
      
      // Construct the address based on the shipping method
      let address = '';
      if (formValues.shippingMethod === 'address') {
        address = formValues.street + ' ' + formValues.number;
        if (formValues.entrance) address += ', вх. ' + formValues.entrance;
        if (formValues.floor) address += ', ет. ' + formValues.floor;
        if (formValues.apartment) address += ', ап. ' + formValues.apartment;
      } else {
        address = formValues.officeAddress || '';
      }
      
      // Create form data to submit
      const formData = {
        first_name: formValues.firstName,
        last_name: formValues.lastName,
        phone: formValues.phone,
        email: formValues.email || '',
        shipping_method: formValues.shippingMethod,
        city: formValues.shippingMethod === 'address' ? formValues.city : formValues.officeCity,
        address: address,
        postal_code: formValues.shippingMethod === 'address' ? formValues.postalCode : '',
        note: formValues.note || '',
        payment_method: 'cod',
        cart_token: localCartData.token || '',
        cart_items: localCartData.items,
        total_price: localCartData.total_price + shippingCost,
        shipping_price: shippingCost
      };

      console.log('Submitting order:', formData);
      
      // Send data to parent window
      if (typeof window !== 'undefined' && window.parent) {
        window.parent.postMessage({
          type: 'submit-checkout',
          formData
        }, '*');
        
        // Wait for 2 seconds to show success message
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Show success and close
        setSubmitStatus('success');
        
        // Close the form after showing success
        setTimeout(() => {
          onOpenChange(false);
        }, 2000);
      }
    } catch (error) {
      console.error('Error submitting order:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={handleDialogClose}
      modal={true}
    >
      <DialogContent 
        className={`p-0 gap-0 bg-white overflow-hidden flex flex-col
          ${isMobile ? 'w-full h-full max-h-full rounded-none' : 'sm:max-w-[500px] max-h-[90vh]'}`}
      >
        {/* Step indicator */}
        <div className="px-4 py-3 bg-white border-b sticky top-0 z-40">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-medium tracking-tight text-black">
              {steps[currentStep].title}
            </DialogTitle>
            <DialogClose className="rounded-full opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2" asChild>
              <button onClick={() => handleDialogClose(false)}>
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </button>
            </DialogClose>
          </div>
          
          {/* Progress bar */}
          <div className="flex mt-4 mb-1">
            {steps.map((step, index) => (
              <div key={index} className="flex-1 px-1 first:pl-0 last:pr-0">
                <div 
                  className={`h-1 rounded-full ${index <= currentStep ? 'bg-blue-600' : 'bg-gray-200'} transition-all duration-300`}
                ></div>
              </div>
            ))}
          </div>
        </div>

        <Form {...form}>
          {/* Main content area with steps */}
          <div className="flex-1 overflow-y-auto p-4 dialog-content-scroll">
            {!localCartData ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600">Зареждане на данните...</p>
              </div>
            ) : (
              <div>
                {currentStep === 0 && <CartReviewStep />}
                {currentStep === 1 && <ShippingMethodStep />}
                {currentStep === 2 && <CustomerDetailsStep />}
                {currentStep === 3 && <PaymentStep />}
              </div>
            )}
          </div>
          
          {/* Fixed bottom navigation */}
          <div className="p-4 border-t bg-white sticky bottom-0 z-30">
            {submitStatus === 'success' ? (
              <div className="flex items-center justify-center p-2 bg-green-50 text-green-700 rounded-md mb-4">
                <CheckIcon className="h-5 w-5 mr-2" />
                <span>Вашата поръчка е приета успешно!</span>
              </div>
            ) : submitStatus === 'error' ? (
              <div className="flex items-center justify-center p-2 bg-red-50 text-red-700 rounded-md mb-4">
                <span>Възникна грешка. Моля, опитайте отново.</span>
              </div>
            ) : null}
            
            <div className="flex gap-3">
              {currentStep > 0 && (
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={prevStep} 
                  className="flex-1 h-11"
                  disabled={isSubmitting}
                >
                  Назад
                </Button>
              )}
              
              {currentStep < steps.length - 1 ? (
                <Button 
                  type="button"
                  onClick={nextStep} 
                  className="flex-1 h-11"
                  disabled={isSubmitting || !localCartData || localCartData.items.length === 0}
                >
                  Продължи
                </Button>
              ) : (
                <Button 
                  type="button"
                  onClick={handleSubmitOrder} 
                  className="flex-1 h-11 bg-green-600 hover:bg-green-700"
                  disabled={isSubmitting || !localCartData || localCartData.items.length === 0}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white mr-2"></div>
                      Обработване...
                    </>
                  ) : (
                    'Завърши поръчката'
                  )}
                </Button>
              )}
            </div>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 