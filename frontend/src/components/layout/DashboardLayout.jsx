import { useMemo, useState } from "react";
import { cn } from "../../utils/ui";
import Button from "../ui/Button";

export default function DashboardLayout({ title, subtitle, sections, children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");

  const orderedSections = useMemo(
    () => sections.filter((section) => Boolean(section?.id)),
    [sections]
  );

  const currentActiveId = orderedSections.some((section) => section.id === activeId)
    ? activeId
    : orderedSections[0]?.id;

  return (
    <div className="mx-auto flex w-full max-w-7xl gap-4 px-3 py-4 sm:px-4 lg:px-6 lg:gap-6 lg:py-6">
      <aside
        className={cn(
          "sticky top-20 hidden h-[calc(100vh-6rem)] shrink-0 overflow-hidden rounded-xxl border border-border/80 bg-surface p-3 shadow-card lg:block",
          collapsed ? "w-20" : "w-64"
        )}
      >
        <div className="mb-3 flex items-center justify-between">
          {!collapsed ? <p className="text-xs font-semibold uppercase tracking-wider text-muted">Views</p> : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed((current) => !current)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="h-8 px-2"
          >
            {collapsed ? ">" : "<"}
          </Button>
        </div>

        <nav className="space-y-1" aria-label="Dashboard navigation">
          {orderedSections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveId(section.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold transition",
                currentActiveId === section.id
                  ? "bg-primary/15 text-primary"
                  : "text-muted hover:bg-panel hover:text-text"
              )}
              aria-current={currentActiveId === section.id ? "page" : undefined}
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-panel text-xs">
                {section.shortLabel}
              </span>
              {!collapsed ? <span>{section.label}</span> : null}
            </button>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1 space-y-4 lg:space-y-6">
        <header className="surface-card p-4 md:p-5">
          <h1 className="text-2xl font-semibold text-text md:text-3xl">{title}</h1>
          {subtitle ? <p className="mt-2 text-sm text-muted md:text-base">{subtitle}</p> : null}

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {orderedSections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveId(section.id)}
                className={cn(
                  "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                  currentActiveId === section.id
                    ? "border-primary/35 bg-primary/15 text-primary"
                    : "border-border bg-surface text-muted"
                )}
              >
                {section.label}
              </button>
            ))}
          </div>
        </header>

        {children(currentActiveId)}
      </div>
    </div>
  );
}