"use client"

import { ChevronRightIcon, FileIcon, FolderIcon, FolderOpenIcon, GripVertical } from "lucide-react"
import { createContext, type HTMLAttributes, type ReactNode, useContext, useState } from "react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@workspace/ui/components/collapsible"
import { cn } from "@workspace/ui/lib/utils"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger
} from "@workspace/ui/components/context-menu"

interface FileTreeContextType {
  expandedPaths: Set<string>
  togglePath: (path: string) => void
  selectedPath?: string
  onSelect?: (path: string) => void
}

const FileTreeContext = createContext<FileTreeContextType>({
  expandedPaths: new Set(),
  togglePath: () => undefined,
})

export type FileTreeProps = HTMLAttributes<HTMLDivElement> & {
  expanded?: Set<string>
  defaultExpanded?: Set<string>
  selectedPath?: string
  onSelect?: (path: string) => void
  onExpandedChange?: (expanded: Set<string>) => void
}

export const FileTree = ({
  expanded: controlledExpanded,
  defaultExpanded = new Set(),
  selectedPath,
  onSelect,
  onExpandedChange,
  className,
  children,
  ...props
}: FileTreeProps) => {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded)
  const expandedPaths = controlledExpanded ?? internalExpanded

  const togglePath = (path: string) => {
    const newExpanded = new Set(expandedPaths)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setInternalExpanded(newExpanded)
    onExpandedChange?.(newExpanded)
  }

  return (
    <FileTreeContext.Provider value={{ expandedPaths, togglePath, selectedPath, onSelect }}>
      <div
        className={cn("rounded-xl border bg-card/30 backdrop-blur-sm p-4 text-base", className)}
        role="tree"
        {...props}
      >
        <div className="space-y-1">{children}</div>
      </div>
    </FileTreeContext.Provider>
  )
}

export interface FileTreeItemContextMenuProps {
  children: ReactNode
}

export const FileTreeItemContextMenu = ({ children }: FileTreeItemContextMenuProps) => {
  return (
    <ContextMenuContent className="w-56 rounded-xl border-border/40 shadow-xl p-1.5 focus:ring-0">
      {children}
    </ContextMenuContent>
  )
}

interface FileTreeFolderContextType {
  path: string
  name: string
  isExpanded: boolean
}

const FileTreeFolderContext = createContext<FileTreeFolderContextType>({
  path: "",
  name: "",
  isExpanded: false,
})

export type FileTreeFolderProps = HTMLAttributes<HTMLDivElement> & {
  path: string
  name: string
  renderMenu?: ReactNode
}

export const FileTreeFolder = ({
  path,
  name,
  className,
  children,
  renderMenu,
  ...props
}: FileTreeFolderProps) => {
  const { expandedPaths, togglePath, selectedPath, onSelect } = useContext(FileTreeContext)
  const isExpanded = expandedPaths.has(path)
  const isSelected = selectedPath === path

  const folderContent = (
    <div className={cn("group/folder relative", className)} role="treeitem" tabIndex={0} {...props}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-all hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            isSelected && "bg-muted shadow-sm ring-1 ring-border/50",
            isExpanded && "mb-1"
          )}
          onClick={() => onSelect?.(path)}
          type="button"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="flex items-center justify-center size-5 shrink-0 rounded bg-background/50 border border-border/50 shadow-sm transition-transform group-hover/folder:scale-105">
              <ChevronRightIcon
                className={cn(
                  "size-3 text-muted-foreground transition-transform duration-200",
                  isExpanded && "rotate-90 text-primary"
                )}
              />
            </div>

            <FileTreeIcon>
              {isExpanded ? (
                <FolderOpenIcon className="size-4 text-primary fill-primary/10 transition-all group-hover/folder:scale-110" />
              ) : (
                <FolderIcon className="size-4 text-primary/70 fill-primary/5 transition-all group-hover/folder:scale-110" />
              )}
            </FileTreeIcon>

            <FileTreeName className="font-semibold text-sm tracking-tight truncate">{name}</FileTreeName>
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-5 border-l-2 border-primary/10 pl-3 py-1 space-y-1">
          {children}
        </div>
      </CollapsibleContent>
    </div>
  )

  return (
    <FileTreeFolderContext.Provider value={{ path, name, isExpanded }}>
      <Collapsible onOpenChange={() => togglePath(path)} open={isExpanded}>
        {renderMenu ? (
          <ContextMenu>
            <ContextMenuTrigger asChild>{folderContent}</ContextMenuTrigger>
            {renderMenu}
          </ContextMenu>
        ) : (
          folderContent
        )}
      </Collapsible>
    </FileTreeFolderContext.Provider>
  )
}

export type FileTreeFileProps = HTMLAttributes<HTMLDivElement> & {
  path: string
  name: string
  icon?: ReactNode
  renderMenu?: ReactNode
}

export const FileTreeFile = ({
  path,
  name,
  icon,
  className,
  children,
  renderMenu,
  ...props
}: FileTreeFileProps) => {
  const { selectedPath, onSelect } = useContext(FileTreeContext)
  const isSelected = selectedPath === path

  const fileContent = (
    <div
      className={cn(
        "group/file flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-all hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring border border-transparent",
        isSelected && "bg-muted shadow-sm border-border/50",
        className,
      )}
      onClick={() => onSelect?.(path)}
      onKeyDown={e => {
        if (e.key === "Enter" || e.key === " ") {
          onSelect?.(path)
        }
      }}
      role="treeitem"
      tabIndex={0}
      {...props}
    >
      {children ?? (
        <>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="size-4 shrink-0" /> {/* Spacer for symmetry with folder's chevron */}
            <FileTreeIcon className="transition-transform group-hover/file:scale-110">
              {icon ?? <FileIcon className="size-4 text-muted-foreground/60" />}
            </FileTreeIcon>
            <FileTreeName className="text-sm text-foreground/80 group-hover/file:text-foreground truncate transition-colors">
              {name}
            </FileTreeName>
          </div>
        </>
      )}
    </div>
  )

  return (
    <div className="relative">
      {renderMenu ? (
        <ContextMenu>
          <ContextMenuTrigger asChild>{fileContent}</ContextMenuTrigger>
          {renderMenu}
        </ContextMenu>
      ) : (
        fileContent
      )}
    </div>
  )
}

export type FileTreeIconProps = HTMLAttributes<HTMLSpanElement>

export const FileTreeIcon = ({ className, children, ...props }: FileTreeIconProps) => (
  <span className={cn("shrink-0 flex items-center justify-center", className)} {...props}>
    {children}
  </span>
)

export type FileTreeNameProps = HTMLAttributes<HTMLSpanElement>

export const FileTreeName = ({ className, children, ...props }: FileTreeNameProps) => (
  <span className={cn("truncate", className)} {...props}>
    {children}
  </span>
)

export type FileTreeActionsProps = HTMLAttributes<HTMLDivElement>

export const FileTreeActions = ({ className, children, ...props }: FileTreeActionsProps) => (
  <div
    className={cn("ml-auto flex items-center gap-1 opacity-0 group-hover/folder:opacity-100 group-hover/file:opacity-100 transition-opacity", className)}
    onClick={e => e.stopPropagation()}
    onKeyDown={e => e.stopPropagation()}
    role="group"
    {...props}
  >
    {children}
  </div>
)

export const FileTreeGrip = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground transition-colors p-1", className)}
    {...props}
  >
    <GripVertical className="size-3.5" />
  </div>
)
