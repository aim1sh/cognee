import { CogneeInstance } from "../instances/types";

export interface AgentConnection {
  agent_session_name: string;
  session_id: string | null;
  type: string;
  status: string;
}

interface AgentConnectionsResponse {
  agents: AgentConnection[];
}

function isAgentConnectionsResponse(value: unknown): value is AgentConnectionsResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { agents?: unknown }).agents)
  );
}

export async function listActiveAgentConnections(
  instance: CogneeInstance,
  signal?: AbortSignal,
): Promise<AgentConnection[]> {
  const response = await instance.fetch(
    "/v1/agents/connections?active_only=true&include_sources=false&limit=500",
    { signal },
  );
  if (!response.ok) return [];

  const payload: unknown = await response.json();
  if (!isAgentConnectionsResponse(payload)) {
    console.warn("[getAgentConnections] received an unexpected response shape");
    return [];
  }

  return payload.agents;
}
