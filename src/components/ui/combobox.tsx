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
  const userInitiatedSearch = React.useRef(false)
  
  // Debug function
  const debug = (message: string, data?: any) => {
    console.log(`[Combobox ${isMobile ? 'Mobile' : 'Desktop'}] ${message}`, data || '');
  }
  
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
  
  // Initial setup
  React.useEffect(() => {
    debug('Component mounted');
    
    // Initialize search value from selected value
    if (value) {
      const selectedOption = options.find(opt => opt.value === value);
      if (selectedOption) {
        setSearchValue(selectedOption.label.split(':')[0]);
      }
    }
    
    return () => {
      debug('Component unmounting');
    };
  }, []);
  
  // Update internal value when prop changes (but only when not from user actions)
  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    // Only update if this wasn't triggered by the user's input
    if (!userInitiatedSearch.current) {
      debug('External value changed', { from: internalValue, to: value });
      setInternalValue(value);
      
      // Update search field if external value changes and we're not in middle of user search
      if (value) {
        const selectedOption = options.find(opt => opt.value === value);
        if (selectedOption) {
          setSearchValue(selectedOption.label.split(':')[0]);
        }
      } else {
        setSearchValue("");
      }
    }
  }, [value, options]);

  // Handle clicks outside to close the dropdown
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        debug('Click outside, closing dropdown');
        setOpen(false);
        userInitiatedSearch.current = false;
      }
    };
    
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);
  
  // Button click handler - opens/closes the dropdown
  const handleButtonClick = React.useCallback(() => {
    if (disabled) return;
    
    debug('Button clicked, toggling dropdown');
    
    if (!open) {
      // Opening the dropdown - reset search to match selection if there is one
      if (internalValue) {
        const selectedOption = options.find(opt => opt.value === internalValue);
        if (selectedOption) {
          setSearchValue(selectedOption.label.split(':')[0]);
        }
      } else {
        setSearchValue("");
      }
    }
    
    setOpen(!open);
  }, [open, disabled, internalValue, options]);
  
  // Handle search input changes
  const handleSearchChange = React.useCallback((value: string) => {
    debug('Search input changed', { value });
    
    // Mark that user initiated this search - prevents prop changes from overriding
    userInitiatedSearch.current = true;
    
    // Always update the search value when typing
    setSearchValue(value);
    
    // Clear the selection if search field is cleared
    if (value === '' && internalValue) {
      debug('Search field cleared, resetting selection');
      setInternalValue('');
      onChange(''); // Notify parent
      userInitiatedSearch.current = false; // Reset after notifying parent
    }
    
    // Ensure dropdown stays open while searching
    if (!open) {
      setOpen(true);
    }
    
    // Trigger search when we have enough characters
    if (onSearch && value.length >= 2) {
      debug('Triggering search callback', { term: value });
      onSearch(value);
    }
  }, [onSearch, open, onChange, internalValue]);
  
  // Handle Enter key to trigger search explicitly
  const handleInputKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchValue.length >= 2 && onSearch) {
      e.preventDefault();
      debug('Enter key pressed, triggering search', { term: searchValue });
      onSearch(searchValue);
    }
  }, [searchValue, onSearch]);
  
  // Handle option selection
  const handleSelect = React.useCallback((optionValue: string) => {
    debug('Option selected', { optionValue });
    
    // Reset user search flag
    userInitiatedSearch.current = false;
    
    const selectedOption = options.find(opt => opt.value === optionValue);
    
    if (selectedOption) {
      // Update internal state and notify parent
      setSearchValue(selectedOption.label.split(':')[0]);
      setInternalValue(optionValue);
      onChange(optionValue);
    } else {
      console.warn('Selected option not found in options list');
    }
    
    // Close the dropdown
    setOpen(false);
  }, [onChange, options]);

  // Handle clearing the selected value
  const handleClearSelection = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent dropdown from opening
    debug('Selection cleared');
    
    // Reset user search flag
    userInitiatedSearch.current = false;
    
    // Clear internal state and notify parent
    setInternalValue('');
    setSearchValue('');
    onChange('');
  }, [onChange]);

  // Get display value for the button
  const displayValue = React.useMemo(() => {
    // If we have a selected value, show it with its icon
    const selectedOption = options.find(option => option.value === internalValue);
    
    if (selectedOption) {
      const optionType = selectedOption.type || type;
      const icon = optionType === 'city' ? <MapPin className="h-4 w-4 text-blue-600" /> : null;
      
      return (
        <div className="flex items-center w-full">
          {optionType === 'city' && (
            <span className="mr-2 flex-shrink-0">{icon}</span>
          )}
          <span className="font-medium text-blue-800 truncate overflow-hidden">{selectedOption.label.split(':')[0]}</span>
        </div>
      );
    }
    
    // If no selection, show placeholder
    return <span className="text-gray-500">{placeholder}</span>;
  }, [internalValue, options, placeholder, type]);

  // Get icon for option based on type
  const getOptionIcon = (option: ComboboxOption) => {
    if (option.icon) {
      return option.icon;
    }
    
    const optionType = option.type || type;
    
    if (optionType === 'city') {
      return <MapPin className="h-4 w-4 text-gray-500" />;
    }
    
    if (optionType === 'office') {
      // Use the courier logo based on the selected shipping method
      return (
        <img 
          src={courier === 'speedy' ? "/assets/logo-speedy-red.svg" : "/assets/logo-econt-blue.svg"}
          alt={courier === 'speedy' ? "Speedy" : "Econt"}
          className="h-4 w-auto"
        />
      );
    }
    
    return null;
  };

  // Render options list (shared between mobile and desktop views)
  const renderOptionsList = React.useCallback(() => {
    return (
      <>
        {loading && (
          <div className="py-6 px-3 text-sm text-gray-500 text-center">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className={`${isMobile ? "h-5 w-5" : "h-4 w-4"} animate-spin text-gray-500`} />
              <span className={isMobile ? "text-base" : "text-sm"}>Зареждане...</span>
            </div>
          </div>
        )}
        
        {!loading && options.length === 0 && searchValue.length >= 2 && (
          <div className="py-6 px-3 text-gray-500 text-center flex flex-col items-center justify-center">
            <Search className={`${isMobile ? "h-6 w-6 mb-2" : "h-4 w-4 mr-2"} opacity-50`} />
            <span className={isMobile ? "text-base" : "text-sm"}>{emptyText}</span>
          </div>
        )}
        
        {!loading && searchValue.length < 2 && (
          <div className="py-6 px-3 text-gray-500 text-center">
            <span className={isMobile ? "text-base" : "text-sm"}>Въведете поне 2 символа...</span>
          </div>
        )}
        
        {!loading && options.length > 0 && (
          <div>
            {options.map((option) => (
              <div
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={cn(
                  "relative flex cursor-pointer select-none items-center rounded-sm px-3 outline-none",
                  "transition-colors duration-150",
                  "hover:bg-gray-100 hover:text-gray-900",
                  "active:bg-gray-200",
                  internalValue === option.value ? "bg-blue-50 text-blue-600 font-medium" : "bg-transparent",
                  isMobile ? "py-4 text-base" : "py-2 text-sm" // Taller options with larger text on mobile
                )}
              >
                <span className={cn(
                  "mr-3 flex items-center justify-center flex-shrink-0",
                  isMobile ? "h-5 w-5" : "h-4 w-4" // Larger icons on mobile
                )}>
                  {internalValue === option.value ? (
                    <Check className={isMobile ? "h-5 w-5 text-blue-500" : "h-4 w-4 text-blue-500"} />
                  ) : (
                    getOptionIcon(option)
                  )}
                </span>
                <span className="truncate flex-1">{option.label}</span>
              </div>
            ))}
          </div>
        )}
      </>
    );
  }, [options, loading, emptyText, internalValue, isMobile, handleSelect, getOptionIcon, searchValue]);

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
                onKeyDown={handleInputKeyDown}
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
        <div className="fixed inset-0 z-[100] bg-white flex flex-col combobox-fullscreen">
          {/* Mobile header */}
          <div className="flex items-center bg-white border-b p-2 h-14 sticky top-0 z-10">
            <button 
              onClick={() => setOpen(false)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors mr-2"
              aria-label="Back"
              type="button"
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
                onKeyDown={handleInputKeyDown}
                placeholder={placeholder}
                className="w-full h-10 pl-9 pr-9 py-2 rounded-lg border border-gray-200 text-base bg-gray-50/80 outline-none focus:border-gray-400 focus:ring-0"
                autoComplete="off"
                inputMode="search"
              />
              {searchValue && (
                <button
                  type="button"
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
          <div className="flex-1 overflow-auto">
            <div className="divide-y divide-gray-100 p-1">
              {renderOptionsList()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 