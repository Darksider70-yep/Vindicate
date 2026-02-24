import { useState } from "react";

export function useClipboard() {
  const [copied, setCopied] = useState(false);

  const copy = async (value) => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return { copy, copied };
}