"use client";

import { useEffect, useState } from "react";
import { ConnectionState, subscribeConnectionStatus } from "@/lib/connection-status";

export default function ApiStatus({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<ConnectionState>("checking");
  useEffect(() => {
    return subscribeConnectionStatus(setState);
  }, []);

  const label = state === "connected" ? "API + database connected" : state === "unavailable" ? "Connection unavailable" : "Checking connection...";
  return <span className={`api-status ${state}${compact ? " compact" : ""}`} role="status" aria-live="polite" title={label}><i className="status-indicator" aria-hidden="true"/><span>{compact ? state === "connected" ? "Connected" : state === "unavailable" ? "Offline" : "Connecting" : label}</span></span>;
}
