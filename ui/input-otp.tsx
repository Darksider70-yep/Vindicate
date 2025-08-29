"use client";

import * as React from "react";
import { OTPInput, OTPInputContext } from "input-otp";
import { MinusIcon } from "lucide-react";
import { cn } from "./utils";

// Extend the context type to include activeIndex
interface OTPInputContextExtended {
  slots: { char: string }[];
  activeIndex: number;
}

// Root wrapper
function InputOTP({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<typeof OTPInput> & {
  containerClassName?: string;
}) {
  return (
    <OTPInput
      data-slot="input-otp"
      containerClassName={cn(
        "flex items-center gap-2 has-disabled:opacity-50",
        containerClassName
      )}
      className={cn("disabled:cursor-not-allowed", className)}
      {...props}
    />
  );
}

// Group wrapper
function InputOTPGroup({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-group"
      className={cn("flex items-center gap-1", className)}
      {...props}
    />
  );
}

// Slot wrapper
function InputOTPSlot({
  index,
  className,
  ...props
}: {
  index: number;
} & React.ComponentProps<"div">) {
  // Cast via unknown first to avoid TypeScript error
  const inputOTPContext = React.useContext(
    OTPInputContext
  ) as unknown as OTPInputContextExtended;

  const char = inputOTPContext?.slots[index]?.char ?? "";
  const hasFakeCaret = inputOTPContext?.activeIndex === index;

  return (
    <div
      data-slot="input-otp-slot"
      className={cn(
        "relative flex h-10 w-10 items-center justify-center rounded-md border border-input text-sm shadow-sm transition-all",
        "bg-background ring-offset-background",
        "placeholder:text-muted-foreground focus-visible:outline-hidden",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-px animate-caret-blink bg-foreground" />
        </div>
      )}
    </div>
  );
}

// Separator
function InputOTPSeparator({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-separator"
      role="presentation"
      className={cn("flex items-center justify-center px-1", className)}
      {...props}
    >
      {children ?? <MinusIcon className="h-4 w-4 text-muted-foreground" />}
    </div>
  );
}

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };
