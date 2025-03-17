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
          <span className={`font-medium text-blue-800 truncate overflow-hidden ${isMobile ? 'max-w-[75%]' : ''}`}>
            {selectedOption.label.split(':')[0]}
          </span>
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

  // Render options list (shared between mobile and desktop views)
  const renderOptionsList = React.useCallback(() => {
    return (
      <>
        {loading && (
          <div className={`text-gray-500 text-center ${isMobile ? 'py-6 px-3 mt-8 w-full' : 'py-0 px-2'}`}>
            {isMobile ? (
              <div className="flex flex-col items-center justify-center py-6">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-3" />
                <div className="text-base font-medium">Зареждане...</div>
                <div className="text-sm text-gray-400 mt-1">Моля, изчакайте</div>
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
          <div className={`text-gray-500 text-center flex flex-col items-center justify-center ${isMobile ? 'py-6 px-3 mt-8 w-full' : 'py-0 px-2'}`}>
            <Search className={isMobile ? "h-6 w-6 opacity-50 mb-2" : "h-4 w-4 opacity-50 mr-2"} />
            <span className={isMobile ? "text-base font-medium" : "text-sm"}>
              {searchValue.length >= 2 ? 
                `${emptyText} за "${searchValue}"` : 
                emptyText}
            </span>
            {isMobile && searchValue.length > 0 && (
              <div className="text-sm text-gray-400 mt-2">
                <p className="mb-1">Опитайте една от следните опции:</p>
                <ul className="text-left list-disc pl-5 mt-1">
                  <li>Различно изписване</li>
                  <li>По-кратко търсене</li>
                  <li>Проверете интернет връзката</li>
                </ul>
              </div>
            )}
          </div>
        )}
        
        {!loading && options.length > 0 && (
          <div className={isMobile ? "pb-6 mt-6 w-full" : "py-0 m-0"}>
            {options.map((option) => (
              <div
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={cn(
                  "relative flex cursor-pointer select-none items-center outline-none",
                  "transition-colors duration-150",
                  "hover:bg-gray-100 hover:text-gray-900",
                  internalValue === option.value ? "bg-blue-50 text-blue-600 font-medium" : "bg-transparent",
                  isMobile ? 
                    "py-4 px-4 text-base border-b border-gray-100 active:bg-blue-50/50 w-full flex-wrap overflow-hidden" : 
                    "py-0.5 px-2 text-sm rounded-sm"
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
                <span className={isMobile ? "truncate max-w-[80%] break-words" : "truncate"}>{option.label}</span>
              </div>
            ))}
          </div>
        )}
      </>
    );
  }, [options, loading, emptyText, internalValue, isMobile, handleSelect, getOptionIcon, searchValue]);

  // Find where the dropdown list is rendered and modify its positioning and z-index for mobile
  const renderDropdownContent = () => (
    <div
      ref={listRef}
      className={cn(
        "absolute w-full bg-white shadow-md rounded-md border border-gray-200 overflow-y-auto",
        isMobile ? 
          "fixed left-0 right-0 bottom-0 top-auto max-h-[60vh] rounded-b-none shadow-lg z-20" : 
          "mt-1 max-h-[300px] z-20"
      )}
      {...(isMobile ? { 
        style: { top: "auto", bottom: 0, height: "60vh", zIndex: 20 } 
      } : {})}
    >
      {loading ? (
        <div className="py-6 flex items-center justify-center">
          <Loader2 className="animate-spin h-6 w-6 text-gray-400" />
        </div>
      ) : options.length === 0 ? (
        <div className="p-4 text-center text-gray-500 text-sm">
          {searchValue.length > 0 ? emptyText : (
            type === 'default' ? 'Започнете да пишете, за да търсите' : emptyText
          )}
        </div>
      ) : (
        <div className="py-1">
          {options.map((option) => (
            <div
              key={option.value}
              className={cn(
                "flex items-center px-3 py-2 cursor-pointer",
                option.value === internalValue ? "bg-gray-100" : "hover:bg-gray-50"
              )}
              onClick={() => handleSelect(option.value)}
            >
              {getOptionIcon(option)}
              <span className={cn(
                "truncate flex-1 text-sm",
                option.value === internalValue ? "font-medium" : "font-normal"
              )}>
                {option.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

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
          isMobile ? "h-11 text-base min-h-[2.75rem] overflow-hidden" : "h-9", // Improved mobile handling
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
      
      {/* Desktop dropdown */}
      {open && !isMobile && (
        <div
          className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-[300px] overflow-y-auto"
          style={{ zIndex: 20 }}
        >
          {loading ? (
            <div className="p-3 text-center text-gray-500">
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-600 mr-2"></div>
              <span className="text-sm">Зареждане...</span>
            </div>
          ) : options.length === 0 ? (
            <div className="p-3 text-center text-sm text-gray-500">
              {searchValue.length > 0 ? emptyText : 'Започнете да пишете, за да търсите'}
            </div>
          ) : (
            <div className="py-1">
              {renderOptionsList()}
            </div>
          )}
        </div>
      )}
      
      {/* Mobile fullscreen dialog */}
      {isMobile && open && (
        <div 
          className="fixed inset-0 bg-white flex flex-col z-20" 
          style={{ touchAction: 'manipulation' }}
        >
          {/* Mobile search header - adjust button to have higher z-index */}
          <div className="sticky top-0 flex items-center border-b p-3 gap-2 bg-white shadow-sm z-40">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              className="flex-shrink-0 z-50"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back</span>
            </Button>
            
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              
              <input
                ref={mobileInputRef}
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
                    setSearchValue("")
                    handleSearchChange("")
                    if (mobileInputRef.current) {
                      mobileInputRef.current.focus()
                    }
                  }}
                >
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>
          </div>
          
          {/* Mobile search results - add padding to ensure content doesn't start immediately under header */}
          <div className="flex-1 overflow-auto overflow-x-hidden pt-2 w-full" ref={listRef}>
            <div className="divide-y divide-gray-100 w-full mt-2">
              {renderOptionsList()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 