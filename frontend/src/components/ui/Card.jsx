import { cn } from "../../utils/ui";

export function Card({ className, children }) {
  return <section className={cn("surface-card", className)}>{children}</section>;
}

export function CardHeader({ title, subtitle, action, className }) {
  return (
    <header className={cn("flex flex-wrap items-start justify-between gap-3 border-b border-border/70 p-4 md:p-5", className)}>
      <div>
        <h3 className="section-title">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {action}
    </header>
  );
}

export function CardBody({ className, children }) {
  return <div className={cn("p-4 md:p-5", className)}>{children}</div>;
}

export function CardFooter({ className, children }) {
  return <footer className={cn("border-t border-border/70 p-4 md:p-5", className)}>{children}</footer>;
}