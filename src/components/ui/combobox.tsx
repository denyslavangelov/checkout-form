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
  placeholder?: string
  emptyText?: string
  className?: string
  disabled?: boolean
  loading?: boolean
  onSearch?: (value: string) => void
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Изберете...",
  emptyText = "Няма намерени резултати.",
  className,
  disabled = false,
  loading = false,
  onSearch,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")

  const handleSearch = React.useCallback(
    (search: string) => {
      setSearchTerm(search)
      if (onSearch) {
        onSearch(search)
      }
    },
    [onSearch]
  )

  const selectedOption = React.useMemo(() => {
    return options.find(option => option.value === value)
  }, [options, value])

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
        >
          {selectedOption ? selectedOption.label : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-full min-w-[200px] max-w-[400px]">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder={placeholder} 
            value={searchTerm}
            onValueChange={handleSearch}
            className="h-9"
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