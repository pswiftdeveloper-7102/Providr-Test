"use client";

import * as React from "react";
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

// Side-anchored sheet component built on @base-ui/react/drawer.
// Mirrors the shadcn `Sheet` API: Sheet (Root), SheetTrigger, SheetContent
// (slides in from a side), SheetHeader, SheetTitle, SheetDescription, SheetClose.

function Sheet({ ...props }: DrawerPrimitive.Root.Props) {
  return <DrawerPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({ ...props }: DrawerPrimitive.Trigger.Props) {
  return <DrawerPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({ ...props }: DrawerPrimitive.Close.Props) {
  return <DrawerPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({ ...props }: DrawerPrimitive.Portal.Props) {
  return <DrawerPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetBackdrop({
  className,
  ...props
}: DrawerPrimitive.Backdrop.Props) {
  return (
    <DrawerPrimitive.Backdrop
      data-slot="sheet-backdrop"
      className={cn(
        "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm",
        "data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
        "transition-opacity duration-200",
        className
      )}
      {...props}
    />
  );
}

type Side = "left" | "right" | "top" | "bottom";

const sideClasses: Record<Side, string> = {
  left:
    "left-0 top-0 h-svh w-72 border-r data-[starting-style]:-translate-x-full data-[ending-style]:-translate-x-full",
  right:
    "right-0 top-0 h-svh w-72 border-l data-[starting-style]:translate-x-full data-[ending-style]:translate-x-full",
  top:
    "left-0 right-0 top-0 max-h-svh border-b data-[starting-style]:-translate-y-full data-[ending-style]:-translate-y-full",
  bottom:
    "left-0 right-0 bottom-0 max-h-svh border-t data-[starting-style]:translate-y-full data-[ending-style]:translate-y-full",
};

function SheetContent({
  className,
  children,
  side = "right",
  showClose = true,
  ...props
}: DrawerPrimitive.Popup.Props & {
  side?: Side;
  showClose?: boolean;
}) {
  return (
    <SheetPortal>
      <SheetBackdrop />
      <DrawerPrimitive.Popup
        data-slot="sheet-content"
        className={cn(
          "fixed z-50 flex flex-col bg-background shadow-xl outline-none",
          "transition-transform duration-200 ease-out",
          sideClasses[side],
          className
        )}
        {...props}
      >
        {children}
        {showClose && (
          <DrawerPrimitive.Close
            className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </DrawerPrimitive.Close>
        )}
      </DrawerPrimitive.Popup>
    </SheetPortal>
  );
}

function SheetHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1 border-b px-5 py-4", className)}
      {...props}
    />
  );
}

function SheetFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 border-t px-5 py-4", className)}
      {...props}
    />
  );
}

function SheetTitle({
  className,
  ...props
}: DrawerPrimitive.Title.Props) {
  return (
    <DrawerPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-base font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: DrawerPrimitive.Description.Props) {
  return (
    <DrawerPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};