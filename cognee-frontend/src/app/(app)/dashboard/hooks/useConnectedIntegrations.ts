"use client";

import { useState, useEffect } from "react";
import type { SessionRow } from "@/modules/sessions/getSessions";
import type { CogneeInstance } from "@/modules/instances/types";
import {
  listActiveAgentConnections,
  type AgentConnection,
} from "@/modules/agents/getAgentConnections";
import {
  getConnectedIntegrations,
  setConnectedIntegrations as persistConnectedIntegrations,
} from "@/utils/browserStorage";

// Per-integration session_id prefix. Detection is coarse on purpose — any session
// whose id starts with the prefix counts as connected. Keep these in sync with
// the shipped integrations (claude-code → "cc_", codex → "codex_" as emitted by
// the plugins' _generate_session_id). Openclaw and API/MCP have no fixed prefix.
export const INTEGRATION_SESSION_PREFIX: Record<string, string> = {
  "claude-code": "cc_",
  codex: "codex_",
};

const INTEGRATION_CONNECTION_TYPE: Record<string, string> = {
  "claude-code": "claude_code",
  codex: "codex",
};

export function detectConnectedIntegrations(
  sessions: SessionRow[],
  connections: AgentConnection[],
): Record<string, boolean> {
  const detected: Record<string, boolean> = {};

  for (const [key, prefix] of Object.entries(INTEGRATION_SESSION_PREFIX)) {
    const hasSession = sessions.some((session) => session.session_id.startsWith(prefix));
    const connectionType = INTEGRATION_CONNECTION_TYPE[key];
    const hasActiveConnection = connections.some((connection) => {
      if (connection.status !== "active") return false;
      return (
        connection.type === connectionType ||
        connection.session_id?.startsWith(prefix) === true ||
        connection.agent_session_name.startsWith(prefix)
      );
    });

    if (hasSession || hasActiveConnection) detected[key] = true;
  }

  return detected;
}

/**
 * Derives and persists per-integration "Connected" state from the session_id
 * prefixes. Sticky per tenant via localStorage so a card stays "Connected" after
 * its session ages out of the polled window.
 */
export function useConnectedIntegrations(
  sessions: SessionRow[],
  tenantId: string | null,
  instance?: CogneeInstance | null,
): Record<string, boolean> {
  const [connectedIntegrations, setConnectedIntegrations] = useState<Record<string, boolean>>({});
  const [connections, setConnections] = useState<AgentConnection[]>([]);

  useEffect(() => {
    if (!instance) {
      setConnections([]);
      return;
    }

    const controller = new AbortController();
    listActiveAgentConnections(instance, controller.signal)
      .then(setConnections)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.warn(
            "[useConnectedIntegrations] active connection lookup failed:",
            error instanceof Error ? error.message : error,
          );
          setConnections([]);
        }
      });

    return () => controller.abort();
  }, [instance]);

  useEffect(() => {
    if (!tenantId) return;
    const persisted = getConnectedIntegrations(tenantId);
    const next = { ...persisted, ...detectConnectedIntegrations(sessions, connections) };
    if (JSON.stringify(next) !== JSON.stringify(persisted)) {
      persistConnectedIntegrations(tenantId, next);
    }
    setConnectedIntegrations((prev) =>
      JSON.stringify(prev) !== JSON.stringify(next) ? next : prev,
    );
  }, [connections, sessions, tenantId]);

  return connectedIntegrations;
}
