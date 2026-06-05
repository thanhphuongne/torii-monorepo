import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Plus, Trash2, ChevronDown, Settings2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  Item,
  ItemActions,
  ItemGroup,
  ItemTitle,
  ItemDescription,
} from "@workspace/ui/components/item"

export interface KeyValuePreset {
  key: string
  label: string
  defaultValue?: string
  description?: string
}

interface KeyValueEditorProps {
  value?: Record<string, any>
  onChange: (value: Record<string, any>) => void
  presets?: KeyValuePreset[]
  addButtonLabel?: string
}

export function KeyValueEditor({
  value = {},
  onChange,
  presets = [],
  addButtonLabel = "Thêm thông tin",
}: KeyValueEditorProps) {
  const pairs = Object.entries(value).map(([key, val]) => ({
    key,
    value: String(val),
  }))

  const notifyChange = (newPairs: { key: string; value: string }[]) => {
    const obj = newPairs.reduce((acc, curr) => {
      acc[curr.key] = curr.value
      return acc
    }, {} as Record<string, any>)
    onChange(obj)
  }

  const handleAddPreset = (preset: KeyValuePreset) => {
    if (value[preset.key] !== undefined) return
    const newPairs = [...pairs, {
      key: preset.key,
      value: preset.defaultValue || ""
    }]
    notifyChange(newPairs)
  }

  const handleRemovePair = (key: string) => {
    const { [key]: _, ...rest } = value
    onChange(rest)
  }

  const handleChangeValue = (key: string, newValue: string) => {
    onChange({ ...value, [key]: newValue })
  }

  const getPreset = (key: string) => presets.find(p => p.key === key)
  const availablePresets = presets.filter(p => value[p.key] === undefined)

  return (
    <div className="space-y-4">
      <ItemGroup className="gap-2">
        {pairs.map((pair) => {
          const preset = getPreset(pair.key)
          return (
            <Item key={pair.key} variant="outline" className="flex items-center gap-4 py-2 px-3 min-h-[56px]">
              <div className="w-1/3 min-w-[120px] space-y-0.5">
                <ItemTitle className="text-[11px] font-bold uppercase text-muted-foreground/80 truncate">
                  {preset?.label || pair.key}
                </ItemTitle>
                {preset?.description && (
                  <ItemDescription className="text-[10px] leading-tight truncate">
                    {preset.description}
                  </ItemDescription>
                )}
              </div>

              <div className="flex-1">
                <Input
                  value={pair.value}
                  onChange={(e) => handleChangeValue(pair.key, e.target.value)}
                  placeholder={preset?.defaultValue ? `Mặc định: ${preset.defaultValue}` : "Nhập giá trị..."}
                  className="h-9 bg-background focus-visible:ring-1 border-dotted hover:border-solid transition-all"
                />
              </div>

              <ItemActions>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemovePair(pair.key)}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </ItemActions>
            </Item>
          )
        })}

        {pairs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 rounded-lg border border-dashed bg-muted/5 text-muted-foreground/40">
            <Settings2 className="size-8 mb-2 opacity-20" />
            <p className="text-xs font-medium">Chưa có thông tin mở rộng được chọn</p>
          </div>
        )}
      </ItemGroup>

      {availablePresets.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="w-full h-10 gap-2 border-dashed hover:border-solid transition-all"
            >
              <Plus className="size-4" />
              <span>{addButtonLabel}</span>
              <ChevronDown className="size-4 opacity-50 ml-auto" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-[300px] overflow-y-auto">
            <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Các trường khả dụng
            </div>
            {availablePresets.map((p) => (
              <DropdownMenuItem
                key={p.key}
                onClick={() => handleAddPreset(p)}
                className="flex flex-col items-start p-3 gap-1 cursor-pointer"
              >
                <span className="font-semibold text-sm">{p.label}</span>
                <span className="text-[10px] text-muted-foreground line-clamp-1 italic">
                  {p.description || p.key}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
