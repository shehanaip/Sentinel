"use client";

import { useEffect, useState } from "react";
import { ConnectionState, subscribeConnectionStatus } from "@/lib/connection-status";
import { useAppLanguage } from "@/components/session-provider";

export default function ApiStatus({ compact = false }: { compact?: boolean }) {
  const { t } = useAppLanguage();
  const [state, setState] = useState<ConnectionState>("checking");
  useEffect(() => {
    return subscribeConnectionStatus(setState);
  }, []);

  const label = state === "connected" ? t("API + database connected") : state === "unavailable" ? t("Connection unavailable") : t("Checking connection...");
  return <span className={`api-status ${state}${compact ? " compact" : ""}`} role="status" aria-live="polite" title={label}><i className="status-indicator" aria-hidden="true"/><span>{compact ? state === "connected" ? t("Connected") : state === "unavailable" ? t("Offline") : t("Connecting") : label}</span></span>;
}
