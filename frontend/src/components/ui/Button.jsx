import { cn } from "../../utils/ui";

const VARIANT_CLASSES = {
  primary: "bg-primary text-white hover:bg-primary-strong",
  secondary: "border border-border bg-surface text-text hover:bg-panel",
  ghost: "border border-transparent bg-transparent text-text hover:border-border/70 hover:bg-panel/60",
  success: "bg-success text-white hover:bg-success/90",
  danger: "bg-danger text-white hover:bg-danger/90"
};

const SIZE_CLASSES = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base"
};

export default function Button({
  variant = "primary",
  size = "md",
  className,
  loading = false,
  disabled,
  children,
  ...props
}) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition focus-visible:shadow-focus disabled:cursor-not-allowed disabled:opacity-60",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className
      )}
    >
      {loading && (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
      )}
      {children}
    </button>
  );
}