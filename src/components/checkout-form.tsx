"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { X } from "lucide-react"
import { useState, useEffect } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  shippingMethod: z.string().default("free"),
})

interface CheckoutFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cartData: any | null
}

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
      shippingMethod: "free",
    },
  })

  // Add state for cart data that can be modified
  const [localCartData, setLocalCartData] = useState(cartData);
  
  // Update local cart data when prop changes
  useEffect(() => {
    setLocalCartData(cartData);
  }, [cartData]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log({ ...values, cart: localCartData })
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

  const renderCartSummary = () => {
    if (!localCartData) {
      return <div>Loading cart data...</div>;
    }
    
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Order Summary</h3>
        
        {localCartData.items.map((item: any, index: number) => (
          <div key={index} className="flex items-start gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
            {item.image ? (
              <img
                src={item.image}
                alt={item.title}
                className="w-16 h-16 object-cover rounded-lg"
              />
            ) : (
              <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-gray-500">No image</span>
              </div>
            )}
            
            <div className="flex-1">
              <h4 className="font-medium">{item.title}</h4>
              <div className="text-sm text-gray-500">
                {item.variant_title && <p>{item.variant_title}</p>}
                
                {/* Quantity Selector */}
                <div className="flex items-center mt-2">
                  <span className="mr-2">Quantity:</span>
                  <div className="flex items-center border rounded">
                    <button 
                      type="button"
                      className="px-2 py-0.5 text-gray-600 hover:bg-gray-100"
                      onClick={() => updateQuantity(index, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                    >
                      -
                    </button>
                    <span className="px-2 py-0.5 text-center w-8">{item.quantity}</span>
                    <button 
                      type="button"
                      className="px-2 py-0.5 text-gray-600 hover:bg-gray-100"
                      onClick={() => updateQuantity(index, item.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <p className="font-medium">{formatMoney(item.line_price)}</p>
              {item.original_line_price !== item.line_price && (
                <p className="text-sm text-gray-500 line-through">
                  {formatMoney(item.original_line_price)}
                </p>
              )}
            </div>
          </div>
        ))}
        
        <div className="border-t pt-4">
          <div className="flex justify-between mb-2">
            <span>Subtotal</span>
            <span>{formatMoney(localCartData.items_subtotal_price)}</span>
          </div>
          
          {localCartData.total_discount > 0 && (
            <div className="flex justify-between mb-2 text-green-600">
              <span>Discount</span>
              <span>-{formatMoney(localCartData.total_discount)}</span>
            </div>
          )}
          
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>{formatMoney(localCartData.total_price)}</span>
          </div>
        </div>
      </div>
    );
  };
  
  const formatMoney = (cents: number) => {
    return (cents / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: localCartData?.currency || cartData?.currency || 'USD'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] p-0 gap-0 bg-white overflow-hidden flex flex-col">
        <DialogHeader className="p-6 pb-2 border-b shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-medium tracking-tight text-black">
              Поръчайте с наложен платеж
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-gray-100 rounded-full"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto p-6 pt-4 space-y-6">
          {/* Cart Summary */}
          {renderCartSummary()}

          <Form {...form}>
            <form 
              onSubmit={form.handleSubmit(onSubmit)} 
              className="space-y-6" 
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
            >
              {/* Shipping Method */}
              <div className="space-y-3">
                <h3 className="font-medium text-black">Изберете метод за доставка</h3>
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
                          <div className="flex items-center justify-between border border-gray-200 rounded-xl p-4 cursor-pointer hover:bg-gray-50/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <RadioGroupItem value="free" id="free" />
                              <label htmlFor="free" className="cursor-pointer font-medium text-black">
                                Безплатна доставка
                              </label>
                            </div>
                            <span className="text-black">Безплатна</span>
                          </div>
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <h3 className="text-center font-medium text-black mb-4">
                  Въведете вашия адрес за доставка
                </h3>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-black">
                            Първо име<span className="text-red-500 ml-0.5">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Първо име" 
                              autoComplete="new-password"
                              autoCorrect="off"
                              spellCheck="false"
                              {...field}
                              className="rounded-xl border-gray-200 focus:border-gray-400 focus:ring-0 bg-gray-50/50 text-black placeholder:text-black/70"
                            />
                          </FormControl>
                          <FormMessage className="text-red-500" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-black">
                            Фамилия<span className="text-red-500 ml-0.5">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Фамилия" 
                              autoComplete="new-password"
                              autoCorrect="off"
                              spellCheck="false"
                              {...field}
                              className="rounded-xl border-gray-200 focus:border-gray-400 focus:ring-0 bg-gray-50/50 text-black placeholder:text-black/70"
                            />
                          </FormControl>
                          <FormMessage className="text-red-500" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-black">
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
                            className="rounded-xl border-gray-200 focus:border-gray-400 focus:ring-0 bg-gray-50/50 text-black placeholder:text-black/70"
                          />
                        </FormControl>
                        <FormMessage className="text-red-500" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-black">
                          Адрес<span className="text-red-500 ml-0.5">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Адрес" 
                            autoComplete="new-password"
                            autoCorrect="off"
                            spellCheck="false"
                            {...field}
                            className="rounded-xl border-gray-200 focus:border-gray-400 focus:ring-0 bg-gray-50/50 text-black placeholder:text-black/70"
                          />
                        </FormControl>
                        <FormMessage className="text-red-500" />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-black">
                            Град<span className="text-red-500 ml-0.5">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Град" 
                              autoComplete="new-password"
                              autoCorrect="off"
                              spellCheck="false"
                              {...field}
                              className="rounded-xl border-gray-200 focus:border-gray-400 focus:ring-0 bg-gray-50/50 text-black placeholder:text-black/70"
                            />
                          </FormControl>
                          <FormMessage className="text-red-500" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="postalCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-black">
                            Пощенски код<span className="text-red-500 ml-0.5">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Пощенски код" 
                              autoComplete="new-password"
                              autoCorrect="off"
                              spellCheck="false"
                              {...field}
                              className="rounded-xl border-gray-200 focus:border-gray-400 focus:ring-0 bg-gray-50/50 text-black placeholder:text-black/70"
                            />
                          </FormControl>
                          <FormMessage className="text-red-500" />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gray-900 text-white hover:bg-gray-800 rounded-xl h-12 font-medium"
              >
                Завършете покупката си {localCartData ? `- ${formatMoney(localCartData.total_price)}` : ''}
              </Button>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
} 