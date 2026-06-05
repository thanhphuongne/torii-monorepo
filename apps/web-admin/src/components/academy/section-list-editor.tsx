import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Plus, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"

interface Section {
  title: string
  orderIndex: number
  sectionType: string
  description?: string
}

interface SectionListEditorProps {
  value?: Section[]
  onChange: (value: Section[]) => void
}

export function SectionListEditor({ value, onChange }: SectionListEditorProps) {
  const [items, setItems] = useState<Section[]>([])

  useEffect(() => {
    if (Array.isArray(value)) {
      setItems(value)
    }
  }, [value])

  const updateItems = (newItems: Section[]) => {
    setItems(newItems)
    onChange(newItems)
  }

  const addItem = () => {
    updateItems([
      ...items,
      {
        title: `Phần ${items.length + 1}`,
        orderIndex: items.length,
        sectionType: "READING",
        description: "",
      },
    ])
  }

  const removeItem = (index: number) => {
    const newItems = [...items]
    newItems.splice(index, 1)
    updateItems(newItems)
  }

  const handleChange = (
    index: number,
    field: keyof Section,
    val: string | number
  ) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: val }
    updateItems(newItems)
  }

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={index} className="flex gap-4 items-start p-4 border rounded-md bg-muted/20">
          <div className="grid gap-4 flex-1 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Tiêu đề phần thi</Label>
              <Input
                placeholder="Ví dụ: Phần 1 - Từ vựng"
                value={item.title}
                onChange={(e) => handleChange(index, "title", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Loại phần thi</Label>
              <Select
                value={item.sectionType}
                onValueChange={(val) => handleChange(index, "sectionType", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn loại..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VOCABULARY">Từ vựng</SelectItem>
                  <SelectItem value="GRAMMAR">Ngữ pháp</SelectItem>
                  <SelectItem value="KANJI">Hán tự</SelectItem>
                  <SelectItem value="READING">Đọc hiểu</SelectItem>
                  <SelectItem value="LISTENING">Nghe hiểu</SelectItem>
                  <SelectItem value="WRITING">Viết</SelectItem>
                  <SelectItem value="SPEAKING">Nói</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Thứ tự</Label>
              <Input
                type="number"
                value={item.orderIndex}
                onChange={(e) => handleChange(index, "orderIndex", Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
               <Label>Mô tả (Tùy chọn)</Label>
               <Input
                placeholder="Mô tả ngắn..."
                value={item.description || ""}
                onChange={(e) => handleChange(index, "description", e.target.value)}
              />
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="mt-8 text-destructive hover:bg-destructive/10"
            onClick={() => removeItem(index)}
          >
            <Trash2 className="size-5" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={addItem}
        className="w-full border-dashed"
      >
        <Plus className="mr-2 size-4" /> Thêm phần thi
      </Button>
    </div>
  )
}
