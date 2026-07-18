"use client";

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
    <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-primary/30 bg-card px-4 py-3 text-sm text-foreground">
      {message}
    </div>
  );
}
