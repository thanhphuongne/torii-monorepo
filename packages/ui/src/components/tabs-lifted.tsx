"use client"

import * as React from "react"
import { Tabs as TabsPrimitive } from "radix-ui"
import { cn } from "@workspace/ui/lib/utils"

function TabsLifted({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-orientation={orientation}
      className={cn("flex flex-col gap-4", className)}
      {...props}
    />
  )
}

function TabsLiftedList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "bg-background justify-start rounded-none border-b p-0 flex w-full",
        className
      )}
      {...props}
    />
  )
}

function TabsLiftedTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "bg-background border-b-border dark:data-[state=active]:bg-background data-[state=active]:border-border data-[state=active]:border-b-background h-full rounded-none rounded-t border border-transparent data-[state=active]:-mb-px data-[state=active]:shadow-none! dark:border-b-0 dark:data-[state=active]:-mb-px transition-all px-4 py-2 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground inline-flex items-center justify-center gap-2",
        className
      )}
      {...props}
    />
  )
}

function TabsLiftedContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn("outline-none pt-2", className)}
      {...props}
    />
  )
}

export { 
  TabsLifted as Tabs, 
  TabsLiftedList as TabsList, 
  TabsLiftedTrigger as TabsTrigger, 
  TabsLiftedContent as TabsContent 
}
