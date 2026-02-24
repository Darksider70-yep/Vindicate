import { cn } from "../../utils/ui";

const TONES = {
  neutral: "border-border/80 bg-panel text-text",
  success: "border-success/35 bg-success/15 text-success",
  danger: "border-danger/35 bg-danger/15 text-danger",
  warning: "border-warning/40 bg-warning/15 text-warning",
  primary: "border-primary/35 bg-primary/15 text-primary"
};

export default function Badge({ children, tone = "neutral", className }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold", TONES[tone], className)}>
      {children}
    </span>
  );
}