"use client"

import * as React from "react"
import { useEditor, EditorContent, type Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import Heading from "@tiptap/extension-heading"
import BulletList from "@tiptap/extension-bullet-list"
import OrderedList from "@tiptap/extension-ordered-list"
import ListItem from "@tiptap/extension-list-item"
import { cn } from "@workspace/ui/lib/utils"
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Link as LinkIcon,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify
} from "lucide-react"
import { Button } from "@workspace/ui/components/button"

// Import Text Align extension
import TextAlign from "@tiptap/extension-text-align"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"

export interface ToolbarConfig {
  bold?: boolean
  italic?: boolean
  heading?: boolean
  bulletList?: boolean
  orderedList?: boolean
  blockquote?: boolean
  link?: boolean
  image?: boolean
  textAlign?: boolean
  undo?: boolean
  redo?: boolean
}

export interface TiptapEditorProps {
  /** HTML content to display/edit */
  content?: string
  /** Callback when content changes */
  onChange?: (content: string) => void
  /** Placeholder text */
  placeholder?: string
  /** Additional CSS classes */
  className?: string
  /** Whether the editor is editable */
  editable?: boolean
  /** Mode: 'admin' (full toolbar) or 'readonly' (no toolbar, read-only view) */
  mode?: 'admin' | 'readonly'
  /** ARIA invalid state */
  ariaInvalid?: boolean
  /** ARIA label for accessibility */
  ariaLabel?: string
  /** Minimum height of the editor */
  minHeight?: string
  /** Maximum height of the editor (scrolls if exceeded) */
  maxHeight?: string
  /** Show character count */
  showCharacterCount?: boolean
  /** Maximum character count */
  maxCharacters?: number
  /** Custom toolbar configuration (only applies in admin mode) */
  toolbarConfig?: ToolbarConfig
  /** Image upload handler (returns image URL or base64) */
  onImageUpload?: (file: File) => Promise<string>
  /** Link handler (returns link URL) */
  onLinkCreate?: (url: string) => Promise<string> | string
  /** Ref to access editor instance */
  editorRef?: React.RefObject<Editor | null>
  /** Debounce delay for onChange in milliseconds (default: 300) */
  debounceMs?: number
}

const defaultToolbarConfig: Required<ToolbarConfig> = {
  bold: true,
  italic: true,
  heading: true,
  bulletList: true,
  orderedList: true,
  blockquote: false,
  link: true,
  image: true,
  textAlign: true,
  undo: true,
  redo: true,
}

/**
 * TiptapEditor - A rich text editor component with ZEN UI style
 * 
 * Features:
 * - Controlled component with auto-save friendly debouncing
 * - Performance optimized with memoization
 * - Customizable toolbar via props
 * - Full accessibility support (ARIA, keyboard navigation)
 * - Two modes: Admin (editable) and Read-only (learner view)
 * - Optional features: character count, text alignment, links, images
 * - Editor instance exposed via ref
 */
export const TiptapEditor = React.memo(React.forwardRef<Editor, TiptapEditorProps>(
  function TiptapEditor({
    content = "",
    onChange,
    placeholder = "Bắt đầu viết...",
    className,
    editable = true,
    mode = editable ? 'admin' : 'readonly',
    ariaInvalid,
    ariaLabel = "Trình soạn thảo văn bản",
    minHeight = "200px",
    maxHeight,
    showCharacterCount = false,
    maxCharacters,
    toolbarConfig = {},
    onImageUpload,
    onLinkCreate,
    editorRef,
    debounceMs = 300,
  }, forwardedRef) {
    // Merge toolbar config with defaults
    const finalToolbarConfig = React.useMemo(() => ({
      ...defaultToolbarConfig,
      ...toolbarConfig,
    }), [toolbarConfig])

    // Debounce onChange callback
    const debouncedOnChange = React.useMemo(() => {
      if (!onChange) return undefined

      let timeoutId: ReturnType<typeof setTimeout> | null = null
      return (html: string) => {
        if (timeoutId) clearTimeout(timeoutId)
        timeoutId = setTimeout(() => {
          onChange(html)
        }, debounceMs)
      }
    }, [onChange, debounceMs])

    // Build extensions array
    const extensions = React.useMemo(() => {
      const exts: any[] = [
        // Add extensions explicitly to ensure proper configuration
        // Heading extension with proper configuration
        Heading.configure({
          levels: [1, 2, 3],
          HTMLAttributes: {
            class: 'font-bold',
          },
        }),
        // List extensions with proper configuration
        BulletList.configure({
          keepMarks: true,
          keepAttributes: false,
          HTMLAttributes: {
            class: 'list-disc ml-6 my-2 space-y-1',
          },
        }),
        OrderedList.configure({
          keepMarks: true,
          keepAttributes: false,
          HTMLAttributes: {
            class: 'list-decimal ml-6 my-2 space-y-1',
          },
        }),
        ListItem.configure({
          HTMLAttributes: {
            class: 'pl-2',
          },
        }),
        // Add StarterKit after our custom extensions to avoid conflicts
        // Disable heading, lists, and link-related extensions since we've added them explicitly
        StarterKit.configure({
          heading: false,
          bulletList: false,
          orderedList: false,
          // Disable link-related extensions to prevent conflicts with custom Link extension
          link: false,
        }),
        Placeholder.configure({
          placeholder,
        }),
      ]

      // Add Text Align extension if enabled
      if (finalToolbarConfig.textAlign) {
        exts.push(
          TextAlign.configure({
            types: ['heading', 'paragraph'],
          })
        )
      }

      if (Link && finalToolbarConfig.link) {
        exts.push(
          Link.configure({
            openOnClick: false,
            HTMLAttributes: {
              class: 'text-primary underline hover:text-primary/80',
            },
          })
        )
      }

      if (Image && finalToolbarConfig.image) {
        exts.push(
          Image.configure({
            inline: true,
            allowBase64: true,
            HTMLAttributes: {
              class: 'max-w-full h-auto rounded-lg',
            },
          })
        )
      }

      return exts
    }, [placeholder, finalToolbarConfig])

    const editor = useEditor({
      extensions,
      content: content || '',
      editable: editable && mode === 'admin',
      immediatelyRender: false,
      onUpdate: ({ editor }) => {
        debouncedOnChange?.(editor.getHTML())
      },
      editorProps: {
        attributes: {
          class: cn(
            "tiptap-editor-content",
            "prose prose-sm dark:prose-invert max-w-none focus:outline-none",
            "px-3 py-2",
            // Headings styling - ZEN UI SERIF STYLE
            "[&_h1]:!text-3xl [&_h1]:!font-sans [&_h1]:!font-bold [&_h1]:!mt-8 [&_h1]:!mb-4 [&_h1]:!text-foreground [&_h1]:!leading-[1.1] [&_h1]:!uppercase [&_h1]:!italic",
            "[&_h2]:!text-2xl [&_h2]:!font-sans [&_h2]:!font-bold [&_h2]:!mt-8 [&_h2]:!mb-3 [&_h2]:!text-foreground [&_h2]:!leading-tight",
            "[&_h3]:!text-xl [&_h3]:!font-sans [&_h3]:!font-semibold [&_h3]:!mt-6 [&_h3]:!mb-2 [&_h3]:!text-foreground [&_h3]:!leading-tight",
            // Lists styling - Clear bullets and numbers
            "[&_ul]:!list-disc [&_ul]:!ml-6 [&_ul]:!my-2 [&_ul]:!pl-0 [&_ul_li]:!pl-2 [&_ul_li]:!list-item",
            "[&_ol]:!list-decimal [&_ol]:!ml-6 [&_ol]:!my-2 [&_ol]:!pl-0 [&_ol_li]:!pl-2 [&_ol_li]:!list-item",
            "[&_ul_ul]:!list-circle [&_ul_ul]:!ml-4 [&_ul_ul]:!mt-1",
            "[&_ol_ol]:!list-[lower-alpha] [&_ol_ol]:!ml-4 [&_ol_ol]:!mt-1",
            "[&_ul_ol]:!ml-4 [&_ul_ol]:!mt-1",
            "[&_ol_ul]:!ml-4 [&_ol_ul]:!mt-1",
            // Text alignment support
            "[&_p[style*='text-align:left']]:!text-left",
            "[&_p[style*='text-align:center']]:!text-center",
            "[&_p[style*='text-align:right']]:!text-right",
            "[&_p[style*='text-align:justify']]:!text-justify",
            "[&_h1[style*='text-align']]:!block",
            "[&_h2[style*='text-align']]:!block",
            "[&_h3[style*='text-align']]:!block",
            // Placeholder styling
            "[&_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]",
            "[&_p.is-editor-empty:first-child]:before:text-muted-foreground",
            "[&_p.is-editor-empty:first-child]:before:float-left",
            "[&_p.is-editor-empty:first-child]:before:pointer-events-none",
            "[&_p.is-editor-empty:first-child]:before:h-0"
          ),
          'aria-label': ariaLabel || 'Rich text editor',
          'aria-invalid': ariaInvalid ? 'true' : 'false',
          'aria-readonly': (!editable || mode === 'readonly') ? 'true' : 'false',
          role: 'textbox',
          tabindex: (editable && mode === 'admin') ? '0' : '-1',
        },
        handleKeyDown: (view, event) => {
          // Enhanced keyboard navigation
          if (event.key === 'Escape' && editable && mode === 'admin') {
            view.dom.blur()
            return true
          }
          // Cmd/Ctrl + K for link (if link extension available)
          if ((event.metaKey || event.ctrlKey) && event.key === 'k' && Link && finalToolbarConfig.link) {
            event.preventDefault()
            const url = window.prompt('Enter URL:')
            if (url) {
              editor?.chain().focus().setLink({ href: url }).run()
            }
            return true
          }
          return false
        },
      },
    })

    // Expose editor instance via ref and forwardedRef
    React.useImperativeHandle(forwardedRef, () => editor!, [editor])
    React.useEffect(() => {
      if (editorRef && editor) {
        (editorRef as React.MutableRefObject<Editor | null>).current = editor
      }
    }, [editor, editorRef])

    // Update content when prop changes (with performance optimization)
    React.useEffect(() => {
      if (editor && content !== editor.getHTML()) {
        const { from, to } = editor.state.selection
        editor.commands.setContent(content, { emitUpdate: false })
        // Restore selection if possible
        try {
          const maxPos = editor.state.doc.content.size
          if (from <= maxPos && to <= maxPos) {
            editor.commands.setTextSelection({ from, to })
          }
        } catch {
          // Selection restore failed, focus at end
          editor.commands.focus('end')
        }
      }
    }, [content, editor])

    // Update editable state when prop changes
    React.useEffect(() => {
      if (editor) {
        editor.setEditable(editable && mode === 'admin')
      }
    }, [editor, editable, mode])

    // Character count state - updates on editor content change
    const [characterCount, setCharacterCount] = React.useState<{ characters: number; words: number } | null>(null)

    // Calculate character count when editor content changes
    React.useEffect(() => {
      if (!editor || (!showCharacterCount && !maxCharacters)) {
        setCharacterCount(null)
        return
      }

      const updateCount = () => {
        const text = editor.getText()
        const trimmedText = text.trim()
        setCharacterCount({
          characters: text.length,
          words: trimmedText === '' ? 0 : trimmedText.split(/\s+/).filter(Boolean).length,
        })
      }

      // Initial calculation
      updateCount()

      // Update on editor changes
      editor.on('update', updateCount)
      editor.on('selectionUpdate', updateCount)

      return () => {
        editor.off('update', updateCount)
        editor.off('selectionUpdate', updateCount)
      }
    }, [editor, showCharacterCount, maxCharacters])

    // Toolbar component (memoized)
    const MenuBar = React.useMemo(() => {
      if (mode === 'readonly' || !editable || !editor) return null

      const handleImageUpload = async () => {
        if (!Image || !onImageUpload || !editor) return

        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*'
        input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0]
          if (file && editor) {
            try {
              const url = await onImageUpload(file)
              // Use insertContent for images since setImage may not be available without extension
              editor.chain().focus().insertContent(`<img src="${url}" alt="" />`).run()
            } catch (error) {
              console.error('Image upload failed:', error)
            }
          }
        }
        input.click()
      }

      const handleLink = async () => {
        if (!Link) return

        const previousUrl = editor.getAttributes('link').href
        const url = previousUrl || window.prompt('Enter URL:')

        if (url === null) return

        try {
          const finalUrl = onLinkCreate ? await onLinkCreate(url) : url

          // cancelled
          if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run()
          } else {
            editor.chain().focus().extendMarkRange('link').setLink({ href: finalUrl }).run()
          }
        } catch (error) {
          console.error('Link creation failed:', error)
        }
      }

      return (
        <div
          className="border-b border-border bg-muted/30 p-2 flex flex-wrap items-center gap-1 rounded-t-xl"
          role="toolbar"
          aria-label="Thanh công cụ định dạng văn bản"
        >
          {/* Text Formatting */}
          {finalToolbarConfig.bold && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBold().run()}
              disabled={!editor.can().chain().focus().toggleBold().run()}
              className={cn(
                "h-7 w-7 p-0 transition-colors",
                editor.isActive("bold") && "bg-muted"
              )}
              aria-label="Chữ đậm"
              aria-pressed={editor.isActive("bold")}
            >
              <Bold className="h-4 w-4" />
            </Button>
          )}
          {finalToolbarConfig.italic && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              disabled={!editor.can().chain().focus().toggleItalic().run()}
              className={cn(
                "h-7 w-7 p-0 transition-colors",
                editor.isActive("italic") && "bg-muted"
              )}
              aria-label="Chữ nghiêng"
              aria-pressed={editor.isActive("italic")}
            >
              <Italic className="h-4 w-4" />
            </Button>
          )}

          {(finalToolbarConfig.bold || finalToolbarConfig.italic) && finalToolbarConfig.heading && (
            <div className="w-px h-6 bg-border mx-1" aria-hidden="true" />
          )}

          {/* Headings */}
          {finalToolbarConfig.heading && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  editor.chain().focus().toggleHeading({ level: 1 }).run()
                }}
                className={cn(
                  "h-7 w-7 p-0 transition-colors",
                  editor.isActive("heading", { level: 1 }) && "bg-muted"
                )}
                aria-label="Tiêu đề 1"
                aria-pressed={editor.isActive("heading", { level: 1 })}
              >
                <Heading1 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  editor.chain().focus().toggleHeading({ level: 2 }).run()
                }}
                className={cn(
                  "h-7 w-7 p-0 transition-colors",
                  editor.isActive("heading", { level: 2 }) && "bg-muted"
                )}
                aria-label="Tiêu đề 2"
                aria-pressed={editor.isActive("heading", { level: 2 })}
              >
                <Heading2 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  editor.chain().focus().toggleHeading({ level: 3 }).run()
                }}
                className={cn(
                  "h-7 w-7 p-0 transition-colors",
                  editor.isActive("heading", { level: 3 }) && "bg-muted"
                )}
                aria-label="Tiêu đề 3"
                aria-pressed={editor.isActive("heading", { level: 3 })}
              >
                <Heading3 className="h-4 w-4" />
              </Button>
              <div className="w-px h-6 bg-border mx-1" aria-hidden="true" />
            </>
          )}

          {/* Lists */}
          {finalToolbarConfig.bulletList && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                editor.chain().focus().toggleBulletList().run()
              }}
              disabled={!editor.can().toggleBulletList()}
              className={cn(
                "h-7 w-7 p-0 transition-colors",
                editor.isActive("bulletList") && "bg-muted"
              )}
              aria-label="Danh sách dấu chấm"
              aria-pressed={editor.isActive("bulletList")}
            >
              <List className="h-4 w-4" />
            </Button>
          )}
          {finalToolbarConfig.orderedList && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                editor.chain().focus().toggleOrderedList().run()
              }}
              disabled={!editor.can().toggleOrderedList()}
              className={cn(
                "h-7 w-7 p-0 transition-colors",
                editor.isActive("orderedList") && "bg-muted"
              )}
              aria-label="Danh sách số"
              aria-pressed={editor.isActive("orderedList")}
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
          )}

          {(finalToolbarConfig.bulletList || finalToolbarConfig.orderedList) && (
            <div className="w-px h-6 bg-border mx-1" aria-hidden="true" />
          )}

          {/* Text Alignment */}
          {finalToolbarConfig.textAlign && (
            <>
              <div className="w-px h-6 bg-border mx-1" aria-hidden="true" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  editor.chain().focus().setTextAlign('left').run()
                }}
                className={cn(
                  "h-7 w-7 p-0 transition-colors",
                  editor.isActive({ textAlign: 'left' }) && "bg-muted"
                )}
                aria-label="Căn trái"
                aria-pressed={editor.isActive({ textAlign: 'left' })}
                title="Căn trái"
              >
                <AlignLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  editor.chain().focus().setTextAlign('center').run()
                }}
                className={cn(
                  "h-7 w-7 p-0 transition-colors",
                  editor.isActive({ textAlign: 'center' }) && "bg-muted"
                )}
                aria-label="Căn giữa"
                aria-pressed={editor.isActive({ textAlign: 'center' })}
                title="Căn giữa"
              >
                <AlignCenter className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  editor.chain().focus().setTextAlign('right').run()
                }}
                className={cn(
                  "h-7 w-7 p-0 transition-colors",
                  editor.isActive({ textAlign: 'right' }) && "bg-muted"
                )}
                aria-label="Căn phải"
                aria-pressed={editor.isActive({ textAlign: 'right' })}
                title="Căn phải"
              >
                <AlignRight className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  editor.chain().focus().setTextAlign('justify').run()
                }}
                className={cn(
                  "h-7 w-7 p-0 transition-colors",
                  editor.isActive({ textAlign: 'justify' }) && "bg-muted"
                )}
                aria-label="Căn đều"
                aria-pressed={editor.isActive({ textAlign: 'justify' })}
                title="Căn đều"
              >
                <AlignJustify className="h-4 w-4" />
              </Button>
            </>
          )}

          {/* Link */}
          {Link && finalToolbarConfig.link && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleLink}
              className={cn(
                "h-7 w-7 p-0 transition-colors",
                editor.isActive("link") && "bg-muted"
              )}
              aria-label="Chèn liên kết"
              aria-pressed={editor.isActive("link")}
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
          )}

          {/* Image */}
          {Image && finalToolbarConfig.image && onImageUpload && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleImageUpload}
              className="h-7 w-7 p-0 transition-colors"
              aria-label="Chèn hình ảnh"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
          )}

          {(Link || Image) && (finalToolbarConfig.undo || finalToolbarConfig.redo) && (
            <div className="w-px h-6 bg-border mx-1" aria-hidden="true" />
          )}

          {/* Undo/Redo */}
          {finalToolbarConfig.undo && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().chain().focus().undo().run()}
              className="h-7 w-7 p-0 transition-colors"
              aria-label="Hoàn tác"
            >
              <Undo className="h-4 w-4" />
            </Button>
          )}
          {finalToolbarConfig.redo && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().chain().focus().redo().run()}
              className="h-7 w-7 p-0 transition-colors"
              aria-label="Làm lại"
            >
              <Redo className="h-4 w-4" />
            </Button>
          )}
        </div>
      )
    }, [editor, mode, editable, finalToolbarConfig, onImageUpload, onLinkCreate])

    if (!editor) {
      return (
        <div
          className={cn(
            "border-input dark:bg-input/30 rounded-xl border bg-transparent shadow-xs",
            "min-h-[200px] flex items-center justify-center",
            className
          )}
          aria-label={ariaLabel}
        >
          <div className="text-muted-foreground text-sm">Đang tải trình soạn thảo...</div>
        </div>
      )
    }


    return (
      <div className="space-y-2">
        <div
          className={cn(
            "border-input dark:bg-input/30 rounded-xl border bg-transparent shadow-xs transition-[color,box-shadow]",
            mode !== 'readonly' && "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
            ariaInvalid && "ring-destructive/20 dark:ring-destructive/40 border-destructive",
            mode === 'readonly' && "bg-transparent border-none shadow-none",
            className
          )}
          style={{
            minHeight: mode === 'readonly' ? minHeight : undefined,
            maxHeight: maxHeight || (mode === 'readonly' ? 'none' : undefined),
          }}
        >
          {MenuBar}
          <div
            style={{
              minHeight,
              maxHeight,
              overflowY: maxHeight ? 'auto' : undefined,
            }}
          >
            <EditorContent editor={editor} />
          </div>
        </div>

        {/* Character Count / Footer */}
        {(showCharacterCount || maxCharacters) && characterCount && (
          <div className="flex items-center justify-between text-xs text-muted-foreground px-2 py-1 border-t border-border/40">
            <div className="flex items-center gap-4">
              <span className="font-medium">
                {characterCount.characters} ký tự
              </span>
              <span className="font-medium">
                {characterCount.words} từ
              </span>
            </div>
            {maxCharacters && (
              <span className={cn(
                "font-medium",
                characterCount.characters > maxCharacters && "text-destructive"
              )}>
                {characterCount.characters} / {maxCharacters}
              </span>
            )}
          </div>
        )}
      </div>
    )
  }
))

TiptapEditor.displayName = "TiptapEditor"

export type { Editor } from "@tiptap/react"
