"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@workspace/ui/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn("group/tabs flex flex-col gap-4 min-w-0", className)}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "bg-background gap-1 flex w-fit items-center justify-start rounded-none p-0 text-muted-foreground overflow-x-auto overflow-y-hidden whitespace-nowrap max-w-full [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
  {
    variants: {
      variant: {
        default: "",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex h-full items-center justify-center gap-2 rounded-md border border-transparent px-4 py-2 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors duration-300 hover:bg-muted hover:text-foreground hover:border-border",
        "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("outline-none pt-2", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }

