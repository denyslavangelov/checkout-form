"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { X, Trash2, Home, Route, Building2, CheckIcon, CreditCardIcon } from "lucide-react"
import { useState, useEffect, useCallback, useRef } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { ComboboxOption, Combobox } from "@/components/ui/combobox"
import { cn, debounce } from "@/lib/utils"

// Add custom styles for animations
import "./popup-animations.css"

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
    message: "Устиетот/комплексът трябва да бъде поне 2 символа.",
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

  // States for checkout flow and UI 
  const [localCartData, setLocalCartData] = useState<any | null>(null);
  const [showThankYou, setShowThankYou] = useState(false);
  const [showFollowUpPopup, setShowFollowUpPopup] = useState(false);
  const thankYouTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  
  // Add an ordered flow state to better control the sequence
  const [orderFlowStep, setOrderFlowStep] = useState<'idle' | 'processing' | 'thank-you' | 'upsell' | 'completed'>('idle');
  
  // Form setup with react-hook-form and zod validation
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

    // Check for new Buy Now structure with nested product field and price object
    if (data.price && data.product && typeof data.price.amount === 'number') {
      console.log('Detected new Buy Now format with price object and nested product:', data);
      
      // Extract price from price object - convert from dollars to cents
      const price = Math.round(data.price.amount * 100); // Convert to cents and ensure it's a whole number
      const currency = data.price.currencyCode || 'BGN';
      
      // Find the best available image
      let imageUrl = null;
      if (data.image && data.image.src) {
        imageUrl = data.image.src;
      } else if (data.product.featuredImage) {
        imageUrl = data.product.featuredImage.src;
      }
      
      // Use product title from the nested product object
      const productTitle = data.product.title || 'Product';
      // Use variant title from root title if different from product title
      const variantTitle = data.title !== data.product.title ? data.title : '';
      
      // Log the conversion for debugging
      console.log('Price conversion:', {
        originalAmount: data.price.amount,
        convertedCents: price,
        calculatedLinePrice: price * (data.quantity || 1)
      });
      
      return {
        items: [{
          id: data.id,
          title: productTitle,
          quantity: data.quantity || 1,
          price: price,
          line_price: price * (data.quantity || 1),
          original_line_price: price * (data.quantity || 1),
          variant_id: data.id,
          product_id: data.product.id,
          sku: data.sku || '',
          variant_title: variantTitle,
          vendor: data.product.vendor || '',
          image: imageUrl,
          requires_shipping: true
        }],
        total_price: price * (data.quantity || 1),
        items_subtotal_price: price * (data.quantity || 1),
        total_discount: 0,
        item_count: data.quantity || 1,
        currency: currency
      };
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
          
          // Check if it's the new Buy Now format with nested product structure
          if (productData.price && productData.product) {
            console.log('Found product in window.buyNowProduct with new format, normalizing directly');
            const buyNowNormalizedData = normalizeCartData(productData);
            
            if (buyNowNormalizedData && buyNowNormalizedData.items.length > 0) {
              setLocalCartData(buyNowNormalizedData);
              
              // Return loading while we update
              return (
                <div className="space-y-2">
                  <h3 className="text-base font-medium mb-2">Продукти в кошницата</h3>
                  <div className="flex flex-col items-center justify-center py-6 space-y-2 text-gray-500">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-600"></div>
                    <span>Обработване на данните...</span>
                  </div>
                </div>
              );
            }
          }
        } else if (localCartData.product) {
          console.log('Found product in localCartData.product');
          productData = localCartData.product;
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

  // Initialize cart data when form opens - REMOVE this duplicate declaration
  // const [localCartData, setLocalCartData] = useState<any>(null);
  
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

            // If it's the new Buy Now format with nested product structure, pass directly to normalizeCartData
            if (event.data.product.price && event.data.product.product) {
              console.log('Detected new Buy Now format, normalizing directly');
              const buyNowNormalizedData = normalizeCartData(event.data.product);
              console.log('Normalized new Buy Now product:', buyNowNormalizedData);
              if (buyNowNormalizedData && buyNowNormalizedData.items.length > 0) {
                setLocalCartData(buyNowNormalizedData);
                return; // Skip further processing
              }
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
          
          const normalizedData = normalizeCartData(mergedData);
          console.log('After normalization:', {
            normalizedData,
            hasItems: !!(normalizedData?.items && normalizedData.items.length > 0)
          });
          
      if (normalizedData) {
            console.log('Setting cart data from message');
        setLocalCartData(normalizedData);
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

  // Add effect to handle thank you page and follow-up popup timing
  useEffect(() => {
    if (submitStatus === 'success') {
      if (orderFlowStep === 'idle') {
        console.log('🚀 Order successful, setting flow to thank-you');
        setOrderFlowStep('thank-you');
        
        // Show thank you message
        setShowThankYou(true);
        
        // Set a timer to show the upsell popup after 2 seconds
        const upsellTimer = setTimeout(() => {
          console.log('⭐ Moving from thank-you to upsell step');
          setOrderFlowStep('upsell');
          setShowFollowUpPopup(true);
        }, 2000);
        
        // Cleanup timer if component unmounts
        return () => clearTimeout(upsellTimer);
      }
    }
  }, [submitStatus, orderFlowStep]);

  // Add separate effect to log when flow state changes
  useEffect(() => {
    console.log('👀 Order flow step changed:', orderFlowStep);
  }, [orderFlowStep]);

  // Handle dialog close
  const handleDialogClose = (forcedClose = false) => {
    // Don't close if we're in the thank-you or upsell flow, unless forced
    if (!forcedClose && (orderFlowStep === 'thank-you' || orderFlowStep === 'upsell')) {
      console.log('🛑 Prevented dialog close during order completion flow');
      return;
    }

    console.log('👋 Closing checkout dialog');
    
    // First notify parent window to close iframe
    if (typeof window !== 'undefined' && window.parent) {
      window.parent.postMessage({ type: 'checkout-closed' }, '*');
      
      // Wait for parent to handle cleanup
      const cleanup = new Promise((resolve) => {
        const handler = (event: MessageEvent) => {
          if (event.data.type === 'checkout-cleanup-done') {
            window.removeEventListener('message', handler);
            resolve(true);
          }
        };
        window.addEventListener('message', handler);
        
        // Fallback timeout in case parent doesn't respond
        setTimeout(() => {
          window.removeEventListener('message', handler);
          resolve(false);
        }, 300);
      });
      
      // Close the form after cleanup
      cleanup.then(() => {
        onOpenChange(false);
      });
    } else {
      // If no parent window, just close the form
      onOpenChange(false);
    }
  };
  
  // Check if cart is empty and close the form if it is
  useEffect(() => {
    // Only close form if cart is empty and we've actually received cart data
    // This prevents closing immediately on initial load when data might not be ready yet
    if (localCartData && localCartData.items && localCartData.items.length === 0) {
      // Don't close the form if we're showing thank you page or popup
      if (orderFlowStep === 'thank-you' || orderFlowStep === 'upsell') {
        return;
      }
      
      // Don't close the form if we're waiting for cart data
      // Special handling for Buy Now: don't close if cart type is buy_now
      const isBuyNowData = 
        localCartData.cart_type === 'buy_now' || 
        localCartData.source === 'buy_now_button' || 
        cartData?.cart_type === 'buy_now' || 
        cartData?.source === 'buy_now_button';

      // Also check URL for buyNow parameter
      const isBuyNowFromUrl = typeof window !== 'undefined' && 
        window.location.href.includes('buyNow=true');
      
      console.log('Cart is empty. Buy Now context?', { 
        isBuyNowData, 
        isBuyNowFromUrl,
        localCartData, 
        cartData 
      });
      
      // Only close if it's not a Buy Now attempt
      if (!isBuyNowData && !isBuyNowFromUrl) {
        handleDialogClose();
      }
    }
  }, [localCartData, cartData, orderFlowStep]);

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

  // Clear relevant address fields when shipping method changes
  useEffect(() => {
    // Clear relevant address fields when shipping method changes
    // This ensures users start fresh with each shipping method
    form.setValue('officeCity', '');
    form.setValue('officeAddress', '');
    form.setValue('officePostalCode', '');
    
    // Clear personal address fields if relevant
    if (selectedShippingMethod !== 'address') {
      form.setValue('city', '');
      form.setValue('postalCode', '');
      form.setValue('address', '');
      form.setValue('street', '');
      form.setValue('number', '');
      form.setValue('entrance', '');
      form.setValue('floor', '');
      form.setValue('apartment', '');
      setStreetSuggestions([]);
      setFilteredStreetSuggestions([]);
    }
    
    // Reset the selected city ID and suggestions
    setSelectedCityId(null);
    setOfficeSuggestions([]);
    setCitySuggestions([]);
    setFilteredOfficeSuggestions([]);
    setSearchCity("");
    setSearchStreet("");
    
    console.log('Cleared address fields due to shipping method change:', selectedShippingMethod);
  }, [selectedShippingMethod, form, setSelectedCityId, setOfficeSuggestions, setCitySuggestions, setFilteredOfficeSuggestions, setStreetSuggestions, setFilteredStreetSuggestions]);

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

  // Handle quantity changes
  const updateQuantity = (itemIndex: number, newQuantity: number) => {
    if (!localCartData || newQuantity < 1) return;
    
    const updatedCart = JSON.parse(JSON.stringify(localCartData));
    const item = updatedCart.items[itemIndex];
    
    // Calculate the price per item (current price)
    const pricePerItem = item.line_price / item.quantity;
    
    // Calculate the original price per item (may be different if on sale)
    const originalPricePerItem = item.original_line_price / item.quantity;
    
    // Check if item is on sale
    const isOnSale = originalPricePerItem > pricePerItem;
    
    console.log('Updating quantity:', {
      item: item.title,
      oldQuantity: item.quantity,
      newQuantity,
      pricePerItem,
      originalPricePerItem,
      isOnSale,
      oldLinePrice: item.line_price,
      oldOriginalLinePrice: item.original_line_price,
      newLinePrice: pricePerItem * newQuantity,
      newOriginalLinePrice: originalPricePerItem * newQuantity
    });
    
    // Update quantity
    item.quantity = newQuantity;
    
    // Update line prices
    item.line_price = pricePerItem * newQuantity;
    item.original_line_price = originalPricePerItem * newQuantity;
    
    // Update cart totals
    updatedCart.total_price = updatedCart.items.reduce((sum: number, item: any) => sum + item.line_price, 0);
    updatedCart.items_subtotal_price = updatedCart.items.reduce((sum: number, item: any) => sum + item.line_price, 0);
    updatedCart.item_count = updatedCart.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
    
    // Update total discount
    if (isOnSale) {
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
    
    // If this was the last item, close the form only if not showing thank you or popup
    if (updatedCart.items.length === 0 && !showThankYou && !showFollowUpPopup) {
      handleDialogClose();
    }
    
    setLocalCartData(updatedCart);
  };

  // Update the cart summary rendering logic to show a better loading state
  const renderCartSummary = () => {
    // Debug cart data
    console.log('Cart is empty. Buy Now context?', {
      isBuyNowData: localCartData?.cart_type === 'buy_now' || localCartData?.source === 'buy_now_button',
      isBuyNowFromUrl: typeof window !== 'undefined' && window.location.href.includes('buyNow=true'),
      localCartData,
      cartData
    });
    
    // Special handling for Buy Now with empty cart
    if (localCartData && localCartData.items && localCartData.items.length === 0) {
      // Check if we're in Buy Now context
      const isBuyNowContext = localCartData.cart_type === 'buy_now' || 
                            localCartData.source === 'buy_now_button' ||
                            (typeof window !== 'undefined' && window.location.href.includes('buyNow=true'));
      
      if (isBuyNowContext) {
        console.log('Buy Now context detected with empty cart, looking for product data');
        
        // Try to get product data from window
        let productData = null;
        
        if (typeof window !== 'undefined') {
          // Try various sources
          if ((window as any).buyNowProduct) {
            console.log('Found product in window.buyNowProduct');
            productData = (window as any).buyNowProduct;
            
            // Check if it's the new Buy Now format with nested product structure
            if (productData.price && productData.product) {
              console.log('Found product in window.buyNowProduct with new format, normalizing directly');
              const buyNowNormalizedData = normalizeCartData(productData);
              
              if (buyNowNormalizedData && buyNowNormalizedData.items.length > 0) {
                setLocalCartData(buyNowNormalizedData);
                
                // Return loading while we update
      return (
        <div className="space-y-2">
                    <h3 className="text-base font-medium mb-2">Продукти в кошницата</h3>
                    <div className="flex flex-col items-center justify-center py-6 space-y-2 text-gray-500">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-600"></div>
                      <span>Обработване на данните...</span>
          </div>
                  </div>
                );
              }
            }
          } else if (localCartData.product) {
            console.log('Found product in localCartData.product');
            productData = localCartData.product;
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
            
            // Check if it's the new Buy Now format
            if (productData.price && productData.product) {
              const buyNowNormalizedData = normalizeCartData(productData);
              if (buyNowNormalizedData && buyNowNormalizedData.items.length > 0) {
                setLocalCartData(buyNowNormalizedData);
                
                // Return loading while we update
                return (
                  <div className="space-y-2">
                    <h3 className="text-base font-medium mb-2">Продукти в кошницата</h3>
                    <div className="flex flex-col items-center justify-center py-6 space-y-2 text-gray-500">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-600"></div>
                      <span>Обработване на данните...</span>
          </div>
        </div>
      );
              }
            }
            
            // Legacy format - update the cart with this product
            const updatedCart = {
              ...localCartData,
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
                image: productData.image?.src || productData.featured_image || null,
                requires_shipping: true
              }],
              total_price: productData.price * (productData.quantity || 1),
              items_subtotal_price: productData.price * (productData.quantity || 1),
              total_discount: productData.compare_at_price ? 
                (productData.compare_at_price - productData.price) * (productData.quantity || 1) : 0,
              item_count: productData.quantity || 1
            };
            
            // Update the local cart data
            setLocalCartData(updatedCart);
            
            // Return loading while we update
  return (
        <div className="space-y-2">
                <h3 className="text-base font-medium mb-2">Продукти в кошницата</h3>
                <div className="flex flex-col items-center justify-center py-6 space-y-2 text-gray-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-600"></div>
                  <span>Обработване на данните...</span>
          </div>
              </div>
            );
          } else {
            // Display error message if no product data found
            return (
              <div className="space-y-2">
                <h3 className="text-base font-medium mb-2">Продукти в кошницата</h3>
                <div className="bg-yellow-50 p-4 rounded-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">Информация за продукта не е намерена</h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>Моля, опитайте отново от страницата на продукта.</p>
                      </div>
                    </div>
                  </div>
          </div>
        </div>
      );
          }
        }
      }
    }
    
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
          {localCartData.items.map((item: any, index: number) => {
            // Debug price values
            console.log(`Item ${index} price check:`, {
              title: item.title,
              line_price: item.line_price,
              original_line_price: item.original_line_price,
              price: item.price,
              quantity: item.quantity,
              hasDiscount: item.original_line_price > item.line_price,
              originalPerItem: item.original_line_price / item.quantity,
              currentPerItem: item.line_price / item.quantity
            });
            
            return (
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
          )})}
        </div>
      </div>
    );
  };
  
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

  // Updated thank you page render function
  const renderThankYouPage = () => {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[300px] text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckIcon className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Благодарим за поръчката!</h2>
        <p className="text-gray-600 mb-4">
          Вашата поръчка беше успешно създадена. Ще получите имейл с потвърждение скоро.
        </p>
        <p className="text-gray-500 text-sm mb-6">
          Поръчката ще бъде обработена възможно най-скоро и ще бъдете уведомени за напредъка.
        </p>
      </div>
    );
  };

  // The renderFollowUpPopup function
  const renderFollowUpPopup = () => {
    // Sample upsell product data - in production this would come from your backend
    const upsellProduct = {
      id: "upsell-product-1",
      title: "Комплект козметика за път",
      price: 1999, // 19.99 in cents
      image: "/assets/upsell-product.jpg", // Replace with actual image path
      description: "Идеален комплект за пътуване с мини версии на най-популярните ни продукти"
    };

    return (
      <div style={{ 
        position: 'fixed', 
        inset: 0, 
        zIndex: 99999,
        backgroundColor: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}>
        <div style={{ 
          position: 'relative',
          background: 'white', 
          borderRadius: '8px', 
          padding: '24px', 
          maxWidth: '90%', 
          width: '400px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '24px', fontWeight: 'bold' }}>Специална оферта!</h3>
            <p style={{ color: '#666', marginTop: '8px' }}>
              Добавете този продукт към вашата поръчка с безплатна доставка:
            </p>
          </div>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px', 
            padding: '12px', 
            backgroundColor: '#f7f7f7', 
            borderRadius: '8px', 
            marginBottom: '20px' 
          }}>
            <img 
              src={"https://via.placeholder.com/80"}
              alt={upsellProduct.title}
              style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px' }}
            />
            
            <div style={{ flex: '1' }}>
              <h4 style={{ fontWeight: '500', fontSize: '16px' }}>{upsellProduct.title}</h4>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>{upsellProduct.description}</p>
              <div style={{ fontWeight: 'bold', color: '#2563eb' }}>{formatMoney(upsellProduct.price)}</div>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button 
              style={{
                backgroundColor: '#2563eb',
                color: 'white',
                padding: '12px',
                borderRadius: '6px',
                fontWeight: 'bold',
                border: 'none',
                cursor: 'pointer'
              }}
              onClick={() => {
                console.log("✅ Add to cart button clicked");
                
                // Add to cart via parent window message
                if (typeof window !== 'undefined' && window.parent) {
                  window.parent.postMessage({ 
                    type: 'add-upsell-product', 
                    product: upsellProduct
                  }, '*');
                }
                
                // Show success toast
                alert("Продуктът е добавен към поръчката ви!");
                
                // Close popup and return to thank you page
                setShowFollowUpPopup(false);
                setOrderFlowStep('completed');
              }}
            >
              Добавете към поръчката
            </button>
            
            <button 
              style={{
                backgroundColor: 'transparent',
                color: '#555',
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid #ddd',
                cursor: 'pointer'
              }}
              onClick={() => {
                console.log("❌ No, thanks button clicked");
                setShowFollowUpPopup(false);
                setOrderFlowStep('completed');
              }}
            >
              Не, благодаря
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Add listener for parent window messages to handle the post-purchase flow
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handlePostPurchaseMessages = (event: MessageEvent) => {
        // Handle order completion message from parent window
        if (event.data?.type === 'order-completed') {
          console.log('Order completed successfully:', event.data);
          
          // Set submission status to success to trigger thank you flow
          setSubmitStatus('success');
        }
        
        // Handle confirmation of upsell product being added to cart
        if (event.data?.type === 'upsell-product-added') {
          console.log('Upsell product successfully added to cart:', event.data);
          
          // Close form after product has been added
          handleDialogClose(true);
        }
      };
      
      window.addEventListener('message', handlePostPurchaseMessages);
      
      return () => {
        window.removeEventListener('message', handlePostPurchaseMessages);
      };
    }
  }, []);

  // Handle form submission
  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (submitStatus === 'loading') return;
    
    console.log('Form submitted with data:', data);
    setSubmitStatus('loading');
    
    try {
      // Prepare the order data including cart items, shipping, payment method
      const orderData = {
        ...data,
        items: localCartData?.items || [],
        total: localCartData?.total_price + shippingCost,
        shippingCost,
        currency: localCartData?.currency || 'BGN'
      };
      
      // Send order data to parent window
      if (typeof window !== 'undefined' && window.parent) {
        window.parent.postMessage({
          type: 'submit-order',
          orderData
        }, '*');
        
        // For demo purposes, simulate success after a delay
        // In production, you'd wait for confirmation from the parent
        setTimeout(() => {
          setSubmitStatus('success');
        }, 1500);
      } else {
        console.error('Could not find parent window to submit order');
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Error submitting order:', error);
      setSubmitStatus('error');
    }
  };

  // Update the DialogContent to use the new flow state
  return (
    <Dialog 
      open={open} 
      onOpenChange={(newOpenState) => {
        // Only allow dialog to close if not showing thank you or popup
        if (newOpenState === false && (orderFlowStep === 'thank-you' || orderFlowStep === 'upsell')) {
          // Prevent automatic closing during thank you/popup sequence
          console.log('🔒 Dialog tried to close automatically but was prevented');
          return;
        }
        handleDialogClose();
      }}
      modal={true}
    >
      <DialogContent 
        className={`sm:max-w-[500px] max-h-[90vh] p-0 gap-0 bg-white overflow-hidden flex flex-col
          ${isMobile ? 'max-w-full h-full max-h-full rounded-none' : ''}`}
        aria-describedby="checkout-form-description"
      >
        {/* Display different content based on the current flow step */}
        {orderFlowStep === 'idle' && (
          <>
            <DialogHeader className="p-6 pb-0">
              <DialogTitle className="text-xl font-bold">Поръчка</DialogTitle>
              <DialogDescription id="checkout-form-description">
                Попълнете адреса си за доставка и метод за плащане.
              </DialogDescription>
              <DialogClose
                className="absolute right-4 top-4 rounded-full p-1.5 opacity-70 hover:bg-gray-100 focus:outline-none"
                onClick={() => handleDialogClose()}
              >
                <X className="h-4 w-4" />
              </DialogClose>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto p-6 pt-2">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  {renderCartSummary()}
                  {renderOrderSummary()}
                  
                  <div className="space-y-4">
                    <h3 className="text-base font-medium">Лични данни</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input placeholder="Име *" {...field} />
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
                            <FormControl>
                              <Input placeholder="Фамилия *" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input placeholder="Телефон *" {...field} />
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
                            <FormControl>
                              <Input placeholder="Имейл" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {/* More form fields omitted for brevity */}
                    
                    <div className="pt-2">
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={submitStatus === 'loading'}
                      >
                        {submitStatus === 'loading' ? (
                          <span className="flex items-center">
                            <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full" /> 
                            Обработване...
                          </span>
                        ) : (
                          <span className="flex items-center">
                            <CreditCardIcon className="mr-2 h-4 w-4" /> 
                            Завърши поръчката
                          </span>
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </Form>
            </div>
          </>
        )}
        
        {/* Show Thank You page if order was successful */}
        {(orderFlowStep === 'thank-you' || orderFlowStep === 'completed') && renderThankYouPage()}
        
        {/* Show Follow-up popup when in upsell step */}
        {orderFlowStep === 'upsell' && renderFollowUpPopup()}
      </DialogContent>
    </Dialog>
  );
} 