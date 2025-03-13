"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { X } from "lucide-react"

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
}

export function CheckoutForm({ open, onOpenChange }: CheckoutFormProps) {
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

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values)
    // Handle form submission here
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 bg-white">
        <DialogHeader className="p-6 pb-2 border-b">
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

        <div className="p-6 pt-4 space-y-6">
          {/* Order Summary */}
          <div className="space-y-4">
            <div className="flex items-start gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
              <div className="relative">
                <img
                  src="https://cdn.shopify.com/s/files/1/0602/7640/8451/files/Screenshot2024-07-08at00-12-32RazorTravelProtectorCasePortableSiliconeRazorCaseCoverWaterproofRazorCarryingCase-BuySafetyRazorTravelProtectorCaseportableRazorCaserubberSafetyTravelSha.png?v=1738601078"
                  alt="Product"
                  className="w-16 h-16 object-cover rounded-lg"
                />
                <span className="absolute -top-2 -right-2 bg-gray-900 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium">
                  2
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-black truncate">Комплект Самобръсначка Colorlamb®</h3>
                <p className="text-sm text-black/70">Лилав</p>
              </div>
              <div className="font-medium text-black">70.00 лв</div>
            </div>

            <div className="space-y-2 text-sm px-1">
              <div className="flex justify-between text-black">
                <span>Междинна сума</span>
                <span>70.00 лв</span>
              </div>
              <div className="flex justify-between text-black">
                <span>Доставка</span>
                <span>Безплатна</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-medium text-base text-black">
                <span>Обща сума</span>
                <span>70.00 лв</span>
              </div>
            </div>
          </div>

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
                Завършете покупката си - 70.00 лв
              </Button>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
} 