import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Plus, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { Label } from "@workspace/ui/components/label"

interface Attachment {
  name: string
  url: string
}

interface AttachmentListEditorProps {
  value?: Attachment[]
  onChange: (value: Attachment[]) => void
}

export function AttachmentListEditor({
  value,
  onChange,
}: AttachmentListEditorProps) {
  const [items, setItems] = useState<Attachment[]>([])

  useEffect(() => {
    if (Array.isArray(value)) {
      setItems(value)
    }
  }, [value])

  const updateItems = (newItems: Attachment[]) => {
    setItems(newItems)
    onChange(newItems)
  }

  const addItem = () => {
    updateItems([...items, { name: "", url: "" }])
  }

  const removeItem = (index: number) => {
    const newItems = [...items]
    newItems.splice(index, 1)
    updateItems(newItems)
  }

  const handleChange = (index: number, field: keyof Attachment, val: string) => {
    const newItems = [...items]
    newItems[index][field] = val
    updateItems(newItems)
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="flex gap-2 items-start p-3 border rounded-md">
          <div className="flex-1 space-y-2">
            <div className="grid gap-1">
               <Label className="text-xs text-muted-foreground">Tên tài liệu</Label>
               <Input
                placeholder="Tên tài liệu..."
                value={item.name}
                onChange={(e) => handleChange(index, "name", e.target.value)}
              />
            </div>
            <div className="grid gap-1">
               <Label className="text-xs text-muted-foreground">URL</Label>
               <Input
                placeholder="https://..."
                value={item.url}
                onChange={(e) => handleChange(index, "url", e.target.value)}
              />
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="mt-6"
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
        <Plus className="mr-2 size-4" /> Thêm tài liệu đính kèm
      </Button>
    </div>
  )
}
