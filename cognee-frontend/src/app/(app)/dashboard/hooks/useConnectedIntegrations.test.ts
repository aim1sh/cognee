import type { AgentConnection } from "@/modules/agents/getAgentConnections";
import type { SessionRow } from "@/modules/sessions/getSessions";
import { detectConnectedIntegrations } from "./useConnectedIntegrations";

const connection = (overrides: Partial<AgentConnection>): AgentConnection => ({
  agent_session_name: "connection",
  session_id: null,
  type: "api",
  status: "active",
  ...overrides,
});

const session = (sessionId: string): SessionRow => ({
  session_id: sessionId,
  user_id: "user",
  dataset_id: null,
  status: "completed",
  effective_status: "completed",
  started_at: null,
  last_activity_at: null,
  ended_at: null,
  tokens_in: 0,
  tokens_out: 0,
  cost_usd: 0,
  error_count: 0,
  last_model: null,
});

describe("detectConnectedIntegrations", () => {
  it("detects a registered Codex connection before a session exists", () => {
    expect(
      detectConnectedIntegrations([], [connection({ session_id: "codex_fresh" })]),
    ).toEqual({ codex: true });
  });

  it("detects an active connection from its declared type", () => {
    expect(
      detectConnectedIntegrations([], [connection({ type: "claude_code" })]),
    ).toEqual({ "claude-code": true });
  });

  it("ignores inactive registered connections", () => {
    expect(
      detectConnectedIntegrations(
        [],
        [connection({ session_id: "codex_old", type: "codex", status: "inactive" })],
      ),
    ).toEqual({});
  });

  it("keeps session-prefix detection as a fallback", () => {
    expect(detectConnectedIntegrations([session("cc_existing")], [])).toEqual({
      "claude-code": true,
    });
  });
});
