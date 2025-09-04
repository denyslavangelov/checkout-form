"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { X, Trash2, Home, Route, Building2 } from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import { CheckIcon } from "lucide-react"
import { CreditCardIcon } from "lucide-react"

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
          id: String(data.id),
          title: productTitle,
          quantity: data.quantity || 1,
          price: price,
          line_price: price * (data.quantity || 1),
          original_line_price: price * (data.quantity || 1),
          variant_id: String(data.id),
          product_id: String(data.product.id),
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
          id: product.variant_id ? String(product.variant_id) : String(product.id),
          title: product.title,
          quantity: product.quantity || 1,
          price: product.price,
          line_price: product.price * (product.quantity || 1),
          original_line_price: (product.compare_at_price || product.price) * (product.quantity || 1),
          variant_id: product.variant_id ? String(product.variant_id) : String(product.id),
          product_id: product.id ? String(product.id) : String(product.variant_id || 'unknown'),
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
      // Ensure all items have proper image field and string IDs
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
          id: item.id ? String(item.id) : String(item.variant_id || 'unknown'),
          variant_id: item.variant_id ? String(item.variant_id) : String(item.id || 'unknown'),
          product_id: item.product_id ? String(item.product_id) : String(item.id || 'unknown'),
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

  // Initialize cart data with a reasonable default
  const [localCartData, setLocalCartData] = useState<any>(null);
  
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

  // Handle dialog close
  const handleDialogClose = () => {
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
  }, [localCartData, cartData, handleDialogClose]);

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

  // Load office address from localStorage when form opens
  useEffect(() => {
    if (open && typeof window !== 'undefined') {
      try {
        const storedOfficeAddress = localStorage.getItem('selectedOfficeAddress');
        if (storedOfficeAddress) {
          const officeAddress = JSON.parse(storedOfficeAddress);
          console.log('🏢 Loading office address from localStorage:', officeAddress);
          
          // Set the office address fields
          form.setValue('officeAddress', officeAddress.address1 || '');
          form.setValue('officeCity', officeAddress.city || '');
          form.setValue('officePostalCode', officeAddress.postalCode || '');
          
          // Set shipping method to speedy (office delivery)
          form.setValue('shippingMethod', 'speedy');
          setSelectedShippingMethod('speedy');
          
          // Clear the stored address after using it
          localStorage.removeItem('selectedOfficeAddress');
        }
      } catch (error) {
        console.error('Error loading office address from localStorage:', error);
      }
    }
  }, [open, form]);

  // Add a state for submit status
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

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
                id: productData.variant_id ? String(productData.variant_id) : String(productData.id),
                title: productData.title,
                quantity: productData.quantity || 1,
                price: productData.price,
                line_price: productData.price * (productData.quantity || 1),
                original_line_price: (productData.compare_at_price || productData.price) * (productData.quantity || 1),
                variant_id: productData.variant_id ? String(productData.variant_id) : String(productData.id),
                product_id: productData.id ? String(productData.id) : String(productData.variant_id || 'unknown'),
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

  return (
    <Dialog 
      open={open} 
      onOpenChange={handleDialogClose}
      modal={true}
    >
      <DialogContent 
        className={`sm:max-w-[500px] max-h-[90vh] p-0 gap-0 bg-white overflow-hidden flex flex-col
          ${isMobile ? 'max-w-full h-full max-h-full rounded-none' : ''}`}
        aria-describedby="checkout-form-description"
      >
        <div className={`overflow-y-auto flex-1 ${isMobile ? 'h-[calc(100vh-64px)]' : ''}`}>
          <DialogHeader className={`p-4 pb-2 border-b fixed top-0 left-0 right-0 z-10 ${isMobile ? 'bg-white' : 'bg-white'}`}>
            <div className="flex items-center justify-between">
          <DialogTitle className="text-lg font-medium tracking-tight text-black">
            Поръчайте с наложен платеж
          </DialogTitle>
            </div>
        </DialogHeader>

        <div id="checkout-form-description" className="sr-only">
          Форма за поръчка с наложен платеж, където можете да въведете данни за доставка и да изберете метод за доставка
          </div>

          {/* Add padding to account for fixed header */}
          <div className="px-4 py-3 space-y-4 mt-14">
          {/* Cart Summary */}
          {renderCartSummary()}

            {/* Form renders when cart data is loaded */}
            {!isLoadingCart && (
          <Form {...form}>
                <form className="space-y-4" onSubmit={async (e) => {
                  e.preventDefault();
                }}>
              {/* Shipping Method */}
                  <div className="p-4 border-t border-gray-200">
                    <h3 className="text-lg font-semibold mb-3">Метод за доставка</h3>
                <FormField
                  control={form.control}
                  name="shippingMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                              className="flex flex-col gap-2"
                            >
                              <div 
                                className={`flex items-center justify-between border border-gray-200 rounded-lg p-3 cursor-pointer hover:bg-gray-50/50 transition-colors ${selectedShippingMethod === "speedy" ? "bg-blue-50/50 border-blue-200" : ""}`}
                                onClick={() => {
                                  form.setValue("shippingMethod", "speedy");
                                  // Trigger onChange to ensure UI updates
                                  const event = new Event("change", { bubbles: true });
                                  document.getElementById("speedy")?.dispatchEvent(event);
                                }}
                              >
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="speedy" id="speedy" className="aspect-square w-4 h-4" />
                              <div className="flex items-center gap-2">
                                {getShippingMethodIcon("speedy")}
                                <label htmlFor="speedy" className="cursor-pointer font-medium text-black text-sm">
                                  Офис на Спиди
                              </label>
                            </div>
                            </div>
                            <span className="text-black text-sm">5.99 лв.</span>
                          </div>
                              <div 
                                className={`flex items-center justify-between border border-gray-200 rounded-lg p-3 cursor-pointer hover:bg-gray-50/50 transition-colors ${selectedShippingMethod === "address" ? "bg-blue-50/50 border-blue-200" : ""}`}
                                onClick={() => {
                                  form.setValue("shippingMethod", "address");
                                  // Trigger onChange to ensure UI updates
                                  const event = new Event("change", { bubbles: true });
                                  document.getElementById("address")?.dispatchEvent(event);
                                }}
                              >
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="address" id="address" className="aspect-square w-4 h-4" />
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

                    <div className="space-y-4">
                      {/* Personal Information Section */}
                      <div className="p-4 border-t border-gray-200">
                        <h3 className="text-lg font-semibold mb-3">Лични данни</h3>
                        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
                  <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
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
                          Телефонсс123<span className="text-red-500 ml-0.5">*</span>
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

                          <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-black text-xs">
                                  Имейл
                                </FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Имейл (не е задължително)" 
                                    type="email" 
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
                      </div>

                      {/* Address Section */}
                      <div className="p-4 border-t border-gray-200">
                        <h3 className="text-lg font-semibold mb-3">
                          {selectedShippingMethod === "address" 
                            ? "Адрес за доставка"
                            : `${getShippingMethodLabel(selectedShippingMethod)}`}
                        </h3>
                        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
                    {selectedShippingMethod !== "address" ? (
                      <>
                              {/* Office delivery fields */}
                              {form.watch('officePostalCode') && (
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
                                          console.log("Personal address city selected in form:", value);
                                    handleCitySelected(value, 'officeCity');
                                  }}
                                  onSearch={(value) => {
                                          console.log("Personal address city search term in form:", value);
                                    debouncedSearchCities(value);
                                    setSearchCity(value);
                                  }}
                                        placeholder="Изберете населено място"
                                  loading={loadingCities}
                                  emptyText={!searchCity ? "Започнете да пишете" : (isMobile ? "Няма намерени градове" : "Няма намерени резултати")}
                                  className="border-gray-200 focus:border-gray-400"
                                  type="city"
                                  isMobile={isMobile}
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
                                    isMobile={isMobile}
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
                              {/* Personal address fields */}
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
                                disabled
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
                                debouncedSearchCities(value);
                                setSearchCity(value);
                              }}
                                        placeholder="Изберете населено място"
                              loading={loadingCities}
                              emptyText={!searchCity ? "Започнете да пишете" : (isMobile ? "Няма намерени градове" : "Няма намерени резултати")}
                              className="border-gray-200 focus:border-gray-400"
                              type="city"
                              isMobile={isMobile}
                            />
                          </div>
                          <FormMessage className="text-red-500 text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="street"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-black text-xs">
                                      Улица/Квартал <span className="text-red-500 ml-0.5">*</span>
                          </FormLabel>
                          <div className="flex-1">
                            <Combobox
                              options={filteredStreetSuggestions}
                              value={field.value || ""}
                              onChange={(value) => {
                                          console.log("Street/complex selected in form:", value);
                                handleStreetSelected(value);
                              }}
                              onSearch={(value) => {
                                          console.log("Street/complex search term in form:", {
                                  term: value,
                                  length: value.length,
                                            totalItems: streetSuggestions.length,
                                            filteredItems: filteredStreetSuggestions.length
                                });
                                handleStreetSearch(value);
                                setSearchStreet(value);
                              }}
                                        placeholder="Изберете улица или квартал"
                              loading={loadingStreets}
                                        emptyText={!selectedCityId ? "Първо изберете град" : (!searchStreet ? "Започнете да пишете" : "Няма намерени резултати")}
                              disabled={!selectedCityId}
                              className="border-gray-200 focus:border-gray-400"
                              type="default"
                              isMobile={isMobile}
                            />
                          </div>
                          <FormMessage className="text-red-500 text-xs" />
                        </FormItem>
                      )}
                    />

                    <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
                      <FormField
                        control={form.control}
                        name="number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-black text-xs">
                                        Номер/Блок<span className="text-red-500 ml-0.5">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input 
                                          placeholder="№/Бл." 
                              autoComplete="new-password"
                              autoCorrect="off"
                              spellCheck="false"
                                disabled={!selectedCityId}
                              {...field}
                                className="rounded-lg border-gray-200 focus:border-gray-400 focus:ring-0 bg-gray-50/50 text-black placeholder:text-black/70 h-9 text-sm"
                            />
                          </FormControl>
                            <FormMessage className="text-red-500 text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>

                              <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-3'} gap-3`}>
                      <FormField
                        control={form.control}
                        name="entrance"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-black text-xs">
                              Вход
                            </FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Вх." 
                                autoComplete="new-password"
                                autoCorrect="off"
                                spellCheck="false"
                                disabled={!selectedCityId}
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
                        name="floor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-black text-xs">
                              Етаж
                            </FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Ет." 
                                autoComplete="new-password"
                                autoCorrect="off"
                                spellCheck="false"
                                disabled={!selectedCityId}
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
                        name="apartment"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-black text-xs">
                              Апартамент
                            </FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Ап." 
                                autoComplete="new-password"
                                autoCorrect="off"
                                spellCheck="false"
                                disabled={!selectedCityId}
                                {...field}
                                className="rounded-lg border-gray-200 focus:border-gray-400 focus:ring-0 bg-gray-50/50 text-black placeholder:text-black/70 h-9 text-sm"
                              />
                            </FormControl>
                            <FormMessage className="text-red-500 text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>
                      </>
                    )}
                        </div>
                      </div>

                      {/* Note Section */}
                      <div className="p-4 border-t border-gray-200">
                        <h3 className="text-lg font-semibold mb-3">Допълнителна информация</h3>
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <FormField
                      control={form.control}
                      name="note"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-black text-xs">
                                  Бележка към поръчката
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

                      <Separator className="my-4" />

                      {/* Payment Method */}
                      <div className="p-4 border-t border-gray-200">
                        <h3 className="text-lg font-semibold mb-3">Начин на плащане</h3>
                        <div className="bg-white rounded-lg border border-gray-200 p-3">
                          <div className="flex items-center">
                            <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center mr-3">
                              <CheckIcon className="h-3 w-3 text-white" />
                            </div>
                            <div className="flex items-center">
                              <CreditCardIcon className="h-5 w-5 text-gray-600 mr-2" />
                              <span className="font-medium">Наложен платеж</span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-500 mt-2 ml-8">Плащане при доставка</p>
                        </div>
                      </div>
                    </div>
                  </form>
                </Form>
              )}
          </div>
        </div>

        <div className="px-4 py-3 border-t">
              <Button
            type="button"
            className={`w-full bg-blue-600 text-white font-medium py-2.5 
              ${isMobile ? 'text-base py-3' : ''}`}
            disabled={!localCartData || submitStatus === 'loading'}
            onClick={async () => {
              console.log('Submit button clicked');
              setSubmitStatus('loading');

              try {
                // Request domain from parent window and wait for response
                let shopifyDomain = null;
                let retryCount = 0;
                const maxRetries = 3;

                while (!shopifyDomain && retryCount < maxRetries) {
                  try {
                    console.log(`Attempting to get Shopify domain (attempt ${retryCount + 1})`);
                    
                    // Send the request
                    window.parent.postMessage({ type: 'GET_SHOPIFY_DOMAIN' }, '*');

                    // Listen for the response with a longer timeout for Firefox
                    shopifyDomain = await new Promise((resolve, reject) => {
                      const timeout = setTimeout(() => {
                        reject(new Error(`Timeout waiting for domain (attempt ${retryCount + 1})`));
                      }, 8000); // Increased timeout to 8 seconds

                      const handler = (event: MessageEvent) => {
                        if (event.data?.type === 'SHOPIFY_DOMAIN_RESPONSE') {
                          clearTimeout(timeout);
                          window.removeEventListener('message', handler);
                          console.log('Received domain response:', event.data);
                          resolve(event.data.domain);
                        }
                      };

                      window.addEventListener('message', handler);
                    });

                    if (shopifyDomain) {
                      console.log('Successfully received Shopify domain:', shopifyDomain);
                      break;
                    }
                  } catch (error) {
                    console.warn(`Domain request attempt ${retryCount + 1} failed:`, error);
                    retryCount++;
                    if (retryCount === maxRetries) {
                      throw new Error('Failed to get Shopify domain after multiple attempts');
                    }
                    // Wait before retrying
                    await new Promise(resolve => setTimeout(resolve, 1000));
                  }
                }

                if (!shopifyDomain) {
                  throw new Error('Could not determine Shopify domain');
                }

                // Clean city name by removing prefixes
                const cleanCityName = (city: string) => {
                  return city.replace(/^(гр\.|с\.|гр|с)\s+/i, '').trim();
                };

                const cityValue = selectedShippingMethod === 'address' ? 
                  form.getValues('city') || '' : 
                  form.getValues('officeCity') || '';

                // Send submit message to parent window
                window.parent.postMessage({
                  type: 'submit-checkout',
                  formData: {
                    shop_domain: shopifyDomain,
                    cartData: localCartData,
                    shippingMethod: selectedShippingMethod,
                    shipping_method: selectedShippingMethod === 'address' ? 'Личен адрес' : 'Офис на Спиди',
                    shipping_price: SHIPPING_COSTS[selectedShippingMethod as keyof typeof SHIPPING_COSTS],
                    shipping_method_data: {
                      type: selectedShippingMethod,
                      name: selectedShippingMethod === 'address' ? 'Личен адрес' : 'Офис на Спиди',
                      price: SHIPPING_COSTS[selectedShippingMethod as keyof typeof SHIPPING_COSTS],
                      price_formatted: `${(SHIPPING_COSTS[selectedShippingMethod as keyof typeof SHIPPING_COSTS] / 100).toFixed(2)} лв.`
                    },
                    firstName: form.getValues('firstName'),
                    lastName: form.getValues('lastName'),
                    phone: form.getValues('phone'),
                    email: form.getValues('email'),
                    city: cleanCityName(cityValue),
                    address: selectedShippingMethod === 'address' ? 
                      `${form.getValues('street')} ${form.getValues('number')}${form.getValues('entrance') ? `, вх. ${form.getValues('entrance')}` : ''}${form.getValues('floor') ? `, ет. ${form.getValues('floor')}` : ''}${form.getValues('apartment') ? `, ап. ${form.getValues('apartment')}` : ''}` 
                      : form.getValues('officeAddress'),
                    postalCode: selectedShippingMethod === 'address' ? form.getValues('postalCode') : form.getValues('officePostalCode'),
                    officePostalCode: form.getValues('officePostalCode'),
                    note: form.getValues('note')
                  }
                }, '*');

                // Listen for response from parent window
                await new Promise((resolve, reject) => {
                  const timeout = setTimeout(() => {
                    reject(new Error('Timeout waiting for order creation'));
                    window.removeEventListener('message', handler);
                  }, 10000);

                  const handler = (event: MessageEvent) => {
                    if (event.data.type === 'order-created') {
                      clearTimeout(timeout);
                      window.removeEventListener('message', handler);
                      resolve(event.data);
                    } else if (event.data.type === 'order-error') {
                      clearTimeout(timeout);
                      window.removeEventListener('message', handler);
                      reject(new Error(event.data.error));
                    }
                  };

                  window.addEventListener('message', handler);
                });

                setSubmitStatus('success');
                console.log('Order created successfully');
              } catch (err) {
                console.error('Error creating order:', err);
                setSubmitStatus('error');
              }
            }}
          >
            {submitStatus === 'loading' ? 'Обработка...' : `Завършете поръчката си (${formatMoney((localCartData?.total_price || 0) + shippingCost).replace(' лв.', '')})`}
              </Button>
          {submitStatus === 'error' && (
            <div className="text-red-500 text-center mt-2">
              Възникна грешка при създаването на поръчката. Моля, опитайте отново или се свържете с нас.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 