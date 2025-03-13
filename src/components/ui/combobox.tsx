"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"

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
  const inputRef = React.useRef<HTMLInputElement>(null)
  
  console.log("Combobox render state:", { open, value, disabled, optionsCount: options.length })
  
  // When the popover opens, focus the input and clear previous search
  React.useEffect(() => {
    if (open) {
      // Use a small timeout to ensure the popover is fully rendered
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
      setOpen(true)
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
          onOpenAutoFocus={(e) => {
            // Prevent default autofocus behavior
            e.preventDefault()
          }}
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
            <CommandGroup className="max-h-[200px] overflow-auto">
              {loading && <div className="py-2 px-3 text-sm text-gray-500 text-center">Зареждане...</div>}
              {!loading && options.length === 0 && (
                <div className="py-2 px-3 text-sm text-gray-500 text-center">{emptyText}</div>
              )}
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
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
} 