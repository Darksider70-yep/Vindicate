import { cn } from "../../utils/ui";

function BaseField({ id, label, hint, error, required, children }) {
  return (
    <label htmlFor={id} className="block">
      {label && (
        <span className="field-label">
          {label}
          {required ? <span className="ml-1 text-danger">*</span> : null}
        </span>
      )}
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
      {error ? <span className="mt-1 block text-xs font-semibold text-danger">{error}</span> : null}
    </label>
  );
}

const baseControlClass =
  "w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-muted/70 transition hover:border-primary/50 focus-visible:shadow-focus";

export function Input({ id, label, hint, error, className, required, ...props }) {
  return (
    <BaseField id={id} label={label} hint={hint} error={error} required={required}>
      <input id={id} className={cn(baseControlClass, className)} required={required} {...props} />
    </BaseField>
  );
}

export function Textarea({ id, label, hint, error, className, required, rows = 3, ...props }) {
  return (
    <BaseField id={id} label={label} hint={hint} error={error} required={required}>
      <textarea
        id={id}
        rows={rows}
        className={cn(baseControlClass, "resize-y", className)}
        required={required}
        {...props}
      />
    </BaseField>
  );
}

export function Select({ id, label, hint, error, className, required, children, ...props }) {
  return (
    <BaseField id={id} label={label} hint={hint} error={error} required={required}>
      <select id={id} className={cn(baseControlClass, className)} required={required} {...props}>
        {children}
      </select>
    </BaseField>
  );
}