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
  
  // Manage body scroll when mobile fullscreen search is open
  React.useEffect(() => {
    if (isMobile && open) {
      // Prevent body scrolling when modal is open
      document.body.style.overflow = 'hidden';
      
      // Focus the mobile input when opened
      setTimeout(() => {
        if (mobileInputRef.current) {
          mobileInputRef.current.focus();
        }
      }, 100);
      
      return () => {
        // Restore body scrolling when modal is closed
        document.body.style.overflow = '';
      };
    }
  }, [isMobile, open]);
  
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

  // Handle clicks outside to close the dropdown (desktop only)
  React.useEffect(() => {
    if (!isMobile) {
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
    }
  }, [open, isMobile])
  
  // When the dropdown opens, focus the input and reset search if it's not a value (desktop only)
  React.useEffect(() => {
    if (open && !isMobile) {
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
  }, [open, internalValue, isMobile]);
  
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
    
    // Don't clear selection on mobile when typing
    if (!isMobile && value === '' && internalValue) {
      console.log('Search field cleared, resetting selection');
      setInternalValue('');
      onChange('');
    }
    
    // Ensure dropdown stays open while searching
    if (!open && !isMobile) {
      setOpen(true);
    }
    
    if (onSearch) {
      onSearch(value);
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

  // Render options list (shared between mobile and desktop views)
  const renderOptionsList = React.useCallback(() => {
    return (
      <>
        {loading && (
          <div className="py-6 px-3 text-sm text-gray-500 text-center">
            {isMobile ? (
              <div className="flex flex-col items-center justify-center py-4">
                <Loader2 className="h-6 w-6 text-blue-500 animate-spin mb-2" />
                <div className="text-base">Зареждане...</div>
              </div>
            ) : (
              <>
                <div className="inline-block animate-spin mr-2">⏳</div>
                Зареждане...
              </>
            )}
          </div>
        )}
        
        {!loading && options.length === 0 && (
          <div className="py-6 px-3 text-sm text-gray-500 text-center flex flex-col items-center justify-center">
            <Search className={isMobile ? "h-5 w-5 opacity-50 mb-1" : "h-4 w-4 opacity-50 mr-2"} />
            <span className={isMobile ? "text-base" : "text-sm"}>{emptyText}</span>
          </div>
        )}
        
        {!loading && options.length > 0 && options.map((option) => (
          <div
            key={option.value}
            onClick={() => handleSelect(option.value)}
            className={cn(
              "relative flex cursor-pointer select-none items-center rounded-sm px-2 outline-none",
              "transition-colors duration-150",
              "hover:bg-gray-100 hover:text-gray-900",
              internalValue === option.value ? "bg-blue-50 text-blue-600 font-medium" : "bg-transparent",
              isMobile ? "py-4 text-base" : "py-2 text-sm" // Taller options with larger text on mobile
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
      </>
    );
  }, [options, loading, emptyText, internalValue, isMobile, handleSelect, getOptionIcon]);

  return (
    <div className={`relative w-full combobox-container ${isMobile ? 'mobile-combobox' : ''}`} ref={containerRef}>
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
      
      {/* Desktop dropdown view */}
      {open && !isMobile && (
        <div 
          className="absolute top-full left-0 w-full z-50 mt-1 rounded-md border border-gray-200 bg-white shadow-lg combobox-popover"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col overflow-hidden rounded-md bg-white text-gray-950">
            <div className="flex items-center border-b px-3 sticky top-0 bg-white z-10">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                ref={inputRef}
                value={searchValue}
                onChange={(e) => handleSearchChange(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder={placeholder}
                className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-50"
                autoComplete="off"
              />
            </div>
            <div className="max-h-[300px] overflow-auto p-1">
              {renderOptionsList()}
            </div>
          </div>
        </div>
      )}
      
      {/* Mobile fullscreen search view */}
      {open && isMobile && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col combobox-fullscreen">
          {/* Mobile header */}
          <div className="flex items-center bg-white border-b p-2 h-14 sticky top-0 z-10 shadow-sm">
            <button 
              onClick={() => setOpen(false)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors mr-2"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5 text-gray-700" />
            </button>
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                ref={mobileInputRef}
                value={searchValue}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={placeholder}
                className="w-full h-10 pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-base bg-gray-50/80 outline-none focus:border-gray-400 focus:ring-0"
                autoComplete="off"
              />
              {searchValue && (
                <button
                  onClick={() => handleSearchChange("")}
                  className="absolute inset-y-0 right-1 p-2 text-gray-400"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          
          {/* Mobile search results */}
          <div className="flex-1 overflow-auto" ref={listRef}>
            <div className="divide-y divide-gray-100">
              {renderOptionsList()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 