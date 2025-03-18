"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search, MapPin, Building, X, ArrowLeft, Loader2 } from "lucide-react"

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

// Utility function to extract just the address without city and ID
const extractOfficeAddress = (label: string) => {
  if (!label.includes(':')) return '';
  
  const parts = label.split(':');
  if (parts.length < 2) return parts[1] || '';
  
  // Assume format is typically: "Office Name:City, Address, Additional Info (ID)"
  // We want to extract just the address part
  let addressPart = parts[1];
  
  // Remove office ID if it's in parentheses at the end
  addressPart = addressPart.replace(/\s*\([^)]*\)\s*$/, '');
  
  // If the address starts with city name followed by comma, remove it
  if (addressPart.includes(',')) {
    const addressPieces = addressPart.split(',');
    if (addressPieces.length > 1) {
      // Skip the first part (city) and join the rest
      return addressPieces.slice(1).join(',').trim();
    }
  }
  
  return addressPart.trim();
};

// Add a utility function to truncate text with ellipsis
const truncateText = (text: string, maxLength: number) => {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

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
  const mobileInputRef = React.useRef<HTMLInputElement>(null)
  const isFirstRender = React.useRef(true)
  const listRef = React.useRef<HTMLDivElement>(null)
  
  // Manage body scroll when dropdown is open
  React.useEffect(() => {
    if (open) {
      // Focus the input when opened
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  }, [open]);
  
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
      
      // Initialize search value with selected option's label when opening
      if (!open) {
        if (internalValue) {
          const selectedOption = options.find(opt => opt.value === internalValue)
          if (selectedOption) {
            setSearchValue(selectedOption.label)
          }
        } else {
          setSearchValue("")
        }
      }
    }
  }, [open, disabled, internalValue, options])
  
  // When search changes, keep dropdown open
  const handleSearchChange = React.useCallback((value: string) => {
    console.log('Search changed:', value);
    setSearchValue(value);
    
    // Don't clear selection when typing
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
      // For mobile, we want to trigger search with just 1 character to be more responsive
      const minimumLength = isMobile ? 1 : 2;
      
      try {
        // If the value is long enough, trigger search
        if (value.length >= minimumLength) {
          console.log(`Search term meets ${minimumLength} char threshold, triggering search`);
          onSearch(value);
        } else if (value.length === 0) {
          // If the search field is cleared, reset the search
          console.log('Search field cleared, resetting search');
          onSearch('');
        }
      } catch (error) {
        console.error('Error in search handler:', error);
        // Continue normally even if search fails - we'll show error UI in the results area
      }
    }
  }, [onSearch, open, onChange, internalValue, isMobile]);
  
  const handleSelect = React.useCallback((optionValue: string) => {
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
          {optionType === 'office' ? (
            <div className="w-full overflow-hidden">
              <span className="font-medium text-blue-800 block break-words hyphens-auto" style={{ wordBreak: 'break-word' }}>{selectedOption.label.split(':')[0]}</span>
              {selectedOption.label.includes(':') && (
                <span className="text-xs text-gray-600 block truncate">
                  {truncateText(extractOfficeAddress(selectedOption.label), 40)}
                </span>
              )}
            </div>
          ) : (
            <span className={`font-medium text-blue-800 truncate overflow-hidden ${isMobile ? 'max-w-[75%]' : ''}`}>
              {selectedOption.label.split(':')[0]}
            </span>
          )}
        </div>
      )
    }
    
    // If no selection, show placeholder
    return <span className="text-gray-500">{placeholder}</span>
  }, [internalValue, options, placeholder, type, isMobile])

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

  // Find where the dropdown list is rendered and modify its positioning and z-index for mobile
  const renderDropdownContent = () => (
    <div
      ref={listRef}
      className={cn(
        "absolute bg-white shadow-md rounded-md border border-gray-200 overflow-y-auto",
        isMobile ? 
          "right-0 left-0 max-h-[300px] z-10 mt-1 shadow-lg rounded-lg w-full" : 
          "mt-1 max-h-[300px] z-10 w-full"
      )}
    >
      <div className="py-2 px-2">
        {/* Search input inside dropdown */}
        <div className="relative mb-2">
          <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          
          <input
            ref={inputRef}
            type="text"
            className="w-full pl-8 pr-8 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={placeholder}
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            autoCapitalize="off"
          />
          
          {searchValue && (
            <button
              className="absolute inset-y-0 right-2 flex items-center"
              onClick={() => {
                setSearchValue("");
                handleSearchChange("");
                if (inputRef.current) {
                  inputRef.current.focus();
                }
              }}
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-6 flex items-center justify-center">
            <Loader2 className="animate-spin h-6 w-6 text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">Зареждане...</span>
          </div>
        ) : options.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            {searchValue.length > 0 ? emptyText : (
              type === 'default' ? 'Започнете да пишете, за да търсите' : emptyText
            )}
          </div>
        ) : (
          <div className={`py-1 overflow-y-auto ${isMobile ? 'max-h-[200px]' : 'max-h-[250px]'}`}>
            {options.map((option) => (
              <div
                key={option.value}
                className={cn(
                  "flex cursor-pointer rounded",
                  "transition-colors duration-150",
                  option.value === internalValue ? "bg-blue-50" : "hover:bg-gray-50",
                  (option.type === 'office' || type === 'office') ? "px-3 py-3 items-start" : "px-3 py-2 items-center"
                )}
                onClick={() => handleSelect(option.value)}
              >
                <span className={cn(
                  "mr-2 flex-shrink-0", 
                  (option.type === 'office' || type === 'office') ? "mt-0.5" : ""
                )}>
                  {option.value === internalValue ? (
                    <Check className="h-4 w-4 text-blue-500" />
                  ) : (
                    getOptionIcon(option)
                  )}
                </span>
                <span className={cn(
                  "flex-1",
                  (option.type === 'office' || type === 'office') ? "break-words whitespace-normal w-full" : "truncate",
                  isMobile ? "text-base" : "text-sm",
                  option.value === internalValue ? "font-medium text-blue-700" : "font-normal"
                )}>
                  {(option.type === 'office' || type === 'office') ? (
                    <>
                      <span className="font-medium block">{option.label.split(':')[0]}</span>
                      {option.label.includes(':') && (
                        <span className="text-gray-600 text-xs block mt-0.5 break-words">
                          {extractOfficeAddress(option.label)}
                        </span>
                      )}
                    </>
                  ) : (
                    option.label
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div 
      className={`relative combobox-container ${isMobile ? 'mobile-combobox' : ''}`} 
      ref={containerRef}
      style={{ width: isMobile ? '100%' : '300px' }}
    >
      {/* Button that opens the combobox */}
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
          isMobile ? "h-auto min-h-[2.75rem] py-2" : "h-auto min-h-[2.25rem] py-1.5",
          className
        )}
        disabled={disabled}
      >
        <div className="flex-1 min-w-0 overflow-hidden">
          {displayValue}
        </div>
        {internalValue && !disabled && (
          <button
            type="button"
            onClick={handleClearSelection}
            className={cn(
              "rounded-full hover:bg-gray-200 mr-1 focus:outline-none",
              isMobile ? "p-1.5" : "p-1" // Larger touch target on mobile
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
      
      {/* Dropdown - unified for mobile and desktop */}
      {open && renderDropdownContent()}
    </div>
  )
} 