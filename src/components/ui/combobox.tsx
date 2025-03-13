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
  const [inputValue, setInputValue] = React.useState("")

  // Update input value when value prop changes
  React.useEffect(() => {
    const selectedOption = options.find(option => option.value === value)
    if (selectedOption) {
      setInputValue(selectedOption.label)
    }
  }, [value, options])

  const handleSearch = React.useCallback(
    (search: string) => {
      setInputValue(search)
      if (onSearch) {
        onSearch(search)
      }
    },
    [onSearch]
  )

  // Reset input value when popover closes if there's a selected value
  React.useEffect(() => {
    if (!open && value) {
      const selectedOption = options.find(option => option.value === value)
      if (selectedOption) {
        setInputValue(selectedOption.label)
      }
    }
  }, [open, value, options])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between h-9 px-3 py-1 text-sm rounded-lg border-gray-200 bg-gray-50/50 text-left font-normal",
            disabled && "opacity-50 cursor-not-allowed",
            className
          )}
          disabled={disabled}
          onClick={() => {
            if (!disabled) {
              setOpen(true)
            }
          }}
        >
          {value ? (options.find(option => option.value === value)?.label || placeholder) : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-full min-w-[200px] max-w-[400px]" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder={placeholder} 
            value={inputValue}
            onValueChange={handleSearch}
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
                onSelect={(currentValue) => {
                  onChange(currentValue)
                  setInputValue(option.label)
                  setOpen(false)
                }}
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
  )
} 