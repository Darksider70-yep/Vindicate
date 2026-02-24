import { useEffect } from "react";
import { cn } from "../../utils/ui";
import Button from "./Button";

export default function Modal({
  open,
  title,
  description,
  onClose,
  children,
  className,
  hideClose
}) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-text/55 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn("surface-card max-h-[85vh] w-full max-w-xl overflow-auto p-5 md:p-6", className)}
      >
        <header className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-text">{title}</h2>
            {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
          </div>
          {!hideClose ? (
            <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Close modal">
              Close
            </Button>
          ) : null}
        </header>
        {children}
      </section>
    </div>
  );
}