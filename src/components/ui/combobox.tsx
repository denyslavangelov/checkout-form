"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export type ComboboxOption = {
  value: string
  label: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value: string
  onChange: (value: string) => void
  onSearch?: (value: string) => void
  placeholder?: string
  emptyText?: string
  className?: string
  disabled?: boolean
  loading?: boolean
}

export function Combobox({
  options,
  value,
  onChange,
  onSearch,
  placeholder = "Изберете...",
  emptyText = "Няма намерени резултати.",
  className,
  disabled = false,
  loading = false,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")
  
  console.log("Combobox render state:", { open, value, disabled, optionsCount: options.length })
  
  const handleButtonClick = React.useCallback(() => {
    console.log("Button clicked, current open state:", open)
    if (!disabled) {
      setOpen(!open)
    }
  }, [open, disabled])
  
  const handleSearchChange = React.useCallback((value: string) => {
    console.log("Search changed:", value)
    setSearchValue(value)
    if (onSearch) {
      onSearch(value)
    }
  }, [onSearch])
  
  const handleSelect = React.useCallback((currentValue: string) => {
    console.log("Item selected:", currentValue)
    onChange(currentValue)
    setOpen(false)
  }, [onChange])
  
  // Reset search when closed
  React.useEffect(() => {
    if (!open) {
      setSearchValue("")
    }
  }, [open])

  const displayValue = React.useMemo(() => {
    if (!value) return placeholder
    const option = options.find(option => option.value === value)
    return option ? option.label : placeholder
  }, [value, options, placeholder])

  return (
    <div className="relative w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            type="button"
            onClick={handleButtonClick}
            className={cn(
              "w-full justify-between h-9 px-3 text-sm rounded-lg",
              "border-gray-200 bg-gray-50/50 text-left font-normal",
              disabled && "opacity-50 cursor-not-allowed",
              className
            )}
            disabled={disabled}
          >
            {displayValue}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-full p-0" 
          align="start"
          sideOffset={4}
          style={{ zIndex: 50 }}
        >
          <Command>
            <CommandInput 
              placeholder={placeholder}
              value={searchValue}
              onValueChange={handleSearchChange}
              className="h-9"
              autoFocus
            />
            <CommandEmpty className="py-2 px-3 text-sm text-gray-500">
              {loading ? "Зареждане..." : emptyText}
            </CommandEmpty>
            <CommandGroup className="max-h-[200px] overflow-auto">
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={handleSelect}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
} 