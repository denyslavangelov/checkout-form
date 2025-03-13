"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { X, Trash2, Home } from "lucide-react"
import { useState, useEffect } from "react"

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

// SVG components for logos
const SpeedyLogo = () => (
  <svg width="50" height="16" viewBox="0 0 50 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-auto">
    <path d="M11.6395 7.83838L19.0395 5.83838L13.6395 13.8384L20.6395 13.8384" stroke="#DA291C" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const EcontLogo = () => (
  <svg width="50" height="16" viewBox="0 0 50 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-auto">
    <path d="M10 8H16M20 8H26M30 8H40" stroke="#071D49" strokeWidth="4" strokeLinecap="round"/>
    <path d="M14 4V12" stroke="#071D49" strokeWidth="4" strokeLinecap="round"/>
  </svg>
);

export function CheckoutForm({ open, onOpenChange, cartData }: CheckoutFormProps) {
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
    },
  })

  // Add state for cart data that can be modified
  const [localCartData, setLocalCartData] = useState(cartData);
  
  // Track selected shipping method for calculating total
  const [shippingCost, setShippingCost] = useState(SHIPPING_COSTS.speedy);
  
  // Watch for shipping method changes
  const selectedShippingMethod = form.watch("shippingMethod");
  
  // Update shipping cost when shipping method changes
  useEffect(() => {
    setShippingCost(SHIPPING_COSTS[selectedShippingMethod as keyof typeof SHIPPING_COSTS]);
  }, [selectedShippingMethod]);
  
  // Update local cart data when prop changes
  useEffect(() => {
    setLocalCartData(cartData);
  }, [cartData]);

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
          <div className="flex items-center justify-center bg-red-50 rounded-md p-1 h-5 w-5">
            <span className="text-red-600 font-bold text-xs">S</span>
          </div>
        );
      case "econt":
        return (
          <div className="flex items-center justify-center bg-blue-50 rounded-md p-1 h-5 w-5">
            <span className="text-blue-600 font-bold text-xs">E</span>
          </div>
        );
      case "address":
        return <Home className="h-5 w-5 text-gray-500" />;
      default:
        return null;
    }
  };

  const renderCartSummary = () => {
    if (!localCartData) {
      return <div>Зареждане на данните...</div>;
    }
    
    if (localCartData.items.length === 0) {
      return <div className="text-center py-4">Кошницата е празна</div>;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] p-0 gap-0 bg-white overflow-hidden flex flex-col">
        <DialogHeader className="p-4 pb-2 border-b shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-medium tracking-tight text-black">
              Поръчайте с наложен платеж
            </DialogTitle>
            <DialogClose className="h-7 w-7 hover:bg-gray-100 rounded-full flex items-center justify-center">
              <X className="h-4 w-4" />
              <span className="sr-only">Затвори</span>
            </DialogClose>
          </div>
        </DialogHeader>

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
                    {selectedShippingMethod === "address" 
                      ? "Въведете вашия адрес за доставка"
                      : `Изберете ${getShippingMethodLabel(selectedShippingMethod)}`}
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

                    {selectedShippingMethod === "address" ? (
                      <>
                        <FormField
                          control={form.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-black text-xs">
                                Адрес<span className="text-red-500 ml-0.5">*</span>
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Адрес" 
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

                        <div className="grid grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name="city"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-black text-xs">
                                  Град<span className="text-red-500 ml-0.5">*</span>
                                </FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Град" 
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
                        </div>
                      </>
                    ) : (
                      <>
                        <FormField
                          control={form.control}
                          name="officeAddress"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-black text-xs">
                                Изберете офис<span className="text-red-500 ml-0.5">*</span>
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder={`Изберете ${getShippingMethodLabel(selectedShippingMethod)}`}
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
                          name="officeCity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-black text-xs">
                                Град<span className="text-red-500 ml-0.5">*</span>
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Град" 
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
                      </>
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gray-900 text-white hover:bg-gray-800 rounded-lg h-10 font-medium"
                >
                  Завършете покупката
                </Button>
              </form>
            </Form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 