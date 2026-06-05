import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Plus, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"

interface StringListEditorProps {
  value?: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  addButtonLabel?: string
}

export function StringListEditor({
  value,
  onChange,
  placeholder = "Nhập giá trị...",
  addButtonLabel = "Thêm giá trị",
}: StringListEditorProps) {
  const [items, setItems] = useState<string[]>([])

  useEffect(() => {
    if (Array.isArray(value)) {
      setItems(value)
    } else if (value) {
        // Handle case where value might be a single string (though prop says string[])
        setItems([String(value)])
    }
  }, [value])

  const updateItems = (newItems: string[]) => {
    setItems(newItems)
    onChange(newItems)
  }

  const addItem = () => {
    updateItems([...items, ""])
  }

  const removeItem = (index: number) => {
    const newItems = [...items]
    newItems.splice(index, 1)
    updateItems(newItems)
  }

  const handleChange = (index: number, val: string) => {
    const newItems = [...items]
    newItems[index] = val
    updateItems(newItems)
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex gap-2">
          <Input
            placeholder={placeholder}
            value={item}
            onChange={(e) => handleChange(index, e.target.value)}
            className="flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeItem(index)}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addItem}
        className="w-full"
      >
        <Plus className="mr-2 size-4" /> {addButtonLabel}
      </Button>
    </div>
  )
}
