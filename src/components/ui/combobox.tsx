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
  
  // When the dropdown opens, focus the input
  React.useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 10)
      return () => clearTimeout(timer)
    }
  }, [open])
  
  const handleButtonClick = React.useCallback(() => {
    if (!disabled) {
      setOpen(!open)
    }
  }, [open, disabled])
  
  const handleSearchChange = React.useCallback((value: string) => {
    setSearchValue(value)
    if (onSearch) {
      onSearch(value)
    }
  }, [onSearch])
  
  const handleSelect = React.useCallback((optionValue: string) => {
    const selectedOption = options.find(opt => opt.value === optionValue)
    if (selectedOption) {
      // Update the search value to show the selected city
      setSearchValue(selectedOption.label)
    }
    onChange(optionValue)
    setOpen(false)
  }, [onChange, options])

  // Initialize search value with selected value
  React.useEffect(() => {
    if (value) {
      const selectedOption = options.find(opt => opt.value === value)
      if (selectedOption) {
        setSearchValue(selectedOption.label)
      }
    }
  }, [value, options])

  const displayValue = React.useMemo(() => {
    // If we have a selected value, show it with its icon
    const selectedOption = options.find(option => option.value === value)
    if (selectedOption) {
      const optionType = selectedOption.type || type
      const icon = optionType === 'city' ? 
        <MapPin className="h-4 w-4 text-blue-600" /> : 
        optionType === 'office' ? 
          <Building className="h-4 w-4 text-blue-600" /> : 
          null
      
      return (
        <div className="flex items-center w-full">
          <span className="mr-2 flex-shrink-0">{icon}</span>
          <span className="font-medium text-blue-800 truncate">{selectedOption.label}</span>
        </div>
      )
    }
    
    // If no selection, show placeholder
    return <span className="text-gray-500">{placeholder}</span>
  }, [value, options, placeholder, type])

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
          value && "bg-blue-50/80 border-blue-200", // Make the highlight stronger
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        disabled={disabled}
      >
        {displayValue}
        <ChevronsUpDown className={cn(
          "ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform duration-200 flex-shrink-0",
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
                placeholder={placeholder}
                className={cn(
                  "flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none",
                  "placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-50",
                  value && "font-medium text-blue-800" // Highlight selected value in input
                )}
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
                    value === option.value ? "bg-blue-50 text-blue-600 font-medium" : "bg-transparent"
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