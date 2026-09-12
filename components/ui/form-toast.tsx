"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

export function FormToast({ message }: { message?: string }) {
  const [visible, setVisible] = useState(Boolean(message));

  useEffect(() => {
    if (!message) {
      return;
    }

    setVisible(true);
    const timeout = window.setTimeout(() => setVisible(false), 5000);
    return () => window.clearTimeout(timeout);
  }, [message]);

  if (!message || !visible) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 z-50 flex items-start justify-between gap-3 rounded-lg border border-primary/30 bg-card px-4 py-3 text-sm text-foreground shadow-lg sm:inset-x-auto sm:right-4 sm:max-w-sm"
      style={{ bottom: "calc(1rem + env(safe-area-inset-bottom))" }}
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="shrink-0 rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="size-4" aria-hidden="true" />
        <span className="sr-only">Fechar</span>
      </button>
    </div>
  );
}
