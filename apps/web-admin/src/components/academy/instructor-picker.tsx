import { useState } from "react"
import { Check, Search } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import type { UserResponseDTO } from "@workspace/schemas"

interface InstructorPickerProps {
  value?: string | null
  onSelect: (instructorId: string | null) => void
  instructors?: UserResponseDTO[]
  disabled?: boolean
  placeholder?: string
}

export function InstructorPicker({
  value,
  onSelect,
  instructors = [],
  disabled = false,
  placeholder = "Chọn giảng viên...",
}: InstructorPickerProps) {
  const [open, setOpen] = useState(false)

  const selected = instructors.find((u) => u.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled}
        >
          {selected ? (
            <span className="truncate max-w-[260px]">
              {selected.displayName || selected.email}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Tìm theo tên hoặc email..." />
          <CommandList>
            <CommandEmpty>Không tìm thấy giảng viên nào.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__none__"
                onSelect={() => {
                  onSelect(null)
                  setOpen(false)
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    !value ? "opacity-100" : "opacity-0",
                  )}
                />
                <span className="text-muted-foreground">Không chọn giảng viên</span>
              </CommandItem>

              {instructors.map((u) => (
                <CommandItem
                  key={u.id}
                  value={`${u.displayName || ""} ${u.email || ""} ${u.id}`}
                  onSelect={() => {
                    onSelect(u.id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === u.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <div className="flex flex-col gap-0.5 overflow-hidden">
                    <span className="truncate font-medium">
                      {u.displayName || u.email}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {u.email}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

