"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

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

  const displayValue = React.useMemo(() => {
    if (!value) return placeholder
    const option = options.find(option => option.value === value)
    return option ? option.label : placeholder
  }, [value, options, placeholder])

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
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        disabled={disabled}
      >
        {displayValue}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
      
      {open && (
        <div 
          className="absolute top-full left-0 w-full z-50 mt-1 rounded-md border border-gray-200 bg-white shadow-lg"
        >
          <div className="flex flex-col overflow-hidden rounded-md bg-white text-gray-950">
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                ref={inputRef}
                value={searchValue}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={placeholder}
                className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-50"
                autoComplete="off"
              />
            </div>
            <div className="max-h-[200px] overflow-auto p-1">
              {loading && <div className="py-2 px-3 text-sm text-gray-500 text-center">Зареждане...</div>}
              
              {!loading && options.length === 0 && (
                <div className="py-2 px-3 text-sm text-gray-500 text-center">{emptyText}</div>
              )}
              
              {options.map((option) => (
                <div
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-gray-100 hover:text-gray-900"
                >
                  <span className="mr-2 h-4 w-4 flex items-center justify-center">
                    {value === option.value && <Check className="h-4 w-4" />}
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