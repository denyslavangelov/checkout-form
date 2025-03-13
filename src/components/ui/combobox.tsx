"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search, MapPin, Building } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export type ComboboxOption = {
  value: string
  label: string
  icon?: React.ReactNode
  type?: 'city' | 'office' | 'default'
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
  type?: 'city' | 'office' | 'default'
}

export function Combobox({
  options,
  value,
  onChange,
  onSearch,
  placeholder = "Търсете населено място...",
  emptyText = "Няма намерени резултати.",
  className,
  disabled = false,
  loading = false,
  type,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  
  console.log("Combobox render state:", { open, value, disabled, optionsCount: options.length })
  
  // Handle clicks outside to close the dropdown
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    
    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open])
  
  // When the dropdown opens, focus the input and clear previous search
  React.useEffect(() => {
    if (open) {
      // Use a small timeout to ensure the dropdown is fully rendered
      const timer = setTimeout(() => {
        if (inputRef.current) {
          console.log("Focusing input element")
          inputRef.current.focus()
        }
      }, 50)
      return () => clearTimeout(timer)
    } else {
      setSearchValue("")
    }
  }, [open])
  
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
  
  const handleSelect = React.useCallback((optionValue: string) => {
    console.log("Item selected:", optionValue)
    onChange(optionValue)
    setOpen(false)
  }, [onChange])

  // Update search value when value prop changes, but only when dropdown is closed
  React.useEffect(() => {
    if (!open) {
      const selectedOption = options.find(opt => opt.value === value)
      if (selectedOption) {
        setSearchValue(selectedOption.label)
      } else {
        setSearchValue("")
      }
    }
  }, [value, options, open])

  const getDisplayText = (option: ComboboxOption) => {
    if (option.type === 'city' || type === 'city') {
      // Extract postal code if it's in parentheses at the end of the label
      const match = option.label.match(/(.*?)(?:\s*\((\d+)\))?$/)
      if (match) {
        const [, city, postalCode] = match
        return postalCode ? `${city.trim()} (${postalCode})` : city
      }
    }
    return option.label
  }

  const displayValue = React.useMemo(() => {
    if (!value) return placeholder
    const option = options.find(option => option.value === value)
    if (!option) return placeholder
    
    return (
      <div className="flex items-center">
        <span className="mr-2">{getOptionIcon(option)}</span>
        <span>{getDisplayText(option)}</span>
      </div>
    )
  }, [value, options, placeholder, type])

  // Update input placeholder based on selection
  const inputPlaceholder = React.useMemo(() => {
    if (value) {
      const option = options.find(opt => opt.value === value)
      if (option) {
        return getDisplayText(option)
      }
    }
    return placeholder
  }, [value, options, placeholder])

  const getOptionIcon = (option: ComboboxOption) => {
    if (option.icon) {
      return option.icon
    }
    
    const optionType = option.type || type
    
    if (optionType === 'city') {
      return <MapPin className="h-4 w-4 text-gray-500" />
    }
    
    if (optionType === 'office') {
      return <Building className="h-4 w-4 text-gray-500" />
    }
    
    return null
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={open}
        type="button"
        onClick={handleButtonClick}
        className={cn(
          "w-full justify-between h-9 px-3 text-sm rounded-lg",
          "border-gray-200 bg-gray-50/50 text-left font-normal",
          "flex items-center transition-colors duration-200",
          "hover:bg-gray-100/50",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        disabled={disabled}
      >
        {displayValue}
        <ChevronsUpDown className={cn(
          "ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform duration-200",
          open && "transform rotate-180"
        )} />
      </Button>
      
      {open && (
        <div 
          className="absolute top-full left-0 w-full z-50 mt-1 rounded-md border border-gray-200 bg-white shadow-lg transition-opacity duration-200"
        >
          <div className="flex flex-col overflow-hidden rounded-md bg-white text-gray-950">
            <div className="flex items-center border-b px-3 sticky top-0 bg-white z-10">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                ref={inputRef}
                value={searchValue}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={inputPlaceholder}
                className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-50"
                autoComplete="off"
              />
            </div>
            <div className="max-h-[300px] overflow-auto p-1 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
              {loading && (
                <div className="py-6 px-3 text-sm text-gray-500 text-center">
                  <div className="inline-block animate-spin mr-2">⏳</div>
                  Зареждане...
                </div>
              )}
              
              {!loading && options.length === 0 && (
                <div className="py-6 px-3 text-sm text-gray-500 text-center flex items-center justify-center">
                  <Search className="mr-2 h-4 w-4 opacity-50" />
                  {emptyText}
                </div>
              )}
              
              {options.map((option) => (
                <div
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none",
                    "transition-colors duration-150",
                    "hover:bg-gray-100 hover:text-gray-900",
                    value === option.value && "bg-gray-100/80"
                  )}
                >
                  <span className="mr-2 h-4 w-4 flex items-center justify-center">
                    {value === option.value ? (
                      <Check className="h-4 w-4 text-blue-500" />
                    ) : (
                      getOptionIcon(option)
                    )}
                  </span>
                  {option.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 