"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search, MapPin, Building, X } from "lucide-react"

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
  courier?: 'speedy' | 'econt'
  isMobile?: boolean
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
  courier = 'econt',
  isMobile = false,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [internalValue, setInternalValue] = React.useState(value)
  const [searchValue, setSearchValue] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const isFirstRender = React.useRef(true)
  
  // Debug mount/unmount
  React.useEffect(() => {
    console.log('Combobox mounted with:', {
      initialValue: value,
      type,
      optionsCount: options.length
    })
    
    return () => {
      console.log('Combobox unmounting with:', {
        finalValue: internalValue,
        type,
        optionsCount: options.length
      })
    }
  }, [])

  // Sync internal value with prop value, but only after first render
  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    console.log('Value prop changed:', { 
      from: internalValue, 
      to: value,
      hasOptions: options.length > 0,
      type,
      stack: new Error().stack 
    })
    
    // Only update internal value if we have options and the new value exists in options
    if (options.length > 0) {
      const valueExists = value === '' || options.some(opt => opt.value === value)
      if (valueExists) {
        setInternalValue(value)
      } else {
        console.warn('Attempted to set value that does not exist in options:', value)
      }
    }
  }, [value, options, type])

  // Handle clicks outside to close the dropdown
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Only close if the click is outside the container and dropdown
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    
    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open])
  
  // When the dropdown opens, focus the input and reset search if it's not a value
  React.useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          // If we're opening and there's no selection, clear the search
          if (!internalValue) {
            setSearchValue("");
          }
        }
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [open, internalValue]);
  
  const handleButtonClick = React.useCallback(() => {
    if (!disabled) {
      setOpen(!open)
    }
  }, [open, disabled])
  
  // When search changes, keep dropdown open
  const handleSearchChange = React.useCallback((value: string) => {
    console.log('Search changed:', value);
    setSearchValue(value);
    
    // Clear the selection if the user deletes all text
    if (value === '' && internalValue) {
      console.log('Search field cleared, resetting selection');
      setInternalValue('');
      onChange('');
    }
    
    // Ensure dropdown stays open while searching
    if (!open) {
      setOpen(true);
    }
    if (onSearch) {
      onSearch(value);
    }
  }, [onSearch, open, onChange, internalValue]);
  
  const handleSelect = React.useCallback((optionValue: string) => {
    debugger;
    console.log('handleSelect called with:', {
      optionValue,
      currentValue: internalValue,
      options: options.length,
      type
    })

    const selectedOption = options.find(opt => opt.value === optionValue)
    
    if (selectedOption) {
      console.log('Found selected option:', selectedOption)
      setSearchValue(selectedOption.label)
      setInternalValue(optionValue)
      onChange(optionValue)
    } else {
      console.warn('Selected option not found in options list')
    }
    
    setOpen(false)
  }, [onChange, options, internalValue, type])

  // Initialize search value with selected value
  React.useEffect(() => {
    if (internalValue) {
      const selectedOption = options.find(opt => opt.value === internalValue)
      if (selectedOption) {
        setSearchValue(selectedOption.label.split(':')[0])
      }
    }
  }, [internalValue, options])

  const displayValue = React.useMemo(() => {
    // If we have a selected value, show it with its icon
    const selectedOption = options.find(option => option.value === internalValue)
    console.log('Calculating display value:', {
      internalValue,
      selectedOption,
      optionsCount: options.length,
      type
    })
    
    if (selectedOption) {
      const optionType = selectedOption.type || type
      const icon = optionType === 'city' ? <MapPin className="h-4 w-4 text-blue-600" /> : null
      
      return (
        <div className="flex items-center w-full">
          {optionType === 'city' && (
            <span className="mr-2 flex-shrink-0">{icon}</span>
          )}
          <span className="font-medium text-blue-800 truncate overflow-hidden">{selectedOption.label.split(':')[0]}</span>
        </div>
      )
    }
    
    // If no selection, show placeholder
    return <span className="text-gray-500">{placeholder}</span>
  }, [internalValue, options, placeholder, type])

  // Debug logging
  React.useEffect(() => {
    console.log('Combobox State:', {
      value,
      searchValue,
      open,
      disabled,
      optionsCount: options.length,
      selectedOption: options.find(opt => opt.value === value),
      type
    })
  }, [value, searchValue, open, disabled, options, type])

  const getOptionIcon = (option: ComboboxOption) => {
    if (option.icon) {
      return option.icon
    }
    
    const optionType = option.type || type
    
    if (optionType === 'city') {
      return <MapPin className="h-4 w-4 text-gray-500" />
    }
    
    if (optionType === 'office') {
      // Use the courier logo based on the selected shipping method
      return (
        <img 
          src={courier === 'speedy' ? "/assets/logo-speedy-red.svg" : "/assets/logo-econt-blue.svg"}
          alt={courier === 'speedy' ? "Speedy" : "Econt"}
          className="h-4 w-auto"
        />
      )
    }
    
    return null
  }

  // Add a function to handle clearing the selected value
  const handleClearSelection = React.useCallback((e: React.MouseEvent) => {
    // Stop event propagation to prevent the dropdown from opening
    e.stopPropagation();
    console.log('Clearing selection');
    setInternalValue('');
    setSearchValue('');
    onChange('');
  }, [onChange]);

  return (
    <div className={`relative w-full combobox-container ${isMobile ? 'mobile-combobox' : ''}`} ref={containerRef}>
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={open}
        type="button"
        onClick={handleButtonClick}
        className={cn(
          "w-full justify-between px-3 text-sm rounded-lg",
          "border-gray-200 bg-gray-50/50 text-left font-normal",
          "flex items-center transition-colors duration-200",
          "hover:bg-gray-100/50",
          internalValue && "bg-blue-50/80 border-blue-200",
          disabled && "opacity-50 cursor-not-allowed",
          isMobile ? "h-11 text-base" : "h-9", // Larger height on mobile
          className
        )}
        disabled={disabled}
      >
        <div className="flex-1 min-w-0">
          {displayValue}
        </div>
        {internalValue && !disabled && (
          <button
            type="button"
            onClick={handleClearSelection}
            className={cn(
              "rounded-full hover:bg-gray-200 mr-1 focus:outline-none",
              isMobile ? "p-2" : "p-1" // Larger touch target on mobile
            )}
            aria-label="Clear selection"
          >
            <X className={cn(
              "text-gray-500",
              isMobile ? "h-4 w-4" : "h-3 w-3" // Larger icon on mobile
            )} />
          </button>
        )}
        <ChevronsUpDown className={cn(
          "ml-2 shrink-0 opacity-50 transition-transform duration-200 flex-shrink-0",
          isMobile ? "h-5 w-5" : "h-4 w-4", // Larger icon on mobile
          open && "transform rotate-180"
        )} />
      </Button>
      
      {open && (
        <div 
          className={cn(
            "z-50 mt-1 rounded-md border border-gray-200 bg-white shadow-lg combobox-popover",
            isMobile ? 
              "fixed left-0 right-0 max-h-[60vh] w-full mx-auto my-0 top-auto bottom-0 rounded-b-none shadow-[0_-2px_10px_rgba(0,0,0,0.1)]" : 
              "absolute top-full left-0 w-full"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col overflow-hidden rounded-md bg-white text-gray-950">
            <div className="flex items-center border-b px-3 sticky top-0 bg-white z-10">
              <Search className={cn(
                "mr-2 shrink-0 opacity-50",
                isMobile ? "h-5 w-5" : "h-4 w-4" // Larger icon on mobile
              )} />
              <input
                ref={inputRef}
                value={searchValue}
                onChange={(e) => handleSearchChange(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder={placeholder}
                className={cn(
                  "flex w-full rounded-md bg-transparent py-3 text-sm outline-none combobox-input",
                  "placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-50",
                  internalValue && "font-medium text-blue-800",
                  isMobile ? "h-12 text-base py-4" : "h-10" // Taller input on mobile with larger text
                )}
                autoComplete="off"
              />
            </div>
            <div className={cn(
              "overflow-auto p-1",
              isMobile ? "max-h-[50vh]" : "max-h-[300px]"
            )}>
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
                    "relative flex cursor-pointer select-none items-center rounded-sm px-2 outline-none",
                    "transition-colors duration-150",
                    "hover:bg-gray-100 hover:text-gray-900",
                    internalValue === option.value ? "bg-blue-50 text-blue-600 font-medium" : "bg-transparent",
                    isMobile ? "py-3 text-base" : "py-2 text-sm" // Taller options with larger text on mobile
                  )}
                >
                  <span className={cn(
                    "mr-2 flex items-center justify-center flex-shrink-0",
                    isMobile ? "h-5 w-5" : "h-4 w-4" // Larger icons on mobile
                  )}>
                    {internalValue === option.value ? (
                      <Check className={isMobile ? "h-5 w-5 text-blue-500" : "h-4 w-4 text-blue-500"} />
                    ) : (
                      getOptionIcon(option)
                    )}
                  </span>
                  <span className="truncate">{option.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 