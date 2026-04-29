"use client";

import { useState, useRef, useCallback } from "react";

const PLANIQ_WS_URL = "wss://planiq.ai.qa.planhub.com/ws";
const PLANIQ_SESSION_KEY = "planiq_session_id";

export interface PlanIQMessage {
  role: "user" | "assistant";
  content: string;
}

export function usePlanIQ() {
  const [messages, setMessages] = useState<PlanIQMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const streamingRef = useRef("");
  const isStreamingRef = useRef(false);
  // Resolved with the final response text by sendChatAndWait
  const pendingResolveRef = useRef<((text: string) => void) | null>(null);
  // True when sendChatAndWait triggered the current generation (suppresses error UI)
  const isSystemCallRef = useRef(false);
  // True when sendContextSilently is active — suppresses all message state updates
  const isSilentCallRef = useRef(false);

  const resolvePending = (text: string) => {
    pendingResolveRef.current?.(text);
    pendingResolveRef.current = null;
    isSystemCallRef.current = false;
    isSilentCallRef.current = false;
  };

  const send = useCallback((payload: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  const sendChat = useCallback((message: string) => {
    if (!message.trim() || wsRef.current?.readyState !== WebSocket.OPEN) return;
    isStreamingRef.current = false;
    streamingRef.current = "";
    setIsStreaming(true);
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    wsRef.current.send(JSON.stringify({ type: "chat", message }));
  }, []);

  /**
   * Sends a context-priming message silently: no user bubble, no assistant
   * response shown in the chat panel. Used to load bid analysis data into
   * PlanIQ's session context before the user starts chatting.
   */
  const sendContextSilently = useCallback((message: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!message.trim() || wsRef.current?.readyState !== WebSocket.OPEN) {
        resolve();
        return;
      }
      pendingResolveRef.current = () => resolve();
      isSilentCallRef.current = true;
      isStreamingRef.current = false;
      streamingRef.current = "";
      wsRef.current!.send(JSON.stringify({ type: "chat", message }));
    });
  }, []);

  /**
   * Like sendChat, but returns a Promise that resolves with the full
   * assistant response text once generation ends.
   * Runs silently: no user bubble is added and PlanIQ error frames are
   * swallowed so they never appear in the chat panel.
   */
  const sendChatAndWait = useCallback((message: string): Promise<string> => {
    return new Promise((resolve) => {
      if (!message.trim() || wsRef.current?.readyState !== WebSocket.OPEN) {
        resolve("");
        return;
      }
      pendingResolveRef.current = resolve;
      isSystemCallRef.current = true;
      isStreamingRef.current = false;
      streamingRef.current = "";
      setIsStreaming(true);
      // No user bubble — only the assistant's streamed response appears in the panel
      wsRef.current!.send(JSON.stringify({ type: "chat", message }));
    });
  }, []);

  const connect = useCallback(() => {
    const state = wsRef.current?.readyState;
    if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) return;

    const savedSessionId =
      typeof window !== "undefined" ? sessionStorage.getItem(PLANIQ_SESSION_KEY) : null;
    const url = savedSessionId
      ? `${PLANIQ_WS_URL}?session_id=${savedSessionId}`
      : PLANIQ_WS_URL;
    const isResume = !!savedSessionId;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(event.data as string);
      } catch {
        return;
      }

      switch (msg.type) {
        case "session_init": {
          sessionStorage.setItem(PLANIQ_SESSION_KEY, msg.session_id as string);
          setIsConnected(true);
          const history = msg.history as Array<{ role: string; content: string }> | undefined;
          if (history?.length) {
            setMessages(
              history
                .filter((m) => m.role === "user" || m.role === "assistant")
                .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))
            );
          } else if (!isResume) {
            setMessages([]);
          }
          break;
        }

        case "generate_token": {
          if (isSilentCallRef.current) break;
          const token = msg.content as string;
          if (!isStreamingRef.current) {
            isStreamingRef.current = true;
            streamingRef.current = token;
            setStatusText(null);
            setMessages((prev) => [...prev, { role: "assistant", content: token }]);
          } else {
            streamingRef.current += token;
            const fullText = streamingRef.current;
            setMessages((prev) =>
              prev.length > 0
                ? [...prev.slice(0, -1), { role: "assistant", content: fullText }]
                : prev
            );
          }
          break;
        }

        case "generate_end": {
          const finalText = streamingRef.current;
          isStreamingRef.current = false;
          streamingRef.current = "";
          setIsStreaming(false);
          setStatusText(null);
          resolvePending(finalText);
          break;
        }

        case "generate_result": {
          const content = (msg.result ?? msg.content ?? msg.message ?? "") as string;
          if (!isSilentCallRef.current && content) {
            setMessages((prev) => [...prev, { role: "assistant", content }]);
          }
          const finalText = content || streamingRef.current;
          isStreamingRef.current = false;
          streamingRef.current = "";
          setIsStreaming(false);
          setStatusText(null);
          resolvePending(finalText);
          break;
        }

        case "stream_status": {
          const tool = msg.tool as string | undefined;
          setStatusText(tool ? `Using ${tool}…` : "Working…");
          break;
        }

        case "generate_status": {
          setStatusText((msg.message as string | undefined) ?? "Working…");
          break;
        }

        case "notification": {
          const content = (msg.message ?? msg.content ?? "") as string;
          if (content) {
            setMessages((prev) => [...prev, { role: "assistant", content }]);
          }
          break;
        }

        case "error": {
          const wasSystem = isSystemCallRef.current;
          isStreamingRef.current = false;
          streamingRef.current = "";
          setIsStreaming(false);
          setStatusText(null);
          if (!wasSystem) {
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: "Something went wrong. Please try again." },
            ]);
          }
          resolvePending("");
          break;
        }
      }
    };

    ws.onerror = () => {
      isStreamingRef.current = false;
      streamingRef.current = "";
      setIsStreaming(false);
      setStatusText(null);
      setIsConnected(false);
      resolvePending("");
    };

    ws.onclose = () => {
      isStreamingRef.current = false;
      streamingRef.current = "";
      setIsStreaming(false);
      setStatusText(null);
      setIsConnected(false);
      resolvePending("");
    };
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
    resolvePending("");
  }, []);

  return { messages, isStreaming, statusText, isConnected, connect, send, sendChat, sendChatAndWait, sendContextSilently, disconnect };
}
