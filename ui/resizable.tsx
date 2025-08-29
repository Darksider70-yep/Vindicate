"use client";

import * as React from "react";
import { GripVerticalIcon } from "lucide-react";
import * as ResizablePrimitive from "react-resizable-panels";

import { cn } from "./utils";

function ResizablePanelGroup({
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>) {
  return (
    <ResizablePrimitive.PanelGroup
      data-slot="resizable-panel-group"
      className={cn(
        "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
        className
      )}
      {...props}
    />
  );
}

function ResizablePanel({
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Panel>) {
  return <ResizablePrimitive.Panel data-slot="resizable-panel" {...props} />;
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & {
  withHandle?: boolean;
}) {
  return (
    <ResizablePrimitive.PanelResizeHandle
      data-slot="resizable-handle"
      className={cn(
        "relative flex items-center justify-center bg-border transition-colors",
        // Horizontal
        "data-[panel-group-direction=horizontal]:h-full data-[panel-group-direction=horizontal]:w-px",
        // Vertical
        "data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full",
        "hover:bg-accent/50 focus-visible:bg-accent/70 focus-visible:outline-none",
        className
      )}
      {...props}
    >
      {withHandle ? (
        <div
          className={cn(
            "z-10 flex items-center justify-center rounded-sm border bg-background shadow-xs",
            "data-[panel-group-direction=horizontal]:h-8 data-[panel-group-direction=horizontal]:w-3",
            "data-[panel-group-direction=vertical]:h-3 data-[panel-group-direction=vertical]:w-8"
          )}
        >
          <GripVerticalIcon className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      ) : null}
    </ResizablePrimitive.PanelResizeHandle>
  );
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
