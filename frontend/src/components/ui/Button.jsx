import { forwardRef, memo } from "react";
import { cva } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      variant: {
        primary: "bg-primary text-white hover:bg-primary-strong focus:ring-primary",
        secondary: "bg-surface text-text hover:bg-muted/10 focus:ring-primary",
        danger: "bg-danger text-white hover:bg-danger/90 focus:ring-danger",
        ghost: "hover:bg-muted/10 focus:ring-primary",
      },
      size: {
        sm: "px-3 py-1.5 text-sm",
        md: "px-4 py-2 text-base",
        lg: "px-6 py-3 text-lg",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

const Button = memo(forwardRef(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={buttonVariants({ variant, size, className })}
        ref={ref}
        {...props}
      />
    );
  }
));

Button.displayName = "Button";

export { Button, buttonVariants };

