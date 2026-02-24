export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function shortAddress(value) {
  if (!value || value.length < 10) {
    return value ?? "";
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export function formatRelativePercent(value) {
  const safeValue = Number.isFinite(value) ? value : 0;
  return `${safeValue.toFixed(1)}%`;
}

export function ensureHashCandidate(value) {
  return value.trim().toLowerCase();
}