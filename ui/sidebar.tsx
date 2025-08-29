"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { VariantProps, cva } from "class-variance-authority";
import { PanelLeftIcon } from "lucide-react";

import { useIsMobile } from "./use-mobile";
import { cn } from "./utils";
import { Button } from "./button";
import { Input } from "./input";
import { Separator } from "./separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "./sheet";
import { Skeleton } from "./skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const SIDEBAR_WIDTH = "16rem"; // desktop expanded
const SIDEBAR_WIDTH_MOBILE = "18rem"; // mobile expanded
const SIDEBAR_WIDTH_ICON = "3rem"; // collapsed
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

// Context
type SidebarContextProps = {
  state: "expanded" | "collapsed";
  setState: (state: "expanded" | "collapsed") => void;
  toggle: () => void;
  isMobile: boolean;
};

const SidebarContext = React.createContext<SidebarContextProps | null>(null);

export function useSidebar() {
  const ctx = React.useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used inside <SidebarProvider>");
  return ctx;
}

export function SidebarProvider({
  defaultState = "expanded",
  children,
}: {
  defaultState?: "expanded" | "collapsed";
  children: React.ReactNode;
}) {
  const isMobile = useIsMobile();
  const [state, setState] = React.useState<"expanded" | "collapsed">(defaultState);

  const toggle = React.useCallback(() => {
    setState((prev) => (prev === "expanded" ? "collapsed" : "expanded"));
  }, []);

  const value = React.useMemo(
    () => ({ state, setState, toggle, isMobile }),
    [state, isMobile, toggle]
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

// Sidebar container
export function Sidebar({ className, children }: { className?: string; children: React.ReactNode }) {
  const { state, isMobile } = useSidebar();

  if (isMobile) {
    return (
      <Sheet>
        <SheetContent side="left" className="w-[var(--sidebar-width-mobile)] p-0">
          {children}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div
      className={cn(
        "h-screen shrink-0 transition-[width] duration-300 border-r bg-background",
        state === "expanded" ? "w-[var(--sidebar-width)]" : "w-[var(--sidebar-width-icon)]",
        className
      )}
      style={
        {
          "--sidebar-width": SIDEBAR_WIDTH,
          "--sidebar-width-mobile": SIDEBAR_WIDTH_MOBILE,
          "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}

// Sidebar header
export function SidebarHeader({ children, className }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center justify-between px-4 py-2", className)}>{children}</div>;
}

// Sidebar toggle button
export function SidebarToggleButton({ className }: { className?: string }) {
  const { toggle, state } = useSidebar();
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            className={cn("h-8 w-8", className)}
          >
            <PanelLeftIcon className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {state === "expanded" ? "Collapse Sidebar" : "Expand Sidebar"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Sidebar content
export function SidebarContent({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col gap-2 px-2 py-4", className)}>{children}</div>
  );
}

// Sidebar footer
export function SidebarFooter({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mt-auto border-t px-2 py-4", className)}>{children}</div>
  );
}

// Example nav item
export function SidebarItem({
  icon,
  label,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: React.ReactNode; label: string }) {
  const { state } = useSidebar();
  return (
    <Button
      variant="ghost"
      className={cn("w-full justify-start gap-2 px-2 py-2", className)}
      {...props}
    >
      {icon}
      {state === "expanded" && <span>{label}</span>}
    </Button>
  );
}
