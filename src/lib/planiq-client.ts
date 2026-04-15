"use client";

import { SESSION_KEY } from "@/lib/auth";
import type { PlanhubSession } from "@/lib/auth";

const PLANIQ_WS_URL = "wss://planiq.ai.qa.planhub.com/ws";
const TIMEOUT_MS = 30_000;

/**
 * Fetches a one-shot response from PlanIQ via WebSocket.
 * Opens a fresh connection, sends a context message (project + auth) after
 * session_init, then sends the query and collects the streaming response.
 */
export function fetchContextViaPlanIQ(query: string, projectId?: string): Promise<string> {
  const session: PlanhubSession | null =
    typeof window !== "undefined"
      ? JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "null")
      : null;

  return new Promise((resolve, reject) => {
    let settled = false;
    let accumulated = "";

    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };

    const ws = new WebSocket(PLANIQ_WS_URL);

    const timer = setTimeout(() => {
      console.warn("[PlanIQ] context fetch timed out after", TIMEOUT_MS, "ms");
      ws.close();
      settle(() => reject(new Error("PlanIQ timeout")));
    }, TIMEOUT_MS);

    const cleanup = () => clearTimeout(timer);

    ws.onopen = () => console.debug("[PlanIQ] context WS connected");

    ws.onmessage = (event) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(event.data as string);
      } catch {
        return;
      }

      console.debug("[PlanIQ] context msg:", msg.type, msg);

      switch (msg.type) {
        case "session_init":
          // Send context so PlanIQ knows which project and user is asking.
          ws.send(JSON.stringify({
            type: "context",
            current_project: projectId ?? "",
            current_project_name: projectId ?? "",
            current_view: "dashboard",
            auth_token: session?.auth_token,
            user_id: session?.userId,         // keep as number — server does int()
            company_id: session?.companyId,   // keep as-is (null is valid)
            user_type: session?.userType,
            user_role: session?.userRole,
          }));
          // Small delay so the async session-queue consumer stores the context
          // before it picks up the chat event (guards against EventBridge reordering).
          setTimeout(() => {
            ws.send(JSON.stringify({ type: "chat", message: query }));
          }, 300);
          break;
        case "generate_token":
          accumulated += (msg.content as string) ?? "";
          break;
        case "generate_result":
          accumulated = ((msg.result ?? msg.content ?? accumulated) as string) ?? "";
          cleanup();
          ws.close();
          settle(() => resolve(accumulated));
          break;
        case "generate_end":
          cleanup();
          ws.close();
          settle(() => resolve(accumulated));
          break;
        case "error":
          console.warn("[PlanIQ] server error:", msg);
          cleanup();
          ws.close();
          settle(() => reject(new Error(`PlanIQ error: ${JSON.stringify(msg)}`)));
          break;
      }
    };

    ws.onerror = (ev) => {
      console.warn("[PlanIQ] context WS error:", ev);
      cleanup();
      settle(() => reject(new Error("PlanIQ WebSocket error")));
    };

    ws.onclose = (ev) => {
      console.debug("[PlanIQ] context WS closed:", ev.code, ev.reason);
      cleanup();
      settle(() => resolve(accumulated));
    };
  });
}
